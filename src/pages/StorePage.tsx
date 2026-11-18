import * as React from 'react';
import { ArrowLeft, Store } from 'lucide-react';
import { getRewardsSummary } from '../lib/db';
import { IndependentStore, type StoreRewards } from '../components/IndependentStore';

type StorePageProps = {
  userId: string;
  userName?: string;
  isPremium?: boolean;
  planName?: string;
  lang: 'ar' | 'en';
  onNavigate: (tab: string) => void;
};

export default function StorePage({ userId, userName, isPremium, planName, lang, onNavigate }: StorePageProps) {
  const isAr = lang === 'ar';
  const [rewards, setRewards] = React.useState<StoreRewards>({ points: 0, coins: 0, dailyStreak: 0 });

  const refresh = React.useCallback(async () => {
    if (!userId || userId.startsWith('user-')) return;
    const summary = await getRewardsSummary(userId);
    setRewards({ points: summary?.points || 0, coins: summary?.coins || 0, dailyStreak: summary?.dailyStreak || 0 });
  }, [userId]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-14 pt-5 sm:px-6 lg:px-10" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="mb-6 overflow-hidden rounded-[2rem] border border-violet-300/40 bg-gradient-to-br from-violet-800 via-indigo-700 to-sky-700 p-6 text-white shadow-xl shadow-violet-500/10 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/70"><Store className="h-4 w-4" /> QuizSpace Store</div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{isAr ? 'المتجر' : 'Store'}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">{isAr ? `إطارات الملف الشخصي والباقات — أهلاً ${userName || ''}` : `Profile frames and reward bundles — welcome ${userName || ''}`}</p>
          </div>
          <button type="button" onClick={() => onNavigate('customization')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-black transition hover:bg-white/20"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{isAr ? 'تخصيص الملف' : 'Profile customization'}</button>
        </div>
      </header>
      <IndependentStore userId={userId} isPremium={isPremium} planName={planName} rewards={rewards} onRewardsChanged={() => void refresh()} lang={lang} />
    </main>
  );
}
