import { validateLesson, type ValidationResult, type WhiteboardLesson } from './lessonSchema';

const KEY = 'quizspace.whiteboard.lessons.v1';
const MAX_SAVED = 20;

/** AI output is always forced to an unreviewed draft before validation, whatever the model claims. */
export function validateAiLesson(raw: unknown, model?: string): ValidationResult {
  const obj = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return validateLesson({
    ...obj,
    metadata: { source: 'ai', status: 'draft', createdAt: new Date().toISOString(), model },
  });
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
