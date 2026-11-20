import * as React from 'react';
import { ArrowLeft, Gamepad2, Sparkles, Store, Trophy } from 'lucide-react';
import { getRewardsSummary } from '../lib/db';
import { IndependentStore, type StoreRewards } from '../components/IndependentStore';
import RewardsSection from '../components/RewardsSection';

type StorePageProps = {
  userId: string;
  userName?: string;
  isPremium?: boolean;
  planName?: string;
  lang: 'ar' | 'en';
  onNavigate: (tab: string) => void;
  initialView?: 'games' | 'store';
};

export default function StorePage({
  userId,
  userName,
  isPremium,
  planName,
  lang,
  onNavigate,
  initialView = 'games',
}: StorePageProps) {
  const isAr = lang === 'ar';
  const [viewMode, setViewMode] = React.useState<'games' | 'store'>(initialView);
  const [rewards, setRewards] = React.useState<StoreRewards>({ points: 0, coins: 0, dailyStreak: 0 });

  React.useEffect(() => {
    setViewMode(initialView);
  }, [initialView]);

  const refresh = React.useCallback(async () => {
    if (!userId || userId.startsWith('user-')) return;
    const summary = await getRewardsSummary(userId);
    setRewards({ points: summary?.points || 0, coins: summary?.coins || 0, dailyStreak: summary?.dailyStreak || 0 });
  }, [userId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-14 pt-5 sm:px-6 lg:px-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header Hub */}
      <header className="dark mb-6 overflow-hidden rounded-[2rem] border border-[#2AC3BB]/30 bg-gradient-to-br from-[#007472] via-[#005e5c] to-[#EE8361] p-6 text-white shadow-xl shadow-[#EE8361]/20 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#FBDFC7]">
              <Sparkles className="h-4 w-4 text-[#EE8361]" /> QuizSpace Arcade & Store
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-white">
              {viewMode === 'games'
                ? (isAr ? 'مركز المكافآت والألعاب' : 'Rewards & Arcade')
                : (isAr ? 'متجر الإطارات والباقات' : 'Store & Frames')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-teal-50/90">
              {viewMode === 'games'
                ? (isAr
                    ? `العب واجمع النقاط والعملات، دور عجلة الحظ، حل الألغاز واكسب الشارات — أهلاً ${userName || ''}`
                    : `Play mini-games, spin the wheel, solve word puzzles, and claim daily gifts — welcome ${userName || ''}`)
                : (isAr
                    ? `إطارات الملف الشخصي الحصرية وحزم نقاط المكافآت — أهلاً ${userName || ''}`
                    : `Exclusive profile frames and reward points packages — welcome ${userName || ''}`)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('customization')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/25 cursor-pointer backdrop-blur-xs"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {isAr ? 'تخصيص الملف' : 'Profile customization'}
            </button>
          </div>
        </div>

        {/* Interactive Mode Switcher Tabs */}
        <div className="mt-6 flex flex-wrap gap-2.5 pt-4 border-t border-white/15">
          <button
            type="button"
            onClick={() => setViewMode('games')}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all cursor-pointer ${
              viewMode === 'games'
                ? 'bg-white text-[#007472] shadow-lg scale-102 ring-2 ring-white/50'
                : 'bg-black/25 text-white/90 hover:bg-black/35 hover:text-white'
            }`}
          >
            <Gamepad2 className="h-4 w-4 text-[#EE8361]" />
            <span>{isAr ? '🎮 مركز المكافآت والألعاب المصغرة' : '🎮 Rewards & Arcade Games'}</span>
            <span className="rounded-full bg-[#EE8361]/20 text-[#EE8361] px-2 py-0.5 text-[10px] font-black">
              {isAr ? 'جديد' : 'NEW'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('store')}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all cursor-pointer ${
              viewMode === 'store'
                ? 'bg-white text-[#007472] shadow-lg scale-102 ring-2 ring-white/50'
                : 'bg-black/25 text-white/90 hover:bg-black/35 hover:text-white'
            }`}
          >
            <Store className="h-4 w-4 text-[#2AC3BB]" />
            <span>{isAr ? '🛍️ متجر الإطارات والباقات' : '🛍️ Frames & Store Catalog'}</span>
          </button>
        </div>
      </header>

      {/* Content Area */}
      {viewMode === 'games' ? (
        <section className="space-y-6">
          <RewardsSection userId={userId} lang={lang} />
        </section>
      ) : (
        <section className="space-y-6">
          <IndependentStore
            userId={userId}
            isPremium={isPremium}
            planName={planName}
            rewards={rewards}
            onRewardsChanged={() => void refresh()}
            lang={lang}
          />
        </section>
      )}
    </main>
  );
}
