import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deleteLibraryLesson,
  getLibraryLesson,
  isLibraryPath,
  LESSON_ID_PATTERN,
  LibraryStorageNotReady,
  libraryLessonId,
  listLibraryLessons,
  saveLibraryLesson,
  validateStorableLesson,
} from './whiteboardLibrary';

const env = {
  SUPABASE_URL: 'https://example.supabase.co/',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
};

const validLesson = {
  schema_version: 1,
  id: 'ai-abc123',
  title: 'دورة الماء',
  lang: 'ar',
  steps: [{ id: 's1', title: 'مقدمة', narration: 'نَكْتُبُ', nodes: [] }],
  metadata: { source: 'ai', status: 'reviewed' },
};

function restResponse(status: number, body: unknown): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
}

afterEach(() => vi.unstubAllGlobals());

describe('whiteboard library paths', () => {
  it('accepts only the collection and safe lesson ids', () => {
    expect(isLibraryPath('/api/ai/whiteboard-lessons')).toBe(true);
    expect(isLibraryPath('/api/ai/whiteboard-lessons/ai-lx9-3f2k1a')).toBe(true);
    expect(isLibraryPath('/api/ai/whiteboard-lessonsXYZ')).toBe(false);
    expect(isLibraryPath('/api/ai/whiteboard-lessons/../secrets')).toBe(false);
    expect(isLibraryPath('/api/ai/whiteboard-lessons/')).toBe(false);
    expect(libraryLessonId('/api/ai/whiteboard-lessons/ai-ok_1-2')).toBe('ai-ok_1-2');
    expect(libraryLessonId('/api/ai/whiteboard-lessons')).toBeNull();
    expect(LESSON_ID_PATTERN.test('a/../b')).toBe(false);
  });
});

describe('validateStorableLesson', () => {
  it('accepts a well-formed lesson and reads its metadata', () => {
    const r = validateStorableLesson(validLesson);
    expect(r.ok).toBe(true);
    expect(r.title).toBe('دورة الماء');
    expect(r.lang).toBe('ar');
    expect(r.stepCount).toBe(1);
  });

  it('rejects malformed payloads', () => {
    expect(validateStorableLesson(null).ok).toBe(false);
    expect(validateStorableLesson([]).ok).toBe(false);
    expect(validateStorableLesson({ ...validLesson, schema_version: 2 }).ok).toBe(false);
    expect(validateStorableLesson({ ...validLesson, lang: 'fr' }).ok).toBe(false);
    expect(validateStorableLesson({ ...validLesson, title: '' }).ok).toBe(false);
    expect(validateStorableLesson({ ...validLesson, steps: [] }).ok).toBe(false);
  });
});

describe('library storage via PostgREST', () => {
  it('lists only the caller\'s lessons, newest first, with the service role', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return restResponse(200, [{ id: 'ai-1', title: 't', lang: 'ar', step_count: 5, source_name: null, model: null, created_at: '2026-11-28T00:00:00Z' }]);
    });
    const rows = await listLibraryLessons(env, 'Bearer user-jwt', 'uid-1');
    expect(rows).toHaveLength(1);
    expect(calls[0].url).toContain('user_id=eq.uid-1');
    expect(calls[0].url).toContain('order=created_at.desc');
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe('Bearer service-role');
  });

  it('scopes every read and delete to the verified uid and the lesson id', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      calls.push(String(url));
      return restResponse(200, []);
    });
    await getLibraryLesson(env, '', 'uid-1', 'ai-x');
    await deleteLibraryLesson(env, '', 'uid-1', 'ai-x');
    expect(calls[0]).toContain('user_id=eq.uid-1');
    expect(calls[0]).toContain('id=eq.ai-x');
    expect(calls[1]).toContain('user_id=eq.uid-1');
    expect(calls[1]).toContain('id=eq.ai-x');
  });

  it('upserts with merge-duplicates on the composite key', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return restResponse(200, []);
    });
    await saveLibraryLesson(env, '', 'uid-1', 'ai-x', validLesson, { sourceName: 'bio.pdf', model: 'm' });
    expect(calls[0].url).toContain('on_conflict=user_id,id');
    expect(calls[0].init?.method).toBe('POST');
    const sent = JSON.parse(String(calls[0].init?.body));
    expect(sent.user_id).toBe('uid-1');
    expect(sent.id).toBe('ai-x');
    expect(sent.step_count).toBe(1);
    expect(sent.source_name).toBe('bio.pdf');
    expect(sent.lesson_json.title).toBe('دورة الماء');
  });

  it('throws LibraryStorageNotReady when the table is missing', async () => {
    vi.stubGlobal('fetch', async () => restResponse(404, '{"code":"PGRST205","message":"Could not find the table \'public.whiteboard_lessons\' in the schema cache"}'));
    await expect(listLibraryLessons(env, '', 'uid-1')).rejects.toBeInstanceOf(LibraryStorageNotReady);
    await expect(saveLibraryLesson(env, '', 'uid-1', 'ai-x', validLesson)).rejects.toBeInstanceOf(LibraryStorageNotReady);
    await expect(deleteLibraryLesson(env, '', 'uid-1', 'ai-x')).rejects.toBeInstanceOf(LibraryStorageNotReady);
  });

  it('rejects saving an invalid payload before any network call', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(saveLibraryLesson(env, '', 'uid-1', 'ai-x', { nope: true })).rejects.toThrow('invalid lesson payload');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
