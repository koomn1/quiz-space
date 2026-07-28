import React from 'react';
import { UserBadge, SubscriptionTier } from './UserBadge';

// 'none' means "no badge selected" - not passed to UserBadge at all.
export type BadgeTier = 'none' | Exclude<SubscriptionTier, 'free'>;
export type NameColorKey = 'default' | 'gold' | 'neon_green' | 'neon_pink' | 'neon_blue' | 'silver' | 'diamond';

// ---------------- NAME COLOR PRESETS ----------------
// CSS applied to a user's display name wherever it's rendered next to content
// they created (community posts, leaderboard, profile header, comments...).
export const NAME_COLOR_PRESETS: Record<NameColorKey, { labelAr: string; labelEn: string; style: React.CSSProperties }> = {
  default: {
    labelAr: 'افتراضي',
    labelEn: 'Default',
    style: {},
  },
  gold: {
    labelAr: 'ذهبي',
    labelEn: 'Gold',
    style: {
      backgroundImage: 'linear-gradient(90deg, #f6d365 0%, #fda085 50%, #f6d365 100%)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      fontWeight: 800,
    },
  },
  neon_green: {
    labelAr: 'نيون أخضر',
    labelEn: 'Neon Green',
    style: { color: '#39ff14', textShadow: '0 0 6px rgba(57,255,20,0.65)', fontWeight: 800 },
  },
  neon_pink: {
    labelAr: 'نيون وردي',
    labelEn: 'Neon Pink',
    style: { color: '#ff3fa4', textShadow: '0 0 6px rgba(255,63,164,0.65)', fontWeight: 800 },
  },
  neon_blue: {
    labelAr: 'نيون أزرق',
    labelEn: 'Neon Blue',
    style: { color: '#38bdf8', textShadow: '0 0 6px rgba(56,189,248,0.65)', fontWeight: 800 },
  },
  silver: {
    labelAr: 'فضي',
    labelEn: 'Silver',
    style: {
      backgroundImage: 'linear-gradient(90deg, #e2e8f0 0%, #94a3b8 50%, #e2e8f0 100%)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      fontWeight: 800,
    },
  },
  diamond: {
    labelAr: 'ماسي',
    labelEn: 'Diamond',
    style: {
      backgroundImage: 'linear-gradient(90deg, #a5f3fc 0%, #c4b5fd 35%, #f0abfc 65%, #a5f3fc 100%)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      fontWeight: 800,
    },
  },
};

// Which name colors a plan tier can pick from. 'Free' users always get only 'default'.
export function availableNameColors(plan: 'Free' | 'Silver' | 'Gold' | 'Diamond'): NameColorKey[] {
  switch (plan) {
    case 'Diamond': return ['default', 'gold', 'neon_green', 'neon_pink', 'neon_blue', 'silver', 'diamond'];
    case 'Gold': return ['default', 'gold', 'neon_green', 'neon_blue', 'silver'];
    case 'Silver': return ['default', 'silver', 'neon_blue'];
    default: return ['default'];
  }
}

// Which UserBadge shapes a plan tier can choose to display. Higher plans get
// access to the fancier animated badges (team/enterprise/lifetime/founder),
// same spirit as Telegram Premium letting subscribers pick among several
// badge styles rather than being stuck with one.
export function availableBadgeTiers(plan: 'Free' | 'Silver' | 'Gold' | 'Diamond'): BadgeTier[] {
  switch (plan) {
    case 'Diamond': return ['none', 'pro', 'premium', 'team', 'enterprise', 'lifetime', 'founder'];
    case 'Gold': return ['none', 'pro', 'premium', 'team'];
    case 'Silver': return ['none', 'pro'];
    default: return ['none'];
  }
}

const BADGE_LABELS: Record<BadgeTier, { labelAr: string; labelEn: string }> = {
  none: { labelAr: 'بدون شارة', labelEn: 'No badge' },
  pro: { labelAr: 'تيك أزرق (Pro)', labelEn: 'Blue Check (Pro)' },
  premium: { labelAr: 'شارة بريميوم', labelEn: 'Premium Badge' },
  team: { labelAr: 'شارة الفريق', labelEn: 'Team Badge' },
  enterprise: { labelAr: 'التاج الذهبي', labelEn: 'Enterprise Crown' },
  lifetime: { labelAr: 'الدرع الذهبي', labelEn: 'Lifetime Shield' },
  founder: { labelAr: 'شارة المؤسس', labelEn: "Founder's Crown" },
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
  const effectiveTier: BadgeTier = isPremium ? badgeTier : 'none';

  return (
    <span className={`inline-flex items-center gap-1 ${className || ''}`}>
      <span style={NAME_COLOR_PRESETS[effectiveColor].style}>{name}</span>
      {effectiveTier !== 'none' && <UserBadge tier={effectiveTier as SubscriptionTier} size={badgeSize} showTooltip={true} />}
    </span>
  );
}

