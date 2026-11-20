import { describe, expect, it } from 'vitest';
import {
  getBadgeRarityStyle,
  getRewardEntryDetail,
  getRewardEventLabel,
} from './rewardPresentation';

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

describe('rewardPresentation luxury tokens', () => {
  it('returns brand color styles for badge rarities', () => {
    const legendary = getBadgeRarityStyle('legendary');
    expect(legendary.borderColor).toBe('var(--color-coral, #EE8361)');
    expect(legendary.glowColor).toContain('42, 195, 187');
    expect(legendary.bgGradient).toBeDefined();

    const rare = getBadgeRarityStyle('rare');
    expect(rare.borderColor).toBe('var(--color-bright-teal, #2AC3BB)');
    expect(rare.glowColor).toContain('42, 195, 187');
    expect(rare.bgGradient).toBeDefined();

    const common = getBadgeRarityStyle('common');
    expect(common.borderColor).toBe('var(--color-petrol, #007472)');
    expect(common.glowColor).toContain('0, 116, 114');
    expect(common.bgGradient).toBeDefined();

    const fallback = getBadgeRarityStyle('unknown' as any);
    expect(fallback.borderColor).toBe('var(--color-petrol, #007472)');
  });

  it('maps mini-game reward event labels correctly in Arabic and English', () => {
    // Test with 'ar' string and true boolean
    expect(getRewardEventLabel('mini_game_cosmic_match', 'ar')).toBe('لعبة تطابق الذاكرة');
    expect(getRewardEventLabel('mini_game_cosmic_match', true)).toBe('لعبة تطابق الذاكرة');
    expect(getRewardEventLabel('mini_game_cosmic_match', 'en')).toBe('Cosmic Memory Match');
    expect(getRewardEventLabel('mini_game_cosmic_match', false)).toBe('Cosmic Memory Match');

    expect(getRewardEventLabel('mini_game_word_matrix', 'ar')).toBe('لعبة مصفوفة الكلمات');
    expect(getRewardEventLabel('mini_game_word_matrix', false)).toBe('Word Matrix Puzzle');

    expect(getRewardEventLabel('mini_game_spin_wheel', 'ar')).toBe('عجلة الحظ اليومية');
    expect(getRewardEventLabel('mini_game_spin_wheel', false)).toBe('Daily Lucky Spin Wheel');

    expect(getRewardEventLabel('avatar_frame_purchase', 'ar')).toBe('شراء إطار الأفاتار');
    expect(getRewardEventLabel('avatar_frame_purchase', false)).toBe('Avatar Frame Purchase');
  });
});
