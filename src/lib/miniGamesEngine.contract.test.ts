import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearGameEngineStorage,
  determineSpinOutcome,
  generateMemoryCards,
  getDailyGameAllowance,
  MEMORY_CARD_PAIRS,
  recordGamePlay,
  SPIN_WHEEL_SEGMENTS,
} from './miniGamesEngine';

describe('miniGamesEngine Contract Test (Task 4)', () => {
  beforeEach(() => {
    clearGameEngineStorage();
  });

  describe('generateMemoryCards()', () => {
    it('generates exactly 12 cards forming 6 pairs', () => {
      const cards = generateMemoryCards();
      expect(cards).toHaveLength(12);

      const pairCounts = new Map<string, number>();
      cards.forEach((card) => {
        pairCounts.set(card.pairId, (pairCounts.get(card.pairId) || 0) + 1);
      });

      expect(pairCounts.size).toBe(6);
      for (const count of pairCounts.values()) {
        expect(count).toBe(2);
      }
    });

    it('contains the 6 educational icons: Star, Trophy, Sparkles, BookOpen, Crown, Flame', () => {
      const cards = generateMemoryCards();
      const icons = new Set(cards.map((c) => c.icon));
      expect(icons).toContain('Star');
      expect(icons).toContain('Trophy');
      expect(icons).toContain('Sparkles');
      expect(icons).toContain('BookOpen');
      expect(icons).toContain('Crown');
      expect(icons).toContain('Flame');
    });

    it('initializes all cards with matched = false and unique ids', () => {
      const cards = generateMemoryCards();
      const idSet = new Set(cards.map((c) => c.id));
      expect(idSet.size).toBe(12);
      cards.forEach((card) => {
        expect(card.matched).toBe(false);
        expect(card.label).toBeTruthy();
      });
    });

    it('supports deterministic seeding', () => {
      const cards1 = generateMemoryCards(42);
      const cards2 = generateMemoryCards(42);
      expect(cards1.map((c) => c.id)).toEqual(cards2.map((c) => c.id));
    });
  });

  describe('determineSpinOutcome()', () => {
    it('returns a valid 8-segment prize outcome and targetAngle', () => {
      const outcome = determineSpinOutcome('user_test_spin_1', '2026-11-20');

      expect(outcome.segmentIndex).toBeGreaterThanOrEqual(0);
      expect(outcome.segmentIndex).toBeLessThan(8);
      expect(outcome.targetAngle).toBeGreaterThan(1440);

      const segmentAngle = 360 / 8; // 45
      const angleWithinSpin = (outcome.targetAngle - 360 * 5);
      const expectedAngle = outcome.segmentIndex * segmentAngle + segmentAngle / 2;
      expect(angleWithinSpin).toBeCloseTo(expectedAngle, 1);

      expect(outcome.prize).toEqual(SPIN_WHEEL_SEGMENTS[outcome.segmentIndex]);
    });

    it('has all 8 required Arabic slice prizes defined', () => {
      expect(SPIN_WHEEL_SEGMENTS).toHaveLength(8);
      const labels = SPIN_WHEEL_SEGMENTS.map((s) => s.label);
      expect(labels).toContain('+10 عملات');
      expect(labels).toContain('+25 XP');
      expect(labels).toContain('+50 عملة');
      expect(labels).toContain('تجميد الستريك');
      expect(labels).toContain('+100 XP');
      expect(labels).toContain('صندوق مفاجأة');
      expect(labels).toContain('+15 عملة');
      expect(labels).toContain('مضاعف 2x');
    });

    it('produces deterministic outcome for identical user and date', () => {
      const out1 = determineSpinOutcome('player-abc', '2026-11-20');
      const out2 = determineSpinOutcome('player-abc', '2026-11-20');
      expect(out1.segmentIndex).toBe(out2.segmentIndex);
      expect(out1.targetAngle).toBe(out2.targetAngle);
      expect(out1.prize.label).toBe(out2.prize.label);
    });
  });

  describe('Game Allowances for Cosmic Match and Spin Wheel', () => {
    it('allows 3 daily plays for cosmic_match', () => {
      const initial = getDailyGameAllowance('user_cosmic_1', 'cosmic_match');
      expect(initial.maxDailyPlays).toBe(3);
      expect(initial.remainingPlays).toBe(3);
      expect(initial.canPlay).toBe(true);

      const session = recordGamePlay('user_cosmic_1', 'cosmic_match', 100);
      expect(session.gameId).toBe('cosmic_match');
      expect(session.completed).toBe(true);

      const afterOne = getDailyGameAllowance('user_cosmic_1', 'cosmic_match');
      expect(afterOne.remainingPlays).toBe(2);
      expect(afterOne.canPlay).toBe(true);
    });

    it('allows only 1 daily play for spin_wheel', () => {
      const initial = getDailyGameAllowance('user_spin_1', 'spin_wheel');
      expect(initial.maxDailyPlays).toBe(1);
      expect(initial.remainingPlays).toBe(1);
      expect(initial.canPlay).toBe(true);

      recordGamePlay('user_spin_1', 'spin_wheel', 50);

      const afterSpin = getDailyGameAllowance('user_spin_1', 'spin_wheel');
      expect(afterSpin.remainingPlays).toBe(0);
      expect(afterSpin.canPlay).toBe(false);
    });
  });
});
