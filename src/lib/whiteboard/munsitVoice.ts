/**
 * Munsit teacher voice: plays worker-synthesized Arabic narration (boy Alaa / girl Hala, fusha).
 * Every failure path returns null so the player falls back to the browser voice.
 * A per-lesson character budget guards the owner's credit wallet.
 */
import { requestLessonTts } from '../../services/aiWorkerClient';

export type MunsitGender = 'boy' | 'girl';

/** Characters of narration one lesson may synthesize (~2 credits per char of the owner's wallet). */
export const MUNSIT_LESSON_CHAR_BUDGET = 2000;

const budgets = new Map<string, number>();
export function munsitBudgetLeft(lessonId: string): number {
  return MUNSIT_LESSON_CHAR_BUDGET - (budgets.get(lessonId) ?? 0);
}
/** Test hook: reset all budgets. */
export function resetMunsitBudgets() { budgets.clear(); }

const audioCache = new Map<string, Promise<string | null>>();

async function loadClip(text: string, gender: MunsitGender, speed: number, provider: 'munsit' | 'speechify'): Promise<string | null> {
  const res = await requestLessonTts(text, gender === 'girl' ? 'girl' : 'boy', speed, provider);
  if (!res.ok) return null;
  return URL.createObjectURL(new Blob([res.audio], { type: 'audio/wav' }));
}

/** Create (or reuse) the cached clip fetch, charging the lesson budget once per unique clip. */
function ensureClip(lessonId: string, text: string, gender: MunsitGender, speed: number, provider: 'munsit' | 'speechify'): Promise<string | null> | null {
  const key = `${provider}|${gender}|${speed}|${text}`;
  let urlPromise = audioCache.get(key);
  if (!urlPromise) {
    if (munsitBudgetLeft(lessonId) < text.length) return null;
    budgets.set(lessonId, (budgets.get(lessonId) ?? 0) + text.length);
    urlPromise = loadClip(text, gender, speed, provider);
    audioCache.set(key, urlPromise);
    // A failed fetch is not retried forever, but one retry on next play is fair.
    urlPromise.then(u => { if (!u) audioCache.delete(key); });
  }
  return urlPromise;
}

/**
 * Warm the clip cache for an upcoming step so the voice can start with the step
 * instead of seconds later. No-ops on short text or a spent budget.
 */
export function prefetchMunsitClip(lessonId: string, text: string, gender: MunsitGender, speed: number, provider: 'munsit' | 'speechify' = 'munsit'): void {
  if (text.trim().length < 2) return;
  void ensureClip(lessonId, text, gender, speed, provider);
}

export interface MunsitPlayback {
  /** Real clip duration once metadata is loaded; null until then. */
  durationMs: number | null;
  stop: () => void;
}

/**
 * Try to speak with Munsit. Resolves to null on any failure (no key, 402 out of credits,
 * network, budget spent) so the caller falls back to the browser voice.
 */
export async function speakWithMunsit(
  lessonId: string,
  text: string,
  gender: MunsitGender,
  speed: number,
  onEnd: () => void,
  onDuration?: (ms: number) => void,
  provider: 'munsit' | 'speechify' = 'munsit',
): Promise<MunsitPlayback | null> {
  if (text.trim().length < 2) return null;
  const urlPromise = ensureClip(lessonId, text, gender, speed, provider);
  if (!urlPromise) return null;
  const url = await urlPromise;
  if (!url) return null;
  try {
    const audio = new Audio(url);
    const playback: MunsitPlayback = {
      durationMs: null,
      stop: () => { audio.pause(); audio.currentTime = 0; },
    };
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) { playback.durationMs = audio.duration * 1000; onDuration?.(playback.durationMs); }
    };
    audio.onended = onEnd;
    audio.onerror = onEnd;
    await audio.play();
    return playback;
  } catch {
    return null;
  }
}
