import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../supabase/migrations/20260824160000_guest_quiz_attempts.sql', import.meta.url),
  'utf8',
);

describe('guest quiz attempts migration contract', () => {
  it('keeps guest attempts isolated from user profiles and deduplicates retries', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.guest_quiz_attempts');
    expect(migration).toContain("guest_id TEXT NOT NULL CHECK (guest_id ~ '^user-guest-[A-HJ-NP-Z2-9]{6}$')");
    expect(migration).toContain('UNIQUE (guest_id, quiz_id, client_attempt_key)');
    expect(migration).toContain('UPDATE public.guest_quiz_attempts AS existing_attempt');
    expect(migration).toContain('WHERE existing_attempt.id = v_id;');
    expect(migration).toContain('ALTER TABLE public.guest_quiz_attempts ENABLE ROW LEVEL SECURITY');
    expect(migration).not.toContain('CREATE POLICY guest_quiz_attempts');
  });

  it('fails closed for authenticated sessions and never grants guest RPCs to authenticated', () => {
    expect(migration).toContain("IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest submission requires an anonymous session'");
    expect(migration).toContain("IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest review requires an anonymous session'");
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.submit_guest_quiz_attempt');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.update_guest_quiz_attempt_review');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.submit_guest_quiz_attempt(text, text, text, integer, text, integer, text) TO anon');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.update_guest_quiz_attempt_review(text, text, integer, text) TO anon');
    expect(migration).not.toContain('TO authenticated;\nGRANT EXECUTE ON FUNCTION public.update_guest_quiz_attempt_review');
  });

  it('counts authenticated and guest rows in total plays and public stats', () => {
    expect(migration).toContain('(SELECT COUNT(*)::INTEGER FROM public.completions WHERE quiz_id = target_quiz_id) +');
    expect(migration).toContain('(SELECT COUNT(*)::INTEGER FROM public.guest_quiz_attempts WHERE quiz_id = target_quiz_id)');
    expect(migration).toContain("'total_completions', (SELECT COUNT(*) FROM public.completions) + (SELECT COUNT(*) FROM public.guest_quiz_attempts)");
    expect(migration).toContain("'completions_today', (SELECT COUNT(*) FROM public.completions WHERE created_at::date = CURRENT_DATE) + (SELECT COUNT(*) FROM public.guest_quiz_attempts WHERE created_at::date = CURRENT_DATE)");
    expect(migration).toContain('UNION ALL');
  });

  it('does not include XP or reward writes in the guest submission path', () => {
    const guestFunction = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION public.submit_guest_quiz_attempt'),
      migration.indexOf('CREATE OR REPLACE FUNCTION public.update_guest_quiz_attempt_review'),
    );
    expect(guestFunction).not.toMatch(/xp|reward|points/i);
  });
});
