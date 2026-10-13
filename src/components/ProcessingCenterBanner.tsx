import React from 'react';
import { AlertTriangle, CheckCircle2, CircleDot, FileText, LoaderCircle, Pause, Play, RefreshCw, RotateCcw, X, ChevronDown } from 'lucide-react';
import { controlExtractionJob, ExtractionJob, ExtractionJobControl, listActiveExtractionJobs } from '../services/aiWorkerClient';

type ProcessingCenterBannerProps = { lang: 'ar' | 'en'; enabled: boolean; onOpenCreator: () => void };

const statusText = (status: ExtractionJob['status'], ar: boolean) => ({
  pending: ar ? 'في الانتظار' : 'Queued', processing: ar ? 'جاري المعالجة' : 'Processing', paused: ar ? 'متوقفة مؤقتًا' : 'Paused',
  error: ar ? 'تحتاج إلى إجراء' : 'Needs attention', complete: ar ? 'اكتملت' : 'Complete', cancelled: ar ? 'أُلغيت' : 'Cancelled',
}[status]);

export default function ProcessingCenterBanner({ lang, enabled, onOpenCreator }: ProcessingCenterBannerProps) {
  const [jobs, setJobs] = React.useState<ExtractionJob[]>([]);
  const [dismissed, setDismissed] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const ar = lang === 'ar';

  const refresh = React.useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await listActiveExtractionJobs();
      // A worker lease is only a few minutes long. If an old processing job
      // has not changed for a long time, it is an orphaned record rather than
      // a live task. Keeping it in the banner makes finished quizzes look as
      // if they are still running and makes Cancel show a misleading error.
      const staleBefore = Date.now() - 30 * 60 * 1000;
      const activeJobs = result.filter((job) => {
        if (['complete', 'cancelled'].includes(job.status)) return false;
        if (!['pending', 'processing'].includes(job.status)) return true;
        const updatedAt = Date.parse(String(job.updatedAt || ''));
        return !Number.isFinite(updatedAt) || updatedAt >= staleBefore;
      });
      setJobs(activeJobs);
      setLoadError(false);
    } catch { setLoadError(true); }
  }, [enabled]);

  React.useEffect(() => {
    setDismissed(false);
    setExpanded(false);
    setClosing(false);
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
      setLoadError(false);
      if (control === 'cancel' || updated.status === 'cancelled') {
        // The control endpoint already returned the authoritative state. A
        // second immediate GET used to race the worker and show a false
        // “could not refresh” message after a successful cancellation.
        setClosing(true);
        window.setTimeout(() => {
          setJobs((current) => current.filter((item) => item.id !== updated.id));
          setClosing(false);
        }, 220);
      } else {
        setJobs((current) => current.map((item) => item.id === updated.id ? updated : item).filter((item) => !['complete', 'cancelled'].includes(item.status)));
      }
    } catch (error) {
      console.error('Extraction job control failed:', error);
      // Cancellation is best-effort. The job can already have expired or be
      // stale, so do not keep a misleading completed-task banner visible.
      if (control === 'cancel') {
        setJobs((current) => current.filter((item) => item.id !== job.id));
        setLoadError(false);
      } else {
        setLoadError(true);
      }
    } finally { setBusy(null); }
  };

  if (!enabled || dismissed || jobs.length === 0) return null;
  const job = jobs[0];
  const percentage = Math.min(100, Math.max(0, Number(job.progressPercentage) || 0));
  const isBusy = (control: ExtractionJobControl) => busy === `${job.id}:${control}`;
  const canPause = job.status === 'pending' || job.status === 'processing';
  const canResume = job.status === 'paused' || job.status === 'error';
  const questions = job.extractedQuestions || 0;

  return (
    <aside className={`processing-toast fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.5rem)] z-[80] transition-[opacity,transform] duration-200 ease-out sm:inset-x-auto sm:end-6 sm:top-24 sm:w-[min(29rem,calc(100vw-3rem))] ${closing ? 'pointer-events-none translate-y-[-8px] opacity-0' : 'translate-y-0 opacity-100'}`} dir={ar ? 'rtl' : 'ltr'} aria-label={ar ? 'إشعار معالجة الملفات' : 'Document processing notification'}>
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-violet-300/60 bg-white/95 shadow-[0_16px_45px_rgba(30,27,75,0.2)] backdrop-blur-xl dark:border-violet-700/50 dark:bg-slate-950/95">
        <div className="flex items-center gap-2.5 p-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${job.status === 'error' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'}`} aria-hidden="true">
            {job.status === 'processing' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : job.status === 'error' ? <AlertTriangle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5"><strong className="truncate text-xs font-black text-slate-900 dark:text-white">{ar ? 'مهمتك محفوظة وتعمل بالخلفية' : 'Your task is saved and running'}</strong><span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-black text-violet-800 dark:bg-violet-500/15 dark:text-violet-200">{statusText(job.status, ar)}</span></div>
            <p className="mt-1 truncate text-[10px] font-bold text-slate-500 dark:text-slate-400">{job.sourceFileName || (ar ? 'ملف مرفوع' : 'Uploaded document')} · {percentage}%</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} aria-label={ar ? `تقدم المعالجة ${percentage}%` : `Processing progress ${percentage}%`}><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 transition-[width] duration-500" style={{ width: `${percentage}%` }} /></div>
          </div>
          <button type="button" onClick={() => setExpanded((value) => !value)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:hover:bg-slate-800" aria-expanded={expanded} aria-label={ar ? 'عرض تفاصيل المعالجة' : 'Show processing details'}><ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} /></button>
          <button type="button" onClick={() => { setClosing(true); window.setTimeout(() => setDismissed(true), 220); }} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:hover:bg-slate-800" aria-label={ar ? 'إخفاء الإشعار' : 'Dismiss notification'}><X className="h-4 w-4" /></button>
        </div>

        <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`} aria-hidden={!expanded}><div className="min-h-0 overflow-hidden border-t border-violet-100/80 px-3 pb-3 pt-2 dark:border-violet-900/50">
          <p className="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400">{job.progressMessage || (ar ? 'تتم المعالجة في الخلفية.' : 'Processing in the background.')}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400"><span>{ar ? `الأجزاء: ${job.processedChunks}/${job.totalChunks || '?'}` : `Chunks: ${job.processedChunks}/${job.totalChunks || '?'}`}</span><span>{ar ? `أسئلة: ${questions}` : `Questions: ${questions}`}</span><span>{ar ? `مراجعة: ${job.reviewRequiredQuestions || 0}` : `Review: ${job.reviewRequiredQuestions || 0}`}</span></div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {canPause && <button type="button" onClick={() => void act(job, 'pause')} disabled={Boolean(busy)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-amber-200 px-2.5 text-[10px] font-black text-amber-800 transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/30"><Pause className="h-3 w-3" />{isBusy('pause') ? (ar ? 'جارٍ...' : 'Working...') : (ar ? 'إيقاف' : 'Pause')}</button>}
            {canResume && <button type="button" onClick={() => void act(job, 'resume')} disabled={Boolean(busy)} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-[10px] font-black text-white transition hover:bg-emerald-500 disabled:opacity-60"><Play className="h-3 w-3" />{isBusy('resume') ? (ar ? 'جارٍ...' : 'Working...') : (ar ? 'استئناف' : 'Resume')}</button>}
            {job.status === 'error' && <button type="button" onClick={() => void act(job, 'retry-failed')} disabled={Boolean(busy)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-rose-200 px-2.5 text-[10px] font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"><RotateCcw className="h-3 w-3" />{ar ? 'إعادة الفاشل' : 'Retry failed'}</button>}
            {job.status !== 'error' && <button type="button" onClick={() => void act(job, 'cancel')} disabled={Boolean(busy)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[10px] font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><X className="h-3 w-3" />{ar ? 'إلغاء' : 'Cancel'}</button>}
            <button type="button" onClick={() => void refresh()} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={ar ? 'تحديث' : 'Refresh'}><RefreshCw className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={onOpenCreator} className="ms-auto inline-flex min-h-9 items-center gap-1 rounded-lg bg-violet-600 px-3 text-[10px] font-black text-white transition hover:bg-violet-500">{ar ? 'فتح المهمة' : 'Open job'}</button>
          </div>
          <p className="mt-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400"><CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-500" />{loadError ? (ar ? 'تعذر تحديث الحالة؛ حاول مرة أخرى.' : 'Could not refresh status; try again.') : (ar ? 'التقدم محفوظ؛ يمكنك متابعة التصفح والعودة لاحقًا.' : 'Progress is saved; keep browsing and return later.')}</p>
        </div></div>
      </div>
    </aside>
  );
}
