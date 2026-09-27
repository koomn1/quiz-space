export function filterValidGeneratedQuestions<T extends { text?: unknown }>(questions: T[] | null | undefined): T[] {
  return (questions || []).filter((question) => String(question?.text || '').trim().length > 0);
}

export type AllowedGeneratedQuestionType = 'mcq' | 'tf' | 'essay';

/** Keep the UI contract authoritative even when a provider ignores part of the prompt. */
export function filterGeneratedQuestionsByType<T extends { type?: unknown }>(
  questions: T[] | null | undefined,
  allowedTypes: AllowedGeneratedQuestionType[],
): T[] {
  const allowed = new Set<AllowedGeneratedQuestionType>(allowedTypes.length ? allowedTypes : ['mcq']);
  return (questions || []).filter((question) => allowed.has(question?.type as AllowedGeneratedQuestionType));
}
