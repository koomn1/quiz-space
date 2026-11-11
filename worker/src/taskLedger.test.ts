import { describe, expect, it, vi } from 'vitest';
import { finishTask, heartbeatTask, retryDelaySeconds, shouldRetryTask, taskIdempotencyKey } from './taskLedger';

describe('unified task ledger contracts', () => {
  it('accepts successful RPC responses with an empty body', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const env = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'public-anon-key',
      ALLOWED_ORIGIN: 'https://example.com',
      EXTRACTION_JOBS: { send: vi.fn() },
    };

    await expect(heartbeatTask(env, 'Bearer test', 'task-1')).resolves.toBeUndefined();
    await expect(finishTask(env, 'Bearer test', 'task-1', 'succeeded')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it('rejects malformed non-empty RPC response bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{bad json', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const env = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'public-anon-key',
      ALLOWED_ORIGIN: 'https://example.com',
      EXTRACTION_JOBS: { send: vi.fn() },
    };

    await expect(heartbeatTask(env, 'Bearer test', 'task-1')).rejects.toThrow('returned invalid JSON');
    vi.unstubAllGlobals();
  });
  it('normalizes task idempotency keys without allowing unbounded input', () => {
    expect(taskIdempotencyKey('extraction', '  abc  ')).toBe('extraction:abc');
    expect(taskIdempotencyKey('cosmo', 'x'.repeat(400))).toHaveLength('cosmo:'.length + 240);
  });

  it('applies bounded exponential retry delays', () => {
    expect(retryDelaySeconds(0)).toBe(5);
    expect(retryDelaySeconds(1)).toBe(5);
    expect(retryDelaySeconds(2)).toBe(10);
    expect(retryDelaySeconds(7)).toBe(300);
  });

  it('stops retrying once max attempts are consumed', () => {
    expect(shouldRetryTask({ status: 'failed', attempt_count: 1, max_attempts: 3 })).toBe(true);
    expect(shouldRetryTask({ status: 'failed', attempt_count: 3, max_attempts: 3 })).toBe(false);
    expect(shouldRetryTask({ status: 'succeeded', attempt_count: 1, max_attempts: 3 })).toBe(false);
  });
});
