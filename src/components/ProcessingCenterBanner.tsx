import React from 'react';
import { AlertTriangle, CheckCircle2, CircleDot, FileText, LoaderCircle, Pause, Play, RefreshCw, RotateCcw, X } from 'lucide-react';
import { controlExtractionJob, ExtractionJob, ExtractionJobControl, listActiveExtractionJobs } from '../services/aiWorkerClient';

type ProcessingCenterBannerProps = { lang: 'ar' | 'en'; enabled: boolean; onOpenCreator: () => void };

const statusText = (status: ExtractionJob['status'], ar: boolean) => ({
  pending: ar ? 'في الانتظار' : 'Queued', processing: ar ? 'جاري المعالجة' : 'Processing', paused: ar ? 'متوقفة مؤقتًا' : 'Paused',
  error: ar ? 'تحتاج إلى إجراء' : 'Needs attention', complete: ar ? 'اكتملت' : 'Complete', cancelled: ar ? 'أُلغيت' : 'Cancelled',
}[status]);

export default function ProcessingCenterBanner({ lang, enabled, onOpenCreator }: ProcessingCenterBannerProps) {
  const [jobs, setJobs] = React.useState<ExtractionJob[]>([]);
  const [dismissed, setDismissed] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const ar = lang === 'ar';

  const refresh = React.useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await listActiveExtractionJobs();
      setJobs(result.filter((job) => !['complete', 'cancelled'].includes(job.status)));
      setLoadError(false);
    } catch { setLoadError(true); }
  }, [enabled]);

  React.useEffect(() => {
    setDismissed(false);
    void refresh();
    if (!enabled) return undefined;
    const id = window.setInterval(() => void refresh(), 15_000);
    const focus = () => void refresh();
    window.addEventListener('focus', focus);
    return () => { window.clearInterval(id); window.removeEventListener('focus', focus); };
  }, [enabled, refresh]);

  const act = async (job: ExtractionJob, control: ExtractionJobControl) => {
    setBusy(`${job.id}:${control}`);
    try {
      const updated = await controlExtractionJob(job.id, control);
      setJobs((current) => current.map((item) => item.id === updated.id ? updated : item).filter((item) => !['complete', 'cancelled'].includes(item.status)));
      if (control === 'cancel') await refresh();
    } catch { setLoadError(true); } finally { setBusy(null); }
  };

  if (!enabled || dismissed || jobs.length === 0) return null;
  const job = jobs[0];
  const percentage = Math.min(100, Math.max(0, Number(job.progressPercentage) || 0));
  const isBusy = (control: ExtractionJobControl) => busy === `${job.id}:${control}`;
  const canPause = job.status === 'pending' || job.status === 'processing';
  const canResume = job.status === 'paused' || job.status === 'error';
  const questions = job.extractedQuestions || 0;

  return (
    <section className="relative z-20 border-b border-violet-200/70 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-violet-900/60 dark:bg-slate-950/95 sm:px-6" dir={ar ? 'rtl' : 'ltr'} aria-label={ar ? 'مركز معالجة الملفات' : 'Document processing center'}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" aria-hidden="true">
              {job.status === 'processing' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : job.status === 'error' ? <AlertTriangle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black text-slate-900 dark:text-white">{ar ? 'مركز معالجة الملفات' : 'Processing center'}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-[10px] font-black text-violet-800 dark:bg-violet-500/15 dark:text-violet-200"><CircleDot className="h-3 w-3" aria-hidden="true" />{statusText(job.status, ar)}</span>
                {jobs.length > 1 && <span className="text-[10px] font-bold text-slate-500">{ar ? `${jobs.length} مهام` : `${jobs.length} jobs`}</span>}
              </div>
              <p className="mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-200">{job.sourceFileName || (ar ? 'ملف مرفوع' : 'Uploaded document')}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{job.progressMessage || (ar ? 'تتم المعالجة في الخلفية.' : 'Processing in the background.')}</p>
              <div className="mt-2 flex items-center gap-2" aria-live="polite">
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} aria-label={ar ? `تقدم المعالجة ${percentage}%` : `Processing progress ${percentage}%`}><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 transition-[width] duration-500" style={{ width: `${percentage}%` }} /></div>
                <span className="w-10 text-left text-[11px] font-black tabular-nums text-slate-700 dark:text-slate-200">{percentage}%</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span>{ar ? `الأجزاء: ${job.processedChunks}/${job.totalChunks || '?'}` : `Chunks: ${job.processedChunks}/${job.totalChunks || '?'}`}</span>
                <span>{ar ? `أسئلة مستخرجة: ${questions}` : `Extracted: ${questions}`}</span>
                <span>{ar ? `تحتاج مراجعة: ${job.reviewRequiredQuestions || 0}` : `Review: ${job.reviewRequiredQuestions || 0}`}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:max-w-[430px] lg:justify-end">
            {canPause && <button type="button" onClick={() => void act(job, 'pause')} disabled={Boolean(busy)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-amber-200 px-3 text-xs font-black text-amber-800 transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/30"><Pause className="h-3.5 w-3.5" aria-hidden="true" />{isBusy('pause') ? (ar ? 'جارٍ...' : 'Working...') : (ar ? 'إيقاف' : 'Pause')}</button>}
            {canResume && <button type="button" onClick={() => void act(job, 'resume')} disabled={Boolean(busy)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"><Play className="h-3.5 w-3.5" aria-hidden="true" />{isBusy('resume') ? (ar ? 'جارٍ...' : 'Working...') : (ar ? 'استئناف' : 'Resume')}</button>}
            {job.status === 'error' && <button type="button" onClick={() => void act(job, 'retry-failed')} disabled={Boolean(busy)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-black text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-60 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />{ar ? 'إعادة الفاشل' : 'Retry failed'}</button>}
            {job.status !== 'error' && <button type="button" onClick={() => void act(job, 'cancel')} disabled={Boolean(busy)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><X className="h-3.5 w-3.5" aria-hidden="true" />{ar ? 'إلغاء' : 'Cancel'}</button>}
            <button type="button" onClick={() => void refresh()} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={ar ? 'تحديث' : 'Refresh'}><RefreshCw className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" onClick={onOpenCreator} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-violet-600 px-3 text-xs font-black text-white transition hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400">{ar ? 'فتح المهمة' : 'Open job'}</button>
            <button type="button" onClick={() => setDismissed(true)} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:hover:bg-slate-800" aria-label={ar ? 'إخفاء المركز مؤقتًا' : 'Dismiss temporarily'}><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </div>
        <p className="mt-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400"><CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-500" aria-hidden="true" />{loadError ? (ar ? 'تعذر تحديث الحالة؛ حاول مرة أخرى.' : 'Could not refresh status; try again.') : (ar ? 'التقدم محفوظ على الخادم؛ يمكنك مغادرة الصفحة والعودة لاحقًا.' : 'Progress is saved on the server; you can leave and return later.')}</p>
      </div>
    </section>
  );
}
