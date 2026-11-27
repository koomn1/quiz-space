import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, RotateCw, Sparkles, CheckCircle2, HelpCircle } from 'lucide-react';
import type { Question } from '../types';

export interface FlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  quizTitle?: string;
  lang?: 'ar' | 'en';
}

export const FlashcardsModal: React.FC<FlashcardsModalProps> = ({
  isOpen,
  onClose,
  questions,
  quizTitle = '',
  lang = 'ar',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const isAr = lang === 'ar';

  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        if (isAr) handlePrev();
        else handleNext();
      } else if (e.key === 'ArrowLeft') {
        if (isAr) handleNext();
        else handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAr, currentIndex, questions.length]);

  if (!isOpen || questions.length === 0) return null;

  const currentQ = questions[currentIndex];
  let correctAnswerText = '';
  if (currentQ) {
    if (currentQ.type === 'mcq') {
      const idx = typeof currentQ.correctIndex === 'number' ? currentQ.correctIndex : (Number(currentQ.correctAnswer) || 0);
      correctAnswerText = currentQ.options?.[idx] || String(currentQ.correctAnswer || '');
    } else if (currentQ.type === 'tf') {
      const isTrue = currentQ.correctIndex === 0 || String(currentQ.correctAnswer).toLowerCase() === 'true';
      correctAnswerText = isTrue ? (isAr ? 'صح' : 'True') : (isAr ? 'خطأ' : 'False');
    } else {
      correctAnswerText = String(currentQ.correctAnswer || '');
    }
  }

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev < questions.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : questions.length - 1));
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative my-auto flex flex-col items-center max-w-xl w-full">
        {/* Header Bar */}
        <div className="flex w-full items-center justify-between text-[#FCF6EE] mb-4 px-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#007472]/30 text-[#2AC3BB] border border-[#2AC3BB]/20">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-black line-clamp-1">{quizTitle || (isAr ? 'البطاقات التعليمية' : 'Flashcards')}</h3>
              <p className="text-[11px] text-[#8BAEAD]">
                {currentIndex + 1} / {questions.length}
              </p>
            </div>
          </div>
          <button
            aria-label={isAr ? 'إغلاق' : 'Close'}
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 3D Flip Card */}
        <div
          onClick={() => setIsFlipped((prev) => !prev)}
          className="relative w-full aspect-[4/3] min-h-[300px] cursor-pointer [perspective:1000px] select-none"
        >
          <div
            className={`relative h-full w-full rounded-[28px] border border-[#2AC3BB]/30 transition-transform duration-500 [transform-style:preserve-3d] shadow-2xl ${
              isFlipped ? '[transform:rotateY(180deg)]' : ''
            }`}
          >
            {/* FRONT SIDE (Question) */}
            <div className="absolute inset-0 flex flex-col justify-between rounded-[28px] bg-gradient-to-b from-[#072424] to-[#031717] p-7 text-[#FCF6EE] [backface-visibility:hidden]">
              <div className="flex items-center justify-between text-xs text-[#8BAEAD]">
                <span className="rounded-lg bg-[#007472]/30 px-2.5 py-1 text-[11px] font-black text-[#2AC3BB]">
                  {isAr ? 'السؤال' : 'QUESTION'}
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <RotateCw className="h-3 w-3" />
                  {isAr ? 'اضغط للقلب' : 'Click to flip'}
                </span>
              </div>

              <div className="my-auto text-center py-4">
                <p className="text-lg sm:text-xl font-black leading-relaxed text-[#FCF6EE]">
                  {currentQ?.text}
                </p>
              </div>

              <div className="text-center text-[11px] text-[#8BAEAD]">
                {isAr ? 'مسافة (Space) لقلب البطاقة' : 'Press Space to flip'}
              </div>
            </div>

            {/* BACK SIDE (Answer + Explanation) */}
            <div className="absolute inset-0 flex flex-col justify-between rounded-[28px] bg-gradient-to-b from-[#004847] to-[#031717] p-7 text-[#FCF6EE] [backface-visibility:hidden] [transform:rotateY(180deg)] border border-[#EE8361]/40">
              <div className="flex items-center justify-between text-xs text-[#8BAEAD]">
                <span className="rounded-lg bg-[#EE8361]/25 px-2.5 py-1 text-[11px] font-black text-[#EE8361]">
                  {isAr ? 'الإجابة الصحيحة' : 'CORRECT ANSWER'}
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#2AC3BB]" />
                  {isAr ? 'تم التحقق' : 'Verified'}
                </span>
              </div>

              <div className="my-auto text-center space-y-3 py-2 overflow-y-auto max-h-[180px]">
                <p className="text-xl sm:text-2xl font-black text-[#FCF6EE]">
                  {correctAnswerText}
                </p>
                {currentQ?.explanation && (
                  <p className="text-xs text-[#8BAEAD] leading-relaxed max-w-md mx-auto bg-black/30 p-3 rounded-xl border border-white/5">
                    {currentQ.explanation}
                  </p>
                )}
              </div>

              <div className="text-center text-[11px] text-[#8BAEAD]">
                {isAr ? 'انقر للعودة للسؤال' : 'Click to flip back'}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="mt-5 flex w-full items-center justify-between px-2">
          <button
            type="button"
            onClick={handlePrev}
            className="flex min-h-11 items-center gap-1.5 rounded-2xl bg-white/10 px-4 py-2.5 text-xs font-black text-[#FCF6EE] backdrop-blur-md transition hover:bg-white/20 active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
            <span>{isAr ? 'السابق' : 'Previous'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFlipped((prev) => !prev)}
            className="flex min-h-11 items-center gap-2 rounded-2xl bg-[#007472] px-6 py-2.5 text-xs font-black text-[#FCF6EE] shadow-lg shadow-[#007472]/30 transition hover:bg-[#005e5c] active:scale-95"
          >
            <RotateCw className={`h-4 w-4 ${isFlipped ? 'rotate-180' : ''} transition-transform`} />
            <span>{isFlipped ? (isAr ? 'عرض السؤال' : 'Show Question') : (isAr ? 'قلب الإجابة' : 'Flip Answer')}</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex min-h-11 items-center gap-1.5 rounded-2xl bg-white/10 px-4 py-2.5 text-xs font-black text-[#FCF6EE] backdrop-blur-md transition hover:bg-white/20 active:scale-95"
          >
            <span>{isAr ? 'التالي' : 'Next'}</span>
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardsModal;
