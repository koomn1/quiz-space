import { describe, expect, it } from 'vitest';
import { getRewardEntryDetail, getRewardEventLabel } from './rewardPresentation';

describe('reward ledger presentation', () => {
  it('uses a clear Arabic label for known reward events', () => {
    expect(getRewardEventLabel('weekly_task', true)).toBe('مهمة أسبوعية');
    expect(getRewardEventLabel('unknown_event', true)).toBe('تحديث مكافآت');
  });

  it('derives a safe optional detail from supported ledger metadata', () => {
    expect(getRewardEntryDetail({ quiz_title: 'اختبار العلوم' }, true)).toBe('عن: اختبار العلوم');
    expect(getRewardEntryDetail({ arbitrary: 'ignored' }, false)).toBeNull();
  });
});
