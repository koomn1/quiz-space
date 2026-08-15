import { describe, expect, it } from 'vitest';
import {
  normalizeBadgeColor,
  normalizeBadgeTier,
  normalizeNameColor,
} from './PremiumNameTag';

describe('profile decoration runtime normalization', () => {
  it('keeps supported name colors and falls back for stale values', () => {
    expect(normalizeNameColor('diamond')).toBe('diamond');
    expect(normalizeNameColor('old-neon-color')).toBe('default');
    expect(normalizeNameColor(null)).toBe('default');
  });

  it('keeps supported badge tiers and falls back to no badge', () => {
    expect(normalizeBadgeTier('premium')).toBe('premium');
    expect(normalizeBadgeTier('legacy-tier')).toBe('none');
    expect(normalizeBadgeTier(undefined)).toBe('none');
  });

  it('keeps supported badge colors and falls back to blue', () => {
    expect(normalizeBadgeColor('rose')).toBe('rose');
    expect(normalizeBadgeColor('legacy-color')).toBe('blue');
    expect(normalizeBadgeColor(42)).toBe('blue');
  });
});
