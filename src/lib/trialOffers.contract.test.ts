import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const adminSource = readFileSync(new URL('../components/AdminSubscriptions.tsx', import.meta.url), 'utf8');
const billingSource = readFileSync(new URL('../components/BillingSection.tsx', import.meta.url), 'utf8');
const dbSource = readFileSync(new URL('./db.ts', import.meta.url), 'utf8');
const profileSource = readFileSync(new URL('../pages/UserProfile.tsx', import.meta.url), 'utf8');
const migrationSource = readFileSync(new URL('../../supabase/migrations/20260817_trial_offers_persistence.sql', import.meta.url), 'utf8');
const approvalMigrationSource = readFileSync(new URL('../../supabase/migrations/20260817_secure_premium_request_approval.sql', import.meta.url), 'utf8');

describe('central trial-offer configuration contract', () => {
  it('stores fixed trial durations in a protected Supabase table and RPC', () => {
    expect(migrationSource).toContain('CREATE TABLE IF NOT EXISTS public.trial_offers');
    expect(migrationSource).toContain('CHECK (duration_days IN (7, 14, 30))');
    expect(migrationSource).toContain('ALTER TABLE public.trial_offers ENABLE ROW LEVEL SECURITY');
    expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.set_trial_offer_state');
    expect(migrationSource).toContain('AND is_admin = true');
    expect(migrationSource).toContain('GRANT EXECUTE ON FUNCTION public.set_trial_offer_state(smallint, boolean) TO authenticated');
  });

  it('uses database helpers for both protected writes and authenticated reads', () => {
    expect(dbSource).toContain(".from('trial_offers')");
    expect(dbSource).toContain("supabase.rpc('set_trial_offer_state'");
    expect(dbSource).toContain('TRIAL_OFFER_DURATIONS = [7, 14, 30]');
  });

  it('removes localStorage trial-offer state from the member and admin interfaces', () => {
    expect(adminSource).toContain('updateTrialOfferState(days, nextState)');
    expect(adminSource).toContain('void loadTrialOffers()');
    expect(billingSource).toContain('const [activeTrialOffers, setActiveTrialOffers]');
    expect(billingSource).toContain('const offers = await getTrialOffers()');
    expect(adminSource).not.toContain('quizspace_active_trial_');
    expect(billingSource).not.toContain('quizspace_active_trial_');
  });

  it('keeps trial approval, offer visibility, and trial-only progress guarded by the shared contract', () => {
    expect(dbSource).toContain('getTrialOfferDurationFromMarker');
    expect(dbSource).toContain("supabase.rpc('approve_premium_request'");
    expect(approvalMigrationSource).toContain('A trial cannot replace an active paid subscription.');
    expect(approvalMigrationSource).toContain("make_interval(days => v_trial_duration)");
    expect(adminSource).toContain('await updatePremiumRequest(');
    expect(billingSource).toContain('!isPremium && !isLoadingTrialOffers');
    expect(profileSource).toContain('const hasTrialSubscription = isTrialSubscription(');
    expect(profileSource).toContain('profileData?.isPremium && hasTrialSubscription');
  });
});
