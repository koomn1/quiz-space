import { layoutLesson } from './layout';
import { validateLesson, type LessonStep, type ValidationResult, type WhiteboardLesson } from './lessonSchema';

const KEY = 'quizspace.whiteboard.lessons.v1';
const MAX_SAVED = 20;

/** AI output is always forced to an unreviewed draft before validation, whatever the model claims. */
export function validateAiLesson(raw: unknown, model?: string): ValidationResult {
  const obj = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const checked = validateLesson({
    ...obj,
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
    const parsed = JSON.parse(storage.getItem(KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(validateLesson).filter(r => r.ok && r.lesson).map(r => r.lesson!);
  } catch {
    return [];
  }
}

/** Saves a lesson on this device only, marked as reviewed by the person who confirmed it. */
export function saveReviewedLesson(lesson: WhiteboardLesson, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): WhiteboardLesson[] {
  const reviewed: WhiteboardLesson = { ...lesson, metadata: { ...lesson.metadata, status: 'reviewed' } };
  const next = [reviewed, ...loadSavedLessons(storage).filter(l => l.id !== lesson.id)].slice(0, MAX_SAVED);
  storage.setItem(KEY, JSON.stringify(next));
  return next;
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
  const probe = validateLesson({
    schema_version: 1, id: 'probe', title: lesson.title, lang: lesson.lang,
    steps: [...chain, candidate], metadata: { source: 'ai', status: 'draft' },
  });
  if (!probe.ok || !probe.lesson) return { ok: false, errors: probe.errors, warnings: probe.warnings };
  const laid = layoutLesson(probe.lesson);
  // Only problems in the new step matter; the earlier steps were already accepted.
  const last = laid.lesson.steps.length;
  const mine = laid.problems.filter(p => p.startsWith(`step ${last},`));
  if (mine.length > 0) return { ok: false, errors: mine, warnings: laid.fixes };
  return { ok: true, step: laid.lesson.steps[last - 1], errors: [], warnings: laid.fixes.filter(f => f.startsWith(`step ${last},`)) };
}
