import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Clock, Loader2, Sparkles, RefreshCw, Crown } from 'lucide-react';
import {
  getUserDailyQuizSlot,
  claimUserDailyQuizRefresh,
  finalizeUserDailyQuizRefresh,
  releaseUserDailyQuizRefresh,
  resetLegacyDailyQuizSlot,
  planNameToDailyQuizTier,
  DailyQuizTier,
} from '../lib/db';
import { shouldRecoverStalledDailyQuizRefresh } from '../lib/dailyQuizRecovery';
import { MainLogo } from './MainLogo';

gsap.registerPlugin(useGSAP);

// In-memory cache of the latest private daily payload so the start click can
// guarantee the sessionStorage snapshot exists before navigation.
let latestDailyPayload: Record<string, any> | null = null;

// The daily bank and answer keys are stored server-side; only this public count is used for deterministic rotation.
const DAILY_BANK_SIZE = 10;

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
const TIER_REFRESH_SECONDS: Record<DailyQuizTier, number> = { free: 86400, gold: 21600, diamond: 3600 };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error('Daily quiz request timed out')), ms);
    promise.then(
      (value) => { window.clearTimeout(timeoutId); resolve(value); },
      (error) => { window.clearTimeout(timeoutId); reject(error); },
    );
  });
}

function formatCountdown(totalSeconds: number, isAr: boolean): string {
  const s = Math.max(0, totalSeconds);
  if (s >= 3600) return `${Math.floor(s / 3600)}${isAr ? 'س' : 'h'} ${Math.floor((s % 3600) / 60)}${isAr ? 'د' : 'm'}`;
  if (s >= 60) return `${Math.floor(s / 60)}${isAr ? 'د' : 'm'} ${s % 60}${isAr ? 'ث' : 's'}`;
  return `${s}${isAr ? 'ث' : 's'}`;
}

export default function DailyQuizCard({ lang, userId, planName, isPremium, onStartQuiz, onLoginClick }: DailyQuizCardProps) {
  const isAr = lang === 'ar';
  const isGuest = !userId || userId.startsWith('user-');
  const clientTier = planNameToDailyQuizTier(planName, isPremium);
  const [serverTier, setServerTier] = useState<DailyQuizTier | null>(null);
  const tier = serverTier ?? clientTier;
  const [quizId, setQuizId] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(false);
  const generatingRef = useRef(false);
  const stalledRecoveryRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current, { opacity: 0, y: 18, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.65, ease: 'power3.out' });
    if (glowRef.current) gsap.to(glowRef.current, { rotation: 360, duration: 18, repeat: -1, ease: 'none' });
  }, { scope: cardRef, dependencies: [tier] });

  const generate = async (resolvedTier: DailyQuizTier = tier) => {
    if (!userId || generatingRef.current) return;
    generatingRef.current = true;
    setIsGenerating(true);
    setGenerationError(false);
    try {
      // Pick deterministically from the bank for this user/tier/time window.
      // The tier is part of the seed, so every plan gets its own rotation.
      const intervalSeconds = TIER_REFRESH_SECONDS[resolvedTier];
      const intervalMs = intervalSeconds * 1000;
      const windowNumber = Math.floor(Date.now() / intervalMs);
      const seedText = `${userId}:${resolvedTier}:${windowNumber}`;
      let hash = 0;
      for (let i = 0; i < seedText.length; i++) hash = (hash * 31 + seedText.charCodeAt(i)) >>> 0;
      const quizId = `daily-${userId}-${windowNumber}-${String(hash % DAILY_BANK_SIZE + 1).padStart(2, '0')}`;
      // Only the quiz id and language leave the browser. The server chooses the
      // bank record and returns questions without the correct-answer key.
      const quiz = await finalizeUserDailyQuizRefresh(userId, resolvedTier, { id: quizId, lang });
      window.sessionStorage.setItem(`quizspace-daily-${quiz.id}`, JSON.stringify(quiz));
      latestDailyPayload = quiz;
      setQuizId(quiz.id);
      setAnswered(false);
      setSecondsLeft(0);
    } catch (error) {
      console.error('Failed to prepare fixed daily quiz:', error);
      setGenerationError(true);
      await releaseUserDailyQuizRefresh(userId, resolvedTier);
    } finally {
      setIsGenerating(false);
      generatingRef.current = false;
    }
  };

  const sync = async () => {
    if (!userId) return;
    try {
      const slot = await withTimeout(getUserDailyQuizSlot(userId, tier), 12000);
      if (!slot) {
        // A missing per-user RPC/table must never leave the card spinning forever.
        setGenerationError(true);
        setIsGenerating(false);
        return;
      }
      const resolvedTier = (Object.entries(TIER_REFRESH_SECONDS).find(([, seconds]) => seconds === slot.refreshIntervalSeconds)?.[0] as DailyQuizTier | undefined) ?? 'free';
      if (serverTier !== resolvedTier) setServerTier(resolvedTier);
      const hasPrivatePayload = !!slot.quizPayload?.id;
      // Older deployments generated daily IDs with Date.now(), leaving an
      // unanswered payload pinned forever. Current IDs use the tier window
      // number, so clear legacy timestamp-based payloads before reusing them.
      const payloadId = String(slot.quizPayload?.id || '');
      const legacyPayloadMatch = userId
        ? payloadId.match(new RegExp(`^daily-${userId}-(\\d+)-\\d+$`))
        : null;
      const isLegacyPayload = !!legacyPayloadMatch && Number(legacyPayloadMatch[1]) > 1_000_000_000;
      if (hasPrivatePayload && isLegacyPayload && !slot.answered) {
        await resetLegacyDailyQuizSlot(userId, resolvedTier);
        latestDailyPayload = null;
        setQuizId(null);
        setAnswered(false);
        setSecondsLeft(0);
        setIsGenerating(false);
        return sync();
      }
      // A daily quiz can only be attempted once. When the slot is already
      // answered, the old quiz must never be exposed again: purge its
      // sessionStorage snapshot and any lingering payload so the user moves
      // straight to the cooldown (or a brand-new challenge when it ends).
      if (slot.answered) {
        setQuizId(null);
        setAnswered(true);
        setSecondsLeft(slot.secondsUntilRefresh);
        setGenerationError(false);
        // Purge stale sessionStorage snapshots of answered daily quizzes.
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key && key.startsWith('quizspace-daily-')) window.sessionStorage.removeItem(key);
        }
        setGenerationError(false);
        // Already answered and cooldown active -> keep waiting.
        if (slot.secondsUntilRefresh > 0) { setIsGenerating(false); return; }
        // Cooldown elapsed (or never started): release and claim a fresh one.
        if (slot.refreshing) { setIsGenerating(true); return; }
        const won = await claimUserDailyQuizRefresh(userId, resolvedTier);
        if (won) await generate(resolvedTier);
        else setIsGenerating(true);
        return;
      }
      if (hasPrivatePayload) {
        window.sessionStorage.setItem(`quizspace-daily-${slot.quizPayload.id}`, JSON.stringify(slot.quizPayload));
        latestDailyPayload = slot.quizPayload;
      }
      // A legacy slot can contain only quiz_id from the old public-quiz flow.
      // It is not a valid private daily challenge and must be cleared before
      // claiming a fresh payload; never send the user back to that old quiz.
      if (slot.quizId && !hasPrivatePayload && !slot.answered) {
        await resetLegacyDailyQuizSlot(userId, tier);
        setQuizId(null);
        setAnswered(false);
        setSecondsLeft(0);
        setIsGenerating(false);
        return sync();
      }
      const activeQuizId = slot.quizPayload?.id || null;
      setQuizId(activeQuizId);
      setSecondsLeft(slot.secondsUntilRefresh);
      setGenerationError(false);
      // A private quiz without an answer is always pinned, regardless of age.
      if (hasPrivatePayload) { setIsGenerating(false); return; }
      if (slot.refreshing) {
        if (shouldRecoverStalledDailyQuizRefresh(slot) && !stalledRecoveryRef.current) {
          stalledRecoveryRef.current = true;
          try {
            const won = await claimUserDailyQuizRefresh(userId, tier);
            if (won) await generate();
          } finally {
            stalledRecoveryRef.current = false;
          }
          return;
        }
        setIsGenerating(!activeQuizId);
        return;
      }
      if (!activeQuizId) {
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
    setServerTier(null);
  }, [userId]);

  useEffect(() => {
    if (isGuest) { setQuizId(null); setAnswered(false); setSecondsLeft(0); setIsGenerating(false); return; }
    sync();
    const pollId = window.setInterval(sync, 5000);
    const onDailyCompleted = (event: Event) => {
      const completedQuizId = (event as CustomEvent<{ quizId?: string }>).detail?.quizId;
      if (completedQuizId) {
        try { window.sessionStorage.removeItem(`quizspace-daily-${completedQuizId}`); } catch (_) {}
      }
      latestDailyPayload = null;
      setQuizId(null);
      setAnswered(true);
      setSecondsLeft(0);
      void sync();
    };
    window.addEventListener('quizspace:daily-completed', onDailyCompleted);
    return () => {
      window.clearInterval(pollId);
      window.removeEventListener('quizspace:daily-completed', onDailyCompleted);
    };
  }, [tier, userId, isGuest]);

  useEffect(() => {
    const id = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const label = isAr ? TIER_LABEL[tier].ar : TIER_LABEL[tier].en;
  const waiting = secondsLeft > 0;
  const nextQuizLabel = isAr ? `يتجدد التحدي بعد ${formatCountdown(secondsLeft, true)}` : `Challenge renews in ${formatCountdown(secondsLeft, false)}`;
  const refreshPolicy = isAr
    ? tier === 'diamond' ? 'تحدٍ جديد كل ساعة' : tier === 'gold' ? 'تحدٍ جديد كل 6 ساعات' : 'تحدٍ جديد كل 24 ساعة'
    : tier === 'diamond' ? 'A new challenge every hour' : tier === 'gold' ? 'A new challenge every 6 hours' : 'A new challenge every 24 hours';
  // A quiz can only be rated once. If the slot is already answered, never
  // expose a start button for the old daily quiz id, even if sessionStorage
  // still holds it.
  const startableQuizId = answered ? null : quizId;
  return (
    <div ref={cardRef} className={`light-dark-card group relative overflow-hidden rounded-[2rem] p-5 mb-6 bg-gradient-to-l ${TIER_GRADIENT[tier]} text-white shadow-xl shadow-black/15`}>
      <div ref={glowRef} className="pointer-events-none absolute -top-20 -end-14 h-48 w-48 rounded-full border border-white/20 bg-white/10 blur-[1px]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,.2),transparent_35%)] opacity-80" aria-hidden="true" />
      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/20 ring-1 ring-white/25"><MainLogo size="sm" showText={false} className="!h-10 !w-10" /><Sparkles className="absolute -end-1 -top-1 h-4 w-4 animate-pulse text-amber-200" /></div>
          <div>
            <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white/85"><Crown className="h-3 w-3 text-amber-200" />{label}</div>
            <h3 className="font-display font-black text-lg leading-tight">{isAr ? 'التحدي الحصري المتجدد' : 'Exclusive rotating challenge'}</h3>
            <p className="text-sm text-white/80">{isAr ? `يتغير تلقائياً حسب باقة ${label}` : `Rotates automatically for the ${label} tier`}</p>
            <p className="mt-1 text-[11px] font-bold text-white/70">{refreshPolicy}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(!isGuest && (waiting || isGenerating)) && <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5 text-sm font-mono tabular-nums"><Clock className="w-4 h-4" />{formatCountdown(secondsLeft, isAr)}</div>}
          {isGuest ? <button onClick={onLoginClick} className="bg-white text-slate-900 font-bold rounded-full px-5 py-2 text-sm hover:scale-105 active:scale-95 transition-transform">{isAr ? 'سجّل الدخول للبدء' : 'Sign in to start'}</button>
            : waiting ? <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4" />{nextQuizLabel}</span>
            : !isGenerating && startableQuizId ? <button onClick={() => {
              // Guard the start navigation: the quiz must be snapshot-able from
              // sessionStorage before the route changes, otherwise the resolver
              // would show "رابط غير متوفر". Fall back to the in-memory cache.
              const key = `quizspace-daily-${startableQuizId}`;
              try {
                const existing = window.sessionStorage.getItem(key);
                if (!existing && latestDailyPayload) {
                  window.sessionStorage.setItem(key, JSON.stringify(latestDailyPayload));
                }
              } catch (e) { console.warn('Could not persist daily quiz snapshot before start:', e); }
              onStartQuiz(startableQuizId);
            }} className="bg-white text-slate-900 font-bold rounded-full px-5 py-2 text-sm hover:scale-105 active:scale-95 transition-transform">{isAr ? 'ابدأ الآن + XP' : 'Start now + XP'}</button>
            : generationError ? <div className="flex items-center gap-2"><span className="text-xs text-white/80">{isAr ? 'تعذر الاتصال بنظام الاختبار اليومي' : 'Daily quiz service unavailable'}</span><button onClick={sync} className="bg-white/20 text-white font-bold rounded-full px-5 py-2 text-sm hover:bg-white/30 active:scale-95 transition-transform">{isAr ? 'إعادة المحاولة' : 'Retry'}</button></div>
            : <div className="flex items-center gap-2 text-sm text-white/80 px-3"><Loader2 className="w-4 h-4 animate-spin" />{isAr ? 'جاري تجهيز الكويز...' : 'Preparing quiz...'}</div>}
        </div>
      </div>
    </div>
  );
}
