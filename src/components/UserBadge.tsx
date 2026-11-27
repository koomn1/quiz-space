import React from 'react';
import { BADGE_COLOR_PRESETS, BadgeColorKey, SubscriptionTier } from '../constants/badgePresets';

interface UserBadgeProps {
  tier: SubscriptionTier;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  showLabel?: boolean;
  badgeColor?: BadgeColorKey;
}

const TIER_META: Record<SubscriptionTier, { labelAr: string; labelEn: string }> = {
  free:       { labelAr: 'مجاني',        labelEn: 'Free' },
  verified:   { labelAr: 'موثّق رسمي',    labelEn: 'Verified' },
  pro:        { labelAr: 'برو (Pro)',     labelEn: 'Pro' },
  premium:    { labelAr: 'بريميوم',       labelEn: 'Premium' },
  team:       { labelAr: 'فريق معتمد',    labelEn: 'Team' },
  enterprise: { labelAr: 'مؤسسة معتمدة',  labelEn: 'Enterprise' },
  lifetime:   { labelAr: 'مدى الحياة',    labelEn: 'Lifetime' },
  founder:    { labelAr: 'مؤسس',          labelEn: 'Founder' },
  royal:      { labelAr: 'ملكي فاخر',     labelEn: 'Royal' },
};

/**
 * 1. Verified Badge: Iconic 12-point scalloped seal with crisp checkmark (Static)
 */
function VerifiedSeal({ size, color }: { size: number; color?: BadgeColorKey }) {
  const gradId = `seal-v-${color || 'blue'}`;
  return (
    <svg width={size} height={size} viewBox="-1 -1 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 drop-shadow-xs overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2AC3BB" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>
      {/* 12-point scalloped rosette */}
      <path
        d="M12 1.5L14.7 3.6L18 3.5L19.4 6.5L22.4 7.9L22.3 11.2L24 13.9L22.3 16.6L22.4 19.9L19.4 21.3L18 24.3L14.7 24.2L12 26.3L9.3 24.2L6 24.3L4.6 21.3L1.6 19.9L1.7 16.6L0 13.9L1.7 11.2L1.6 7.9L4.6 6.5L6 3.5L9.3 3.6L12 1.5Z"
        transform="scale(0.85) translate(2, 2)"
        fill={`url(#${gradId})`}
      />
      {/* White verification check */}
      <path
        d="M7.5 12L10.5 15L16.5 9"
        stroke="#FCF6EE"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 2. Pro Badge: Modern Shield with double check in electric teal & petrol (Static)
 */
function ProSeal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="-1 -1 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 drop-shadow-xs overflow-visible">
      <defs>
        <linearGradient id="pro-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2AC3BB" />
          <stop offset="60%" stopColor="#007472" />
          <stop offset="100%" stopColor="#004d4b" />
        </linearGradient>
      </defs>
      {/* Shield */}
      <path
        d="M12 2L4 5.5V11.5C4 16.5 7.4 21.1 12 22.5C16.6 21.1 20 16.5 20 11.5V5.5L12 2Z"
        fill="url(#pro-grad)"
        stroke="#2AC3BB"
        strokeWidth="0.8"
      />
      {/* Checkmark */}
      <path
        d="M8 12.2L10.8 15L16 9.8"
        stroke="#FCF6EE"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 3. Premium Badge: Octagonal Royal Violet star rosette (Static)
 */
function PremiumSeal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="-1 -1 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 drop-shadow-xs overflow-visible">
      <defs>
        <linearGradient id="prem-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      {/* Octagon star */}
      <path
        d="M12 2L15 4.8L19 4L20 8.2L23.4 10.7L22 14.8L23.4 18.9L19.4 19.8L17.7 23.5L13.5 22.5L10.5 24.5L7.5 22.5L3.3 23.5L1.6 19.8L2.6 15.7L0.6 12L2.6 8.3L1.6 4.2L5.6 3.3L7.3 0.5L12 2Z"
        transform="scale(0.88) translate(1.6, 1.2)"
        fill="url(#prem-grad)"
      />
      {/* White Star Check */}
      <path
        d="M8.2 12.3L10.8 14.9L15.8 9.5"
        stroke="#FCF6EE"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 4. Team Badge: Deep Ocean Petrol diamond crest with team triple stars (Static)
 */
function TeamSeal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="-1 -1 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 drop-shadow-xs overflow-visible">
      <defs>
        <linearGradient id="team-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="60%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="6" fill="url(#team-grad)" stroke="#7dd3fc" strokeWidth="0.8" />
      <path
        d="M7.5 12.5L10.5 15.5L16.5 9.5"
        stroke="#FCF6EE"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="6" r="1.5" fill="#facc15" />
    </svg>
  );
}

/**
 * 5. Enterprise Badge: Golden Shield with Imperial Crown (Static)
 */
function EnterpriseSeal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="-1 -1 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 drop-shadow-xs overflow-visible">
      <defs>
        <linearGradient id="ent-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path
        d="M12 2L4.5 5.5V11.5C4.5 16.3 7.7 20.8 12 22C16.3 20.8 19.5 16.3 19.5 11.5V5.5L12 2Z"
        fill="url(#ent-grad)"
        stroke="#fde047"
        strokeWidth="0.8"
      />
      {/* Crown emblem inside */}
      <path
        d="M7.5 15.5H16.5L17.5 10L14 12L12 8L10 12L6.5 10L7.5 15.5Z"
        fill="#FCF6EE"
      />
      <circle cx="12" cy="7.2" r="0.9" fill="#FCF6EE" />
    </svg>
  );
}

/**
 * 6. Lifetime Badge: Platinum Diamond with Infinity Emblem (Static)
 */
function LifetimeSeal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="-1 -1 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 drop-shadow-xs overflow-visible">
      <defs>
        <linearGradient id="life-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>
      {/* Diamond Cut Rosette */}
      <path
        d="M12 2L19.5 6L22 13.5L17 21L12 22.5L7 21L2 13.5L4.5 6L12 2Z"
        fill="url(#life-grad)"
        stroke="#bae6fd"
        strokeWidth="0.8"
      />
      {/* Infinity symbol */}
      <path
        d="M8.2 13.5C7.2 13.5 6.5 12.8 6.5 12C6.5 11.2 7.2 10.5 8.2 10.5C9.4 10.5 10.5 12 12 12C13.5 12 14.6 10.5 15.8 10.5C16.8 10.5 17.5 11.2 17.5 12C17.5 12.8 16.8 13.5 15.8 13.5C14.6 13.5 13.5 12 12 12C10.5 12 9.4 13.5 8.2 13.5Z"
        stroke="#FCF6EE"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 7. Founder Badge: Sunset Coral & Gold celestial star medallion (Static)
 */
function FounderSeal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="-1 -1 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 drop-shadow-xs overflow-visible">
      <defs>
        <linearGradient id="found-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="50%" stopColor="#EE8361" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#found-grad)" stroke="#ffedd5" strokeWidth="0.8" />
      {/* 5-pointed founder star */}
      <path
        d="M12 5.5L13.8 9.2L17.9 9.8L14.9 12.7L15.6 16.8L12 14.9L8.4 16.8L9.1 12.7L6.1 9.8L10.2 9.2L12 5.5Z"
        fill="#FCF6EE"
      />
    </svg>
  );
}

/**
 * 8. Royal Badge: Imperial Gold & Deep Petrol Crest with Faceted Crown (Static)
 */
function RoyalSeal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="-1 -1 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 drop-shadow-xs overflow-visible">
      <defs>
        <linearGradient id="roy-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#eab308" />
          <stop offset="70%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#713f12" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#roy-grad)" stroke="#fef9c3" strokeWidth="1" />
      <path
        d="M6.5 15.5H17.5L18.5 9.5L15 11.5L12 7.5L9 11.5L5.5 9.5L6.5 15.5Z"
        fill="#FCF6EE"
      />
      <circle cx="12" cy="6.8" r="1.1" fill="#2AC3BB" />
      <circle cx="6.5" cy="8.8" r="0.8" fill="#EE8361" />
      <circle cx="17.5" cy="8.8" r="0.8" fill="#EE8361" />
    </svg>
  );
}

/**
 * Master UserBadge Component:
 * 100% Static, crisp vector badges (no infinite animations, no bouncing, no spinning)
 */
export function UserBadge({
  tier,
  className = '',
  size = 'md',
  showTooltip = true,
  badgeColor = 'blue',
}: UserBadgeProps) {
  const px = size === 'sm' ? 17 : size === 'md' ? 21 : 26;
  const safeTier: SubscriptionTier = Object.prototype.hasOwnProperty.call(TIER_META, tier) ? tier : 'free';
  const meta = TIER_META[safeTier];

  if (safeTier === 'free') return null;

  const tooltip = showTooltip ? (
    <div
      className="
        absolute -top-8 left-1/2 -translate-x-1/2 z-50
        px-2 py-0.5 rounded-md text-xs font-bold text-white whitespace-nowrap
        pointer-events-none opacity-0 group-hover:opacity-100
        transition-opacity duration-150 shadow-md
      "
      style={{ background: 'rgba(7, 36, 36, 0.95)', border: '1px solid rgba(42, 195, 187, 0.3)' }}
    >
      {meta.labelAr}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#072424]" />
    </div>
  ) : null;

  return (
    <span
      className={`group relative inline-flex items-center justify-center align-middle shrink-0 flex-shrink-0 cursor-default select-none ${className}`}
      title={meta.labelAr}
    >
      {safeTier === 'verified' && <VerifiedSeal size={px} color={badgeColor} />}
      {safeTier === 'pro' && <ProSeal size={px} />}
      {safeTier === 'premium' && <PremiumSeal size={px} />}
      {safeTier === 'team' && <TeamSeal size={px} />}
      {safeTier === 'enterprise' && <EnterpriseSeal size={px} />}
      {safeTier === 'lifetime' && <LifetimeSeal size={px} />}
      {safeTier === 'founder' && <FounderSeal size={px} />}
      {safeTier === 'royal' && <RoyalSeal size={px} />}
      {tooltip}
    </span>
  );
}

export default UserBadge;
