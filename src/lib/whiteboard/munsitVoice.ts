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

async function loadClip(text: string, gender: MunsitGender, speed: number): Promise<string | null> {
  const res = await requestLessonTts(text, gender === 'girl' ? 'girl' : 'boy', speed);
  if (!res.ok) return null;
  return URL.createObjectURL(new Blob([res.audio], { type: 'audio/wav' }));
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
): Promise<MunsitPlayback | null> {
  if (text.trim().length < 2) return null;
  if (munsitBudgetLeft(lessonId) < text.length) return null;
  const key = `${gender}|${speed}|${text}`;
  let urlPromise = audioCache.get(key);
  if (!urlPromise) {
    budgets.set(lessonId, (budgets.get(lessonId) ?? 0) + text.length);
    urlPromise = loadClip(text, gender, speed);
    audioCache.set(key, urlPromise);
    // A failed fetch is not retried forever, but one retry on next play is fair.
    urlPromise.then(u => { if (!u) audioCache.delete(key); });
  }
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
