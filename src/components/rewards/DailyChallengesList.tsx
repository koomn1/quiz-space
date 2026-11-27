import React from 'react';
import { Target, CheckCircle2, Coins, Sparkles, Loader2 } from 'lucide-react';
import { RewardChallenge } from '../../types';

export interface DailyChallengesListProps {
  challenges: RewardChallenge[];
  onClaim: (challengeId: string) => Promise<void> | void;
  actionLoading?: string | null;
  lang?: 'ar' | 'en';
}

export const DailyChallengesList: React.FC<DailyChallengesListProps> = ({
  challenges = [],
  onClaim,
  actionLoading = null,
  lang = 'ar',
}) => {
  const isAr = lang === 'ar';

  return (
    <div
      data-testid="daily-challenges-list"
      dir={isAr ? 'rtl' : 'ltr'}
      className="relative overflow-hidden rounded-3xl border border-[#2AC3BB]/30 bg-[#072424]/90 p-5 text-[#FCF6EE] shadow-[0_12px_35px_rgba(0,116,114,0.2)] backdrop-blur-xl"
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#007472]/30 text-[#2AC3BB] border border-[#2AC3BB]/30">
            <Target className="h-5 w-5 text-[#2AC3BB]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#2AC3BB]">
                {isAr ? 'المهام اليومية' : 'Daily Quests'}
              </span>
            </div>
            <h3 className="text-base font-black text-[#FCF6EE]">
              {isAr ? 'تحديات اليوم' : 'Today’s Challenges'}
            </h3>
          </div>
        </div>
        <span className="text-xs font-bold text-[#8BAEAD]">
          {isAr ? 'تتجدد كل 24 ساعة' : 'Resets in 24 hours'}
        </span>
      </div>

      {/* Challenges Grid */}
      {challenges.length === 0 ? (
        <div className="py-6 text-center text-xs font-bold text-[#8BAEAD]">
          {isAr ? 'لا توجد تحديات يومية متاحة الآن.' : 'No daily challenges available right now.'}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {challenges.map((challenge) => {
            const currentProgress = challenge.progress || 0;
            const target = Math.max(1, challenge.target || 1);
            const isCompleted = currentProgress >= target;
            const isClaimed = Boolean(challenge.claimed);
            const progressPercent = Math.min(100, Math.round((currentProgress / target) * 100));
            const isLoading = actionLoading === challenge.id;

            return (
              <div
                key={challenge.id}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 transition-all duration-200 ${
                  isClaimed
                    ? 'border-[#2AC3BB]/20 bg-[#007472]/10 opacity-75'
                    : isCompleted
                    ? 'border-[#EE8361]/50 bg-[#007472]/25 shadow-[0_4px_16px_rgba(238,131,97,0.2)]'
                    : 'border-[#2AC3BB]/20 bg-[#031717]/60'
                }`}
              >
                <div>
                  {/* Title and Icon */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-xs font-black text-[#FCF6EE]">
                        {isAr ? challenge.nameAr : challenge.name}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs text-[#8BAEAD]">
                        {isAr ? challenge.descriptionAr : challenge.description}
                      </p>
                    </div>
                    {isClaimed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2AC3BB]" />
                    ) : (
                      <Target className={`h-4 w-4 shrink-0 ${isCompleted ? 'text-[#EE8361]' : 'text-[#8BAEAD]'}`} />
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs font-bold text-[#8BAEAD] mb-1">
                      <span>{isAr ? 'الإنجاز' : 'Progress'}</span>
                      <span className="font-mono text-[#FCF6EE]">
                        {currentProgress}/{target}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#031717]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#007472] to-[#2AC3BB] transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Rewards & Claim Button Footer */}
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#2AC3BB]/10 pt-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-black">
                    <span className="flex items-center gap-0.5 text-[#2AC3BB]">
                      <Sparkles className="h-3 w-3" />
                      +{challenge.pointsReward} XP
                    </span>
                    <span className="text-[#8BAEAD]">·</span>
                    <span className="flex items-center gap-0.5 text-[#FBDFC7]">
                      <Coins className="h-3 w-3 text-[#EE8361]" />
                      +{challenge.coinsReward}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onClaim(challenge.id)}
                    disabled={!isCompleted || isClaimed || isLoading}
                    className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                      isClaimed
                        ? 'border border-[#2AC3BB]/30 bg-transparent text-[#8BAEAD] cursor-default'
                        : isCompleted
                        ? 'bg-gradient-to-r from-[#EE8361] to-[#2AC3BB] text-[#072424] hover:scale-105 active:scale-95 shadow-md cursor-pointer'
                        : 'border border-[#2AC3BB]/20 bg-[#031717] text-[#8BAEAD] cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isClaimed ? (
                      <span>{isAr ? 'تم' : 'Done'}</span>
                    ) : (
                      <span>{isAr ? 'مطالبة' : 'Claim'}</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DailyChallengesList;
