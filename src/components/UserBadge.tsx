import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { BADGE_COLOR_PRESETS, BadgeColorKey } from './PremiumNameTag';

gsap.registerPlugin(useGSAP);

export type SubscriptionTier = 'free' | 'verified' | 'pro' | 'premium' | 'team' | 'enterprise' | 'lifetime' | 'founder' | 'royal';

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
  verified:   { labelAr: 'موثّق',         labelEn: 'Verified' },
  pro:        { labelAr: 'برو',           labelEn: 'Pro' },
  premium:    { labelAr: 'بريميوم',       labelEn: 'Premium' },
  team:       { labelAr: 'فريق',          labelEn: 'Team' },
  enterprise: { labelAr: 'مؤسسات',       labelEn: 'Enterprise' },
  lifetime:   { labelAr: 'مدى الحياة',    labelEn: 'Lifetime' },
  founder:    { labelAr: 'مؤسس',          labelEn: 'Founder' },
  royal:      { labelAr: 'ملكي',          labelEn: 'Royal' },
};

// Icon used for the "pro" tier badge — confirm-svgrepo-com.svg
function ProIcon({ size }: { size: number }) {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, delay: 0.08, ease: 'back.out(2.5)' });
  }, { scope: ref });

  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 70 70" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M58.582,11.456c0.979,0,1.967,0.333,2.779,1.015c1.823,1.527,2.073,4.231,0.56,6.038l-30.5,36.383
        c-0.833,0.993-3.233,3.652-3.233,3.652s-2.053-2.032-3.191-3.309L8.394,39.479c-1.703-1.63-1.753-4.344-0.11-6.064
        c0.852-0.892,1.991-1.342,3.128-1.342c1.058,0,2.113,0.389,2.934,1.174l13.361,12.661l27.611-32.935
        C56.156,11.972,57.362,11.456,58.582,11.456z" />
    </svg>
  );
}

// Icon used for the "premium" tier badge — check-verified-svgrepo-com.svg
function PremiumIcon({ size }: { size: number }) {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, delay: 0.18, ease: 'back.out(2.5)' });
  }, { scope: ref });

  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.25203497,14 L4,14 C2.8954305,14 2,13.1045695 2,12 C2,10.8954305 2.8954305,10 4,10 L4.25203497,10 C4.44096432,9.26595802 4.73145639,8.57268879 5.10763818,7.9360653 L4.92893219,7.75735931 C4.1478836,6.97631073 4.1478836,5.70998077 4.92893219,4.92893219 C5.70998077,4.1478836 6.97631073,4.1478836 7.75735931,4.92893219 L7.9360653,5.10763818 C8.57268879,4.73145639 9.26595802,4.44096432 10,4.25203497 L10,4 C10,2.8954305 10.8954305,2 12,2 C13.1045695,2 14,2.8954305 14,4 L14,4.25203497 C14.734042,4.44096432 15.4273112,4.73145639 16.0639347,5.10763818 L16.2426407,4.92893219 C17.0236893,4.1478836 18.2900192,4.1478836 19.0710678,4.92893219 C19.8521164,5.70998077 19.8521164,6.97631073 19.0710678,7.75735931 L18.8923618,7.9360653 C19.2685436,8.57268879 19.5590357,9.26595802 19.747965,10 L20,10 C21.1045695,10 22,10.8954305 22,12 C22,13.1045695 21.1045695,14 20,14 L19.747965,14 C19.5590357,14.734042 19.2685436,15.4273112 18.8923618,16.0639347 L19.0710678,16.2426407 C19.8521164,17.0236893 19.8521164,18.2900192 19.0710678,19.0710678 C18.2900192,19.8521164 17.0236893,19.8521164 16.2426407,19.0710678 L16.0639347,18.8923618 C15.4273112,19.2685436 14.734042,19.5590357 14,19.747965 L14,20 C14,21.1045695 13.1045695,22 12,22 C10.8954305,22 10,21.1045695 10,20 L10,19.747965 C9.26595802,19.5590357 8.57268879,19.2685436 7.9360653,18.8923618 L7.75735931,19.0710678 C6.97631073,19.8521164 5.70998077,19.8521164 4.92893219,19.0710678 C4.1478836,18.2900192 4.1478836,17.0236893 4.92893219,16.2426407 L5.10763818,16.0639347 C4.73145639,15.4273112 4.44096432,14.734042 4.25203497,14 Z M9,10 L7,12 L11,16 L17,10 L15,8 L11,12 L9,10 Z" />
    </svg>
  );
}

// Icon used for the "team" tier badge — validate-svgrepo-com.svg
function TeamIcon({ size }: { size: number }) {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { scale: 0, rotation: -90, opacity: 0 },
      { scale: 1, rotation: 0, opacity: 1, duration: 0.45, delay: 0.05, ease: 'back.out(2)' });
  }, { scope: ref });

  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path stroke="white" strokeWidth="2" d="M20,15 C19,16 21.25,18.75 20,20 C18.75,21.25 16,19 15,20 C14,21 13.5,23 12,23 C10.5,23 10,21 9,20 C8,19 5.25,21.25 4,20 C2.75,18.75 5,16 4,15 C3,14 1,13.5 1,12 C1,10.5 3,10 4,9 C5,8 2.75,5.25 4,4 C5.25,2.75 8,5 9,4 C10,3 10.5,1 12,1 C13.5,1 14,3 15,4 C16,5 18.75,2.75 20,4 C21.25,5.25 19,8 20,9 C21,10 23,10.5 23,12 C23,13.5 21,14 20,15 Z M7,12 L10,15 L17,8" />
    </svg>
  );
}

// Icon used for the "enterprise" tier badge — crown-svgrepo-com.svg
function CrownIcon({ size }: { size: number }) {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { scale: 0, y: -10, opacity: 0 },
      { scale: 1, y: 0, opacity: 1, duration: 0.5, delay: 0.06, ease: 'back.out(1.7)' });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 });
    tl.to(ref.current, { y: -1.5, duration: 0.6, ease: 'sine.inOut' });
    tl.to(ref.current, { y: 0, duration: 0.6, ease: 'sine.inOut' });
  }, { scope: ref });

  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 70 70" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M60.093,60.583H10.244c-0.999,0-1.844-0.527-1.981-1.518l-4.91-35.291c-0.102-0.73,0.208-1.405,0.804-1.839
        c0.596-0.434,1.384-0.479,2.047-0.157l17.292,8.362l9.496-19.995c0.334-0.689,1.033-1.563,1.798-1.563h0.001
        c0.765,0,1.463,0.878,1.798,1.566l9.71,20.155l17.825-8.607c0.666-0.323,1.455-0.199,2.052,0.232
        c0.599,0.435,0.91,1.19,0.809,1.922l-4.909,35.202C61.937,60.041,61.091,60.583,60.093,60.583z M11.986,56.583h46.365l4.154-29.74
        l-16.249,8.05c-0.478,0.232-1.028,0.319-1.529,0.147c-0.502-0.173-0.915-0.512-1.147-0.989l-8.786-18.024l-8.571,17.662
        c-0.481,0.993-1.675,1.414-2.669,0.931L7.828,26.82L11.986,56.583z" />
    </svg>
  );
}

// Icon used for the "lifetime" tier badge — diamond-svgrepo-com.svg
function DiamondIcon({ size }: { size: number }) {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { scale: 0, rotation: -90, opacity: 0 },
      { scale: 1, rotation: 0, opacity: 1, duration: 0.45, delay: 0.05, ease: 'back.out(2)' });
    gsap.to(ref.current, {
      rotation: 360,
      duration: 8,
      repeat: -1,
      ease: 'none',
      transformOrigin: 'center center',
    });
  }, { scope: ref });

  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 70 70" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M67.142,23.641L55.405,10.456c-0.379-0.423-0.92-0.873-1.488-0.873h-37.98c-0.568,0-1.109,0.45-1.489,0.874L2.711,23.752
        c-0.691,0.771-0.68,1.94,0.025,2.697L33.462,59.46c0.378,0.407,0.909,0.638,1.464,0.638s1.086-0.257,1.464-0.664l30.728-33.042
        C67.822,25.634,67.833,24.411,67.142,23.641z M46.555,25.583L34.902,53.414L22.608,25.583H46.555z M21.725,23.583l-4.417-10h34.272
        l-4.188,10H21.725z M32.231,52.152L7.586,25.583h12.879L32.231,52.152z M48.702,25.583H62c0.094,0,0.179-0.029,0.265-0.054
        L37.462,52.318L48.702,25.583z M61.871,23.583H49.543l3.971-9.447L61.871,23.583z M15.714,14.851l3.867,8.732H8.027L15.714,14.851z" />
    </svg>
  );
}

// Icon used for the "founder" tier badge — verify-svgrepo-com.svg
function FounderIcon({ size }: { size: number }) {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { scale: 0, rotation: -60, opacity: 0 },
      { scale: 1, rotation: 0, opacity: 1, duration: 0.5, delay: 0.08, ease: 'back.out(2.5)' });
  }, { scope: ref });

  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path opacity="0.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M8.38086 12.0001L10.7909 14.4201L15.6209 9.58008" />
      <path stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M10.7509 2.44982C11.4409 1.85982 12.5709 1.85982 13.2709 2.44982L14.8509 3.80982C15.1509 4.06982 15.7109 4.27982 16.1109 4.27982H17.8109C18.8709 4.27982 19.7409 5.14982 19.7409 6.20982V7.90982C19.7409 8.29982 19.9509 8.86982 20.2109 9.16982L21.5709 10.7498C22.1609 11.4398 22.1609 12.5698 21.5709 13.2698L20.2109 14.8498C19.9509 15.1498 19.7409 15.7098 19.7409 16.1098V17.8098C19.7409 18.8698 18.8709 19.7398 17.8109 19.7398H16.1109C15.7209 19.7398 15.1509 19.9498 14.8509 20.2098L13.2709 21.5698C12.5809 22.1598 11.4509 22.1598 10.7509 21.5698L9.17086 20.2098C8.87086 19.9498 8.31086 19.7398 7.91086 19.7398H6.18086C5.12086 19.7398 4.25086 18.8698 4.25086 17.8098V16.0998C4.25086 15.7098 4.04086 15.1498 3.79086 14.8498L2.44086 13.2598C1.86086 12.5698 1.86086 11.4498 2.44086 10.7598L3.79086 9.16982C4.04086 8.86982 4.25086 8.30982 4.25086 7.91982V6.19982C4.25086 5.13982 5.12086 4.26982 6.18086 4.26982H7.91086C8.30086 4.26982 8.87086 4.05982 9.17086 3.79982L10.7509 2.44982Z" />
    </svg>
  );
}

// Icon used for the "verified" tier badge — a clean, minimal checkmark
// (the classic "verified identity" tick, distinct from the fancier
// pro/premium checks — this one is deliberately understated).
function VerifiedIcon({ size }: { size: number }) {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, delay: 0.05, ease: 'back.out(2.2)' });
  }, { scope: ref });

  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M7 12.5L10.2 15.7L17 8.5" />
    </svg>
  );
}

// Icon used for the "royal" tier badge — a jeweled crown, the most
// prestigious mark, sitting a notch above founder.
function RoyalIcon({ size }: { size: number }) {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { scale: 0, y: -8, opacity: 0 },
      { scale: 1, y: 0, opacity: 1, duration: 0.5, delay: 0.06, ease: 'back.out(2)' });
  }, { scope: ref });

  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M4 18H20M4.5 18L3 8L8 11.5L12 5L16 11.5L21 8L19.5 18" />
      <circle cx="12" cy="4" r="1.3" fill="white" />
    </svg>
  );
}

export function UserBadge({ tier, className = '', size = 'md', showTooltip = true, badgeColor = 'blue' }: UserBadgeProps) {
  const px = size === 'sm' ? 18 : size === 'md' ? 22 : 28;
  const iconPx = Math.round(px * 0.55);
  const meta = TIER_META[tier];
  const colors = BADGE_COLOR_PRESETS[badgeColor];

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

  if (tier === 'verified') return <VerifiedBadge px={px} iconPx={iconPx} tooltip={tooltip} className={className} />;
  if (tier === 'pro') return <ProBadge px={px} iconPx={iconPx} tooltip={tooltip} className={className} colors={colors} />;
  if (tier === 'premium') return <PremiumBadge px={px} iconPx={iconPx} tooltip={tooltip} className={className} colors={colors} />;
  if (tier === 'team') return <TeamBadge px={px} iconPx={iconPx} tooltip={tooltip} className={className} />;
  if (tier === 'enterprise') return <EnterpriseBadge px={px} iconPx={iconPx} tooltip={tooltip} className={className} />;
  if (tier === 'lifetime') return <LifetimeBadge px={px} iconPx={iconPx} tooltip={tooltip} className={className} />;
  if (tier === 'founder') return <FounderBadge px={px} iconPx={iconPx} tooltip={tooltip} className={className} />;
  if (tier === 'royal') return <RoyalBadge px={px} iconPx={iconPx} tooltip={tooltip} className={className} />;

  return null;
}

function BadgeWrapper({ children, className, px, tooltip }: {
  children: React.ReactNode;
  className: string;
  px: number;
  tooltip: React.ReactNode;
}) {
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!wrapperRef.current) return;
    gsap.fromTo(wrapperRef.current,
      { scale: 0, rotation: -15, opacity: 0 },
      { scale: 1, rotation: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)' }
    );
  }, { scope: wrapperRef });

  const { contextSafe } = useGSAP({ scope: wrapperRef });

  const onEnter = contextSafe(() => {
    gsap.to(wrapperRef.current, { scale: 1.15, duration: 0.2, ease: 'back.out(2)' });
  });

  const onLeave = contextSafe(() => {
    gsap.to(wrapperRef.current, { scale: 1, duration: 0.2, ease: 'power2.out' });
  });

  return (
    <span
      ref={wrapperRef}
      className={`relative group inline-flex items-center justify-center ${className}`}
      style={{ width: px, height: px }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {children}
      {tooltip}
    </span>
  );
}

function ProBadge({ px, iconPx, tooltip, className, colors }: { px: number; iconPx: number; tooltip: React.ReactNode; className: string; colors: { gradient: string; glowColor: string; ringColors?: string } }) {
  const glowRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!glowRef.current) return;
    gsap.to(glowRef.current, {
      boxShadow: `0 0 14px 3px ${colors.glowColor}`,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, { scope: glowRef, dependencies: [colors.glowColor] });

  return (
    <BadgeWrapper className={className} px={px} tooltip={tooltip}>
      <span ref={glowRef} className="absolute inset-0 rounded-full" />
      <span className="absolute inset-0 rounded-full" style={{ background: colors.gradient }} />
      <span className="absolute inset-0 rounded-full overflow-hidden">
        <span className="absolute top-0 left-0 right-0 h-1/2 rounded-t-full" style={{ background: 'rgba(255,255,255,0.22)' }} />
      </span>
      <span className="relative z-10"><ProIcon size={iconPx} /></span>
    </BadgeWrapper>
  );
}

function PremiumBadge({ px, iconPx, tooltip, className, colors }: { px: number; iconPx: number; tooltip: React.ReactNode; className: string; colors: { gradient: string; glowColor: string; ringColors?: string } }) {
  const ringRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!ringRef.current) return;
    gsap.to(ringRef.current, {
      rotation: 360,
      duration: 4,
      repeat: -1,
      ease: 'none',
    });
  }, { scope: ringRef });

  return (
    <BadgeWrapper className={className} px={px} tooltip={tooltip}>
      <span ref={ringRef} className="absolute inset-[-3px] rounded-full opacity-80"
        style={{ background: colors.ringColors || colors.gradient }} />
      <span className="absolute inset-0 rounded-full" style={{ background: colors.gradient }} />
      <span className="absolute inset-0 rounded-full overflow-hidden">
        <span className="absolute top-0 left-0 right-0 h-1/2 rounded-t-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
      </span>
      <span className="relative z-10"><PremiumIcon size={iconPx} /></span>
    </BadgeWrapper>
  );
}

function TeamBadge({ px, iconPx, tooltip, className }: { px: number; iconPx: number; tooltip: React.ReactNode; className: string }) {
  const glowRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!glowRef.current) return;
    gsap.to(glowRef.current, {
      boxShadow: '0 0 16px 5px rgba(6,182,212,0.6)',
      duration: 1.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, { scope: glowRef });

  return (
    <BadgeWrapper className={className} px={px} tooltip={tooltip}>
      <span ref={glowRef} className="absolute inset-0 rounded-full"
        style={{ borderRadius: '30%' }} />
      <span className="absolute inset-0 rotate-45 rounded-[20%]"
        style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)' }} />
      <span className="absolute inset-0 rotate-45 rounded-[20%] overflow-hidden">
        <span className="absolute top-0 left-0 right-0 h-1/2"
          style={{ background: 'rgba(255,255,255,0.2)' }} />
      </span>
      <span className="relative z-10">
        <TeamIcon size={iconPx} />
      </span>
    </BadgeWrapper>
  );
}

function EnterpriseBadge({ px, iconPx, tooltip, className }: { px: number; iconPx: number; tooltip: React.ReactNode; className: string }) {
  const ring1Ref = useRef<HTMLSpanElement>(null);
  const ring2Ref = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (ring1Ref.current) {
      gsap.to(ring1Ref.current, { rotation: 360, duration: 3, repeat: -1, ease: 'none' });
    }
    if (ring2Ref.current) {
      gsap.to(ring2Ref.current, { rotation: -360, duration: 3, repeat: -1, ease: 'none' });
    }
  }, { scope: ring1Ref });

  return (
    <BadgeWrapper className={className} px={px} tooltip={tooltip}>
      <span ref={ring1Ref} className="absolute inset-[-3px] rounded-full"
        style={{ background: 'conic-gradient(from 0deg, #fbbf24, #f59e0b, #fef3c7, #f59e0b, #fbbf24)', opacity: 0.9 }} />
      <span ref={ring2Ref} className="absolute inset-[-3px] rounded-full"
        style={{ background: 'conic-gradient(from 180deg, #fcd34d, #d97706, #fde68a, #d97706, #fcd34d)', opacity: 0.5 }} />
      <span className="absolute inset-0 rounded-full"
        style={{ background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(251,191,36,0.4)' }} />
      <span className="absolute inset-0 rounded-full overflow-hidden">
        <span className="absolute top-0 left-0 right-0 h-1/2 rounded-t-full"
          style={{ background: 'rgba(251,191,36,0.1)' }} />
      </span>
      <span className="relative z-10" style={{ filter: 'drop-shadow(0 0 5px rgba(251,191,36,0.8))' }}>
        <CrownIcon size={iconPx} />
      </span>
    </BadgeWrapper>
  );
}

function LifetimeBadge({ px, iconPx, tooltip, className }: { px: number; iconPx: number; tooltip: React.ReactNode; className: string }) {
  const shineRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!shineRef.current) return;
    gsap.set(shineRef.current, { xPercent: -120 });
    gsap.to(shineRef.current, {
      xPercent: 120,
      duration: 2.2,
      repeat: -1,
      ease: 'power1.inOut',
      repeatDelay: 1,
    });
  }, { scope: shineRef });

  return (
    <BadgeWrapper className={className} px={px} tooltip={tooltip}>
      <span className="absolute inset-0 rounded-[28%] overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 35%, #fbbf24 65%, #d97706 100%)', backgroundSize: '200% auto' }} />
      <span ref={shineRef} className="absolute inset-0 rounded-[28%] overflow-hidden pointer-events-none"
        style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.7) 50%, transparent 70%)' }} />
      <span className="relative z-10" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}>
        <DiamondIcon size={iconPx} />
      </span>
    </BadgeWrapper>
  );
}

function FounderBadge({ px, iconPx, tooltip, className }: { px: number; iconPx: number; tooltip: React.ReactNode; className: string }) {
  const haloRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!haloRef.current) return;
    gsap.to(haloRef.current, {
      rotation: 360,
      duration: 3,
      repeat: -1,
      ease: 'none',
    });
  }, { scope: haloRef });

  return (
    <BadgeWrapper className={className} px={px} tooltip={tooltip}>
      <span ref={haloRef} className="absolute inset-[-6px] rounded-full opacity-75"
        style={{ background: 'conic-gradient(from 0deg, #f43f5e,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6,#ec4899,#f43f5e)', filter: 'blur(7px)' }} />
      <span className="absolute inset-0 rounded-full"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 100%)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.5)' }} />
      <span className="relative z-10" style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.9))' }}>
        <FounderIcon size={iconPx} />
      </span>
    </BadgeWrapper>
  );
}

// Clean, understated "verified identity" badge — a plain checkmark on a
// flat blue circle, deliberately simpler than pro/premium since it marks
// authenticity rather than subscription tier.
function VerifiedBadge({ px, iconPx, tooltip, className }: { px: number; iconPx: number; tooltip: React.ReactNode; className: string }) {
  const glowRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!glowRef.current) return;
    gsap.to(glowRef.current, {
      boxShadow: '0 0 10px 2px rgba(29,155,240,0.55)',
      duration: 1.6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, { scope: glowRef });

  return (
    <BadgeWrapper className={className} px={px} tooltip={tooltip}>
      <span ref={glowRef} className="absolute inset-0 rounded-full" />
      <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(145deg, #1d9bf0 0%, #0e7fd4 100%)' }} />
      <span className="relative z-10"><VerifiedIcon size={iconPx} /></span>
    </BadgeWrapper>
  );
}

// The most prestigious badge — a jeweled crown with a slow shimmering
// double halo, sitting a notch above founder.
function RoyalBadge({ px, iconPx, tooltip, className }: { px: number; iconPx: number; tooltip: React.ReactNode; className: string }) {
  const ring1Ref = useRef<HTMLSpanElement>(null);
  const ring2Ref = useRef<HTMLSpanElement>(null);
  const shineRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (ring1Ref.current) gsap.to(ring1Ref.current, { rotation: 360, duration: 5, repeat: -1, ease: 'none' });
    if (ring2Ref.current) gsap.to(ring2Ref.current, { rotation: -360, duration: 5, repeat: -1, ease: 'none' });
    if (shineRef.current) {
      gsap.set(shineRef.current, { xPercent: -120 });
      gsap.to(shineRef.current, { xPercent: 120, duration: 2.4, repeat: -1, ease: 'power1.inOut', repeatDelay: 0.8 });
    }
  }, { scope: ring1Ref });

  return (
    <BadgeWrapper className={className} px={px} tooltip={tooltip}>
      <span ref={ring1Ref} className="absolute inset-[-4px] rounded-full opacity-90"
        style={{ background: 'conic-gradient(from 0deg, #c4b5fd, #f0abfc, #818cf8, #a5f3fc, #c4b5fd)', filter: 'blur(3px)' }} />
      <span ref={ring2Ref} className="absolute inset-[-2px] rounded-full opacity-60"
        style={{ background: 'conic-gradient(from 180deg, #fde68a, #f0abfc, #a5f3fc, #fde68a)' }} />
      <span className="absolute inset-0 rounded-full overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #4c1d95 0%, #1e1b4b 100%)', border: '1px solid rgba(240,171,252,0.5)' }}>
        <span ref={shineRef} className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)' }} />
      </span>
      <span className="relative z-10" style={{ filter: 'drop-shadow(0 0 5px rgba(240,171,252,0.9))' }}>
        <RoyalIcon size={iconPx} />
      </span>
    </BadgeWrapper>
  );
}
