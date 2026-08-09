import React from 'react';
import { ArrowLeft, ArrowRight, Home, Sparkles } from 'lucide-react';

interface NotFoundProps {
  lang?: 'ar' | 'en';
  onGoHome?: () => void;
}

export default function NotFound({ lang = 'ar', onGoHome }: NotFoundProps) {
  const isAr = lang === 'ar';

  const handleHome = () => {
    if (onGoHome) {
      onGoHome();
      return;
    }
    window.location.assign(import.meta.env.BASE_URL || '/');
  };

  return (
    <main
      dir={isAr ? 'rtl' : 'ltr'}
      className="flex min-h-full w-full flex-1 items-center justify-center bg-slate-50 px-4 py-12 text-slate-950 transition-colors duration-300 dark:bg-[#020617] dark:text-white sm:px-6 sm:py-16"
    >
      <section className="flex w-full max-w-5xl flex-col items-center text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold tracking-wide text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[.04] dark:text-slate-300">
          <Sparkles className="h-4 w-4 text-cyan-500" />
          <span dir="ltr">404</span>
          <span>· {isAr ? 'خطأ في المسار' : 'ROUTE ERROR'}</span>
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-4" aria-label="404">
          <span className="nf-number-card">4</span>
          <span className="nf-number-card nf-zero-card" aria-label="error zero">
            <span className="nf-zero-orb" aria-hidden="true" />
            <span className="relative z-10">0</span>
          </span>
          <span className="nf-number-card">4</span>
        </div>

        <div className="mt-7 flex items-center justify-center gap-3" dir="ltr" aria-label="ERROR">
          <span className="h-px w-10 bg-red-500/70 sm:w-16" />
          <span className="nf-error-label">ERROR</span>
          <span className="h-px w-10 bg-red-500/70 sm:w-16" />
        </div>

        <h1 className="mt-10 max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-6xl">
          {isAr ? 'الصفحة خرجت من المسار' : 'This page left the route'}
        </h1>
        <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
          {isAr
            ? 'الرابط الذي وصلت إليه غير موجود، لكن رحلتك داخل QuizSpace لم تنتهِ. ارجع إلى المسار الرئيسي واستكشف شيئًا جديدًا.'
            : 'The link you followed does not exist, but your QuizSpace journey is not over. Return home and discover something new.'}
        </p>

        <div className="mt-9 flex w-full flex-col-reverse items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-extrabold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 dark:border-white/15 dark:bg-white/[.04] dark:text-slate-200 dark:hover:bg-white/[.09] sm:w-auto"
          >
            {isAr ? 'العودة خطوة' : 'Go back'}
          </button>
          <button
            type="button"
            onClick={handleHome}
            className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-7 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-50 sm:w-auto"
          >
            <Home className="h-4 w-4" />
            {isAr ? 'العودة للرئيسية' : 'Return home'}
            {isAr ? <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> : <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
          </button>
        </div>
      </section>
    </main>
  );
}
