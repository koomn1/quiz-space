export const COSMO_QUIZ_MIN_COUNT = 3;
export const COSMO_QUIZ_MAX_COUNT = 100;
export const COSMO_QUIZ_COUNT_OPTIONS = [5, 10, 20, 30, 50, 75, 100] as const;

export interface CosmoCoverageConcept {
  id: string;
  concept: string;
}

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

function normalizedConcept(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\u0640]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const unfenced = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const value = JSON.parse(unfenced);
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      const value = JSON.parse(unfenced.slice(start, end + 1));
      return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
}

/** Parse and validate the unique, source-derived targets returned by Auto planning. */
export function parseAutomaticCoveragePlan(response: string, minimumCount = COSMO_QUIZ_MIN_COUNT): CosmoCoverageConcept[] | null {
  const payload = parseJsonObject(String(response || ''));
  const rawPlan = payload?.coveragePlan ?? payload?.concepts;
  if (!Array.isArray(rawPlan) || rawPlan.length < minimumCount || rawPlan.length > COSMO_QUIZ_MAX_COUNT) return null;

  const seenIds = new Set<string>();
  const seenConcepts = new Set<string>();
  const plan: CosmoCoverageConcept[] = [];
  for (const item of rawPlan) {
    if (!item || typeof item !== 'object') return null;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    const concept = typeof record.concept === 'string' ? record.concept.trim() : '';
    const normalized = normalizedConcept(concept);
    if (!/^[A-Za-z0-9_-]{2,16}$/.test(id) || !concept || concept.length > 240 || seenIds.has(id) || !normalized || seenConcepts.has(normalized)) return null;
    seenIds.add(id);
    seenConcepts.add(normalized);
    plan.push({ id, concept });
  }
  return plan;
}

/** Ensures every planned concept is assigned to exactly one generated question. */
export function validateCoverageAssignments(
  expectedIds: string[],
  assignedIds: Array<string | undefined | null>,
): { valid: boolean; missingIds: string[]; duplicateIds: string[]; unexpectedIds: string[] } {
  const expected = new Set(expectedIds);
  const counts = new Map<string, number>();
  for (const rawId of assignedIds) {
    const id = String(rawId || '').trim();
    if (id) counts.set(id, (counts.get(id) || 0) + 1);
  }
  const missingIds = expectedIds.filter(id => (counts.get(id) || 0) === 0);
  const duplicateIds = expectedIds.filter(id => (counts.get(id) || 0) > 1);
  const unexpectedIds = [...counts.keys()].filter(id => !expected.has(id));
  return { valid: missingIds.length === 0 && duplicateIds.length === 0 && unexpectedIds.length === 0 && assignedIds.length === expectedIds.length, missingIds, duplicateIds, unexpectedIds };
}

/** Parses the semantic audit's repair list and refuses unknown coverage IDs. */
export function parseCoverageAuditReplacementIds(response: string, expectedIds: string[]): string[] | null {
  const payload = parseJsonObject(String(response || ''));
  const rawIds = payload?.replaceConceptIds;
  if (!Array.isArray(rawIds) || rawIds.some(id => typeof id !== 'string')) return null;
  const expected = new Set(expectedIds);
  const ids = [...new Set(rawIds.map(id => String(id).trim()))];
  return ids.every(id => expected.has(id)) ? ids : null;
}
