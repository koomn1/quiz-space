import React from 'react';
import { UserBadge, SubscriptionTier } from './UserBadge';

// 'none' means "no badge selected" - not passed to UserBadge at all.
export type BadgeTier = 'none' | Exclude<SubscriptionTier, 'free'>;
export type NameColorKey = 'default' | 'gold' | 'neon_green' | 'neon_pink' | 'neon_blue' | 'silver' | 'diamond' | 'fire' | 'aurora';

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
    case 'Diamond': return ['none', 'pro', 'premium', 'team', 'enterprise', 'lifetime', 'founder'];
    case 'Gold':    return ['none', 'pro', 'premium', 'team'];
    case 'Silver':  return ['none', 'pro'];
    default:        return ['none'];
  }
}

const BADGE_LABELS: Record<BadgeTier, { labelAr: string; labelEn: string }> = {
  none:       { labelAr: 'بدون شارة',          labelEn: 'No badge' },
  pro:        { labelAr: '✓ تيك أزرق (Pro)',    labelEn: 'Blue Check (Pro)' },
  premium:    { labelAr: '✓ تيك بنفسجي',        labelEn: 'Purple Check (Premium)' },
  team:       { labelAr: '◆ شارة الفريق',       labelEn: 'Team Diamond' },
  enterprise: { labelAr: '♛ التاج الذهبي',      labelEn: 'Enterprise Crown' },
  lifetime:   { labelAr: '∞ مدى الحياة',        labelEn: 'Lifetime' },
  founder:    { labelAr: '★ شارة المؤسس',       labelEn: "Founder's Star" },
};
export { BADGE_LABELS };

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
  badgeSize = 'sm',
  className,
}: {
  name: string;
  isPremium: boolean;
  nameColor?: NameColorKey;
  badgeTier?: BadgeTier;
  badgeSize?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const effectiveColor: NameColorKey = isPremium ? nameColor : 'default';
  const effectiveTier: BadgeTier     = isPremium ? badgeTier : 'none';

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
        <UserBadge tier={effectiveTier as SubscriptionTier} size={badgeSize} showTooltip={true} />
      )}
    </span>
  );
}
