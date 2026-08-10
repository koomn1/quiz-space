import { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, CheckCircle2, Coins, Crown, Flame, Gift, Medal, Pencil, Sparkles, Star, Target, Trophy } from 'lucide-react';
import { claimDailyChallenge, claimDailyGift, getRewardsSummary } from '../lib/db';
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
  const [summary, setSummary] = useState<RewardsSummary>({ points: 0, coins: 0, level: 1, dailyStreak: 0, vipTier: 'none', badges: [], recentEntries: [], dailyChallenges: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    const next = await getRewardsSummary(userId);
    setSummary(next);
    setLoading(false);
  };

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

  const handleDailyGift = async () => {
    setActionLoading('gift');
    setActionMessage(null);
    try {
      const result = await claimDailyGift();
      setActionMessage(result.claimed ? (isAr ? `حصلت على ${result.points || 0} نقطة و${result.coins || 0} عملة` : `You received ${result.points || 0} points and ${result.coins || 0} coins`) : (isAr ? 'تم جمع هدية اليوم مسبقاً' : 'Today’s gift is already claimed'));
      await loadSummary();
    } catch (error) {
      setActionMessage(isAr ? 'تعذر جمع الهدية حالياً' : 'Could not claim the gift right now');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChallenge = async (challengeId: string) => {
    setActionLoading(challengeId);
    setActionMessage(null);
    try {
      const result = await claimDailyChallenge(challengeId);
      setActionMessage(result.claimed ? (isAr ? `تمت إضافة ${result.points || 0} نقطة و${result.coins || 0} عملة` : `Added ${result.points || 0} points and ${result.coins || 0} coins`) : (isAr ? 'تم جمع مكافأة هذا التحدي مسبقاً' : 'This challenge reward is already claimed'));
      await loadSummary();
    } catch (error) {
      setActionMessage(isAr ? 'أكمل شرط التحدي أولاً' : 'Complete the challenge first');
    } finally {
      setActionLoading(null);
    }
  };

  const currentLevel = summary.currentLevel;
  const nextLevel = summary.nextLevel;
  const progress = useMemo(() => {
    if (!nextLevel) return 100;
    const start = currentLevel?.minPoints || 0;
    return Math.min(100, Math.max(0, ((summary.points - start) / Math.max(1, nextLevel.minPoints - start)) * 100));
  }, [currentLevel, nextLevel, summary.points]);

  const earnedBadges = summary.badges.filter((badge) => badge.earnedAt);
  const vipName = isAr ? (summary.currentVip?.nameAr || 'مستكشف') : (summary.currentVip?.name || 'Explorer');
  const vipProgress = summary.nextVip ? Math.min(100, Math.max(0, ((summary.points - (summary.currentVip?.minPoints || 0)) / Math.max(1, summary.nextVip.minPoints - (summary.currentVip?.minPoints || 0))) * 100)) : 100;
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
        <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/15 to-purple-500/10 p-4 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-500"><Crown className="h-6 w-6" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">{isAr ? 'مستوى العضوية' : 'Membership tier'}</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">{vipName}</p>
                <p className="text-[11px] font-bold text-slate-500">{summary.currentVip ? `${summary.currentVip.pointsMultiplier.toFixed(2)}× ${isAr ? 'مضاعف النقاط' : 'points multiplier'}` : ''}</p>
              </div>
            </div>
            <div className="text-center"><p className="text-[10px] font-bold text-slate-500">{isAr ? 'العملات' : 'Coins'}</p><p className="flex items-center gap-1 text-xl font-black text-amber-500"><Coins className="h-5 w-5" />{summary.coins.toLocaleString()}</p></div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-purple-500" style={{ width: `${vipProgress}%` }} /></div>
          <p className="mt-2 text-[10px] font-bold text-slate-500">{summary.nextVip ? `${summary.nextVip.minPoints - summary.points} ${isAr ? 'نقطة للوصول إلى' : 'points to'} ${isAr ? summary.nextVip.nameAr : summary.nextVip.name}` : (isAr ? 'وصلت إلى أعلى مستوى VIP' : 'Highest VIP tier reached')}</p>
        </div>

        <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-4 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3"><Gift className="h-6 w-6 text-cyan-500" /><div><h3 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'هدية الدخول اليومية' : 'Daily login gift'}</h3><p className="text-[11px] font-bold text-slate-500">{isAr ? `سلسلة حضور: ${summary.dailyStreak} يوم` : `${summary.dailyStreak}-day streak`}</p></div></div>
            <button type="button" onClick={handleDailyGift} disabled={Boolean(summary.dailyGift?.claimed) || actionLoading === 'gift'} className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{actionLoading === 'gift' ? '…' : summary.dailyGift?.claimed ? (isAr ? 'تم الجمع' : 'Claimed') : (isAr ? 'اجمع الهدية' : 'Claim gift')}</button>
          </div>
          {actionMessage && <p className="mt-3 text-xs font-black text-cyan-700 dark:text-cyan-300">{actionMessage}</p>}
        </div>

        <div className="rounded-2xl border border-purple-400/25 bg-purple-500/5 p-4 md:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><Target className="h-4 w-4 text-purple-500" />{isAr ? 'تحديات اليوم' : 'Today’s challenges'}</h3><span className="text-[10px] font-bold text-slate-500">{isAr ? 'تنافس، أكمل، واجمع' : 'Compete, complete, collect'}</span></div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">{(summary.dailyChallenges || []).map((challenge) => <div key={challenge.id} className="rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-black text-slate-900 dark:text-white">{isAr ? challenge.nameAr : challenge.name}</p><p className="mt-1 text-[10px] font-bold text-slate-500">{isAr ? challenge.descriptionAr : challenge.description}</p></div>{challenge.claimed ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <Target className="h-4 w-4 shrink-0 text-purple-400" />}</div><div className="mt-3 flex items-center justify-between gap-2"><span className="text-[10px] font-black text-amber-500">+{challenge.pointsReward} XP · +{challenge.coinsReward} {isAr ? 'عملة' : 'coins'}</span><button type="button" onClick={() => handleChallenge(challenge.id)} disabled={Boolean(challenge.claimed) || actionLoading === challenge.id} className="rounded-lg bg-purple-500 px-2.5 py-1.5 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{challenge.claimed ? (isAr ? 'تم' : 'Done') : actionLoading === challenge.id ? '…' : (isAr ? 'مطالبة' : 'Claim')}</button></div></div>)}</div>
        </div>
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
