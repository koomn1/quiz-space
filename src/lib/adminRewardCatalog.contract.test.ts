import { readFileSync } from 'node:fs';
import { migrationSql } from '../testHelpers/migrationSql';
import { describe, expect, it } from 'vitest';

const migration = migrationSql('supabase/migrations/20260844_admin_reward_store_catalog.sql');
const visibilityMigration = readFileSync(new URL('../../supabase/migrations/20261108191000_hide_reward_store_by_default.sql', import.meta.url), 'utf8');
const client = readFileSync(new URL('./db.ts', import.meta.url), 'utf8');

describe('admin reward catalog contract', () => {
  it('makes catalog mutations RPC-only and checks the super-admin role inside the security-definer functions', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.admin_upsert_reward_store_item');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.admin_set_reward_store_item_visibility');
    expect(migration).toContain("uid = auth.uid()::text AND is_admin = true");
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.admin_upsert_reward_store_item');
  });

  it('keeps hidden frames out of the public store while providing explicit admin management wrappers', () => {
    expect(client).toContain(".eq('is_active', true)");
    expect(client).toContain("supabase.rpc('admin_upsert_reward_store_item'");
    expect(client).toContain("supabase.rpc('admin_set_reward_store_item_visibility'");
  });

  it('fails closed by hiding existing and newly created products until an admin publishes them', () => {
    expect(visibilityMigration).toContain('ALTER COLUMN is_active SET DEFAULT false');
    expect(visibilityMigration).toContain('SET is_active = false');
    expect(visibilityMigration).toContain('p_is_active BOOLEAN DEFAULT FALSE');
    expect(visibilityMigration).toContain('WHERE id = v_item_id;');
  });
});
