import type { Question } from '../types';

export type AnswerReview = {
  questionIndex?: number;
  index?: number;
  correctIndex?: number;
  correctAnswer?: string;
  explanation?: string;
  evidence?: string;
};

export function parseAnswerReviews(text: string): AnswerReview[] {
  const cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const objectStart = cleaned.indexOf('{');
  const objectEnd = cleaned.lastIndexOf('}');
  if (objectStart < 0 || objectEnd <= objectStart) {
    throw new Error('لم تُرجع مرحلة حل الاختبار نتيجة JSON صالحة.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
  } catch {
    throw new Error('لم تُرجع مرحلة حل الاختبار نتيجة JSON صالحة.');
  }
  const reviews = Array.isArray(parsed) ? parsed : (parsed as { answers?: unknown } | null)?.answers;
  if (!Array.isArray(reviews)) {
    throw new Error('لم تُرجع مرحلة حل الاختبار إجابات قابلة للمراجعة.');
  }
  return reviews as AnswerReview[];
}

export function normalizeReviewAnswer(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[.,،؛:!?؟"'`()\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

export function applyVerifiedAnswerReviews(questions: Question[], responseText: string): Question[] {
  const next = questions.map(question => ({ ...question }));
  const reviews = parseAnswerReviews(responseText);
  const reviewedIndexes = new Set<number>();

  for (const review of reviews) {
    const rawIndex = Number(review.questionIndex ?? review.index);
    const questionIndex = Number.isInteger(rawIndex) ? rawIndex - 1 : -1;
    const question = next[questionIndex];
    if (!question) {
      throw new Error('مرحلة حل الاختبار أعادت رقم سؤال غير صالح.');
    }
    if (question.type === 'essay') continue;
    if (reviewedIndexes.has(questionIndex)) {
      throw new Error('مرحلة حل الاختبار أعادت إجابة مكررة لسؤال واحد.');
    }

    const correctIndex = Number(review.correctIndex);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= question.options.length) {
      continue;
    }
    const optionAnswer = normalizeReviewAnswer(question.options[correctIndex]);
    const returnedAnswer = normalizeReviewAnswer(review.correctAnswer);
    if (!returnedAnswer || returnedAnswer !== optionAnswer) continue;

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
