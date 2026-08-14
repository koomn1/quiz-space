import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Coins, Crown, Flame, Gift, History, Medal, Pencil, RefreshCw, Sparkles, Star, Target, Trophy } from 'lucide-react';
import { claimDailyChallenge, claimDailyGift, claimWeeklyTask, getCurrentWeeklyTasks, getLearningStreakStatus, getRewardLedger, getRewardsSummary } from '../lib/db';
import { RewardBadge, RewardLedgerEntry, RewardsSummary, WeeklyTask } from '../types';
import { getRewardEntryDetail, getRewardEventLabel } from '../lib/rewardPresentation';
import { applyCanonicalLearningStreak } from '../lib/learningStreakPresentation';
import WeeklyVipLeaderboard from './WeeklyVipLeaderboard';

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
  const [ledgerEntries, setLedgerEntries] = useState<RewardLedgerEntry[]>([]);
  const [ledgerOffset, setLedgerOffset] = useState(0);
  const [ledgerHasMore, setLedgerHasMore] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [weeklyTasksLoading, setWeeklyTasksLoading] = useState(false);

  const loadLedger = useCallback(async (offset = 0) => {
    setLedgerLoading(true);
    try {
      const page = await getRewardLedger(userId, offset);
      setLedgerEntries(page.entries);
      setLedgerOffset(offset);
      setLedgerHasMore(page.hasMore);
    } catch {
      setActionMessage(isAr ? 'تعذر تحميل سجل المكافآت الآن' : 'Could not load your reward ledger right now');
    } finally {
      setLedgerLoading(false);
    }
  }, [isAr, userId]);

  const loadWeeklyTasks = useCallback(async () => {
    setWeeklyTasksLoading(true);
    try {
      setWeeklyTasks(await getCurrentWeeklyTasks());
    } catch {
      setActionMessage(isAr ? 'تعذر تحميل المهام الأسبوعية الآن' : 'Could not load weekly tasks right now');
    } finally {
      setWeeklyTasksLoading(false);
    }
  }, [isAr]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [next, streak] = await Promise.all([
        getRewardsSummary(userId),
        getLearningStreakStatus(),
      ]);
      setSummary(applyCanonicalLearningStreak(next, streak.currentStreak));
    } catch {
      setActionMessage(isAr ? 'تعذر تحميل سلسلة التعلم الآن' : 'Could not load your learning streak right now');
    } finally {
      setLoading(false);
    }
  }, [isAr, userId]);

  useEffect(() => {
    let active = true;
    void loadSummary();
    return () => { active = false; };
  }, [loadSummary]);

  useEffect(() => {
    void loadLedger(0);
  }, [loadLedger]);

  useEffect(() => {
    void loadWeeklyTasks();
  }, [loadWeeklyTasks]);

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

  const handleWeeklyTask = async (taskId: string) => {
    setActionLoading(`weekly:${taskId}`);
    setActionMessage(null);
    try {
      const result = await claimWeeklyTask(taskId);
      setActionMessage(result.claimed
        ? (isAr ? `تمت إضافة ${result.points || 0} نقطة و${result.coins || 0} عملة للمهمة الأسبوعية.` : `Added ${result.points || 0} points and ${result.coins || 0} coins for the weekly task.`)
        : (isAr ? 'تم جمع مكافأة هذه المهمة مسبقاً أو لم يكتمل شرطها بعد.' : 'This task is already claimed or not complete yet.'));
      await Promise.all([loadSummary(), loadWeeklyTasks(), loadLedger(0)]);
    } catch {
      setActionMessage(isAr ? 'تعذر جمع مكافأة المهمة الأسبوعية الآن' : 'Could not claim this weekly task reward right now');
    } finally {
      setActionLoading(null);
    }
  };

  // Auto-claim completed challenges when the summary loads
  const autoClaimCompleted = async () => {
    if (!summary.dailyChallenges || summary.dailyChallenges.length === 0) return;
    for (const challenge of summary.dailyChallenges) {
      if (!challenge.claimed) {
        try {
          const result = await claimDailyChallenge(challenge.id);
          if (result.claimed) {
            setActionMessage(isAr ? `🎉 تمت إضافة مكافأة «${challenge.nameAr}» تلقائياً: +${result.points || 0} نقطة` : `🎉 Auto-claimed "${challenge.name}": +${result.points || 0} points`);
            await loadSummary();
            break; // Claim one at a time
          }
        } catch { /* not complete yet */ }
      }
    }
  };

  useEffect(() => {
    if (!loading && summary.dailyChallenges && summary.dailyChallenges.some(c => !c.claimed)) {
      // Wait 2 seconds for the user to see the UI first, then auto-claim
      const timer = setTimeout(() => autoClaimCompleted(), 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, summary.dailyChallenges]);

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

        <div className="rounded-2xl border border-teal-400/25 bg-teal-500/5 p-4 md:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><Target className="h-4 w-4 text-teal-500" />{isAr ? 'مهام الأسبوع' : 'Weekly tasks'}</h3><p className="mt-1 text-[10px] font-bold text-slate-500">{isAr ? 'تُحدّث تلقائياً من نشاطك؛ اجمع المكافأة مرة واحدة بعد الإكمال.' : 'Progress updates from your activity; claim each reward once after completion.'}</p></div><button type="button" onClick={() => void loadWeeklyTasks()} disabled={weeklyTasksLoading} className="flex min-h-11 items-center gap-1.5 rounded-xl border border-teal-300/50 px-3 text-xs font-black text-teal-700 transition-colors hover:bg-teal-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-teal-300"><RefreshCw className={`h-3.5 w-3.5 ${weeklyTasksLoading ? 'animate-spin' : ''}`} />{isAr ? 'تحديث' : 'Refresh'}</button></div>
          {weeklyTasks.length === 0 && !weeklyTasksLoading ? <p className="py-5 text-center text-xs font-bold text-slate-500">{isAr ? 'لا توجد مهام أسبوعية متاحة الآن.' : 'No weekly tasks are available right now.'}</p> : <div className="grid gap-2 md:grid-cols-3">{weeklyTasks.map((task) => {
            const complete = task.progress >= task.target;
            const claimed = Boolean(task.claimedAt);
            const progressPercent = Math.min(100, Math.round((task.progress / Math.max(1, task.target)) * 100));
            return <div key={task.id} className="rounded-xl border border-teal-200/70 bg-white/70 p-3 dark:border-teal-900/70 dark:bg-slate-950/40"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-black text-slate-900 dark:text-white">{isAr ? task.nameAr : task.name}</p><p className="mt-1 min-h-8 text-[10px] font-bold leading-relaxed text-slate-500">{isAr ? task.descriptionAr : task.description}</p></div>{claimed ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <Target className={`h-4 w-4 shrink-0 ${complete ? 'text-teal-500' : 'text-slate-400'}`} />}</div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-teal-500 transition-[width] duration-200" style={{ width: `${progressPercent}%` }} /></div><div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500"><span>{task.progress}/{task.target}</span><span className="text-amber-600 dark:text-amber-400">+{task.pointsReward} · +{task.coinsReward} {isAr ? 'عملة' : 'coins'}</span></div><button type="button" onClick={() => void handleWeeklyTask(task.id)} disabled={!complete || claimed || actionLoading === `weekly:${task.id}`} className="mt-3 min-h-11 w-full rounded-lg bg-teal-600 px-3 text-[10px] font-black text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:opacity-50">{claimed ? (isAr ? 'تم الجمع' : 'Claimed') : actionLoading === `weekly:${task.id}` ? (isAr ? 'جارٍ الجمع...' : 'Claiming...') : complete ? (isAr ? 'اجمع المكافأة' : 'Claim reward') : (isAr ? 'أكمل المهمة أولاً' : 'Complete task first')}</button></div>;
          })}</div>}
        </div>

        <WeeklyVipLeaderboard lang={lang} />

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

      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><History className="h-4 w-4 text-purple-500" />{isAr ? 'سجل المكافآت' : 'Reward ledger'}</h3>
            <p className="mt-1 text-[10px] font-bold text-slate-500">{isAr ? 'كل تغيير في نقاطك موضح بمصدره وتاريخه.' : 'Every points change is shown with its source and date.'}</p>
          </div>
          <button type="button" onClick={() => void loadLedger(ledgerOffset)} disabled={ledgerLoading} className="flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><RefreshCw className={`h-3.5 w-3.5 ${ledgerLoading ? 'animate-spin' : ''}`} />{isAr ? 'تحديث' : 'Refresh'}</button>
        </div>
        {ledgerEntries.length === 0 && !ledgerLoading ? <p className="py-5 text-center text-xs font-bold text-slate-500">{isAr ? 'لا توجد حركات مكافآت مسجلة حتى الآن.' : 'No reward activity has been recorded yet.'}</p> : <div className="space-y-2">{ledgerEntries.map((entry) => {
          const detail = getRewardEntryDetail(entry.metadata, isAr);
          const positive = entry.points >= 0;
          return <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3 text-xs dark:border-slate-800 dark:bg-white/5"><div className="min-w-0"><p className="truncate font-black text-slate-800 dark:text-white">{getRewardEventLabel(entry.eventType, isAr)}</p>{detail && <p className="mt-0.5 truncate text-[10px] font-bold text-slate-500">{detail}</p>}<p className="mt-1 text-[10px] font-bold text-slate-400">{new Date(entry.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p></div><div className="shrink-0 text-left"><p className={`font-black ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{positive ? '+' : ''}{entry.points.toLocaleString()} {isAr ? 'نقطة' : 'points'}</p>{entry.coins ? <p className="mt-1 font-black text-amber-600 dark:text-amber-400">+{entry.coins.toLocaleString()} {isAr ? 'عملة' : 'coins'}</p> : null}</div></div>;
        })}</div>}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={() => void loadLedger(Math.max(0, ledgerOffset - 20))} disabled={ledgerLoading || ledgerOffset === 0} className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-black text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4 rtl:rotate-180" />{isAr ? 'الأحدث' : 'Newer'}</button>
          <span className="text-[10px] font-bold text-slate-400">{ledgerEntries.length > 0 ? (isAr ? `حركات ${ledgerOffset + 1}–${ledgerOffset + ledgerEntries.length}` : `Entries ${ledgerOffset + 1}–${ledgerOffset + ledgerEntries.length}`) : ''}</span>
          <button type="button" onClick={() => void loadLedger(ledgerOffset + 20)} disabled={ledgerLoading || !ledgerHasMore} className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-black text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800">{isAr ? 'الأقدم' : 'Older'}<ChevronLeft className="h-4 w-4 rtl:rotate-180" /></button>
        </div>
      </div>
    </section>
  );
}
