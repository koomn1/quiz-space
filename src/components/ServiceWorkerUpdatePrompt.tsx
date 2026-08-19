import { useEffect, useState } from 'react';
import {
  activateQuizSpaceServiceWorkerUpdate,
  precacheQuizSpaceProfileAssets,
  registerQuizSpaceServiceWorker,
} from '../lib/serviceWorker';

export function ServiceWorkerUpdatePrompt() {
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const onControllerChange = () => window.location.reload();
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);

    void registerQuizSpaceServiceWorker({
      onUpdateReady: (registration) => {
        if (isMounted) setUpdateRegistration(registration);
      },
    }).then((registration) => {
      if (registration) void precacheQuizSpaceProfileAssets(registration);
    });

    return () => {
      isMounted = false;
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    if (!updateRegistration || !activateQuizSpaceServiceWorkerUpdate(updateRegistration)) return;
    setIsRefreshing(true);
    window.setTimeout(() => window.location.reload(), 5_000);
  };

  if (!updateRegistration) return null;

  return (
    <aside
      aria-live="polite"
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-cyan-300/30 bg-slate-950/95 p-3 text-right text-sm text-slate-100 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:right-5 sm:bottom-5"
      dir="rtl"
    >
      <div className="min-w-0 flex-1">
        <p className="font-bold text-white">يتوفر إصدار أحدث من QuizSpace</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-300">حدّث الصفحة الآن لتظهر التحسينات الجديدة بأمان.</p>
      </div>
      <button
        type="button"
        onClick={applyUpdate}
        disabled={isRefreshing}
        className="min-h-11 shrink-0 rounded-xl bg-cyan-400 px-4 font-bold text-slate-950 transition-transform duration-150 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
      >
        {isRefreshing ? 'جارٍ التحديث' : 'تحديث الآن'}
      </button>
      <button
        type="button"
        onClick={() => setUpdateRegistration(null)}
        className="min-h-11 shrink-0 rounded-xl px-2 text-slate-300 transition-colors hover:text-white"
        aria-label="تأجيل تحديث التطبيق"
      >
        لاحقاً
      </button>
    </aside>
  );
}
