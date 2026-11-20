import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import gsap from 'gsap';
import { ArrowLeft, Clock, CheckCircle2, Gift, Sparkles, Trophy } from 'lucide-react';
import { QuizSpacePointsToken, QuizSpaceCoinsToken, QuizSpaceChestToken } from '../brand/QuizSpaceTokens';
import { claimDailyGift } from '../../lib/db';

interface MysteryChestRoomProps {
  userId: string;
  isDailyClaimed: boolean;
  onBackToLobby: () => void;
  onRewardClaimed: (points: number, coins: number) => void;
  streakDays?: number;
}

export const MysteryChestRoom: React.FC<MysteryChestRoomProps> = ({
  userId,
  isDailyClaimed: initialClaimed,
  onBackToLobby,
  onRewardClaimed,
  streakDays = 1,
}) => {
  const [isOpen, setIsOpen] = useState(initialClaimed);
  const [isOpening, setIsOpening] = useState(false);
  const [wonReward, setWonReward] = useState<{ points: number; coins: number; itemTitle: string } | null>(
    initialClaimed ? { points: 150, coins: 50, itemTitle: 'مكافأة الحضور اليومي المستمر 🌟' } : null
  );
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const chestRef = useRef<HTMLDivElement>(null);
  const rewardRef = useRef<HTMLDivElement>(null);
  const lightRayRef = useRef<HTMLDivElement>(null);

  // Real-time Countdown until midnight (next daily chest unlock)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenChest = async () => {
    if (isOpen || isOpening) return;
    setIsOpening(true);

    const points = 150 + streakDays * 25;
    const coins = 50 + streakDays * 10;
    const itemTitle = `حزمة مكافأة اليوم (${streakDays} أيام متواصلة) 🏆`;

    // 1. Chest shake anticipation
    if (chestRef.current) {
      gsap.to(chestRef.current, {
        x: '+=6',
        yoyo: true,
        repeat: 7,
        duration: 0.08,
        onComplete: async () => {
          // 2. Open chest & trigger light rays
          setIsOpen(true);
          setWonReward({ points, coins, itemTitle });

          // Call db claim
          if (userId) {
            try {
              await claimDailyGift(userId);
            } catch (err) {
              console.warn('Daily gift claim sync error:', err);
            }
          }
          onRewardClaimed(points, coins);

          // 3. Particle burst
          confetti({
            particleCount: 80,
            spread: 90,
            origin: { y: 0.55 },
            colors: ['#2AC3BB', '#007472', '#EE8361', '#F59E0B', '#FCF6EE'],
          });

          // 4. Animate floating reward emerging from chest
          if (rewardRef.current) {
            gsap.fromTo(
              rewardRef.current,
              { y: 60, opacity: 0, scale: 0.5 },
              { y: -30, opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)' }
            );
          }

          setIsOpening(false);
        },
      });
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-4xl px-4 py-8 flex flex-col items-center justify-center min-h-[600px] text-center select-none">
      {/* Top Navigation Bar */}
      <div className="w-full flex items-center justify-between mb-8">
        <button
          onClick={onBackToLobby}
          className="inline-flex items-center gap-2 rounded-2xl border border-[#2AC3BB]/30 bg-[#072424]/80 px-4 py-2.5 text-xs font-black text-[#FCF6EE] hover:bg-[#007472] transition shadow-md cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>العودة لردهة الألعاب ↩️</span>
        </button>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-black text-amber-300">
          <Clock className="h-4 w-4 text-amber-400" />
          <span>سلسلة الحضور: {streakDays} أيام 🔥</span>
        </div>
      </div>

      {/* Header Title */}
      <div className="space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#007472]/30 px-3 py-1 text-xs font-black text-[#2AC3BB]">
          <Gift className="h-4 w-4" />
          <span>صندوق الغموض والمفاجآت اليومي</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-[#FCF6EE]">
          {isOpen ? 'تم فتح الصندوق بنجاح! 🎉' : 'افتح صندوق اليوم واكتشف جائزتك!'}
        </h2>
        <p className="text-xs sm:text-sm font-semibold text-slate-300 max-w-md mx-auto">
          {isOpen
            ? 'مبروك! تمت إضافة الجوائز إلى رصيدك. تعال غداً لفتح الصندوق الجديد.'
            : 'كل يوم صندوق مميز يحتوي على نقاط، عملات ذهبية، ومفاجآت حصرية.'}
        </p>
      </div>

      {/* Interactive Chest Visual Stage */}
      <div className="relative my-6 flex flex-col items-center justify-center h-64 sm:h-72 w-full max-w-md">
        {/* Glow halo in background */}
        <div
          ref={lightRayRef}
          className={`absolute inset-0 m-auto h-48 w-48 rounded-full blur-2xl transition-all duration-700 ${
            isOpen ? 'bg-[#2AC3BB]/40 scale-150' : 'bg-[#007472]/30 scale-100'
          }`}
        />

        {/* Floating Won Reward Item (Emerges upward on open) */}
        {isOpen && wonReward && (
          <div
            ref={rewardRef}
            className="absolute -top-10 z-30 flex flex-col items-center gap-2 rounded-3xl border border-[#2AC3BB] bg-[#031717]/95 p-4 shadow-2xl backdrop-blur-xl"
          >
            <span className="text-xs font-black text-[#2AC3BB]">{wonReward.itemTitle}</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 rounded-xl bg-[#2AC3BB]/20 px-3 py-1 text-xs font-black text-[#2AC3BB]">
                <QuizSpacePointsToken className="h-4 w-4" />
                <span>+{wonReward.points.toLocaleString()} نقطة</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-300">
                <QuizSpaceCoinsToken className="h-4 w-4" />
                <span>+{wonReward.coins.toLocaleString()} عملة</span>
              </div>
            </div>
          </div>
        )}

        {/* The Animated Chest Graphic */}
        <div
          ref={chestRef}
          onClick={!isOpen ? handleOpenChest : undefined}
          className={`relative z-20 transition-transform duration-300 ${
            !isOpen ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
          }`}
        >
          <div className="relative flex items-center justify-center">
            {/* Custom SVG High-Def Illustrated Chest */}
            <svg
              viewBox="0 0 160 140"
              className="h-48 w-48 sm:h-56 sm:w-56 drop-shadow-[0_15px_25px_rgba(0,116,114,0.4)]"
            >
              <defs>
                <linearGradient id="chestBodyGrad" x1="20" y1="50" x2="140" y2="130" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#007472" />
                  <stop offset="60%" stopColor="#032525" />
                  <stop offset="100%" stopColor="#011313" />
                </linearGradient>
                <linearGradient id="chestGoldRim" x1="10" y1="20" x2="150" y2="130" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FDE68A" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#92400E" />
                </linearGradient>
              </defs>

              {/* Chest Lower Base */}
              <rect x="25" y="65" width="110" height="60" rx="8" fill="url(#chestBodyGrad)" stroke="url(#chestGoldRim)" strokeWidth="3" />
              {/* Vertical Gold Straps */}
              <rect x="45" y="65" width="12" height="60" fill="url(#chestGoldRim)" />
              <rect x="103" y="65" width="12" height="60" fill="url(#chestGoldRim)" />

              {/* Chest Domed Lid (Rotates open if isOpen) */}
              <g
                className="transition-all duration-700 origin-[80px_65px]"
                style={{
                  transform: isOpen ? 'translateY(-24px) rotate(-28deg)' : 'none',
                }}
              >
                <path
                  d="M20 65 C20 40, 50 30, 80 30 C110 30, 140 40, 140 65 Z"
                  fill="url(#chestGoldRim)"
                  stroke="#FDE68A"
                  strokeWidth="2.5"
                />
                <rect x="45" y="32" width="12" height="33" fill="#FDE68A" opacity="0.6" />
                <rect x="103" y="32" width="12" height="33" fill="#FDE68A" opacity="0.6" />
                {/* Center Lock Flap */}
                <rect x="72" y="55" width="16" height="18" rx="4" fill="#031717" stroke="#FDE68A" strokeWidth="2" />
                <circle cx="80" cy="62" r="3" fill="#2AC3BB" />
              </g>

              {/* Bottom Shadow */}
              <ellipse cx="80" cy="132" rx="60" ry="6" fill="#000000" opacity="0.4" />
            </svg>
          </div>
        </div>
      </div>

      {/* Actions and Countdown Area */}
      <div className="mt-4 flex flex-col items-center gap-3">
        {!isOpen ? (
          <button
            onClick={handleOpenChest}
            disabled={isOpening}
            className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#2AC3BB] via-[#007472] to-[#EE8361] px-8 py-3.5 text-base font-black text-[#FCF6EE] shadow-xl shadow-[#2AC3BB]/30 transition hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Gift className="h-5 w-5" />
            <span>{isOpening ? 'جاري الفتح...' : 'افتح الصندوق الآن! 🎁'}</span>
          </button>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[#072424]/80 px-6 py-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-bold text-[#2AC3BB]">
              <CheckCircle2 className="h-4 w-4" />
              <span>تم فتح الصندوق واستلام جوائز اليوم</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Clock className="h-4 w-4 text-[#EE8361]" />
              <span>تعال غداً لفتح الصندوق الجديد خلال:</span>
              <span className="font-mono text-sm font-black text-[#FCF6EE] tracking-wider">
                {timeRemaining}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
