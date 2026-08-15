import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260840_harden_reward_idempotency_and_rpc_surface.sql',
);

describe('reward security hardening', () => {
  it('only updates milestone balances after the unique ledger insert succeeds', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toContain("'milestone_5_quizzes'");
    expect(migration).toContain("'milestone_10_quizzes'");
    expect(migration).toContain('ON CONFLICT (user_id, event_key) DO NOTHING');
    expect(migration).toContain('GET DIAGNOSTICS v_rows = ROW_COUNT');
    expect(migration).toContain('IF v_rows > 0 THEN');
    expect(migration).toContain('v_extra_points := v_extra_points + 500');
  });

  it('removes public RPC access from internal helper and trigger functions', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toContain('REVOKE EXECUTE ON FUNCTION public.check_daily_cooldown(text, text, text, integer) FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('REVOKE EXECUTE ON FUNCTION public.prevent_unverified_active_frame_update() FROM PUBLIC, anon, authenticated');
  });
});
