import { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, Flame, Medal, Pencil, Sparkles, Star, Trophy } from 'lucide-react';
import { getRewardsSummary } from '../lib/db';
import { RewardBadge, RewardsSummary } from '../types';

const iconMap: Record<string, typeof Award> = {
  award: Award,
  sparkles: Sparkles,
  'book-open': BookOpen,
  trophy: Trophy,
  pencil: Pencil,
  flame: Flame,
};

interface RewardsSectionProps {
  userId: string;
  lang: 'ar' | 'en';
}

export default function RewardsSection({ userId, lang }: RewardsSectionProps) {
  const isAr = lang === 'ar';
  const [summary, setSummary] = useState<RewardsSummary>({ points: 0, level: 1, badges: [], recentEntries: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getRewardsSummary(userId).then((next) => {
      if (active) setSummary(next);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [userId]);

  const currentLevel = summary.currentLevel;
  const nextLevel = summary.nextLevel;
  const progress = useMemo(() => {
    if (!nextLevel) return 100;
    const start = currentLevel?.minPoints || 0;
    return Math.min(100, Math.max(0, ((summary.points - start) / Math.max(1, nextLevel.minPoints - start)) * 100));
  }, [currentLevel, nextLevel, summary.points]);

  const earnedBadges = summary.badges.filter((badge) => badge.earnedAt);
  const renderBadge = (badge: RewardBadge) => {
    const Icon = iconMap[badge.icon] || Award;
    const earned = Boolean(badge.earnedAt);
    return (
      <div key={badge.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${earned ? 'border-amber-400/30 bg-amber-400/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 opacity-50'}`}>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${earned ? 'bg-amber-400/20 text-amber-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 text-right" dir={isAr ? 'rtl' : 'ltr'}>
          <p className="truncate text-xs font-black text-slate-800 dark:text-white">{isAr ? badge.nameAr : badge.name}</p>
          <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500 dark:text-slate-400">{isAr ? badge.descriptionAr : badge.description}</p>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-4 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-white/80 to-amber-400/10 p-5 shadow-xl dark:from-purple-950/40 dark:via-slate-950 dark:to-amber-950/20" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-500">{isAr ? 'نظام التقدم' : 'Progress System'}</p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white"><Trophy className="h-5 w-5 text-amber-400" />{isAr ? 'جوائزك ونقاطك' : 'Your Rewards'}</h2>
        </div>
        <div className="rounded-2xl bg-slate-950 px-4 py-2 text-center text-white shadow-lg">
          <p className="text-[10px] font-bold text-amber-300">{isAr ? 'الرصيد' : 'Points'}</p>
          <p className="text-xl font-black text-white">{loading ? '—' : summary.points.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold text-slate-500">{isAr ? 'المستوى الحالي' : 'Current Level'}</p>
              <p className="mt-1 text-base font-black text-slate-900 dark:text-white">{isAr ? currentLevel?.nameAr || `المستوى ${summary.level}` : currentLevel?.name || `Level ${summary.level}`}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 text-xl font-black text-purple-500">{summary.level}</div>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-amber-400" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-500">
            <span>{summary.points.toLocaleString()} {isAr ? 'نقطة' : 'points'}</span>
            <span>{nextLevel ? `${nextLevel.minPoints.toLocaleString()} ${isAr ? 'للمستوى التالي' : 'to next level'}` : (isAr ? 'أعلى مستوى' : 'Top level')}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <p className="text-xs font-black text-slate-900 dark:text-white">{isAr ? 'كيف تكسب النقاط؟' : 'How to earn points'}</p>
          <div className="mt-3 space-y-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <p className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-400" />{isAr ? 'أجب عن الأسئلة واكمل الاختبارات' : 'Complete quizzes and answer questions'}</p>
            <p className="flex items-center gap-2"><Medal className="h-4 w-4 text-purple-400" />{isAr ? 'احصل على نتائج مرتفعة لجوائز إضافية' : 'Score high for bonus rewards'}</p>
            <p className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-cyan-400" />{isAr ? 'افتح شارات جديدة مع تقدمك' : 'Unlock badges as you progress'}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'الشارات' : 'Badges'}</h3>
          <span className="text-[10px] font-bold text-slate-500">{earnedBadges.length}/{summary.badges.length} {isAr ? 'مكتسبة' : 'earned'}</span>
        </div>
        {loading ? <div className="py-5 text-center text-xs font-bold text-slate-500">{isAr ? 'جاري تحميل الجوائز...' : 'Loading rewards...'}</div> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{summary.badges.map(renderBadge)}</div>}
      </div>

      {summary.recentEntries.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-black text-slate-900 dark:text-white">{isAr ? 'آخر المكافآت' : 'Recent rewards'}</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {summary.recentEntries.slice(0, 6).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl bg-slate-950/5 px-3 py-2 text-xs dark:bg-white/5">
                <span className="font-black text-emerald-500">+{entry.points}</span>
                <span className="truncate font-bold text-slate-600 dark:text-slate-300">{isAr ? 'إكمال اختبار' : 'Quiz completed'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
