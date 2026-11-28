import { describe, expect, it } from 'vitest';
import {
  loadSavedLessons,
  loadTombstones,
  localOnlyLessons,
  mergeDownloadedLessons,
  removeSavedLesson,
  saveReviewedLesson,
  setLessonLibraryAccount,
  validateAiLesson,
} from './lessonDrafts';
import type { WhiteboardLesson } from './lessonSchema';

function memStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    _map: map,
  };
}

function lesson(id: string, createdAt?: string): WhiteboardLesson {
  return {
    schema_version: 1,
    id,
    title: `Lesson ${id}`,
    lang: 'ar',
    canvas: { width: 1280, height: 720 },
    steps: [{ id: 's1', title: 'مقدمة', narration: 'نَكْتُبُ', nodes: [] }],
    metadata: { source: 'ai', status: 'reviewed', createdAt },
  };
}

describe('lesson library account isolation', () => {
  it('keeps separate caches per account and a shared one for guests', () => {
    const st = memStorage();
    setLessonLibraryAccount(null, st);
    saveReviewedLesson(lesson('guest-1'), st);
    setLessonLibraryAccount('uid-a', st);
    expect(loadSavedLessons(st).map(l => l.id)).toEqual(['guest-1']); // legacy migrates to first account
    saveReviewedLesson(lesson('a-1'), st);
    setLessonLibraryAccount('uid-b', st);
    expect(loadSavedLessons(st)).toEqual([]); // second account starts empty, no leak
    saveReviewedLesson(lesson('b-1'), st);
    setLessonLibraryAccount('uid-a', st);
    expect(loadSavedLessons(st).map(l => l.id)).toEqual(['a-1', 'guest-1']);
    setLessonLibraryAccount(null, st);
    expect(loadSavedLessons(st)).toEqual([]); // legacy key was consumed by the migration
    setLessonLibraryAccount(null, st);
  });

  it('migrates legacy device lessons only once', () => {
    const st = memStorage();
    setLessonLibraryAccount(null, st);
    saveReviewedLesson(lesson('legacy-1'), st);
    setLessonLibraryAccount('uid-a', st);
    setLessonLibraryAccount(null, st);
    saveReviewedLesson(lesson('guest-new'), st);
    setLessonLibraryAccount('uid-b', st);
    // uid-b gets the guest key contents (guest-new), not uid-a's migrated lessons.
    expect(loadSavedLessons(st).map(l => l.id)).toEqual(['guest-new']);
    setLessonLibraryAccount(null, st);
  });
});

describe('lesson library deletion and merge', () => {
  it('removeSavedLesson deletes and leaves a tombstone', () => {
    const st = memStorage();
    setLessonLibraryAccount('uid-a', st);
    saveReviewedLesson(lesson('x'), st);
    removeSavedLesson('x', st);
    expect(loadSavedLessons(st)).toEqual([]);
    expect(loadTombstones(st)).toContain('x');
    // A tombstoned lesson never comes back through a server merge.
    expect(mergeDownloadedLessons([lesson('x')], st)).toEqual([]);
    setLessonLibraryAccount(null, st);
  });

  it('mergeDownloadedLessons dedupes by id and sorts newest first', () => {
    const st = memStorage();
    setLessonLibraryAccount('uid-a', st);
    saveReviewedLesson(lesson('old', '2026-11-01T00:00:00Z'), st);
    const merged = mergeDownloadedLessons([lesson('new', '2026-11-28T00:00:00Z')], st);
    expect(merged.map(l => l.id)).toEqual(['new', 'old']);
    const again = mergeDownloadedLessons([lesson('new', '2026-11-28T00:00:00Z')], st);
    expect(again.map(l => l.id)).toEqual(['new', 'old']);
    setLessonLibraryAccount(null, st);
  });

  it('localOnlyLessons excludes server-known and tombstoned ids', () => {
    const st = memStorage();
    setLessonLibraryAccount('uid-a', st);
    saveReviewedLesson(lesson('on-server'), st);
    saveReviewedLesson(lesson('only-local'), st);
    saveReviewedLesson(lesson('deleted-remote'), st);
    removeSavedLesson('deleted-remote', st);
    const only = localOnlyLessons(new Set(['on-server']), st);
    expect(only.map(l => l.id)).toEqual(['only-local']);
    setLessonLibraryAccount(null, st);
  });
});

describe('validateAiLesson (unchanged pipeline)', () => {
  it('still forces a fresh id and draft status', () => {
    const checked = validateAiLesson({
      schema_version: 1, id: 'ai-lesson', title: 't', lang: 'ar',
      steps: [{ id: 's1', title: 'a', narration: 'بِسْمِ اللَّهِ نَبْدَأُ هَذَا الدَّرْسَ', nodes: [] }],
      metadata: { source: 'ai', status: 'reviewed' },
    });
    expect(checked.ok).toBe(true);
    expect(checked.lesson!.id).not.toBe('ai-lesson');
    expect(checked.lesson!.metadata.status).toBe('draft');
  });
});
