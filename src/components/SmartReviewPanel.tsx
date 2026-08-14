import React from 'react';
import { Brain, Compass, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { getPersonalLearningImprovement, getSmartReviewCards } from '../lib/db';
import type { PersonalLearningImprovement, SmartReviewCard } from '../types';

type SmartReviewPanelProps = {
  lang: 'ar' | 'en';
};

const copy = {
  ar: {
    eyebrow: 'تعلم موجّه',
    title: 'مراجعة أذكى، لا أكثر',
    subtitle: 'نستخرج مواضيع المراجعة من محاولاتك الفعلية خلال آخر 60 يوماً؛ لا توجد مقارنة مع أي طالب آخر.',
    refresh: 'تحديث التحليل',
    loading: 'نحلل نشاطك التعليمي…',
    empty: 'أكمل اختباراً واحداً على الأقل لتظهر اقتراحات مراجعة شخصية هنا.',
    attempts: 'محاولة',
    accuracy: 'دقة',
    reviewHint: 'ابدأ بمراجعة المفاهيم الأساسية في هذا المجال، ثم أعد اختباراً قصيراً لتلاحظ التحسن.',
    progressTitle: 'تحسنّك الشخصي',
    progressHint: 'آخر 28 يوماً مقارنة بالـ 28 يوماً السابقة.',
    completed: 'اختبارات مكتملة',
    accuracyChange: 'تغير الدقة',
    noChange: 'لم تتوفر بيانات مقارنة سابقة بعد.',
  },
  en: {
    eyebrow: 'Guided learning',
    title: 'Review smarter, not more',
    subtitle: 'Your review focus comes from your real attempts in the last 60 days. It is never compared with another learner.',
    refresh: 'Refresh analysis',
    loading: 'Analysing your learning activity…',
    empty: 'Complete at least one quiz to unlock personalised review suggestions here.',
    attempts: 'attempts',
    accuracy: 'accuracy',
    reviewHint: 'Revisit the core concepts in this topic, then take a short quiz to measure your improvement.',
    progressTitle: 'Your personal improvement',
    progressHint: 'The latest 28 days compared with the previous 28 days.',
    completed: 'completed quizzes',
    accuracyChange: 'accuracy change',
    noChange: 'There is no earlier comparison window yet.',
  },
} as const;

function Delta({ value, suffix, positiveLabel, negativeLabel }: { value: number; suffix: string; positiveLabel: string; negativeLabel: string }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${isPositive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{isPositive ? '+' : ''}{value}{suffix} · {isPositive ? positiveLabel : negativeLabel}</span>
    </div>
  );
}

export default function SmartReviewPanel({ lang }: SmartReviewPanelProps) {
  const t = copy[lang];
  const [cards, setCards] = React.useState<SmartReviewCard[]>([]);
  const [improvement, setImprovement] = React.useState<PersonalLearningImprovement | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [reviewData, progressData] = await Promise.all([getSmartReviewCards(), getPersonalLearningImprovement()]);
      setCards(reviewData.cards);
      setImprovement(progressData);
    } catch {
      setError(lang === 'ar' ? 'تعذر تحميل تحليلك الآن. حاول مرة أخرى.' : 'Your learning analysis could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  React.useEffect(() => { void load(); }, [load]);

  const periodHasHistory = Boolean(improvement?.previousPeriod.completed);
  return (
    <section className="space-y-5 rounded-[2rem] border border-cyan-300/30 bg-gradient-to-br from-cyan-500/10 via-white/75 to-violet-500/10 p-5 shadow-xl shadow-cyan-950/5 dark:from-cyan-950/25 dark:via-slate-950 dark:to-violet-950/25 sm:p-6" aria-labelledby="smart-review-heading">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">{t.eyebrow}</p>
          <h2 id="smart-review-heading" className="mt-1 flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white"><Brain className="h-5 w-5 text-cyan-600" aria-hidden="true" />{t.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t.subtitle}</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-white/80 px-4 text-xs font-black text-cyan-800 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900/70 dark:text-cyan-200 dark:hover:bg-cyan-950/40">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />{t.refresh}
        </button>
      </header>

      {loading ? <div className="flex min-h-40 items-center justify-center text-sm font-bold text-slate-500"><RefreshCw className="me-2 h-5 w-5 animate-spin" aria-hidden="true" />{t.loading}</div> : error ? <p role="alert" className="rounded-2xl bg-rose-500/10 p-4 text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p> : <>
        <div className="grid gap-3 md:grid-cols-3">
          {cards.length === 0 ? <div className="rounded-2xl border border-dashed border-cyan-400/40 bg-white/55 p-5 text-sm font-bold leading-7 text-slate-600 dark:bg-slate-950/35 dark:text-slate-300 md:col-span-3">{t.empty}</div> : cards.map((card) => (
            <article key={card.topic} className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900 dark:text-white">{card.topic}</p><p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{card.attempts} {t.attempts}</p></div><span className="shrink-0 rounded-xl bg-amber-400/15 px-2.5 py-1 text-xs font-black text-amber-700 dark:text-amber-300">{card.accuracy}% {t.accuracy}</span></div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-[width] duration-200" style={{ width: `${Math.max(4, Math.min(100, card.accuracy))}%` }} /></div>
              <p className="mt-4 flex gap-2 text-xs leading-6 text-slate-600 dark:text-slate-300"><Compass className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" aria-hidden="true" />{t.reviewHint}</p>
            </article>
          ))}
        </div>

        <div className="rounded-2xl border border-violet-300/30 bg-violet-500/5 p-4 dark:border-violet-700/40 dark:bg-violet-950/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-black text-slate-900 dark:text-white">{t.progressTitle}</h3><p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{t.progressHint}</p></div>{periodHasHistory ? <Delta value={Number(improvement?.accuracyChange || 0)} suffix="%" positiveLabel={t.accuracyChange} negativeLabel={t.accuracyChange} /> : <span className="text-xs font-bold text-slate-500">{t.noChange}</span>}</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white/75 p-3 dark:bg-slate-950/40"><p className="text-[10px] font-bold text-slate-500">{t.completed}</p><p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{improvement?.currentPeriod.completed ?? 0}</p></div><div className="rounded-xl bg-white/75 p-3 dark:bg-slate-950/40"><p className="text-[10px] font-bold text-slate-500">{t.accuracy}</p><p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{improvement?.currentPeriod.accuracy ?? 0}%</p></div></div>
        </div>
      </>}
    </section>
  );
}
