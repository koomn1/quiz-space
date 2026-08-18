import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('../../supabase/migrations/20260844_admin_reward_store_catalog.sql', import.meta.url), 'utf8');
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
});
