import React from 'react';

export type SubscriptionTier = 'free' | 'pro' | 'premium' | 'team' | 'enterprise' | 'lifetime' | 'founder';

interface UserBadgeProps {
  tier: SubscriptionTier;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  showLabel?: boolean;
}

const TIER_META: Record<SubscriptionTier, { labelAr: string; labelEn: string }> = {
  free:       { labelAr: 'مجاني',        labelEn: 'Free' },
  pro:        { labelAr: 'برو',           labelEn: 'Pro' },
  premium:    { labelAr: 'بريميوم',       labelEn: 'Premium' },
  team:       { labelAr: 'فريق',          labelEn: 'Team' },
  enterprise: { labelAr: 'مؤسسات',       labelEn: 'Enterprise' },
  lifetime:   { labelAr: 'مدى الحياة',    labelEn: 'Lifetime' },
  founder:    { labelAr: 'مؤسس',          labelEn: 'Founder' },
};

/* ─── Telegram-style verified SVG checkmark ─── */
function CheckSVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5 10.5L8.5 14L15 7"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Star icon for founder ─── */
function StarSVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2l2.4 4.9 5.4.78-3.9 3.8.92 5.36L10 14.27l-4.82 2.57.92-5.36-3.9-3.8 5.4-.78z" />
    </svg>
  );
}

/* ─── Diamond icon ─── */
function DiamondSVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2L3 8l7 10 7-10-7-6z" fill="white" opacity="0.9" />
      <path d="M3 8h14" stroke="white" strokeWidth="1.2" opacity="0.5" />
      <path d="M10 2L6 8l4 10 4-10-4-6z" fill="white" opacity="0.2" />
    </svg>
  );
}

/* ─── Crown icon ─── */
function CrownSVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 14h14l1.5-7L14 10l-4-6-4 6-4.5-3L3 14z" fill="white" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
      <rect x="3" y="14.5" width="14" height="2" rx="1" fill="white" opacity="0.8" />
    </svg>
  );
}

/* ─── Infinity icon for lifetime ─── */
function InfinitySVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4.5 10c0-1.7 1.3-3 2.8-3 .9 0 1.7.4 2.2 1L10 8.5l.5-.5c.5-.6 1.3-1 2.2-1 1.5 0 2.8 1.3 2.8 3s-1.3 3-2.8 3c-.9 0-1.7-.4-2.2-1L10 11.5l-.5.5c-.5.6-1.3 1-2.2 1C5.8 13 4.5 11.7 4.5 10z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function UserBadge({ tier, className = '', size = 'md', showTooltip = true }: UserBadgeProps) {
  const px = size === 'sm' ? 18 : size === 'md' ? 22 : 28;
  const iconPx = Math.round(px * 0.55);
  const meta = TIER_META[tier];

  /* ── FREE: subtle grey dot (no badge vibe) ── */
  if (tier === 'free') return null;

  const tooltip = showTooltip ? (
    <div className="
      absolute -top-9 left-1/2 -translate-x-1/2 z-50
      px-2.5 py-1 rounded-lg text-[10px] font-bold text-white whitespace-nowrap
      pointer-events-none opacity-0 group-hover:opacity-100
      transition-opacity duration-200
      shadow-lg
    " style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)' }}>
      {meta.labelAr}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
    </div>
  ) : null;

  /* ══════════════════════════════════════════════
     PRO — Telegram-style solid blue check
     ══════════════════════════════════════════════ */
  if (tier === 'pro') {
    return (
      <span className={`relative group inline-flex items-center justify-center badge-verified-pop ${className}`} style={{ width: px, height: px }}>
        {/* Outer glow ring */}
        <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: '0 0 10px 4px rgba(29,155,240,0.45)' }} />
        {/* Badge circle */}
        <span className="absolute inset-0 rounded-full"
          style={{ background: 'linear-gradient(145deg, #1d9bf0 0%, #0e7fd4 100%)' }} />
        {/* Shine */}
        <span className="absolute inset-0 rounded-full overflow-hidden">
          <span className="absolute top-0 left-0 right-0 h-1/2 rounded-t-full"
            style={{ background: 'rgba(255,255,255,0.22)' }} />
        </span>
        <span className="relative z-10"><CheckSVG size={iconPx} /></span>
        {tooltip}
      </span>
    );
  }

  /* ══════════════════════════════════════════════
     PREMIUM — Violet/purple gradient check (like Instagram verified)
     ══════════════════════════════════════════════ */
  if (tier === 'premium') {
    return (
      <span className={`relative group inline-flex items-center justify-center badge-verified-pop ${className}`} style={{ width: px, height: px }}>
        <span className="absolute inset-[-3px] rounded-full animate-[spin_4s_linear_infinite] opacity-70"
          style={{ background: 'conic-gradient(from 0deg, #7c3aed, #a855f7, #ec4899, #7c3aed)' }} />
        <span className="absolute inset-0 rounded-full"
          style={{ background: 'linear-gradient(145deg, #8b5cf6 0%, #7c3aed 60%, #6d28d9 100%)' }} />
        <span className="absolute inset-0 rounded-full overflow-hidden">
          <span className="absolute top-0 left-0 right-0 h-1/2 rounded-t-full"
            style={{ background: 'rgba(255,255,255,0.2)' }} />
        </span>
        <span className="relative z-10"><CheckSVG size={iconPx} /></span>
        {tooltip}
      </span>
    );
  }

  /* ══════════════════════════════════════════════
     TEAM — Cyan/teal diamond shape (Discord Nitro feel)
     ══════════════════════════════════════════════ */
  if (tier === 'team') {
    return (
      <span className={`relative group inline-flex items-center justify-center ${className}`} style={{ width: px, height: px }}>
        {/* Glow */}
        <span className="absolute inset-0 rounded-full animate-pulse"
          style={{ boxShadow: '0 0 12px 4px rgba(6,182,212,0.5)', borderRadius: '30%' }} />
        {/* Rotated square — diamond shape */}
        <span className="absolute inset-0 rotate-45 rounded-[20%]"
          style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)' }} />
        <span className="absolute inset-0 rotate-45 rounded-[20%] overflow-hidden">
          <span className="absolute top-0 left-0 right-0 h-1/2"
            style={{ background: 'rgba(255,255,255,0.2)' }} />
        </span>
        <span className="relative z-10"><DiamondSVG size={iconPx} /></span>
        {tooltip}
      </span>
    );
  }

  /* ══════════════════════════════════════════════
     ENTERPRISE — Gold spinning crown (YouTube Creator vibe)
     ══════════════════════════════════════════════ */
  if (tier === 'enterprise') {
    return (
      <span className={`relative group inline-flex items-center justify-center ${className}`} style={{ width: px, height: px }}>
        {/* Spinning gold ring */}
        <span className="absolute inset-[-3px] rounded-full animate-[spin_3s_linear_infinite]"
          style={{ background: 'conic-gradient(from 0deg, #fbbf24, #f59e0b, #fef3c7, #f59e0b, #fbbf24)', opacity: 0.85 }} />
        <span className="absolute inset-[-3px] rounded-full animate-[spin_3s_linear_infinite_reverse]"
          style={{ background: 'conic-gradient(from 180deg, #fcd34d, #d97706, #fde68a, #d97706, #fcd34d)', opacity: 0.6 }} />
        {/* Inner circle */}
        <span className="absolute inset-0 rounded-full"
          style={{ background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(251,191,36,0.4)' }} />
        <span className="absolute inset-0 rounded-full overflow-hidden">
          <span className="absolute top-0 left-0 right-0 h-1/2 rounded-t-full"
            style={{ background: 'rgba(251,191,36,0.1)' }} />
        </span>
        <span className="relative z-10" style={{ filter: 'drop-shadow(0 0 5px rgba(251,191,36,0.8))' }}>
          <CrownSVG size={iconPx} />
        </span>
        {tooltip}
      </span>
    );
  }

  /* ══════════════════════════════════════════════
     LIFETIME — Gold shield shimmer (like Gold badge)
     ══════════════════════════════════════════════ */
  if (tier === 'lifetime') {
    return (
      <span className={`relative group inline-flex items-center justify-center badge-lifetime-shine ${className}`} style={{ width: px, height: px }}>
        <span className="absolute inset-0 rounded-[28%] overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 35%, #fbbf24 65%, #d97706 100%)', backgroundSize: '200% auto' }} />
        {/* Shine sweep */}
        <span className="absolute inset-0 rounded-[28%] overflow-hidden pointer-events-none badge-shine-sweep" />
        <span className="relative z-10" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}>
          <InfinitySVG size={iconPx} />
        </span>
        {tooltip}
      </span>
    );
  }

  /* ══════════════════════════════════════════════
     FOUNDER — Rainbow holo star (ultra-rare)
     ══════════════════════════════════════════════ */
  if (tier === 'founder') {
    return (
      <span className={`relative group inline-flex items-center justify-center badge-founder-holo ${className}`} style={{ width: px, height: px }}>
        {/* Blurred rainbow halo */}
        <span className="absolute inset-[-6px] rounded-full opacity-75"
          style={{ background: 'conic-gradient(from 0deg, #f43f5e,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6,#ec4899,#f43f5e)', filter: 'blur(7px)', animation: 'spin 3s linear infinite' }} />
        {/* Frosted glass circle */}
        <span className="absolute inset-0 rounded-full"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 100%)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.5)' }} />
        <span className="relative z-10" style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.9))' }}>
          <StarSVG size={iconPx} />
        </span>
        {tooltip}
      </span>
    );
  }

  return null;
}
