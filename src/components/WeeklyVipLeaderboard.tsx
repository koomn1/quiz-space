import { useCallback, useEffect, useState } from 'react';
import { Crown, Medal, RefreshCw, Trophy } from 'lucide-react';
import { getWeeklyVipLeaderboard } from '../lib/db';
import { WeeklyVipLeaderboardEntry } from '../types';

interface WeeklyVipLeaderboardProps {
  lang: 'ar' | 'en';
}

const tierLabels: Record<string, { ar: string; en: string }> = {
  bronze: { ar: 'برونزي', en: 'Bronze' },
  silver: { ar: 'فضي', en: 'Silver' },
  gold: { ar: 'ذهبي', en: 'Gold' },
  platinum: { ar: 'بلاتيني', en: 'Platinum' },
};

export default function WeeklyVipLeaderboard({ lang }: WeeklyVipLeaderboardProps) {
  const isAr = lang === 'ar';
  const [entries, setEntries] = useState<WeeklyVipLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setEntries(await getWeeklyVipLeaderboard());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const rankStyle = (rank: number) => {
    if (rank === 1) return 'border-amber-400/50 bg-amber-400/15';
    if (rank === 2) return 'border-slate-300/60 bg-slate-200/40 dark:border-slate-500/40 dark:bg-slate-700/20';
    if (rank === 3) return 'border-orange-400/40 bg-orange-400/10';
    return 'border-slate-200/70 bg-white/60 dark:border-slate-800 dark:bg-slate-950/40';
  };

  return (
    <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-4" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-500"><Trophy className="h-6 w-6" /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">{isAr ? 'منافسة VIP' : 'VIP Competition'}</p>
            <h3 className="text-base font-black text-slate-900 dark:text-white">{isAr ? 'لوحة الصدارة الأسبوعية' : 'Weekly Leaderboard'}</h3>
            <p className="text-[10px] font-bold text-slate-500">{isAr ? 'أفضل لاعبي VIP هذا الأسبوع' : 'Top VIP players this week'}</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="flex items-center gap-1 rounded-lg border border-indigo-400/30 px-2.5 py-1.5 text-[10px] font-black text-indigo-600 disabled:opacity-50 dark:text-indigo-300">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {isAr ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {loading && <div className="py-6 text-center text-xs font-bold text-slate-500">{isAr ? 'جاري تحميل الترتيب...' : 'Loading rankings...'}</div>}
      {!loading && error && <div className="rounded-xl bg-rose-500/10 p-4 text-center text-xs font-bold text-rose-600 dark:text-rose-300">{isAr ? 'تعذر تحميل لوحة الصدارة حالياً' : 'Leaderboard is unavailable right now'}</div>}
      {!loading && !error && entries.length === 0 && <div className="rounded-xl bg-white/50 p-4 text-center text-xs font-bold text-slate-500 dark:bg-slate-950/30">{isAr ? 'ابدأ بجمع النقاط لتظهر في المنافسة' : 'Start earning points to enter the competition'}</div>}
      {!loading && !error && entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry) => {
            const tier = tierLabels[entry.vipTier] || { ar: entry.vipTier, en: entry.vipTier };
            const top = entry.leaderboardRank <= 3;
            return (
              <div key={entry.userId} className={`flex items-center gap-3 rounded-xl border p-2.5 ${rankStyle(entry.leaderboardRank)} ${entry.isMe ? 'ring-2 ring-indigo-400/60' : ''}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${entry.leaderboardRank === 1 ? 'bg-amber-400 text-white' : entry.leaderboardRank === 2 ? 'bg-slate-400 text-white' : entry.leaderboardRank === 3 ? 'bg-orange-400 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {top ? <Medal className="h-4 w-4" /> : entry.leaderboardRank}
                </div>
                {entry.photoUrl ? <img src={entry.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-500"><Crown className="h-4 w-4" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-slate-900 dark:text-white">{entry.displayName}{entry.isMe && <span className="mx-1 text-[10px] font-bold text-indigo-500">({isAr ? 'أنت' : 'You'})</span>}</p>
                  <p className="text-[10px] font-bold text-slate-500">VIP {isAr ? tier.ar : tier.en}</p>
                </div>
                <div className="text-end"><p className="text-sm font-black text-indigo-600 dark:text-indigo-300">{entry.weeklyPoints.toLocaleString()}</p><p className="text-[9px] font-bold text-slate-500">{isAr ? 'نقطة هذا الأسبوع' : 'weekly points'}</p></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

