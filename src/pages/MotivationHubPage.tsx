import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crown,
  Gift,
  Loader2,
  Lock,
  PackageOpen,
  RefreshCw,
  Sparkles,
  Store,
  Swords,
  Target,
  Trophy,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import { showToast } from '../components/Toast';
import OverlayPortal from '../components/OverlayPortal';
import { profileAssetUrl, resolveFrameAsset, uniqueProfileFrames } from '../constants/profileAssets';
import RewardsSection from '../components/RewardsSection';
import SmartReviewPanel from '../components/SmartReviewPanel';
import StreakMomentumCard from '../components/StreakMomentumCard';
import LearningSeasonPanel from '../components/LearningSeasonPanel';
import KnowledgeDuelPanel from '../components/KnowledgeDuelPanel';
import { askAI } from '../services/aiWorkerClient';
import {
  activateRewardFrame,
  claimLuckySpin,
  createRewardPointsOrder,
  getDailyBrainChallenge,
  getLearningStreakStatus,
  getMotivationStatus,
  getRewardInventory,
  getRewardPaymentSettings,
  getRewardStoreItems,
  getRewardsSummary,
  purchaseRewardItem,
  recordMotivationUsageEvent,
  submitBrainChallenge,
  updateDailyStreak,
} from '../lib/db';
import { getStoreBundleBenefitLabel, getStorePaymentMode, isStoreItemActionAvailable } from '../lib/storePricing';
import { hasUsedLuckySpinToday } from '../lib/motivationData';
import { IndependentStore } from '../components/IndependentStore';

export type MotivationSection = 'motivation' | 'motivation-lucky' | 'motivation-brain' | 'motivation-review' | 'motivation-season' | 'motivation-duel' | 'motivation-store';

type MotivationHubPageProps = {
  userId: string;
  userName?: string;
  isPremium?: boolean;
  planName?: string;
  lang: 'ar' | 'en';
  section: MotivationSection;
  onNavigate: (section: MotivationSection) => void;
};

type StoreItem = {
  id: string;
  item_type: 'frame' | 'points_bundle' | 'cosmetic';
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price_points: number;
  price_coins?: number;
  price_egp: number;
  reward_points: number;
  reward_coins?: number;
  css_class?: string | null;
  min_plan: string;
  sort_order: number;
  image_url?: string | null;
  is_featured?: boolean;
  discount_percent?: number;
  badge_text?: string | null;
  subscriber_free?: boolean;
};

export type Rewards = { points: number; coins: number; dailyStreak: number };

const imageUrl = (name: string) => `${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/images/${name}.webp`;
const storeImageUrl = (name: string) => `${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/images/${name}`;
const fallbackStoreImage = (item: Pick<StoreItem, 'item_type'>) => item.item_type === 'points_bundle'
  ? storeImageUrl('mystery_box.webp')
  : item.item_type === 'cosmetic'
    ? storeImageUrl('weekly_achievement.webp')
    : storeImageUrl('animated-frames/frame-aurora.gif');

function getStoreItemImage(item: Pick<StoreItem, 'id' | 'item_type' | 'image_url'>): string {
  const id = item.id.toLowerCase();
  if (item.item_type === 'frame') {
    if (id.includes('fire') || id.includes('dragon')) return storeImageUrl('animated-frames/frame-fire.gif');
    if (id.includes('diamond') || id.includes('galaxy') || id.includes('halo')) return storeImageUrl('animated-frames/frame-galaxy.gif');
    if (id.includes('royal') || id.includes('gold')) return storeImageUrl('animated-frames/frame-royal-gold.gif');
    if (id.includes('school') || id.includes('bus')) return storeImageUrl('animated-frames/frame-school-bus.gif');
    if (id.includes('neon') || id.includes('cyber') || id.includes('matrix')) return storeImageUrl('animated-frames/frame-neon-orbit.gif');
    if (id.includes('crystal')) return storeImageUrl('animated-frames/frame-crystal-luxe.gif');
    if (id.includes('star') || id.includes('crown')) return storeImageUrl('animated-frames/frame-star-crown.gif');
    if (id.includes('waves')) return profileAssetUrl('clean-assets-replacement/frame-waves-quizspace-transparent.svg');
    if (id.includes('sun')) return profileAssetUrl('clean-assets-replacement/frame-sun-quizspace-transparent.svg');
    return storeImageUrl('animated-frames/frame-aurora.gif');
  }
  if (item.image_url) return profileAssetUrl(item.image_url);
  if (item.item_type === 'points_bundle') {
    return storeImageUrl(id.includes('diamond') ? 'pass-diamond.webp' : id.includes('gold') ? 'pass-gold.webp' : 'mystery_box.webp');
  }
  return storeImageUrl(id.includes('brain') ? 'brain_challenge.webp' : 'weekly_achievement.webp');
}

const labels = {
  ar: {
    hub: 'مركز التحفيز', subtitle: 'حوّل كل جلسة مذاكرة إلى تقدّم واضح ومكافآت حقيقية.', overview: 'نظرة عامة',
    lucky: 'عجلة الحظ', brain: 'تحدي العقل', review: 'مراجعة ذكية', season: 'موسم التعلّم', duel: 'مبارزة خاصة', store: 'متجر النقاط', points: 'نقطة', coins: 'عملة',
    streak: 'سلسلة الأيام', checkIn: 'سجّل حضور اليوم', checked: 'تم تسجيل اليوم',
    spinHint: 'أدر العجلة مرة واحدة يومياً واربح من 1 إلى 50 نقطة.', spin: 'أدر العجلة', spinning: 'العجلة تدور...', done: 'تم اللعب اليوم',
    todayQuestion: 'سؤال اليوم', attempts: 'محاولة اليوم', answer: 'اكتب إجابتك هنا', submit: 'تحليل الإجابة', analyzing: 'جاري التحليل...', correct: 'إجابة صحيحة', wrong: 'ليست الإجابة الصحيحة', tryAgain: 'اكتمل تحدي اليوم. يعود سؤال جديد غداً.',
    frames: 'إطارات الصورة', bundles: 'باقات النقاط', owned: 'مملوك', buy: 'شراء بالنقاط', diamond: 'متاح للماسي فقط', price: 'السعر',
    paymentTitle: 'إتمام شراء النقاط', paymentHint: 'حوّل المبلغ ثم أرسل رقم العملية أو صورة الإيصال للمراجعة.', vodafone: 'Vodafone Cash', instapay: 'InstaPay', reference: 'رقم العملية', receipt: 'صورة الإيصال', sendOrder: 'إرسال الطلب', sending: 'جاري الإرسال...', cancel: 'إلغاء',
    orderSent: 'تم إرسال طلبك للمراجعة. ستضاف النقاط بعد التأكيد.', purchased: 'تمت الإضافة إلى مخزونك.', notEnough: 'رصيد النقاط غير كافٍ.', login: 'سجّل الدخول لاستخدام المكافآت',
  },
  en: {
    hub: 'Motivation Hub', subtitle: 'Turn every study session into visible progress and meaningful rewards.', overview: 'Overview',
    lucky: 'Lucky Wheel', brain: 'Brain Challenge', review: 'Smart review', season: 'Learning season', duel: 'Private duel', store: 'Points Store', points: 'points', coins: 'coins',
    streak: 'Daily Streak', checkIn: 'Check in today', checked: 'Checked in today',
    spinHint: 'Spin once a day and win between 1 and 50 points.', spin: 'Spin the wheel', spinning: 'Spinning...', done: 'Played today',
    todayQuestion: "Today's question", attempts: "Today's attempt", answer: 'Type your answer here', submit: 'Analyze answer', analyzing: 'Analyzing...', correct: 'Correct answer', wrong: 'Not quite right', tryAgain: 'Today’s challenge is complete. A new question arrives tomorrow.',
    frames: 'Profile frames', bundles: 'Points bundles', owned: 'Owned', buy: 'Buy with points', diamond: 'Diamond members only', price: 'Price',
    paymentTitle: 'Buy points', paymentHint: 'Transfer the amount, then send the transaction reference or receipt for review.', vodafone: 'Vodafone Cash', instapay: 'InstaPay', reference: 'Transaction reference', receipt: 'Receipt image', sendOrder: 'Send order', sending: 'Sending...', cancel: 'Cancel',
    orderSent: 'Your order was sent for review. Points will be added after confirmation.', purchased: 'Added to your inventory.', notEnough: 'Not enough points.', login: 'Sign in to use rewards',
  },
} as const;

function RewardPill({ rewards, lang }: { rewards: Rewards; lang: 'ar' | 'en' }) {
  const t = labels[lang];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex min-h-10 items-center gap-1.5 rounded-2xl border border-amber-200/80 bg-white/90 px-3 py-2 text-xs font-black text-amber-800 shadow-sm backdrop-blur-sm dark:border-amber-900/60 dark:bg-slate-950/45 dark:text-amber-200">
        <Sparkles className="h-4 w-4" /> {rewards.points.toLocaleString()} {t.points}
      </div>
      {rewards.coins > 0 && (
        <div className="flex min-h-10 items-center gap-1.5 rounded-2xl border border-sky-200/80 bg-white/90 px-3 py-2 text-xs font-black text-sky-800 shadow-sm backdrop-blur-sm dark:border-sky-900/60 dark:bg-slate-950/45 dark:text-sky-200">
          <Coins className="h-4 w-4" /> {rewards.coins.toLocaleString()} {t.coins}
        </div>
      )}
    </div>
  );
}

function SectionNav({ section, onNavigate, lang }: Pick<MotivationHubPageProps, 'section' | 'onNavigate' | 'lang'>) {
  const t = labels[lang];
  const items: { id: MotivationSection; label: string; icon: React.ReactNode }[] = [
    { id: 'motivation', label: t.overview, icon: <Sparkles className="h-4 w-4" /> },
    { id: 'motivation-lucky', label: t.lucky, icon: <Gift className="h-4 w-4" /> },
    { id: 'motivation-brain', label: t.brain, icon: <Brain className="h-4 w-4" /> },
    { id: 'motivation-review', label: t.review, icon: <Target className="h-4 w-4" /> },
    { id: 'motivation-season', label: t.season, icon: <Trophy className="h-4 w-4" /> },
    { id: 'motivation-duel', label: t.duel, icon: <Swords className="h-4 w-4" /> },
    { id: 'motivation-store', label: t.store, icon: <Store className="h-4 w-4" /> },
  ];
  return (
    <div className="flex flex-wrap gap-2 rounded-3xl border border-slate-200/90 bg-white/90 p-2 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onNavigate(item.id)}
          className={`flex min-h-11 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black transition duration-200 motion-reduce:transform-none ${section === item.id ? 'bg-violet-700 text-white shadow-md shadow-violet-700/20 hover:bg-violet-800 dark:bg-violet-500 dark:hover:bg-violet-400' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`}
        >
          {item.icon}{item.label}
        </button>
      ))}
    </div>
  );
}

function Overview({ userId, rewards, status, onNavigate, onCheckIn, isCheckingIn, lang }: { userId: string; rewards: Rewards; status: any; onNavigate: (section: MotivationSection) => void; onCheckIn: () => void; isCheckingIn: boolean; lang: 'ar' | 'en' }) {
  const t = labels[lang];
  const cards = [
    { id: 'motivation-lucky' as const, title: t.lucky, text: t.spinHint, eyebrow: lang === 'ar' ? 'فرصة اليوم' : 'Today’s chance', image: imageUrl('lucky_wheel'), gradient: 'from-fuchsia-700/90 via-violet-600/75 to-indigo-700/75', icon: <Gift className="h-5 w-5" /> },
    { id: 'motivation-brain' as const, title: t.brain, text: lang === 'ar' ? 'سؤال يتغير يومياً وتحليل آمن للإجابة.' : 'A daily question with secure answer analysis.', eyebrow: lang === 'ar' ? 'تدريب قصير' : 'Short practice', image: imageUrl('brain_challenge'), gradient: 'from-cyan-700/90 via-blue-600/75 to-indigo-700/75', icon: <Brain className="h-5 w-5" /> },
    { id: 'motivation-store' as const, title: t.store, text: lang === 'ar' ? 'اشترِ إطارات مميزة وباقات نقاط.' : 'Buy premium frames and points bundles.', eyebrow: lang === 'ar' ? 'تخصيص الملف' : 'Profile customisation', image: imageUrl('mystery_box'), gradient: 'from-amber-700/90 via-orange-600/75 to-rose-700/75', icon: <Store className="h-5 w-5" /> },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StreakMomentumCard key={userId} lang={lang} onCheckIn={onCheckIn} isCheckingIn={isCheckingIn} />
        <div className="relative overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-100 p-5 shadow-sm dark:border-violet-900/50 dark:from-violet-950/30 dark:via-slate-900 dark:to-indigo-950/20">
          <div aria-hidden="true" className="absolute -top-9 -end-6 h-28 w-28 rounded-full bg-violet-400/15 blur-2xl" />
          <div className="relative"><div className="mb-4 flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/80 bg-white/85 shadow-sm dark:border-white/10 dark:bg-slate-900/50"><img src={imageUrl('mystery_box-tiny')} alt="" width="48" height="48" loading="lazy" className="h-full w-full object-cover" /></span><span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">{lang === 'ar' ? 'اليوم' : 'Today'}</span></div>
          <p className="text-xs font-black text-violet-700 dark:text-violet-300">{lang === 'ar' ? 'مكافآت اليوم' : "Today's rewards"}</p>
          <div className="mt-1 text-4xl font-black tracking-tight text-violet-700 dark:text-violet-300">+{status?.brain_challenge?.correct || 0}</div>
          <p className="mt-1 text-xs font-bold leading-5 text-violet-700/70 dark:text-violet-300/70">{lang === 'ar' ? 'إجابات صحيحة في تحدي العقل' : 'correct Brain Challenge answers'}</p>
          <button type="button" onClick={() => onNavigate('motivation-brain')} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-3 py-2.5 text-xs font-black text-white transition duration-200 hover:bg-violet-700 active:scale-[0.98] motion-reduce:transform-none"><Brain className="h-4 w-4" />{t.brain}</button></div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-100 p-5 shadow-sm dark:border-sky-900/50 dark:from-sky-950/30 dark:via-slate-900 dark:to-cyan-950/20">
          <div aria-hidden="true" className="absolute -bottom-10 -start-6 h-28 w-28 rounded-full bg-cyan-400/15 blur-2xl" />
          <div className="relative"><div className="mb-4 flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/80 bg-white/85 shadow-sm dark:border-white/10 dark:bg-slate-900/50"><img src={imageUrl('weekly_achievement-tiny')} alt="" width="48" height="48" loading="lazy" className="h-full w-full object-cover" /></span><span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">{lang === 'ar' ? 'متاح الآن' : 'Available now'}</span></div>
          <p className="text-xs font-black text-sky-700 dark:text-sky-300">{lang === 'ar' ? 'رصيدك الحالي' : 'Your balance'}</p>
          <div className="mt-1 truncate text-4xl font-black tracking-tight text-sky-700 dark:text-sky-300">{rewards.points.toLocaleString()}</div>
          <p className="mt-1 text-xs font-bold leading-5 text-sky-700/70 dark:text-sky-300/70">{t.points}</p>
          <button type="button" onClick={() => onNavigate('motivation-store')} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-3 py-2.5 text-xs font-black text-white transition duration-200 hover:bg-sky-700 active:scale-[0.98] motion-reduce:transform-none"><Store className="h-4 w-4" />{t.store}</button></div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <button key={card.id} type="button" onClick={() => onNavigate(card.id)} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white text-start shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/25 active:scale-[0.99] motion-reduce:transform-none dark:border-slate-800 dark:bg-slate-900">
            <div className="relative h-36 overflow-hidden"><img src={card.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105 motion-reduce:transform-none" /><div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} /><div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/45 to-transparent" /><span className="absolute top-3 end-3 rounded-full border border-white/20 bg-slate-950/20 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur-sm">{card.eyebrow}</span><div className="absolute bottom-3 start-3 rounded-xl bg-white/92 p-2 text-slate-800 shadow-sm dark:bg-slate-950/80 dark:text-white">{card.icon}</div></div>
            <div className="p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black text-slate-900 dark:text-white">{card.title}</h3><ChevronRight className="h-4 w-4 shrink-0 text-violet-600 transition-transform duration-200 group-hover:-translate-x-0.5 rtl:rotate-180 rtl:group-hover:translate-x-0.5 dark:text-violet-300 motion-reduce:transform-none" /></div><p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{card.text}</p><div className="mt-4 flex items-center gap-1.5 text-[11px] font-black text-violet-700 dark:text-violet-300"><Sparkles className="h-3.5 w-3.5" />{lang === 'ar' ? 'استكشف المسار' : 'Explore this path'}</div></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LuckyWheelPanel({ onRewardsChanged, lang }: { onRewardsChanged: () => void; lang: 'ar' | 'en' }) {
  const t = labels[lang];
  const [angle, setAngle] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [alreadyPlayed, setAlreadyPlayed] = React.useState(false);
  const [checkingAvailability, setCheckingAvailability] = React.useState(true);
  const pendingResultRef = React.useRef<any>(null);
  const finishSpinTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const segments = [
    { label: 1, color: '#06b6d4' },
    { label: 2, color: '#6366f1' },
    { label: 3, color: '#8b5cf6' },
    { label: 5, color: '#d946ef' },
    { label: 10, color: '#f43f5e' },
    { label: 15, color: '#f97316' },
    { label: 20, color: '#eab308' },
    { label: 25, color: '#22c55e' },
    { label: 30, color: '#14b8a6' },
    { label: 50, color: '#0ea5e9' },
  ];
  const segmentAngle = 360 / segments.length;
  const wheelBackground = `conic-gradient(${segments.map((segment, index) => `${segment.color} ${index * segmentAngle}deg ${(index + 1) * segmentAngle}deg`).join(', ')})`;

  React.useEffect(() => {
    let active = true;
    getMotivationStatus()
      .then((status) => {
        if (active) setAlreadyPlayed(hasUsedLuckySpinToday(status));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setCheckingAvailability(false);
      });
    return () => { active = false; };
  }, []);

  const finishSpin = React.useCallback(() => {
    const pending = pendingResultRef.current;
    if (!pending) return;
    pendingResultRef.current = null;
    if (finishSpinTimerRef.current) clearTimeout(finishSpinTimerRef.current);
    setSpinning(false);
    setAlreadyPlayed(true);
    onRewardsChanged();
    setResult(pending);
  }, [onRewardsChanged]);

  React.useEffect(() => () => {
    if (finishSpinTimerRef.current) clearTimeout(finishSpinTimerRef.current);
  }, []);

  const spin = async () => {
    if (spinning || alreadyPlayed || checkingAvailability) return;
    setCheckingAvailability(true);
    setResult(null);
    try {
      const response = await claimLuckySpin();
      if (!response?.success) {
        if (/already\s+spun/i.test(String(response?.message || ''))) {
          setAlreadyPlayed(true);
          setResult({ ...response, message: lang === 'ar' ? 'لقد أدرت العجلة اليوم. عد غداً.' : 'Already spun today. Come back tomorrow.' });
        } else {
          setResult(response);
        }
        return;
      }

      const points = Number(response.points) || 1;
      const targetIndex = Math.max(0, segments.findIndex((segment) => segment.label === points));
      const targetCenter = targetIndex * segmentAngle + segmentAngle / 2;
      const extraSpins = 6 + Math.floor(Math.random() * 3);
      const targetAngle = (360 - targetCenter + 360) % 360;
      pendingResultRef.current = { ...response, wheelLabel: segments[targetIndex].label };
      // Keep only whole laps from the previous spin so the final angle always
      // lands mod-360 on the server-secured segment, even after back-to-back days.
      setAngle((current) => {
        const wholeLaps = current - (current % 360);
        return wholeLaps + extraSpins * 360 + targetAngle;
      });
      setSpinning(true);
      setCheckingAvailability(false);
      // transitionend is the primary completion signal; the timer protects
      // reduced-motion/browser edge cases without revealing the result early.
      finishSpinTimerRef.current = setTimeout(finishSpin, 4_450);
    } catch (error: any) {
      setSpinning(false);
      setResult({ success: false, message: error?.message || (lang === 'ar' ? 'تعذر تشغيل العجلة الآن.' : 'The wheel could not be started right now.') });
    } finally {
      setCheckingAvailability(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl rounded-[2.5rem] border border-slate-200 bg-white/60 p-6 text-center shadow-2xl backdrop-blur-sm dark:border-white/10 dark:bg-[#0c071e]/60 sm:p-10">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500/15 to-cyan-500/20 text-primary shadow-inner"><Gift className="h-10 w-10 animate-pulse" /></div>
      <h2 className="text-3xl font-black tracking-tight text-violet-800 dark:text-violet-200">{t.lucky}</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm font-bold leading-7 text-slate-500 dark:text-slate-400">{t.spinHint}</p>

      <div className="mx-auto my-10 grid max-w-3xl items-center gap-8 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative mx-auto aspect-square w-full max-w-[21rem]">
          <div className="absolute -top-5 left-1/2 z-30 -translate-x-1/2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]" aria-hidden="true">
            <div className="h-0 w-0 border-x-[17px] border-t-[32px] border-x-transparent border-t-rose-600" />
            <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-white/60" />
          </div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/30 via-transparent to-cyan-400/25 blur-xl" aria-hidden="true" />
          <div onTransitionEnd={(event) => { if (event.target === event.currentTarget && event.propertyName === 'transform' && spinning) finishSpin(); }} className="relative h-full w-full rounded-full border-[10px] border-slate-950/95 p-1 shadow-[0_0_0_4px_rgba(255,255,255,.18),0_0_55px_-8px_rgba(139,92,246,0.95)] will-change-transform" style={{ transform: `rotate(${angle}deg)`, background: wheelBackground, transition: spinning ? 'transform 4.3s cubic-bezier(0.12, 0.8, 0.15, 1)' : 'none' }} role="img" aria-label={lang === 'ar' ? 'عجلة جوائز من 1 إلى 50 نقطة' : 'Prize wheel from 1 to 50 points'}>
            <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/40" aria-hidden="true" />
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,.38),transparent_25%),linear-gradient(135deg,rgba(255,255,255,.14),transparent_45%,rgba(0,0,0,.16))]" />
            {segments.map((segment, index) => {
              const center = index * segmentAngle + segmentAngle / 2;
              return <div key={segment.label} className="absolute inset-0" style={{ transform: `rotate(${center}deg)` }}><span className="absolute left-1/2 top-5 -translate-x-1/2 text-lg font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,.55)]" style={{ transform: `rotate(-${center}deg)` }}>{segment.label}</span></div>;
            })}
            <div className="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full border-8 border-slate-950 bg-gradient-to-br from-white to-slate-200 shadow-[0_6px_18px_rgba(0,0,0,.35)]"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 shadow-[0_0_0_5px_rgba(255,255,255,.55),0_0_22px_rgba(139,92,246,.75)]"><Trophy className="h-5 w-5 text-white" /></div></div>
          </div>
        </div>

        <div className="rounded-3xl border border-violet-200 bg-white/80 p-4 text-start shadow-sm dark:border-violet-900/50 dark:bg-slate-950/45">
          <div className="flex items-center gap-2 text-xs font-black text-violet-700 dark:text-violet-300"><Sparkles className="h-4 w-4" />{lang === 'ar' ? 'جوائز اليوم' : "Today's prizes"}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">{segments.map((segment) => <div key={segment.label} className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-2 text-center text-xs font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: segment.color }} />{segment.label} {t.points}</div>)}</div>
          <p className="mt-3 text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'العجلة تتوقف عند نفس الجائزة التي يثبتها النظام، وليس عند نتيجة عشوائية مختلفة.' : 'The wheel stops on the same prize secured by the server, not on a disconnected visual result.'}</p>
        </div>
      </div>

      <button type="button" onClick={spin} disabled={spinning || alreadyPlayed || checkingAvailability} aria-label={t.spin} className="group relative mx-auto flex min-h-14 items-center justify-center gap-3 overflow-hidden rounded-2xl bg-primary px-10 py-4 text-sm font-black text-white shadow-xl shadow-primary/30 transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 motion-reduce:transform-none"><div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />{spinning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-current" />}{checkingAvailability ? (lang === 'ar' ? 'جاري التحقق...' : 'Checking...') : spinning ? t.spinning : alreadyPlayed ? t.done : t.spin}</button>

      {result && <div className={`mx-auto mt-8 max-w-xl rounded-3xl border p-5 text-sm font-black shadow-sm ${result.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-400'}`}><div className="flex items-center justify-center gap-2 text-base">{result.success ? <Sparkles className="h-5 w-5" /> : <Loader2 className="h-5 w-5" />}{result.success ? (lang === 'ar' ? `مبروك! ربحت ${result.points} ${t.points}` : `Congratulations! You won ${result.points} ${t.points}`) : result.message}</div>{result.success && <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-2xl bg-white/70 px-3 py-3 dark:bg-slate-950/30">{lang === 'ar' ? 'الجائزة التي توقفت عندها العجلة' : 'Wheel landed on'}<strong className="mt-1 block text-lg">{result.wheelLabel} {t.points}</strong></div><div className="rounded-2xl bg-white/70 px-3 py-3 dark:bg-slate-950/30">{lang === 'ar' ? 'تمت إضافة المكافأة إلى رصيدك' : 'Reward added to your balance'}<strong className="mt-1 block text-lg">{Number(result.total_points || 0).toLocaleString()} {t.points}</strong></div></div>}</div>}
    </div>
  );
}

function BrainChallengePanel({ onRewardsChanged, lang }: { onRewardsChanged: () => void; lang: 'ar' | 'en' }) {
  const t = labels[lang];
  const [challenge, setChallenge] = React.useState<any>(null);
  const [answer, setAnswer] = React.useState('');
  const [result, setResult] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [aiFeedback, setAiFeedback] = React.useState('');
  const load = React.useCallback(async () => { setLoading(true); const data = await getDailyBrainChallenge(); setChallenge(data); setLoading(false); }, []);
  React.useEffect(() => { load(); }, [load]);
  const submit = async () => {
    const submittedAnswer = answer.trim();
    if (!submittedAnswer || submitting || Number(challenge?.attempts_remaining || 0) <= 0) return;
    setSubmitting(true); setResult(null); setAiFeedback('');
    let analysis: { isCorrect?: boolean; feedback?: string } = {};
    try {
      const aiResponse = await askAI(
        `Evaluate this educational answer. Question: ${challenge?.question}\nStudent answer: ${submittedAnswer}\nReturn only compact JSON with keys isCorrect (boolean) and feedback (short sentence in ${lang === 'ar' ? 'Arabic' : 'English'}). Do not reveal a different answer.`,
        { systemInstruction: 'You are a careful answer evaluator. Judge meaning and reasonable synonyms, but never invent facts. This is feedback only; the server decides whether points are awarded.' }
      );
      const cleaned = aiResponse.text.replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(cleaned);
      analysis = { isCorrect: Boolean(parsed.isCorrect), feedback: String(parsed.feedback || '') };
    } catch (error) {
      console.warn('Brain Challenge AI analysis unavailable; using secure server evaluation:', error);
    }
    const data = await submitBrainChallenge(submittedAnswer);
    setResult(data);
    setAiFeedback(analysis.feedback || '');
    setAnswer(''); setSubmitting(false); await load(); if (data?.is_correct) onRewardsChanged();
  };
  return (
    <div className="mx-auto max-w-3xl rounded-[2rem] border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-6 shadow-sm dark:border-cyan-900/50 dark:from-cyan-950/30 dark:via-slate-900 dark:to-blue-950/30 sm:p-10">
      <div className="flex flex-col items-center text-center"><div className="mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300"><Brain className="h-12 w-12" /></div><h2 className="text-2xl font-black text-slate-900 dark:text-white">{t.brain}</h2><p className="mt-2 max-w-lg text-sm leading-7 text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'اكتب إجابتك، وسيتم تحليلها على أساس السؤال قبل احتساب مكافأتك.' : 'Write your answer. It is checked against the question before your reward is recorded.'}</p></div>
      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950/50"><div className="flex items-center justify-between gap-3 text-xs font-black text-slate-500 dark:text-slate-400"><span>{t.todayQuestion}</span><span>{t.attempts}: {Math.min(1, Number(challenge?.attempts_today || 0))}/1</span></div><p className="mt-5 text-center text-xl font-black leading-10 text-slate-900 dark:text-white">{loading ? <Loader2 className="mx-auto h-7 w-7 animate-spin text-cyan-600" /> : challenge?.question}</p><div className="mt-6 flex flex-col gap-3 sm:flex-row"><input value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} disabled={loading || submitting || Number(challenge?.attempts_remaining || 0) <= 0} placeholder={t.answer} className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /><button type="button" onClick={submit} disabled={!answer.trim() || loading || submitting || Number(challenge?.attempts_remaining || 0) <= 0} className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}{submitting ? t.analyzing : t.submit}</button></div></div>
      {result && <div className={`mt-5 rounded-2xl p-4 text-center text-sm font-black ${result.is_correct ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}><div>{result.is_correct ? ` ${t.correct} · +${result.points} ${t.points}` : `× ${t.wrong} · ${t.tryAgain}`}</div>{aiFeedback && <p className="mt-2 text-xs font-bold opacity-80">{aiFeedback}</p>}</div>}
    </div>
  );
}


export default function MotivationHubPage({ userId, userName, isPremium, planName, lang, section, onNavigate }: MotivationHubPageProps) {
  const t = labels[lang];
  const [rewards, setRewards] = React.useState<Rewards>({ points: 0, coins: 0, dailyStreak: 0 });
  const [status, setStatus] = React.useState<any>(null);
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);
  const refresh = React.useCallback(async () => {
    if (!userId || userId.startsWith('user-')) return;
    try {
      const [summary, motivation, streak] = await Promise.all([
        getRewardsSummary(userId),
        getMotivationStatus().catch(() => null),
        getLearningStreakStatus().catch(() => null),
      ]);
      setRewards({
        points: summary?.points || 0,
        coins: summary?.coins || 0,
        dailyStreak: streak?.currentStreak ?? summary?.dailyStreak ?? 0
      });
      setStatus(motivation);
    } catch (e) {
      console.error('Refresh rewards error:', e);
    }
  }, [userId]);
  React.useEffect(() => { refresh(); }, [refresh]);
  React.useEffect(() => {
    if (!userId || userId.startsWith('user-')) return;
    void recordMotivationUsageEvent(section, 'view').catch(() => undefined);
  }, [section, userId]);
  const onRewardsChanged = () => { refresh(); void recordMotivationUsageEvent(section, 'engaged').catch(() => undefined); window.dispatchEvent(new CustomEvent('quizspace-rewards-updated')); };
  const checkIn = async () => { if (isCheckingIn) return; setIsCheckingIn(true); const result = await updateDailyStreak(); setIsCheckingIn(false); if (result?.success !== false) onRewardsChanged(); };
  const pageTitle = section === 'motivation-lucky' ? t.lucky : section === 'motivation-brain' ? t.brain : section === 'motivation-review' ? t.review : section === 'motivation-season' ? t.season : section === 'motivation-duel' ? t.duel : section === 'motivation-store' ? t.store : t.hub;
  return <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6 lg:px-10" dir={lang === 'ar' ? 'rtl' : 'ltr'}><div className="relative mb-6 overflow-hidden rounded-[2rem] border border-violet-300/40 bg-gradient-to-br from-violet-700 via-indigo-650 to-sky-700 p-6 text-white shadow-lg shadow-violet-500/10 sm:p-8"><div aria-hidden="true" className="absolute -top-16 -end-10 h-48 w-48 rounded-full border border-white/15 bg-white/10" /><div aria-hidden="true" className="absolute -bottom-24 start-1/3 h-52 w-52 rounded-full bg-sky-300/10 blur-3xl" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-white/75"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15"><Sparkles className="h-3.5 w-3.5" /></span>QuizSpace Rewards</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">{pageTitle}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">{t.subtitle}{userName ? ` · ${userName}` : ''}</p></div><RewardPill rewards={rewards} lang={lang} /></div></div><SectionNav section={section} onNavigate={onNavigate} lang={lang} /><div className="mt-6">{section === 'motivation' && <div className="space-y-6"><Overview userId={userId} rewards={rewards} status={status} onNavigate={onNavigate} onCheckIn={checkIn} isCheckingIn={isCheckingIn} lang={lang} /><RewardsSection userId={userId} lang={lang} /></div>}{section === 'motivation-lucky' && <LuckyWheelPanel onRewardsChanged={onRewardsChanged} lang={lang} />}{section === 'motivation-brain' && <BrainChallengePanel onRewardsChanged={onRewardsChanged} lang={lang} />}{section === 'motivation-review' && <SmartReviewPanel lang={lang} />}{section === 'motivation-season' && <LearningSeasonPanel lang={lang} />}{section === 'motivation-duel' && <KnowledgeDuelPanel lang={lang} />}{section === 'motivation-store' && <IndependentStore userId={userId} isPremium={isPremium} planName={planName} rewards={rewards} onRewardsChanged={onRewardsChanged} lang={lang} />}</div></main>;
}
