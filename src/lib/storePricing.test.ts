import { describe, expect, it } from 'vitest';
import { getStoreBundleBenefitLabel, getStorePaymentMode } from './storePricing';

describe('getStorePaymentMode', () => {
  it('uses a positive cash price for point packs sold through payment review', () => {
    expect(getStorePaymentMode({ price_egp: '25.00', price_points: 0, price_coins: 0 }))
      .toEqual({ mode: 'cash', amount: 25 });
  });

  it('uses points for a time-limited membership pass when it has no cash price', () => {
    expect(getStorePaymentMode({ price_egp: 0, price_points: 50_000, price_coins: 0 }))
      .toEqual({ mode: 'points', amount: 50_000 });
  });

  it('uses coins before points when an item has a coin price', () => {
    expect(getStorePaymentMode({ price_egp: 0, price_points: 10_000, price_coins: 200 }))
      .toEqual({ mode: 'coins', amount: 200 });
  });

  it('does not present an unpriced item as purchasable', () => {
    expect(getStorePaymentMode({ price_egp: 0, price_points: 0, price_coins: 0 }))
      .toEqual({ mode: 'unavailable', amount: 0 });
  });

  it('describes a monthly pass benefit instead of displaying a misleading zero-point reward', () => {
    expect(getStoreBundleBenefitLabel({ id: 'pass_gold_30d', reward_points: 0 }, 'ar'))
      .toBe('عضوية ذهبية لمدة شهر');
    expect(getStoreBundleBenefitLabel({ id: 'pass_diamond_30d', reward_points: 0 }, 'en'))
      .toBe('One-month Diamond membership');
  });

  it('continues to display the granted point amount for actual point bundles', () => {
    expect(getStoreBundleBenefitLabel({ id: 'bundle_small', reward_points: 500 }, 'ar'))
      .toBe('+500 نقطة');
  });
});
