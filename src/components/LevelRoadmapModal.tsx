import React, { useState, useMemo } from 'react';
import {
  getUserLevelInfo,
  getAll100Levels,
  getDivisionForLevel,
  DIVISIONS,
  LevelUnlock,
} from '../lib/levelingSystem';
import TitleAvatarBadge, { TitleAvatarIcon } from './TitleAvatarBadge';
import {
  X,
  Trophy,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap,
  Gift,
  Coins,
  Palette,
  Shield,
  Search,
} from 'lucide-react';
import OverlayPortal from './OverlayPortal';

interface LevelRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  userXp: number;
  lang?: 'ar' | 'en';
}

export default function LevelRoadmapModal({
  isOpen,
  onClose,
  userXp,
  lang = 'ar',
}: LevelRoadmapModalProps) {
  const isAr = lang === 'ar';
  const levelInfo = useMemo(() => getUserLevelInfo(userXp), [userXp]);
  const allLevels = useMemo(() => getAll100Levels(), []);

  const [selectedDivision, setSelectedDivision] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLevels = useMemo(() => {
    return allLevels.filter((item) => {
      if (selectedDivision !== 'all') {
        const div = getDivisionForLevel(item.level);
        if (div.division !== selectedDivision) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesLevel = String(item.level).includes(query);
        const matchesTitle =
          item.titleAr.toLowerCase().includes(query) ||
          item.titleEn.toLowerCase().includes(query);
        const matchesDesc =
          item.descAr.toLowerCase().includes(query) ||
          item.descEn.toLowerCase().includes(query);
        return matchesLevel || matchesTitle || matchesDesc;
      }
      return true;
    });
  }, [allLevels, selectedDivision, searchQuery]);

  if (!isOpen) return null;

  const getCategoryIcon = (cat: LevelUnlock['category']) => {
    switch (cat) {
      case 'frame':
        return <Shield className="h-4 w-4 text-[#2AC3BB]" />;
      case 'theme':
        return <Palette className="h-4 w-4 text-purple-400" />;
      case 'coins':
        return <Coins className="h-4 w-4 text-amber-400" />;
      case 'badge':
        return <Trophy className="h-4 w-4 text-orange-400" />;
      case 'aura':
        return <Sparkles className="h-4 w-4 text-pink-400" />;
      case 'title':
      case 'perk':
      default:
        return <Zap className="h-4 w-4 text-[#007472] dark:text-[#2AC3BB]" />;
    }
  };

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[140] flex flex-col justify-end sm:justify-center items-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4 overflow-hidden"
        onClick={onClose}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div
          className="w-full max-w-2xl rounded-t-[32px] sm:rounded-[32px] border border-slate-200 dark:border-[#2AC3BB]/30 bg-white dark:bg-[#072424] text-slate-900 dark:text-[#FCF6EE] shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#2AC3BB]/20 px-6 py-4 bg-white/95 dark:bg-[#072424]/95 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#007472] to-[#2AC3BB] text-white shadow-sm">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-[#FCF6EE]">
                  {isAr ? 'خريطة المستويات ومكافآت الـ 100 ليفل' : '1-100 Level Progression Roadmap'}
                </h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-[#8BAEAD]">
                  {isAr
                    ? 'افتح إطارات وألقاباً وهالات مميزة مع كل مستوى تحققه'
                    : 'Unlock frames, titles, and perks with each milestone'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Current Level Hero Card */}
          <div className="border-b border-slate-100 dark:border-[#2AC3BB]/20 bg-gradient-to-r from-[#007472]/10 via-[#2AC3BB]/10 to-transparent p-5 shrink-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <TitleAvatarBadge level={levelInfo.level} size="lg" lang={lang} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black font-mono text-[#007472] dark:text-[#2AC3BB]">
                      Lv.{levelInfo.level}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      / 100 {levelInfo.isMaxLevel && '🏆 (MAX)'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {userXp.toLocaleString()} {isAr ? 'نقطة خبرة XP إجمالية' : 'Total XP'}
                  </p>
                </div>
              </div>

              {/* Progress to next level */}
              <div className="w-full sm:w-56 space-y-1.5 text-end">
                <div className="flex justify-between text-[11px] font-black text-slate-600 dark:text-[#8BAEAD]">
                  <span>{isAr ? 'التقدم للمستوى القادم:' : 'Next Level:'}</span>
                  <span className="font-mono text-[#007472] dark:text-[#2AC3BB]">
                    {levelInfo.isMaxLevel
                      ? isAr
                        ? 'الحد الأقصى للمستوى!'
                        : 'MAX LEVEL'
                      : `${levelInfo.progressPercent}%`}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#007472] via-[#2AC3BB] to-[#EE8361] transition-all duration-500 shadow-xs"
                    style={{ width: `${levelInfo.progressPercent}%` }}
                  />
                </div>
                {!levelInfo.isMaxLevel && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 text-start">
                    {isAr
                      ? `متبقي ${(levelInfo.nextLevelXp - levelInfo.currentXp).toLocaleString()} XP للمستوى ${levelInfo.level + 1}`
                      : `${(levelInfo.nextLevelXp - levelInfo.currentXp).toLocaleString()} XP needed for Lv.${levelInfo.level + 1}`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Division Filters & Search */}
          <div className="flex flex-col gap-2.5 p-4 border-b border-slate-100 dark:border-[#2AC3BB]/15 bg-slate-50/70 dark:bg-[#072424]/40 shrink-0">
            <div className="relative w-full">
              <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث برقم المستوى أو المكافأة أو اللقب...' : 'Search level number, reward, or title...'}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 ps-9 pe-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#2AC3BB]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedDivision('all')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition shrink-0 cursor-pointer ${
                  selectedDivision === 'all'
                    ? 'bg-[#007472] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {isAr ? 'الكل (1-100)' : 'All (1-100)'}
              </button>
              {DIVISIONS.map((div) => {
                const isSelected = selectedDivision === div.division;
                return (
                  <button
                    key={div.division}
                    type="button"
                    onClick={() => setSelectedDivision(div.division)}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black transition shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#007472] text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <TitleAvatarIcon division={div} size="xs" />
                    <span>{isAr ? div.titleAr : div.titleEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Levels Roadmap List */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3">
            {filteredLevels.map((lvl) => {
              const isUnlocked = levelInfo.level >= lvl.level;
              const isCurrent = levelInfo.level === lvl.level;
              const div = getDivisionForLevel(lvl.level);

              return (
                <div
                  key={lvl.level}
                  className={`flex items-start justify-between gap-3 rounded-2xl border p-3.5 transition-all ${
                    isCurrent
                      ? 'border-[#2AC3BB] bg-[#2AC3BB]/10 shadow-md ring-2 ring-[#2AC3BB]/30'
                      : isUnlocked
                      ? 'border-emerald-500/20 bg-emerald-500/5 dark:border-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Level Number Pill */}
                    <div
                      className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl border text-center font-mono ${
                        isCurrent
                          ? 'border-[#2AC3BB] bg-[#007472] text-white font-black shadow-xs'
                          : isUnlocked
                          ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-800/50 text-slate-400'
                      }`}
                    >
                      <span className="text-[9px] uppercase leading-none text-slate-400 dark:text-slate-400">LVL</span>
                      <span className="text-sm font-black leading-tight">{lvl.level}</span>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {isAr ? lvl.titleAr : lvl.titleEn}
                        </h4>
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300">
                          {getCategoryIcon(lvl.category)}
                          <span className="capitalize">{lvl.category}</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                        {isAr ? lvl.descAr : lvl.descEn}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0 flex items-center pt-1">
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#2AC3BB]/20 px-2.5 py-1 text-[10px] font-black text-[#007472] dark:text-[#2AC3BB]">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        <span>{isAr ? 'المستوى الحالي' : 'Current'}</span>
                      </span>
                    ) : isUnlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{isAr ? 'مكتمل' : 'Unlocked'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 dark:bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                        <Lock className="h-3 w-3" />
                        <span>{isAr ? 'مغلق' : 'Locked'}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredLevels.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-500">
                {isAr ? 'لا توجد مستويات مطابقة للبحث' : 'No levels found matching your search'}
              </div>
            )}
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
