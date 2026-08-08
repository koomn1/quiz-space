import { useEffect, useRef, useState } from 'react';
import { Sparkles, Clock, Loader2 } from 'lucide-react';
import {
  getUserDailyQuizSlot,
  claimUserDailyQuizRefresh,
  finalizeUserDailyQuizRefresh,
  releaseUserDailyQuizRefresh,
  planNameToDailyQuizTier,
  createQuiz,
  DailyQuizTier,
} from '../lib/db';
import { generateQuizWithFallback } from '../hooks/useQuizzes';

const DAILY_TOPICS = ['ثقافة عامة', 'علوم عامة', 'تاريخ', 'جغرافيا', 'رياضيات أساسية', 'لغة عربية', 'لغة إنجليزية', 'تكنولوجيا وابتكار'];

interface DailyQuizCardProps {
  lang: 'ar' | 'en';
  userId?: string;
  planName?: string;
  isPremium?: boolean;
  onStartQuiz: (quizId: string) => void;
  onLoginClick?: () => void;
}

const TIER_LABEL: Record<DailyQuizTier, { ar: string; en: string }> = {
  free: { ar: 'المجانية', en: 'Free' }, gold: { ar: 'الذهبية', en: 'Gold' }, diamond: { ar: 'الماسية', en: 'Diamond' },
};
const TIER_GRADIENT: Record<DailyQuizTier, string> = {
  free: 'from-slate-500 to-slate-700', gold: 'from-amber-400 to-yellow-600', diamond: 'from-fuchsia-500 to-purple-700',
};

function formatCountdown(totalSeconds: number, isAr: boolean): string {
  const s = Math.max(0, totalSeconds);
  if (s >= 3600) return `${Math.floor(s / 3600)}${isAr ? 'س' : 'h'} ${Math.floor((s % 3600) / 60)}${isAr ? 'د' : 'm'}`;
  if (s >= 60) return `${Math.floor(s / 60)}${isAr ? 'د' : 'm'} ${s % 60}${isAr ? 'ث' : 's'}`;
  return `${s}${isAr ? 'ث' : 's'}`;
}

export default function DailyQuizCard({ lang, userId, planName, isPremium, onStartQuiz, onLoginClick }: DailyQuizCardProps) {
  const isAr = lang === 'ar';
  const isGuest = !userId || userId.startsWith('user-');
  const tier = planNameToDailyQuizTier(planName, isPremium);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(false);
  const generatingRef = useRef(false);

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    let timeoutId: number | undefined;
    const timeout = new Promise<never>((_, reject) => { timeoutId = window.setTimeout(() => reject(new Error('Daily quiz request timed out')), timeoutMs); });
    try { return await Promise.race([promise, timeout]); }
    finally { if (timeoutId !== undefined) window.clearTimeout(timeoutId); }
  };

  const generate = async () => {
    if (!userId || generatingRef.current) return;
    generatingRef.current = true;
    setIsGenerating(true);
    setGenerationError(false);
    try {
      const topic = DAILY_TOPICS[Math.floor(Math.random() * DAILY_TOPICS.length)];
      const generated = await withTimeout(generateQuizWithFallback(`${topic} — اختبار يومي منوّع بمستوى متوسط، 8 أسئلة أصلية`, 8), 45000);
      const quiz = await withTimeout(createQuiz({
        title: `⚡ ${isAr ? 'التحدي اليومي' : 'Daily Challenge'} — ${generated.title}`,
        description: generated.description,
        questions: generated.questions.map((q, i) => ({ ...q, id: `daily-${Date.now()}-${i}` })) as any,
        creatorId: userId,
        creatorName: isAr ? 'QuizSpace ⚡ (يومي)' : 'QuizSpace ⚡ (Daily)',
        category: isAr ? 'يومي' : 'Daily',
      } as any), 12000);
      await finalizeUserDailyQuizRefresh(userId, tier, quiz.id);
      setQuizId(quiz.id);
      setAnswered(false);
      setSecondsLeft(0);
    } catch (error) {
      console.error('Failed to generate per-user daily quiz:', error);
      setGenerationError(true);
      await releaseUserDailyQuizRefresh(userId, tier);
    } finally {
      setIsGenerating(false);
      generatingRef.current = false;
    }
  };

  const sync = async () => {
    if (!userId) return;
    try {
      const slot = await withTimeout(getUserDailyQuizSlot(userId, tier), 12000);
      if (!slot) { setGenerationError(true); return; }
      setQuizId(slot.quizId);
      setAnswered(slot.answered);
      setSecondsLeft(slot.secondsUntilRefresh);
      setGenerationError(false);
      // A quiz without an answer is always pinned, regardless of age.
      if (slot.quizId && !slot.answered) { setIsGenerating(false); return; }
      // After answering, keep showing the cooldown; claim only when it ends.
      if (slot.answered && slot.secondsUntilRefresh > 0) { setIsGenerating(false); return; }
      if (slot.refreshing) { setIsGenerating(!slot.quizId); return; }
      if (!slot.quizId || (slot.answered && slot.secondsUntilRefresh <= 0)) {
        const won = await claimUserDailyQuizRefresh(userId, tier);
        if (won) await generate();
        else setIsGenerating(true);
      }
    } catch (error) {
      console.error('Failed to sync per-user daily quiz:', error);
      setGenerationError(true);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isGuest) { setQuizId(null); setAnswered(false); setIsGenerating(false); return; }
    sync();
    const pollId = window.setInterval(sync, 5000);
    return () => window.clearInterval(pollId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, userId, isGuest]);

  useEffect(() => {
    const id = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const label = isAr ? TIER_LABEL[tier].ar : TIER_LABEL[tier].en;
  const waiting = answered && secondsLeft > 0;
  return (
    <div className={`relative overflow-hidden rounded-3xl p-5 mb-6 bg-gradient-to-l ${TIER_GRADIENT[tier]} text-white shadow-lg shadow-black/10`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/20 flex items-center justify-center"><Sparkles className="w-6 h-6" /></div>
          <div>
            <h3 className="font-display font-black text-lg leading-tight">{isAr ? 'التحدي اليومي' : 'Daily Challenge'}</h3>
            <p className="text-sm text-white/80">{isAr ? `اختبارك الشخصي — باقة ${label}` : `Your personal quiz — ${label} tier`}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(!isGuest && (waiting || isGenerating)) && <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5 text-sm font-mono tabular-nums"><Clock className="w-4 h-4" />{formatCountdown(secondsLeft, isAr)}</div>}
          {isGuest ? <button onClick={onLoginClick} className="bg-white text-slate-900 font-bold rounded-full px-5 py-2 text-sm hover:scale-105 active:scale-95 transition-transform">{isAr ? 'سجّل الدخول للبدء' : 'Sign in to start'}</button>
            : waiting ? <span className="text-sm font-semibold bg-white/15 rounded-full px-4 py-2">{isAr ? 'تم الحل — الاختبار القادم بعد المهلة' : 'Solved — next quiz after cooldown'}</span>
            : !isGenerating && quizId ? <button onClick={() => onStartQuiz(quizId)} className="bg-white text-slate-900 font-bold rounded-full px-5 py-2 text-sm hover:scale-105 active:scale-95 transition-transform">{isAr ? 'ابدأ الآن + XP' : 'Start now + XP'}</button>
            : generationError ? <button onClick={sync} className="bg-white/20 text-white font-bold rounded-full px-5 py-2 text-sm hover:bg-white/30 active:scale-95 transition-transform">{isAr ? 'إعادة المحاولة' : 'Retry'}</button>
            : <div className="flex items-center gap-2 text-sm text-white/80 px-3"><Loader2 className="w-4 h-4 animate-spin" />{isAr ? 'جاري التوليد...' : 'Generating...'}</div>}
        </div>
      </div>
    </div>
  );
}
