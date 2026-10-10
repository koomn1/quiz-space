import React from 'react';
import { LoaderCircle } from 'lucide-react';

type PageSkeletonProps = {
  lang?: 'ar' | 'en';
  variant?: 'page' | 'catalog';
};

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton-shimmer rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 ${className}`} />;
}

export function QuizCatalogSkeleton({ lang = 'ar' }: { lang?: 'ar' | 'en' }) {
  const isAr = lang === 'ar';
  return (
    <section aria-busy="true" aria-live="polite" className="space-y-5" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2"><SkeletonBlock className="h-7 w-44" /><SkeletonBlock className="h-3 w-64 max-w-[65vw]" /></div>
        <SkeletonBlock className="h-11 w-24" />
      </div>
      <SkeletonBlock className="h-12 w-full rounded-2xl" />
      <div className="flex gap-2 overflow-hidden"><SkeletonBlock className="h-8 w-20 shrink-0 rounded-full" /><SkeletonBlock className="h-8 w-24 shrink-0 rounded-full" /><SkeletonBlock className="h-8 w-28 shrink-0 rounded-full" /><SkeletonBlock className="h-8 w-20 shrink-0 rounded-full" /></div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => <article key={item} className="overflow-hidden rounded-[1.7rem] border border-slate-200/80 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"><SkeletonBlock className="h-36 w-full rounded-2xl" /><div className="space-y-3 p-2 pt-4"><SkeletonBlock className="h-5 w-4/5" /><SkeletonBlock className="h-3 w-full" /><SkeletonBlock className="h-3 w-2/3" /><div className="flex items-center justify-between pt-2"><SkeletonBlock className="h-9 w-20" /><SkeletonBlock className="h-8 w-8 rounded-full" /></div></div></article>)}
      </div>
      <div className="flex items-center justify-center gap-2 pt-2 text-xs font-bold text-slate-500 dark:text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin text-violet-500" aria-hidden="true" />{isAr ? 'نجهّز الاختبارات لك…' : 'Preparing your quizzes…'}</div>
    </section>
  );
}

export default function PageSkeleton({ lang = 'ar', variant = 'page' }: PageSkeletonProps) {
  const isAr = lang === 'ar';
  if (variant === 'catalog') return <QuizCatalogSkeleton lang={lang} />;
  return (
    <section aria-busy="true" aria-live="polite" className="mx-auto flex min-h-[54vh] w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between gap-4"><div className="space-y-3"><SkeletonBlock className="h-8 w-52" /><SkeletonBlock className="h-4 w-72 max-w-[60vw]" /></div><SkeletonBlock className="h-11 w-11 rounded-xl" /></div>
      <div className="grid gap-5 md:grid-cols-3"><SkeletonBlock className="h-28" /><SkeletonBlock className="h-28" /><SkeletonBlock className="h-28" /></div>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><SkeletonBlock className="h-72" /><SkeletonBlock className="h-72" /></div>
      <div className="flex items-center justify-center gap-2 pt-2 text-xs font-bold text-slate-500 dark:text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin text-violet-500" aria-hidden="true" />{isAr ? 'جارٍ تجهيز الصفحة…' : 'Preparing the page…'}</div>
    </section>
  );
}
