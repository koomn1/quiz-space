import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  ChevronLeft,
  Clock,
  Compass,
  Gamepad2,
  Gift,
  HelpCircle,
  RotateCw,
  Sparkles,
  Star,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { getDailyGameAllowance } from '../../lib/miniGamesEngine';
import { MiniGameId } from '../../types';
import { CosmicMatchGame } from './CosmicMatchGame';
import { DailySpinWheel } from './DailySpinWheel';
import { WordMatrixPuzzle } from './WordMatrixPuzzle';

export interface ArcadeHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onUpdateRewards?: (rewards: { coins?: number; xp?: number }) => void;
  initialGameId?: MiniGameId | null;
  className?: string;
}

export const ArcadeHubModal: React.FC<ArcadeHubModalProps> = ({
  isOpen,
  onClose,
  userId = 'guest-player',
  onUpdateRewards,
  initialGameId = null,
  className = '',
}) => {
  const [activeGame, setActiveGame] = useState<MiniGameId | null>(initialGameId);

  // Allowances state for all 3 games
  const [allowances, setAllowances] = useState(() => ({
    word_matrix: getDailyGameAllowance(userId, 'word_matrix'),
    cosmic_match: getDailyGameAllowance(userId, 'cosmic_match'),
    spin_wheel: getDailyGameAllowance(userId, 'spin_wheel'),
  }));

  const refreshAllowances = useCallback(() => {
    setAllowances({
      word_matrix: getDailyGameAllowance(userId, 'word_matrix'),
      cosmic_match: getDailyGameAllowance(userId, 'cosmic_match'),
      spin_wheel: getDailyGameAllowance(userId, 'spin_wheel'),
    });
  }, [userId]);

  // Sync initialGameId when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveGame(initialGameId);
      refreshAllowances();
    }
  }, [isOpen, initialGameId, refreshAllowances]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (activeGame) {
          setActiveGame(null);
          refreshAllowances();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeGame, onClose, refreshAllowances]);

  if (!isOpen) return null;

  // Reward handler wrapper
  const handleGameReward = (rewards: { coins?: number; xp?: number }) => {
    refreshAllowances();
    if (onUpdateRewards) {
      onUpdateRewards(rewards);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Modal Dialog Container */}
      <div
        className={`w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#072424] text-[#FCF6EE] border border-[#2AC3BB]/30 shadow-2xl relative flex flex-col ${className}`}
      >
        {/* Ambient background glows */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#007472]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#2AC3BB]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header / Navigation Bar */}
        <div className="relative sticky top-0 z-20 flex items-center justify-between px-5 py-4 bg-[#072424]/95 backdrop-blur-md border-b border-[#2AC3BB]/20">
          {activeGame ? (
            <button
              onClick={() => {
                setActiveGame(null);
                refreshAllowances();
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#007472]/60 hover:bg-[#007472] border border-[#2AC3BB]/40 text-[#FCF6EE] text-sm font-semibold transition group shadow-md"
            >
              <ArrowRight className="w-4 h-4 text-[#2AC3BB] group-hover:-translate-x-0.5 transition-transform" />
              <span>العودة إلى صالة الألعاب</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#007472] border border-[#2AC3BB]/40 flex items-center justify-center text-[#2AC3BB] shadow-inner">
                <Gamepad2 className="w-5 h-5 text-[#2AC3BB]" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-[#FCF6EE] tracking-tight">
                  مركز ألعاب كويز سبيس
                </h1>
                <p className="text-xs text-[#2AC3BB]">
                  العب يومياً واكسب العملات ونقاط الخبرة وجوائز حصرية
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
              title="إغلاق المركز"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Either Hub Selection Cards OR Active Game */}
        <div className="p-4 sm:p-6 md:p-8 flex-1">
          {activeGame === 'word_matrix' && (
            <div className="py-2">
              <WordMatrixPuzzle
                userId={userId}
                onClose={() => {
                  setActiveGame(null);
                  refreshAllowances();
                }}
                onComplete={handleGameReward}
              />
            </div>
          )}

          {activeGame === 'cosmic_match' && (
            <div className="py-2">
              <CosmicMatchGame
                userId={userId}
                onClose={() => {
                  setActiveGame(null);
                  refreshAllowances();
                }}
                onComplete={handleGameReward}
              />
            </div>
          )}

          {activeGame === 'spin_wheel' && (
            <div className="py-2">
              <DailySpinWheel
                userId={userId}
                onClose={() => {
                  setActiveGame(null);
                  refreshAllowances();
                }}
                onClaimPrize={(prize) => {
                  if (prize.type === 'coins') {
                    handleGameReward({ coins: prize.amount });
                  } else if (prize.type === 'xp') {
                    handleGameReward({ xp: prize.amount });
                  } else {
                    refreshAllowances();
                  }
                }}
                onUpdateCoins={(coins) => handleGameReward({ coins })}
              />
            </div>
          )}

          {/* Hub View: The 3 Mini-Game Cards */}
          {!activeGame && (
            <div className="space-y-6">
              {/* Daily status banner */}
              <div className="p-4 rounded-3xl bg-[#007472]/30 border border-[#2AC3BB]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#007472] border border-[#2AC3BB]/40 flex items-center justify-center text-[#2AC3BB]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#FCF6EE]">
                      تجديد المحاولات اليومية
                    </h3>
                    <p className="text-xs text-[#FBDFC7]">
                      تتجدد المحاولات تلقائياً كل منتصف ليل بتوقيت مكة المكرمة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#2AC3BB] font-mono bg-[#072424]/60 px-3 py-1.5 rounded-xl border border-[#2AC3BB]/20">
                  <Clock className="w-3.5 h-3.5" />
                  <span>3 ألعاب تعليمية متاحة</span>
                </div>
              </div>

              {/* 3 Games Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                {/* 1. Word Matrix Puzzle */}
                <div
                  onClick={() => setActiveGame('word_matrix')}
                  className="rounded-3xl bg-[#0C3232] border-2 border-[#2AC3BB]/30 hover:border-[#2AC3BB] p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(42,195,187,0.2)] group relative overflow-hidden"
                >
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#2AC3BB]/10 rounded-full blur-2xl group-hover:bg-[#2AC3BB]/20 transition-all pointer-events-none" />

                  <div>
                    {/* Top row: Icon + Allowance Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#007472] border border-[#2AC3BB]/40 flex items-center justify-center text-[#2AC3BB] shadow-inner group-hover:scale-105 transition-transform">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          allowances.word_matrix.remainingPlays > 0
                            ? 'bg-[#2AC3BB]/20 text-[#2AC3BB] border border-[#2AC3BB]/40'
                            : 'bg-white/10 text-white/50 border border-white/10'
                        }`}
                      >
                        {allowances.word_matrix.remainingPlays > 0
                          ? `متبقي ${allowances.word_matrix.remainingPlays} محاولات`
                          : 'نفدت المحاولات'}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-[#FCF6EE] mb-1.5 group-hover:text-[#2AC3BB] transition-colors">
                      1. لغز مصفوفة الكلمات
                    </h3>
                    <p className="text-xs text-white/70 line-clamp-3 mb-4 leading-relaxed">
                      اربط حروف الكلمات العلمية واللغوية في المصفوفة الدائرية لتجميع نقاط الخبرة والعملات.
                    </p>
                  </div>

                  <div>
                    {/* Reward potential */}
                    <div className="p-2.5 rounded-2xl bg-[#072424]/60 border border-[#2AC3BB]/20 mb-4 flex items-center justify-between text-xs">
                      <span className="text-white/60">المكافأة:</span>
                      <span className="font-bold text-[#FBDFC7] font-mono">
                        حتى +25 عملة و +40 XP
                      </span>
                    </div>

                    <button className="w-full py-2.5 rounded-2xl bg-[#007472] group-hover:bg-[#2AC3BB] text-[#FCF6EE] group-hover:text-[#072424] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md">
                      <span>ابدأ اللعب الآن</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Cosmic Memory Match */}
                <div
                  onClick={() => setActiveGame('cosmic_match')}
                  className="rounded-3xl bg-[#0C3232] border-2 border-[#2AC3BB]/30 hover:border-[#2AC3BB] p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(42,195,187,0.2)] group relative overflow-hidden"
                >
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#007472]/20 rounded-full blur-2xl group-hover:bg-[#007472]/30 transition-all pointer-events-none" />

                  <div>
                    {/* Top row: Icon + Allowance Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#007472] border border-[#2AC3BB]/40 flex items-center justify-center text-amber-400 shadow-inner group-hover:scale-105 transition-transform">
                        <Trophy className="w-6 h-6 fill-amber-400/20" />
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          allowances.cosmic_match.remainingPlays > 0
                            ? 'bg-[#2AC3BB]/20 text-[#2AC3BB] border border-[#2AC3BB]/40'
                            : 'bg-white/10 text-white/50 border border-white/10'
                        }`}
                      >
                        {allowances.cosmic_match.remainingPlays > 0
                          ? `متبقي ${allowances.cosmic_match.remainingPlays} محاولات`
                          : 'نفدت المحاولات'}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-[#FCF6EE] mb-1.5 group-hover:text-[#2AC3BB] transition-colors">
                      2. تطابق الذاكرة
                    </h3>
                    <p className="text-xs text-white/70 line-clamp-3 mb-4 leading-relaxed">
                      اقلب البطاقات وطابق الرموز التعليمية الستة في شبكة 4x3 قبل انتهاء الـ 45 ثانية!
                    </p>
                  </div>

                  <div>
                    {/* Reward potential */}
                    <div className="p-2.5 rounded-2xl bg-[#072424]/60 border border-[#2AC3BB]/20 mb-4 flex items-center justify-between text-xs">
                      <span className="text-white/60">المكافأة:</span>
                      <span className="font-bold text-amber-300 font-mono">
                        +20 عملة و +30 XP
                      </span>
                    </div>

                    <button className="w-full py-2.5 rounded-2xl bg-[#007472] group-hover:bg-[#2AC3BB] text-[#FCF6EE] group-hover:text-[#072424] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md">
                      <span>ابدأ اللعب الآن</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 3. Daily Lucky Spin Wheel */}
                <div
                  onClick={() => setActiveGame('spin_wheel')}
                  className="rounded-3xl bg-[#0C3232] border-2 border-[#EE8361]/30 hover:border-[#EE8361] p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(238,131,97,0.2)] group relative overflow-hidden"
                >
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#EE8361]/15 rounded-full blur-2xl group-hover:bg-[#EE8361]/25 transition-all pointer-events-none" />

                  <div>
                    {/* Top row: Icon + Allowance Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#007472] border border-[#EE8361]/50 flex items-center justify-center text-[#EE8361] shadow-inner group-hover:scale-105 transition-transform">
                        <Gift className="w-6 h-6 text-[#FBDFC7]" />
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          allowances.spin_wheel.remainingPlays > 0
                            ? 'bg-[#EE8361]/20 text-[#EE8361] border border-[#EE8361]/40'
                            : 'bg-white/10 text-white/50 border border-white/10'
                        }`}
                      >
                        {allowances.spin_wheel.remainingPlays > 0
                          ? 'متاحة الآن (1)'
                          : 'تم التدوير اليوم'}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-[#FCF6EE] mb-1.5 group-hover:text-[#EE8361] transition-colors">
                      3. عجلة الحظ اليومية
                    </h3>
                    <p className="text-xs text-white/70 line-clamp-3 mb-4 leading-relaxed">
                      دوّر العجلة يومياً للحصول على عملات ونقاط خبرة وتجميد الستريك ومضاعفات النقاط!
                    </p>
                  </div>

                  <div>
                    {/* Reward potential */}
                    <div className="p-2.5 rounded-2xl bg-[#072424]/60 border border-[#EE8361]/30 mb-4 flex items-center justify-between text-xs">
                      <span className="text-white/60">المكافأة:</span>
                      <span className="font-bold text-[#EE8361] font-mono">
                        جوائز حتى +50 عملة
                      </span>
                    </div>

                    <button className="w-full py-2.5 rounded-2xl bg-[#EE8361] text-[#FCF6EE] hover:brightness-110 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md">
                      <span>تدوير العجلة الآن</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
