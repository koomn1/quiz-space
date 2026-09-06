import { readFileSync } from 'node:fs';
import { migrationSql } from '../testHelpers/migrationSql';
import { describe, expect, it } from 'vitest';

const migration = migrationSql('supabase/migrations/20260819_revoke_handle_new_user_execute.sql');
const exportBrandMigration = migrationSql('supabase/migrations/20260819_institution_white_label_export.sql');

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
