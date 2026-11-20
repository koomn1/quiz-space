import React, { useCallback, useEffect, useState } from 'react';
import {
  claimDailyChallenge,
  claimDailyGift,
  claimWeeklyTask,
  getCurrentWeeklyTasks,
  getLearningStreakStatus,
  getRewardLedger,
  getRewardsSummary,
} from '../../lib/db';
import { applyCanonicalLearningStreak } from '../../lib/learningStreakPresentation';
import { RewardLedgerEntry, RewardsSummary, WeeklyTask } from '../../types';
import { PointsBalanceCard } from './PointsBalanceCard';
import { LevelProgressRail } from './LevelProgressRail';
import { DailyGiftMysteryBox } from './DailyGiftMysteryBox';
import { DailyChallengesList } from './DailyChallengesList';
import { WeeklyTasksBoard } from './WeeklyTasksBoard';
import { BadgesTrophyHall } from './BadgesTrophyHall';
import { VipLeaderboardPodium } from './VipLeaderboardPodium';
import { RewardLedgerSheet } from './RewardLedgerSheet';
import { AvatarCustomizerModal } from './AvatarCustomizerModal';
import { CosmoGuideCanvas } from '../mascot/CosmoGuideCanvas';
import { CosmoDialogueBubble } from '../mascot/CosmoDialogueBubble';
import { CosmoTourSpotlight } from '../mascot/CosmoTourSpotlight';
import { ArcadeHubModal } from '../games/ArcadeHubModal';

export interface RewardsDashboardProps {
  userId?: string;
  lang?: 'ar' | 'en';
  initialSummary?: RewardsSummary;
}

export const RewardsDashboard: React.FC<RewardsDashboardProps> = ({
  userId = 'default-user',
  lang = 'ar',
  initialSummary,
}) => {
  const isAr = lang === 'ar';

  // Core Data States
  const [summary, setSummary] = useState<RewardsSummary>(() => {
    if (initialSummary) return initialSummary;
    return {
      points: 0,
      coins: 0,
      level: 1,
      dailyStreak: 0,
      vipTier: 'none',
      badges: [],
      recentEntries: [],
      dailyChallenges: [],
    };
  });

  const [loading, setLoading] = useState(!initialSummary);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Weekly Tasks State
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [weeklyTasksLoading, setWeeklyTasksLoading] = useState(false);

  // Ledger State
  const [ledgerEntries, setLedgerEntries] = useState<RewardLedgerEntry[]>([]);
  const [ledgerOffset, setLedgerOffset] = useState(0);
  const [ledgerHasMore, setLedgerHasMore] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  // Modals & Interactive Guides
  const [isArcadeOpen, setIsArcadeOpen] = useState(false);
  const [isAvatarStoreOpen, setIsAvatarStoreOpen] = useState(false);
  const [showCosmoDialogue, setShowCosmoDialogue] = useState(true);
  const [showSpotlight, setShowSpotlight] = useState(false);

  // Loaders
  const loadSummary = useCallback(async () => {
    try {
      const [nextSummary, streak] = await Promise.all([
        getRewardsSummary(userId),
        getLearningStreakStatus(),
      ]);
      setSummary(applyCanonicalLearningStreak(nextSummary, streak.currentStreak));
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadWeeklyTasks = useCallback(async () => {
    setWeeklyTasksLoading(true);
    try {
      const tasks = await getCurrentWeeklyTasks();
      setWeeklyTasks(tasks);
    } catch {
      // Graceful fallback
    } finally {
      setWeeklyTasksLoading(false);
    }
  }, []);

  const loadLedger = useCallback(
    async (offset = 0) => {
      setLedgerLoading(true);
      try {
        const page = await getRewardLedger(userId, offset);
        setLedgerEntries(page.entries);
        setLedgerOffset(offset);
        setLedgerHasMore(page.hasMore);
      } catch {
        // Graceful fallback
      } finally {
        setLedgerLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    void loadSummary();
    void loadWeeklyTasks();
    void loadLedger(0);
  }, [loadSummary, loadWeeklyTasks, loadLedger]);

  // Daily Gift Claim
  const handleDailyGiftClaim = async () => {
    setActionLoading('gift');
    setActionMessage(null);
    try {
      const result = await claimDailyGift();
      setActionMessage(
        result.claimed
          ? isAr
            ? `مبروك! حصلت على ${result.points || 0} نقطة XP و${result.coins || 0} عملة كويز`
            : `Congratulations! Received ${result.points || 0} XP and ${result.coins || 0} Coins`
          : isAr
          ? 'تم جمع هدية اليوم مسبقاً'
          : 'Today’s gift already claimed'
      );
      await loadSummary();
      await loadLedger(0);
    } catch {
      setActionMessage(isAr ? 'تعذر جمع الهدية حالياً' : 'Could not claim gift right now');
    } finally {
      setActionLoading(null);
    }
  };

  // Daily Challenge Claim
  const handleClaimChallenge = async (challengeId: string) => {
    setActionLoading(challengeId);
    setActionMessage(null);
    try {
      const result = await claimDailyChallenge(challengeId);
      setActionMessage(
        result.claimed
          ? isAr
            ? `تم استلام مكافأة التحدي: +${result.points || 0} XP و+${result.coins || 0} عملة`
            : `Challenge reward claimed: +${result.points || 0} XP and +${result.coins || 0} Coins`
          : isAr
          ? 'تم جمع مكافأة هذا التحدي مسبقاً'
          : 'This challenge reward is already claimed'
      );
      await loadSummary();
      await loadLedger(0);
    } catch {
      setActionMessage(isAr ? 'أكمل شرط التحدي أولاً للمطالبة' : 'Complete the challenge first');
    } finally {
      setActionLoading(null);
    }
  };

  // Weekly Task Claim
  const handleClaimWeeklyTask = async (taskId: string) => {
    setActionLoading(`weekly:${taskId}`);
    setActionMessage(null);
    try {
      const result = await claimWeeklyTask(taskId);
      setActionMessage(
        result.claimed
          ? isAr
            ? `تم استلام جائزة المهمة الأسبوعية: +${result.points || 0} XP و+${result.coins || 0} عملة`
            : `Weekly task reward claimed: +${result.points || 0} XP and +${result.coins || 0} Coins`
          : isAr
          ? 'المهمة مكتملة أو تم استلامها مسبقاً'
          : 'Task already claimed or not complete'
      );
      await Promise.all([loadSummary(), loadWeeklyTasks(), loadLedger(0)]);
    } catch {
      setActionMessage(isAr ? 'تعذر استلام مكافأة المهمة الآن' : 'Could not claim weekly task');
    } finally {
      setActionLoading(null);
    }
  };

  // Mascot Guide Interaction
  const handleCosmoGuideAction = () => {
    setShowCosmoDialogue(false);
    setShowSpotlight(true);
  };

  return (
    <section
      data-testid="rewards-dashboard"
      dir={isAr ? 'rtl' : 'ltr'}
      className="relative space-y-6 rounded-3xl border border-[#2AC3BB]/30 bg-gradient-to-br from-[#072424]/95 via-[#031717]/95 to-[#072424]/95 p-4 sm:p-6 text-[#FCF6EE] shadow-[0_20px_50px_rgba(0,116,114,0.3)] backdrop-blur-2xl"
    >
      {/* Ambient Lighting Orbs */}
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#007472]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-1/2 h-72 w-72 rounded-full bg-[#2AC3BB]/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-[#EE8361]/10 blur-3xl" />

      {/* Global Action Message Banner */}
      {actionMessage && (
        <div className="relative z-20 flex items-center justify-between rounded-2xl border border-[#2AC3BB]/40 bg-[#007472]/40 px-4 py-3 text-xs font-black text-[#FCF6EE] shadow-lg animate-in fade-in slide-in-from-top-2">
          <span>{actionMessage}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-[#8BAEAD] hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* PILLAR 1: Points & Coins Balance Card */}
      <PointsBalanceCard
        points={summary.points}
        coins={summary.coins}
        onOpenLedger={() => setIsLedgerOpen(true)}
        onOpenArcade={() => setIsArcadeOpen(true)}
        onOpenStore={() => setIsAvatarStoreOpen(true)}
        lang={lang}
      />

      {/* PILLAR 2: Level Progress Rail */}
      <LevelProgressRail
        level={summary.level}
        points={summary.points}
        currentLevel={summary.currentLevel}
        nextLevel={summary.nextLevel}
        vipTier={summary.vipTier}
        currentVip={summary.currentVip}
        nextVip={summary.nextVip}
        lang={lang}
      />

      {/* PILLAR 3 & PILLAR 4: Daily Gift & Challenges / Weekly Tasks Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
        {/* Left Column: Mystery Box */}
        <div className="flex flex-col gap-6">
          <DailyGiftMysteryBox
            dailyStreak={summary.dailyStreak}
            claimed={Boolean(summary.dailyGift?.claimed)}
            canClaim={!summary.dailyGift?.claimed}
            onClaim={handleDailyGiftClaim}
            actionLoading={actionLoading === 'gift'}
            actionMessage={null}
            lang={lang}
          />
        </div>

        {/* Right Column: Daily Challenges List */}
        <div className="flex flex-col gap-6">
          <DailyChallengesList
            challenges={summary.dailyChallenges || []}
            onClaim={handleClaimChallenge}
            actionLoading={actionLoading}
            lang={lang}
          />
        </div>
      </div>

      {/* PILLAR 4 (Part 2): Weekly Tasks Board */}
      <WeeklyTasksBoard
        tasks={weeklyTasks}
        onClaimTask={handleClaimWeeklyTask}
        onRefresh={loadWeeklyTasks}
        loading={weeklyTasksLoading}
        claimingTaskId={actionLoading}
        lang={lang}
      />

      {/* PILLAR 5: Badges & Trophy Showcase */}
      <BadgesTrophyHall badges={summary.badges} lang={lang} />

      {/* PILLAR 6: VIP Leaderboard Podium */}
      <VipLeaderboardPodium lang={lang} />

      {/* Slide-over Ledger Sheet */}
      <RewardLedgerSheet
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        userId={userId}
        entries={ledgerEntries}
        offset={ledgerOffset}
        hasMore={ledgerHasMore}
        loading={ledgerLoading}
        onPaginate={loadLedger}
        onRefresh={() => void loadLedger(0)}
        lang={lang}
      />

      {/* Arcade Games Modal */}
      <ArcadeHubModal
        isOpen={isArcadeOpen}
        onClose={() => setIsArcadeOpen(false)}
        userId={userId}
        onUpdateRewards={() => {
          void loadSummary();
          void loadLedger(0);
        }}
      />

      {/* Avatar Frame Customizer & Store Modal */}
      <AvatarCustomizerModal
        isOpen={isAvatarStoreOpen}
        onClose={() => setIsAvatarStoreOpen(false)}
        userId={userId}
        userCoins={summary.coins}
        onCoinsUpdated={(newCoins) => {
          setSummary((prev) => ({ ...prev, coins: newCoins }));
          void loadLedger(0);
        }}
        lang={lang}
      />

      {/* Cosmo Mascot Guide Section (Bottom corner floating widget) */}
      <div className="relative mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-[#2AC3BB]/15 pt-6">
        <div className="flex items-center gap-3">
          {/* Cosmo 3D Mascot Canvas */}
          <div className="relative">
            <CosmoGuideCanvas
              state="guide"
              size={110}
              onClick={() => setShowCosmoDialogue((prev) => !prev)}
              className="drop-shadow-[0_8px_20px_rgba(42,195,187,0.4)]"
            />
          </div>

          {/* Cosmo Dialogue Bubble */}
          <CosmoDialogueBubble
            isOpen={showCosmoDialogue}
            title={isAr ? 'مرشد كويز سبيس (كوزمو)' : 'QuizSpace Guide (Cosmo)'}
            message={
              isAr
                ? 'مرحباً يا بطل! أضفنا ألعاب ألغاز جديدة في أركيد الألعاب لتحدي ذاكرتك وجمع المزيد من العملات والنقاط، هل ترغب في تجربتها؟'
                : 'Welcome champion! We added exciting new puzzle games in the Arcade Hub to test your skills and earn extra coins and XP. Want to check it out?'
            }
            actionLabel={isAr ? 'خدني هناك' : 'Take me there'}
            dismissLabel={isAr ? 'لاحقاً' : 'Later'}
            onAction={handleCosmoGuideAction}
            onDismiss={() => setShowCosmoDialogue(false)}
            arrowPosition={isAr ? 'bottom-right' : 'bottom-left'}
          />
        </div>
      </div>

      {/* Spotlight targeting Arcade Hub trigger */}
      <CosmoTourSpotlight
        isActive={showSpotlight}
        targetSelector='[data-testid="arcade-hub-trigger"]'
        onDismiss={() => setShowSpotlight(false)}
      >
        <div className="rounded-2xl border border-[#2AC3BB] bg-[#072424]/95 p-4 text-center text-[#FCF6EE] shadow-2xl backdrop-blur-md">
          <p className="text-xs font-black text-[#FBDFC7]">
            {isAr
              ? 'اضغط هنا لفتح أركيد الألعاب والألغاز وخوض التحديات!'
              : 'Click here to open Arcade Games & Puzzles!'}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowSpotlight(false);
                setIsArcadeOpen(true);
              }}
              className="rounded-xl bg-gradient-to-r from-[#007472] to-[#2AC3BB] px-4 py-1.5 text-xs font-black text-[#072424] shadow-md hover:scale-105 active:scale-95"
            >
              {isAr ? 'فتح الأركيد الآن' : 'Open Arcade Now'}
            </button>
            <button
              type="button"
              onClick={() => setShowSpotlight(false)}
              className="rounded-xl border border-white/20 px-3 py-1.5 text-xs font-bold text-[#8BAEAD] hover:text-white"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </CosmoTourSpotlight>
    </section>
  );
};

export default RewardsDashboard;
