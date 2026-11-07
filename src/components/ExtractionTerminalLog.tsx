import React from 'react';

export type ExtractionStage = 'analyzing' | 'extracting' | 'generating' | 'solving' | 'compiling' | 'saving';

interface ExtractionTerminalLogProps {
  currentStage: ExtractionStage;
  language: 'ar' | 'en';
  mode: 'literal' | 'generate';
  message?: string;
  current?: number;
  total?: number;
  percentage?: number;
}

interface TerminalEntry {
  id: string;
  groupKey: string;
  time: string;
  tag: string;
  message: string;
  progress?: string;
  updates: number;
}

const stageTags: Record<ExtractionStage, string> = {
  analyzing: 'SCAN',
  extracting: 'READ',
  generating: 'PARSE',
  solving: 'VERIFY',
  compiling: 'AUDIT',
  saving: 'SAVE',
};

const stageNames = {
  ar: {
    analyzing: 'فحص المصدر',
    extracting: 'قراءة المحتوى',
    generating: 'تنظيم الأسئلة',
    solving: 'مراجعة الإجابات',
    compiling: 'مراجعة التغطية',
    saving: 'تجهيز الاختبار',
  },
  en: {
    analyzing: 'Inspecting source',
    extracting: 'Reading content',
    generating: 'Structuring questions',
    solving: 'Checking answers',
    compiling: 'Auditing coverage',
    saving: 'Preparing quiz',
  },
} as const;

function normalizeGroupMessage(message: string): string {
  return message
    .toLocaleLowerCase()
    .replace(/[0-9٠-٩]+/gu, '#')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function createExtractionGroupKey(stage: ExtractionStage, message: string): string {
  return `${stage}|${normalizeGroupMessage(message)}`;
}

export function isTerminalLogNearLatest(scrollHeight: number, clientHeight: number, scrollTop: number, threshold = 48): boolean {
  return scrollHeight - clientHeight - scrollTop <= threshold;
}

export default function ExtractionTerminalLog({
  currentStage,
  language,
  mode,
  message,
  current = 0,
  total = 0,
  percentage,
}: ExtractionTerminalLogProps) {
  const isArabic = language === 'ar';
  const [entries, setEntries] = React.useState<TerminalEntry[]>([]);
  const [followingLatest, setFollowingLatest] = React.useState(true);
  const [unseenUpdates, setUnseenUpdates] = React.useState(0);
  const logRef = React.useRef<HTMLDivElement>(null);
  const lastEntryRef = React.useRef('');
  const entryCounterRef = React.useRef(0);
  const followsLatestRef = React.useRef(true);

  React.useEffect(() => {
    const detail = String(message || '').replace(/\s+/g, ' ').trim();
    if (!detail) return;

    const signature = JSON.stringify([currentStage, current, total, percentage, detail]);
    if (signature === lastEntryRef.current) return;
    lastEntryRef.current = signature;

    const time = new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());
    const progress = total > 0
      ? `${current}/${total}`
      : percentage != null
        ? `${Math.round(Math.max(0, Math.min(100, percentage)))}%`
        : undefined;
    const groupKey = createExtractionGroupKey(currentStage, detail);
    const id = String(++entryCounterRef.current);

    setEntries(previous => {
      const lastEntry = previous[previous.length - 1];
      if (lastEntry?.groupKey === groupKey) {
        return [
          ...previous.slice(0, -1),
          { ...lastEntry, time, message: detail.slice(0, 360), progress, updates: lastEntry.updates + 1 },
        ];
      }

      return [...previous, {
        id,
        groupKey,
        time,
        tag: stageTags[currentStage],
        message: detail.slice(0, 360),
        progress,
        updates: 1,
      }].slice(-36);
    });
  }, [currentStage, current, total, percentage, message, isArabic]);

  React.useEffect(() => {
    const log = logRef.current;
    if (!log) return;

    if (followsLatestRef.current) {
      log.scrollTop = log.scrollHeight;
      setUnseenUpdates(0);
    } else {
      setUnseenUpdates(count => count + 1);
    }
  }, [entries]);

  const handleLogScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const isNearBottom = isTerminalLogNearLatest(element.scrollHeight, element.clientHeight, element.scrollTop);
    followsLatestRef.current = isNearBottom;
    setFollowingLatest(previous => previous === isNearBottom ? previous : isNearBottom);
    if (isNearBottom) setUnseenUpdates(0);
  };

  const jumpToLatest = () => {
    const log = logRef.current;
    followsLatestRef.current = true;
    setFollowingLatest(true);
    setUnseenUpdates(0);
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
  };

  const title = currentStage === 'generating'
    ? (mode === 'literal'
      ? (isArabic ? 'ترتيب الأسئلة' : 'Structuring questions')
      : (isArabic ? 'بناء الأسئلة' : 'Building questions'))
    : stageNames[language][currentStage];
  const progressLabel = percentage == null
    ? (total > 0 ? `${current} / ${total}` : (isArabic ? 'جارٍ التنفيذ' : 'RUNNING'))
    : `${Math.round(Math.max(0, Math.min(100, percentage)))}%`;

  return (
    <section
      aria-label={isArabic ? 'سجل تقدم استخراج الملف' : 'Document extraction progress log'}
      className="overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#050914]/95 text-left shadow-[0_18px_50px_rgba(2,6,23,0.45)] ring-1 ring-white/[0.035]"
      dir="ltr"
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-slate-900/80 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex shrink-0 items-center gap-1" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-rose-400/80" />
            <span className="h-2 w-2 rounded-full bg-amber-300/80" />
            <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
          </div>
          <span className="truncate font-mono text-[10px] font-bold tracking-wide text-slate-300 sm:text-[11px]">
            cosmo / extraction.log
          </span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2 py-1 font-mono text-[9px] font-bold tracking-wider text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> LIVE
        </span>
      </header>

      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-3 py-2 font-mono text-[10px] sm:px-4">
        <span className="min-w-0 truncate text-cyan-200">{stageTags[currentStage]} <span className="text-slate-400">·</span> {title}</span>
        <span className="shrink-0 text-violet-300">{mode === 'literal' ? 'LITERAL' : 'GENERATE'} <span className="text-slate-500">/</span> {progressLabel}</span>
      </div>

      <div className="relative">
        <div
          ref={logRef}
          onScroll={handleLogScroll}
          role="log"
          aria-live="polite"
          aria-atomic="false"
          aria-relevant="additions text"
          aria-label={isArabic ? 'تحديثات المعالجة الفعلية' : 'Live processing updates'}
          className="max-h-48 min-h-28 space-y-2 overflow-y-auto px-3 py-3 font-mono text-[10px] leading-relaxed sm:max-h-56 sm:px-4 sm:text-[11px]"
        >
          {entries.length === 0 ? (
            <p className="text-slate-500">{isArabic ? 'بانتظار أول تحديث من مهمة الاستخراج...' : 'Waiting for the first extraction update…'}</p>
          ) : entries.map(entry => (
            <div key={entry.id} className="flex items-start gap-2.5">
              <span className="shrink-0 text-slate-600">[{entry.time}]</span>
              <span className="shrink-0 font-bold text-emerald-300">[{entry.tag}]</span>
              <span className="min-w-0 flex-1 break-words text-slate-200" dir="auto">{entry.message}</span>
              {entry.progress && <span className="shrink-0 text-cyan-300">{entry.progress}</span>}
              {entry.updates > 1 && (
                <span
                  className="shrink-0 rounded bg-white/[0.06] px-1.5 text-[9px] text-slate-400"
                  title={isArabic ? 'عدد التحديثات المدمجة' : 'Number of grouped updates'}
                >
                  ×{entry.updates}
                </span>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2.5 pt-1 text-emerald-300" aria-hidden="true">
            <span className="shrink-0">cosmo@quizspace:~$</span>
            <span className="h-3.5 w-1.5 animate-pulse rounded-[1px] bg-emerald-300" />
          </div>
        </div>

        {!followingLatest && unseenUpdates > 0 && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-cyan-200/20 bg-slate-800/95 px-3 py-1.5 font-sans text-[10px] font-bold text-cyan-100 shadow-lg backdrop-blur-md transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            aria-label={isArabic ? `الانتقال إلى أحدث ${unseenUpdates} تحديثات` : `Jump to ${unseenUpdates} latest updates`}
          >
            {isArabic ? `↓ ${unseenUpdates} تحديثات جديدة` : `↓ ${unseenUpdates} new updates`}
          </button>
        )}
      </div>

      <footer className="border-t border-white/[0.06] bg-slate-900/50 px-3 py-2 text-[9px] leading-relaxed text-slate-500 sm:px-4">
        {isArabic
          ? 'التحديثات المتشابهة تُدمج تلقائيًا؛ ويتوقف التمرير عند قراءة السجل للأعلى.'
          : 'Repeated updates are grouped; auto-follow pauses while you read earlier log entries.'}
      </footer>
    </section>
  );
}
