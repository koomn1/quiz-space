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
export const XKIRO_VISION_MODEL = 'cohere/command-a-plus';
export const THINKING_REASONING_EFFORT = 'high' as const;

 type ProviderCall = (env: Env, messages: ProviderMessage[], options: ProviderOptions) => Promise<string>;

const INCEPTION_URL = 'https://api.inceptionlabs.ai/v1/chat/completions';
const XKIRO_URL = 'https://api.xkiro.com/v1/chat/completions';

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

function extractText(payload: any): string {
  const choice = payload?.choices?.[0];
  if (choice) return contentText(choice.message?.content ?? choice.text);
  return '';
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
    body: JSON.stringify({
      model: INCEPTION_MODEL,
      messages,
      reasoning_effort: THINKING_REASONING_EFFORT,
      max_completion_tokens: options.max_tokens || 12_000,
      temperature: options.temperature ?? 0.7,
      ...(options.response_format ? { response_format: options.response_format } : {}),
    }),
  }, 'inception', INCEPTION_MODEL, options.timeoutMs || 45_000);
}

async function callXkiro(env: Env, messages: ProviderMessage[], options: ProviderOptions) {
  if (!env.XKIRO_API_KEY || !isMultimodal(messages)) throw new Error('xKiro is unavailable for this request');
  return requestJson(XKIRO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.XKIRO_API_KEY}` },
    body: JSON.stringify({
      model: XKIRO_VISION_MODEL,
      messages,
      reasoning_effort: THINKING_REASONING_EFFORT,
      include_reasoning: true,
      max_tokens: options.max_tokens || 12_000,
      ...(options.temperature != null ? { temperature: options.temperature } : {}),
      ...(options.response_format ? { response_format: options.response_format } : {}),
    }),
  }, 'xkiro', XKIRO_VISION_MODEL, options.timeoutMs || 90_000);
}

export async function generateWithProviderChain(env: Env, messages: ProviderMessage[], options: ProviderOptions = {}): Promise<{ text: string; provider: string; model: string }> {
  const multimodal = isMultimodal(messages);
  const attempts: Array<[ProviderCall, string, string]> = multimodal
    ? [[callXkiro, 'xkiro', XKIRO_VISION_MODEL]]
    : [[callInception, 'inception', INCEPTION_MODEL]];
  let lastError: unknown;
  for (const [call, provider, model] of attempts) {
    try {
      const text = await call(env, messages, options);
      options.validateResponse?.(text, provider, model);
      return { text, provider, model };
    } catch (error) {
      lastError = error;
      console.warn(`${provider} failed`, error);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Configured AI provider failed');
}
