import React, { useEffect, useState } from 'react';
import { Coins, History, Sparkles, Gamepad2, ShoppingBag } from 'lucide-react';

export interface PointsBalanceCardProps {
  points: number;
  coins: number;
  onOpenLedger: () => void;
  onOpenArcade: () => void;
  onOpenStore?: () => void;
  lang?: 'ar' | 'en';
}

function useAnimatedCounter(targetValue: number, duration = 800): number {
  const [displayValue, setDisplayValue] = useState(targetValue);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const initialValue = displayValue;
    const difference = targetValue - initialValue;

    if (difference === 0) return;

    let animationFrameId: number;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOutQuad = 1 - (1 - progress) * (1 - progress);
      setDisplayValue(Math.round(initialValue + difference * easeOutQuad));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetValue, duration]);

  return displayValue;
}

export const PointsBalanceCard: React.FC<PointsBalanceCardProps> = ({
  points,
  coins,
  onOpenLedger,
  onOpenArcade,
  onOpenStore,
  lang = 'ar',
}) => {
  const isAr = lang === 'ar';
  const animatedPoints = useAnimatedCounter(points);
  const animatedCoins = useAnimatedCounter(coins);

  return (
    <div
      data-testid="points-balance-card"
      dir={isAr ? 'rtl' : 'ltr'}
      className="relative overflow-hidden rounded-3xl border border-[#2AC3BB]/30 bg-[#072424]/95 p-6 text-[#FCF6EE] shadow-[0_16px_40px_rgba(0,116,114,0.25)] backdrop-blur-xl transition-all duration-300"
    >
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#007472]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-[#EE8361]/20 blur-3xl" />

      {/* Shimmer overlay effect */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#2AC3BB]/5 to-transparent opacity-50" />

      {/* Header and Currency Balances */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#2AC3BB] animate-pulse" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2AC3BB]">
              {isAr ? 'المحفظة الذكية والأرصدة' : 'Wallet & Balances'}
            </p>
          </div>
          <h2 className="mt-1 text-2xl font-black text-[#FCF6EE] sm:text-3xl">
            {isAr ? 'رصيد المكافآت' : 'Reward Balance'}
          </h2>
        </div>

        {/* Currency Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* XP Points Card */}
          <div className="relative overflow-hidden rounded-2xl border border-[#007472]/40 bg-[#007472]/20 p-3.5 sm:p-4 text-center shadow-inner">
            <div className="flex items-center justify-center gap-1.5 text-[#2AC3BB]">
              <Sparkles className="h-4 w-4 text-[#2AC3BB] animate-spin-slow" />
              <span className="text-[11px] font-bold tracking-wider">
                {isAr ? 'نقاط الخبرة (XP)' : 'Experience XP'}
              </span>
            </div>
            <p className="mt-1 font-mono text-2xl font-black text-[#FCF6EE] sm:text-3xl">
              {animatedPoints.toLocaleString()}
            </p>
          </div>

          {/* Quiz Coins Card */}
          <div className="relative overflow-hidden rounded-2xl border border-[#EE8361]/40 bg-[#EE8361]/15 p-3.5 sm:p-4 text-center shadow-inner">
            <div className="flex items-center justify-center gap-1.5 text-[#EE8361]">
              <Coins className="h-4 w-4 text-[#EE8361] animate-bounce-subtle" />
              <span className="text-[11px] font-bold tracking-wider">
                {isAr ? 'عملات كويز (Coins)' : 'Quiz Coins'}
              </span>
            </div>
            <p className="mt-1 font-mono text-2xl font-black text-[#FBDFC7] sm:text-3xl">
              {animatedCoins.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#2AC3BB]/15 pt-4">
        {/* Arcade Hub Trigger Button */}
        <button
          type="button"
          onClick={onOpenArcade}
          data-testid="arcade-hub-trigger"
          className="group relative flex items-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#007472] via-[#2AC3BB] to-[#EE8361] p-[2px] font-black text-[#FCF6EE] shadow-[0_0_20px_rgba(42,195,187,0.4)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
        >
          <div className="flex items-center gap-2 rounded-[14px] bg-[#072424] px-4 py-2.5 transition-colors group-hover:bg-[#072424]/80">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2AC3BB]/20 text-[#2AC3BB]">
              <Gamepad2 className="h-4 w-4 text-[#2AC3BB] animate-pulse" />
            </div>
            <span className="text-sm font-bold text-[#FCF6EE]">
              {isAr ? 'أركيد الألعاب والألغاز' : 'Arcade Hub & Games'}
            </span>
            <span className="rounded-full bg-[#EE8361] px-2 py-0.5 text-[10px] font-black uppercase text-[#072424]">
              {isAr ? 'جديد' : 'NEW'}
            </span>
          </div>
        </button>

        {/* Secondary Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Avatar Store Button */}
          <button
            type="button"
            data-testid="avatar-store-trigger"
            onClick={onOpenStore}
            className="flex items-center gap-1.5 rounded-xl border border-[#EE8361]/40 bg-[#EE8361]/10 px-3.5 py-2 text-xs font-bold text-[#FBDFC7] transition-all hover:bg-[#EE8361]/20 active:scale-95"
          >
            <ShoppingBag className="h-4 w-4 text-[#EE8361]" />
            <span>{isAr ? 'متجر الإطارات' : 'Avatar Store'}</span>
          </button>

          {/* Reward Ledger Button */}
          <button
            type="button"
            data-testid="reward-ledger-trigger"
            onClick={onOpenLedger}
            className="flex items-center gap-1.5 rounded-xl border border-[#2AC3BB]/30 bg-[#007472]/20 px-3.5 py-2 text-xs font-bold text-[#2AC3BB] transition-all hover:bg-[#007472]/35 active:scale-95"
          >
            <History className="h-4 w-4 text-[#2AC3BB]" />
            <span>{isAr ? 'سجل العمليات' : 'Ledger'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointsBalanceCard;
