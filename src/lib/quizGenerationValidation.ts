export function filterValidGeneratedQuestions<T extends { text?: unknown }>(questions: T[] | null | undefined): T[] {
  return (questions || []).filter((question) => String(question?.text || '').trim().length > 0);
}
