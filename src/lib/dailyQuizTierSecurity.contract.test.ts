import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('daily quiz tier authorization', () => {
  const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20261110120000_harden_daily_quiz_tier_authority.sql'),
    'utf8',
  );

  it('derives the tier from the authenticated user membership, not the client argument', () => {
    expect(migration).toContain('quizspace_resolve_daily_quiz_tier');
    expect(migration).toContain('public.effective_membership_active');
    expect(migration).toContain('auth.uid()::TEXT <> p_user_id');
    expect(migration).toContain("RETURN 'diamond'");
    expect(migration).toContain("RETURN 'gold'");
    expect(migration).toContain("RETURN 'free'");
  });

  it('routes every per-user daily slot RPC through the trusted tier resolver', () => {
    for (const fn of [
      'get_user_daily_quiz_slot',
      'claim_user_daily_quiz_refresh',
      'finalize_user_daily_quiz_refresh',
      'release_user_daily_quiz_refresh',
      'reset_legacy_daily_quiz_slot',
    ]) {
      const start = migration.indexOf(`FUNCTION public.${fn}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const body = migration.slice(start, migration.indexOf('$$;', start));
      expect(body).toContain('quizspace_resolve_daily_quiz_tier');
    }
  });

  it('keeps the resolver private and restricts daily slot RPCs to authenticated users', () => {
    const privileges = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20261110194500_lock_daily_quiz_rpc_execute.sql'),
      'utf8',
    );
    expect(privileges).toContain('FROM PUBLIC, anon, authenticated');
    for (const fn of [
      'get_user_daily_quiz_slot',
      'claim_user_daily_quiz_refresh',
      'finalize_user_daily_quiz_refresh',
      'release_user_daily_quiz_refresh',
      'reset_legacy_daily_quiz_slot',
    ]) {
      expect(privileges).toContain(`FUNCTION public.${fn}`);
      expect(privileges).toContain('TO authenticated');
    }
  });

  it('revokes legacy global daily slot RPCs and preserves authenticated completion', () => {
    const legacy = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20261110200000_retire_legacy_daily_quiz_rpcs.sql'),
      'utf8',
    );
    for (const fn of [
      'get_daily_quiz_slot',
      'claim_daily_quiz_refresh',
      'finalize_daily_quiz_refresh',
      'release_daily_quiz_refresh',
    ]) {
      expect(legacy).toContain(`FUNCTION public.${fn}`);
      expect(legacy).toContain('FROM PUBLIC, anon, authenticated');
    }
    expect(legacy).toContain('FUNCTION public.complete_user_daily_quiz');
    expect(legacy).toContain('TO authenticated');
  });

  it('only finalizes a payload after a refresh claim and validates its basic shape', () => {
    expect(migration).toContain('AND refreshing = true');
    expect(migration).toContain("RAISE EXCEPTION 'Daily quiz refresh was not claimed'");
    expect(migration).toContain("jsonb_typeof(p_quiz_payload->'questions') IS DISTINCT FROM 'array'");
    expect(migration).toContain("'Invalid daily quiz payload'");
  });
});
