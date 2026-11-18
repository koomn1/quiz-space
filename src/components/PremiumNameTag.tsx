import React from 'react';
import { UserBadge } from './UserBadge';
import {
  SubscriptionTier,
  BadgeTier,
  NameColorKey,
  BadgeColorKey,
  BADGE_COLOR_PRESETS,
  NAME_COLOR_PRESETS,
} from '../constants/badgePresets';

export type { SubscriptionTier, BadgeTier, NameColorKey, BadgeColorKey };
export { BADGE_COLOR_PRESETS, NAME_COLOR_PRESETS };

// Which name colors a plan tier can pick from. 'Free' users always get only 'default'.
export function availableNameColors(plan: 'Free' | 'Silver' | 'Gold' | 'Diamond'): NameColorKey[] {
  switch (plan) {
    case 'Diamond': return ['default', 'gold', 'neon_green', 'neon_pink', 'neon_blue', 'silver', 'diamond', 'fire', 'aurora'];
    case 'Gold':    return ['default', 'gold', 'neon_green', 'neon_blue', 'silver', 'fire'];
    case 'Silver':  return ['default', 'silver', 'neon_blue'];
    default:        return ['default'];
  }
}

// Which UserBadge shapes a plan tier can choose to display. Higher plans get
// access to the fancier animated badges (team/enterprise/lifetime/founder),
// same spirit as Telegram Premium letting subscribers pick among several
// badge styles rather than being stuck with one.
export function availableBadgeTiers(plan: 'Free' | 'Silver' | 'Gold' | 'Diamond'): BadgeTier[] {
  switch (plan) {
    case 'Diamond': return ['none', 'verified', 'pro', 'premium', 'team', 'enterprise', 'lifetime', 'founder', 'royal'];
    case 'Gold':    return ['none', 'verified', 'pro', 'premium', 'team'];
    case 'Silver':  return ['none', 'verified', 'pro'];
    default:        return ['none'];
  }
}

export function availableBadgeColors(plan: 'Free' | 'Silver' | 'Gold' | 'Diamond'): BadgeColorKey[] {
  switch (plan) {
    case 'Diamond': return ['blue', 'purple', 'gold', 'rose', 'emerald', 'cyan', 'slate'];
    case 'Gold':    return ['blue', 'purple', 'gold', 'rose', 'emerald'];
    case 'Silver':  return ['blue', 'purple'];
    default:        return ['blue'];
  }
}

const BADGE_LABELS: Record<BadgeTier, { labelAr: string; labelEn: string }> = {
  none:       { labelAr: 'بدون شارة',          labelEn: 'No badge' },
  verified:   { labelAr: ' شارة التوثيق',      labelEn: 'Verified Check' },
  pro:        { labelAr: ' تيك أزرق (Pro)',    labelEn: 'Blue Check (Pro)' },
  premium:    { labelAr: ' تيك بنفسجي',        labelEn: 'Purple Check (Premium)' },
  team:       { labelAr: '◆ شارة الفريق',       labelEn: 'Team Diamond' },
  enterprise: { labelAr: ' التاج الذهبي',      labelEn: 'Enterprise Crown' },
  lifetime:   { labelAr: '∞ مدى الحياة',        labelEn: 'Lifetime' },
  founder:    { labelAr: ' شارة المؤسس',       labelEn: "Founder's Star" },
  royal:      { labelAr: ' التاج الملكي',      labelEn: 'Royal Crown' },
};
export { BADGE_LABELS };

export function normalizeNameColor(value: unknown): NameColorKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(NAME_COLOR_PRESETS, value)
    ? value as NameColorKey
    : 'default';
}

export function normalizeBadgeTier(value: unknown): BadgeTier {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BADGE_LABELS, value)
    ? value as BadgeTier
    : 'none';
}

export function normalizeBadgeColor(value: unknown): BadgeColorKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BADGE_COLOR_PRESETS, value)
    ? value as BadgeColorKey
    : 'blue';
}

/**
 * Renders a display name with the user's chosen color and verified badge.
 * This is what should be used at every place a username is shown next to
 * user-generated content (posts, comments, leaderboard rows, profile header).
 * It enforces the "no badge/color unless still premium" rule itself so
 * callers can't accidentally render a stale badge for a lapsed subscriber.
 */
export function PremiumNameTag({
  name,
  isPremium,
  nameColor = 'default',
  badgeTier = 'none',
  badgeColor = 'blue',
  badgeSize = 'sm',
  className,
}: {
  name: string;
  isPremium: boolean;
  nameColor?: NameColorKey;
  badgeTier?: BadgeTier;
  badgeColor?: BadgeColorKey;
  badgeSize?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const effectiveColor = isPremium ? normalizeNameColor(nameColor) : 'default';
  const effectiveTier = isPremium ? normalizeBadgeTier(badgeTier) : 'none';
  const effectiveBadgeColor = isPremium ? normalizeBadgeColor(badgeColor) : 'blue';

  const preset = NAME_COLOR_PRESETS[effectiveColor];

  return (
    <span className={`inline-flex items-center gap-1 ${className || ''}`}>
      <span
        style={preset.style}
        className={preset.animClass || ''}
      >
        {name}
      </span>
      {effectiveTier !== 'none' && (
        <UserBadge tier={effectiveTier as SubscriptionTier} size={badgeSize} showTooltip={true} badgeColor={effectiveBadgeColor} />
      )}
    </span>
  );
}
