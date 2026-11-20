import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Flame,
  Lock,
  Medal,
  Pencil,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { RewardBadge } from '../../types';
import { getBadgeRarityStyle } from '../../lib/rewardPresentation';

const iconMap: Record<string, typeof Award> = {
  award: Award,
  sparkles: Sparkles,
  'book-open': BookOpen,
  trophy: Trophy,
  pencil: Pencil,
  flame: Flame,
  medal: Medal,
};

export interface BadgesTrophyHallProps {
  badges: RewardBadge[];
  lang?: 'ar' | 'en';
}

export const BadgesTrophyHall: React.FC<BadgesTrophyHallProps> = ({
  badges = [],
  lang = 'ar',
}) => {
  const isAr = lang === 'ar';
  const [activeFilter, setActiveFilter] = useState<'all' | 'earned' | 'in_progress'>('all');

  const earnedCount = useMemo(() => badges.filter((b) => b.earnedAt).length, [badges]);

  const filteredBadges = useMemo(() => {
    switch (activeFilter) {
      case 'earned':
        return badges.filter((b) => Boolean(b.earnedAt));
      case 'in_progress':
        return badges.filter((b) => !b.earnedAt);
      case 'all':
      default:
        return badges;
    }
  }, [badges, activeFilter]);

  return (
    <div
      data-testid="badges-trophy-hall"
      dir={isAr ? 'rtl' : 'ltr'}
      className="relative overflow-hidden rounded-3xl border border-[#2AC3BB]/30 bg-[#072424]/90 p-5 text-[#FCF6EE] shadow-[0_12px_35px_rgba(0,116,114,0.2)] backdrop-blur-xl"
    >
      {/* Background Glow */}
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-[#007472]/20 blur-3xl" />

      {/* Header & Filter Tabs */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#007472]/30 text-[#2AC3BB] border border-[#2AC3BB]/30 shadow-inner">
            <Trophy className="h-6 w-6 text-[#2AC3BB]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#2AC3BB]">
                {isAr ? 'قاعة الإنجازات' : 'Hall of Fame'}
              </span>
              <span className="rounded-full bg-[#2AC3BB]/20 px-2 py-0.5 text-[10px] font-black text-[#2AC3BB]">
                {earnedCount}/{badges.length} {isAr ? 'مكتسبة' : 'Earned'}
              </span>
            </div>
            <h3 className="text-lg font-black text-[#FCF6EE]">
              {isAr ? 'الأوسمة والشارات التقديرية' : 'Badges & Trophy Showcase'}
            </h3>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 rounded-2xl border border-[#2AC3BB]/25 bg-[#031717]/80 p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeFilter === 'all'
                ? 'bg-gradient-to-r from-[#007472] to-[#2AC3BB] text-[#072424] shadow-sm'
                : 'text-[#8BAEAD] hover:text-[#FCF6EE]'
            }`}
          >
            {isAr ? 'الكل' : 'All'}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('earned')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeFilter === 'earned'
                ? 'bg-gradient-to-r from-[#007472] to-[#2AC3BB] text-[#072424] shadow-sm'
                : 'text-[#8BAEAD] hover:text-[#FCF6EE]'
            }`}
          >
            {isAr ? 'مكتملة' : 'Earned'}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('in_progress')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeFilter === 'in_progress'
                ? 'bg-gradient-to-r from-[#007472] to-[#2AC3BB] text-[#072424] shadow-sm'
                : 'text-[#8BAEAD] hover:text-[#FCF6EE]'
            }`}
          >
            {isAr ? 'قيد التقدم' : 'In Progress'}
          </button>
        </div>
      </div>

      {/* Badges Grid */}
      {filteredBadges.length === 0 ? (
        <div className="py-8 text-center text-xs font-bold text-[#8BAEAD]">
          {isAr ? 'لا توجد شارات في هذا القسم.' : 'No badges in this category.'}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredBadges.map((badge) => {
            const Icon = iconMap[badge.icon] || Award;
            const isEarned = Boolean(badge.earnedAt);
            const rarity = badge.rarity || 'common';
            const rarityStyle = getBadgeRarityStyle(rarity);

            return (
              <div
                key={badge.id}
                style={{
                  borderColor: isEarned ? rarityStyle.borderColor : 'rgba(42, 195, 187, 0.15)',
                  boxShadow: isEarned ? `0 8px 24px ${rarityStyle.glowColor}` : 'none',
                }}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  isEarned
                    ? 'bg-[#007472]/20'
                    : 'bg-[#031717]/60 opacity-60 hover:opacity-80'
                }`}
              >
                {/* Subtle top shimmer banner */}
                <div className="flex items-start justify-between gap-3">
                  <div
                    style={{
                      background: isEarned
                        ? `linear-gradient(135deg, ${rarityStyle.borderColor}33, transparent)`
                        : 'rgba(255,255,255,0.05)',
                    }}
                    className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                      isEarned ? 'border-current' : 'border-white/10'
                    }`}
                  >
                    <Icon
                      style={{ color: isEarned ? rarityStyle.borderColor : '#8BAEAD' }}
                      className="h-6 w-6 transition-transform duration-300 group-hover:scale-110"
                    />
                    {isEarned && (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#072424] text-[#2AC3BB]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2AC3BB]" />
                      </span>
                    )}
                  </div>

                  {/* Rarity & Status Chip */}
                  <div className="flex flex-col items-end">
                    <span
                      style={{ color: rarityStyle.borderColor }}
                      className="text-[9px] font-black uppercase tracking-wider"
                    >
                      {rarity}
                    </span>
                    {!isEarned && (
                      <span className="mt-1 flex items-center gap-0.5 text-[9px] text-[#8BAEAD]">
                        <Lock className="h-2.5 w-2.5" />
                        {isAr ? 'مغلقة' : 'Locked'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 min-w-0">
                  <h4 className="truncate text-xs font-black text-[#FCF6EE]">
                    {isAr ? badge.nameAr : badge.name}
                  </h4>
                  <p className="mt-1 line-clamp-2 min-h-6 text-[10px] text-[#8BAEAD]">
                    {isAr ? badge.descriptionAr : badge.description}
                  </p>
                </div>

                {isEarned && badge.earnedAt && (
                  <div className="mt-3 border-t border-[#2AC3BB]/10 pt-2 text-[9px] font-bold text-[#8BAEAD]">
                    {isAr ? 'أُنجزت في: ' : 'Earned: '}
                    {new Date(badge.earnedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BadgesTrophyHall;
