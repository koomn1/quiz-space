import React from 'react';

export type SubscriptionTier =
  | 'free'
  | 'verified'
  | 'pro'
  | 'premium'
  | 'team'
  | 'enterprise'
  | 'lifetime'
  | 'founder'
  | 'royal';

// 'none' means "no badge selected" - not passed to UserBadge at all.
export type BadgeTier = 'none' | Exclude<SubscriptionTier, 'free'>;

export type NameColorKey =
  | 'default'
  | 'gold'
  | 'neon_green'
  | 'neon_pink'
  | 'neon_blue'
  | 'silver'
  | 'diamond'
  | 'fire'
  | 'aurora';

export type BadgeColorKey = 'blue' | 'purple' | 'gold' | 'rose' | 'emerald' | 'cyan' | 'slate';

export const BADGE_COLOR_PRESETS: Record<
  BadgeColorKey,
  { labelAr: string; labelEn: string; gradient: string; glowColor: string; ringColors?: string }
> = {
  blue: {
    labelAr: 'أزرق',
    labelEn: 'Blue',
    gradient: 'linear-gradient(145deg, #1d9bf0 0%, #0e7fd4 100%)',
    glowColor: 'rgba(29,155,240,0.55)',
  },
  purple: {
    labelAr: 'بنفسجي',
    labelEn: 'Purple',
    gradient: 'linear-gradient(145deg, #8b5cf6 0%, #7c3aed 60%, #6d28d9 100%)',
    glowColor: 'rgba(124,58,237,0.55)',
    ringColors: 'conic-gradient(from 0deg, #7c3aed, #a855f7, #ec4899, #7c3aed)',
  },
  gold: {
    labelAr: 'ذهبي',
    labelEn: 'Gold',
    gradient: 'linear-gradient(145deg, #fbbf24 0%, #d97706 60%, #b45309 100%)',
    glowColor: 'rgba(251,191,36,0.55)',
    ringColors: 'conic-gradient(from 0deg, #fbbf24, #f59e0b, #fef3c7, #f59e0b, #fbbf24)',
  },
  rose: {
    labelAr: 'وردي',
    labelEn: 'Rose',
    gradient: 'linear-gradient(145deg, #f43f5e 0%, #e11d48 60%, #be123c 100%)',
    glowColor: 'rgba(244,63,94,0.55)',
    ringColors: 'conic-gradient(from 0deg, #f43f5e, #fb7185, #fda4af, #fb7185, #f43f5e)',
  },
  emerald: {
    labelAr: 'زمردي',
    labelEn: 'Emerald',
    gradient: 'linear-gradient(145deg, #10b981 0%, #059669 60%, #047857 100%)',
    glowColor: 'rgba(16,185,129,0.55)',
    ringColors: 'conic-gradient(from 0deg, #10b981, #34d399, #6ee7b7, #34d399, #10b981)',
  },
  cyan: {
    labelAr: 'سماوي',
    labelEn: 'Cyan',
    gradient: 'linear-gradient(145deg, #06b6d4 0%, #0891b2 60%, #0e7490 100%)',
    glowColor: 'rgba(6,182,212,0.55)',
    ringColors: 'conic-gradient(from 0deg, #06b6d4, #22d3ee, #67e8f9, #22d3ee, #06b6d4)',
  },
  slate: {
    labelAr: 'رمادي داكن',
    labelEn: 'Slate',
    gradient: 'linear-gradient(145deg, #64748b 0%, #475569 60%, #334155 100%)',
    glowColor: 'rgba(100,116,139,0.55)',
    ringColors: 'conic-gradient(from 0deg, #94a3b8, #64748b, #475569, #64748b, #94a3b8)',
  },
};

export const NAME_COLOR_PRESETS: Record<
  NameColorKey,
  { labelAr: string; labelEn: string; style: React.CSSProperties; animClass?: string }
> = {
  default: {
    labelAr: 'افتراضي',
    labelEn: 'Default',
    style: {},
  },
  gold: {
    labelAr: 'ذهبي ',
    labelEn: 'Gold',
    style: {
      backgroundImage:
        'linear-gradient(90deg, #f6c231 0%, #fde68a 30%, #f59e0b 55%, #fde68a 75%, #f6c231 100%)',
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
    labelAr: 'نيون أخضر ',
    labelEn: 'Neon Green',
    style: {
      color: '#39ff14',
      textShadow: '0 0 8px rgba(57,255,20,0.8), 0 0 20px rgba(57,255,20,0.4)',
      fontWeight: 800,
    },
  },
  neon_pink: {
    labelAr: 'نيون وردي ',
    labelEn: 'Neon Pink',
    style: {
      color: '#ff3fa4',
      textShadow: '0 0 8px rgba(255,63,164,0.8), 0 0 20px rgba(255,63,164,0.4)',
      fontWeight: 800,
    },
  },
  neon_blue: {
    labelAr: 'نيون أزرق ',
    labelEn: 'Neon Blue',
    style: {
      color: '#00d4ff',
      textShadow: '0 0 8px rgba(0,212,255,0.8), 0 0 20px rgba(0,212,255,0.4)',
      fontWeight: 800,
    },
  },
  silver: {
    labelAr: 'فضي لامع ',
    labelEn: 'Silver',
    style: {
      backgroundImage:
        'linear-gradient(90deg, #94a3b8 0%, #f1f5f9 25%, #cbd5e1 50%, #f1f5f9 75%, #94a3b8 100%)',
      backgroundSize: '200% auto',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      fontWeight: 800,
      textShadow: 'none',
    },
    animClass: 'name-color-silver-anim',
  },
  diamond: {
    labelAr: 'ألماسي كوني ',
    labelEn: 'Diamond',
    style: {
      backgroundImage:
        'linear-gradient(90deg, #38bdf8 0%, #c084fc 33%, #f472b6 66%, #38bdf8 100%)',
      backgroundSize: '200% auto',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      fontWeight: 800,
      textShadow: 'none',
    },
    animClass: 'name-color-diamond-anim',
  },
  fire: {
    labelAr: 'ناري متوهج ',
    labelEn: 'Fire',
    style: {
      backgroundImage:
        'linear-gradient(90deg, #ef4444 0%, #f97316 25%, #eab308 50%, #f97316 75%, #ef4444 100%)',
      backgroundSize: '200% auto',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      fontWeight: 800,
      textShadow: 'none',
    },
    animClass: 'name-color-fire-anim',
  },
  aurora: {
    labelAr: 'شفق قطبي ',
    labelEn: 'Aurora',
    style: {
      backgroundImage:
        'linear-gradient(90deg, #10b981 0%, #06b6d4 33%, #8b5cf6 66%, #10b981 100%)',
      backgroundSize: '200% auto',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      fontWeight: 800,
      textShadow: 'none',
    },
    animClass: 'name-color-aurora-anim',
  },
};
