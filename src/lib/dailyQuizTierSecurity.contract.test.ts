import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('daily quiz tier authorization', () => {
  const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20261110194201_daily_quiz_tier_authority_hardening.sql'),
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
      resolve(process.cwd(), 'supabase/migrations/20261110194227_lock_daily_quiz_rpc_execute.sql'),
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
      resolve(process.cwd(), 'supabase/migrations/20261110194413_retire_legacy_daily_quiz_rpcs.sql'),
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

  it('stores answer keys in private server tables and grades submitted choices server-side', () => {
    const secure = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20261110211548_secure_daily_quiz_scoring.sql'),
      'utf8',
    );
    expect(secure).toContain('CREATE TABLE IF NOT EXISTS public.daily_quiz_answer_keys');
    expect(secure).toContain('ALTER TABLE public.daily_quiz_answer_keys ENABLE ROW LEVEL SECURITY');
    expect(secure).toContain('FROM PUBLIC, anon, authenticated');
    expect(secure).toContain('FUNCTION public.submit_user_daily_quiz_attempt_v2');
    expect(secure).toContain('p_answers JSONB');
    expect(secure).toContain('FROM public.daily_quiz_answer_keys AS k');
    expect(secure).toContain('INTO v_score');
    expect(secure).toContain("'correctIndex', -1");
    expect(secure).toContain("'source_bank_id', v_bank_id");
    expect(secure).not.toContain('p_score INTEGER');
  });

  it('binds v2 scoring to the server-created slot bank id', () => {
    const binding = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20261110212112_bind_daily_quiz_slot_to_server_bank.sql'),
      'utf8',
    );
    expect(binding).toContain('ADD COLUMN IF NOT EXISTS bank_id TEXT');
    expect(binding).toContain('bank_id = v_bank_id');
    expect(binding).toContain('s.bank_id IS NULL');
    expect(binding).toContain('v_bank_id := v_slot.bank_id');
    expect(binding).toContain('AND s.bank_id IS NOT NULL');
    expect(binding).toContain('bank_id = NULL');
  });

  it('does not ship the daily answer bank or grade answers in the browser', () => {
    const card = readFileSync(resolve(process.cwd(), 'src/components/DailyQuizCard.tsx'), 'utf8');
    const resolver = readFileSync(resolve(process.cwd(), 'src/components/QuizResolver.tsx'), 'utf8');
    const db = readFileSync(resolve(process.cwd(), 'src/lib/db.ts'), 'utf8');
    expect(card).not.toContain("from '../data/dailyQuizBank'");
    expect(card).toContain('finalizeUserDailyQuizRefresh(userId, tier, { id: quizId, lang })');
    expect(resolver).toContain('answers: isDailyQuiz ? quiz.questions.map');
    expect(resolver).toContain('applyDailyServerResult(savedRow)');
    expect(resolver).toContain('isDailyQuiz && !isDailyResultVerified');
    expect(db).toContain("'submit_user_daily_quiz_attempt_v2'");
    expect(db).not.toContain("'submit_user_daily_quiz_attempt', {");
  });

  it('removes direct client access to legacy slot payloads and private bank data', () => {
    const purge = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20261110212156_purge_legacy_daily_quiz_payloads.sql'),
      'utf8',
    );
    expect(purge).toContain('WHERE answered_at IS NULL');
    expect(purge).toContain('quiz_payload = NULL');
    expect(purge).toContain('REVOKE ALL ON TABLE public.daily_quiz_user_slots');
  });

  it('only finalizes a payload after a refresh claim and validates its basic shape', () => {
    expect(migration).toContain('AND refreshing = true');
    expect(migration).toContain("RAISE EXCEPTION 'Daily quiz refresh was not claimed'");
    expect(migration).toContain("jsonb_typeof(p_quiz_payload->'questions') IS DISTINCT FROM 'array'");
    expect(migration).toContain("'Invalid daily quiz payload'");
  });
});
