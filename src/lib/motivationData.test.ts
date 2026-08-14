import { describe, expect, it } from 'vitest';
import { normalizeKnowledgeDuelPayload, normalizeLearningSeasonPayload, normalizePersonalLearningImprovement, normalizeSmartReviewPayload } from './motivationData';

describe('motivation recommendation payloads', () => {
  it('normalizes server cards and clamps an invalid accuracy value', () => {
    const result = normalizeSmartReviewPayload({
      window_days: '60',
      cards: [{ topic: 'العلوم', attempts: '3', accuracy: 140, quiz_ids: ['q-1', 2] }],
    });
    expect(result).toEqual({
      windowDays: 60,
      cards: [{ topic: 'العلوم', attempts: 3, accuracy: 100, lastAttemptAt: undefined, quizIds: ['q-1', '2'] }],
    });
  });

  it('returns safe defaults when the response is incomplete', () => {
    expect(normalizePersonalLearningImprovement(null)).toEqual({
      currentPeriod: { days: 28, completed: 0, accuracy: 0 },
      previousPeriod: { days: 28, completed: 0, accuracy: 0 },
      accuracyChange: 0,
      completionChange: 0,
    });
  });

  it('normalizes a learning season without trusting invalid reward fields', () => {
    expect(normalizeLearningSeasonPayload({
      season: { id: 'season-1', name: 'Focus', ends_at: '2026-09-01' }, completed_quizzes: '-4',
      choices: [{ key: 'coins', type: 'coins', amount: '25', required_quizzes: '3' }, { key: '', type: 'not-real', amount: -1 }],
    })).toEqual({
      season: { id: 'season-1', name: 'Focus', nameAr: undefined, description: undefined, descriptionAr: undefined, endsAt: '2026-09-01' },
      completedQuizzes: 0, choices: [{ key: 'coins', type: 'coins', amount: 25, badgeId: undefined, requiredQuizzes: 3 }], claimedChoice: undefined,
    });
  });

  it('clamps malformed private-duel state while keeping a valid active round', () => {
    expect(normalizeKnowledgeDuelPayload({
      status: 'active', question_count: 99, answered_count: -7, opponent_finished: 1,
      round: { sequence: 8, prompt_ar: '٢ + ٢', prompt_en: '2 + 2', options: ['4', null] },
      result: { my_score: 99, opponent_score: -2, outcome: 'tie' },
    })).toEqual({
      status: 'active', questionCount: 5, answeredCount: 0, opponentFinished: true,
      round: { sequence: 5, promptAr: '٢ + ٢', promptEn: '2 + 2', options: ['4', 'null'] },
      result: { myScore: 5, opponentScore: 0, outcome: 'tie' },
    });
  });
});
