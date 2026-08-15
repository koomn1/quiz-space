import React from 'react';
import { UserBadge, SubscriptionTier } from './UserBadge';

// 'none' means "no badge selected" - not passed to UserBadge at all.
export type BadgeTier = 'none' | Exclude<SubscriptionTier, 'free'>;
export type NameColorKey = 'default' | 'gold' | 'neon_green' | 'neon_pink' | 'neon_blue' | 'silver' | 'diamond' | 'fire' | 'aurora';
export type BadgeColorKey = 'blue' | 'purple' | 'gold' | 'rose' | 'emerald' | 'cyan' | 'slate';

export const BADGE_COLOR_PRESETS: Record<BadgeColorKey, { labelAr: string; labelEn: string; gradient: string; glowColor: string; ringColors?: string }> = {
  blue: { labelAr: 'أزرق', labelEn: 'Blue', gradient: 'linear-gradient(145deg, #1d9bf0 0%, #0e7fd4 100%)', glowColor: 'rgba(29,155,240,0.55)' },
  purple: { labelAr: 'بنفسجي', labelEn: 'Purple', gradient: 'linear-gradient(145deg, #8b5cf6 0%, #7c3aed 60%, #6d28d9 100%)', glowColor: 'rgba(124,58,237,0.55)', ringColors: 'conic-gradient(from 0deg, #7c3aed, #a855f7, #ec4899, #7c3aed)' },
  gold: { labelAr: 'ذهبي', labelEn: 'Gold', gradient: 'linear-gradient(145deg, #fbbf24 0%, #d97706 60%, #b45309 100%)', glowColor: 'rgba(251,191,36,0.55)', ringColors: 'conic-gradient(from 0deg, #fbbf24, #f59e0b, #fef3c7, #f59e0b, #fbbf24)' },
  rose: { labelAr: 'وردي', labelEn: 'Rose', gradient: 'linear-gradient(145deg, #f43f5e 0%, #e11d48 60%, #be123c 100%)', glowColor: 'rgba(244,63,94,0.55)', ringColors: 'conic-gradient(from 0deg, #f43f5e, #fb7185, #fda4af, #fb7185, #f43f5e)' },
  emerald: { labelAr: 'زمردي', labelEn: 'Emerald', gradient: 'linear-gradient(145deg, #10b981 0%, #059669 60%, #047857 100%)', glowColor: 'rgba(16,185,129,0.55)', ringColors: 'conic-gradient(from 0deg, #10b981, #34d399, #6ee7b7, #34d399, #10b981)' },
  cyan: { labelAr: 'سماوي', labelEn: 'Cyan', gradient: 'linear-gradient(145deg, #06b6d4 0%, #0891b2 60%, #0e7490 100%)', glowColor: 'rgba(6,182,212,0.55)', ringColors: 'conic-gradient(from 0deg, #06b6d4, #22d3ee, #67e8f9, #22d3ee, #06b6d4)' },
  slate: { labelAr: 'رمادي داكن', labelEn: 'Slate', gradient: 'linear-gradient(145deg, #64748b 0%, #475569 60%, #334155 100%)', glowColor: 'rgba(100,116,139,0.55)', ringColors: 'conic-gradient(from 0deg, #94a3b8, #64748b, #475569, #64748b, #94a3b8)' },
};

// ---------------- NAME COLOR PRESETS ----------------
// CSS applied to a user's display name wherever it's rendered next to content
// they created (community posts, leaderboard, profile header, comments...).
export const NAME_COLOR_PRESETS: Record<NameColorKey, { labelAr: string; labelEn: string; style: React.CSSProperties; animClass?: string }> = {
  default: {
    labelAr: 'افتراضي',
    labelEn: 'Default',
    style: {},
  },
  gold: {
    labelAr: 'ذهبي ✨',
    labelEn: 'Gold',
    style: {
      backgroundImage: 'linear-gradient(90deg, #f6c231 0%, #fde68a 30%, #f59e0b 55%, #fde68a 75%, #f6c231 100%)',
      backgroundSize: '200% auto',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      fontWeight: 800,
      textShadow: 'none',
    },
    animClass: 'name-color-gold-anim',
  },
  neon_green: {
    labelAr: 'نيون أخضر 💚',
    labelEn: 'Neon Green',
    style: {
      color: '#39ff14',
      textShadow: '0 0 8px rgba(57,255,20,0.8), 0 0 20px rgba(57,255,20,0.4)',
      fontWeight: 800,
    },
  },
  neon_pink: {
    labelAr: 'نيون وردي 💗',
    labelEn: 'Neon Pink',
    style: {
      color: '#ff3fa4',
      textShadow: '0 0 8px rgba(255,63,164,0.8), 0 0 20px rgba(255,63,164,0.4)',
      fontWeight: 800,
    },
  },
  neon_blue: {
    labelAr: 'نيون أزرق 💙',
    labelEn: 'Neon Blue',
    style: {
      color: '#38bdf8',
      textShadow: '0 0 8px rgba(56,189,248,0.8), 0 0 20px rgba(56,189,248,0.4)',
      fontWeight: 800,
    },
  },
  silver: {
    labelAr: 'فضي 🩶',
    labelEn: 'Silver',
    style: {
      backgroundImage: 'linear-gradient(90deg, #e2e8f0 0%, #94a3b8 30%, #cbd5e1 55%, #94a3b8 75%, #e2e8f0 100%)',
      backgroundSize: '200% auto',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      fontWeight: 800,
    },
    animClass: 'name-color-silver-anim',
  },
  diamond: {
    labelAr: 'ماسي 💎',
    labelEn: 'Diamond',
    style: {
      backgroundImage: 'linear-gradient(90deg, #a5f3fc 0%, #c4b5fd 25%, #f0abfc 50%, #818cf8 75%, #a5f3fc 100%)',
      backgroundSize: '300% auto',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      fontWeight: 800,
    },
    animClass: 'name-color-diamond-anim',
  },
  fire: {
    labelAr: 'ناري 🔥',
    labelEn: 'Fire',
    style: {
      backgroundImage: 'linear-gradient(90deg, #ef4444 0%, #f97316 30%, #fbbf24 55%, #f97316 75%, #ef4444 100%)',
      backgroundSize: '200% auto',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      fontWeight: 800,
    },
    animClass: 'name-color-fire-anim',
  },
  aurora: {
    labelAr: 'أورورا 🌌',
    labelEn: 'Aurora',
    style: {
      backgroundImage: 'linear-gradient(90deg, #34d399 0%, #818cf8 25%, #f472b6 50%, #34d399 75%, #818cf8 100%)',
      backgroundSize: '300% auto',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      fontWeight: 800,
    },
    animClass: 'name-color-aurora-anim',
  },
};

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
  verified:   { labelAr: '✔ شارة التوثيق',      labelEn: 'Verified Check' },
  pro:        { labelAr: '✓ تيك أزرق (Pro)',    labelEn: 'Blue Check (Pro)' },
  premium:    { labelAr: '✓ تيك بنفسجي',        labelEn: 'Purple Check (Premium)' },
  team:       { labelAr: '◆ شارة الفريق',       labelEn: 'Team Diamond' },
  enterprise: { labelAr: '♛ التاج الذهبي',      labelEn: 'Enterprise Crown' },
  lifetime:   { labelAr: '∞ مدى الحياة',        labelEn: 'Lifetime' },
  founder:    { labelAr: '★ شارة المؤسس',       labelEn: "Founder's Star" },
  royal:      { labelAr: '👑 التاج الملكي',      labelEn: 'Royal Crown' },
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
