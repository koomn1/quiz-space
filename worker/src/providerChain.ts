import type { Env } from './platform';

export type ProviderMessage = { role: string; content: unknown };
export type ProviderOptions = {
  max_tokens?: number;
  temperature?: number;
  timeoutMs?: number;
  response_format?: { type: 'json_object' };
  validateResponse?: (text: string, provider: string, model: string) => void;
};

export const INCEPTION_MODEL = 'mercury-3';
export const GROQ_MODEL = 'openai/gpt-oss-20b';
export const GEMINI_MODEL = 'gemini-3.8-flash';
export const OPENAI_MODEL = 'gpt-5-mini';

type ProviderCall = (env: Env, messages: ProviderMessage[], options: ProviderOptions) => Promise<string>;

const INCEPTION_URL = 'https://api.inceptionlabs.ai/v1/chat/completions';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function timeoutFor(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, dispose: () => clearTimeout(timer) };
}

function isMultimodal(messages: ProviderMessage[]) {
  return messages.some(message => Array.isArray(message.content));
}

function contentText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(contentText).join('');
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return contentText(record.text ?? record.content ?? record.output ?? record.result);
  }
  return '';
}

function toGeminiPart(value: unknown): any[] {
  if (typeof value === 'string') return [{ text: value }];
  if (!Array.isArray(value)) return [{ text: contentText(value) }];
  const parts: any[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, any>;
    if (record.type === 'text' && typeof record.text === 'string') parts.push({ text: record.text });
    if (record.type === 'image_url' && typeof record.image_url?.url === 'string') {
      const match = record.image_url.url.match(/^data:([^;]+);base64,(.+)$/s);
      if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
    if (record.type === 'file' && typeof record.file?.file_data === 'string') {
      const match = record.file.file_data.match(/^data:([^;]+);base64,(.+)$/s);
      if (match) parts.push({ inlineData: { mimeType: match?.[1] || 'application/octet-stream', data: match?.[2] || record.file.file_data } });
    }
  }
  return parts.length ? parts : [{ text: contentText(value) }];
}

function toGeminiRequest(messages: ProviderMessage[], options: ProviderOptions) {
  const system = messages.find(message => message.role === 'system');
  const contents = messages.filter(message => message.role !== 'system').map(message => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: toGeminiPart(message.content),
  }));
  return {
    ...(system ? { systemInstruction: { parts: [{ text: contentText(system.content) }] } } : {}),
    contents,
    generationConfig: {
      maxOutputTokens: options.max_tokens || 12_000,
      ...(options.response_format?.type === 'json_object' ? { responseMimeType: 'application/json' } : {}),
    },
  };
}

function extractText(payload: any): string {
  const choice = payload?.choices?.[0];
  if (choice) return contentText(choice.message?.content ?? choice.text);
  return (payload?.candidates?.[0]?.content?.parts || []).map((part: any) => part?.text || '').join('').trim();
}

async function requestJson(url: string, init: RequestInit, provider: string, model: string, timeoutMs: number): Promise<string> {
  const timeout = timeoutFor(timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: timeout.signal });
    if (!response.ok) throw new Error(`${provider} ${model} failed (${response.status})`);
    const text = extractText(await response.json());
    if (!text.trim()) throw new Error(`${provider} ${model} returned an empty response`);
    return text.trim();
  } finally {
    timeout.dispose();
  }
}

async function callInception(env: Env, messages: ProviderMessage[], options: ProviderOptions) {
  if (!env.INCEPTION_API_KEY || isMultimodal(messages)) throw new Error('Inception is unavailable for this request');
  return requestJson(INCEPTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.INCEPTION_API_KEY}` },
    body: JSON.stringify({ model: INCEPTION_MODEL, messages, reasoning_effort: 'low', max_completion_tokens: options.max_tokens || 12_000, temperature: 0.7 }),
  }, 'inception', INCEPTION_MODEL, options.timeoutMs || 45_000);
}

async function callGroq(env: Env, messages: ProviderMessage[], options: ProviderOptions) {
  if (!env.GROQ_API_KEY || isMultimodal(messages)) throw new Error('Groq is unavailable for this request');
  return requestJson(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: options.max_tokens, temperature: options.temperature ?? 0.2 }),
  }, 'groq', GROQ_MODEL, options.timeoutMs || 45_000);
}

async function callGemini(env: Env, messages: ProviderMessage[], options: ProviderOptions) {
  if (!env.GEMINI_API_KEY) throw new Error('Gemini is not configured');
  return requestJson(`${GEMINI_URL}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toGeminiRequest(messages, options)),
  }, 'gemini', GEMINI_MODEL, options.timeoutMs || 60_000);
}

async function callOpenAI(env: Env, messages: ProviderMessage[], options: ProviderOptions) {
  if (!env.OPENAI_API_KEY) throw new Error('OpenAI is not configured');
  return requestJson(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: OPENAI_MODEL, messages, max_completion_tokens: options.max_tokens, ...(options.temperature != null ? { temperature: options.temperature } : {}) }),
  }, 'openai', OPENAI_MODEL, options.timeoutMs || 60_000);
}

export async function generateWithProviderChain(env: Env, messages: ProviderMessage[], options: ProviderOptions = {}): Promise<{ text: string; provider: string; model: string }> {
  const multimodal = isMultimodal(messages);
  const attempts: Array<[ProviderCall, string, string]> = multimodal
    ? [[callGemini, 'gemini', GEMINI_MODEL], [callOpenAI, 'openai', OPENAI_MODEL]]
    : [[callInception, 'inception', INCEPTION_MODEL], [callGroq, 'groq', GROQ_MODEL], [callOpenAI, 'openai', OPENAI_MODEL]];
  let lastError: unknown;
  for (const [call, provider, model] of attempts) {
    try {
      const text = await call(env, messages, options);
      options.validateResponse?.(text, provider, model);
      return { text, provider, model };
    } catch (error) {
      lastError = error;
      console.warn(`${provider} failed; trying next provider`, error);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All AI providers failed');
}
