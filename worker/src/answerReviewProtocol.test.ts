import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  callOpenRouterWithParallelAnswerReviewFallback,
  validateAnswerReviewResponse,
  type Env,
} from './index';

const env = {
  OPENROUTER_API_KEY: 'test-key',
  OPENAI_API_KEY: 'test-key',
  GROQ_API_KEY: 'test-key',
  DEEPSEEK_API_KEY: 'test-key',
  SUPABASE_URL: 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY: 'test-key',
  ALLOWED_ORIGIN: 'https://quiz-space-app.pages.dev',
  EXTRACTION_JOBS: { send: vi.fn(async () => undefined) },
} as unknown as Env;

const validResponse = (questionIndex = 1) => JSON.stringify({
  answers: [{ questionIndex, correctIndex: 2 }],
});

function providerResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('answer review protocol', () => {
  it('accepts a compact complete response and rejects a partial response', () => {
    expect(validateAnswerReviewResponse(validResponse(), 1, 'test-model')).toContain('"answers"');
    expect(() => validateAnswerReviewResponse('{"answers":[]}', 1, 'test-model')).toThrow();
  });

  it('does not let a malformed primary response win the parallel race', async () => {
    const models: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body || '{}')) as { model?: string };
      models.push(String(payload.model));
      return payload.model === 'model-a'
        ? providerResponse('{"answers":[]}')
        : providerResponse(validResponse());
    }));

    const result = await callOpenRouterWithParallelAnswerReviewFallback(
      env,
      [{ role: 'user', content: 'review' }],
      ['model-a', 'model-b'],
      { expectedAnswerCount: 1, timeoutMs: 500, response_format: { type: 'json_object' } },
    );

    expect(result.model).toBe('model-b');
    expect(models).toEqual(expect.arrayContaining(['model-a', 'model-b']));
  });

  it('rejects when every provider response is incomplete', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => providerResponse('{"answers":[]}')));

    await expect(callOpenRouterWithParallelAnswerReviewFallback(
      env,
      [{ role: 'user', content: 'review' }],
      ['model-a', 'model-b', 'model-c'],
      { expectedAnswerCount: 1, timeoutMs: 500, response_format: { type: 'json_object' } },
    )).rejects.toThrow();
  });
});
