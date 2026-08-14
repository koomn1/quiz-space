import React from 'react';
import { Check, Flame, RefreshCw, ShieldCheck } from 'lucide-react';
import { getLearningStreakStatus } from '../lib/db';
import type { LearningStreakStatus } from '../types';

type StreakMomentumCardProps = {
  lang: 'ar' | 'en';
  onCheckIn: () => Promise<void> | void;
  isCheckingIn: boolean;
};

const copy = {
  ar: {
    title: 'سلسلة تعلّم مرنة',
    days: 'يوم متتالي',
    protection: 'أيام حماية',
    protectionHint: 'تحمي السلسلة من غياب يوم واحد. تُكتسب كل 7 أيام، وبحد أقصى يومين.',
    checkIn: 'سجّل حضور اليوم',
    checked: 'تم تسجيل اليوم',
    loading: 'جاري تحميل السلسلة…',
    longest: 'أفضل سلسلة',
  },
  en: {
    title: 'Flexible learning streak',
    days: 'consecutive days',
    protection: 'protection days',
    protectionHint: 'A protection day saves one missed day. Earn one every 7 days, up to two.',
    checkIn: 'Check in today',
    checked: 'Checked in today',
    loading: 'Loading your streak…',
    longest: 'Best streak',
  },
} as const;

export default function StreakMomentumCard({ lang, onCheckIn, isCheckingIn }: StreakMomentumCardProps) {
  const t = copy[lang];
  const [status, setStatus] = React.useState<LearningStreakStatus | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try { setStatus(await getLearningStreakStatus()); } finally { setLoading(false); }
  }, []);

  React.useEffect(() => {
    void load();
    const refresh = () => { void load(); };
    window.addEventListener('quizspace-rewards-updated', refresh);
    return () => window.removeEventListener('quizspace-rewards-updated', refresh);
  }, [load]);

  const checkIn = async () => {
    await onCheckIn();
    await load();
  };

  if (loading && !status) return <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-100 p-5 text-sm font-bold text-orange-700 dark:border-orange-900/50 dark:from-orange-950/30 dark:to-amber-950/20 dark:text-orange-300"><RefreshCw className="me-2 inline h-4 w-4 animate-spin" />{t.loading}</div>;

  const streak = status ?? { currentStreak: 0, longestStreak: 0, protectionDays: 1, checkedInToday: false };
  return (
    <section className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-100 p-5 dark:border-orange-900/50 dark:from-orange-950/30 dark:to-amber-950/20" aria-label={t.title}>
      <div className="mb-4 flex items-center justify-between"><span className="rounded-2xl bg-white/80 p-3 text-orange-600 shadow-sm dark:bg-slate-900/50 dark:text-orange-300"><Flame className="h-6 w-6" aria-hidden="true" /></span><span className="text-xs font-black text-orange-700 dark:text-orange-300">{t.title}</span></div>
      <div className="flex items-end justify-between gap-3"><div><div className="text-4xl font-black text-orange-700 dark:text-orange-300">{streak.currentStreak}</div><p className="mt-1 text-xs font-bold text-orange-700/70 dark:text-orange-300/70">{t.days} · {t.longest} {streak.longestStreak}</p></div><div className="rounded-2xl bg-white/70 px-3 py-2 text-end dark:bg-slate-900/45"><div className="flex items-center gap-1 text-sm font-black text-emerald-700 dark:text-emerald-300"><ShieldCheck className="h-4 w-4" aria-hidden="true" />{streak.protectionDays}/2</div><p className="mt-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">{t.protection}</p></div></div>
      <p className="mt-4 text-[11px] leading-5 text-orange-800/75 dark:text-orange-200/75">{t.protectionHint}</p>
      <button type="button" onClick={() => void checkIn()} disabled={isCheckingIn || streak.checkedInToday} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-3 py-2.5 text-xs font-black text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
        {isCheckingIn ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}{streak.checkedInToday ? t.checked : t.checkIn}
      </button>
    </section>
  );
}
