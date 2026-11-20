import { beforeEach, describe, expect, it } from 'vitest';
import {
  calculatePuzzleReward,
  clearGameEngineStorage,
  determineSpinOutcome,
  generateMemoryCards,
  getDailyGameAllowance,
  getDailyWordMatrix,
  recordGamePlay,
  verifyWordSolution,
  WORD_MATRIX_TOPICS,
} from './miniGamesEngine';

describe('miniGamesEngine', () => {
  beforeEach(() => {
    clearGameEngineStorage();
  });

  describe('Word Matrix Engine', () => {
    it('defines Arabic topic categories including science, language, tech, space, general knowledge', () => {
      expect(WORD_MATRIX_TOPICS).toContain('علوم');
      expect(WORD_MATRIX_TOPICS).toContain('لغة');
      expect(WORD_MATRIX_TOPICS).toContain('تقنية');
      expect(WORD_MATRIX_TOPICS).toContain('فضاء');
      expect(WORD_MATRIX_TOPICS).toContain('ثقافة عامة');
    });

    it('generates consistent daily Arabic word puzzle for a specific date', () => {
      const puzzle1 = getDailyWordMatrix('2026-11-20');
      const puzzle2 = getDailyWordMatrix('2026-11-20');

      expect(puzzle1.id).toBe(puzzle2.id);
      expect(puzzle1.topicAr).toBe(puzzle2.topicAr);
      expect(puzzle1.letters).toEqual(puzzle2.letters);
      expect(puzzle1.targetWords).toEqual(puzzle2.targetWords);

      expect(puzzle1.letters.length).toBeGreaterThanOrEqual(4);
      expect(puzzle1.targetWords.length).toBeGreaterThan(0);
      expect(WORD_MATRIX_TOPICS).toContain(puzzle1.topicAr);
    });

    it('defaults to today date if dateString is omitted', () => {
      const puzzle = getDailyWordMatrix();
      expect(puzzle.id).toBeDefined();
      expect(puzzle.letters.length).toBeGreaterThanOrEqual(4);
      expect(puzzle.targetWords.length).toBeGreaterThanOrEqual(1);
    });

    it('provides letters pool capable of constructing target words', () => {
      const puzzle = getDailyWordMatrix('2026-11-21');
      // For each target word, all of its letters should be in the puzzle's letter pool
      for (const word of puzzle.targetWords) {
        const wordLetters = word.split('');
        for (const char of wordLetters) {
          expect(puzzle.letters).toContain(char);
        }
      }
    });

    it('verifies correct Arabic word combination', () => {
      const isValid = verifyWordSolution(['ك', 'و', 'ي', 'ز'], 'كويز');
      expect(isValid).toBe(true);

      const isInvalid = verifyWordSolution(['ك', 'و', 'ب'], 'كويز');
      expect(isInvalid).toBe(false);

      const isPartial = verifyWordSolution(['ك', 'و', 'ي'], 'كويز');
      expect(isPartial).toBe(false);
    });

    it('calculates bonus XP and coins correctly for quick solving', () => {
      const fastReward = calculatePuzzleReward(30 /* seconds */, 3 /* words */);
      expect(fastReward.coins).toBeGreaterThanOrEqual(15);
      expect(fastReward.xp).toBeGreaterThanOrEqual(25);

      const slowReward = calculatePuzzleReward(120 /* seconds */, 3 /* words */);
      expect(fastReward.coins).toBeGreaterThanOrEqual(slowReward.coins);
      expect(fastReward.xp).toBeGreaterThanOrEqual(slowReward.xp);

      const instantFastReward = calculatePuzzleReward(10, 3);
      expect(instantFastReward.coins).toBe(25);
      expect(instantFastReward.xp).toBe(40);
    });

    it('handles whitespace in word verification', () => {
      expect(verifyWordSolution([' ك ', ' و ', ' ي ', ' ز '], 'كويز')).toBe(false);
      expect(verifyWordSolution(['ك', 'و', 'ي', 'ز'], ' كويز ')).toBe(true);
      expect(verifyWordSolution([], 'كويز')).toBe(false);
    });
  });

  describe('Daily Game Allowance and Recording', () => {
    it('returns default daily allowance of 3 plays for word_matrix', () => {
      const allowance = getDailyGameAllowance('user-test-1', 'word_matrix');
      expect(allowance.maxDailyPlays).toBe(3);
      expect(allowance.remainingPlays).toBe(3);
      expect(allowance.canPlay).toBe(true);
    });

    it('records gameplay and decrements remaining plays', () => {
      const userId = 'user-record-test';
      const session = recordGamePlay(userId, 'word_matrix', 100);

      expect(session.id).toBeDefined();
      expect(session.gameId).toBe('word_matrix');
      expect(session.score).toBe(100);
      expect(session.completed).toBe(true);
      expect(session.rewardCoins).toBeGreaterThan(0);
      expect(session.rewardXp).toBeGreaterThan(0);

      const updatedAllowance = getDailyGameAllowance(userId, 'word_matrix');
      expect(updatedAllowance.remainingPlays).toBe(2);
      expect(updatedAllowance.canPlay).toBe(true);
    });

    it('prevents playing when daily allowance is exhausted', () => {
      const userId = 'user-exhaust-test';
      recordGamePlay(userId, 'word_matrix', 100);
      recordGamePlay(userId, 'word_matrix', 80);
      recordGamePlay(userId, 'word_matrix', 90);

      const finalAllowance = getDailyGameAllowance(userId, 'word_matrix');
      expect(finalAllowance.remainingPlays).toBe(0);
      expect(finalAllowance.canPlay).toBe(false);
    });
  });

  describe('Task 4 Compatibility Mechanics', () => {
    it('generates 12 memory cards with 6 matching pairs', () => {
      const cards = generateMemoryCards();
      expect(cards.length).toBe(12);
      const uniqueIds = new Set(cards.map((c) => c.pairId));
      expect(uniqueIds.size).toBe(6);
    });

    it('determines server-authoritative spin outcome with valid segment angle', () => {
      const outcome = determineSpinOutcome('user-123', '2026-11-20');
      expect(outcome.segmentIndex).toBeGreaterThanOrEqual(0);
      expect(outcome.segmentIndex).toBeLessThan(8);
      expect(outcome.targetAngle).toBeGreaterThan(0);
    });
  });
});
