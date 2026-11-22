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
        <div className="grid grid-cols-3 gap-3">
          {badges.map((badge) => {
            const active = selectedId === badge.id;
            const locked = !isPremium;
            return (
              <button key={badge.id} type="button" onClick={() => choose(badge)} className={`relative flex aspect-square items-center justify-center rounded-2xl border transition ${active ? 'border-sky-400 bg-sky-500/10 ring-2 ring-sky-400/30' : 'border-slate-200 bg-slate-50 hover:border-sky-300 dark:border-slate-800 dark:bg-slate-900/60'} ${locked ? 'cursor-not-allowed opacity-45 grayscale' : 'hover:scale-105'}`} aria-label={locked ? (isAr ? 'مقيدة للباقات المدفوعة' : 'Paid plan only') : (isAr ? 'اختيار علامة التوثيق' : 'Select verification mark')}>
                <VerificationBadge badge={badge} size="lg" lang={lang} showLabel={false} />
                {active && <span className="absolute end-1 top-1 rounded-full bg-emerald-500 p-1 text-white"><Check className="h-3 w-3" /></span>}
                {locked && <span className="absolute inset-0 flex items-center justify-center"><LockKeyhole className="h-7 w-7 animate-[verification-shake_0.7s_ease-in-out_infinite] text-rose-500 drop-shadow-lg" /></span>}
              </button>
            );
          })}
        </div>
        {canSelect && <button type="button" onClick={() => onSelect?.(null)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"><X className="h-4 w-4" />{isAr ? 'إزالة العلامة' : 'Remove mark'}</button>}
      </div>
    </div>
  );
}
