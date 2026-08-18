import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../supabase/migrations/20260818_fix_diamond_workspace_auto_provision_audit.sql', import.meta.url),
  'utf8',
);

describe('Diamond institution auto-provisioning', () => {
  it('writes an allowed audit action without weakening the Diamond entitlement check', () => {
    expect(migration).toContain("'institution_created'");
    expect(migration).toContain("'source', 'auto_provision'");
    expect(migration).not.toContain("'institution_auto_provisioned'");
    expect(migration).toContain("lower(COALESCE(plan_id, '')) = 'diamond'");
    expect(migration).toContain("renewal_date IS NULL OR renewal_date >= now()");
  });
});
