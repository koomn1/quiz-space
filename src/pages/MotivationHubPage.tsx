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
};

type Rewards = { points: number; coins: number; dailyStreak: number };

const imageUrl = (name: string) => `${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/images/${name}.webp`;

const labels = {
  ar: {
    hub: 'مركز التحفيز', subtitle: 'حوّل كل جلسة مذاكرة إلى تقدّم واضح ومكافآت حقيقية.', overview: 'نظرة عامة',
    lucky: 'عجلة الحظ', brain: 'تحدي العقل', review: 'مراجعة ذكية', season: 'موسم التعلّم', duel: 'مبارزة خاصة', store: 'متجر النقاط', points: 'نقطة', coins: 'عملة',
    streak: 'سلسلة الأيام', checkIn: 'سجّل حضور اليوم', checked: 'تم تسجيل اليوم',
    spinHint: 'أدر العجلة مرة واحدة يومياً واربح من 1 إلى 50 نقطة.', spin: 'أدر العجلة', spinning: 'العجلة تدور...', done: 'تم اللعب اليوم',
    todayQuestion: 'سؤال اليوم', attempts: 'محاولات اليوم', answer: 'اكتب إجابتك هنا', submit: 'تحليل الإجابة', analyzing: 'جاري التحليل...', correct: 'إجابة صحيحة', wrong: 'ليست الإجابة الصحيحة', tryAgain: 'لديك محاولة أخرى',
    frames: 'إطارات الصورة', bundles: 'باقات النقاط', owned: 'مملوك', buy: 'شراء بالنقاط', diamond: 'متاح للماسي فقط', price: 'السعر',
    paymentTitle: 'إتمام شراء النقاط', paymentHint: 'حوّل المبلغ ثم أرسل رقم العملية أو صورة الإيصال للمراجعة.', vodafone: 'Vodafone Cash', instapay: 'InstaPay', reference: 'رقم العملية', receipt: 'صورة الإيصال', sendOrder: 'إرسال الطلب', sending: 'جاري الإرسال...', cancel: 'إلغاء',
    orderSent: 'تم إرسال طلبك للمراجعة. ستضاف النقاط بعد التأكيد.', purchased: 'تمت الإضافة إلى مخزونك.', notEnough: 'رصيد النقاط غير كافٍ.', login: 'سجّل الدخول لاستخدام المكافآت',
  },
  en: {
    hub: 'Motivation Hub', subtitle: 'Turn every study session into visible progress and meaningful rewards.', overview: 'Overview',
    lucky: 'Lucky Wheel', brain: 'Brain Challenge', review: 'Smart review', season: 'Learning season', duel: 'Private duel', store: 'Points Store', points: 'points', coins: 'coins',
    streak: 'Daily Streak', checkIn: 'Check in today', checked: 'Checked in today',
    spinHint: 'Spin once a day and win between 1 and 50 points.', spin: 'Spin the wheel', spinning: 'Spinning...', done: 'Played today',
    todayQuestion: "Today's question", attempts: 'Attempts today', answer: 'Type your answer here', submit: 'Analyze answer', analyzing: 'Analyzing...', correct: 'Correct answer', wrong: 'Not quite right', tryAgain: 'You have another attempt',
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
          className={`flex min-h-11 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black transition duration-200 motion-reduce:transform-none ${section === item.id ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`}
        >
          {item.icon}{item.label}
        </button>
      ))}
    </div>
  );
}

function Overview({ rewards, status, onNavigate, onCheckIn, isCheckingIn, lang }: { rewards: Rewards; status: any; onNavigate: (section: MotivationSection) => void; onCheckIn: () => void; isCheckingIn: boolean; lang: 'ar' | 'en' }) {
  const t = labels[lang];
  const cards = [
    { id: 'motivation-lucky' as const, title: t.lucky, text: t.spinHint, eyebrow: lang === 'ar' ? 'فرصة اليوم' : 'Today’s chance', image: imageUrl('lucky_wheel'), gradient: 'from-fuchsia-700/90 via-violet-600/75 to-indigo-700/75', icon: <Gift className="h-5 w-5" /> },
    { id: 'motivation-brain' as const, title: t.brain, text: lang === 'ar' ? 'سؤال يتغير يومياً وتحليل آمن للإجابة.' : 'A daily question with secure answer analysis.', eyebrow: lang === 'ar' ? 'تدريب قصير' : 'Short practice', image: imageUrl('brain_challenge'), gradient: 'from-cyan-700/90 via-blue-600/75 to-indigo-700/75', icon: <Brain className="h-5 w-5" /> },
    { id: 'motivation-store' as const, title: t.store, text: lang === 'ar' ? 'اشترِ إطارات مميزة وباقات نقاط.' : 'Buy premium frames and points bundles.', eyebrow: lang === 'ar' ? 'تخصيص الملف' : 'Profile customisation', image: imageUrl('mystery_box'), gradient: 'from-amber-700/90 via-orange-600/75 to-rose-700/75', icon: <Store className="h-5 w-5" /> },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StreakMomentumCard lang={lang} onCheckIn={onCheckIn} isCheckingIn={isCheckingIn} />
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

  const segments = [
    { label: '5', color: 'bg-indigo-500' },
    { label: '10', color: 'bg-purple-500' },
    { label: '20', color: 'bg-fuchsia-500' },
    { label: '50', color: 'bg-rose-500' },
    { label: '1', color: 'bg-amber-500' },
    { label: '15', color: 'bg-cyan-500' },
    { label: '5', color: 'bg-indigo-500' },
    { label: '10', color: 'bg-purple-500' },
  ];

  const spin = async () => {
    if (spinning || alreadyPlayed) return;
    setSpinning(true);
    setResult(null);
    const extraSpins = 5 + Math.floor(Math.random() * 5);
    const randomAngle = Math.floor(Math.random() * 360);
    const totalAngle = extraSpins * 360 + randomAngle;
    setAngle(totalAngle);

    await new Promise((resolve) => setTimeout(resolve, 4000));
    const response = await claimLuckySpin();
    setSpinning(false);
    // Keep the angle but normalize it for UI consistency if needed
    // setAngle(totalAngle % 360); 
    setResult(response);
    if (response?.success) {
      setAlreadyPlayed(true);
      onRewardsChanged();
    }
  };

  return (
    <div className="mx-auto max-w-3xl rounded-[2.5rem] border border-slate-200 bg-white/50 p-6 text-center shadow-2xl backdrop-blur-sm dark:border-white/10 dark:bg-[#0c071e]/50 sm:p-12">
      <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-inner">
        <Gift className="h-10 w-10 animate-pulse" />
      </div>
      <h2 className="text-3xl font-black bg-gradient-to-r from-primary via-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
        {t.lucky}
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm font-bold text-slate-500 dark:text-slate-400">
        {t.spinHint}
      </p>

      <div className="relative mx-auto my-12 h-72 w-72 sm:h-80 sm:w-80">
        {/* Pointer */}
        <div className="absolute -top-4 left-1/2 z-30 -translate-x-1/2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
          <div className="h-0 w-0 border-x-[15px] border-t-[30px] border-x-transparent border-t-rose-600" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-white/50" />
        </div>

        {/* Wheel Container */}
        <div 
          className="relative h-full w-full rounded-full border-[8px] border-slate-800 bg-slate-900 shadow-[0_0_50px_-12px_rgba(139,92,246,0.5)] transition-transform duration-[4000ms] cubic-bezier(0.15, 0, 0.15, 1) overflow-hidden"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          {segments.map((seg, i) => (
            <div
              key={i}
              className={`absolute top-0 left-1/2 h-1/2 w-1/2 origin-bottom-left ${seg.color}`}
              style={{
                transform: `rotate(${i * (360 / segments.length)}deg) skewY(-${90 - (360 / segments.length)}deg)`,
              }}
            >
              <div 
                className="absolute bottom-4 left-4 flex h-24 w-24 origin-center items-center justify-center font-black text-white"
                style={{
                  transform: `skewY(${90 - (360 / segments.length)}deg) rotate(${(360 / segments.length) / 2}deg) translateY(-20px)`,
                }}
              >
                <span className="text-xl drop-shadow-md">{seg.label}</span>
              </div>
            </div>
          ))}
          
          {/* Center Cap */}
          <div className="absolute inset-0 m-auto h-12 w-12 rounded-full border-4 border-slate-800 bg-white shadow-lg flex items-center justify-center z-20">
            <div className="h-3 w-3 rounded-full bg-primary animate-ping" />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={spin}
        disabled={spinning || alreadyPlayed}
        className="group relative mx-auto flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-primary px-10 py-4 text-sm font-black text-white shadow-xl shadow-primary/30 transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
        {spinning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-current" />}
        {spinning ? t.spinning : alreadyPlayed ? t.done : t.spin}
      </button>

      {result && (
        <div className={`mx-auto mt-8 max-w-md animate-in fade-in slide-in-from-top-4 rounded-2xl border p-5 text-sm font-black shadow-sm ${
          result.success 
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-400' 
            : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-400'
        }`}>
          <div className="flex items-center justify-center gap-2">
            {result.success ? <Sparkles className="h-5 w-5" /> : <Loader2 className="h-5 w-5" />}
            {result.success ? `+${result.points} ${t.points}` : result.message}
          </div>
        </div>
      )}
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
      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950/50"><div className="flex items-center justify-between gap-3 text-xs font-black text-slate-500 dark:text-slate-400"><span>{t.todayQuestion}</span><span>{t.attempts}: {challenge?.attempts_today || 0}/3</span></div><p className="mt-5 text-center text-xl font-black leading-10 text-slate-900 dark:text-white">{loading ? <Loader2 className="mx-auto h-7 w-7 animate-spin text-cyan-600" /> : challenge?.question}</p><div className="mt-6 flex flex-col gap-3 sm:flex-row"><input value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} disabled={loading || submitting || Number(challenge?.attempts_remaining || 0) <= 0} placeholder={t.answer} className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /><button type="button" onClick={submit} disabled={!answer.trim() || loading || submitting || Number(challenge?.attempts_remaining || 0) <= 0} className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}{submitting ? t.analyzing : t.submit}</button></div></div>
      {result && <div className={`mt-5 rounded-2xl p-4 text-center text-sm font-black ${result.is_correct ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}><div>{result.is_correct ? `✓ ${t.correct} · +${result.points} ${t.points}` : `× ${t.wrong} · ${t.tryAgain}`}</div>{aiFeedback && <p className="mt-2 text-xs font-bold opacity-80">{aiFeedback}</p>}</div>}
    </div>
  );
}

function StorePanel({ userId, isPremium, planName, rewards, onRewardsChanged, lang }: { userId: string; isPremium?: boolean; planName?: string; rewards: Rewards; onRewardsChanged: () => void; lang: 'ar' | 'en' }) {
  const t = labels[lang];
  const [items, setItems] = React.useState<StoreItem[]>([]);
  const [inventory, setInventory] = React.useState<any[]>([]);
  const [activeFrameId, setActiveFrameId] = React.useState(() => localStorage.getItem('quizspace_active_frame') || '');
  const [settings, setSettings] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [paymentItem, setPaymentItem] = React.useState<StoreItem | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<'vodafone_cash' | 'instapay'>('vodafone_cash');
  const [reference, setReference] = React.useState('');
  const [receipt, setReceipt] = React.useState('');
  const load = React.useCallback(async () => { setLoading(true); try { const [storeItems, owned, paymentSettings] = await Promise.all([getRewardStoreItems(), getRewardInventory(userId), getRewardPaymentSettings()]); setItems(storeItems as StoreItem[]); setInventory(owned); setSettings(paymentSettings); } catch (error: any) { showToast('error', error?.message || 'Store unavailable'); } finally { setLoading(false); } }, [userId]);
  React.useEffect(() => { load(); }, [load]);
  const owned = (itemId: string) => inventory.some((item) => item.item_id === itemId);
  const useFrame = async (item: StoreItem) => {
    if (busy || activeFrameId === item.id) return;
    setBusy(item.id);
    try {
      const response = await activateRewardFrame(item.id);
      if (!response?.success) throw new Error(response?.message || 'Frame activation failed');
      setActiveFrameId(item.id);
      localStorage.setItem('quizspace_active_frame', item.id);
      window.dispatchEvent(new CustomEvent('quizspace-frame-updated'));
      showToast('success', lang === 'ar' ? 'تم تفعيل الإطار على ملفك الشخصي.' : 'Frame activated on your profile.');
    } catch (error: any) {
      showToast('error', error?.message || (lang === 'ar' ? 'تعذر تفعيل الإطار.' : 'The frame could not be activated.'));
    } finally {
      setBusy(null);
    }
  };
  const buyFrame = async (item: StoreItem) => { 
    if (busy) return; 
    const priceCoins = item.price_coins || 0;
    if (priceCoins > 0) {
      if (priceCoins > rewards.coins) { showToast('error', lang === 'ar' ? 'رصيد العملات غير كافٍ.' : 'Not enough coins.'); return; }
    } else if (item.price_points > rewards.points) { 
      showToast('error', t.notEnough); return; 
    } 
    setBusy(item.id); 
    const response = await purchaseRewardItem(item.id); 
    setBusy(null); 
    if (response?.success) { 
      showToast('success', t.purchased); 
      if (item.item_type === 'frame') {
        const activation = await activateRewardFrame(item.id);
        if (activation?.success) {
          setActiveFrameId(item.id);
          localStorage.setItem('quizspace_active_frame', item.id);
          window.dispatchEvent(new CustomEvent('quizspace-frame-updated'));
        }
      } else if (item.id.startsWith('pass_')) {
        showToast('success', lang === 'ar' ? 'تم تفعيل العضوية الجديدة بنجاح! يرجى تحديث الصفحة.' : 'Membership activated successfully! Please refresh.');
      }
      await load(); 
      onRewardsChanged(); 
    } else if (response?.already_owned) showToast('info', t.owned); 
    else showToast('error', response?.message || 'Purchase failed'); 
  };
  const sendOrder = async () => { if (!paymentItem || busy) return; setBusy(paymentItem.id); const response = await createRewardPointsOrder(paymentItem.id, paymentMethod, reference, receipt); setBusy(null); if (response?.success) { setPaymentItem(null); setReference(''); setReceipt(''); showToast('success', t.orderSent); } else showToast('error', response?.message || 'Could not create order'); };
  const uploadReceipt = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => setReceipt(String(reader.result || '')); reader.readAsDataURL(file); };
  const offers = items.filter((item: any) => item.is_featured);
  const frames = items.filter((item) => item.item_type === 'frame' && !item.is_featured); 
  const bundles = items.filter((item) => item.item_type === 'points_bundle' && !item.is_featured);
  const planRank = (planName || '').toLowerCase().includes('diamond') || (planName || '').includes('الماس') ? 4 : (isPremium ? 2 : 1);
  const rankFor = (plan: string) => plan === 'diamond' ? 4 : plan === 'gold' ? 3 : plan === 'silver' ? 2 : 1;
  const renderCard = (item: StoreItem) => { 
    const locked = planRank < rankFor(item.min_plan); 
    const isOwned = owned(item.id); 
    const itemImageUrl = item.image_url ? `${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/${item.image_url}` : null;
    
    return (
      <div key={item.id} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className={`relative mb-4 flex h-28 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${item.css_class === 'frame-fire' ? 'from-orange-500 to-rose-600' : item.css_class === 'frame-crystal-luxe' ? 'from-cyan-400 to-indigo-600' : item.css_class === 'frame-star-crown' ? 'from-amber-400 to-yellow-600' : item.css_class === 'frame-diamond-comet' || item.css_class === 'frame-diamond-crown' ? 'from-sky-400 to-violet-700' : 'from-violet-500 to-fuchsia-600'}`}>
          <div className="relative z-10 h-16 w-16 rounded-full border-4 border-white/90 bg-slate-900/35 shadow-[0_0_0_5px_rgba(255,255,255,.22)] flex items-center justify-center overflow-hidden">
            {itemImageUrl ? (
              <img src={itemImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover scale-110" />
            ) : (
              <Sparkles className="h-6 w-6 text-white/50" />
            )}
          </div>
          {locked && <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/55 text-white"><Lock className="h-6 w-6" /></div>}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">{lang === 'ar' ? item.name_ar : item.name}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{lang === 'ar' ? item.description_ar : item.description}</p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xs font-black">
            {locked ? (
              <span className="text-amber-600 dark:text-amber-400">{t.diamond}</span>
            ) : isOwned ? (
              <span className="text-emerald-600 dark:text-emerald-400">{t.owned}</span>
            ) : item.price_coins && item.price_coins > 0 ? (
              <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                <Coins className="h-3 w-3" />
                {item.price_coins.toLocaleString()}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Sparkles className="h-3 w-3" />
                {item.price_points.toLocaleString()}
              </span>
            )}
          </span>
          <button type="button" disabled={locked || busy === item.id} onClick={() => isOwned ? useFrame(item) : buyFrame(item)} className="rounded-xl bg-violet-600 px-3 py-2 text-[11px] font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-45 shadow-sm shadow-violet-600/20">
            {busy === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isOwned ? (activeFrameId === item.id ? (lang === 'ar' ? 'مفعل' : 'Active') : (lang === 'ar' ? 'استخدام' : 'Use')) : (item.price_egp > 0 ? (lang === 'ar' ? 'شراء بالمال' : 'Buy') : t.buy)}
          </button>
        </div>
      </div>
    ); 
  };
  return <div className="space-y-8">
    <div className="flex flex-col gap-4 rounded-[2rem] border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-orange-950/20 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white"><Store className="h-5 w-5 text-amber-600" />{t.store}</div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'اجمع النقاط من الألعاب ثم استبدلها بإطاراتك المفضلة.' : 'Collect points from games and exchange them for your favorite frames.'}</p></div><RewardPill rewards={rewards} lang={lang} /></div>
    {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-violet-600" /></div> : <div className="space-y-10">
      {offers.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-rose-500" />
            {lang === 'ar' ? '🔥 عروض وتخفيضات حصرية' : '🔥 Exclusive Flash Offers'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((item: any) => (
              <div key={item.id} className="relative flex flex-col rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-5 shadow-md dark:border-rose-900/50 dark:from-rose-950/30 dark:via-slate-900 dark:to-amber-950/20">
                {item.badge_text && (
                  <span className="absolute top-4 start-4 rounded-full bg-rose-600 px-3 py-1 text-[10px] font-black text-white shadow-sm">
                    {item.badge_text}
                  </span>
                )}
                <div className="mt-4 flex-1">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">{lang === 'ar' ? item.name_ar : item.name}</h3>
                  <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{lang === 'ar' ? item.description_ar : item.description}</p>
                </div>
                <div className="mt-6 flex items-center justify-between gap-2 border-t border-rose-100 pt-4 dark:border-rose-900/30">
                  <div>
                    {item.price_egp > 0 ? (
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400">{item.price_egp} EGP</span>
                    ) : (
                      <span className="text-xs font-black text-amber-600 dark:text-amber-300">{item.price_points.toLocaleString()} {t.points}</span>
                    )}
                  </div>
                  <button type="button" onClick={() => item.price_egp > 0 ? setPaymentItem(item) : buyFrame(item)} className="rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-4 py-2 text-xs font-black text-white shadow-md transition hover:opacity-90">
                    {item.price_egp > 0 ? (lang === 'ar' ? 'اطلب العرض' : 'Claim Offer') : t.buy}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <Crown className="h-5 w-5 text-amber-500" />
          {t.frames}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frames.map(renderCard)}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <WalletCards className="h-5 w-5 text-emerald-500" />
          {t.bundles}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bundles.map((item) => (
            <div key={item.id} className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900/50 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white">{lang === 'ar' ? item.name_ar : item.name}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.reward_points.toLocaleString()} {t.points}</p>
              <button type="button" onClick={() => setPaymentItem(item)} className="mt-5 w-full rounded-2xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700">
                {item.price_egp} EGP · {lang === 'ar' ? 'اطلب الآن' : 'Order now'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>}
    {paymentItem && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setPaymentItem(null)}><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-black text-slate-900 dark:text-white">{t.paymentTitle}</h3><p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{t.paymentHint}</p></div><button type="button" onClick={() => setPaymentItem(null)}><X className="h-5 w-5 text-slate-500" /></button></div><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setPaymentMethod('vodafone_cash')} className={`rounded-2xl border px-3 py-3 text-xs font-black ${paymentMethod === 'vodafone_cash' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}>{t.vodafone}<span className="mt-1 block text-[10px] font-bold">{settings?.vodafone_number || '—'}</span></button><button type="button" onClick={() => setPaymentMethod('instapay')} className={`rounded-2xl border px-3 py-3 text-xs font-black ${paymentMethod === 'instapay' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}>{t.instapay}<span className="mt-1 block text-[10px] font-bold">{settings?.instapay_handle || '—'}</span></button></div><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder={t.reference} className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /><label className="mt-3 block cursor-pointer rounded-2xl border border-dashed border-slate-300 p-4 text-center text-xs font-bold text-slate-500 dark:border-slate-700">{receipt ? t.receipt + ' ✓' : t.receipt}<input type="file" accept="image/*" className="hidden" onChange={(event) => uploadReceipt(event.target.files?.[0])} /></label><button type="button" onClick={sendOrder} disabled={busy === paymentItem.id} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60">{busy === paymentItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <WalletCards className="h-4 w-4" />}{busy === paymentItem.id ? t.sending : t.sendOrder}</button><button type="button" onClick={() => setPaymentItem(null)} className="mt-2 w-full rounded-2xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">{t.cancel}</button></div></div>}
  </div>;
}

export default function MotivationHubPage({ userId, userName, isPremium, planName, lang, section, onNavigate }: MotivationHubPageProps) {
  const t = labels[lang];
  const [rewards, setRewards] = React.useState<Rewards>({ points: 0, coins: 0, dailyStreak: 0 });
  const [status, setStatus] = React.useState<any>(null);
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);
  const refresh = React.useCallback(async () => { 
    if (!userId || userId.startsWith('user-')) return;
    try {
      const [summary, motivation] = await Promise.all([
        getRewardsSummary(userId), 
        getMotivationStatus().catch(() => null)
      ]); 
      setRewards({ 
        points: summary?.points || 0, 
        coins: summary?.coins || 0, 
        dailyStreak: summary?.dailyStreak || 0 
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
  return <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6 lg:px-10" dir={lang === 'ar' ? 'rtl' : 'ltr'}><div className="relative mb-6 overflow-hidden rounded-[2rem] border border-violet-300/40 bg-gradient-to-br from-violet-700 via-indigo-650 to-sky-700 p-6 text-white shadow-lg shadow-violet-500/10 sm:p-8"><div aria-hidden="true" className="absolute -top-16 -end-10 h-48 w-48 rounded-full border border-white/15 bg-white/10" /><div aria-hidden="true" className="absolute -bottom-24 start-1/3 h-52 w-52 rounded-full bg-sky-300/10 blur-3xl" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-white/75"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15"><Sparkles className="h-3.5 w-3.5" /></span>QuizSpace Rewards</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">{pageTitle}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">{t.subtitle}{userName ? ` · ${userName}` : ''}</p></div><RewardPill rewards={rewards} lang={lang} /></div></div><SectionNav section={section} onNavigate={onNavigate} lang={lang} /><div className="mt-6">{section === 'motivation' && <div className="space-y-6"><Overview rewards={rewards} status={status} onNavigate={onNavigate} onCheckIn={checkIn} isCheckingIn={isCheckingIn} lang={lang} /><RewardsSection userId={userId} lang={lang} /></div>}{section === 'motivation-lucky' && <LuckyWheelPanel onRewardsChanged={onRewardsChanged} lang={lang} />}{section === 'motivation-brain' && <BrainChallengePanel onRewardsChanged={onRewardsChanged} lang={lang} />}{section === 'motivation-review' && <SmartReviewPanel lang={lang} />}{section === 'motivation-season' && <LearningSeasonPanel lang={lang} />}{section === 'motivation-duel' && <KnowledgeDuelPanel lang={lang} />}{section === 'motivation-store' && <StorePanel userId={userId} isPremium={isPremium} planName={planName} rewards={rewards} onRewardsChanged={onRewardsChanged} lang={lang} />}</div></main>;
}
