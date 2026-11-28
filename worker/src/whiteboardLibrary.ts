/**
 * Per-user whiteboard lesson library, backed by public.whiteboard_lessons via PostgREST.
 *
 * Isolation model: the caller's id is always the server-verified uid (Supabase JWT or the
 * Firebase bridge's app_user_uid), and every query filters user_id = that uid. Database access
 * uses the service role when configured (native Firebase tokens are not Supabase JWTs), and
 * falls back to forwarding the caller's own Authorization header (web Supabase JWT, where the
 * table's RLS policies enforce the same scoping a second time).
 *
 * Until the whiteboard_lessons migration is applied, every operation returns
 * code 'storage_not_ready' (503) and clients stay on their local cache.
 */

export const LESSON_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/;
export const LESSON_BODY_MAX_BYTES = 512 * 1024;
export const LIBRARY_MAX_LESSONS = 50;

export interface WhiteboardLibraryEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export class LibraryStorageNotReady extends Error {
  constructor() {
    super('Whiteboard lesson storage is not set up yet.');
    this.name = 'LibraryStorageNotReady';
  }
}

export function isLibraryPath(path: string): boolean {
  return path === '/api/ai/whiteboard-lessons' || libraryLessonId(path) !== null;
}

export function libraryLessonId(path: string): string | null {
  const prefix = '/api/ai/whiteboard-lessons/';
  if (!path.startsWith(prefix)) return null;
  const id = path.slice(prefix.length);
  return LESSON_ID_PATTERN.test(id) ? id : null;
}

function baseUrl(env: WhiteboardLibraryEnv): string {
  return env.SUPABASE_URL.replace(/\/$/, '');
}

function dbHeaders(env: WhiteboardLibraryEnv, callerAuthHeader: string, extra: HeadersInit = {}): HeadersInit {
  const bearer = env.SUPABASE_SERVICE_ROLE_KEY ? `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` : callerAuthHeader;
  return { apikey: env.SUPABASE_ANON_KEY, Authorization: bearer, ...extra };
}

/** PostgREST answers PGRST205 ("table not found in schema cache") until the migration lands. */
function isMissingTable(status: number, body: string): boolean {
  return status === 404 && (body.includes('PGRST205') || body.includes('whiteboard_lessons'));
}

async function readError(resp: Response): Promise<string> {
  try { return (await resp.text()).slice(0, 400); } catch { return ''; }
}

export interface LessonMeta {
  id: string;
  title: string;
  lang: 'ar' | 'en';
  step_count: number;
  source_name: string | null;
  model: string | null;
  created_at: string;
}

export async function listLibraryLessons(env: WhiteboardLibraryEnv, callerAuthHeader: string, userId: string): Promise<LessonMeta[]> {
  const url = `${baseUrl(env)}/rest/v1/whiteboard_lessons?user_id=eq.${encodeURIComponent(userId)}&select=id,title,lang,step_count,source_name,model,created_at&order=created_at.desc&limit=${LIBRARY_MAX_LESSONS}`;
  const resp = await fetch(url, { headers: dbHeaders(env, callerAuthHeader) });
  if (!resp.ok) {
    const detail = await readError(resp);
    if (isMissingTable(resp.status, detail)) throw new LibraryStorageNotReady();
    throw new Error(`whiteboard_lessons list failed (${resp.status})`);
  }
  const rows = await resp.json() as LessonMeta[];
  return Array.isArray(rows) ? rows : [];
}

export async function getLibraryLesson(env: WhiteboardLibraryEnv, callerAuthHeader: string, userId: string, id: string): Promise<{ meta: LessonMeta; lesson: unknown } | null> {
  const url = `${baseUrl(env)}/rest/v1/whiteboard_lessons?user_id=eq.${encodeURIComponent(userId)}&id=eq.${encodeURIComponent(id)}&select=id,title,lang,step_count,source_name,model,created_at,lesson_json&limit=1`;
  const resp = await fetch(url, { headers: dbHeaders(env, callerAuthHeader) });
  if (!resp.ok) {
    const detail = await readError(resp);
    if (isMissingTable(resp.status, detail)) throw new LibraryStorageNotReady();
    throw new Error(`whiteboard_lessons get failed (${resp.status})`);
  }
  const rows = await resp.json() as Array<LessonMeta & { lesson_json: unknown }>;
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return null;
  const { lesson_json, ...meta } = row;
  return { meta, lesson: lesson_json };
}

/** Minimal trust-boundary check; the client's strict validator already ran on this document. */
export function validateStorableLesson(raw: unknown): { ok: boolean; lesson?: Record<string, unknown>; title?: string; lang?: 'ar' | 'en'; stepCount?: number } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false };
  const lesson = raw as Record<string, unknown>;
  if (lesson.schema_version !== 1) return { ok: false };
  if (lesson.lang !== 'ar' && lesson.lang !== 'en') return { ok: false };
  const title = typeof lesson.title === 'string' ? lesson.title.trim() : '';
  if (!title || title.length > 200) return { ok: false };
  if (!Array.isArray(lesson.steps) || lesson.steps.length < 1 || lesson.steps.length > 24) return { ok: false };
  return { ok: true, lesson, title, lang: lesson.lang, stepCount: lesson.steps.length };
}

export async function saveLibraryLesson(
  env: WhiteboardLibraryEnv,
  callerAuthHeader: string,
  userId: string,
  id: string,
  rawLesson: unknown,
  extra: { sourceName?: string; model?: string } = {},
): Promise<void> {
  const checked = validateStorableLesson(rawLesson);
  if (!checked.ok || !checked.lesson) throw new Error('invalid lesson payload');
  const row = {
    user_id: userId,
    id,
    title: checked.title!,
    lang: checked.lang!,
    step_count: checked.stepCount!,
    source_name: typeof extra.sourceName === 'string' && extra.sourceName.trim() ? extra.sourceName.trim().slice(0, 255) : null,
    model: typeof extra.model === 'string' && extra.model.trim() ? extra.model.trim().slice(0, 120) : null,
    lesson_json: checked.lesson,
    updated_at: new Date().toISOString(),
  };
  const resp = await fetch(`${baseUrl(env)}/rest/v1/whiteboard_lessons?on_conflict=user_id,id`, {
    method: 'POST',
    headers: dbHeaders(env, callerAuthHeader, { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify(row),
  });
  if (!resp.ok) {
    const detail = await readError(resp);
    if (isMissingTable(resp.status, detail)) throw new LibraryStorageNotReady();
    throw new Error(`whiteboard_lessons save failed (${resp.status})`);
  }
  await pruneLibrary(env, callerAuthHeader, userId);
}

/** Keeps the newest LIBRARY_MAX_LESSONS rows per user; older history is dropped server-side too. */
async function pruneLibrary(env: WhiteboardLibraryEnv, callerAuthHeader: string, userId: string): Promise<void> {
  try {
    const url = `${baseUrl(env)}/rest/v1/whiteboard_lessons?user_id=eq.${encodeURIComponent(userId)}&select=id&order=created_at.desc&limit=200`;
    const resp = await fetch(url, { headers: dbHeaders(env, callerAuthHeader) });
    if (!resp.ok) return;
    const rows = await resp.json() as Array<{ id: string }>;
    if (!Array.isArray(rows) || rows.length <= LIBRARY_MAX_LESSONS) return;
    const excess = rows.slice(LIBRARY_MAX_LESSONS).map(r => r.id).filter(id => LESSON_ID_PATTERN.test(id));
    if (excess.length === 0) return;
    await fetch(`${baseUrl(env)}/rest/v1/whiteboard_lessons?user_id=eq.${encodeURIComponent(userId)}&id=in.(${excess.map(encodeURIComponent).join(',')})`, {
      method: 'DELETE',
      headers: dbHeaders(env, callerAuthHeader),
    });
  } catch {
    // Pruning is housekeeping; a failure never fails the save.
  }
}

export async function deleteLibraryLesson(env: WhiteboardLibraryEnv, callerAuthHeader: string, userId: string, id: string): Promise<void> {
  const resp = await fetch(`${baseUrl(env)}/rest/v1/whiteboard_lessons?user_id=eq.${encodeURIComponent(userId)}&id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: dbHeaders(env, callerAuthHeader),
  });
  if (!resp.ok) {
    const detail = await readError(resp);
    if (isMissingTable(resp.status, detail)) throw new LibraryStorageNotReady();
    throw new Error(`whiteboard_lessons delete failed (${resp.status})`);
  }
}
