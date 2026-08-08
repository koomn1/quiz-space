import json
import os
import time
from pathlib import Path
from openai import OpenAI

TOPICS = [
    'الثقافة العامة', 'التاريخ والحضارات', 'الجغرافيا والعالم', 'العلوم والفيزياء',
    'الأحياء والصحة العامة', 'الكيمياء والمواد', 'الرياضيات والمنطق', 'اللغة العربية',
    'اللغة الإنجليزية', 'الأدب والفنون', 'التكنولوجيا والبرمجة', 'الاقتصاد وريادة الأعمال',
    'الفضاء والفلك', 'البيئة والمناخ', 'الرياضة والألعاب الأولمبية', 'الفلسفة وعلم النفس',
    'الإعلام والتفكير النقدي', 'القانون والمواطنة', 'الهندسة والاختراعات', 'الغذاء والزراعة'
]

def schema():
    q = {
        'type': 'object', 'additionalProperties': False,
        'properties': {
            'text': {'type': 'string'},
            'options': {'type': 'array', 'items': {'type': 'string'}, 'minItems': 4, 'maxItems': 4},
            'correctIndex': {'type': 'integer', 'minimum': 0, 'maximum': 3},
            'explanation': {'type': 'string'}
        }, 'required': ['text', 'options', 'correctIndex', 'explanation']
    }
    return {'type': 'object', 'additionalProperties': False, 'properties': {
        'quizzes': {'type': 'array', 'minItems': 10, 'maxItems': 10, 'items': {
            'type': 'object', 'additionalProperties': False,
            'properties': {
                'title': {'type': 'string'}, 'description': {'type': 'string'}, 'category': {'type': 'string'},
                'questions': {'type': 'array', 'minItems': 5, 'maxItems': 5, 'items': q}
            }, 'required': ['title', 'description', 'category', 'questions']
        }}
    }, 'required': ['quizzes']}

client = OpenAI()
out = []
for batch in range(6):
    topics = TOPICS[batch * 3: batch * 3 + 6]
    prompt = f'''أنشئ 10 كويزات عربية ثابتة للاستخدام التعليمي، مرقمة ضمنياً من {batch*10+1} إلى {(batch+1)*10}.
الموضوعات المقترحة: {', '.join(topics)}.
كل كويز يجب أن يحتوي بالضبط على 5 أسئلة اختيار من متعدد، كل سؤال له 4 اختيارات عربية مختلفة وإجابة صحيحة واحدة فقط.
المستوى متوسط، والأسئلة متنوعة وغير مكررة، والمعلومة دقيقة وقابلة للتحقق، وتجنب السياسة والأخبار المتغيرة والطب التشخيصي.
اكتب عنواناً ووصفاً وفئة عربية لكل كويز، وشرحاً قصيراً مفيداً لكل إجابة.
أعد JSON فقط مطابقاً للمخطط، ولا تستخدم أسئلة صح/خطأ أو أسئلة مقالية.'''
    for attempt in range(3):
        try:
            res = client.chat.completions.create(
                model='gpt-5-mini',
                messages=[
                    {'role': 'system', 'content': 'أنت محرر بنك أسئلة تعليمي دقيق. أخرج JSON فقط.'},
                    {'role': 'user', 'content': prompt},
                ],
                response_format={'type': 'json_schema', 'json_schema': {'name': 'daily_quizzes', 'strict': True, 'schema': schema()}},
                max_completion_tokens=16000,
            )
            data = json.loads(res.choices[0].message.content)
            if len(data['quizzes']) != 10 or any(len(x['questions']) != 5 for x in data['quizzes']):
                raise ValueError('invalid batch size')
            out.extend(data['quizzes'])
            print(f'batch {batch+1}/6 ok', flush=True)
            break
        except Exception as e:
            print(f'batch {batch+1} attempt {attempt+1} failed: {e}', flush=True)
            if attempt == 2: raise
            time.sleep(2)

if len(out) != 60:
    raise ValueError(f'expected 60 quizzes, got {len(out)}')
for i, quiz in enumerate(out, 1):
    quiz['id'] = f'daily-bank-{i:02d}'
    for j, q in enumerate(quiz['questions'], 1):
        q['id'] = f'daily-bank-{i:02d}-q{j}'
        q['type'] = 'mcq'
        q['number'] = j
    quiz['timeLimit'] = 300
    quiz['creatorId'] = 'quizspace-daily-bank'
    quiz['creatorName'] = 'QuizSpace — بنك يومي ثابت'
    quiz['createdAt'] = '2026-08-08T00:00:00.000Z'
    quiz['totalPlays'] = 0
    quiz['avgRating'] = 0
    quiz['ratingsCount'] = 0

Path('/home/ubuntu/quiz-space/scripts/daily_quiz_bank.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
print('wrote', len(out), 'quizzes')
