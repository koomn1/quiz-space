import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Clock, Loader2 } from 'lucide-react';
import {
  getDailyQuizSlot,
  claimDailyQuizRefresh,
  finalizeDailyQuizRefresh,
  releaseDailyQuizRefresh,
  planNameToDailyQuizTier,
  createQuiz,
  getCompletionsByQuizId,
  DailyQuizTier,
} from '../lib/db';
import { generateQuizWithFallback } from '../hooks/useQuizzes';

const DAILY_TOPICS = [
  'ثقافة عامة', 'علوم عامة', 'تاريخ', 'جغرافيا',
  'رياضيات أساسية', 'لغة عربية', 'لغة إنجليزية', 'تكنولوجيا وابتكار',
];

interface DailyQuizCardProps {
  lang: 'ar' | 'en';
  userId?: string;
  planName?: string;
  isPremium?: boolean;
  onStartQuiz: (quizId: string) => void;
  onLoginClick?: () => void;
}

const TIER_LABEL: Record<DailyQuizTier, { ar: string; en: string }> = {
  free: { ar: 'المجانية', en: 'Free' },
  gold: { ar: 'الذهبية', en: 'Gold' },
  diamond: { ar: 'الماسية', en: 'Diamond' },
};

const TIER_GRADIENT: Record<DailyQuizTier, string> = {
  free: 'from-slate-500 to-slate-700',
  gold: 'from-amber-400 to-yellow-600',
  diamond: 'from-fuchsia-500 to-purple-700',
};

const TIER_INTERVAL_LABEL: Record<DailyQuizTier, { ar: string; en: string }> = {
  diamond: { ar: 'دقيقة', en: 'minute' },
  gold: { ar: 'ساعة', en: 'hour' },
  free: { ar: '24 ساعة', en: '24 hours' },
};

function formatCountdown(totalSeconds: number, isAr: boolean): string {
  const s = Math.max(0, totalSeconds);
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}${isAr ? 'س' : 'h'} ${m}${isAr ? 'د' : 'm'}`;
  }
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}${isAr ? 'د' : 'm'} ${rem}${isAr ? 'ث' : 's'}`;
  }
  return `${s}${isAr ? 'ث' : 's'}`;
}

export default function DailyQuizCard({ lang, userId, planName, isPremium, onStartQuiz, onLoginClick }: DailyQuizCardProps) {
  const isAr = lang === 'ar';
  const isGuest = !userId || userId.startsWith('user-');
  const tier = planNameToDailyQuizTier(planName, isPremium);

  const [quizId, setQuizId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(true);
  const [generationError, setGenerationError] = useState(false);

  const generatingRef = useRef(false);

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    let timeoutId: number | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error('Daily quiz request timed out')), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    }
  };

  const generateAndFinalize = async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setIsGenerating(true);
    setGenerationError(false);
    try {
      const topic = DAILY_TOPICS[Math.floor(Math.random() * DAILY_TOPICS.length)];
      const generated = await withTimeout(generateQuizWithFallback(
        `${topic} — اختبار يومي منوّع بمستوى صعوبة متوسط، بعيد عن الأسئلة شديدة السهولة أو التخصصية جداً`,
        8,
      ), 45000);
      const quiz = await withTimeout(createQuiz({
        title: `⚡ ${isAr ? 'التحدي اليومي' : 'Daily Challenge'} — ${generated.title}`,
        description: generated.description,
        questions: generated.questions.map((q, i) => ({
          ...q,
          id: `daily-${Date.now()}-${i}`,
        })) as any,
        creatorId: 'daily-quiz-system',
        creatorName: isAr ? 'QuizSpace ⚡ (يومي)' : 'QuizSpace ⚡ (Daily)',
        category: isAr ? 'يومي' : 'Daily',
      } as any), 12000);
      await finalizeDailyQuizRefresh(tier, quiz.id);
      setQuizId(quiz.id);
    } catch (err) {
      console.error('Failed to generate daily quiz:', err);
      setGenerationError(true);
      await releaseDailyQuizRefresh(tier);
    } finally {
      setIsGenerating(false);
      generatingRef.current = false;
    }
  };

  const sync = async () => {
    try {
      const slot = await withTimeout(getDailyQuizSlot(tier), 12000);
      if (!slot) {
        setGenerationError(true);
        setIsGenerating(false);
        return;
      }

    setSecondsLeft(slot.secondsUntilRefresh);

    const isExpired = !slot.quizId || slot.secondsUntilRefresh <= 0;

    // If we're already showing a quiz to this user, don't swap it out just
    // because the shared tier timer expired — only move on once THIS user
    // has actually answered it. Otherwise a diamond-tier user (refreshing
    // every minute) would almost never get to finish a daily quiz before it
    // changes under them.
    if (quizId && quizId !== slot.quizId) {
      // Someone else already generated a newer quiz for this tier in the
      // background. Check whether the user finished the one we're showing.
      try {
        const completions = await getCompletionsByQuizId(quizId);
        const alreadyAnswered = completions.some((c) => c.takerId === userId);
        if (!alreadyAnswered) {
          // Keep showing the pinned quiz, ignore the newer slot for now.
          setIsGenerating(false);
          return;
        }
      } catch (err) {
        console.error('Failed to check daily quiz completion, keeping pinned quiz:', err);
        setIsGenerating(false);
        return;
      }
      // User answered the pinned quiz — fall through and adopt the latest one.
    }

    if (!isExpired && !slot.refreshing) {
      setQuizId(slot.quizId);
      setIsGenerating(false);
      return;
    }

    if (slot.refreshing) {
      // Someone else is already generating this tier's quiz right now —
      // just keep the old quiz visible (if any) and poll again shortly.
      setIsGenerating(!slot.quizId && !quizId);
      return;
    }

    // Nothing pinned yet (first load) and the shared slot is actually
    // expired with nobody generating — try to claim the regeneration.
    if (!quizId) {
      const won = await claimDailyQuizRefresh(tier);
      if (won) {
        await generateAndFinalize();
      } else {
        setIsGenerating(true);
      }
    } else {
      // We have a pinned quiz and the user hasn't finished it yet — just
      // keep showing it, don't join the regeneration race.
      setIsGenerating(false);
    }
    } catch (err) {
      console.error('Failed to sync daily quiz:', err);
      setGenerationError(true);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isGuest) {
      setQuizId(null);
      setIsGenerating(false);
      return;
    }
    setQuizId(null);
    setIsGenerating(true);
    sync();
    const pollId = window.setInterval(sync, 5000);
    return () => window.clearInterval(pollId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, isGuest]);

  useEffect(() => {
    const tickId = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(tickId);
  }, []);

  const tierLabel = isAr ? TIER_LABEL[tier].ar : TIER_LABEL[tier].en;
  const intervalLabel = isAr ? TIER_INTERVAL_LABEL[tier].ar : TIER_INTERVAL_LABEL[tier].en;

  return (
    <div className={`relative overflow-hidden rounded-3xl p-5 mb-6 bg-gradient-to-l ${TIER_GRADIENT[tier]} text-white shadow-lg shadow-black/10`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-black text-lg leading-tight">
              {isAr ? 'التحدي اليومي' : 'Daily Challenge'}
            </h3>
            <p className="text-sm text-white/80">
              {isAr
                ? `باقة ${tierLabel} — يتجدد كل ${intervalLabel}`
                : `${tierLabel} tier — refreshes every ${intervalLabel}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5 text-sm font-mono tabular-nums">
            <Clock className="w-4 h-4" />
            {formatCountdown(secondsLeft, isAr)}
          </div>

          {isGuest ? (
            <button
              onClick={onLoginClick}
              className="bg-white text-slate-900 font-bold rounded-full px-5 py-2 text-sm hover:scale-105 active:scale-95 transition-transform"
            >
              {isAr ? 'سجّل الدخول للبدء' : 'Sign in to start'}
            </button>
          ) : !isGenerating && quizId ? (
            <button
              onClick={() => onStartQuiz(quizId)}
              className="bg-white text-slate-900 font-bold rounded-full px-5 py-2 text-sm hover:scale-105 active:scale-95 transition-transform"
            >
              {isAr ? 'ابدأ الآن +100 XP' : 'Start now +100 XP'}
            </button>
          ) : generationError ? (
            <button
              onClick={sync}
              className="bg-white/20 text-white font-bold rounded-full px-5 py-2 text-sm hover:bg-white/30 active:scale-95 transition-transform"
            >
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-white/80 px-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              {isAr ? 'جاري التوليد...' : 'Generating...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
