import { describe, expect, it, vi } from 'vitest';
import { getUserId, isEffectivePaidMembership, SupabaseConfigurationError } from './auth';
import type { Env } from './platform';

const env = {
  SUPABASE_URL: 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  ALLOWED_ORIGIN: 'https://quiz-space-app.pages.dev',
  EXTRACTION_JOBS: { send: vi.fn(async () => undefined) },
} as unknown as Env;

describe('Supabase authentication configuration', () => {
  it('fails closed instead of returning placeholder-user', async () => {
    const request = new Request('https://worker.test/api/ai/generate', {
      headers: { Authorization: 'Bearer test-token' },
    });

    await expect(getUserId(request, env)).rejects.toBeInstanceOf(SupabaseConfigurationError);
    await expect(getUserId(request, env)).rejects.toThrow('Supabase is not configured');
  });

  it('still treats an unauthenticated request as a guest before configuration lookup', async () => {
    const request = new Request('https://worker.test/api/ai/generate');
    await expect(getUserId(request, env)).resolves.toBeNull();
  });
});


describe('effective paid membership for AI access', () => {
  const now = Date.parse('2026-11-10T12:00:00.000Z');

  it('does not grant access from a stale premium plan label alone', () => {
    expect(isEffectivePaidMembership({
      is_premium: false,
      plan_name: 'Diamond Elite VIP',
      renewal_date: '2026-12-10T12:00:00.000Z',
    }, now)).toBe(false);
  });

  it('allows active monthly, lifetime, and founder memberships', () => {
    expect(isEffectivePaidMembership({ is_premium: true, renewal_date: '2026-12-10T12:00:00.000Z' }, now)).toBe(true);
    expect(isEffectivePaidMembership({ is_premium: true, is_lifetime: true }, now)).toBe(true);
    expect(isEffectivePaidMembership({ is_premium: true, is_founder: true }, now)).toBe(true);
  });

  it('rejects expired and invalid expiry dates', () => {
    expect(isEffectivePaidMembership({ is_premium: true, renewal_date: '2026-11-09T12:00:00.000Z' }, now)).toBe(false);
    expect(isEffectivePaidMembership({ is_premium: true, renewal_date: 'not-a-date' }, now)).toBe(false);
  });

  it('preserves legacy active premium profiles without an expiry date', () => {
    expect(isEffectivePaidMembership({ is_premium: true, plan_name: 'Gold' }, now)).toBe(true);
  });
});
