import React from 'react';
import { Calendar, CheckCircle2, Coins, Loader2, RefreshCw, Sparkles, Trophy } from 'lucide-react';
import { WeeklyTask } from '../../types';

export interface WeeklyTasksBoardProps {
  tasks: WeeklyTask[];
  onClaimTask: (taskId: string) => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
  loading?: boolean;
  claimingTaskId?: string | null;
  lang?: 'ar' | 'en';
}

export const WeeklyTasksBoard: React.FC<WeeklyTasksBoardProps> = ({
  tasks = [],
  onClaimTask,
  onRefresh,
  loading = false,
  claimingTaskId = null,
  lang = 'ar',
}) => {
  const isAr = lang === 'ar';

  return (
    <div
      data-testid="weekly-tasks-board"
      dir={isAr ? 'rtl' : 'ltr'}
      className="relative overflow-hidden rounded-3xl border border-[#2AC3BB]/30 bg-[#072424]/90 p-5 text-[#FCF6EE] shadow-[0_12px_35px_rgba(0,116,114,0.2)] backdrop-blur-xl"
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#007472]/30 text-[#2AC3BB] border border-[#2AC3BB]/30">
            <Calendar className="h-5 w-5 text-[#2AC3BB]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#2AC3BB]">
                {isAr ? 'المسار الأسبوعي' : 'Weekly Milestones'}
              </span>
            </div>
            <h3 className="text-base font-black text-[#FCF6EE]">
              {isAr ? 'مهام الأسبوع والجوائز الكبرى' : 'Weekly Quest Board'}
            </h3>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-[#2AC3BB]/30 bg-[#007472]/20 px-3 py-1.5 text-xs font-bold text-[#2AC3BB] transition-colors hover:bg-[#007472]/40 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'تحديث' : 'Refresh'}</span>
          </button>
        )}
      </div>

      {/* Task Cards Grid */}
      {tasks.length === 0 && !loading ? (
        <div className="py-6 text-center text-xs font-bold text-[#8BAEAD]">
          {isAr ? 'لا توجد مهام أسبوعية متاحة حالياً.' : 'No weekly tasks available right now.'}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => {
            const isCompleted = task.progress >= task.target;
            const isClaimed = Boolean(task.claimedAt);
            const progressPercent = Math.min(100, Math.round((task.progress / Math.max(1, task.target)) * 100));
            const isClaiming = claimingTaskId === task.id;

            return (
              <div
                key={task.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
                  isClaimed
                    ? 'border-[#2AC3BB]/20 bg-[#007472]/10 opacity-75'
                    : isCompleted
                    ? 'border-[#2AC3BB]/60 bg-[#007472]/25 shadow-[0_4px_20px_rgba(42,195,187,0.2)]'
                    : 'border-[#2AC3BB]/20 bg-[#031717]/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-xs font-black text-[#FCF6EE]">
                        {isAr ? task.nameAr : task.name}
                      </h4>
                      <p className="mt-1 line-clamp-2 min-h-7 text-[10px] text-[#8BAEAD]">
                        {isAr ? task.descriptionAr : task.description}
                      </p>
                    </div>
                    {isClaimed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2AC3BB]" />
                    ) : (
                      <Trophy className={`h-4 w-4 shrink-0 ${isCompleted ? 'text-[#EE8361]' : 'text-[#8BAEAD]'}`} />
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#8BAEAD] mb-1">
                      <span>{isAr ? 'الإنجاز الأسبوعي' : 'Weekly Progress'}</span>
                      <span className="font-mono text-[#FCF6EE]">
                        {task.progress}/{task.target}
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

                {/* Rewards and Claim Button */}
                <div className="mt-4 border-t border-[#2AC3BB]/10 pt-3">
                  <div className="mb-2.5 flex items-center justify-between text-[10px] font-black">
                    <span className="flex items-center gap-1 text-[#2AC3BB]">
                      <Sparkles className="h-3 w-3" />
                      +{task.pointsReward} XP
                    </span>
                    <span className="flex items-center gap-1 text-[#FBDFC7]">
                      <Coins className="h-3 w-3 text-[#EE8361]" />
                      +{task.coinsReward} {isAr ? 'عملة' : 'coins'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void onClaimTask(task.id)}
                    disabled={!isCompleted || isClaimed || isClaiming}
                    className={`flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-all ${
                      isClaimed
                        ? 'border border-[#2AC3BB]/30 bg-transparent text-[#8BAEAD] cursor-default'
                        : isCompleted
                        ? 'bg-gradient-to-r from-[#007472] via-[#2AC3BB] to-[#007472] text-[#FCF6EE] hover:opacity-90 active:scale-98 shadow-md cursor-pointer'
                        : 'border border-[#2AC3BB]/20 bg-[#031717] text-[#8BAEAD] cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{isAr ? 'جارٍ الجمع...' : 'Claiming...'}</span>
                      </>
                    ) : isClaimed ? (
                      <span>{isAr ? 'تم استلام المكافأة' : 'Claimed'}</span>
                    ) : isCompleted ? (
                      <span>{isAr ? 'اجمع المكافأة الآن' : 'Claim Reward'}</span>
                    ) : (
                      <span>{isAr ? 'أكمل المهمة للمطالبة' : 'Complete to Claim'}</span>
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

export default WeeklyTasksBoard;
