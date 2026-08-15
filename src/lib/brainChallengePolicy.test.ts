import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260835_secure_single_brain_challenge_attempt.sql',
);

describe('daily brain-challenge policy', () => {
  it('uses a user-and-day claim key to enforce a single attempt safely', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toContain('brain_challenge_daily_claims');
    expect(migration).toContain('PRIMARY KEY (user_id, challenge_date)');
    expect(migration).toContain('ON CONFLICT (user_id, challenge_date) DO NOTHING');
    expect(migration).toContain("'already_attempted'");
  });

  it('prevents direct client inserts that could bypass the server policy', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toContain('DROP POLICY IF EXISTS "Users can insert own attempts"');
    expect(migration).toContain("'attempts_remaining', 0");
  });
});
