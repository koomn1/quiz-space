import React from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import SwipeToast from './SwipeToast.jsx';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
  title?: string;
}

let pushToast: ((type: ToastType, text: string, title?: string) => void) | null = null;

/**
 * Use this shared API for non-blocking user feedback. The global host presents
 * every message with the same swipeable, timed notification UI.
 */
export function showToast(type: ToastType, text: string, title?: string) {
  if (pushToast) {
    pushToast(type, text, title);
  } else {
    // Keep failures visible during bootstrap rather than silently dropping them.
    console.warn('[Toast] ToastHost not mounted, message dropped:', text);
  }
}

/** Replace blocking alert() calls with the same non-blocking site notification. */
export function showAppMessage(message: unknown) {
  const text = typeof message === 'string' ? message : String(message ?? '');
  const lower = text.toLocaleLowerCase();
  const type: ToastType = /(error|failed|could not|unable|invalid|not found|expired|تعذر|فشل|خطأ|غير صالح|غير صحيح|لم يتم|لا يمكن)/i.test(lower)
    ? 'error'
    : /(success|successfully|saved|copied|deleted|approved|activated|تم بنجاح|تم الحفظ|تم حذف|تمت|تم تفعيل|نجاح)/i.test(lower)
      ? 'success'
      : 'info';
  showToast(type, text);
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-[18px] w-[18px] text-emerald-300" />,
  error: <XCircle className="h-[18px] w-[18px] text-rose-300" />,
  info: <Info className="h-[18px] w-[18px] text-sky-300" />,
};

const COLORS: Record<ToastType, { background: string; color: string; fuse: string }> = {
  success: { background: '#052e2b', color: '#ecfdf5', fuse: '#34d399' },
  error: { background: '#450a0a', color: '#fff1f2', fuse: '#fb7185' },
  info: { background: '#172554', color: '#eff6ff', fuse: '#60a5fa' },
};

const TITLES: Record<ToastType, { ar: string; en: string }> = {
  success: { ar: 'تم بنجاح', en: 'Success' },
  error: { ar: 'حدث خطأ', en: 'Something went wrong' },
  info: { ar: 'إشعار', en: 'Notice' },
};

/** Mount once near the app root. All showToast() calls are rendered here. */
export function ToastHost() {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);
  const idRef = React.useRef(0);

  React.useEffect(() => {
    pushToast = (type, text, title) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, type, text, title }].slice(-4));
    };
    return () => {
      pushToast = null;
    };
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="swipe-toast-stack" aria-label="Notifications">
      {toasts.map((toast) => {
        const isArabic = /[\u0600-\u06FF]/.test(`${toast.title ?? ''} ${toast.text}`);
        const colors = COLORS[toast.type];
        return (
          <div key={toast.id} className="swipe-toast-slot" dir={isArabic ? 'rtl' : 'ltr'}>
            <SwipeToast
              inline
              title={toast.title || TITLES[toast.type][isArabic ? 'ar' : 'en']}
              description={toast.text}
              icon={ICONS[toast.type]}
              background={colors.background}
              color={colors.color}
              fuseColor={colors.fuse}
              duration={5000}
              pauseOnHover
              closeButton
              onClose={() => dismiss(toast.id)}
              className={`swipe-toast--${toast.type}`}
              role={toast.type === 'error' ? 'alert' : 'status'}
              ariaLive={toast.type === 'error' ? 'assertive' : 'polite'}
              closeLabel={isArabic ? 'إغلاق الإشعار' : 'Dismiss notification'}
            />
          </div>
        );
      })}
    </div>
  );
}
