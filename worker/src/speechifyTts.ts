/** Speechify TTS: selectable teacher voice alongside Munsit, on the owner's own Speechify credits.
 *  The API key lives only in Worker secrets. Arabic voice IDs are discovered from the account's
 *  voice list (cached), so no voice id is hardcoded. */
import type { Env } from './platform';
import type { TtsRequest, TtsResult } from './munsitTts';

const SPEECHIFY_SPEECH_URL = 'https://api.sws.speechify.com/v1/audio/speech';
const SPEECHIFY_VOICES_URL = 'https://api.sws.speechify.com/v1/voices';
const VOICES_CACHE_KEY = 'https://tts-cache.internal/speechify/voices-ar';

interface SpeechifyVoice { id?: string; voice_id?: string; name?: string; gender?: string; models?: { name?: string; languages?: string[] }[]; locale?: string }

/** First Arabic-capable voice id for the requested gender, cached for a day. */
async function arabicVoiceId(env: Env, gender: 'boy' | 'girl'): Promise<string | null> {
  const store = (globalThis as any).caches?.default as Cache | undefined;
  const cacheKey = `${VOICES_CACHE_KEY}/${gender}`;
  if (store) {
    const hit = await store.match(cacheKey).catch(() => undefined);
    if (hit) return (await hit.text()) || null;
  }
  let res: Response;
  try {
    res = await fetch(SPEECHIFY_VOICES_URL, { headers: { Authorization: `Bearer ${env.SPEECHIFY_API_KEY}` } });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let voices: SpeechifyVoice[];
  try {
    const data: any = await res.json();
    voices = Array.isArray(data) ? data : Array.isArray(data?.voices) ? data.voices : [];
  } catch {
    return null;
  }
  const wantsFemale = gender === 'girl';
  const arabic = voices.filter(v => {
    const id = v.id ?? v.voice_id;
    if (!id) return false;
    const langs = (v.models ?? []).flatMap(m => m.languages ?? []);
    return langs.some(l => typeof l === 'string' && l.toLowerCase().startsWith('ar')) || (v.locale ?? '').toLowerCase().startsWith('ar');
  });
  const pick = arabic.find(v => (v.gender ?? '').toLowerCase().startsWith(wantsFemale ? 'female' : 'male')) ?? arabic[0];
  const id = pick ? (pick.id ?? pick.voice_id ?? null) : null;
  if (id && store) {
    await store.put(cacheKey, new Response(id, { headers: { 'Cache-Control': 'max-age=86400' } })).catch(() => undefined);
  }
  return id;
}

async function cacheKey(req: TtsRequest): Promise<string> {
  const raw = `speechify2|${req.voice}|${req.speed}|${req.text}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `https://tts-cache.internal/speechify/${hex}`;
}

/** Synthesize with Speechify, cached like Munsit so repeated plays cost no credits. */
export async function synthesizeSpeechify(env: Env, req: TtsRequest): Promise<TtsResult> {
  if (!env.SPEECHIFY_API_KEY) return { ok: false, status: 503, error: 'tts_not_configured' };
  const store = (globalThis as any).caches?.default as Cache | undefined;
  const key = await cacheKey(req);
  if (store) {
    const hit = await store.match(key).catch(() => undefined);
    if (hit) return { ok: true, status: 200, body: await hit.arrayBuffer(), cached: true };
  }
  const voiceId = await arabicVoiceId(env, req.voice);
  if (!voiceId) return { ok: false, status: 502, error: 'tts_no_arabic_voice' };
  let res: Response;
  try {
    res = await fetch(SPEECHIFY_SPEECH_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.SPEECHIFY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: req.text,
        voice_id: voiceId,
        audio_format: 'wav',
        model: 'simba-3.0',
        options: { speech_rate: req.speed },
      }),
    });
  } catch (e: any) {
    return { ok: false, status: 502, error: `tts_unreachable: ${String(e?.message || e).slice(0, 120)}` };
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 160);
    return { ok: false, status: res.status === 402 ? 402 : 502, error: `tts_failed_${res.status}: ${detail}` };
  }
  // Speechify answers JSON with base64 audio_data by default; decode to real WAV bytes.
  const rawText = await res.text();
  let body: ArrayBuffer;
  if (rawText.startsWith('{')) {
    try {
      const data: any = JSON.parse(rawText);
      const b64 = typeof data?.audio_data === 'string' ? data.audio_data : '';
      if (!b64) return { ok: false, status: 502, error: `tts_bad_response: ${rawText.slice(0, 120)}` };
      body = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer as ArrayBuffer;
    } catch {
      return { ok: false, status: 502, error: 'tts_bad_response' };
    }
  } else {
    body = rawText ? new TextEncoder().encode(rawText).buffer as ArrayBuffer : new ArrayBuffer(0);
  }
  if (store && body.byteLength > 0 && body.byteLength < 8_000_000) {
    await store.put(key, new Response(body.slice(0), { headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'max-age=604800' } })).catch(() => undefined);
  }
  return { ok: true, status: 200, body, cached: false };
}
