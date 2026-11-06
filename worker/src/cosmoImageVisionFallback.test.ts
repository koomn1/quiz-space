import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from './platform';
import worker from './index';

const IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/9pAAAAAASUVORK5CYII=';
const envBase = {
  INCEPTION_API_KEY: 'test-inception-key',
  XKIRO_API_KEY: 'test-xkiro-key',
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_ANON_KEY: 'test-supabase-key',
  ALLOWED_ORIGIN: 'https://quiz-space-app.pages.dev',
  EXTRACTION_JOBS: { send: vi.fn(async () => undefined) },
} satisfies Partial<Env>;

type FetchCall = { url: string; init: RequestInit };

function stubProviderFetch(responder: (url: string, init: RequestInit) => Response) {
  const calls: FetchCall[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    return responder(url, init);
  }));
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  return calls;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
}

async function sendImageMessage(envOverrides: Partial<Env> = {}) {
  const request = new Request('https://worker.test/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.10' },
    body: JSON.stringify({
      prompt: 'اقرأ النص والألوان الظاهرة في الصورة.',
      attachment: { data: IMAGE_BASE64, mimeType: 'image/png', name: 'vision-test.png', kind: 'image' },
    }),
  });
  return worker.fetch(request, { ...envBase, ...envOverrides } as Env, { waitUntil: () => undefined });
}

function requestBody(call: FetchCall) { return JSON.parse(String(call.init.body)); }

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Cosmo image → xKiro vision integration', () => {
  it('sends image data to xKiro and returns the response', async () => {
    const calls = stubProviderFetch((url) => {
      if (url.includes('api.xkiro.com')) return jsonResponse({ choices: [{ message: { content: 'الصورة تحتوي مربعًا أزرق.' } }] });
      if (url.includes('api.inceptionlabs.ai')) return jsonResponse({ choices: [{ message: { content: 'يوجد مربع أزرق في الصورة.' } }] });
      throw new Error(`Unexpected provider request: ${url}`);
    });

    const response = await sendImageMessage();
    const result = await response.json() as { text?: string };
    expect(response.status).toBe(200);
    expect(result.text).toContain('مربع أزرق');
    expect(calls).toHaveLength(2);
    expect(new URL(calls[0].url).hostname).toBe('api.xkiro.com');
    const body = requestBody(calls[0]);
    expect(body.model).toBe('qwen/qwen3.8-omni-flash:free');
    const imageMessage = body.messages.find((message: any) => message.role === 'user');
    expect(imageMessage.content).toContainEqual({ type: 'image_url', image_url: { url: `data:image/png;base64,${IMAGE_BASE64}` } });
    expect(new URL(calls[1].url).hostname).toBe('api.inceptionlabs.ai');
  });

  it('returns a safe error when xKiro is unavailable', async () => {
    const calls = stubProviderFetch((url) => {
      if (url.includes('api.xkiro.com')) return jsonResponse({ error: 'simulated outage' }, 503);
      throw new Error(`Unexpected provider request: ${url}`);
    });
    const response = await sendImageMessage();
    const result = await response.json() as { error?: string; retryable?: boolean };
    expect(response.status).toBe(502);
    expect(result.error).toContain('xkiro');
    expect(result.retryable).toBe(true);
    expect(calls).toHaveLength(1);
  });
});
