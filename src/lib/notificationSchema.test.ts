import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260831_notification_lesson_and_platform_settings_access.sql',
);

describe('notification and platform-settings schema repair', () => {
  it('allows the lesson notification emitted by the classroom lesson trigger', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toContain("'lesson'");
    expect(migration).toContain('notifications_type_check');
  });

  it('keeps platform settings publicly readable but does not grant client writes', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toContain('GRANT SELECT ON TABLE public.platform_settings TO anon, authenticated;');
    expect(migration).not.toMatch(/GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)\s+ON\s+TABLE\s+public\.platform_settings/i);
  });
});
