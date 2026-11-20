import React, { useMemo } from 'react';
import { Crown, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { RewardLevel, VipTier } from '../../types';

export interface LevelProgressRailProps {
  level: number;
  points: number;
  currentLevel?: RewardLevel;
  nextLevel?: RewardLevel;
  vipTier?: string;
  currentVip?: VipTier;
  nextVip?: VipTier;
  lang?: 'ar' | 'en';
}

const tierConfig: Record<string, { labelAr: string; labelEn: string; color: string; border: string; bg: string }> = {
  bronze: {
    labelAr: 'برونزي',
    labelEn: 'Bronze',
    color: '#CD7F32',
    border: 'border-[#CD7F32]/50',
    bg: 'bg-[#CD7F32]/15',
  },
  silver: {
    labelAr: 'فضي',
    labelEn: 'Silver',
    color: '#C0C0C0',
    border: 'border-[#C0C0C0]/50',
    bg: 'bg-[#C0C0C0]/15',
  },
  gold: {
    labelAr: 'ذهبي',
    labelEn: 'Gold',
    color: '#FFD700',
    border: 'border-[#FFD700]/50',
    bg: 'bg-[#FFD700]/15',
  },
  platinum: {
    labelAr: 'بلاتيني',
    labelEn: 'Platinum',
    color: '#2AC3BB',
    border: 'border-[#2AC3BB]/50',
    bg: 'bg-[#2AC3BB]/15',
  },
};

export const LevelProgressRail: React.FC<LevelProgressRailProps> = ({
  level,
  points,
  currentLevel,
  nextLevel,
  vipTier = 'bronze',
  currentVip,
  nextVip,
  lang = 'ar',
}) => {
  const isAr = lang === 'ar';

  const tierInfo = tierConfig[vipTier.toLowerCase()] || tierConfig.bronze;
  const tierName = isAr ? currentVip?.nameAr || tierInfo.labelAr : currentVip?.name || tierInfo.labelEn;

  // Calculate percentage between currentLevel and nextLevel
  const levelProgress = useMemo(() => {
    if (!nextLevel) return 100;
    const start = currentLevel?.minPoints || 0;
    const end = nextLevel.minPoints;
    if (end <= start) return 100;
    const pct = ((points - start) / (end - start)) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  }, [points, currentLevel, nextLevel]);

  const pointsToNextLevel = useMemo(() => {
    if (!nextLevel) return 0;
    return Math.max(0, nextLevel.minPoints - points);
  }, [points, nextLevel]);

  const levelName = isAr
    ? currentLevel?.nameAr || `المستوى ${level}`
    : currentLevel?.name || `Level ${level}`;

  return (
    <div
      data-testid="level-progress-rail"
      dir={isAr ? 'rtl' : 'ltr'}
      className="relative overflow-hidden rounded-3xl border border-[#2AC3BB]/30 bg-[#072424]/90 p-5 text-[#FCF6EE] shadow-[0_12px_35px_rgba(0,116,114,0.2)] backdrop-blur-xl"
    >
      {/* Background glow accents */}
      <div className="pointer-events-none absolute left-0 top-0 h-40 w-40 rounded-full bg-[#007472]/20 blur-2xl" />

      {/* Header: Level Badge & VIP Tier */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Current Level Info */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#007472] to-[#2AC3BB] text-xl font-black text-[#FCF6EE] shadow-[0_6px_20px_rgba(42,195,187,0.35)]">
            <span className="font-mono text-2xl">{level}</span>
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#EE8361] text-[#072424]">
              <Sparkles className="h-3 w-3" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#2AC3BB]">
                {isAr ? 'المستوى التعليمي' : 'Academic Rank'}
              </span>
            </div>
            <h3 className="text-lg font-black text-[#FCF6EE] sm:text-xl">{levelName}</h3>
            <p className="text-xs font-semibold text-[#8BAEAD]">
              {nextLevel
                ? isAr
                  ? `${pointsToNextLevel.toLocaleString()} نقطة XP للمستوى التالي`
                  : `${pointsToNextLevel.toLocaleString()} XP to next level`
                : isAr
                ? 'وصلت إلى قمة المستويات!'
                : 'Max level reached!'}
            </p>
          </div>
        </div>

        {/* VIP Tier Badge */}
        <div className={`flex items-center gap-3 rounded-2xl border ${tierInfo.border} ${tierInfo.bg} px-4 py-2.5 backdrop-blur-md`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-amber-300">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FBDFC7]">VIP TIER</span>
              {currentVip?.pointsMultiplier ? (
                <span className="rounded-md bg-[#2AC3BB]/20 px-1.5 py-0.5 text-[10px] font-black text-[#2AC3BB]">
                  {currentVip.pointsMultiplier.toFixed(1)}x
                </span>
              ) : null}
            </div>
            <p className="text-sm font-black text-[#FCF6EE]">{tierName}</p>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-bold text-[#8BAEAD] mb-2">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-[#2AC3BB]" />
            {isAr ? `تقدم المستوى (${levelProgress}%)` : `Level Progress (${levelProgress}%)`}
          </span>
          <span className="font-mono text-[#FCF6EE]">
            {points.toLocaleString()} / {nextLevel ? nextLevel.minPoints.toLocaleString() : points.toLocaleString()} XP
          </span>
        </div>

        {/* Outer Rail Track */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#031717]/80 p-0.5 ring-1 ring-[#2AC3BB]/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#007472] via-[#2AC3BB] to-[#EE8361] shadow-[0_0_12px_rgba(42,195,187,0.6)] transition-all duration-700 ease-out"
            style={{ width: `${levelProgress}%` }}
          />
        </div>
      </div>

      {/* VIP Perks Bar if next VIP exists */}
      {nextVip && (
        <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-[#8BAEAD] border-t border-[#2AC3BB]/10 pt-2.5">
          <span className="flex items-center gap-1.5 text-[#FBDFC7]">
            <Zap className="h-3.5 w-3.5 text-[#EE8361]" />
            {isAr
              ? `المستوى القادم: VIP ${nextVip.nameAr || nextVip.name} (مضاعف ${nextVip.pointsMultiplier}x)`
              : `Next Tier: VIP ${nextVip.name} (${nextVip.pointsMultiplier}x multiplier)`}
          </span>
          <span className="font-mono text-[#2AC3BB]">
            {Math.max(0, nextVip.minPoints - points).toLocaleString()} {isAr ? 'نقطة متبقية' : 'XP needed'}
          </span>
        </div>
      )}
    </div>
  );
};

export default LevelProgressRail;
