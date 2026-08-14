import React from 'react';
import { Activity, BarChart3, CalendarDays, Loader2, RefreshCw, Users } from 'lucide-react';
import type { MotivationUsageSummary, MotivationUsageTab } from '../types';
import { getMotivationUsageSummary } from '../lib/db';

const tabLabels: Record<MotivationUsageTab, { ar: string; en: string }> = {
  motivation: { ar: 'نظرة عامة', en: 'Overview' },
  'motivation-lucky': { ar: 'عجلة الحظ', en: 'Lucky wheel' },
  'motivation-brain': { ar: 'تحدي العقل', en: 'Brain challenge' },
  'motivation-review': { ar: 'مراجعة ذكية', en: 'Smart review' },
  'motivation-season': { ar: 'موسم التعلّم', en: 'Learning season' },
  'motivation-duel': { ar: 'مبارزة خاصة', en: 'Private duel' },
  'motivation-store': { ar: 'متجر النقاط', en: 'Points store' },
};

function emptySummary(days: number): MotivationUsageSummary {
  return { windowDays: days, totalUniqueDailyOpens: 0, totalUniqueLearners: 0, totalUniqueDailyEngagements: 0, tabs: [], daily: [] };
}

export default function AdminMotivationUsagePanel({ lang }: { lang: 'ar' | 'en' }) {
  const isAr = lang === 'ar';
  const [days, setDays] = React.useState(30);
  const [summary, setSummary] = React.useState<MotivationUsageSummary>(() => emptySummary(30));
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await getMotivationUsageSummary(days));
    } catch (cause) {
      console.error('Motivation usage analytics error:', cause);
      setError(isAr ? 'تعذر تحميل تقرير الاستخدام. تحقق من صلاحية المدير وحاول مرة أخرى.' : 'Unable to load usage data. Verify administrator access and try again.');
    } finally {
      setLoading(false);
    }
  }, [days, isAr]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const maxOpens = Math.max(1, ...summary.tabs.map((tab) => tab.uniqueDailyOpens));
  const trendMax = Math.max(1, ...summary.daily.map((item) => item.uniqueDailyOpens));
  const hasData = summary.totalUniqueDailyOpens > 0;

  return (
    <section className="space-y-6 admin-content-panel" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="flex flex-col gap-4 rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-5 dark:border-violet-900/50 dark:from-violet-950/25 dark:via-slate-900 dark:to-sky-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><div className="rounded-2xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"><BarChart3 className="h-5 w-5" /></div><div><h3 className="text-lg font-black text-slate-900 dark:text-white">{isAr ? 'استخدام مركز التحفيز' : 'Motivation Hub usage'}</h3><p className="mt-1 max-w-2xl text-xs leading-6 text-slate-600 dark:text-slate-300">{isAr ? 'أرقام مجمعة يومياً دون أسماء أو سجل نقرات فردي. يتم احتساب مشاهدة واحدة لكل متعلم ولكل تبويب في اليوم.' : 'Daily aggregated metrics only—no names or individual click trails. Each learner is counted once per tab per day.'}</p></div></div>
        <div className="flex items-center gap-2"><select value={days} onChange={(event) => setDays(Number(event.target.value))} className="min-h-11 rounded-xl border border-violet-200 bg-white px-3 text-xs font-black text-violet-800 outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-violet-900 dark:bg-slate-950 dark:text-violet-200"><option value={7}>{isAr ? 'آخر 7 أيام' : 'Last 7 days'}</option><option value={30}>{isAr ? 'آخر 30 يوماً' : 'Last 30 days'}</option><option value={90}>{isAr ? 'آخر 90 يوماً' : 'Last 90 days'}</option></select><button type="button" onClick={() => void refresh()} disabled={loading} className="flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white transition hover:bg-violet-700 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{isAr ? 'تحديث' : 'Refresh'}</button></div>
      </header>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {[{ label: isAr ? 'المتعلمون الفريدون' : 'Unique learners', value: summary.totalUniqueLearners, icon: Users, tone: 'violet' }, { label: isAr ? 'فتحات تبويب يومية' : 'Daily unique opens', value: summary.totalUniqueDailyOpens, icon: Activity, tone: 'sky' }, { label: isAr ? 'تفاعلات مكتملة' : 'Completed engagements', value: summary.totalUniqueDailyEngagements, icon: CalendarDays, tone: 'emerald' }].map((metric) => { const Icon = metric.icon; const tones: Record<string, string> = { violet: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/25 dark:text-violet-200', sky: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200', emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200' }; return <div key={metric.label} className={`rounded-3xl border p-5 ${tones[metric.tone]}`}><div className="flex items-center justify-between"><span className="text-xs font-black opacity-80">{metric.label}</span><Icon className="h-5 w-5" /></div><p className="mt-4 text-3xl font-black tracking-tight">{metric.value.toLocaleString()}</p><p className="mt-1 text-[11px] font-bold opacity-70">{isAr ? `خلال آخر ${summary.windowDays} يوماً` : `Across the last ${summary.windowDays} days`}</p></div>; })}
      </div>

      {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-violet-600" /></div> : !hasData ? <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/50"><BarChart3 className="mx-auto h-10 w-10 text-slate-400" /><h4 className="mt-4 text-base font-black text-slate-800 dark:text-white">{isAr ? 'لا توجد بيانات استخدام تاريخية بعد' : 'No historical usage data yet'}</h4><p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">{isAr ? 'بدأ القياس الآمن من الآن. ستظهر الإحصاءات المجمعة هنا بعد استخدام المتعلمين لتبويبات مركز التحفيز.' : 'Secure measurement starts now. Aggregated tab activity will appear here after learners use the Motivation Hub.'}</p></div> : <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="mb-5"><h4 className="text-base font-black text-slate-900 dark:text-white">{isAr ? 'أداء التبويبات' : 'Tab performance'}</h4><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isAr ? 'القياس هو فتحات يومية فريدة لكل تبويب.' : 'Measured as daily unique opens per tab.'}</p></div><div className="space-y-4">{summary.tabs.map((tab) => <div key={tab.tab}><div className="mb-2 flex items-center justify-between gap-4 text-xs"><span className="font-black text-slate-700 dark:text-slate-200">{tabLabels[tab.tab][isAr ? 'ar' : 'en']}</span><span className="font-bold text-slate-500 dark:text-slate-400">{tab.uniqueDailyOpens.toLocaleString()} {isAr ? 'فتح' : 'opens'} · {tab.uniqueLearners.toLocaleString()} {isAr ? 'متعلم' : 'learners'}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-sky-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, (tab.uniqueDailyOpens / maxOpens) * 100))}%` }} /></div></div>)}</div></section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="mb-5"><h4 className="text-base font-black text-slate-900 dark:text-white">{isAr ? 'الاتجاه اليومي' : 'Daily trend'}</h4><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isAr ? 'إجمالي فتحات التبويب المجمعة.' : 'Aggregated tab opens.'}</p></div><div className="flex h-44 items-end gap-1.5">{summary.daily.map((day) => <div key={day.date} title={`${day.date}: ${day.uniqueDailyOpens}`} className="group flex h-full flex-1 items-end"><div className="w-full rounded-t-md bg-sky-500/80 transition-colors group-hover:bg-violet-600" style={{ height: `${Math.max(day.uniqueDailyOpens ? 8 : 2, (day.uniqueDailyOpens / trendMax) * 100)}%` }} /></div>)}</div><div className="mt-3 flex justify-between text-[10px] font-bold text-slate-400"><span>{summary.daily[0]?.date || ''}</span><span>{summary.daily[summary.daily.length - 1]?.date || ''}</span></div></section>
      </div>}
    </section>
  );
}
