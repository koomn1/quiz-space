import React from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
}

let pushToast: ((type: ToastType, text: string) => void) | null = null;

/**
 * Call this anywhere in the app instead of window.alert(...):
 *   showToast('success', 'تم الحفظ بنجاح');
 *   showToast('error', 'حدث خطأ أثناء الحفظ');
 * Requires <ToastHost /> to be mounted once near the root of the app
 * (e.g. in App.tsx), otherwise calls are silently ignored.
 */
export function showToast(type: ToastType, text: string) {
  if (pushToast) {
    pushToast(type, text);
  } else {
    // Fallback so nothing is silently lost if ToastHost isn't mounted yet.
    console.warn('[Toast] ToastHost not mounted, message dropped:', text);
  }
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300 shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-700 dark:text-red-300 shrink-0" />,
  info: <Info className="w-5 h-5 text-sky-700 dark:text-sky-300 shrink-0" />,
};

const BORDER: Record<ToastType, string> = {
  success: 'border-emerald-500/40',
  error: 'border-red-500/40',
  info: 'border-sky-500/40',
};

/**
 * Mount this once near the root of the app (e.g. inside App.tsx, alongside
 * other top-level providers). It renders nothing until showToast() is called.
 */
export function ToastHost() {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);
  const idRef = React.useRef(0);

  React.useEffect(() => {
    pushToast = (type: ToastType, text: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, type, text }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    };
    return () => {
      pushToast = null;
    };
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top)+1rem)] inset-x-0 z-[999] flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.type === 'error' ? 'alert' : 'status'}
          aria-live={t.type === 'error' ? 'assertive' : 'polite'}
          className={`uipro-glass-surface pointer-events-auto w-full max-w-sm flex items-center gap-2.5 px-4 py-3 rounded-xl border ${BORDER[t.type]} text-[var(--lg-text)] text-sm font-bold shadow-xl backdrop-blur-2xl animate-[toast-in_0.2s_ease-out]`}
        >
          {ICONS[t.type]}
          <span className="flex-1 leading-snug">{t.text}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-primary/10 hover:text-primary dark:text-slate-300 dark:hover:text-white transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
