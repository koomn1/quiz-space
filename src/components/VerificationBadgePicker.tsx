import React from 'react';
import { Check, LockKeyhole, X } from 'lucide-react';
import { showToast } from './Toast';
import { VerificationBadge, VerificationBadgeData } from './VerificationBadge';
import { UserBadge } from './UserBadge';

/**
 * Telegram-Premium-style mark picker.
 *
 * Render it INSIDE a `relative` wrapper that also contains the badge button;
 * it opens as a small floating panel beside the badge (below it on narrow
 * screens) instead of a full-screen modal. The panel offers the purple check
 * plus every image badge from the catalog, and "remove".
 */
export type ProfileMarkChoice = { tier: 'none' | 'premium'; badgeId: string | null };

export default function VerificationBadgePicker({
  badges,
  selectedId,
  selectedTier = 'none',
  isPremium,
  canSelect,
  lang,
  onSelect,
  onClose,
}: {
  badges: VerificationBadgeData[];
  selectedId?: string | null;
  selectedTier?: string;
  isPremium: boolean;
  canSelect: boolean;
  lang: 'ar' | 'en';
  onSelect?: (choice: ProfileMarkChoice) => void;
  onClose?: () => void;
}) {
  const isAr = lang === 'ar';
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      // Clicks anywhere inside the wrapper (panel OR the badge button that
      // toggles it) are not "outside".
      const wrapper = rootRef.current?.parentElement;
      if (wrapper && !wrapper.contains(event.target as Node)) onClose?.();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const choose = (choice: ProfileMarkChoice) => {
    if (!isPremium) {
      showToast('info', isAr ? 'علامات التوثيق متاحة للباقات المدفوعة فقط.' : 'Verification marks are available on paid plans only.');
      return;
    }
    if (canSelect) onSelect?.(choice);
  };

  const noImageSelected = !selectedId;
  const purpleActive = noImageSelected && selectedTier === 'premium';

  const cardClass = (active: boolean) =>
    `relative flex h-14 w-full items-center justify-center rounded-xl border transition ${
      active
        ? 'border-violet-400 bg-violet-500/15 ring-2 ring-violet-400/35'
        : 'border-slate-200/80 bg-white/70 hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900/60'
    }`;

  const activeCheck = (
    <span className="absolute -end-1 -top-1 rounded-full bg-violet-600 p-0.5 text-white shadow-md"><Check className="h-3 w-3" /></span>
  );
  const lockOverlay = !isPremium && (
    <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/20">
      <LockKeyhole className="h-4 w-4 text-rose-500 drop-shadow-lg" />
    </span>
  );

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={isAr ? 'علامات التوثيق' : 'Verification marks'}
      dir={isAr ? 'rtl' : 'ltr'}
      className="absolute start-0 top-full z-[100] mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-violet-300/50 bg-white p-3 text-start shadow-2xl dark:border-violet-400/25 dark:bg-slate-950 sm:start-full sm:top-1/2 sm:ms-3 sm:mt-0 sm:-translate-y-1/2"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-black text-slate-900 dark:text-white">{isAr ? 'علامات التوثيق' : 'Verification Marks'}</h3>
          <p className="mt-0.5 text-[10px] font-bold text-slate-500">{isAr ? 'اضغط على العلامة لاختيارها' : 'Tap a mark to select it'}</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900" aria-label={isAr ? 'إغلاق' : 'Close'}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => choose({ tier: 'premium', badgeId: null })}
          className="min-w-0 text-center transition hover:-translate-y-0.5"
          aria-label={isAr ? 'اختيار التيك البنفسجي' : 'Select the purple check'}
        >
          <div className={cardClass(purpleActive)}>
            <UserBadge tier="premium" size="lg" showTooltip={false} badgeColor="purple" />
            {purpleActive && activeCheck}
            {lockOverlay}
          </div>
        </button>

        {badges.map((badge) => {
          const active = selectedId === badge.id;
          return (
            <button
              key={badge.id}
              type="button"
              onClick={() => choose({ tier: 'none', badgeId: badge.id })}
              className="min-w-0 text-center transition hover:-translate-y-0.5"
              aria-label={isPremium ? (isAr ? `اختيار ${badge.nameAr}` : `Select ${badge.name}`) : (isAr ? 'مقيدة للباقات المدفوعة' : 'Paid plan only')}
            >
              <div className={cardClass(active)}>
                <VerificationBadge badge={badge} size="lg" lang={lang} showLabel={false} />
                {active && activeCheck}
                {lockOverlay}
              </div>
            </button>
          );
        })}
      </div>

      {badges.length === 0 && (
        <p className="mt-2 text-center text-[10px] font-bold text-slate-500">
          {isAr ? 'تعذر تحميل بقية العلامات حالياً.' : 'Other marks could not be loaded right now.'}
        </p>
      )}

      {canSelect && (
        <button
          type="button"
          onClick={() => choose({ tier: 'none', badgeId: null })}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          <X className="h-3.5 w-3.5" />
          {isAr ? 'إزالة العلامة' : 'Remove mark'}
        </button>
      )}
    </div>
  );
}
