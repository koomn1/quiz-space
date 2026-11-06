import type {
  AnswerKeyEntry,
  ExtractedOption,
  ExtractedQuestion,
  QuestionType,
} from './types/extraction';

export interface FsmLine {
  text: string;
  pageNumber: number;
}

export interface FsmParseOutput {
  questions: ExtractedQuestion[];
  answerKeyEntries: AnswerKeyEntry[];
  warnings: string[];
}

export function normalizeDisplayText(raw: string): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/g, '')
    .replace(/\s*\r?\n\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

const SECTION_HEADER_RE = /^(?:\d+[.\-):]\s*)?.*(?:MCQ|MULTIPLE\s+CHOICE|TRUE\s*(?:&|AND|OR)\s*FALSE|SHORT\s+NOTES|ESSAY|ANSWER\s+KEY|MODEL\s+ANSWERS|اختر\s+الإجابة|صح\s+(?:أم|أو|و)\s*خطأ|الأسئلة\s+المقالية|نموذج\s+الإجابة|مفتاح\s+الإجابات).*$/i;
const QUESTION_START_RE = /^(?:Q|س(?:ؤال)?\s*)?([0-9٠-٩]{1,4})\s*[.\-):]\s+(.+)$/iu;
const OPTION_START_RE = /^([a-dA-Dأبجد])\s*[.\-):]\s+(.+)$/u;
const ANSWER_LINE_RE = /^(?:Answer|Ans|Correct\s+Answer|الإجابة(?:\s+الصحيحة)?|الجواب)\s*[:\-]\s*(.*)$/iu;
const EXPLANATION_LINE_RE = /^(?:Explanation|الشرح|التفسير|الترجمة\s+والشرح)\s*[:\-]\s*(.*)$/iu;
const TF_INLINE_RE = /\(\s*(√|✓|✔|×|✗|✘|True|False|T|F|صواب|صح|خطأ)\s*\)\s*\.?$/iu;
const ANSWER_KEY_PAIR_RE = /(?:Q|س)?\s*([0-9٠-٩]{1,4})\s*[.\-):\s]+\s*(a|b|c|d|true|false|t|f|أ|ب|ج|د|صح|خطأ)\b/giu;
const INLINE_OPTION_SPLIT_RE = /\s*(?:\|\s*|\t+|\s{2,})(?=(?:[a-dA-Dأبجد])\s*[.\-):])/gu;

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const ARABIC_OPTIONS: Record<string, number> = { أ: 0, ب: 1, ج: 2, د: 3 };

function asciiDigits(value: string): string {
  return value.replace(/[٠-٩]/g, digit => String(ARABIC_DIGITS.indexOf(digit)));
}

function optionKey(value: string): string {
  const normalized = value.toLocaleLowerCase();
  return normalized === 'أ' ? 'a' : normalized === 'ب' ? 'b' : normalized === 'ج' ? 'c' : normalized === 'د' ? 'd' : normalized;
}

function questionKey(section: string | undefined, number: string): string {
  return `${(section || 'general').toLocaleLowerCase()}::${asciiDigits(number)}`;
}

function isAnswerKeySection(section: string): boolean {
  return /ANSWER\s+KEY|MODEL\s+ANSWERS|نموذج\s+الإجابة|مفتاح\s+الإجابات/i.test(section);
}

function splitInlineOptions(line: FsmLine): FsmLine[] {
  if (!/^(?:[a-dA-Dأبجد])\s*[.\-):]/u.test(line.text) || !INLINE_OPTION_SPLIT_RE.test(line.text)) {
    INLINE_OPTION_SPLIT_RE.lastIndex = 0;
    return [line];
  }
  INLINE_OPTION_SPLIT_RE.lastIndex = 0;
  return line.text.split(INLINE_OPTION_SPLIT_RE).filter(Boolean).map(text => ({ ...line, text: text.trim() }));
}

function parseAnswerIndex(answer: string, options: ExtractedOption[]): number {
  const first = answer.trim().match(/^([a-dA-Dأبجد])(?:\s|[.\-):]|$)/u)?.[1];
  if (first) {
    const key = optionKey(first);
    const index = options.findIndex(option => optionKey(option.letter) === key);
    if (index >= 0) return index;
    const arabicIndex = ARABIC_OPTIONS[first];
    if (arabicIndex !== undefined && arabicIndex < options.length) return arabicIndex;
  }
  const normalized = normalizeDisplayText(answer).toLocaleLowerCase();
  return options.findIndex(option => normalizeDisplayText(option.text).toLocaleLowerCase() === normalized);
}

function createQuestion(sectionTitle: string, line: FsmLine, rawNumber: string, stem: string, index: number): ExtractedQuestion {
  let questionType: QuestionType = isAnswerKeySection(sectionTitle) ? 'mcq' : 'mcq';
  let correctAnswer: string | null = null;
  const tfMatch = stem.match(TF_INLINE_RE);
  if (tfMatch) {
    questionType = 'true_false';
    const mark = tfMatch[1].toLocaleLowerCase();
    correctAnswer = ['√', '✓', '✔', 'true', 't', 'صواب', 'صح'].includes(mark) ? 'True' : 'False';
  }
  const cleanStem = tfMatch ? stem.replace(TF_INLINE_RE, '').trim() : stem;
  return {
    id: `local-${questionKey(sectionTitle, rawNumber)}-${index + 1}-p${line.pageNumber}`,
    rawNumber: asciiDigits(rawNumber),
    sectionTitle,
    questionType,
    rawSpan: line.text,
    stem: normalizeDisplayText(cleanStem),
    options: [],
    correctAnswer,
    explanation: null,
    sourcePages: [line.pageNumber],
    origin: 'local_deterministic',
    status: 'confirmed',
    confidence: 100,
    warnings: [],
  };
}

function finalizeQuestion(question: ExtractedQuestion): void {
  if (question.questionType === 'true_false') {
    const isTrue = question.correctAnswer === 'True';
    question.options = [
      { letter: 'a', rawSpan: 'True', text: 'True', isCorrect: isTrue },
      { letter: 'b', rawSpan: 'False', text: 'False', isCorrect: question.correctAnswer === 'False' },
    ];
    return;
  }
  if (question.options.length < 2) {
    question.status = 'needs_ai_review';
    question.confidence = 45;
    question.warnings.push('سؤال اختيار من متعدد يحتوي على أقل من اختيارين');
  }
}

export class FsmQuestionParser {
  static parseLines(input: FsmLine[]): FsmParseOutput {
    const lines = input.flatMap(splitInlineOptions).map(item => ({ ...item, text: item.text.trim() })).filter(item => item.text.length > 0 && !/^Page\s+\d+\s+of\s+\d+$/i.test(item.text) && !/^صفحة\s+\d+\s+من\s+\d+$/i.test(item.text));
    const questions: ExtractedQuestion[] = [];
    const answerKeyEntries: AnswerKeyEntry[] = [];
    const warnings: string[] = [];
    let section = 'General';
    let mode: QuestionType | 'answer_key' = 'mcq';
    let state: 'IDLE' | 'STEM' | 'OPTIONS' | 'ANSWER' = 'IDLE';
    let current: ExtractedQuestion | null = null;

    const flush = () => {
      if (!current) return;
      finalizeQuestion(current);
      questions.push(current);
      current = null;
      state = 'IDLE';
    };

    for (const line of lines) {
      if (SECTION_HEADER_RE.test(line.text) && line.text.length < 130) {
        flush();
        section = normalizeDisplayText(line.text);
        mode = isAnswerKeySection(section)
          ? 'answer_key'
          : /TRUE\s*(?:&|AND|OR)\s*FALSE|صح\s+(?:أم|أو|و)\s*خطأ/i.test(section)
            ? 'true_false'
            : /SHORT\s+NOTES|ESSAY|المقالية/i.test(section) ? 'essay' : 'mcq';
        continue;
      }

      if (mode === 'answer_key') {
        ANSWER_KEY_PAIR_RE.lastIndex = 0;
        for (const match of line.text.matchAll(ANSWER_KEY_PAIR_RE)) {
          answerKeyEntries.push({ sectionHint: section, rawNumber: asciiDigits(match[1]), answerValue: match[2], sourcePage: line.pageNumber });
        }
        if ([...line.text.matchAll(ANSWER_KEY_PAIR_RE)].length > 0) continue;
      }

      const answerMatch = line.text.match(ANSWER_LINE_RE);
      if (answerMatch && current) {
        state = 'ANSWER';
        current.rawSpan += `\n${line.text}`;
        if (!current.sourcePages.includes(line.pageNumber)) current.sourcePages.push(line.pageNumber);
        const answer = answerMatch[1].trim();
        const answerIndex = parseAnswerIndex(answer, current.options);
        current.correctAnswer = answerIndex >= 0 ? `${current.options[answerIndex].letter}- ${current.options[answerIndex].text}` : answer || null;
        if (answerIndex >= 0) current.options[answerIndex].isCorrect = true;
        continue;
      }

      const explanationMatch = line.text.match(EXPLANATION_LINE_RE);
      if (explanationMatch && current) {
        state = 'ANSWER';
        current.rawSpan += `\n${line.text}`;
        current.explanation = normalizeDisplayText(explanationMatch[1]);
        continue;
      }

      const optionMatch = line.text.match(OPTION_START_RE);
      if (optionMatch && current && current.questionType === 'mcq') {
        state = 'OPTIONS';
        current.rawSpan += `\n${line.text}`;
        if (!current.sourcePages.includes(line.pageNumber)) current.sourcePages.push(line.pageNumber);
        const rawText = optionMatch[2];
        const checked = /[✓✔√]/u.test(rawText);
        const text = normalizeDisplayText(rawText.replace(/[✓✔√]/gu, ''));
        current.options.push({ letter: optionMatch[1].toLocaleLowerCase(), rawSpan: line.text, text, isCorrect: checked, visualCue: checked ? 'checkmark' : undefined });
        if (checked) current.correctAnswer = `${optionMatch[1]}- ${text}`;
        continue;
      }

      const questionMatch = line.text.match(QUESTION_START_RE);
      if (questionMatch) {
        flush();
        current = createQuestion(section, line, questionMatch[1], questionMatch[2], questions.length);
        current.questionType = mode === 'answer_key' ? 'mcq' : mode;
        state = 'STEM';
        continue;
      }

      if (!current) continue;
      current.rawSpan += `\n${line.text}`;
      if (!current.sourcePages.includes(line.pageNumber)) current.sourcePages.push(line.pageNumber);
      if (state === 'STEM') {
        current.stem = normalizeDisplayText(`${current.stem} ${line.text}`);
      } else if (state === 'OPTIONS' && current.options.length > 0) {
        const last = current.options[current.options.length - 1];
        last.rawSpan += `\n${line.text}`;
        last.text = normalizeDisplayText(`${last.text} ${line.text.replace(/[✓✔√]/gu, '')}`);
      } else if (state === 'ANSWER') {
        current.explanation = normalizeDisplayText(`${current.explanation || ''} ${line.text}`);
      }
    }
    flush();
    return { questions, answerKeyEntries, warnings };
  }
}

export function linkGlobalAnswerKeys(questions: ExtractedQuestion[], entries: AnswerKeyEntry[]): ExtractedQuestion[] {
  const byScopedKey = new Map<string, AnswerKeyEntry>();
  const byNumber = new Map<string, AnswerKeyEntry>();
  for (const entry of entries) {
    const number = asciiDigits(entry.rawNumber.trim());
    if (entry.sectionHint) byScopedKey.set(questionKey(entry.sectionHint, number), entry);
    if (!byNumber.has(number)) byNumber.set(number, entry);
  }
  return questions.map(question => {
    if (question.correctAnswer) return question;
    const entry = (question.sectionTitle && byScopedKey.get(questionKey(question.sectionTitle, question.rawNumber))) || byNumber.get(question.rawNumber);
    if (!entry) return question;
    const answer = optionKey(entry.answerValue.trim());
    const options = question.options.map(option => {
      const isCorrect = optionKey(option.letter) === answer || normalizeDisplayText(option.text).toLocaleLowerCase() === entry.answerValue.trim().toLocaleLowerCase();
      return isCorrect ? { ...option, isCorrect: true, visualCue: 'answer_key' as const } : option;
    });
    const matched = options.find(option => option.isCorrect);
    return { ...question, options, correctAnswer: matched ? `${matched.letter}- ${matched.text}` : entry.answerValue.trim() };
  });
}
