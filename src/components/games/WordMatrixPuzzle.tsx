import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Award,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Send,
  Sparkles,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import {
  calculatePuzzleReward,
  getDailyGameAllowance,
  getDailyWordMatrix,
  recordGamePlay,
  verifyWordSolution,
} from '../../lib/miniGamesEngine';
import { playNotificationSound } from '../../lib/sound';
import { WordMatrixPuzzleData } from '../../types';

export interface WordMatrixPuzzleProps {
  onClose?: () => void;
  onComplete?: (rewards: { coins: number; xp: number }) => void;
  userId?: string;
  initialDate?: string;
  className?: string;
}

export const WordMatrixPuzzle: React.FC<WordMatrixPuzzleProps> = ({
  onClose,
  onComplete,
  userId = 'guest-player',
  initialDate,
  className = '',
}) => {
  // Puzzle data loaded deterministically
  const puzzle: WordMatrixPuzzleData = useMemo(() => {
    return getDailyWordMatrix(initialDate);
  }, [initialDate]);

  // Game state
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selectedNodeIndices, setSelectedNodeIndices] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [rewards, setRewards] = useState<{ coins: number; xp: number } | null>(null);
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [shakeError, setShakeError] = useState(false);

  // Allowance state
  const [allowance, setAllowance] = useState(() => getDailyGameAllowance(userId, 'word_matrix'));

  const wheelRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);

  // Timer stopwatch
  useEffect(() => {
    if (isGameComplete) return;

    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameComplete]);

  // Format seconds as MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Node positions in circular layout
  const wheelDimensions = 280;
  const centerCoord = wheelDimensions / 2;
  const wheelRadius = 96;

  const nodePositions = useMemo(() => {
    const total = puzzle.letters.length;
    return puzzle.letters.map((char, index) => {
      const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
      const x = centerCoord + wheelRadius * Math.cos(angle);
      const y = centerCoord + wheelRadius * Math.sin(angle);
      return { index, char, x, y };
    });
  }, [puzzle.letters]);

  // Selected string
  const currentSelectedWord = useMemo(() => {
    return selectedNodeIndices.map((i) => puzzle.letters[i]).join('');
  }, [selectedNodeIndices, puzzle.letters]);

  // Trigger feedback banner
  const showFeedback = useCallback(
    (text: string, type: 'success' | 'error' | 'info', durationMs = 1500) => {
      setFeedback({ text, type });
      setTimeout(() => {
        setFeedback((prev) => (prev?.text === text ? null : prev));
      }, durationMs);
    },
    [],
  );

  // Check victory condition
  const handleVictory = useCallback(
    (completedWords: string[], elapsedSeconds: number) => {
      setIsGameComplete(true);
      if (timerRef.current) clearInterval(timerRef.current);

      const calculated = calculatePuzzleReward(elapsedSeconds, completedWords.length);
      setRewards(calculated);

      // Record play & deduct allowance
      recordGamePlay(userId, 'word_matrix', 100);
      setAllowance(getDailyGameAllowance(userId, 'word_matrix'));

      // Audio & Visual celebratory bursts
      playNotificationSound('success');
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#007472', '#2AC3BB', '#EE8361', '#FCF6EE', '#FBDFC7'],
        });
      } catch {}
    },
    [userId],
  );

  // Submit current selected word
  const submitWord = useCallback(() => {
    if (!currentSelectedWord) return;

    // Check if word is already found
    if (foundWords.includes(currentSelectedWord)) {
      showFeedback('تم العثور على هذه الكلمة مسبقاً!', 'info');
      setSelectedNodeIndices([]);
      return;
    }

    // Check if it matches an unfound target word
    const matchedTarget = puzzle.targetWords.find(
      (w) => !foundWords.includes(w) && verifyWordSolution(currentSelectedWord.split(''), w),
    );

    if (matchedTarget) {
      const nextFound = [...foundWords, matchedTarget];
      setFoundWords(nextFound);
      setSelectedNodeIndices([]);
      playNotificationSound('chime');
      showFeedback(`أحسنت! كلمة "${matchedTarget}" صحيحة!`, 'success');

      // Check if all target words are found
      if (nextFound.length === puzzle.targetWords.length) {
        handleVictory(nextFound, timerSeconds);
      }
    } else {
      // Wrong word
      setShakeError(true);
      playNotificationSound('delete');
      showFeedback('الكلمة غير موجودة في اللغز!', 'error');
      setTimeout(() => setShakeError(false), 500);
      setSelectedNodeIndices([]);
    }
  }, [
    currentSelectedWord,
    foundWords,
    puzzle.targetWords,
    timerSeconds,
    handleVictory,
    showFeedback,
  ]);

  // Auto-submit if current selection exactly equals an unfound target word
  useEffect(() => {
    if (currentSelectedWord.length >= 2) {
      const match = puzzle.targetWords.find(
        (w) => !foundWords.includes(w) && verifyWordSolution(currentSelectedWord.split(''), w),
      );
      if (match && !isDragging) {
        submitWord();
      }
    }
  }, [currentSelectedWord, foundWords, puzzle.targetWords, isDragging, submitWord]);

  // Pointer interactions
  const handleNodePointerDown = (index: number) => {
    if (isGameComplete) return;
    setIsDragging(true);
    if (!selectedNodeIndices.includes(index)) {
      setSelectedNodeIndices([index]);
      playNotificationSound('tap');
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isGameComplete) return;

    // Find element under pointer
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    const nodeElem = elem?.closest('[data-letter-index]');
    if (!nodeElem) return;

    const indexAttr = nodeElem.getAttribute('data-letter-index');
    if (indexAttr === null) return;

    const nodeIndex = parseInt(indexAttr, 10);
    if (isNaN(nodeIndex)) return;

    // Add node if not already selected
    if (!selectedNodeIndices.includes(nodeIndex)) {
      setSelectedNodeIndices((prev) => [...prev, nodeIndex]);
      playNotificationSound('tap');
    }
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      if (currentSelectedWord.length >= 2) {
        submitWord();
      }
    }
  };

  // Click on a node in click-mode
  const handleNodeClick = (index: number) => {
    if (isGameComplete || isDragging) return;

    if (selectedNodeIndices.includes(index)) {
      // Deselect if already selected as last item
      if (selectedNodeIndices[selectedNodeIndices.length - 1] === index) {
        setSelectedNodeIndices((prev) => prev.slice(0, -1));
        playNotificationSound('tap');
      }
    } else {
      setSelectedNodeIndices((prev) => [...prev, index]);
      playNotificationSound('tap');
    }
  };

  // Clear selection
  const handleClear = () => {
    setSelectedNodeIndices([]);
    playNotificationSound('tap');
  };

  // Reveal a hint
  const handleHint = () => {
    if (isGameComplete) return;

    // Find first unfound target word
    const unfound = puzzle.targetWords.filter((w) => !foundWords.includes(w));
    if (unfound.length === 0) return;

    const targetWord = unfound[0];
    const currentHints = revealedHints[targetWord] || 0;
    if (currentHints < targetWord.length) {
      setRevealedHints((prev) => ({
        ...prev,
        [targetWord]: currentHints + 1,
      }));
      playNotificationSound('tap');
      showFeedback('تم كشف حرف للمساعدة!', 'info');
    }
  };

  return (
    <div
      dir="rtl"
      className={`relative w-full max-w-xl mx-auto rounded-3xl bg-[#072424]/95 border border-[#2AC3BB]/30 shadow-[0_20px_60px_rgba(0,116,114,0.35)] p-5 sm:p-7 text-[#FCF6EE] font-['Cairo',sans-serif] backdrop-blur-xl ${className}`}
      data-testid="word-matrix-puzzle"
      onPointerUp={handlePointerUp}
    >
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#007472]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-44 h-44 bg-[#EE8361]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[#2AC3BB]/20 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#007472]/40 border border-[#2AC3BB]/40 flex items-center justify-center text-[#2AC3BB] shadow-[0_0_12px_rgba(42,195,187,0.25)]">
            <Sparkles className="w-5 h-5 text-[#2AC3BB]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#FCF6EE] tracking-tight">
                مصفوفة الكلمات اليومية
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#007472]/50 text-[#2AC3BB] border border-[#2AC3BB]/40 font-semibold">
                {puzzle.topicAr}
              </span>
            </div>
            <p className="text-xs text-[#FCF6EE]/70 mt-0.5">
              صل الحروف لتكوين الكلمات العلمية والثقافية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0C3232] border border-[#2AC3BB]/25 text-[#FCF6EE] font-mono text-sm shadow-inner">
            <Clock className="w-4 h-4 text-[#EE8361]" />
            <span>{formatTime(timerSeconds)}</span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-[#FCF6EE]/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="إغلاق اللغز"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Progress Rail */}
      <div className="flex items-center justify-between py-3 px-3.5 mt-3 rounded-2xl bg-[#0C3232]/80 border border-[#2AC3BB]/20 text-xs text-[#FCF6EE]/80">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-[#2AC3BB]" />
          <span>
            الكلمات المكتشفة:{' '}
            <strong className="text-[#2AC3BB] font-mono text-sm">
              {foundWords.length} / {puzzle.targetWords.length}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span>المحاولات المتبقية اليوم:</span>
          <span className="px-2 py-0.5 rounded-md bg-[#007472]/60 text-[#FBDFC7] font-bold">
            {allowance.remainingPlays} / {allowance.maxDailyPlays}
          </span>
        </div>
      </div>

      {/* Target Words Display Slots */}
      <div className="my-5">
        <div className="text-xs text-[#FCF6EE]/60 mb-2 font-medium">الكلمات المطلوبة:</div>
        <div className="flex flex-wrap gap-2.5 justify-center">
          {puzzle.targetWords.map((word) => {
            const isFound = foundWords.includes(word);
            const revealedCount = revealedHints[word] || 0;

            return (
              <div
                key={word}
                className={`relative px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 ${
                  isFound
                    ? 'bg-[#007472]/50 border-2 border-[#2AC3BB] text-[#2AC3BB] shadow-[0_0_16px_rgba(42,195,187,0.3)] scale-102'
                    : 'bg-[#072424]/90 border border-dashed border-[#2AC3BB]/35 text-[#FCF6EE]/90 shadow-inner'
                }`}
              >
                {isFound ? (
                  <>
                    <Check className="w-4 h-4 text-[#2AC3BB] stroke-[3]" />
                    <span className="font-bold text-base tracking-wider">{word}</span>
                  </>
                ) : (
                  <div className="flex items-center gap-1 font-mono text-sm tracking-widest" dir="rtl">
                    {word.split('').map((char, charIdx) => {
                      const isHinted = charIdx < revealedCount;
                      return (
                        <span
                          key={charIdx}
                          className={`inline-block w-6 h-7 text-center rounded border-b-2 leading-7 ${
                            isHinted
                              ? 'border-[#EE8361] text-[#EE8361] font-bold bg-[#EE8361]/10'
                              : 'border-[#2AC3BB]/40 text-transparent bg-white/5'
                          }`}
                        >
                          {isHinted ? char : '•'}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Word Preview Pill */}
      <div className="flex justify-center my-3 min-h-[44px]">
        <div
          className={`flex items-center justify-center px-6 py-2 rounded-full border transition-all duration-200 ${
            shakeError ? 'animate-bounce border-[#EE8361] bg-[#EE8361]/20' : ''
          } ${
            currentSelectedWord
              ? 'bg-[#007472]/60 border-[#2AC3BB] shadow-[0_0_18px_rgba(42,195,187,0.4)] text-[#FCF6EE]'
              : 'bg-[#0C3232]/50 border-[#2AC3BB]/20 text-[#FCF6EE]/40'
          }`}
        >
          {currentSelectedWord ? (
            <span className="text-xl sm:text-2xl font-bold tracking-widest font-['Cairo',sans-serif]">
              {selectedNodeIndices.map((i) => puzzle.letters[i]).join(' ')}
            </span>
          ) : (
            <span className="text-xs text-[#FCF6EE]/50 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2AC3BB]" />
              اسحب أو اضغط الحروف لتكوين كلمة
            </span>
          )}
        </div>
      </div>

      {/* Feedback Notification Toast */}
      {feedback && (
        <div
          className={`text-center py-1.5 px-4 rounded-xl text-xs font-semibold mb-2 transition-all duration-200 ${
            feedback.type === 'success'
              ? 'bg-[#007472] text-[#2AC3BB] border border-[#2AC3BB]/60'
              : feedback.type === 'error'
              ? 'bg-[#EE8361]/30 text-[#EE8361] border border-[#EE8361]/60'
              : 'bg-[#0C3232] text-[#FBDFC7] border border-[#2AC3BB]/30'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Letter Matrix Interactive Wheel Area */}
      <div className="relative flex items-center justify-center my-4 select-none touch-none">
        <div
          ref={wheelRef}
          className="relative w-[280px] h-[280px] rounded-full bg-[#031717]/60 border border-[#2AC3BB]/25 shadow-[inset_0_0_30px_rgba(0,116,114,0.3)] flex items-center justify-center"
          onPointerMove={handlePointerMove}
        >
          {/* SVG Connection Lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox={`0 0 ${wheelDimensions} ${wheelDimensions}`}
          >
            {selectedNodeIndices.length > 1 &&
              selectedNodeIndices.slice(0, -1).map((nodeIdx, stepIdx) => {
                const nextNodeIdx = selectedNodeIndices[stepIdx + 1];
                const from = nodePositions[nodeIdx];
                const to = nodePositions[nextNodeIdx];
                if (!from || !to) return null;

                return (
                  <line
                    key={`line-${stepIdx}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#EE8361"
                    strokeWidth="5"
                    strokeLinecap="round"
                    className="animate-in fade-in duration-150"
                    style={{
                      filter: 'drop-shadow(0 0 6px rgba(238, 131, 97, 0.8))',
                    }}
                  />
                );
              })}
          </svg>

          {/* Center Cosmo Hub Ornament */}
          <div className="w-14 h-14 rounded-full bg-[#072424] border border-[#2AC3BB]/40 flex items-center justify-center shadow-[0_0_16px_rgba(42,195,187,0.3)] z-0">
            <Zap className="w-6 h-6 text-[#2AC3BB]/70" />
          </div>

          {/* Letter Nodes */}
          {nodePositions.map(({ index, char, x, y }) => {
            const isSelected = selectedNodeIndices.includes(index);
            const selectionOrder = selectedNodeIndices.indexOf(index);

            return (
              <button
                key={index}
                data-letter-index={index}
                onPointerDown={() => handleNodePointerDown(index)}
                onClick={() => handleNodeClick(index)}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold transition-transform duration-150 z-20 cursor-pointer ${
                  isSelected
                    ? 'bg-[#EE8361] border-2 border-[#FCF6EE] text-[#FCF6EE] scale-110 shadow-[0_0_18px_#EE8361]'
                    : 'bg-[#007472] border-2 border-[#2AC3BB] text-[#FCF6EE] hover:scale-105 hover:border-[#EE8361] shadow-[0_4px_12px_rgba(0,116,114,0.4)]'
                }`}
                aria-label={`حرف ${char}`}
              >
                <span>{char}</span>
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#072424] text-xs text-[#2AC3BB] border border-[#2AC3BB] flex items-center justify-center font-mono">
                    {selectionOrder + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Controls Bar */}
      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-[#2AC3BB]/20">
        <button
          onClick={handleClear}
          disabled={selectedNodeIndices.length === 0 || isGameComplete}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-[#FCF6EE]/80 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>مسح</span>
        </button>

        <button
          onClick={submitWord}
          disabled={selectedNodeIndices.length < 2 || isGameComplete}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#007472] border border-[#2AC3BB] text-sm font-bold text-white hover:bg-[#007472]/80 hover:shadow-[0_0_15px_rgba(42,195,187,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Send className="w-4 h-4 rotate-180" />
          <span>تأكيد الكلمة</span>
        </button>

        <button
          onClick={handleHint}
          disabled={isGameComplete}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#EE8361]/20 border border-[#EE8361]/50 text-sm font-bold text-[#EE8361] hover:bg-[#EE8361]/30 transition-colors"
        >
          <Lightbulb className="w-4 h-4 text-[#EE8361]" />
          <span>تلميح</span>
        </button>
      </div>

      {/* Victory Dialog Overlay */}
      {isGameComplete && (
        <div
          className="absolute inset-0 bg-[#072424]/95 backdrop-blur-md rounded-3xl p-6 flex flex-col items-center justify-center text-center z-50 animate-in fade-in zoom-in-95 duration-200"
          data-testid="word-matrix-victory-dialog"
        >
          <div className="w-20 h-20 rounded-3xl bg-[#007472]/40 border-2 border-[#2AC3BB] flex items-center justify-center text-[#2AC3BB] mb-4 shadow-[0_0_30px_rgba(42,195,187,0.5)]">
            <Trophy className="w-10 h-10 text-[#EE8361] animate-pulse" />
          </div>

          <h3 className="text-2xl font-bold text-[#FCF6EE] mb-1">
            أحسنت! أكملت لغز مصفوفة الكلمات!
          </h3>
          <p className="text-sm text-[#FCF6EE]/80 mb-5">
            لقد اكتشفت جميع الكلمات العلمية والثقافية بنجاح في {formatTime(timerSeconds)}
          </p>

          {/* Rewards Breakdown Cards */}
          <div className="grid grid-cols-2 gap-3.5 w-full max-w-xs mb-6">
            <div className="p-3 rounded-2xl bg-[#0C3232] border border-[#2AC3BB]/35 flex flex-col items-center shadow-md">
              <Award className="w-5 h-5 text-[#EE8361] mb-1" />
              <div className="text-xs text-[#FCF6EE]/70">العملات الذهبية</div>
              <div className="text-lg font-bold text-[#EE8361] font-mono mt-0.5">
                +{rewards?.coins ?? 25} عملة
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#0C3232] border border-[#2AC3BB]/35 flex flex-col items-center shadow-md">
              <Sparkles className="w-5 h-5 text-[#2AC3BB] mb-1" />
              <div className="text-xs text-[#FCF6EE]/70">نقاط الخبرة</div>
              <div className="text-lg font-bold text-[#2AC3BB] font-mono mt-0.5">
                +{rewards?.xp ?? 40} XP
              </div>
            </div>
          </div>

          {/* Done Button */}
          <button
            onClick={() => {
              if (rewards) onComplete?.(rewards);
              onClose?.();
            }}
            className="w-full max-w-xs py-3 px-6 rounded-2xl bg-[#EE8361] hover:bg-[#EE8361]/90 text-white font-bold text-base shadow-[0_8px_25px_rgba(238,131,97,0.4)] transition-transform active:scale-95 cursor-pointer"
            data-testid="word-matrix-done-btn"
          >
            تم
          </button>
        </div>
      )}
    </div>
  );
};
