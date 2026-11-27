import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  Gamepad2,
  Gift,
  RotateCw,
  Brain,
  Grid,
  Trophy,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  Zap,
  Flame,
  Award,
} from 'lucide-react';
import { QuizSpacePointsToken, QuizSpaceCoinsToken, QuizSpaceXpToken } from '../brand/QuizSpaceTokens';
import { Cosmo3DGuide } from '../cosmo/Cosmo3DGuide';
import { MysteryChestRoom } from './MysteryChestRoom';
import { DailySpinWheel } from '../games/DailySpinWheel';
import { WordMatrixPuzzle } from '../games/WordMatrixPuzzle';
import { CosmicMatchGame } from '../games/CosmicMatchGame';
import { VipLeaderboardPodium } from './VipLeaderboardPodium';
import { LevelProgressRail } from './LevelProgressRail';
import { getRewardsSummary, getUserProfileStats } from '../../lib/db';
import { RewardsSummary } from '../../types';

export type ArcadeRoom = 'lobby' | 'chest' | 'spin' | 'matrix' | 'memory' | 'leaderboard';

interface ArcadeHubProps {
  userId: string;
  onOpenStore?: () => void;
  initialRoom?: ArcadeRoom;
}

export const ArcadeHub: React.FC<ArcadeHubProps> = ({
  userId,
  onOpenStore,
  initialRoom = 'lobby',
}) => {
  const [currentRoom, setCurrentRoom] = useState<ArcadeRoom>(initialRoom);
  const [summary, setSummary] = useState<RewardsSummary | null>(null);
  const [userCoins, setUserCoins] = useState<number>(0);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [userXp, setUserXp] = useState<number>(0);
  const [userLevel, setUserLevel] = useState<number>(1);
  const [isDailyClaimed, setIsDailyClaimed] = useState<boolean>(false);
  const roomContainerRef = useRef<HTMLDivElement>(null);

  // Load user reward stats
  useEffect(() => {
    if (!userId) return;
    Promise.all([
      getRewardsSummary(userId).catch(() => null),
      getUserProfileStats(userId).catch(() => null),
    ]).then(([sum, stats]) => {
      if (sum) {
        setSummary(sum);
        setIsDailyClaimed(Boolean(sum.dailyGift?.claimed));
      }
      const effectivePts = Number(sum?.points || stats?.points || 0);
      const effectiveCoins = Number(sum?.coins || stats?.coins || 0);
      const effectiveXp = Number(stats?.xp || 0);
      const effectiveLvl = Number(sum?.level || stats?.rewardLevel || 1);

      setUserPoints(effectivePts);
      setUserCoins(effectiveCoins);
      setUserXp(effectiveXp);
      setUserLevel(effectiveLvl);
    });
  }, [userId]);

  // Smooth GSAP Room Transition
  const navigateToRoom = (newRoom: ArcadeRoom) => {
    if (roomContainerRef.current) {
      gsap.to(roomContainerRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          setCurrentRoom(newRoom);
          gsap.fromTo(
            roomContainerRef.current,
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
          );
        },
      });
    } else {
      setCurrentRoom(newRoom);
    }
  };

  const handleRewardClaimed = (pts: number, coins: number) => {
    setUserPoints((prev) => prev + pts);
    setUserCoins((prev) => prev + coins);
    setIsDailyClaimed(true);
  };

  return (
    <div className="w-full min-h-[700px] select-none text-[#FCF6EE]">
      {/* Top Arcade Player HUD Bar */}
      <div className="sticky top-0 z-30 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2AC3BB]/30 bg-[#031717]/90 px-4 py-3 backdrop-blur-xl shadow-lg">
        {/* Back / Title */}
        <div className="flex items-center gap-3">
          {currentRoom !== 'lobby' ? (
            <button
              onClick={() => navigateToRoom('lobby')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2AC3BB]/20 px-3 py-1.5 text-xs font-black text-[#2AC3BB] hover:bg-[#2AC3BB]/30 transition active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>الردهة الرئيسية</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-[#2AC3BB]">
              <Gamepad2 className="h-5 w-5 text-[#EE8361]" />
              <span>ردهة ألعاب ومكافآت QuizSpace</span>
            </div>
          )}
        </div>

        {/* Live Player Tokens & Currency */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Level Pill */}
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#007472]/60 bg-[#007472]/30 px-3 py-1 text-xs font-black text-[#FCF6EE]">
            <QuizSpaceXpToken className="h-3.5 w-3.5" />
            <span>Lv.{userLevel}</span>
          </div>

          {/* Points Pill */}
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#2AC3BB]/40 bg-[#2AC3BB]/15 px-3 py-1 text-xs font-black text-[#2AC3BB]">
            <QuizSpacePointsToken className="h-3.5 w-3.5" />
            <span className="font-mono">{userPoints.toLocaleString()}</span>
            <span className="text-xs text-[#2AC3BB]/70">نقطة</span>
          </div>

          {/* Coins Pill */}
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-300">
            <QuizSpaceCoinsToken className="h-3.5 w-3.5" />
            <span className="font-mono">{userCoins.toLocaleString()}</span>
            <span className="text-xs text-amber-300/70">عملة</span>
          </div>

          {/* Store button */}
          {onOpenStore && (
            <button
              onClick={onOpenStore}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#EE8361] to-[#f49d82] px-3 py-1.5 text-xs font-black text-[#031717] hover:brightness-110 active:scale-95 transition shadow-sm cursor-pointer"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>المتجر</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Room Viewport (Dedicated Screen per Room) */}
      <div ref={roomContainerRef} className="w-full transition-all">
        {/* ROOM 1: ARCADE LOBBY */}
        {currentRoom === 'lobby' && (
          <div className="space-y-6">
            {/* 3D Cosmo Character Guide */}
            <Cosmo3DGuide
              onNavigateToTarget={(target) => navigateToRoom(target)}
              targetRoom="chest"
              isDailyClaimed={isDailyClaimed}
            />

            {/* Game Station Portals (Arcade Machines) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Station 1: Daily Mystery Chest */}
              <div
                onClick={() => navigateToRoom('chest')}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#2AC3BB]/30 bg-gradient-to-br from-[#072424]/90 to-[#031717]/95 p-6 shadow-xl transition-all hover:scale-[1.02] hover:border-[#2AC3BB] hover:shadow-2xl hover:shadow-[#2AC3BB]/20 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2AC3BB]/30 to-[#007472]/40 text-[#2AC3BB] group-hover:scale-110 transition-transform">
                    <Gift className="h-7 w-7 text-[#2AC3BB]" />
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      isDailyClaimed
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-[#2AC3BB]/20 text-[#2AC3BB] animate-pulse'
                    }`}
                  >
                    {isDailyClaimed ? 'تم الفتح اليوم' : 'متاح الآن! 🎁'}
                  </span>
                </div>

                <div className="mt-5 space-y-1.5">
                  <h3 className="text-xl font-black text-[#FCF6EE]">صندوق الغموض اليومي</h3>
                  <p className="text-xs font-semibold text-slate-300 leading-relaxed">
                    افتح صندوق اليوم لكسب نقاط وعملات إضافية بضربات متتالية.
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-xs font-bold text-[#2AC3BB] group-hover:translate-x-1 transition-transform">
                    ادخل غرفة الصندوق 🚀
                  </span>
                  <div className="flex items-center gap-1 text-xs text-amber-300 font-mono">
                    <QuizSpaceCoinsToken className="h-3.5 w-3.5" />
                    <span>+100 ~ 300</span>
                  </div>
                </div>
              </div>

              {/* Station 2: Cosmic Spin Wheel */}
              <div
                onClick={() => navigateToRoom('spin')}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#EE8361]/30 bg-gradient-to-br from-[#072424]/90 to-[#031717]/95 p-6 shadow-xl transition-all hover:scale-[1.02] hover:border-[#EE8361] hover:shadow-2xl hover:shadow-[#EE8361]/20 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EE8361]/30 to-[#007472]/40 text-[#EE8361] group-hover:rotate-45 transition-transform duration-500">
                    <RotateCw className="h-7 w-7 text-[#EE8361]" />
                  </div>
                  <span className="rounded-full bg-[#EE8361]/20 px-3 py-1 text-xs font-black text-[#EE8361]">
                    عجلة الحظ 🎡
                  </span>
                </div>

                <div className="mt-5 space-y-1.5">
                  <h3 className="text-xl font-black text-[#FCF6EE]">عجلة الحظ الكونية</h3>
                  <p className="text-xs font-semibold text-slate-300 leading-relaxed">
                    دوّر العجلة واربح عملات ذهبية، دروع حماية الستريك، ومضاعفات نقاط.
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-xs font-bold text-[#EE8361] group-hover:translate-x-1 transition-transform">
                    ابدأ التدوير الآن 🎡
                  </span>
                  <div className="flex items-center gap-1 text-xs text-[#2AC3BB] font-mono">
                    <QuizSpaceXpToken className="h-3.5 w-3.5" />
                    <span>جوائز متنوعة</span>
                  </div>
                </div>
              </div>

              {/* Station 3: Arabic Word Matrix Puzzle */}
              <div
                onClick={() => navigateToRoom('matrix')}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#2AC3BB]/30 bg-gradient-to-br from-[#072424]/90 to-[#031717]/95 p-6 shadow-xl transition-all hover:scale-[1.02] hover:border-[#2AC3BB] hover:shadow-2xl hover:shadow-[#2AC3BB]/20 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2AC3BB]/30 to-[#007472]/40 text-[#2AC3BB] group-hover:scale-110 transition-transform">
                    <Grid className="h-7 w-7 text-[#2AC3BB]" />
                  </div>
                  <span className="rounded-full bg-[#2AC3BB]/20 px-3 py-1 text-xs font-black text-[#2AC3BB]">
                    لعبة ذكاء 🧩
                  </span>
                </div>

                <div className="mt-5 space-y-1.5">
                  <h3 className="text-xl font-black text-[#FCF6EE]">مصفوفة الكلمات الذكية</h3>
                  <p className="text-xs font-semibold text-slate-300 leading-relaxed">
                    اربط الحروف في المصفوفة، اعثر على الكلمات الأكاديمية واجمع حتى 100 XP.
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-xs font-bold text-[#2AC3BB] group-hover:translate-x-1 transition-transform">
                    العب المصفوفة 🧩
                  </span>
                  <div className="flex items-center gap-1 text-xs text-[#2AC3BB] font-mono">
                    <QuizSpaceXpToken className="h-3.5 w-3.5" />
                    <span>+100 XP</span>
                  </div>
                </div>
              </div>

              {/* Station 4: Cosmic Memory Match */}
              <div
                onClick={() => navigateToRoom('memory')}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#072424]/90 to-[#031717]/95 p-6 shadow-xl transition-all hover:scale-[1.02] hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-500/20 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/30 to-[#007472]/40 text-amber-300 group-hover:scale-110 transition-transform">
                    <Brain className="h-7 w-7 text-amber-300" />
                  </div>
                  <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-300">
                    تحدي الذاكرة 🧠
                  </span>
                </div>

                <div className="mt-5 space-y-1.5">
                  <h3 className="text-xl font-black text-[#FCF6EE]">الذاكرة الفضائية</h3>
                  <p className="text-xs font-semibold text-slate-300 leading-relaxed">
                    طابق البطاقات في أسرع وقت مع الحفاظ على الكومبو لمضاعفة المكافأة.
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-xs font-bold text-amber-300 group-hover:translate-x-1 transition-transform">
                    العب الذاكرة 🧠
                  </span>
                  <div className="flex items-center gap-1 text-xs text-amber-300 font-mono">
                    <QuizSpaceCoinsToken className="h-3.5 w-3.5" />
                    <span>+60 عملة</span>
                  </div>
                </div>
              </div>

              {/* Station 5: VIP Leaderboard & Levels */}
              <div
                onClick={() => navigateToRoom('leaderboard')}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-[#072424]/90 to-[#031717]/95 p-6 shadow-xl transition-all hover:scale-[1.02] hover:border-purple-400 hover:shadow-2xl hover:shadow-purple-500/20 cursor-pointer sm:col-span-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/30 to-[#007472]/40 text-purple-300 group-hover:scale-110 transition-transform">
                    <Trophy className="h-7 w-7 text-purple-300" />
                  </div>
                  <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-black text-purple-300">
                    رتب VIP ومسار 100 ليفل 🏆
                  </span>
                </div>

                <div className="mt-5 space-y-1.5">
                  <h3 className="text-xl font-black text-[#FCF6EE]">لوحة المتصدرين ومسار المستويات</h3>
                  <p className="text-xs font-semibold text-slate-300 leading-relaxed">
                    استعرض ترتيبك بين أبطال المنصة، افتح رتب النخبة VIP ومكافآت كل ليفل حتى 100.
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-xs font-bold text-purple-300 group-hover:translate-x-1 transition-transform">
                    عرض لوحة الصدارة والمسار 🏆
                  </span>
                  <span className="text-xs font-bold text-slate-400">تحديث أسبوعي تلقائي</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ROOM 2: DEDICATED MYSTERY CHEST ROOM */}
        {currentRoom === 'chest' && (
          <MysteryChestRoom
            userId={userId}
            isDailyClaimed={isDailyClaimed}
            onBackToLobby={() => navigateToRoom('lobby')}
            onRewardClaimed={handleRewardClaimed}
            streakDays={summary?.dailyStreak || 1}
          />
        )}

        {/* ROOM 3: DEDICATED SPIN WHEEL ROOM */}
        {currentRoom === 'spin' && (
          <div className="relative mx-auto w-full max-w-3xl py-6 flex flex-col items-center">
            <button
              onClick={() => navigateToRoom('lobby')}
              className="self-start mb-6 inline-flex items-center gap-2 rounded-2xl border border-[#2AC3BB]/30 bg-[#072424]/80 px-4 py-2.5 text-xs font-black text-[#FCF6EE] hover:bg-[#007472] transition shadow-md cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>العودة لردهة الألعاب ↩️</span>
            </button>
            <DailySpinWheel
              userId={userId}
              onClose={() => navigateToRoom('lobby')}
              onUpdateCoins={(earned) => setUserCoins((prev) => prev + earned)}
            />
          </div>
        )}

        {/* ROOM 4: DEDICATED WORD MATRIX ROOM */}
        {currentRoom === 'matrix' && (
          <div className="relative mx-auto w-full max-w-4xl py-6 flex flex-col items-center">
            <button
              onClick={() => navigateToRoom('lobby')}
              className="self-start mb-6 inline-flex items-center gap-2 rounded-2xl border border-[#2AC3BB]/30 bg-[#072424]/80 px-4 py-2.5 text-xs font-black text-[#FCF6EE] hover:bg-[#007472] transition shadow-md cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>العودة لردهة الألعاب ↩️</span>
            </button>
            <WordMatrixPuzzle
              userId={userId}
              onClose={() => navigateToRoom('lobby')}
              onComplete={(rew) => {
                setUserCoins((prev) => prev + rew.coins);
                setUserXp((prev) => prev + rew.xp);
              }}
            />
          </div>
        )}

        {/* ROOM 5: DEDICATED MEMORY MATCH ROOM */}
        {currentRoom === 'memory' && (
          <div className="relative mx-auto w-full max-w-4xl py-6 flex flex-col items-center">
            <button
              onClick={() => navigateToRoom('lobby')}
              className="self-start mb-6 inline-flex items-center gap-2 rounded-2xl border border-[#2AC3BB]/30 bg-[#072424]/80 px-4 py-2.5 text-xs font-black text-[#FCF6EE] hover:bg-[#007472] transition shadow-md cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>العودة لردهة الألعاب ↩️</span>
            </button>
            <CosmicMatchGame
              userId={userId}
              onClose={() => navigateToRoom('lobby')}
              onComplete={(rew) => {
                setUserCoins((prev) => prev + rew.coins);
                setUserXp((prev) => prev + rew.xp);
              }}
            />
          </div>
        )}

        {/* ROOM 6: DEDICATED VIP LEADERBOARD & LEVELS ROOM */}
        {currentRoom === 'leaderboard' && (
          <div className="relative mx-auto w-full max-w-5xl py-6 space-y-8">
            <button
              onClick={() => navigateToRoom('lobby')}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#2AC3BB]/30 bg-[#072424]/80 px-4 py-2.5 text-xs font-black text-[#FCF6EE] hover:bg-[#007472] transition shadow-md cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>العودة لردهة الألعاب ↩️</span>
            </button>

            {summary && (
              <div className="space-y-8">
                <LevelProgressRail
                  currentLevel={userLevel}
                  currentPoints={userPoints}
                  levels={summary.currentLevel ? [summary.currentLevel] : []}
                  onOpenStore={onOpenStore}
                />
                <VipLeaderboardPodium
                  currentUserId={userId}
                  currentUserVipTier={summary.vipTier}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
