import type { RewardsSummary } from '../types';

export function applyCanonicalLearningStreak(summary: RewardsSummary, currentStreak: number): RewardsSummary {
  const streak = Math.max(0, Math.floor(Number(currentStreak) || 0));
  return {
    ...summary,
    dailyStreak: streak,
    dailyGift: summary.dailyGift ? { ...summary.dailyGift, streak } : summary.dailyGift,
  };
}
