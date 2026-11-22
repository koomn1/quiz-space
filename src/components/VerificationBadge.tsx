import React from 'react';

export interface VerificationBadgeData {
  id: string;
  name: string;
  nameAr: string;
  imageUrl: string;
  description?: string;
  descriptionAr?: string;
}

export function VerificationBadge({
  badge,
  size = 'sm',
  lang = 'ar',
  className = '',
  showLabel = true,
}: {
  badge?: VerificationBadgeData | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  lang?: 'ar' | 'en';
  className?: string;
  showLabel?: boolean;
}) {
  if (!badge?.imageUrl) return null;
  const dimensions = { xs: 14, sm: 18, md: 24, lg: 34 };
  const px = dimensions[size];
  const label = lang === 'ar' ? badge.nameAr : badge.name;
  const src = badge.imageUrl.startsWith('http') ? badge.imageUrl : `${import.meta.env.BASE_URL}${badge.imageUrl.replace(/^\//, '')}`;
  return (
    <span className={`group relative inline-flex shrink-0 align-middle ${className}`} title={showLabel ? label : undefined}>
      <img src={src} alt={showLabel ? label : ''} width={px} height={px} style={{ width: px, height: px, maxWidth: 'none' }} loading="lazy" decoding="async" className="shrink-0 object-contain drop-shadow-[0_1px_3px_rgba(14,165,233,0.4)]" />
      {showLabel && <span className="pointer-events-none absolute bottom-full start-1/2 z-50 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-[9px] font-bold text-white shadow-lg group-hover:block">{label}</span>}
    </span>
  );
}

export default VerificationBadge;
