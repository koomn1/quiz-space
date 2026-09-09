import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
import {
  activateQuizSpaceServiceWorkerUpdate,
  precacheQuizSpaceProfileAssets,
  registerQuizSpaceServiceWorker,
} from '../lib/serviceWorker';

export function ServiceWorkerUpdatePrompt() {
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

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

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsInstalled(standalone);
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setIsInstalled(true);
    setInstallEvent(null);
  };

  const applyUpdate = () => {
    if (!updateRegistration || !activateQuizSpaceServiceWorkerUpdate(updateRegistration)) return;
    setIsRefreshing(true);
    window.setTimeout(() => window.location.reload(), 5_000);
  };

  if (!updateRegistration && isOnline) return null;

  return (
    <>
      {installEvent && !isInstalled && (
        <aside aria-live="polite" className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[100] mx-auto max-w-md rounded-2xl border border-violet-300/30 bg-slate-950/95 p-4 text-right text-sm text-slate-100 shadow-2xl backdrop-blur-xl" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-lg">⌂</div>
            <div className="min-w-0 flex-1"><p className="font-black text-violet-100">ثبّت QuizSpace على جهازك</p><p className="mt-1 text-xs leading-5 text-slate-300">وصول أسرع وتجربة كاملة حتى عند ضعف الإنترنت.</p></div>
            <button type="button" onClick={() => void installApp()} className="min-h-10 shrink-0 rounded-xl bg-violet-400 px-3 text-xs font-black text-slate-950 transition-transform active:scale-[0.97]">تثبيت</button>
          </div>
        </aside>
      )}
      {!isOnline && (
        <aside aria-live="polite" className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[100] mx-auto max-w-md rounded-2xl border border-amber-300/30 bg-slate-950/95 p-4 text-right text-sm text-slate-100 shadow-2xl backdrop-blur-xl" dir="rtl">
          <p className="font-black text-amber-200">أنت تعمل الآن دون اتصال</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">يمكنك متابعة الصفحات والمواد التي سبق فتحها. ستتم مزامنة الإجراءات عند عودة الإنترنت.</p>
        </aside>
      )}
      {updateRegistration && (
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
      )}
    </>
  );
}
