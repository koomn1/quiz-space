import { describe, expect, it } from 'vitest';
import { loadSavedLessons, saveReviewedLesson, validateAiLesson } from './lessonDrafts';

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
const raw = (over: object = {}) => ({ schema_version: 1, id: 'x1', title: 'T', lang: 'ar', metadata: { status: 'reviewed', source: 'manual' },
  steps: [{ id: 's', narration: 'شرح', nodes: [{ id: 'n', type: 'text', x: 10, y: 10, text: 'a', color: 'ink' }] }], ...over });

describe('lesson drafts', () => {
  it('forces AI output to an unreviewed ai draft even if the model claims otherwise', () => {
    const r = validateAiLesson(raw(), 'm');
    expect(r.ok).toBe(true);
    expect(r.lesson!.metadata).toMatchObject({ source: 'ai', status: 'draft', model: 'm' });
  });
  it('rejects non-object and broken AI output', () => {
    expect(validateAiLesson('nope').ok).toBe(false);
    expect(validateAiLesson(raw({ steps: [{ id: 's', narration: 'x', nodes: [{ id: 'n', type: 'iframe', x: 1, y: 1 }] }] })).ok).toBe(false);
  });
  it('gives every AI draft a fresh id so the player never shows a stale board', () => {
    const a = validateAiLesson(raw(), 'm').lesson!;
    const b = validateAiLesson(raw(), 'm').lesson!;
    expect(a.id).not.toBe('x1');
    expect(a.id).not.toBe(b.id);
  });
  it('saves reviewed lessons locally, de-duplicated, and ignores corrupt storage', () => {
    const st = memory();
    const lesson = validateAiLesson(raw()).lesson!;
    saveReviewedLesson(lesson, st);
    saveReviewedLesson(lesson, st);
    const saved = loadSavedLessons(st);
    expect(saved).toHaveLength(1);
    expect(saved[0].metadata.status).toBe('reviewed');
    st.setItem('quizspace.whiteboard.lessons.v1', '{bad');
    expect(loadSavedLessons(st)).toEqual([]);
  });
});
