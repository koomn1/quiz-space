import React, { useState } from 'react';
import { Gift, Sparkles, Flame, CheckCircle2, Coins, Loader2 } from 'lucide-react';

export interface DailyGiftMysteryBoxProps {
  dailyStreak: number;
  claimed?: boolean;
  canClaim?: boolean;
  onClaim?: () => Promise<void> | void;
  actionLoading?: boolean;
  actionMessage?: string | null;
  lang?: 'ar' | 'en';
}

export const DailyGiftMysteryBox: React.FC<DailyGiftMysteryBoxProps> = ({
  dailyStreak = 0,
  claimed = false,
  canClaim = true,
  onClaim,
  actionLoading = false,
  actionMessage,
  lang = 'ar',
}) => {
  const isAr = lang === 'ar';
  const [isOpening, setIsOpening] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const isReady = canClaim && !claimed;

  const handleBoxClick = async () => {
    if (!isReady || actionLoading || isOpening) return;

    setIsOpening(true);
    try {
      if (onClaim) {
        await onClaim();
      }
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3500);
    } catch {
      // Error handled by parent or displayed in message
    } finally {
      setIsOpening(false);
    }
  };

  // Streak days representation (7-day cycle)
  const currentDayInCycle = ((dailyStreak - 1) % 7) + 1;

  return (
    <div
      data-testid="daily-gift-box"
      dir={isAr ? 'rtl' : 'ltr'}
      className="relative overflow-hidden rounded-3xl border border-[#2AC3BB]/30 bg-[#072424]/90 p-5 text-[#FCF6EE] shadow-[0_12px_35px_rgba(0,116,114,0.2)] backdrop-blur-xl"
    >
      {/* Glow backgrounds */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#2AC3BB]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-[#EE8361]/15 blur-3xl" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2AC3BB]/20 text-[#2AC3BB] border border-[#2AC3BB]/30 shadow-inner">
            <Gift className="h-6 w-6 text-[#2AC3BB]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#2AC3BB]">
                {isAr ? 'المكافأة اليومية' : 'Daily Login Gift'}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-[#EE8361]/20 px-2 py-0.5 text-xs font-black text-[#FBDFC7]">
                <Flame className="h-3 w-3 text-[#EE8361]" />
                {isAr ? `${dailyStreak} أيام متتالية` : `${dailyStreak}-day streak`}
              </span>
            </div>
            <h3 className="text-lg font-black text-[#FCF6EE]">
              {isAr ? 'صندوق الهدايا والمفاجآت' : 'Daily Mystery Chest'}
            </h3>
          </div>
        </div>

        {/* Claim Action Button */}
        <button
          type="button"
          onClick={handleBoxClick}
          disabled={!isReady || actionLoading || isOpening}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all duration-300 shadow-md ${
            claimed
              ? 'border border-[#2AC3BB]/40 bg-[#007472]/30 text-[#8BAEAD] cursor-default'
              : isReady
              ? 'bg-gradient-to-r from-[#EE8361] to-[#2AC3BB] text-[#072424] hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(238,131,97,0.4)] cursor-pointer'
              : 'border border-slate-700 bg-slate-800/50 text-slate-400 cursor-not-allowed'
          }`}
        >
          {actionLoading || isOpening ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-current" />
              <span>{isAr ? 'جارٍ الفتح...' : 'Opening...'}</span>
            </>
          ) : claimed ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-[#2AC3BB]" />
              <span>{isAr ? 'تم استلام هدية اليوم' : 'Claimed for today'}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span>{isAr ? 'افتح الصندوق الآن' : 'Open Mystery Chest'}</span>
            </>
          )}
        </button>
      </div>

      {/* 3D Chest Visual Presentation */}
      <div className="mt-5 flex flex-col items-center justify-center py-4">
        <div
          onClick={handleBoxClick}
          className={`relative group cursor-pointer transition-transform duration-300 select-none ${
            isReady ? 'hover:scale-110 active:scale-95' : ''
          }`}
        >
          {/* Ambient Ray Glow behind Chest */}
          <div
            className={`absolute -inset-4 rounded-full blur-xl transition-opacity duration-500 ${
              isReady
                ? 'bg-gradient-to-tr from-[#EE8361]/40 via-[#2AC3BB]/40 to-[#FBDFC7]/30 opacity-100 animate-pulse'
                : 'opacity-20 bg-[#007472]/20'
            }`}
          />

          {/* 3D-styled Chest Vector Graphic */}
          <div
            className={`relative flex h-28 w-32 sm:h-32 sm:w-36 items-center justify-center transition-all ${
              isReady && !isOpening ? 'animate-bounce-subtle' : ''
            }`}
          >
            <svg
              viewBox="0 0 140 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-full w-full drop-shadow-[0_12px_24px_rgba(0,116,114,0.4)]"
            >
              {/* Chest Bottom Base */}
              <rect
                x="20"
                y="50"
                width="100"
                height="60"
                rx="14"
                fill="#007472"
                stroke="#2AC3BB"
                strokeWidth="3"
              />
              {/* Inner Chest Shadow */}
              <rect x="25" y="55" width="90" height="50" rx="10" fill="#072424" />

              {/* Decorative Gold Trim Bands */}
              <rect x="36" y="50" width="12" height="60" fill="#FBDFC7" fillOpacity="0.8" />
              <rect x="92" y="50" width="12" height="60" fill="#FBDFC7" fillOpacity="0.8" />

              {/* Chest Lid */}
              <path
                d={
                  claimed || isOpening
                    ? 'M15 35 C15 15, 125 15, 125 35 L120 50 L20 50 Z'
                    : 'M16 48 C16 28, 124 28, 124 48 L122 56 L18 56 Z'
                }
                fill="#005E5C"
                stroke="#2AC3BB"
                strokeWidth="3"
              />
              <path
                d={
                  claimed || isOpening
                    ? 'M36 22 L48 22 L48 48 L36 48 Z'
                    : 'M36 34 L48 34 L48 54 L36 54 Z'
                }
                fill="#EE8361"
              />
              <path
                d={
                  claimed || isOpening
                    ? 'M92 22 L104 22 L104 48 L92 48 Z'
                    : 'M92 34 L104 34 L104 54 L92 54 Z'
                }
                fill="#EE8361"
              />

              {/* Lock Mechanism */}
              <circle
                cx="70"
                cy={claimed || isOpening ? '46' : '53'}
                r="11"
                fill="#EE8361"
                stroke="#FBDFC7"
                strokeWidth="2.5"
              />
              <circle
                cx="70"
                cy={claimed || isOpening ? '46' : '53'}
                r="4"
                fill="#072424"
              />

              {/* Gem Sparkle Center */}
              <circle
                cx="70"
                cy={claimed || isOpening ? '44' : '51'}
                r="2"
                fill="#FCF6EE"
              />
            </svg>

            {/* Floating Sparkle Particles */}
            {isReady && (
              <>
                <Sparkles className="absolute -top-1 -right-2 h-5 w-5 text-[#FBDFC7] animate-pulse" />
                <Coins className="absolute -bottom-2 -left-2 h-5 w-5 text-[#EE8361] animate-bounce" />
              </>
            )}
          </div>
        </div>

        {/* Celebration / Action Message Toast */}
        {actionMessage && (
          <div className="mt-3 rounded-xl border border-[#2AC3BB]/40 bg-[#007472]/30 px-4 py-2 text-center text-xs font-black text-[#2AC3BB] animate-in fade-in zoom-in-95">
            {actionMessage}
          </div>
        )}

        {showCelebration && (
          <div className="mt-2 flex items-center gap-2 text-xs font-black text-[#FBDFC7] animate-bounce">
            <Coins className="h-4 w-4 text-[#EE8361]" />
            <span>{isAr ? 'مبروك! تمت إضافة الجائزة إلى رصيدك بنجاح' : 'Congratulations! Reward added to balance'}</span>
          </div>
        )}
      </div>

      {/* 7-Day Streak Timeline Tracker */}
      <div className="mt-4 border-t border-[#2AC3BB]/15 pt-3.5">
        <div className="mb-2.5 flex items-center justify-between text-xs font-bold text-[#8BAEAD]">
          <span>{isAr ? 'سلسلة الحضور الأسبوعية (7 أيام)' : '7-Day Attendance Loop'}</span>
          <span className="font-mono text-[#2AC3BB]">
            {isAr ? `اليوم ${currentDayInCycle} من 7` : `Day ${currentDayInCycle} of 7`}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: 7 }, (_, i) => {
            const dayNum = i + 1;
            const isCompleted = dayNum < currentDayInCycle || (dayNum === currentDayInCycle && claimed);
            const isCurrent = dayNum === currentDayInCycle && !claimed;
            return (
              <div
                key={dayNum}
                className={`flex flex-col items-center justify-center rounded-xl p-1.5 text-center transition-all ${
                  isCompleted
                    ? 'border border-[#2AC3BB]/50 bg-[#007472]/30 text-[#2AC3BB]'
                    : isCurrent
                    ? 'border border-[#EE8361] bg-[#EE8361]/20 text-[#FBDFC7] ring-2 ring-[#EE8361]/40'
                    : 'border border-[#2AC3BB]/15 bg-[#031717]/60 text-slate-500'
                }`}
              >
                <span className="text-xs font-bold">
                  {isAr ? `ي ${dayNum}` : `D${dayNum}`}
                </span>
                <div className="my-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#2AC3BB]" />
                  ) : dayNum === 7 ? (
                    <Gift className="h-3.5 w-3.5 text-[#EE8361]" />
                  ) : (
                    <Coins className="h-3.5 w-3.5 opacity-70" />
                  )}
                </div>
                <span className="text-xs font-mono font-bold">
                  {dayNum === 7 ? 'x3' : `+${dayNum * 10}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DailyGiftMysteryBox;
