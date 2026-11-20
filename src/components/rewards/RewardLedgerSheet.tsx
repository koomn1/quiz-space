import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  Filter,
  History,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { RewardLedgerEntry } from '../../types';
import { getRewardLedger } from '../../lib/db';
import { getRewardEntryDetail, getRewardEventLabel } from '../../lib/rewardPresentation';

export interface RewardLedgerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  entries?: RewardLedgerEntry[];
  offset?: number;
  hasMore?: boolean;
  loading?: boolean;
  onPaginate?: (offset: number) => void;
  onRefresh?: () => void;
  lang?: 'ar' | 'en';
}

type FilterCategory = 'all' | 'quizzes' | 'games' | 'gifts' | 'challenges' | 'store';

export const RewardLedgerSheet: React.FC<RewardLedgerSheetProps> = ({
  isOpen,
  onClose,
  userId = 'default-user',
  entries: propEntries,
  offset: propOffset,
  hasMore: propHasMore,
  loading: propLoading,
  onPaginate,
  onRefresh,
  lang = 'ar',
}) => {
  const isAr = lang === 'ar';
  const [internalEntries, setInternalEntries] = useState<RewardLedgerEntry[]>([]);
  const [internalOffset, setInternalOffset] = useState(0);
  const [internalHasMore, setInternalHasMore] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');

  const entries = propEntries !== undefined ? propEntries : internalEntries;
  const offset = propOffset !== undefined ? propOffset : internalOffset;
  const hasMore = propHasMore !== undefined ? propHasMore : internalHasMore;
  const loading = propLoading !== undefined ? propLoading : internalLoading;

  const fetchPage = useCallback(
    async (pageOffset: number) => {
      if (onPaginate) {
        onPaginate(pageOffset);
        return;
      }
      setInternalLoading(true);
      try {
        const page = await getRewardLedger(userId, pageOffset);
        setInternalEntries(page.entries);
        setInternalOffset(pageOffset);
        setInternalHasMore(page.hasMore);
      } catch {
        // Handle error
      } finally {
        setInternalLoading(false);
      }
    },
    [userId, onPaginate]
  );

  useEffect(() => {
    if (isOpen && propEntries === undefined) {
      void fetchPage(0);
    }
  }, [isOpen, propEntries, fetchPage]);

  // Filter entries based on category
  const filteredEntries = useMemo(() => {
    if (activeCategory === 'all') return entries;

    return entries.filter((entry) => {
      const type = entry.eventType.toLowerCase();
      switch (activeCategory) {
        case 'quizzes':
          return type.includes('quiz');
        case 'games':
          return (
            type.includes('game') ||
            type.includes('spin') ||
            type.includes('matrix') ||
            type.includes('challenge')
          );
        case 'gifts':
          return type.includes('gift') || type.includes('mystery');
        case 'challenges':
          return type.includes('challenge') || type.includes('weekly');
        case 'store':
          return type.includes('store') || type.includes('purchase') || type.includes('frame');
        default:
          return true;
      }
    });
  }, [entries, activeCategory]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="reward-ledger-sheet"
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity"
    >
      <div className="relative flex h-full w-full max-w-md flex-col border-s border-[#2AC3BB]/30 bg-[#072424] text-[#FCF6EE] shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2AC3BB]/20 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#007472]/30 text-[#2AC3BB] border border-[#2AC3BB]/30">
              <History className="h-5 w-5 text-[#2AC3BB]" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#FCF6EE]">
                {isAr ? 'سجل العمليات والمكافآت' : 'Reward Ledger'}
              </h3>
              <p className="text-[11px] text-[#8BAEAD]">
                {isAr ? 'تفاصيل كل حركة نقاط وعملات' : 'Detailed history of points & coins'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onRefresh) onRefresh();
                else void fetchPage(offset);
              }}
              disabled={loading}
              className="rounded-lg p-2 text-[#8BAEAD] hover:bg-white/10 hover:text-[#FCF6EE] disabled:opacity-50"
              aria-label="تحديث"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[#8BAEAD] hover:bg-white/10 hover:text-[#FCF6EE]"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#2AC3BB]/15 p-3 scrollbar-none">
          <Filter className="h-3.5 w-3.5 shrink-0 text-[#2AC3BB] mx-1" />
          {(
            [
              { key: 'all', ar: 'الكل', en: 'All' },
              { key: 'quizzes', ar: 'كويزات', en: 'Quizzes' },
              { key: 'games', ar: 'ألعاب', en: 'Games' },
              { key: 'gifts', ar: 'هدايا', en: 'Gifts' },
              { key: 'challenges', ar: 'تحديات', en: 'Tasks' },
              { key: 'store', ar: 'متجر', en: 'Store' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
                activeCategory === cat.key
                  ? 'bg-gradient-to-r from-[#007472] to-[#2AC3BB] text-[#072424]'
                  : 'bg-[#031717] text-[#8BAEAD] hover:text-[#FCF6EE]'
              }`}
            >
              {isAr ? cat.ar : cat.en}
            </button>
          ))}
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading && (
            <div className="py-12 text-center text-xs font-bold text-[#8BAEAD]">
              {isAr ? 'جاري تحميل سجل العمليات...' : 'Loading transactions...'}
            </div>
          )}

          {!loading && filteredEntries.length === 0 && (
            <div className="py-12 text-center text-xs font-bold text-[#8BAEAD]">
              {isAr ? 'لا توجد حركات مسجلة في هذا القسم.' : 'No recorded activity in this section.'}
            </div>
          )}

          {!loading &&
            filteredEntries.map((entry) => {
              const detail = getRewardEntryDetail(entry.metadata, isAr);
              const positive = entry.points >= 0;
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[#2AC3BB]/15 bg-[#031717]/80 p-3.5 transition-colors hover:border-[#2AC3BB]/35"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-[#FCF6EE]">
                      {getRewardEventLabel(entry.eventType, isAr)}
                    </p>
                    {detail && (
                      <p className="mt-0.5 truncate text-[10px] text-[#8BAEAD]">{detail}</p>
                    )}
                    <p className="mt-1 font-mono text-[9px] text-[#8BAEAD]/70">
                      {new Date(entry.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>

                  <div className="shrink-0 text-end">
                    <p
                      className={`font-mono text-xs font-black ${
                        positive ? 'text-[#2AC3BB]' : 'text-[#EE8361]'
                      }`}
                    >
                      {positive ? '+' : ''}
                      {entry.points.toLocaleString()} {isAr ? 'XP' : 'XP'}
                    </p>
                    {entry.coins ? (
                      <p className="mt-0.5 flex items-center justify-end gap-1 font-mono text-[11px] font-black text-[#FBDFC7]">
                        <Coins className="h-3 w-3 text-[#EE8361]" />
                        +{entry.coins.toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-[#2AC3BB]/20 p-4 flex items-center justify-between gap-2 bg-[#031717]/90">
          <button
            type="button"
            onClick={() => void fetchPage(Math.max(0, offset - 20))}
            disabled={loading || offset === 0}
            className="flex items-center gap-1 rounded-xl border border-[#2AC3BB]/25 bg-[#007472]/20 px-3 py-1.5 text-xs font-bold text-[#FCF6EE] disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            <span>{isAr ? 'الأحدث' : 'Newer'}</span>
          </button>

          <span className="font-mono text-[11px] text-[#8BAEAD]">
            {entries.length > 0 ? `${offset + 1}–${offset + entries.length}` : ''}
          </span>

          <button
            type="button"
            onClick={() => void fetchPage(offset + 20)}
            disabled={loading || !hasMore}
            className="flex items-center gap-1 rounded-xl border border-[#2AC3BB]/25 bg-[#007472]/20 px-3 py-1.5 text-xs font-bold text-[#FCF6EE] disabled:opacity-40"
          >
            <span>{isAr ? 'الأقدم' : 'Older'}</span>
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewardLedgerSheet;
