/** Munsit (faseeh) Arabic TTS: request validation + cached synthesis. The API key lives only in Worker secrets. */
import type { Env } from './platform';

const MUNSIT_MODEL = 'faseeh-v1-preview';
const MUNSIT_URL = `https://api.munsit.com/api/v1/text-to-speech/${MUNSIT_MODEL}`;
/** Catalogue voices live-tested with the site owner: a young boy and a young girl reading fusha. */
const VOICES = {
  boy: 'fSonMJbD9Dk7daUy4ZHw02c5', // Alaa
  girl: '08XOzRjaaumxbHhcGOrWkJ7z', // Hala
} as const;

export type TtsProvider = 'munsit' | 'speechify';

export interface TtsRequest {
  voice: keyof typeof VOICES;
  text: string;
  speed: number;
  provider: TtsProvider;
}

export const TTS_TEXT_MAX = 1200; // characters per call; the client also budgets per lesson

export function parseTtsRequest(body: any): TtsRequest | null {
  if (!body || typeof body.text !== 'string') return null;
  const text = body.text.replace(/\s+/g, ' ').trim();
  if (text.length < 2 || text.length > TTS_TEXT_MAX) return null;
  const voice = body.voice === 'girl' ? 'girl' : body.voice === 'boy' ? 'boy' : null;
  if (!voice) return null;
  const speed = typeof body.speed === 'number' && Number.isFinite(body.speed)
    ? Math.min(1.2, Math.max(0.7, body.speed))
    : 1;
  const provider: TtsProvider = body.provider === 'speechify' ? 'speechify' : 'munsit';
  return { voice, text, speed, provider };
}

async function cacheKey(req: TtsRequest): Promise<string> {
  const raw = `${MUNSIT_MODEL}|${req.voice}|${req.speed}|${req.text}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `https://tts-cache.internal/munsit/${hex}`;
}

export interface TtsResult { ok: boolean; status: number; body?: ArrayBuffer; cached?: boolean; error?: string }

/** Synthesize with Munsit, cached in the Cloudflare Cache API so repeated plays cost no credits. */
export async function synthesizeMunsit(env: Env, req: TtsRequest): Promise<TtsResult> {
  if (!env.MUNSIT_API_KEY) return { ok: false, status: 503, error: 'tts_not_configured' };
  const store = (globalThis as any).caches?.default as Cache | undefined;
  const key = await cacheKey(req);
  if (store) {
    const hit = await store.match(key).catch(() => undefined);
    if (hit) return { ok: true, status: 200, body: await hit.arrayBuffer(), cached: true };
  }
  let res: Response;
  try {
    res = await fetch(MUNSIT_URL, {
      method: 'POST',
      headers: { 'x-api-key': env.MUNSIT_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voice_id: VOICES[req.voice],
        text: req.text,
        stability: 0.5,
        speed: req.speed,
        streaming: false,
        sample_rate: 48000,
        dialect: 'fusha',
      }),
    });
  } catch (e: any) {
    return { ok: false, status: 502, error: `tts_unreachable: ${String(e?.message || e).slice(0, 120)}` };
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 160);
    // 402 means the owner's wallet is empty: the player falls back to the browser voice.
    return { ok: false, status: res.status === 402 ? 402 : 502, error: `tts_failed_${res.status}: ${detail}` };
  }
  const body = await res.arrayBuffer();
  if (store && body.byteLength > 0 && body.byteLength < 8_000_000) {
    await store.put(key, new Response(body.slice(0), { headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'max-age=604800' } })).catch(() => undefined);
  }
  return { ok: true, status: 200, body, cached: false };
}
