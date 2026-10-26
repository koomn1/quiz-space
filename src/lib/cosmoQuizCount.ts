export const COSMO_QUIZ_MIN_COUNT = 3;
export const COSMO_QUIZ_MAX_COUNT = 100;
export const COSMO_QUIZ_COUNT_OPTIONS = [5, 10, 20, 30, 50, 75, 100] as const;

export function parseExplicitQuestionCount(text: string): number | null {
  const normalized = String(text || '').replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const match = normalized.match(/(\d{1,3})\s*(?:سؤال|اسئلة|أسئلة|questions?)/i);
  if (!match) return null;
  const requested = Number(match[1]);
  if (!Number.isInteger(requested)) return null;
  return Math.min(COSMO_QUIZ_MAX_COUNT, Math.max(COSMO_QUIZ_MIN_COUNT, requested));
}

export function parseAutomaticQuestionCount(response: string): number | null {
  const text = String(response || '').trim();
  const match = text.match(/["']?(?:amount|count|questionCount)["']?\s*:\s*(\d{1,3})/i)
    || text.match(/^\s*(\d{1,3})\s*$/);
  if (!match) return null;
  const amount = Number(match[1]);
  return Number.isInteger(amount) && amount >= COSMO_QUIZ_MIN_COUNT && amount <= COSMO_QUIZ_MAX_COUNT
    ? amount
    : null;
}
