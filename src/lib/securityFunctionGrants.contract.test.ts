import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('../../supabase/migrations/20260819_revoke_handle_new_user_execute.sql', import.meta.url), 'utf8');
const exportBrandMigration = readFileSync(new URL('../../supabase/migrations/20260819_institution_white_label_export.sql', import.meta.url), 'utf8');

describe('sensitive function execution grants', () => {
  it('keeps the trigger-only user bootstrap function out of client RPC roles', () => {
    expect(migration).toContain('REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated');
    expect(migration).not.toContain('GRANT EXECUTE');
  });

  it('keeps the white-label export helper scoped to authenticated institution managers', () => {
    expect(exportBrandMigration).toContain('public.is_institution_manager(institution.id)');
    expect(exportBrandMigration).toContain('TO authenticated');
  });
});
