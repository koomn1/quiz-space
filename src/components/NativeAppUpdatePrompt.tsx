import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, DownloadCloud, Loader2, ShieldCheck, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
  QuizSpaceUpdate,
  fetchExpectedSha256,
  findLatestMobileRelease,
  isVersionNewer,
  type LatestMobileRelease,
  type NativeDownloadStatus,
  updateCacheKey,
} from '../services/nativeAppUpdate';

const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';

type StoredUpdate = {
  tagName: string;
  fileName: string;
  downloadId: string;
  state?: NativeDownloadStatus['state'];
  progress?: number;
};

function readStoredUpdate(tagName: string): StoredUpdate | null {
  try {
    const raw = localStorage.getItem(updateCacheKey(tagName));
    if (!raw) return null;
    const value = JSON.parse(raw) as StoredUpdate;
    return value.tagName === tagName && value.downloadId ? value : null;
  } catch {
    return null;
  }
}

function saveStoredUpdate(update: StoredUpdate) {
  localStorage.setItem(updateCacheKey(update.tagName), JSON.stringify(update));
}

export function NativeAppUpdatePrompt() {
  const native = Capacitor.isNativePlatform();
  const [release, setRelease] = useState<LatestMobileRelease | null>(null);
  const [download, setDownload] = useState<StoredUpdate | null>(null);
  const [status, setStatus] = useState<NativeDownloadStatus | null>(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(native);
  const [installing, setInstalling] = useState(false);

  const fileName = useMemo(() => release ? `quizspace-${release.tagName}.apk` : '', [release]);

  const checkRelease = useCallback(async () => {
    if (!native) return;
    setChecking(true);
    try {
      const latest = await findLatestMobileRelease();
      if (!latest || !isVersionNewer(latest.version, CURRENT_VERSION)) {
        setRelease(null);
        setDownload(null);
        return;
      }
      setRelease(latest);
      const stored = readStoredUpdate(latest.tagName);
      if (stored) {
        setDownload(stored);
        const nextStatus = await QuizSpaceUpdate.status({ downloadId: stored.downloadId });
        if (nextStatus.state === 'missing') {
          localStorage.removeItem(updateCacheKey(latest.tagName));
          setDownload(null);
          setStatus(null);
        } else {
          setStatus(nextStatus);
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر فحص التحديث الآن.');
    } finally {
      setChecking(false);
    }
  }, [native]);

  useEffect(() => {
    void checkRelease();
  }, [checkRelease]);

  useEffect(() => {
    if (!native || !download) return undefined;
    let active = true;
    const poll = async () => {
      try {
        const nextStatus = await QuizSpaceUpdate.status({ downloadId: download.downloadId });
        if (!active) return;
        setStatus(nextStatus);
        saveStoredUpdate({ ...download, state: nextStatus.state, progress: nextStatus.progress });
        if (nextStatus.state === 'missing') {
          localStorage.removeItem(updateCacheKey(download.tagName));
          setDownload(null);
          setStatus(null);
        }
      } catch {
        // The system DownloadManager can be temporarily unavailable while the app resumes.
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 1500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [download, native]);

  if (!native || !release || checking) return null;

  const progress = Math.round(Math.max(0, Math.min(1, status?.progress ?? download?.progress ?? 0)) * 100);
  const downloading = status?.state === 'pending' || status?.state === 'running';
  const ready = status?.state === 'complete';

  const startDownload = async () => {
    setError('');
    try {
      const result = await QuizSpaceUpdate.enqueue({ url: release.apkUrl, fileName });
      const stored = { tagName: release.tagName, fileName: result.fileName, downloadId: result.downloadId, state: 'pending' as const, progress: 0 };
      saveStoredUpdate(stored);
      setDownload(stored);
      setStatus({ state: 'pending', downloadId: result.downloadId, progress: 0 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر بدء تنزيل التحديث.');
    }
  };

  const installUpdate = async () => {
    setInstalling(true);
    setError('');
    try {
      const expected = await fetchExpectedSha256(release.checksumUrl);
      const actual = (await QuizSpaceUpdate.sha256({ fileName: download?.fileName || fileName })).sha256.toLowerCase();
      if (actual !== expected) throw new Error('فشل التحقق من سلامة التحديث. أعد التنزيل.');
      await QuizSpaceUpdate.openInstaller({ fileName: download?.fileName || fileName });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر فتح مثبت Android.');
    } finally {
      setInstalling(false);
    }
  };

  return (
    <aside className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/65 p-4 backdrop-blur-sm sm:items-center" dir="rtl" aria-live="polite">
      <section className="w-full max-w-md rounded-[2rem] border border-violet-300/25 bg-[#0d1328] p-5 text-white shadow-2xl shadow-violet-950/40">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200"><DownloadCloud className="h-6 w-6" aria-hidden="true" /></div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black">تحديث إجباري متاح</h2>
            <p className="mt-1 text-sm leading-6 text-slate-300">الإصدار الجديد سيضم كل وظائف QuizSpace داخل التطبيق. نزّله الآن، ويمكنك قفل التطبيق أثناء التنزيل.</p>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-violet-200">{release.version}</span>
        </div>

        {downloading && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between text-xs font-bold"><span>التنزيل شغال في الخلفية</span><span>{progress}%</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-l from-cyan-300 to-violet-400 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
            <p className="mt-2 text-[11px] leading-5 text-slate-400">اقفل التطبيق عادي. Android هيكمل التنزيل، ولما ترجع هتلاقي الحالة محفوظة.</p>
          </div>
        )}

        {ready && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-100"><ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" /><span>التحديث جاهز، وسيتم فحص سلامته قبل التثبيت.</span></div>
        )}
        {error && <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-xs leading-5 text-rose-100">{error}</p>}

        <div className="mt-5 flex gap-2">
          {!download || status?.state === 'failed' ? (
            <button type="button" onClick={startDownload} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-400 px-4 text-sm font-black text-slate-950 transition-transform active:scale-[0.98]"><Download className="h-4 w-4" aria-hidden="true" />ابدأ التنزيل</button>
          ) : ready ? (
            <button type="button" onClick={installUpdate} disabled={installing} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 text-sm font-black text-emerald-950 disabled:opacity-60">{installing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}تثبيت التحديث</button>
          ) : (
            <button type="button" disabled className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-black text-white/70"><Loader2 className="h-4 w-4 animate-spin" />جاري التنزيل {progress}%</button>
          )}
          <button type="button" onClick={() => void checkRelease()} className="flex min-h-12 w-12 items-center justify-center rounded-2xl border border-white/10 text-white/70" aria-label="إعادة فحص التحديث"><X className="h-5 w-5" /></button>
        </div>
      </section>
    </aside>
  );
}
