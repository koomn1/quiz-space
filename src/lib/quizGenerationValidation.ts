export function filterValidGeneratedQuestions<T extends { text?: unknown; type?: unknown; options?: unknown }>(questions: T[] | null | undefined): T[] {
  return (questions || []).filter((question) => {
    if (String(question?.text || '').trim().length === 0) return false;
    if (question?.type !== 'mcq') return true;
    // Never put an unusable MCQ card with blank options into the editor.
    return Array.isArray(question?.options)
      && question.options.filter((option) => String(option || '').trim().length > 0).length >= 2;
  });
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
