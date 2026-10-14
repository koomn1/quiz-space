import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./AdminSubscriptions.tsx', import.meta.url), 'utf8');

describe('Admin payment-review queue', () => {
  it('renders actionable approval controls only for pending requests', () => {
    expect(source).toContain('getPremiumRequests(undefined, { adminQueue: true })');
    expect(source).toContain('mapPendingPaymentRequests(requests)');
    expect(source).toContain('overflow-y-auto');
  });
});
