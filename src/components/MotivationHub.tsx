import React, { useState, useEffect, useCallback } from 'react';
import { getMotivationStatus, claimLuckySpin, claimMysteryBox, submitBrainChallenge } from '../lib/db';

interface MotivationHubProps {
  userId: string | null;
  isAr: boolean;
  triggerToast: (title: string, message: string, type: string) => void;
}

interface MotivationStatus {
  streak: { current: number; longest: number; points: number } | null;
  lucky_spin: boolean;
  mystery_box: boolean;
  brain_challenge: { attempts_today: number; correct: number };
  referrals_used: number;
  happy_hour: { is_happy_hour: boolean; multiplier: number; start_hour: number; end_hour: number };
}

const getImageUrl = (name: string) => {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${base}/images/${name}.webp`;
};

const IMAGES: Record<string, string> = {
  lucky_wheel: getImageUrl('lucky_wheel'),
  streak_fire: getImageUrl('streak_fire'),
  leaderboard_trophy: getImageUrl('leaderboard_trophy'),
  mystery_box: getImageUrl('mystery_box'),
  brain_challenge: getImageUrl('brain_challenge'),
  referral_friends: getImageUrl('referral_friends'),
  weekly_achievement: getImageUrl('weekly_achievement'),
  happy_hour: getImageUrl('happy_hour'),
  group_challenge: getImageUrl('group_challenge'),
};

export default function MotivationHub({ userId, isAr, triggerToast }: MotivationHubProps) {
  const [status, setStatus] = useState<MotivationStatus | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinAngle, setSpinAngle] = useState(0);
  const [brainAnswer, setBrainAnswer] = useState('');
  const [brainResult, setBrainResult] = useState<{ is_correct: boolean; points: number } | null>(null);
  const [isOpeningBox, setIsOpeningBox] = useState(false);
  const [boxReward, setBoxReward] = useState<{ type: string; value: number } | null>(null);

  useEffect(() => {
    if (!userId) return;
    loadStatus();
  }, [userId]);

  const loadStatus = async () => {
    try {
      const s = await getMotivationStatus();
      if (s) setStatus(s as unknown as MotivationStatus);
    } catch (e) {
      console.error('Failed to load motivation status:', e);
    }
  };

  // 1. Lucky Spin
  const handleSpin = async () => {
    if (isSpinning || !userId) return;
    setIsSpinning(true);

    // Animate wheel
    const finalAngle = 360 * 3 + Math.floor(Math.random() * 360);
    const duration = 3000;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setSpinAngle(finalAngle * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    await new Promise(r => setTimeout(r, 3000));

    const result = await claimLuckySpin();
    setIsSpinning(false);
    setSpinAngle(0);

    if (result?.success) {
      triggerToast(isAr ? '🎉 مبروك!' : '🎉 Congratulations!', (result as any).message, 'info');
      loadStatus();
    } else {
      triggerToast(isAr ? '⏰ حاول غداً' : '⏰ Try Tomorrow', (result as any)?.message || '', 'info');
    }
  };

  // 2. Mystery Box
  const handleOpenBox = async () => {
    if (isOpeningBox || !userId) return;
    setIsOpeningBox(true);

    await new Promise(r => setTimeout(r, 2000));

    const result = await claimMysteryBox();
    setIsOpeningBox(false);

    if (result?.success) {
      setBoxReward({ type: (result as any).reward_type, value: (result as any).reward_value });
      triggerToast(isAr ? '🎁 صندوق الغموض!' : '🎁 Mystery Box!', (result as any).message, 'info');
      loadStatus();
    } else {
      triggerToast(isAr ? '⏰ ليس الآن' : '⏰ Not Yet', (result as any)?.message || '', 'info');
    }
  };

  // 3. Brain Challenge
  const handleBrainSubmit = async () => {
    if (!brainAnswer.trim() || !userId) return;
    const result = await submitBrainChallenge(brainAnswer.trim());
    if (result) {
      setBrainResult({ is_correct: (result as any).is_correct, points: (result as any).points });
      if ((result as any).is_correct) {
        triggerToast(isAr ? '🧠 صحيح!' : '🧠 Correct!', (result as any).message, 'info');
      } else {
        triggerToast(isAr ? '❌ خطأ' : '❌ Wrong', (result as any).message, 'info');
      }
      loadStatus();
    }
    setBrainAnswer('');
  };

  // 4. Streak Display
  const streakDays = status?.streak?.current || 0;
  const streakMilestones = [
    { days: 3, label: isAr ? '3 أيام' : '3 Days', icon: '🔥' },
    { days: 7, label: isAr ? 'أسبوع' : '1 Week', icon: '⭐' },
    { days: 14, label: isAr ? 'أسبوعان' : '2 Weeks', icon: '💎' },
    { days: 30, label: isAr ? 'شهر' : '1 Month', icon: '👑' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <span className="text-2xl">🎮</span>
          {isAr ? 'مركز التحفيز' : 'Motivation Hub'}
        </h2>
        {status?.happy_hour?.is_happy_hour && (
          <div className="px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black animate-pulse flex items-center gap-1.5">
            <span>⏰</span>
            <span>{isAr ? 'ساعة سعيدة! 2x' : 'Happy Hour! 2x'}</span>
          </div>
        )}
      </div>

      {/* Grid of Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* 1. Lucky Spin */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col items-center text-center hover:border-purple-500/30 transition-colors">
          <img
            src={IMAGES.lucky_wheel}
            alt="Lucky Wheel"
            className="w-20 h-20 rounded-xl object-cover mb-3"
            style={{ transform: `rotate(${spinAngle}deg)`, transition: isSpinning ? 'none' : 'transform 0.3s' }}
            loading="lazy"
          />
          <h4 className="text-xs font-black text-white mb-1">{isAr ? 'عجلة الحظ' : 'Lucky Spin'}</h4>
          <p className="text-[10px] text-slate-500 mb-2">{isAr ? '1× يومياً — اربح 1-50 نقطة' : '1×/day — Win 1-50 pts'}</p>
          <button
            onClick={handleSpin}
            disabled={isSpinning || status?.lucky_spin}
            className="px-4 py-1.5 rounded-xl text-xs font-black text-white cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
          >
            {isSpinning ? (isAr ? '🌀 تدور...' : '🌀 Spinning...') : status?.lucky_spin ? (isAr ? '✅ تم اليوم' : '✅ Done Today') : (isAr ? '🎡 دوّر!' : '🎡 Spin!')}
          </button>
        </div>

        {/* 2. Streak */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col items-center text-center hover:border-orange-500/30 transition-colors">
          <img src={IMAGES.streak_fire} alt="Streak" className="w-20 h-20 rounded-xl object-cover mb-3" loading="lazy" />
          <h4 className="text-xs font-black text-white mb-1">{isAr ? 'سلسلة الأيام' : 'Daily Streak'}</h4>
          <div className="flex items-center gap-1 mb-2">
            <span className="text-lg font-black text-orange-400">🔥 {streakDays}</span>
            <span className="text-[10px] text-slate-500">{isAr ? 'يوم' : 'days'}</span>
          </div>
          <div className="flex gap-1 mb-2">
            {streakMilestones.map((m, i) => (
              <span
                key={i}
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${streakDays >= m.days ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-600'}`}
              >
                {m.icon} {m.days}
              </span>
            ))}
          </div>
          <p className="text-[9px] text-slate-600">
            {isAr ? `أطول سلسلة: ${status?.streak?.longest || 0} يوم` : `Longest: ${status?.streak?.longest || 0} days`}
          </p>
        </div>

        {/* 3. Mystery Box */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col items-center text-center hover:border-purple-500/30 transition-colors">
          <img
            src={IMAGES.mystery_box}
            alt="Mystery Box"
            className="w-20 h-20 rounded-xl object-cover mb-3"
            style={{ animation: isOpeningBox ? 'pulse 0.5s infinite' : 'none' }}
            loading="lazy"
          />
          <h4 className="text-xs font-black text-white mb-1">{isAr ? 'صندوق الغموض' : 'Mystery Box'}</h4>
          <p className="text-[10px] text-slate-500 mb-2">{isAr ? 'كل 3 أيام — مفاجأة عشوائية' : 'Every 3 days — Random reward'}</p>
          {boxReward && (
            <p className="text-[10px] text-amber-400 font-bold mb-1">
              {boxReward.type === 'vip_day' ? '👑 VIP 1 Day' : `${boxReward.value} ${boxReward.type}`}
            </p>
          )}
          <button
            onClick={handleOpenBox}
            disabled={isOpeningBox || !status?.mystery_box}
            className="px-4 py-1.5 rounded-xl text-xs font-black text-white cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
          >
            {isOpeningBox ? (isAr ? '📦 يُفتح...' : '📦 Opening...') : status?.mystery_box ? (isAr ? '🎁 افتح!' : '🎁 Open!') : (isAr ? '⏳ انتظر' : '⏳ Wait')}
          </button>
        </div>

        {/* 4. Brain Challenge */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col items-center text-center hover:border-cyan-500/30 transition-colors">
          <img src={IMAGES.brain_challenge} alt="Brain Challenge" className="w-20 h-20 rounded-xl object-cover mb-3" loading="lazy" />
          <h4 className="text-xs font-black text-white mb-1">{isAr ? 'تحدي العقل' : 'Brain Challenge'}</h4>
          <p className="text-[10px] text-slate-500 mb-2">{isAr ? 'سؤال يومي — 20 نقطة' : 'Daily question — 20 pts'}</p>
          {status?.brain_challenge?.attempts_today !== undefined && (
            <p className="text-[9px] text-slate-600 mb-1">
              {isAr ? `${status.brain_challenge.attempts_today}/3 محاولات` : `${status.brain_challenge.attempts_today}/3 attempts`}
              {status.brain_challenge.correct > 0 && ` • ✅ ${status.brain_challenge.correct}`}
            </p>
          )}
          <div className="flex gap-1 w-full">
            <input
              type="text"
              value={brainAnswer}
              onChange={(e) => setBrainAnswer(e.target.value)}
              placeholder={isAr ? 'إجابتك...' : 'Your answer...'}
              className="flex-1 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-[10px] placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleBrainSubmit()}
            />
            <button
              onClick={handleBrainSubmit}
              disabled={!brainAnswer.trim() || (status?.brain_challenge?.attempts_today || 0) >= 3}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold cursor-pointer disabled:opacity-40"
            >
              {isAr ? 'أرسل' : 'Go'}
            </button>
          </div>
          {brainResult && (
            <p className={`text-[9px] mt-1 font-bold ${brainResult.is_correct ? 'text-green-400' : 'text-red-400'}`}>
              {brainResult.is_correct ? `✅ +${brainResult.points}` : '❌ Try again'}
            </p>
          )}
        </div>

        {/* 5. Referral */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col items-center text-center hover:border-teal-500/30 transition-colors">
          <img src={IMAGES.referral_friends} alt="Referral" className="w-20 h-20 rounded-xl object-cover mb-3" loading="lazy" />
          <h4 className="text-xs font-black text-white mb-1">{isAr ? 'دعوة صديق' : 'Refer a Friend'}</h4>
          <p className="text-[10px] text-slate-500 mb-2">{isAr ? '50 نقطة لكل صديق — 5 شهرياً' : '50 pts each — 5/month'}</p>
          <p className="text-[9px] text-slate-600 mb-1">
            {isAr ? `${status?.referrals_used || 0}/5 هذا الشهر` : `${status?.referrals_used || 0}/5 this month`}
          </p>
          <button
            onClick={() => {
              const link = `${window.location.origin}?ref=${userId}`;
              navigator.clipboard.writeText(link);
              triggerToast(isAr ? '📋 تم النسخ!' : '📋 Copied!', isAr ? 'شارك الرابط مع صديق' : 'Share the link with a friend', 'info');
            }}
            disabled={(status?.referrals_used || 0) >= 5}
            className="px-4 py-1.5 rounded-xl text-xs font-black text-white cursor-pointer transition-all disabled:opacity-40 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500"
          >
            {isAr ? '📋 انسخ رابط الدعوة' : '📋 Copy Invite Link'}
          </button>
        </div>

        {/* 6. Weekly Achievement */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col items-center text-center hover:border-amber-500/30 transition-colors">
          <img src={IMAGES.weekly_achievement} alt="Weekly Achievement" className="w-20 h-20 rounded-xl object-cover mb-3" loading="lazy" />
          <h4 className="text-xs font-black text-white mb-1">{isAr ? 'إنجاز أسبوعي' : 'Weekly Achievement'}</h4>
          <p className="text-[10px] text-slate-500 mb-1">{isAr ? 'حل 5 اختبارات = شارة + 30 نقطة' : 'Solve 5 quizzes = Badge + 30 pts'}</p>
          <p className="text-[9px] text-slate-600">{isAr ? 'يتجدد كل أسبوع' : 'Resets weekly'}</p>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-2">
            <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-2 rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>

        {/* 7. Happy Hour */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col items-center text-center hover:border-amber-500/30 transition-colors">
          <img src={IMAGES.happy_hour} alt="Happy Hour" className="w-20 h-20 rounded-xl object-cover mb-3" loading="lazy" />
          <h4 className="text-xs font-black text-white mb-1">{isAr ? 'الساعة السعيدة' : 'Happy Hour'}</h4>
          <p className="text-[10px] text-slate-500 mb-1">{isAr ? '6-8 مساءً — نقاط مضاعفة 2x' : '6-8 PM — 2x Points'}</p>
          {status?.happy_hour?.is_happy_hour ? (
            <span className="text-[10px] text-amber-400 font-black animate-pulse">🔥 {isAr ? 'نشطة الآن!' : 'ACTIVE NOW!'}</span>
          ) : (
            <span className="text-[9px] text-slate-600">{isAr ? 'تبدأ الساعة 6 مساءً' : 'Starts at 6 PM'}</span>
          )}
        </div>

        {/* 8. Group Challenge */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col items-center text-center hover:border-green-500/30 transition-colors">
          <img src={IMAGES.group_challenge} alt="Group Challenge" className="w-20 h-20 rounded-xl object-cover mb-3" loading="lazy" />
          <h4 className="text-xs font-black text-white mb-1">{isAr ? 'تحدي المجموعة' : 'Group Challenge'}</h4>
          <p className="text-[10px] text-slate-500 mb-1">{isAr ? 'تحدٍ أسبوعي مع فصلك' : 'Weekly class challenge'}</p>
          <p className="text-[9px] text-slate-600">{isAr ? 'انضم لفصل وشارك في التحدي' : 'Join a class to participate'}</p>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-2">
            <div className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full" style={{ width: '35%' }}></div>
          </div>
        </div>

        {/* 9. Leaderboard */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col items-center text-center hover:border-yellow-500/30 transition-colors">
          <img src={IMAGES.leaderboard_trophy} alt="Leaderboard" className="w-20 h-20 rounded-xl object-cover mb-3" loading="lazy" />
          <h4 className="text-xs font-black text-white mb-1">{isAr ? 'لوحة الصدارة' : 'Leaderboard'}</h4>
          <p className="text-[10px] text-slate-500 mb-1">{isAr ? 'أفضل 10 كل أسبوع' : 'Top 10 weekly'}</p>
          <p className="text-[9px] text-slate-600">{isAr ? 'شارات + VIP مؤقت' : 'Badges + Temp VIP'}</p>
        </div>

        {/* 10. AI Quiz (existing) */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col items-center text-center hover:border-blue-500/30 transition-colors">
          <img src={IMAGES.brain_challenge} alt="AI Quiz" className="w-20 h-20 rounded-xl object-cover mb-3" style={{ filter: 'hue-rotate(90deg)' }} loading="lazy" />
          <h4 className="text-xs font-black text-white mb-1">{isAr ? 'كويز AI يومي' : 'Daily AI Quiz'}</h4>
          <p className="text-[10px] text-slate-500 mb-1">{isAr ? '3 محاولات مجانية يومياً' : '3 free tries/day'}</p>
          <p className="text-[9px] text-slate-600">{isAr ? 'توليد كويز من أي نص' : 'Generate quiz from any text'}</p>
        </div>
      </div>
    </div>
  );
}
