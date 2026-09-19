import { describe, expect, it, vi } from 'vitest';
import { getUserId, SupabaseConfigurationError } from './auth';
import type { Env } from './platform';

const env = {
  GROQ_API_KEY: 'test-groq-key',
  OPENROUTER_API_KEY: 'test-openrouter-key',
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
