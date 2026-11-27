import React, { useCallback, useEffect, useState } from 'react';
import { Crown, Medal, RefreshCw, Trophy, User, Zap } from 'lucide-react';
import { WeeklyVipLeaderboardEntry } from '../../types';
import { getWeeklyVipLeaderboard } from '../../lib/db';

export interface VipLeaderboardPodiumProps {
  entries?: WeeklyVipLeaderboardEntry[];
  userId?: string;
  lang?: 'ar' | 'en';
  onRefresh?: () => Promise<void> | void;
  loading?: boolean;
  error?: boolean;
}

const tierLabels: Record<string, { ar: string; en: string }> = {
  bronze: { ar: 'برونزي', en: 'Bronze' },
  silver: { ar: 'فضي', en: 'Silver' },
  gold: { ar: 'ذهبي', en: 'Gold' },
  platinum: { ar: 'بلاتيني', en: 'Platinum' },
};

export const VipLeaderboardPodium: React.FC<VipLeaderboardPodiumProps> = ({
  entries: propEntries,
  lang = 'ar',
  onRefresh,
  loading: propLoading,
  error: propError,
}) => {
  const isAr = lang === 'ar';
  const [internalEntries, setInternalEntries] = useState<WeeklyVipLeaderboardEntry[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState(false);

  const entries = propEntries !== undefined ? propEntries : internalEntries;
  const loading = propLoading !== undefined ? propLoading : internalLoading;
  const error = propError !== undefined ? propError : internalError;

  const loadData = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
      return;
    }
    setInternalLoading(true);
    setInternalError(false);
    try {
      const data = await getWeeklyVipLeaderboard();
      setInternalEntries(data);
    } catch {
      setInternalError(true);
    } finally {
      setInternalLoading(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (propEntries === undefined) {
      void loadData();
    }
  }, [propEntries, loadData]);

  const top1 = entries.find((e) => e.leaderboardRank === 1);
  const top2 = entries.find((e) => e.leaderboardRank === 2);
  const top3 = entries.find((e) => e.leaderboardRank === 3);
  const currentUserEntry = entries.find((e) => e.isMe);
  const restEntries = entries.filter((e) => e.leaderboardRank > 3);

  return (
    <div
      data-testid="vip-leaderboard-podium"
      dir={isAr ? 'rtl' : 'ltr'}
      className="relative overflow-hidden rounded-3xl border border-[#2AC3BB]/30 bg-[#072424]/90 p-5 text-[#FCF6EE] shadow-[0_12px_35px_rgba(0,116,114,0.2)] backdrop-blur-xl"
    >
      {/* Background Ambience */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-[#007472]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-[#2AC3BB]/15 blur-3xl" />

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#007472]/30 text-[#2AC3BB] border border-[#2AC3BB]/30 shadow-inner">
            <Trophy className="h-6 w-6 text-[#2AC3BB]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#2AC3BB]">
                {isAr ? 'منصة التتويج الأسبوعية' : 'VIP Weekly Stage'}
              </span>
            </div>
            <h3 className="text-lg font-black text-[#FCF6EE]">
              {isAr ? 'أبطال الأسبوع ولوحة الصدارة' : 'Weekly Champions Podium'}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-[#2AC3BB]/30 bg-[#007472]/20 px-3 py-1.5 text-xs font-bold text-[#2AC3BB] transition-colors hover:bg-[#007472]/40 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{isAr ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      {loading && (
        <div className="py-10 text-center text-xs font-bold text-[#8BAEAD]">
          {isAr ? 'جاري تحميل منصة الصدارة...' : 'Loading podium...'}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-center text-xs font-bold text-rose-300">
          {isAr ? 'تعذر تحميل الترتيب الأسبوعي حالياً.' : 'Could not load weekly rankings right now.'}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="rounded-2xl border border-[#2AC3BB]/20 bg-[#031717]/60 p-6 text-center text-xs font-bold text-[#8BAEAD]">
          {isAr ? 'ابدأ بجمع النقاط لتكون أول المتصدرين في المنصة!' : 'Start earning points to be the first champion on the podium!'}
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div>
          {/* Top 3 Visual Podium */}
          <div className="mb-6 flex items-end justify-center gap-2 sm:gap-4 pt-6">
            {/* 2nd Place Podium Pillar */}
            {top2 && (
              <div className="flex flex-1 max-w-[120px] sm:max-w-[150px] flex-col items-center">
                <div className="relative mb-2 flex flex-col items-center">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-700/60 shadow-lg">
                    {top2.photoUrl ? (
                      <img src={top2.photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-slate-300" />
                    )}
                  </div>
                  <span className="absolute -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-xs font-black text-[#072424] shadow">
                    2
                  </span>
                </div>
                <p className="w-full truncate text-center text-xs font-black text-[#FCF6EE]">
                  {top2.displayName}
                </p>
                <p className="text-xs font-bold text-[#2AC3BB]">
                  {top2.weeklyPoints.toLocaleString()} XP
                </p>
                {/* Pedestal */}
                <div className="mt-2 h-20 sm:h-24 w-full rounded-t-2xl border border-slate-400/30 bg-gradient-to-t from-[#007472]/40 via-slate-500/20 to-slate-400/30 flex items-center justify-center">
                  <Medal className="h-6 w-6 text-slate-300 opacity-80" />
                </div>
              </div>
            )}

            {/* 1st Place (Center - Highest) */}
            {top1 && (
              <div className="flex flex-1 max-w-[130px] sm:max-w-[165px] flex-col items-center -translate-y-2">
                <div className="relative mb-2 flex flex-col items-center">
                  <Crown className="h-7 w-7 text-amber-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.6)] animate-bounce-subtle" />
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-500/20 shadow-[0_0_20px_rgba(255,215,0,0.4)]">
                    {top1.photoUrl ? (
                      <img src={top1.photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <Crown className="h-7 w-7 text-amber-400" />
                    )}
                  </div>
                  <span className="absolute -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-[#072424] shadow">
                    1
                  </span>
                </div>
                <p className="w-full truncate text-center text-xs sm:text-sm font-black text-[#FBDFC7]">
                  {top1.displayName}
                </p>
                <p className="text-xs font-bold text-[#EE8361]">
                  {top1.weeklyPoints.toLocaleString()} XP
                </p>
                {/* Pedestal */}
                <div className="mt-2 h-28 sm:h-32 w-full rounded-t-2xl border border-amber-400/40 bg-gradient-to-t from-[#007472]/60 via-amber-500/20 to-amber-400/30 flex items-center justify-center shadow-[0_0_25px_rgba(255,215,0,0.2)]">
                  <Trophy className="h-8 w-8 text-amber-400" />
                </div>
              </div>
            )}

            {/* 3rd Place Podium Pillar */}
            {top3 && (
              <div className="flex flex-1 max-w-[120px] sm:max-w-[150px] flex-col items-center">
                <div className="relative mb-2 flex flex-col items-center">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-2 border-amber-700/60 bg-amber-800/30 shadow-lg">
                    {top3.photoUrl ? (
                      <img src={top3.photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-amber-600" />
                    )}
                  </div>
                  <span className="absolute -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-700 text-xs font-black text-[#FCF6EE] shadow">
                    3
                  </span>
                </div>
                <p className="w-full truncate text-center text-xs font-black text-[#FCF6EE]">
                  {top3.displayName}
                </p>
                <p className="text-xs font-bold text-[#2AC3BB]">
                  {top3.weeklyPoints.toLocaleString()} XP
                </p>
                {/* Pedestal */}
                <div className="mt-2 h-16 sm:h-20 w-full rounded-t-2xl border border-amber-700/30 bg-gradient-to-t from-[#007472]/40 via-amber-800/20 to-amber-700/20 flex items-center justify-center">
                  <Medal className="h-6 w-6 text-amber-600 opacity-80" />
                </div>
              </div>
            )}
          </div>

          {/* List of Other Ranks */}
          {restEntries.length > 0 && (
            <div className="space-y-2 border-t border-[#2AC3BB]/15 pt-3">
              <h4 className="text-xs font-bold text-[#8BAEAD] mb-1">
                {isAr ? 'باقي المنافسين' : 'Other Challengers'}
              </h4>
              {restEntries.slice(0, 7).map((entry) => {
                const tier = tierLabels[entry.vipTier] || { ar: entry.vipTier, en: entry.vipTier };
                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between gap-3 rounded-2xl border p-2.5 transition-all ${
                      entry.isMe
                        ? 'border-[#2AC3BB] bg-[#007472]/40 ring-1 ring-[#2AC3BB]'
                        : 'border-[#2AC3BB]/15 bg-[#031717]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#007472]/40 font-mono text-xs font-black text-[#2AC3BB]">
                        {entry.leaderboardRank}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-[#FCF6EE]">
                          {entry.displayName}
                          {entry.isMe && (
                            <span className="mx-1 text-xs text-[#2AC3BB]">({isAr ? 'أنت' : 'You'})</span>
                          )}
                        </p>
                        <p className="text-xs text-[#8BAEAD]">
                          VIP {isAr ? tier.ar : tier.en}
                        </p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="font-mono text-xs font-black text-[#FBDFC7]">
                        {entry.weeklyPoints.toLocaleString()}
                      </p>
                      <p className="text-xs text-[#8BAEAD]">{isAr ? 'نقطة' : 'XP'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky Current User Rank Bar (if user is ranked) */}
          {currentUserEntry && (
            <div className="mt-4 rounded-2xl border border-[#2AC3BB] bg-gradient-to-r from-[#007472] to-[#072424] p-3 text-[#FCF6EE] shadow-[0_0_15px_rgba(42,195,187,0.3)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2AC3BB] text-xs font-black text-[#072424]">
                    #{currentUserEntry.leaderboardRank}
                  </div>
                  <div>
                    <p className="text-xs font-black">
                      {isAr ? 'ترتيبك الأسبوعي المباشر' : 'Your Live Weekly Rank'}
                    </p>
                    <p className="text-xs text-[#FBDFC7]">
                      {isAr
                        ? `أنت متقدم برصيد ${currentUserEntry.weeklyPoints.toLocaleString()} نقطة`
                        : `Current score: ${currentUserEntry.weeklyPoints.toLocaleString()} XP`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[#2AC3BB] text-xs font-black">
                  <Zap className="h-4 w-4 text-[#EE8361]" />
                  <span>VIP</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VipLeaderboardPodium;
