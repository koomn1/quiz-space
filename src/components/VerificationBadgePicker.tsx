import React from 'react';
import { Check, LockKeyhole, X } from 'lucide-react';
import { showToast } from './Toast';
import { VerificationBadge, VerificationBadgeData } from './VerificationBadge';

export default function VerificationBadgePicker({
  badges,
  selectedId,
  isPremium,
  canSelect,
  lang,
  onSelect,
  onClose,
}: {
  badges: VerificationBadgeData[];
  selectedId?: string | null;
  isPremium: boolean;
  canSelect: boolean;
  lang: 'ar' | 'en';
  onSelect?: (id: string | null) => void;
  onClose?: () => void;
}) {
  const isAr = lang === 'ar';
  const legacyGallery: VerificationBadgeData[] = [
    { id: 'gallery-blue-check-3d', name: 'Blue Check 3D', nameAr: 'العلامة الزرقاء ثلاثية الأبعاد', imageUrl: '/verification-badges/blue-check-3d.png' },
    { id: 'gallery-verified-sky', name: 'Sky Verified', nameAr: 'التوثيق السماوي', imageUrl: '/verification-badges/verified-sky.png' },
    { id: 'gallery-verified-gold', name: 'Gold Verified', nameAr: 'التوثيق الذهبي', imageUrl: '/verification-badges/verified-gold.png' },
    { id: 'gallery-verified-violet', name: 'Violet Verified', nameAr: 'التوثيق البنفسجي', imageUrl: '/verification-badges/verified-violet.png' },
    { id: 'gallery-verified-ai', name: 'AI Verified', nameAr: 'توثيق الذكاء الاصطناعي', imageUrl: '/verification-badges/verified-ai.png' },
  ];
  const galleryBadges = badges.length > 0 ? badges : legacyGallery;
  const choose = (badge: VerificationBadgeData) => {
    if (!isPremium) {
      showToast('info', isAr ? 'علامات التوثيق متاحة للباقات المدفوعة فقط.' : 'Verification marks are available on paid plans only.');
      return;
    }
    if (canSelect) onSelect?.(badge.id);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={isAr ? 'علامات التوثيق' : 'Verification marks'}>
      <div className="w-full max-w-md rounded-3xl border border-sky-200/60 bg-white p-5 shadow-2xl dark:border-sky-900/60 dark:bg-slate-950" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><h3 className="text-base font-black text-slate-900 dark:text-white">{isAr ? 'علامات التوثيق' : 'Verification Marks'}</h3><p className="mt-1 text-[10px] font-bold text-slate-500">{isAr ? 'اضغط على العلامة لاختيارها' : 'Tap a mark to select it'}</p></div>
          {onClose && <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900" aria-label={isAr ? 'إغلاق' : 'Close'}><X className="h-5 w-5" /></button>}
        </div>
        <div className="rounded-[1.35rem] border border-violet-300/50 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-3 shadow-inner dark:border-violet-400/25 dark:from-violet-950/35 dark:via-slate-950 dark:to-sky-950/30">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-black text-violet-700 dark:text-violet-200">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_10px_currentColor]" />
            <span>{isAr ? 'مجموعة علامات التوثيق' : 'Verification badge collection'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {galleryBadges.map((badge) => {
              const active = selectedId === badge.id;
              const locked = !isPremium;
              const badgeCard = (
                <div className={`relative flex aspect-square items-center justify-center rounded-xl border p-2 transition ${active ? 'border-violet-400 bg-violet-500/15 ring-2 ring-violet-400/35' : 'border-slate-200/80 bg-white/70 hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900/60'}`}>
                  <VerificationBadge badge={badge} size="lg" lang={lang} showLabel={false} />
                  {active && <span className="absolute -end-1 -top-1 rounded-full bg-violet-600 p-1 text-white shadow-md"><Check className="h-3 w-3" /></span>}
                  {locked && <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/10"><LockKeyhole className="h-5 w-5 text-rose-500 drop-shadow-lg" /></span>}
                </div>
              );
              return (
                <button key={badge.id} type="button" onClick={() => choose(badge)} className="min-w-0 text-center transition hover:-translate-y-0.5" aria-label={locked ? (isAr ? 'مقيدة للباقات المدفوعة' : 'Paid plan only') : (isAr ? `اختيار ${badge.nameAr}` : `Select ${badge.name}`)}>
                  {badgeCard}
                  <span className={`mt-1 block truncate text-[8px] font-black ${active ? 'text-violet-700 dark:text-violet-200' : 'text-slate-600 dark:text-slate-300'}`}>{isAr ? badge.nameAr : badge.name}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-center text-[9px] font-bold leading-relaxed text-slate-500 dark:text-slate-400">
            {isAr ? 'كل العلامات داخل الإطار فعلية ويمكن اختيارها، ومنها التيك البنفسجي.' : 'Every badge in the frame is a real selectable badge, including the violet check.'}
          </p>
        </div>
        {canSelect && <button type="button" onClick={() => onSelect?.(null)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"><X className="h-4 w-4" />{isAr ? 'إزالة العلامة' : 'Remove mark'}</button>}
      </div>
    </div>
  );
}
