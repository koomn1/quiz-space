import { describe, expect, it } from 'vitest';
import { mapPendingPaymentRequests, normalizePaymentRequest, paymentAmountLabel } from './paymentQueue';

describe('premium payment queue', () => {
  it('keeps all four pending requests instead of only the newest one', () => {
    const records = Array.from({ length: 4 }, (_, index) => ({
      id: `req-${index}`,
      user_id: `user-${index}`,
      plan_id: 'gold',
      plan_name: 'Gold',
      plan_price: 300,
      amount: 300,
      payment_method: index % 2 ? 'vodafone_cash' : 'instapay',
      status: 'pending',
      created_at: `2026-10-14T19:0${index}:00Z`,
    }));

    expect(mapPendingPaymentRequests(records)).toHaveLength(4);
    expect(mapPendingPaymentRequests(records).map((item) => item.id)).toEqual(['req-0', 'req-1', 'req-2', 'req-3']);
  });

  it('keeps legacy requests visible without inventing missing amount or method', () => {
    const legacy = normalizePaymentRequest({
      id: 'legacy-1',
      name: 'Legacy User',
      plan_name: 'Gold',
      status: 'pending',
      payment_screenshot: 'receipt.png',
    });

    expect(legacy.amount).toBe('');
    expect(legacy.paymentMethod).toBe('request');
    expect(paymentAmountLabel(legacy.amount, true)).toContain('غير متوفر');
  });

  it('maps independent amount, plan price, method, user and plan fields', () => {
    const [request] = mapPendingPaymentRequests([{
      id: 'new-1', user_id: 'user-1', plan_id: 'silver', plan_name: 'Silver',
      plan_price: 150, amount: 75, payment_method: 'bank_transfer', status: 'pending',
    }]);

    expect(request).toMatchObject({
      id: 'new-1', userId: 'user-1', planId: 'silver', planPrice: 150,
      amount: 75, method: 'bank_transfer', paymentMethod: 'bank_transfer',
    });
  });
});
