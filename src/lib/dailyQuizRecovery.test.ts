import { describe, expect, it } from 'vitest';
import { shouldRecoverStalledDailyQuizRefresh } from './dailyQuizRecovery';

describe('daily quiz stalled-refresh recovery', () => {
  it('reclaims a reserved slot only when it has no payload or generation timestamp', () => {
    expect(shouldRecoverStalledDailyQuizRefresh({
      refreshing: true,
      quizPayload: null,
      refreshedAt: null,
    })).toBe(true);
  });

  it('does not interrupt an active or already prepared quiz', () => {
    expect(shouldRecoverStalledDailyQuizRefresh({
      refreshing: true,
      quizPayload: null,
      refreshedAt: '2026-08-15T00:00:00.000Z',
    })).toBe(false);
    expect(shouldRecoverStalledDailyQuizRefresh({
      refreshing: true,
      quizPayload: { id: 'daily-student-1-42-02' },
      refreshedAt: null,
    })).toBe(false);
  });
});
