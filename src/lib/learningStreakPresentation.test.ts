import { describe, expect, it } from 'vitest';
import { applyCanonicalLearningStreak } from './learningStreakPresentation';

describe('learning streak presentation', () => {
  it('uses the canonical per-user streak for both the rewards headline and daily-gift copy', () => {
    const summary = applyCanonicalLearningStreak({
      points: 100,
      coins: 5,
      level: 1,
      dailyStreak: 1,
      vipTier: 'none',
      badges: [],
      recentEntries: [],
      dailyChallenges: [],
      dailyGift: { claimed: true, streak: 1 },
    }, 3);

    expect(summary.dailyStreak).toBe(3);
    expect(summary.dailyGift?.streak).toBe(3);
  });
});
