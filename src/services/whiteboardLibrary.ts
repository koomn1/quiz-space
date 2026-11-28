import { fetchWithAuth } from '../lib/authFetch';
import { getApiUrl } from '../lib/origin';
import { supabase } from '../lib/supabaseClient';
import { validateLesson, type WhiteboardLesson } from '../lib/whiteboard/lessonSchema';
import {
  loadSavedLessons,
  localOnlyLessons,
  mergeDownloadedLessons,
  setLessonLibraryAccount,
} from '../lib/whiteboard/lessonDrafts';

/**
 * Server-side whiteboard lesson library (worker + public.whiteboard_lessons).
 * Every function degrades quietly: until the migration is applied the worker answers
 * 503 storage_not_ready, and any network failure just means "local cache only".
 */

export interface ServerLessonMeta {
  id: string;
  title: string;
  lang: 'ar' | 'en';
  step_count: number;
  source_name: string | null;
  model: string | null;
  created_at: string;
}

export type SyncResult = 'ok' | 'not-ready' | 'failed' | 'signed-out';

export async function currentAccountId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

function statusOf(e: unknown): number {
  return typeof (e as { status?: number })?.status === 'number' ? (e as { status: number }).status : 0;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetchWithAuth(getApiUrl(path), init);
  if (response.ok) return response.json() as Promise<T>;
  const error = new Error(`lesson library request failed (${response.status})`) as Error & { status?: number };
  error.status = response.status;
  throw error;
}

export async function syncLessonToServer(lesson: WhiteboardLesson): Promise<SyncResult> {
  if (!(await currentAccountId())) return 'signed-out';
  try {
    await request<{ ok: boolean }>(`/api/ai/whiteboard-lessons/${encodeURIComponent(lesson.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lesson,
        model: lesson.metadata?.model,
      }),
    });
    return 'ok';
  } catch (e) {
    return statusOf(e) === 503 ? 'not-ready' : 'failed';
  }
}

export async function fetchServerLessonList(): Promise<ServerLessonMeta[] | null> {
  if (!(await currentAccountId())) return null;
  try {
    const res = await request<{ lessons: ServerLessonMeta[] }>('/api/ai/whiteboard-lessons', { method: 'GET' });
    return Array.isArray(res.lessons) ? res.lessons : [];
  } catch {
    return null;
  }
}

export async function fetchServerLesson(id: string): Promise<unknown | null> {
  try {
    const res = await request<{ lesson: unknown }>(`/api/ai/whiteboard-lessons/${encodeURIComponent(id)}`, { method: 'GET' });
    return res.lesson ?? null;
  } catch {
    return null;
  }
}

export async function deleteServerLesson(id: string): Promise<SyncResult> {
  if (!(await currentAccountId())) return 'signed-out';
  try {
    await request<{ ok: boolean }>(`/api/ai/whiteboard-lessons/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return 'ok';
  } catch (e) {
    return statusOf(e) === 503 ? 'not-ready' : 'failed';
  }
}

/**
 * Reconciles the local cache with the server library for the signed-in account:
 * uploads lessons the server lacks (saved before sync existed or while offline), downloads
 * lessons this device lacks, and returns the merged cache. Returns null when the account is
 * signed out, offline, or the migration is still pending: the caller keeps its local list.
 */
export async function syncLibraryFromServer(): Promise<WhiteboardLesson[] | null> {
  const uid = await currentAccountId();
  if (!uid) return null;
  setLessonLibraryAccount(uid);
  const metas = await fetchServerLessonList();
  if (metas === null) return null;
  const serverIds = new Set(metas.map(m => m.id));
  for (const lesson of localOnlyLessons(serverIds)) {
    await syncLessonToServer(lesson);
  }
  const localIds = new Set(loadSavedLessons().map(l => l.id));
  const downloaded: WhiteboardLesson[] = [];
  for (const meta of metas.slice(0, 20)) {
    if (localIds.has(meta.id)) continue;
    const raw = await fetchServerLesson(meta.id);
    const checked = validateLesson(raw);
    if (checked.ok && checked.lesson) downloaded.push(checked.lesson);
  }
  return mergeDownloadedLessons(downloaded);
}
