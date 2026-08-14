import { describe, expect, it } from 'vitest';
import { getStorePaymentMode } from './storePricing';

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
});
