import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const rewardMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260836_repair_daily_quiz_rewards.sql',
);
const compatibilityMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260837_extend_legacy_daily_quiz_completion_records.sql',
);
const timestampMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260838_set_daily_completion_timestamps.sql',
);
const retryMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260839_fix_daily_completion_retry_ambiguity.sql',
);

describe('daily quiz reward persistence policy', () => {
  it('records private daily completions and rewards them atomically without public quiz foreign keys', () => {
    const migration = readFileSync(rewardMigrationPath, 'utf8');

    expect(migration).toContain('daily_quiz_completions');
    expect(migration).toContain('FOR UPDATE');
    expect(migration).toContain("'quiz_completion'");
    expect(migration).toContain('ON CONFLICT (user_id, event_key) DO NOTHING');
    expect(migration).toContain("'daily_quiz'");
    expect(migration).not.toContain('INSERT INTO public.completions');
  });

  it('extends the legacy completion marker before reward-aware records rely on its fields', () => {
    const migration = readFileSync(compatibilityMigrationPath, 'utf8');

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS id TEXT');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS score INTEGER');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS daily_quiz_completions_id_key');
  });

  it('keeps legacy timestamp defaults and retry updates safe after the first reward', () => {
    const timestampMigration = readFileSync(timestampMigrationPath, 'utf8');
    const retryMigration = readFileSync(retryMigrationPath, 'utf8');

    expect(timestampMigration).toContain('ALTER COLUMN created_at SET DEFAULT now()');
    expect(timestampMigration).toContain('ALTER COLUMN updated_at SET DEFAULT now()');
    expect(retryMigration).toContain('daily_completion.id = v_completion.id');
  });
});
