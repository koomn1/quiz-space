import { layoutLesson } from './layout';
import { validateLesson, type LessonStep, type ValidationResult, type WhiteboardLesson } from './lessonSchema';

const BASE_KEY = 'quizspace.whiteboard.lessons.v1';
const MAX_SAVED = 50;
const MAX_TOMBSTONES = 100;

// Lessons are cached per account so two accounts sharing a device never see each other's
// library. Guests (signed out) keep using the legacy base key.
let activeAccountId: string | null = null;

function lessonsKey(): string {
  return activeAccountId ? `${BASE_KEY}.u-${activeAccountId}` : BASE_KEY;
}

function tombstonesKey(): string {
  return `${lessonsKey()}.deleted`;
}

/** Point the local cache at an account (null = guest/device). Migrates legacy device lessons once. */
export function setLessonLibraryAccount(accountId: string | null, storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage): void {
  const trimmed = accountId && accountId.trim() ? accountId.trim() : null;
  if (trimmed === activeAccountId) return;
  activeAccountId = trimmed;
  if (!trimmed) return;
  try {
    const legacy = storage.getItem(BASE_KEY);
    const accountKey = lessonsKey();
    if (legacy && !storage.getItem(accountKey)) {
      // Device-saved lessons predate accounts on this device: hand them to the first account that
      // claims this device, then clear the shared key so no second account inherits them.
      storage.setItem(accountKey, legacy);
      storage.removeItem(BASE_KEY);
    }
  } catch { /* storage unavailable */ }
}

export function loadTombstones(storage: Pick<Storage, 'getItem'> = localStorage): string[] {
  try {
    const parsed = JSON.parse(storage.getItem(tombstonesKey()) || '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function recordTombstone(id: string, storage: Pick<Storage, 'getItem' | 'setItem'>): void {
  const next = [id, ...loadTombstones(storage).filter(x => x !== id)].slice(0, MAX_TOMBSTONES);
  try { storage.setItem(tombstonesKey(), JSON.stringify(next)); } catch { /* ignore */ }
}

/** AI output is always forced to an unreviewed draft before validation, whatever the model claims. */
export function validateAiLesson(raw: unknown, model?: string): ValidationResult {
  const obj = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  // Every draft gets a fresh id: the player keys on it, and two drafts with the model's canned id would show a stale board.
  const checked = validateLesson({
    ...obj,
    id: `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    metadata: { source: 'ai', status: 'draft', createdAt: new Date().toISOString(), model },
  });
  if (!checked.ok || !checked.lesson) return checked;
  // Layout: repair what can be repaired, reject lessons that would still overlap or clip.
  const layout = layoutLesson(checked.lesson);
  if (layout.problems.length > 0) {
    return { ok: false, errors: layout.problems, warnings: [...checked.warnings, ...layout.fixes] };
  }
  return { ok: true, lesson: layout.lesson, errors: [], warnings: [...checked.warnings, ...layout.fixes] };
}

export function loadSavedLessons(storage: Pick<Storage, 'getItem'> = localStorage): WhiteboardLesson[] {
  try {
    const parsed = JSON.parse(storage.getItem(lessonsKey()) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(validateLesson).filter(r => r.ok && r.lesson).map(r => r.lesson!);
  } catch {
    return [];
  }
}

/** Saves a lesson to the active account's cache, marked as reviewed by the person who confirmed it. */
export function saveReviewedLesson(lesson: WhiteboardLesson, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): WhiteboardLesson[] {
  const reviewed: WhiteboardLesson = { ...lesson, metadata: { ...lesson.metadata, status: 'reviewed' } };
  const next = [reviewed, ...loadSavedLessons(storage).filter(l => l.id !== lesson.id)].slice(0, MAX_SAVED);
  storage.setItem(lessonsKey(), JSON.stringify(next));
  return next;
}

/** Removes a lesson from the cache and leaves a tombstone so server sync never resurrects it. */
export function removeSavedLesson(id: string, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): WhiteboardLesson[] {
  recordTombstone(id, storage);
  const next = loadSavedLessons(storage).filter(l => l.id !== id);
  storage.setItem(lessonsKey(), JSON.stringify(next));
  return next;
}

/** Merges server-downloaded lessons into the cache (newest first) and returns the merged list. */
export function mergeDownloadedLessons(downloaded: WhiteboardLesson[], storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): WhiteboardLesson[] {
  if (downloaded.length === 0) return loadSavedLessons(storage);
  const tombstones = new Set(loadTombstones(storage));
  const byId = new Map<string, WhiteboardLesson>();
  for (const l of [...downloaded, ...loadSavedLessons(storage)]) {
    if (!byId.has(l.id) && !tombstones.has(l.id)) byId.set(l.id, l);
  }
  const next = [...byId.values()]
    .sort((a, b) => (b.metadata.createdAt || '').localeCompare(a.metadata.createdAt || ''))
    .slice(0, MAX_SAVED);
  storage.setItem(lessonsKey(), JSON.stringify(next));
  return next;
}

/** Local lessons the server does not have yet (candidates to upload), tombstones excluded. */
export function localOnlyLessons(serverIds: Set<string>, storage: Pick<Storage, 'getItem'> = localStorage): WhiteboardLesson[] {
  const tombstones = new Set(loadTombstones(storage));
  return loadSavedLessons(storage).filter(l => !serverIds.has(l.id) && !tombstones.has(l.id));
}

/**
 * Validates an AI answer to a learner question and returns the step to insert after `afterIndex`.
 * The step is a branch that keeps the current board and draws in the free space; the same strict
 * validator and layout checker as full lessons apply, with the existing drawing treated as fixed.
 */
export function validateBranchStep(raw: unknown, lesson: WhiteboardLesson, afterIndex: number): { ok: boolean; step?: LessonStep; errors: string[]; warnings: string[] } {
  const obj = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const used = new Set(lesson.steps.map(s => s.id));
  let id = typeof obj.id === 'string' && obj.id ? obj.id.slice(0, 40) : 'q';
  id = `q-${id}`;
  for (let n = 2; used.has(id); n++) id = `q-${n}-${Date.now().toString(36)}`;
  const candidate = { ...obj, id, continues: true, branch: true };
  // Check the new step on top of the board it continues from: the previous step chain is carried in front of it.
  const chain: LessonStep[] = [];
  for (let i = afterIndex; i >= 0; i--) { chain.unshift(lesson.steps[i]); if (!lesson.steps[i].continues) break; }
  const probeWith = (cand: Record<string, unknown>) => {
    const probe = validateLesson({
      schema_version: 1, id: 'probe', title: lesson.title, lang: lesson.lang,
      steps: [...chain, cand], metadata: { source: 'ai', status: 'draft' },
    });
    if (!probe.ok || !probe.lesson) return { errors: probe.errors, warnings: probe.warnings, laid: null };
    return { errors: [] as string[], warnings: probe.warnings, laid: layoutLesson(probe.lesson) };
  };
  const accepted = (laid: ReturnType<typeof layoutLesson>) => {
    // Only problems in the new step matter; the earlier steps were already accepted.
    const last = laid.lesson.steps.length;
    const mine = laid.problems.filter(p => p.startsWith(`step ${last},`));
    if (mine.length > 0) return { ok: false as const, errors: mine, warnings: laid.fixes };
    return { ok: true as const, step: laid.lesson.steps[last - 1], errors: [] as string[], warnings: laid.fixes.filter(f => f.startsWith(`step ${last},`)) };
  };
  const first = probeWith(candidate);
  if (!first.laid) return { ok: false, errors: first.errors, warnings: first.warnings };
  const continued = accepted(first.laid);
  if (continued.ok) return continued;
  // A full board leaves no room for the answer: retry it as a fresh board instead of failing the question.
  const fresh = probeWith({ ...candidate, continues: false });
  if (fresh.laid) {
    const cleared = accepted(fresh.laid);
    if (cleared.ok) return { ...cleared, warnings: [...cleared.warnings, 'answer starts on a fresh board'] };
  }
  return { ok: false, errors: continued.errors, warnings: continued.warnings };
}
