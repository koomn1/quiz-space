import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from './platform';
import worker from './index';

const IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/9pAAAAAASUVORK5CYII=';
const IMAGE_DATA_URL = `data:image/png;base64,${IMAGE_BASE64}`;
const envBase = {
  INCEPTION_API_KEY: 'test-inception-key',
  GROQ_API_KEY: 'test-groq-key',
  GEMINI_API_KEY: 'test-gemini-key',
  OPENAI_API_KEY: 'test-openai-key',
  OPENROUTER_API_KEY: 'test-openrouter-key',
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_ANON_KEY: 'test-supabase-key',
  ALLOWED_ORIGIN: 'https://quiz-space-app.pages.dev',
  EXTRACTION_JOBS: { send: vi.fn(async () => undefined) },
} satisfies Partial<Env>;

type FetchCall = { url: string; init: RequestInit };
type ProviderResponder = (url: string, init: RequestInit) => Promise<Response> | Response;

function stubProviderFetch(responder: ProviderResponder) {
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    return responder(url, init);
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  return calls;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sendImageMessage(envOverrides: Partial<Env> = {}, testIp = '198.51.100.10') {
  const request = new Request('https://worker.test/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': testIp,
    },
    body: JSON.stringify({
      prompt: 'اقرأ النص والألوان الظاهرة في الصورة.',
      attachment: {
        data: IMAGE_BASE64,
        mimeType: 'image/png',
        name: 'cosmo-vision-test.png',
        kind: 'image',
      },
    }),
  });
  return worker.fetch(request, { ...envBase, ...envOverrides } as Env, { waitUntil: () => undefined });
}

function requestBody(call: FetchCall) {
  return JSON.parse(String(call.init.body));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Cosmo image → Gemini → OpenAI fallback integration', () => {
  it('sends image bytes as Gemini inlineData and continues the chat through Mercury 3', async () => {
    const calls = stubProviderFetch((url) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return jsonResponse({ candidates: [{ content: { parts: [{ text: 'الصورة تحتوي مربعًا أزرق.' }] } }] });
      }
      if (url.includes('api.inceptionlabs.ai')) {
        return jsonResponse({ choices: [{ message: { content: 'يوجد مربع أزرق في الصورة.' } }] });
      }
      throw new Error(`Unexpected provider request: ${url}`);
    });

    const response = await sendImageMessage({}, '198.51.100.11');
    const result = await response.json() as { text?: string };

    expect(response.status).toBe(200);
    expect(result.text).toContain('يوجد مربع أزرق');
    expect(calls.map(call => new URL(call.url).hostname)).toEqual([
      'generativelanguage.googleapis.com',
      'api.inceptionlabs.ai',
    ]);
    expect(new URL(calls[0].url).pathname).toContain('models/gemini-3.8-flash:generateContent');
    const geminiBody = requestBody(calls[0]);
    expect(geminiBody.contents[0].parts).toContainEqual({ text: expect.stringContaining('اقرأ النص والألوان') });
    expect(geminiBody.contents[0].parts).toContainEqual({
      inlineData: { mimeType: 'image/png', data: IMAGE_BASE64 },
    });
    expect(calls[1].url).toContain('/v1/chat/completions');
    expect(requestBody(calls[1]).model).toBe('mercury-3');
  });

  it('falls back to OpenAI after Gemini HTTP failure and preserves the image data URL', async () => {
    const calls = stubProviderFetch((url) => {
      if (url.includes('generativelanguage.googleapis.com')) return jsonResponse({ error: 'simulated Gemini outage' }, 503);
      if (url.includes('api.openai.com')) {
        return jsonResponse({ choices: [{ message: { content: 'OpenAI vision found a red circle.' } }] });
      }
      if (url.includes('api.inceptionlabs.ai')) {
        return jsonResponse({ choices: [{ message: { content: 'الصورة تحتوي دائرة حمراء.' } }] });
      }
      throw new Error(`Unexpected provider request: ${url}`);
    });

    const response = await sendImageMessage({}, '198.51.100.12');
    const result = await response.json() as { text?: string };

    expect(response.status).toBe(200);
    expect(result.text).toContain('دائرة حمراء');
    expect(calls.map(call => new URL(call.url).hostname)).toEqual([
      'generativelanguage.googleapis.com',
      'api.openai.com',
      'api.inceptionlabs.ai',
    ]);
    const openAiBody = requestBody(calls[1]);
    expect(openAiBody.model).toBe('gpt-5-mini');
    const imageMessage = openAiBody.messages.find((message: any) => message.role === 'user');
    expect(imageMessage.content).toContainEqual({
      type: 'image_url',
      image_url: { url: IMAGE_DATA_URL },
    });
    expect(new Headers(calls[1].init.headers).get('Authorization')).toBe('Bearer test-openai-key');
  });

  it('uses OpenAI vision when the Gemini key is missing, then completes the text reply', async () => {
    const calls = stubProviderFetch((url) => {
      if (url.includes('api.openai.com')) {
        return jsonResponse({ choices: [{ message: { content: 'The image contains a yellow star.' } }] });
      }
      if (url.includes('api.inceptionlabs.ai')) {
        return jsonResponse({ choices: [{ message: { content: 'الصورة تحتوي نجمة صفراء.' } }] });
      }
      throw new Error(`Unexpected provider request: ${url}`);
    });

    const response = await sendImageMessage({ GEMINI_API_KEY: undefined }, '198.51.100.13');
    const result = await response.json() as { text?: string };

    expect(response.status).toBe(200);
    expect(result.text).toContain('نجمة صفراء');
    expect(calls.map(call => new URL(call.url).hostname)).toEqual([
      'api.openai.com',
      'api.inceptionlabs.ai',
    ]);
  });

  it('returns a useful safe provider error when both vision providers fail', async () => {
    const calls = stubProviderFetch((url) => {
      if (url.includes('generativelanguage.googleapis.com')) return jsonResponse({ error: 'simulated unauthorized' }, 401);
      if (url.includes('api.openai.com')) return jsonResponse({ error: 'simulated rate limit' }, 429);
      throw new Error(`Unexpected provider request: ${url}`);
    });

    const response = await sendImageMessage({}, '198.51.100.14');
    const result = await response.json() as { error?: string; retryable?: boolean };

    expect(response.status).toBe(502);
    expect(result.error).toContain('openai');
    expect(result.error).toContain('(429)');
    expect(result.retryable).toBe(true);
    expect(calls.map(call => new URL(call.url).hostname)).toEqual([
      'generativelanguage.googleapis.com',
      'api.openai.com',
    ]);
  });
});
