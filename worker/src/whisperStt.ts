/** Whisper speech-to-text for whiteboard voice questions. The API key lives only in Worker secrets.
 *  Provider URL/model are env-overridable so the same code serves OpenAI Whisper or a compatible endpoint. */
import type { Env } from './platform';

const DEFAULT_STT_URL = 'https://api.openai.com/v1/audio/transcriptions';
const DEFAULT_STT_MODEL = 'whisper-1';
const AUDIO_MAX_BYTES = 8_000_000;

export interface SttResult { ok: boolean; status: number; text?: string; error?: string }

/** Extract the uploaded audio from a multipart/form-data request. */
export async function parseAudioUpload(request: Request): Promise<{ bytes: ArrayBuffer; filename: string; type: string } | null> {
  const type = request.headers.get('content-type') ?? '';
  if (!type.includes('multipart/form-data')) return null;
  const form = await request.formData().catch(() => null);
  if (!form) return null;
  const file = form.get('audio');
  if (!file || typeof file === 'string') return null;
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength < 200 || bytes.byteLength > AUDIO_MAX_BYTES) return null;
  const filename = (file as File).name || 'question.webm';
  return { bytes, filename, type: (file as File).type || 'audio/webm' };
}

/** Transcribe a short question clip. One call per student question; nothing is cached. */
export async function transcribeWhisper(env: Env, audio: { bytes: ArrayBuffer; filename: string; type: string }, lang?: string): Promise<SttResult> {
  if (!env.WHISPER_API_KEY) return { ok: false, status: 503, error: 'stt_not_configured' };
  const url = env.WHISPER_STT_URL || DEFAULT_STT_URL;
  const model = env.WHISPER_STT_MODEL || DEFAULT_STT_MODEL;
  const form = new FormData();
  form.append('file', new Blob([audio.bytes], { type: audio.type }), audio.filename);
  form.append('model', model);
  form.append('response_format', 'json');
  if (lang) form.append('language', lang);
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${env.WHISPER_API_KEY}` }, body: form });
  } catch (e: any) {
    return { ok: false, status: 502, error: `stt_unreachable: ${String(e?.message || e).slice(0, 120)}` };
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 160);
    return { ok: false, status: 502, error: `stt_failed_${res.status}: ${detail}` };
  }
  try {
    const data: any = await res.json();
    const text = typeof data?.text === 'string' ? data.text.trim() : '';
    if (!text) return { ok: false, status: 502, error: 'stt_empty' };
    return { ok: true, status: 200, text: text.slice(0, 500) };
  } catch {
    return { ok: false, status: 502, error: 'stt_bad_response' };
  }
}
