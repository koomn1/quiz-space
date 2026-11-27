import React, { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import {
  generateMemoryCards,
  getDailyGameAllowance,
  MemoryCard,
  recordGamePlay,
} from '../../lib/miniGamesEngine';
import { playNotificationSound } from '../../lib/sound';

export interface CosmicMatchGameProps {
  onClose?: () => void;
  onComplete?: (rewards: { coins: number; xp: number }) => void;
  userId?: string;
  initialSeed?: number;
  className?: string;
}

export const CosmicMatchGame: React.FC<CosmicMatchGameProps> = ({
  onClose,
  onComplete,
  userId = 'guest-player',
  initialSeed,
  className = '',
}) => {
  // Game session cards
  const [cards, setCards] = useState<MemoryCard[]>(() => generateMemoryCards(initialSeed));
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(new Set());
  const [isLocked, setIsLocked] = useState(false);

  // Score & Performance
  const [movesCount, setMovesCount] = useState(0);
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [score, setScore] = useState(0);

  // 45-second Timer countdown
  const [timeLeft, setTimeLeft] = useState(45);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const timerRef = useRef<any>(null);

  // Allowance check
  const [allowance, setAllowance] = useState(() => getDailyGameAllowance(userId, 'cosmic_match'));

  // Rewards state
  const [earnedRewards, setEarnedRewards] = useState<{ coins: number; xp: number } | null>(null);

  // Sound effect helper
  const playSound = useCallback((type: 'success' | 'chime' | 'tap') => {
    try {
      playNotificationSound(type);
    } catch {}
  }, []);

  // Timer countdown hook
  useEffect(() => {
    if (isVictory || isGameOver) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isVictory, isGameOver]);

  // Restart game
  const handleRestart = useCallback(() => {
    setCards(generateMemoryCards());
    setFlippedIndices([]);
    setMatchedPairIds(new Set());
    setIsLocked(false);
    setMovesCount(0);
    setCombo(1);
    setMaxCombo(1);
    setScore(0);
    setTimeLeft(45);
    setIsGameOver(false);
    setIsVictory(false);
    setEarnedRewards(null);
    setAllowance(getDailyGameAllowance(userId, 'cosmic_match'));
  }, [userId]);

  // Handle card click
  const handleCardClick = (index: number) => {
    if (isLocked || isGameOver || isVictory) return;
    if (flippedIndices.includes(index)) return;
    if (matchedPairIds.has(cards[index].pairId)) return;

    playSound('tap');

    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);

    // If 2 cards are flipped, evaluate match
    if (nextFlipped.length === 2) {
      setIsLocked(true);
      setMovesCount((prev) => prev + 1);

      const [firstIdx, secondIdx] = nextFlipped;
      const firstCard = cards[firstIdx];
      const secondCard = cards[secondIdx];

      if (firstCard.pairId === secondCard.pairId) {
        // MATCH!
        playSound('chime');
        const nextMatched = new Set(matchedPairIds);
        nextMatched.add(firstCard.pairId);
        setMatchedPairIds(nextMatched);

        const currentCombo = combo;
        const newScore = score + 100 * currentCombo + timeLeft * 5;
        setScore(newScore);

        const nextCombo = combo + 1;
        setCombo(nextCombo);
        if (nextCombo > maxCombo) {
          setMaxCombo(nextCombo);
        }

        setFlippedIndices([]);
        setIsLocked(false);

        // Check Victory (All 6 pairs matched)
        if (nextMatched.size === 6) {
          handleVictory(newScore);
        }
      } else {
        // NO MATCH -> reset combo & flip back after delay
        setCombo(1);
        setTimeout(() => {
          setFlippedIndices([]);
          setIsLocked(false);
        }, 800);
      }
    }
  };

  // Handle Victory Celebration
  const handleVictory = (finalScore: number) => {
    setIsVictory(true);
    playSound('success');

    // Confetti burst
    try {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#007472', '#2AC3BB', '#EE8361', '#FBDFC7', '#FCF6EE'],
      });
    } catch {}

    // Rewards: +20 Quiz Coins, +30 XP
    const rewards = { coins: 20, xp: 30 };
    setEarnedRewards(rewards);

    // Record session & decrement daily allowance
    try {
      recordGamePlay(userId, 'cosmic_match', finalScore);
      setAllowance(getDailyGameAllowance(userId, 'cosmic_match'));
    } catch {}

    if (onComplete) {
      onComplete(rewards);
    }
  };

  // Render card educational icon
  const renderCardIcon = (iconName: string) => {
    switch (iconName) {
      case 'Star':
        return <Star className="w-9 h-9 text-amber-500 fill-amber-400 drop-shadow" />;
      case 'Trophy':
        return <Trophy className="w-9 h-9 text-amber-500 fill-amber-400 drop-shadow" />;
      case 'Sparkles':
        return <Sparkles className="w-9 h-9 text-[#2AC3BB] fill-[#2AC3BB]/40 drop-shadow" />;
      case 'BookOpen':
        return <BookOpen className="w-9 h-9 text-[#007472] fill-[#2AC3BB]/20 drop-shadow" />;
      case 'Crown':
        return <Crown className="w-9 h-9 text-amber-500 fill-amber-400 drop-shadow" />;
      case 'Flame':
        return <Flame className="w-9 h-9 text-[#EE8361] fill-[#EE8361]/80 drop-shadow" />;
      default:
        return <Sparkles className="w-9 h-9 text-[#2AC3BB]" />;
    }
  };

  return (
    <div
      dir="rtl"
      className={`w-full max-w-2xl mx-auto rounded-3xl bg-[#072424] text-[#FCF6EE] border border-[#2AC3BB]/30 shadow-2xl p-5 md:p-7 relative overflow-hidden select-none ${className}`}
    >
      {/* Background ambient luxury glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#007472]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#2AC3BB]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative flex items-center justify-between mb-5 pb-4 border-b border-[#2AC3BB]/20">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#007472] border border-[#2AC3BB]/40 flex items-center justify-center text-[#2AC3BB] shadow-inner">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#FCF6EE]">
              تطابق الذاكرة الكونية
            </h2>
            <p className="text-xs text-[#2AC3BB]">
              طابق أزواج الرموز التعليمية الستة قبل نفاد الـ 45 ثانية!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Stats and status bar */}
      <div className="grid grid-cols-4 gap-2 md:gap-3 mb-5">
        {/* Timer */}
        <div
          className={`flex items-center gap-2 p-2.5 rounded-2xl border transition-all ${
            timeLeft <= 10
              ? 'bg-[#EE8361]/20 border-[#EE8361] text-[#EE8361] animate-pulse'
              : 'bg-[#007472]/40 border-[#2AC3BB]/30 text-[#FCF6EE]'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0 text-[#2AC3BB]" />
          <div>
            <div className="text-xs text-white/60">الوقت المتبقي</div>
            <div className="text-sm md:text-base font-bold font-mono">{timeLeft} ثانية</div>
          </div>
        </div>

        {/* Matches */}
        <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#007472]/40 border border-[#2AC3BB]/30">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2AC3BB]" />
          <div>
            <div className="text-xs text-white/60">الأزواج المكتملة</div>
            <div className="text-sm md:text-base font-bold font-mono">
              {matchedPairIds.size} / 6
            </div>
          </div>
        </div>

        {/* Combo */}
        <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#007472]/40 border border-[#2AC3BB]/30">
          <Zap className="w-4 h-4 shrink-0 text-[#EE8361]" />
          <div>
            <div className="text-xs text-white/60">مضاعف الكومبو</div>
            <div className="text-sm md:text-base font-bold font-mono text-[#EE8361]">
              x{combo} {combo > 1 ? '🔥' : ''}
            </div>
          </div>
        </div>

        {/* Daily Allowance */}
        <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#007472]/40 border border-[#2AC3BB]/30">
          <Award className="w-4 h-4 shrink-0 text-[#FBDFC7]" />
          <div>
            <div className="text-xs text-white/60">المحاولات اليومية</div>
            <div className="text-sm md:text-base font-bold font-mono text-[#FBDFC7]">
              {allowance.remainingPlays} / {allowance.maxDailyPlays}
            </div>
          </div>
        </div>
      </div>

      {/* 4x3 Card Flip Grid */}
      <div
        className="grid grid-cols-4 gap-2.5 md:gap-3.5 mb-5"
        style={{ perspective: '1200px' }}
      >
        {cards.map((card, index) => {
          const isFlipped = flippedIndices.includes(index) || matchedPairIds.has(card.pairId);
          const isMatched = matchedPairIds.has(card.pairId);

          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(index)}
              className="h-24 sm:h-28 md:h-32 relative cursor-pointer select-none transition-transform duration-200 active:scale-95"
            >
              <div
                className="w-full h-full relative transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Card Back (Petrol #007472 background) */}
                <div
                  className="absolute inset-0 w-full h-full rounded-2xl bg-[#007472] border-2 border-[#2AC3BB]/40 flex flex-col items-center justify-center p-2 shadow-md hover:border-[#2AC3BB] hover:shadow-[0_0_15px_rgba(42,195,187,0.3)] transition-all"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#072424]/40 border border-[#2AC3BB]/30 flex items-center justify-center text-[#2AC3BB]">
                    <Sparkles className="w-5 h-5 text-[#2AC3BB]/80" />
                  </div>
                  <span className="text-xs text-[#FBDFC7] font-medium mt-1">كويز سبيس</span>
                </div>

                {/* Card Front (Ivory #FCF6EE front with Bright Teal #2AC3BB border) */}
                <div
                  className={`absolute inset-0 w-full h-full rounded-2xl bg-[#FCF6EE] text-[#072424] flex flex-col items-center justify-center p-2 shadow-lg transition-all ${
                    isMatched
                      ? 'border-3 border-[#2AC3BB] shadow-[0_0_20px_rgba(42,195,187,0.6)] ring-2 ring-[#2AC3BB]/40 bg-gradient-to-b from-[#FCF6EE] to-[#FBDFC7]/40'
                      : 'border-2 border-[#2AC3BB]'
                  }`}
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="transform transition-transform group-hover:scale-110">
                    {renderCardIcon(card.icon)}
                  </div>
                  <span className="text-xs font-bold text-[#007472] mt-1.5 text-center leading-tight">
                    {card.label}
                  </span>
                  {isMatched && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#2AC3BB] flex items-center justify-center text-white">
                      <CheckCircle2 className="w-3 h-3 text-[#072424]" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer controls */}
      <div className="flex items-center justify-between text-xs text-white/60 pt-2 border-t border-[#2AC3BB]/15">
        <span>عدد الحركات: <strong className="text-white font-mono">{movesCount}</strong></span>
        <span>أعلى كومبو: <strong className="text-[#EE8361] font-mono">x{maxCombo}</strong></span>
        <button
          onClick={handleRestart}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>إعادة تشغيل</span>
        </button>
      </div>

      {/* Victory Dialog */}
      {isVictory && (
        <div className="absolute inset-0 z-20 bg-[#072424]/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm rounded-3xl bg-[#007472] border-2 border-[#2AC3BB] p-6 text-center text-[#FCF6EE] shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-[#2AC3BB]/20 border border-[#2AC3BB] flex items-center justify-center text-amber-400 shadow-inner">
              <Trophy className="w-9 h-9 fill-amber-400" />
            </div>

            <h3 className="text-2xl font-black mb-1">نصر باهر! 🎉</h3>
            <p className="text-xs text-[#FBDFC7] mb-4">
              أتممت مطابقة جميع البطاقات في {45 - timeLeft} ثانية فقط!
            </p>

            {/* Reward badges */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-[#072424]/60 border border-[#2AC3BB]/40">
                <div className="text-xs text-[#2AC3BB]">العملات المكتسبة</div>
                <div className="text-xl font-bold text-amber-300 font-mono">+20 عملة</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#072424]/60 border border-[#2AC3BB]/40">
                <div className="text-xs text-[#2AC3BB]">نقاط الخبرة</div>
                <div className="text-xl font-bold text-[#2AC3BB] font-mono">+30 XP</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRestart}
                className="flex-1 py-3 rounded-2xl bg-[#2AC3BB] text-[#072424] font-bold text-sm hover:brightness-110 active:scale-95 transition shadow-lg"
              >
                العب مرة أخرى
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-3 rounded-2xl bg-white/10 text-white font-medium text-sm hover:bg-white/20 transition"
                >
                  إنهاء
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Game Over Dialog */}
      {isGameOver && !isVictory && (
        <div className="absolute inset-0 z-20 bg-[#072424]/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm rounded-3xl bg-[#072424] border-2 border-[#EE8361] p-6 text-center text-[#FCF6EE] shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-[#EE8361]/20 border border-[#EE8361] flex items-center justify-center text-[#EE8361]">
              <Clock className="w-9 h-9" />
            </div>

            <h3 className="text-2xl font-black mb-1 text-[#EE8361]">انتهى الوقت! ⏳</h3>
            <p className="text-xs text-white/70 mb-5">
              لم تتمكن من مطابقة جميع البطاقات في 45 ثانية. حاول مجدداً بسرعة أكبر!
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleRestart}
                className="flex-1 py-3 rounded-2xl bg-[#EE8361] text-white font-bold text-sm hover:brightness-110 active:scale-95 transition shadow-lg"
              >
                إعادة المحاولة
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-3 rounded-2xl bg-white/10 text-white font-medium text-sm hover:bg-white/20 transition"
                >
                  إغلاق
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
