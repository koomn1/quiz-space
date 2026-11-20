import type { AllowedQuestionType } from './types';

export function sourceFileBaseName(sourceFileName: string | null | undefined): string {
  const baseName = String(sourceFileName || '').split(/[\\/]/).pop() || '';
  return baseName
    .replace(/\.[a-z0-9]{1,8}$/i, '')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

export function deriveQuizTitle(sourceFileName: string | null | undefined, sourceText = ''): string {
  const lines = sourceText.split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(0, 20);
  const heading = lines.find(line =>
    line.length >= 3 && line.length <= 100 &&
    !/^\d{1,4}[.)\-:]/.test(line) &&
    !/^(?:question|choose the correct|put true|answer the questions|answer key|مفتاح|اختر|ضع|أجب)/i.test(line) &&
    !/^[A-H][.)\-:]/i.test(line)
  );
  if (heading) return heading.replace(/\s+/g, ' ').trim();
  return sourceFileBaseName(sourceFileName) || 'اختبار مستخرج من الملف';
}

export function isGenericQuizTitle(value: unknown): boolean {
  const normalized = String(value || '').trim().toLocaleLowerCase();
  return !normalized || ['extracted quiz', 'اختبار مستخرج', 'اختبار مستخرج من الملف'].includes(normalized);
}

export function normalizeAnswerText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/gu, '')
    .replace(/[.,،؛:!?؟"'`()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

export function normalizeTrueFalseOptions(questionText: string, options: string[]): string[] {
  const hasArabicQuestion = /[\u0600-\u06ff]/u.test(questionText);
  const hasArabicOptions = options.some(option => /[\u0600-\u06ff]/u.test(option));
  const hasLatinQuestion = /[A-Za-z]/.test(questionText);
  const hasLatinOptions = options.some(option => /[A-Za-z]/.test(option));
  if (hasLatinQuestion && hasArabicOptions) return ['True', 'False'];
  if (hasArabicQuestion && hasLatinOptions) return ['صح', 'خطأ'];
  return options;
}

export function resolveCorrectIndex(raw: any, options: string[], type: 'mcq' | 'tf'): number {
  const suppliedIndex = Number(raw?.correctIndex);
  if (Number.isInteger(suppliedIndex) && suppliedIndex >= 0 && suppliedIndex < options.length) return suppliedIndex;
  const answer = normalizeAnswerText(raw?.correctAnswer);
  if (answer) {
    const exactIndex = options.findIndex(option => normalizeAnswerText(option) === answer);
    if (exactIndex >= 0) return exactIndex;
    if (type === 'tf') {
      if (['صح', 'صحيح', 'true', 'yes', 'نعم'].includes(answer)) return 0;
      if (['خطأ', 'خاطئ', 'false', 'no', 'لا'].includes(answer)) return 1;
    }
  }
  return -1;
}

export function normalizeQuestions(value: unknown, allowedTypes: AllowedQuestionType[] = ['mcq', 'tf', 'essay']): any[] {
  const container: any = value && typeof value === 'object' ? value as any : null;
  const source = Array.isArray(value)
    ? value
    : Array.isArray(container?.questions)
      ? container.questions
      : Array.isArray(container?.items)
        ? container.items
        : Array.isArray(container?.data)
          ? container.data
          : Array.isArray(container?.quiz?.questions)
            ? container.quiz.questions
            : [];
  const seen = new Set<string>();
  const questions: any[] = [];
  for (const raw of source) {
    if (!raw || typeof raw !== 'object') continue;
    const text = String((raw as any).text ?? (raw as any).question ?? (raw as any).questionText ?? (raw as any).prompt ?? '').trim();
    if (!text) continue;
    const key = text.replace(/\s+/g, ' ').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const declaredType = String((raw as any).type ?? (raw as any).questionType ?? (raw as any).kind ?? '').toLowerCase();
    const type = declaredType === 'tf' || declaredType === 'true_false' || declaredType === 'true/false'
      ? 'tf'
      : declaredType === 'essay' || declaredType === 'short_answer' || declaredType === 'open'
        ? 'essay'
        : 'mcq';
    if (!allowedTypes.includes(type)) continue;
    const rawOptions = (raw as any).options ?? (raw as any).choices ?? (raw as any).answers ?? (raw as any).choiceList;
    const parsedOptions = Array.isArray(rawOptions)
      ? rawOptions.map((option: unknown) => String(typeof option === 'object' && option !== null ? ((option as any).text ?? (option as any).label ?? '') : option ?? '').trim()).filter(Boolean)
      : [];
    const options = type === 'tf' ? normalizeTrueFalseOptions(text, parsedOptions) : parsedOptions;
    questions.push({
      number: Number.isInteger(Number((raw as any).number)) && Number((raw as any).number) > 0 ? Number((raw as any).number) : questions.length + 1,
      text,
      type,
      options: type === 'essay' ? [] : options,
      correctIndex: type === 'essay' ? -1 : resolveCorrectIndex(raw, options, type),
      correctAnswer: (raw as any).correctAnswer ?? (raw as any).correct_answer ?? (raw as any).answer ?? (raw as any).correctOption ?? '',
      explanation: (raw as any).explanation == null ? '' : String((raw as any).explanation),
    });
  }
  return questions;
}

export function validateGeneratedQuestions(questions: any[]): any[] {
  return questions.filter((question) => {
    if (!question?.text || question.type === 'essay') return Boolean(question?.text);
    if (!Array.isArray(question.options) || question.options.length < 2) return false;
    if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex >= question.options.length) return false;
    const answer = normalizeAnswerText(question.correctAnswer);
    const expected = normalizeAnswerText(question.options[question.correctIndex]);
    return Boolean(answer && expected && answer === expected);
  });
}

export function questionFingerprint(question: any): string {
  const raw = [question?.text, ...(Array.isArray(question?.options) ? question.options : [])]
    .map(value => String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase())
    .join('|');
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) hash = Math.imul(hash ^ raw.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function applyRequestedQuestionCount(
  questions: any[],
  extractionMode: 'literal' | 'generate',
  requestedCount: number | null | undefined,
): any[] {
  // File generation is comprehensive; never discard source questions because
  // a legacy client sent a small UI count.
  if (extractionMode !== 'generate' || !requestedCount) return questions;
  return questions;
}
