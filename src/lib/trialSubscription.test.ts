import { describe, expect, it } from 'vitest';
import {
  getTrialOfferDurationFromMarker,
  getTrialRenewalDate,
  isTrialSubscription,
} from './db';

describe('trial subscription helpers', () => {
  it('accepts only the persisted 7, 14, and 30 day offer markers', () => {
    expect(getTrialOfferDurationFromMarker('TRIAL_OFFER_7_DAYS')).toBe(7);
    expect(getTrialOfferDurationFromMarker('TRIAL_OFFER_14_DAYS')).toBe(14);
    expect(getTrialOfferDurationFromMarker('TRIAL_OFFER_30_DAYS')).toBe(30);
    expect(getTrialOfferDurationFromMarker('TRIAL_OFFER_365_DAYS')).toBeNull();
    expect(getTrialOfferDurationFromMarker('باقة تجريبية 7 يوماً')).toBeNull();
  });

  it('calculates the exact configured trial expiry rather than a fixed 30-day expiry', () => {
    const approvedAt = Date.UTC(2026, 7, 17, 17, 28, 54);
    expect(getTrialRenewalDate(7, approvedAt)).toBe('2026-08-24T17:28:54.000Z');
    expect(getTrialRenewalDate(14, approvedAt)).toBe('2026-08-31T17:28:54.000Z');
    expect(getTrialRenewalDate(30, approvedAt)).toBe('2026-09-16T17:28:54.000Z');
  });

  it('distinguishes genuine trial subscriptions from paid Diamond subscriptions', () => {
    expect(isTrialSubscription('باقة تجريبية 7 يوماً', 'trial_7d')).toBe(true);
    expect(isTrialSubscription('Diamond Elite VIP', 'diamond')).toBe(false);
    expect(isTrialSubscription('الباقة الماسية للمؤسسات', 'diamond')).toBe(false);
  });
});
