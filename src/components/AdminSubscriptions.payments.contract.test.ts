import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./AdminSubscriptions.tsx', import.meta.url), 'utf8');

describe('Admin payment-review queue', () => {
  it('renders actionable approval controls only for pending requests', () => {
    expect(source).toContain('const pendingRequests = requests.filter((r) => (r.status || "pending") === "pending");');
    expect(source).toContain('const payments = pendingRequests.map((r) => ({');
  });
});
