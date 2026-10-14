import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../../supabase/migrations/20261014193000_harden_premium_request_payment_fields.sql', import.meta.url), 'utf8');

describe('premium payment migration contract', () => {
  it('adds independent plan and payment fields without backfilling legacy rows', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS plan_id TEXT');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS plan_price NUMERIC(12, 2)');
    expect(migration).toContain('ADD CONSTRAINT premium_requests_amount_nonnegative');
  });

  it('uses a server-owned catalog price and preserves the RLS boundary', () => {
    expect(migration).toContain('validate_premium_request_payment');
    expect(migration).toContain('NEW.plan_price := trusted_price');
    expect(migration).toContain('ALTER TABLE public.premium_requests ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.validate_premium_request_payment() FROM PUBLIC');
  });
});
