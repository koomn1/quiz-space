import { describe, expect, it } from 'vitest';
import { retryDelaySeconds, shouldRetryTask, taskIdempotencyKey } from './taskLedger';

describe('unified task ledger contracts', () => {
  it('normalizes task idempotency keys without allowing unbounded input', () => {
    expect(taskIdempotencyKey('extraction', '  abc  ')).toBe('extraction:abc');
    expect(taskIdempotencyKey('cosmo', 'x'.repeat(400))).toHaveLength('cosmo:'.length + 240);
  });

  it('applies bounded exponential retry delays', () => {
    expect(retryDelaySeconds(0)).toBe(5);
    expect(retryDelaySeconds(1)).toBe(5);
    expect(retryDelaySeconds(2)).toBe(10);
    expect(retryDelaySeconds(7)).toBe(300);
  });

  it('stops retrying once max attempts are consumed', () => {
    expect(shouldRetryTask({ status: 'failed', attempt_count: 1, max_attempts: 3 })).toBe(true);
    expect(shouldRetryTask({ status: 'failed', attempt_count: 3, max_attempts: 3 })).toBe(false);
    expect(shouldRetryTask({ status: 'succeeded', attempt_count: 1, max_attempts: 3 })).toBe(false);
  });
});
