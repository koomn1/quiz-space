import React from 'react';
import { ArrowUpRight, CheckCircle2, CircleDot, FileText, LoaderCircle, RefreshCw, TriangleAlert, X } from 'lucide-react';
import { ExtractionJob, listActiveExtractionJobs } from '../services/aiWorkerClient';

type ProcessingCenterBannerProps = {
  lang: 'ar' | 'en';
  enabled: boolean;
  onOpenCreator: () => void;
};

function jobLabel(job: ExtractionJob, lang: 'ar' | 'en'): string {
  if (job.status === 'processing') return lang === 'ar' ? 'جاري المعالجة' : 'Processing';
  if (job.status === 'pending') return lang === 'ar' ? 'في قائمة الانتظار' : 'Queued';
  return lang === 'ar' ? 'تحتاج متابعة' : 'Needs attention';
}

export default function ProcessingCenterBanner({ lang, enabled, onOpenCreator }: ProcessingCenterBannerProps) {
  const [jobs, setJobs] = React.useState<ExtractionJob[]>([]);
  const [dismissed, setDismissed] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);
  const isAr = lang === 'ar';

  const refresh = React.useCallback(async () => {
    if (!enabled) return;
    setIsRefreshing(true);
    try {
      const activeJobs = await listActiveExtractionJobs();
      setJobs(activeJobs.filter((job) => job.status === 'pending' || job.status === 'processing'));
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [enabled]);

  React.useEffect(() => {
    setDismissed(false);
    void refresh();
    if (!enabled) return undefined;
    const interval = window.setInterval(() => void refresh(), 15_000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, refresh]);

  if (!enabled || dismissed || jobs.length === 0) return null;

  const activeJob = jobs[0];
  const percentage = Math.min(100, Math.max(0, Number(activeJob.progressPercentage) || 0));
  const hasMultiple = jobs.length > 1;

  return (
    <section
      className="relative z-20 border-b border-violet-200/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-violet-900/60 dark:bg-slate-950/90 sm:px-6"
      dir={isAr ? 'rtl' : 'ltr'}
      aria-label={isAr ? 'مركز معالجة الملفات' : 'Document processing center'}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" aria-hidden="true">
            {activeJob.status === 'processing' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'مركز معالجة الملفات' : 'Processing center'}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-[10px] font-black text-violet-800 dark:bg-violet-500/15 dark:text-violet-200">
                <CircleDot className="h-3 w-3" aria-hidden="true" />
                {jobLabel(activeJob, lang)}
              </span>
              {hasMultiple && <span className="text-[10px] font-bold text-slate-500">{isAr ? `${jobs.length} مهام نشطة` : `${jobs.length} active jobs`}</span>}
            </div>
            <p className="mt-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
              {activeJob.progressMessage || (isAr ? 'تتم معالجة الملف في الخلفية ويمكنك متابعة استخدام المنصة.' : 'Your document is processing in the background. You can keep using QuizSpace.')}
            </p>
            <div className="mt-2 flex items-center gap-2" aria-live="polite">
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} aria-label={isAr ? `تقدم المعالجة ${percentage}%` : `Processing progress ${percentage}%`}>
                <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 transition-[width] duration-500" style={{ width: `${percentage}%` }} />
              </div>
              <span className="w-10 text-left text-[11px] font-black tabular-nums text-slate-700 dark:text-slate-200">{percentage}%</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {loadError && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300"><TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />{isAr ? 'تعذر التحديث' : 'Refresh failed'}</span>}
          <button type="button" onClick={() => void refresh()} disabled={isRefreshing} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" aria-label={isAr ? 'تحديث حالة المعالجة' : 'Refresh processing status'}>
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span className="hidden sm:inline">{isAr ? 'تحديث' : 'Refresh'}</span>
          </button>
          <button type="button" onClick={onOpenCreator} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-black text-white transition-colors hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400" aria-label={isAr ? 'فتح مركز إنشاء الاختبار' : 'Open quiz creator'}>
            {isAr ? 'فتح المهمة' : 'Open job'} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setDismissed(true)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:hover:bg-slate-800 dark:hover:text-white" aria-label={isAr ? 'إخفاء مركز المعالجة مؤقتًا' : 'Dismiss processing center temporarily'}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className="mx-auto mt-2 max-w-6xl text-[10px] font-semibold text-slate-500 dark:text-slate-400">
        <CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-500" aria-hidden="true" />
        {isAr ? 'التقدم محفوظ على الخادم؛ يمكنك مغادرة الصفحة والعودة لاحقًا.' : 'Progress is saved on the server; you can leave this page and return later.'}
      </p>
    </section>
  );
}
