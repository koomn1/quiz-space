import React from 'react';
import { Award, CheckCircle2, CircleDollarSign, Coins, RefreshCw, Sparkles } from 'lucide-react';
import { claimLearningSeasonReward, getActiveLearningSeason } from '../lib/db';
import type { ActiveLearningSeason } from '../types';

type LearningSeasonPanelProps = { lang: 'ar' | 'en' };

const copy = {
  ar: {
    eyebrow: 'موسم تعليمي', title: 'موسم تعلّم قصير وعادل', refresh: 'تحديث', loading: 'جاري تحميل الموسم…', empty: 'لا يوجد موسم تعليمي نشط حالياً. سيظهر الموسم القادم هنا تلقائياً.',
    progress: 'تقدمك في الموسم', completed: 'اختبارات مكتملة', requirement: 'المطلوب لاستحقاق مكافأة واحدة', claim: 'اختر هذه المكافأة', claimed: 'تم اختيار مكافأتك', choosing: 'جاري الحفظ…', points: 'نقطة', coins: 'عملة', badge: 'شارة موسمية', ends: 'ينتهي', fairness: 'لا توجد جائزة مدفوعة أو ترتيب عام هنا؛ لكل متعلم اختيار واحد بعد استيفاء المتطلب.', failure: 'تعذر حفظ اختيارك الآن. حاول مرة أخرى.',
  },
  en: {
    eyebrow: 'Learning season', title: 'A short, fair learning season', refresh: 'Refresh', loading: 'Loading the season…', empty: 'There is no active learning season right now. The next season will appear here automatically.',
    progress: 'Your season progress', completed: 'completed quizzes', requirement: 'required to unlock one reward', claim: 'Choose this reward', claimed: 'Your reward is selected', choosing: 'Saving…', points: 'points', coins: 'coins', badge: 'season badge', ends: 'Ends', fairness: 'There is no paid prize or public ranking here; each learner chooses one reward after meeting the requirement.', failure: 'Your selection could not be saved. Please try again.',
  },
} as const;

function ChoiceIcon({ type }: { type: string }) {
  if (type === 'coins') return <Coins className="h-5 w-5" aria-hidden="true" />;
  if (type === 'badge') return <Award className="h-5 w-5" aria-hidden="true" />;
  return <CircleDollarSign className="h-5 w-5" aria-hidden="true" />;
}

export default function LearningSeasonPanel({ lang }: LearningSeasonPanelProps) {
  const t = copy[lang];
  const [season, setSeason] = React.useState<ActiveLearningSeason | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [claiming, setClaiming] = React.useState('');
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true); setError('');
    try { setSeason(await getActiveLearningSeason()); } catch { setError(t.failure); } finally { setLoading(false); }
  }, [t.failure]);

  React.useEffect(() => { void load(); }, [load]);
  const claim = async (choiceKey: string) => {
    if (!season?.season || season.claimedChoice) return;
    setClaiming(choiceKey); setError('');
    const result = await claimLearningSeasonReward(season.season.id, choiceKey);
    setClaiming('');
    if (!result?.claimed) { setError(result?.message || t.failure); return; }
    await load();
  };

  if (loading) return <div className="flex min-h-64 items-center justify-center text-sm font-bold text-slate-500"><RefreshCw className="me-2 h-5 w-5 animate-spin" />{t.loading}</div>;
  if (!season?.season) return <section className="rounded-[2rem] border border-dashed border-violet-400/35 bg-violet-500/5 p-8 text-center"><Sparkles className="mx-auto h-8 w-8 text-violet-500" /><p className="mx-auto mt-4 max-w-xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">{error || t.empty}</p></section>;

  const required = Math.max(1, ...season.choices.map((choice) => choice.requiredQuizzes));
  const progress = Math.min(100, Math.round((season.completedQuizzes / required) * 100));
  const endDate = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'long' }).format(new Date(season.season.endsAt));
  return (
    <section className="overflow-hidden rounded-[2rem] border border-violet-300/35 bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-600 p-1 shadow-xl shadow-violet-950/15">
      <div className="rounded-[1.9rem] bg-white/95 p-5 dark:bg-slate-950/95 sm:p-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">{t.eyebrow}</p><h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{season.season.nameAr || season.season.name}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{season.season.descriptionAr || season.season.description}</p></div>
          <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><RefreshCw className="h-4 w-4" />{t.refresh}</button>
        </header>
        <div className="mt-6 rounded-2xl bg-violet-500/10 p-4 dark:bg-violet-400/10">
          <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black text-violet-800 dark:text-violet-200">{t.progress}</p><p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{season.completedQuizzes} <span className="text-sm text-slate-500">{t.completed}</span></p></div><p className="text-end text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{required} {t.requirement}<br />{t.ends} {endDate}</p></div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/80 dark:bg-slate-900"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500" style={{ width: `${progress}%` }} /></div>
        </div>
        <p className="mt-5 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">{t.fairness}</p>
        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {season.choices.map((choice) => {
            const ready = season.completedQuizzes >= choice.requiredQuizzes;
            const selected = season.claimedChoice === choice.key;
            const label = choice.type === 'points' ? `${choice.amount} ${t.points}` : choice.type === 'coins' ? `${choice.amount} ${t.coins}` : t.badge;
            return <article key={choice.key} className={`rounded-2xl border p-4 ${selected ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60'}`}><div className="flex items-center justify-between"><span className="rounded-xl bg-violet-500/10 p-2 text-violet-600 dark:text-violet-300"><ChoiceIcon type={choice.type} /></span>{selected && <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-label={t.claimed} />}</div><p className="mt-4 text-lg font-black text-slate-900 dark:text-white">{label}</p><button type="button" disabled={!ready || Boolean(season.claimedChoice) || Boolean(claiming)} onClick={() => void claim(choice.key)} className="mt-4 min-h-11 w-full rounded-xl bg-slate-900 px-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 dark:disabled:bg-slate-700 dark:disabled:text-slate-400">{claiming === choice.key ? t.choosing : selected ? t.claimed : t.claim}</button></article>;
          })}
        </div>
      </div>
    </section>
  );
}
