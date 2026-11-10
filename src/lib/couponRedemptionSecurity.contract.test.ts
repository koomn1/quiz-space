import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('server-authoritative coupon redemption', () => {
  const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20261110212423_server_authoritative_coupon_redemption.sql'),
    'utf8',
  );
  const db = readFileSync(resolve(process.cwd(), 'src/lib/db.ts'), 'utf8');
  const redeemStart = db.indexOf('export async function redeemCouponForUser(');
  const redeemHelper = db.slice(redeemStart, db.indexOf('\n}\n', redeemStart) + 3);
  const billing = readFileSync(resolve(process.cwd(), 'src/components/BillingSection.tsx'), 'utf8');
  const profile = readFileSync(resolve(process.cwd(), 'src/pages/UserProfile.tsx'), 'utf8');

  it('seeds canonical active paid plans from the published billing prices', () => {
    expect(migration).toContain("'silver','Silver Scholar','الباقة الفضية',150,'EGP',1");
    expect(migration).toContain("'gold','Educator Gold','الباقة الذهبية للمعلمين',300,'EGP',1");
    expect(migration).toContain("'diamond','Diamond Elite VIP','الباقة الماسية للمؤسسات',1500,'EGP',1");
    expect(migration).toContain('ON CONFLICT (id) DO NOTHING');
  });

  it('derives coupon validity, plan name, and membership expiry from database rows', () => {
    expect(migration).toContain('v_coupon.discount_percent <> 100');
    expect(migration).toContain('v_plan.id');
    expect(migration).toContain('v_plan.name');
    expect(migration).toContain('v_plan.duration_months');
    expect(migration).toContain('public.record_coupon_usage');
    expect(migration).toContain('v_start_at + make_interval');
    expect(migration).toContain('effective_membership_active');
    expect(migration).toContain('Lifetime and founder memberships cannot be replaced');
  });

  it('keeps the old RPC signature safe while ignoring client-supplied privilege fields', () => {
    expect(migration).toContain('RETURN public.redeem_coupon_for_user_v2(p_coupon_id,p_user_id,p_plan_id,p_order_id)');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.record_coupon_usage');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.redeem_coupon_for_user');
  });

  it('sends only coupon, account, selected plan id, and order id from the browser', () => {
    expect(redeemHelper).toContain("supabase.rpc('redeem_coupon_for_user_v2'");
    expect(redeemHelper).not.toContain('p_discount_percent');
    expect(redeemHelper).not.toContain('p_plan_name');
    expect(redeemHelper).not.toContain('p_renewal_date');
    expect(billing).toContain('redeemCouponForUser(appliedCouponId, userId, selectedPlan, requestId)');
    expect(profile).toContain("redeemCouponForUser(couponObj.id, currentUserId, 'diamond', requestId)");
  });
});
