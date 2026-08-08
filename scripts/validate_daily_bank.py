import json
import re
from pathlib import Path

text = Path('/home/ubuntu/quiz-space/src/data/dailyQuizBank.ts').read_text(encoding='utf-8')
start, end = text.find('['), text.rfind(']') + 1
bank = json.loads(text[start:end])
print('quizzes', len(bank), 'questions', sum(len(x['questions']) for x in bank))
issues = []
for quiz in bank:
    if len(quiz['questions']) != 5:
        issues.append((quiz['id'], 'question-count', len(quiz['questions'])))
    for q in quiz['questions']:
        opts = q['options']; idx = q['correctIndex']
        if len(opts) != 4 or not 0 <= idx < 4:
            issues.append((q['id'], 'shape', opts, idx))
        textq = q['text']
        # Evaluate simple arithmetic expressions embedded in Arabic/English text.
        m = re.search(r'(\d+)\s*([+\-×x*÷/])\s*(\d+)', textq)
        if m:
            a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
            expected = {'+': a+b, '-': a-b, '×': a*b, 'x': a*b, '*': a*b, '÷': a/b, '/': a/b}[op]
            try: selected = float(re.sub(r'[^0-9.\-]', '', opts[idx]))
            except Exception: selected = None
            if selected is None or abs(selected - expected) > 1e-9:
                issues.append((q['id'], 'arithmetic', textq, opts, idx, expected))
        # Detect an answer explanation that explicitly contradicts the selected option for simple numeric answers.
        if re.search(r'\b\d+\b', textq) and re.search(r'يساوي|الناتج|مجموع|حاصل', textq):
            print('numeric:', q['id'], textq, '=>', opts[idx])
print('issues', len(issues))
for issue in issues:
    print('ISSUE', issue)
