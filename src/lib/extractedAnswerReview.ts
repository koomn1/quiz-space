import type { Question } from '../types';

export type AnswerReview = {
  questionIndex?: number;
  index?: number;
  questionNumber?: number;
  number?: number;
  correctIndex?: number;
  selectedIndex?: number;
  optionIndex?: number;
  answerIndex?: number;
  correctAnswer?: string;
  explanation?: string;
  evidence?: string;
};

// Reasoning-capable models may emit stray balanced or unbalanced brackets
// before the actual answer. Scan every balanced candidate instead of trusting
// the first bracket in the response.
function findBalancedJsonCandidates(value: string): string[] {
  const candidates: string[] = [];
  let searchFrom = 0;
  while (searchFrom < value.length) {
    const relativeStart = value.slice(searchFrom).search(/[\[{]/);
    if (relativeStart < 0) break;
    const start = searchFrom + relativeStart;
    const stack: string[] = [];
    let inString = false;
    let escaped = false;
    let end = -1;
    let mismatched = false;
    for (let index = start; index < value.length; index += 1) {
      const char = value[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === '{' || char === '[') stack.push(char);
      else if (char === '}' || char === ']') {
        const expected = char === '}' ? '{' : '[';
        if (stack.pop() !== expected) { mismatched = true; break; }
        if (stack.length === 0) { end = index; break; }
      }
    }
    if (!mismatched && end >= 0) candidates.push(value.slice(start, end + 1));
    searchFrom = start + 1;
  }
  return candidates;
}

function extractReviews(value: unknown, depth = 0): AnswerReview[] | null {
  if (depth > 6) return null;
  if (Array.isArray(value)) return value as AnswerReview[];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const candidates = [trimmed, ...findBalancedJsonCandidates(trimmed)].filter((candidate, index, all): candidate is string => Boolean(candidate) && all.indexOf(candidate) === index);
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate) as unknown;
        const reviews = extractReviews(parsed, depth + 1);
        if (reviews) return reviews;
      } catch {
        // Try the next wrapper/candidate.
      }
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.answers)) return record.answers as AnswerReview[];
  const nestedKeys = ['result', 'data', 'text', 'content', 'output', 'response', 'message', 'body'];
  for (const key of nestedKeys) {
    const reviews = extractReviews(record[key], depth + 1);
    if (reviews) return reviews;
  }
  return null;
}

export function parseAnswerReviews(text: string): AnswerReview[] {
  const cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const candidates = [cleaned, ...findBalancedJsonCandidates(cleaned)].filter((candidate, index, all): candidate is string => Boolean(candidate) && all.indexOf(candidate) === index);

  for (const candidate of candidates) {
    try {
      const firstParse = JSON.parse(candidate) as unknown;
      const reviews = extractReviews(firstParse);
      if (reviews) return reviews;
    } catch {
      // Try the next balanced candidate before reporting an invalid response.
    }
  }
  throw new Error('لم تُرجع مرحلة حل الاختبار نتيجة JSON صالحة.');
}

export function normalizeReviewAnswer(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/^(?:option|answer|الإجابة|الاختيار)\s*/i, '')
    .replace(/^[a-dأ-د1-4]\s*[).:\-]\s*/i, '')
    .replace(/[.,،؛:!?؟"'`()\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

export function applySourceAnswerKey(questions: Question[], sourceText: string, questionOffset = 0): { questions: Question[]; matched: number } {
  const marker = sourceText.search(/(?:answer\s*key|مفتاح\s*(?:الإجابة|الإجابات)|نموذج\s+الإجابة)/i);
  if (marker < 0) return { questions: questions.map(question => ({ ...question })), matched: 0 };

  const answerKey = sourceText.slice(marker).replace(/[()[\]{}]/g, ' ');
  const letterToIndex: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, أ: 0, ب: 1, ج: 2, د: 3 };
  const answerMap = new Map<number, number>();
  const answerPatterns = [
    /(?:^|[\s,;|])(?:q(?:uestion)?\s*)?(\d{1,3})\s*(?:[:.)-]|\s+)\s*(?:answer\s*)?([a-dأ-د1-4])(?=\s|$|[,;|])/gi,
  ];
  for (const answerPattern of answerPatterns) {
    for (const match of answerKey.matchAll(answerPattern)) {
      const questionNumber = Number(match[1]);
      const rawOption = match[2].toLocaleLowerCase();
      const optionIndex = /^[1-4]$/.test(rawOption) ? Number(rawOption) - 1 : letterToIndex[rawOption];
      if (Number.isInteger(questionNumber) && Number.isInteger(optionIndex)) answerMap.set(questionNumber - 1, optionIndex);
    }
  }

  let matched = 0;
  const next = questions.map((question, index) => {
    const correctIndex = answerMap.get(index + questionOffset);
    if (question.type === 'essay' || correctIndex === undefined || correctIndex >= question.options.length) return { ...question };
    matched += 1;
    return {
      ...question,
      correctIndex,
      correctAnswer: question.options[correctIndex],
    };
  });
  return { questions: next, matched };
}

export function applyVerifiedAnswerReviews(questions: Question[], responseText: string): Question[] {
  const next = questions.map(question => ({ ...question }));
  const reviews = parseAnswerReviews(responseText);
  const reviewedIndexes = new Set<number>();

  const rawQuestionIndexes = reviews
    .map(review => Number(review.questionIndex ?? review.index ?? review.questionNumber ?? review.number))
    .filter(Number.isInteger);
  const usesZeroBasedQuestionNumbers = rawQuestionIndexes.includes(0) && !rawQuestionIndexes.includes(questions.length);

  for (const review of reviews) {
    const rawIndex = Number(review.questionIndex ?? review.index ?? review.questionNumber ?? review.number);
    const questionIndex = Number.isInteger(rawIndex)
      ? (usesZeroBasedQuestionNumbers ? rawIndex : rawIndex - 1)
      : -1;
    const question = next[questionIndex];
    if (!question) {
      throw new Error('مرحلة حل الاختبار أعادت رقم سؤال غير صالح.');
    }
    if (question.type === 'essay') continue;
    if (reviewedIndexes.has(questionIndex)) {
      throw new Error('مرحلة حل الاختبار أعادت إجابة مكررة لسؤال واحد.');
    }

    const returnedAnswer = normalizeReviewAnswer(review.correctAnswer);
    const optionLabel = returnedAnswer.length === 1 ? { a: 0, b: 1, c: 2, d: 3, أ: 0, ب: 1, ج: 2, د: 3 }[returnedAnswer] : undefined;
    let correctIndex = Number(review.correctIndex ?? review.selectedIndex ?? review.optionIndex ?? review.answerIndex);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= question.options.length) {
      correctIndex = optionLabel ?? question.options.findIndex(option => normalizeReviewAnswer(option) === returnedAnswer);
    }
    if (!returnedAnswer || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= question.options.length) continue;
    const optionAnswer = normalizeReviewAnswer(question.options[correctIndex]);
    if (returnedAnswer !== optionAnswer && optionLabel !== correctIndex) continue;

    reviewedIndexes.add(questionIndex);
    const explanationParts = [review.explanation, review.evidence]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .map(part => part.trim());
    next[questionIndex] = {
      ...question,
      correctIndex,
      correctAnswer: question.options[correctIndex],
      explanation: explanationParts.length > 0 ? explanationParts.join(' — ') : question.explanation,
    };
  }

  const unresolved = next.filter((question, index) =>
    question.type !== 'essay' && (
      !reviewedIndexes.has(index) ||
      question.correctIndex < 0 ||
      question.correctIndex >= question.options.length
    )
  );
  if (unresolved.length > 0) {
    throw new Error(`تعذر التحقق من إجابات ${unresolved.length} سؤالاً. لم يتم حفظ إجابة تخمينية.`);
  }
  return next;
}
