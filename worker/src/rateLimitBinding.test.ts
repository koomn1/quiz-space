import { describe, expect, it } from 'vitest';
import { checkRateLimitWithBinding, rateLimitMap } from './security/rateLimiter';

describe('checkRateLimitWithBinding', () => {
  it('uses the binding result when a binding exists', async () => {
    const allow = { limit: async () => ({ success: true }) };
    const deny = { limit: async () => ({ success: false }) };
    expect(await checkRateLimitWithBinding(allow, 'k1', 1)).toBe(true);
    expect(await checkRateLimitWithBinding(deny, 'k2', 100)).toBe(false);
  });

  it('falls back to the in-memory limiter without a binding', async () => {
    rateLimitMap.delete('fallback-key');
    expect(await checkRateLimitWithBinding(undefined, 'fallback-key', 2)).toBe(true);
    expect(await checkRateLimitWithBinding(undefined, 'fallback-key', 2)).toBe(true);
    expect(await checkRateLimitWithBinding(undefined, 'fallback-key', 2)).toBe(false);
    rateLimitMap.delete('fallback-key');
  });

  it('falls back to the in-memory limiter when the binding throws', async () => {
    const broken = { limit: async () => { throw new Error('down'); } };
    rateLimitMap.delete('broken-key');
    expect(await checkRateLimitWithBinding(broken, 'broken-key', 1)).toBe(true);
    expect(await checkRateLimitWithBinding(broken, 'broken-key', 1)).toBe(false);
    rateLimitMap.delete('broken-key');
  });
});
