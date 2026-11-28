/** Whisper speech-to-text for whiteboard voice questions. The API key lives only in Worker secrets.
 *  Provider URL/model are env-overridable so the same code serves OpenAI Whisper or a compatible endpoint. */
import type { Env } from './platform';

const DEFAULT_STT_URL = 'https://api.whisper-api.com/transcribe';
const OPENAI_STT_URL = 'https://api.openai.com/v1/audio/transcriptions';
const DEFAULT_STT_MODEL = 'base';
const STT_POLL_MS = 1500;
const STT_POLL_MAX = 26;
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

/** Transcribe a short question clip. One call per student question; nothing is cached.
 *  Two providers, picked from WHISPER_STT_URL: whisper-api.com (X-API-Key + task polling,
 *  the default) or any OpenAI-compatible transcriptions endpoint (Bearer key). */
export async function transcribeWhisper(env: Env, audio: { bytes: ArrayBuffer; filename: string; type: string }, lang?: string): Promise<SttResult> {
  if (!env.WHISPER_API_KEY) return { ok: false, status: 503, error: 'stt_not_configured' };
  const url = env.WHISPER_STT_URL || DEFAULT_STT_URL;
  if (url.includes('whisper-api.com')) return transcribeWhisperApi(env, audio, lang, url);
  return transcribeOpenAiCompat(env, audio, lang, url);
}

/** whisper-api.com: POST /transcribe starts a task; poll /status/{task_id} for the text. */
async function transcribeWhisperApi(env: Env, audio: { bytes: ArrayBuffer; filename: string; type: string }, lang: string | undefined, url: string): Promise<SttResult> {
  const key = env.WHISPER_API_KEY!;
  const form = new FormData();
  form.append('file', new Blob([audio.bytes], { type: audio.type }), audio.filename);
  form.append('language', lang ?? 'ar');
  form.append('format', 'text');
  form.append('model_size', env.WHISPER_STT_MODEL || DEFAULT_STT_MODEL);
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'X-API-Key': key }, body: form });
  } catch (e: any) {
    return { ok: false, status: 502, error: `stt_unreachable: ${String(e?.message || e).slice(0, 120)}` };
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 160);
    return { ok: false, status: 502, error: `stt_failed_${res.status}: ${detail}` };
  }
  let task: any;
  try {
    task = await res.json();
  } catch {
    return { ok: false, status: 502, error: 'stt_bad_response' };
  }
  const direct = typeof task?.result === 'string' ? task.result.trim() : '';
  if (direct) return { ok: true, status: 200, text: direct.slice(0, 500) };
  const taskId = typeof task?.task_id === 'string' ? task.task_id : '';
  if (!taskId) return { ok: false, status: 502, error: 'stt_bad_response' };
  const statusUrl = url.replace(/\/transcribe\/?$/, '') + `/status/${taskId}`;
  for (let attempt = 0; attempt < STT_POLL_MAX; attempt++) {
    await new Promise((r) => setTimeout(r, STT_POLL_MS));
    let poll: Response;
    try {
      poll = await fetch(statusUrl, { headers: { 'X-API-Key': key } });
    } catch {
      continue;
    }
    if (!poll.ok) continue;
    const data: any = await poll.json().catch(() => null);
    if (!data) continue;
    const text = typeof data.result === 'string' ? data.result.trim() : '';
    if (text) return { ok: true, status: 200, text: text.slice(0, 500) };
    const status = String(data.status ?? '').toLowerCase();
    if (status === 'completed' || status === 'complete' || status === 'done' || status === 'success') {
      // /status never carries the text; the finished transcript lives on /transcript/{task_id}.
      const transcriptUrl = url.replace(/\/transcribe\/?$/, '') + `/transcript/${taskId}`;
      try {
        const tr = await fetch(transcriptUrl, { headers: { 'X-API-Key': key } });
        const td: any = tr.ok ? await tr.json() : null;
        const finalText = String(td?.result ?? td?.text ?? '').trim();
        if (finalText) return { ok: true, status: 200, text: finalText.slice(0, 500) };
      } catch {
        // fall through to stt_empty
      }
      return { ok: false, status: 502, error: 'stt_empty' };
    }
    if (status === 'failed' || status === 'error' || data.error) {
      return { ok: false, status: 502, error: `stt_failed: ${String(data.error ?? status).slice(0, 120)}` };
    }
  }
  return { ok: false, status: 502, error: 'stt_timeout' };
}

/** OpenAI-compatible endpoint (api.openai.com or a self-hosted compatible one). */
async function transcribeOpenAiCompat(env: Env, audio: { bytes: ArrayBuffer; filename: string; type: string }, lang: string | undefined, url: string): Promise<SttResult> {
  const model = env.WHISPER_STT_MODEL || (url.includes('api.openai.com') ? 'whisper-1' : DEFAULT_STT_MODEL);
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
