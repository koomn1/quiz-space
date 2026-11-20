import React, { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Award,
  Check,
  Flame,
  Gift,
  HelpCircle,
  RotateCw,
  Shield,
  Sparkles,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import {
  determineSpinOutcome,
  getDailyGameAllowance,
  recordGamePlay,
  SPIN_WHEEL_SEGMENTS,
  SpinPrize,
} from '../../lib/miniGamesEngine';
import { playNotificationSound } from '../../lib/sound';

export interface DailySpinWheelProps {
  onClose?: () => void;
  onClaimPrize?: (prize: SpinPrize) => void;
  onUpdateCoins?: (coinsEarned: number) => void;
  userId?: string;
  className?: string;
}

// 8 alternating slices in Petrol, Bright Teal, Coral, Sand
const SLICE_COLORS = [
  { bg: '#007472', text: '#FCF6EE', subtext: '#FBDFC7' }, // Slice 0: Petrol (+10 عملات)
  { bg: '#2AC3BB', text: '#072424', subtext: '#004847' }, // Slice 1: Bright Teal (+25 XP)
  { bg: '#EE8361', text: '#FCF6EE', subtext: '#FCF6EE' }, // Slice 2: Coral (+50 عملة)
  { bg: '#FBDFC7', text: '#072424', subtext: '#004847' }, // Slice 3: Sand (تجميد الستريك)
  { bg: '#007472', text: '#FCF6EE', subtext: '#FBDFC7' }, // Slice 4: Petrol (+100 XP)
  { bg: '#2AC3BB', text: '#072424', subtext: '#004847' }, // Slice 5: Bright Teal (صندوق مفاجأة)
  { bg: '#EE8361', text: '#FCF6EE', subtext: '#FCF6EE' }, // Slice 6: Coral (+15 عملة)
  { bg: '#FBDFC7', text: '#072424', subtext: '#004847' }, // Slice 7: Sand (مضاعف 2x)
];

function easeOutQuart(x: number): number {
  return 1 - Math.pow(1 - x, 4);
}

export const DailySpinWheel: React.FC<DailySpinWheelProps> = ({
  onClose,
  onClaimPrize,
  onUpdateCoins,
  userId = 'guest-player',
  className = '',
}) => {
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState<SpinPrize | null>(null);
  const [showPrizeModal, setShowPrizeModal] = useState(false);

  // Daily Allowance (1 play / day)
  const [allowance, setAllowance] = useState(() => getDailyGameAllowance(userId, 'spin_wheel'));

  const animFrameRef = useRef<number | null>(null);
  const lastSoundTickRef = useRef<number>(0);

  // Cleanup anim frame
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Spin handler with authentic angular deceleration
  const handleSpin = useCallback(() => {
    if (isSpinning || allowance.remainingPlays <= 0) return;

    setIsSpinning(true);
    setWonPrize(null);
    setShowPrizeModal(false);

    // 1. Get server-authoritative outcome
    const outcome = determineSpinOutcome(userId);
    const startAngle = wheelRotation % 360;
    const targetAngle = outcome.targetAngle;
    const duration = 4800; // 4.8 seconds deceleration
    const startTime = performance.now();
    lastSoundTickRef.current = Math.floor(startAngle / 45);

    const animateWheel = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = easeOutQuart(progress);
      const currentAngle = startAngle + (targetAngle - startAngle) * easedProgress;

      // Play soft tick sound when passing slice boundaries
      const currentSliceBoundary = Math.floor(currentAngle / 45);
      if (currentSliceBoundary !== lastSoundTickRef.current) {
        try {
          playNotificationSound('tap');
        } catch {}
        lastSoundTickRef.current = currentSliceBoundary;
      }

      setWheelRotation(currentAngle);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animateWheel);
      } else {
        // Spin finished precisely on winning slice!
        setIsSpinning(false);
        setWonPrize(outcome.prize);
        setShowPrizeModal(true);

        try {
          playNotificationSound('success');
        } catch {}

        // Confetti celebration
        try {
          confetti({
            particleCount: 90,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#007472', '#2AC3BB', '#EE8361', '#FBDFC7', '#FCF6EE'],
          });
        } catch {}

        // Record play & update allowance
        try {
          recordGamePlay(userId, 'spin_wheel', outcome.prize.amount);
          setAllowance(getDailyGameAllowance(userId, 'spin_wheel'));
        } catch {}

        if (outcome.prize.type === 'coins' && onUpdateCoins) {
          onUpdateCoins(outcome.prize.amount);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animateWheel);
  }, [isSpinning, allowance.remainingPlays, userId, wheelRotation, onUpdateCoins]);

  // Claim Prize handler
  const handleClaimPrize = () => {
    setShowPrizeModal(false);
    if (wonPrize && onClaimPrize) {
      onClaimPrize(wonPrize);
    }
  };

  // Render SVG Slice paths
  // Center is (180, 180), Radius = 158
  const cx = 180;
  const cy = 180;
  const radius = 158;

  const renderSlices = () => {
    return SPIN_WHEEL_SEGMENTS.map((prize, k) => {
      // Each slice is 45 degrees
      // Center of slice k is at -(k * 45 + 22.5) degrees relative to top (12 o'clock)
      // When wheel rotates by targetAngle (1800 + k * 45 + 22.5), slice k lands at 12 o'clock
      const startDeg = -(k + 1) * 45;
      const endDeg = -k * 45;
      const midDeg = -(k * 45 + 22.5);

      const rad1 = (startDeg * Math.PI) / 180;
      const rad2 = (endDeg * Math.PI) / 180;

      const x1 = cx + radius * Math.sin(rad1);
      const y1 = cy - radius * Math.cos(rad1);
      const x2 = cx + radius * Math.sin(rad2);
      const y2 = cy - radius * Math.cos(rad2);

      const pathData = `M ${cx},${cy} L ${x1},${y1} A ${radius},${radius} 0 0,1 ${x2},${y2} Z`;
      const color = SLICE_COLORS[k % SLICE_COLORS.length];

      return (
        <g key={k}>
          <path
            d={pathData}
            fill={color.bg}
            stroke="#072424"
            strokeWidth="2.5"
            className="transition-colors"
          />

          {/* Slice text and icon aligned along slice centerline */}
          <g transform={`rotate(${midDeg} ${cx} ${cy})`}>
            {/* Label near outer edge */}
            <text
              x={cx}
              y={cy - radius + 38}
              textAnchor="middle"
              fill={color.text}
              fontSize="12.5"
              fontWeight="bold"
              fontFamily="Cairo, sans-serif"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
            >
              {prize.label}
            </text>

            {/* Small icon indicator */}
            <circle
              cx={cx}
              cy={cy - radius + 14}
              r="4.5"
              fill={color.subtext}
              opacity="0.9"
            />
          </g>
        </g>
      );
    });
  };

  // Render 16 decorative gold/teal rim studs
  const renderRimStuds = () => {
    const studs = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i * 360) / count;
      const rad = (angle * Math.PI) / 180;
      const sx = cx + (radius + 8) * Math.sin(rad);
      const sy = cy - (radius + 8) * Math.cos(rad);
      studs.push(
        <circle
          key={i}
          cx={sx}
          cy={sy}
          r="3"
          fill={i % 2 === 0 ? '#FBDFC7' : '#2AC3BB'}
          stroke="#072424"
          strokeWidth="1"
        />
      );
    }
    return studs;
  };

  return (
    <div
      dir="rtl"
      className={`w-full max-w-lg mx-auto rounded-3xl bg-[#072424] text-[#FCF6EE] border border-[#2AC3BB]/30 shadow-2xl p-5 md:p-7 relative overflow-hidden select-none ${className}`}
    >
      {/* Background ambient luxury glow */}
      <div className="absolute top-0 right-0 w-56 h-56 bg-[#EE8361]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-[#2AC3BB]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative flex items-center justify-between mb-4 pb-3 border-b border-[#2AC3BB]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#007472] border border-[#2AC3BB]/40 flex items-center justify-center text-[#2AC3BB] shadow-inner">
            <Gift className="w-5 h-5 text-[#FBDFC7]" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#FCF6EE]">
              عجلة الحظ اليومية
            </h2>
            <p className="text-xs text-[#2AC3BB]">
              دوّر العجلة يومياً واحصل على مكافآت وجوائز مفاجئة!
            </p>
          </div>
        </div>

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

      {/* Daily allowance status badge */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[#007472]/40 border border-[#2AC3BB]/30 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#FBDFC7]" />
          <span>المحاولات المتبقية لليوم:</span>
        </div>
        <span
          className={`font-bold font-mono px-2.5 py-0.5 rounded-full ${
            allowance.remainingPlays > 0
              ? 'bg-[#2AC3BB]/20 text-[#2AC3BB] border border-[#2AC3BB]/40'
              : 'bg-white/10 text-white/50 border border-white/10'
          }`}
        >
          {allowance.remainingPlays > 0 ? 'متاحة الآن (1)' : 'تم التدوير اليوم (0)'}
        </span>
      </div>

      {/* Interactive Wheel Container */}
      <div className="relative flex flex-col items-center justify-center my-3">
        {/* Top Fixed Indicator Needle */}
        <div className="absolute -top-3 z-20 flex flex-col items-center pointer-events-none filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
          <div className="w-7 h-9 bg-gradient-to-b from-[#EE8361] to-[#D96B49] rounded-t-md clip-needle flex items-center justify-center border border-[#FCF6EE]/40">
            <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
          </div>
          <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[14px] border-t-[#EE8361]" />
        </div>

        {/* SVG Wheel with Outer Luxury Ring */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-84 md:h-84 flex items-center justify-center">
          {/* Wheel Outer Bezel */}
          <div className="absolute inset-0 rounded-full border-4 border-[#2AC3BB]/40 bg-[#004847]/40 shadow-[0_0_30px_rgba(0,116,114,0.3)] pointer-events-none" />

          <svg
            viewBox="0 0 360 360"
            className="w-full h-full transform transition-transform"
            style={{
              transform: `rotate(${wheelRotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            {/* Outer Rim Ring */}
            <circle
              cx={cx}
              cy={cy}
              r={radius + 10}
              fill="#072424"
              stroke="#2AC3BB"
              strokeWidth="4"
            />

            {/* Slices */}
            {renderSlices()}

            {/* Rim decorative studs */}
            {renderRimStuds()}
          </svg>

          {/* Center Spin Button with pulsating Coral glow */}
          <div className="absolute z-10 flex items-center justify-center">
            <button
              onClick={handleSpin}
              disabled={isSpinning || allowance.remainingPlays <= 0}
              className={`w-20 h-20 rounded-full flex flex-col items-center justify-center font-bold text-xs text-[#FCF6EE] transition-all transform active:scale-95 border-3 border-[#FCF6EE] ${
                allowance.remainingPlays <= 0 && !isSpinning
                  ? 'bg-[#004847] opacity-75 cursor-not-allowed shadow-inner'
                  : isSpinning
                  ? 'bg-gradient-to-br from-[#EE8361] to-[#D96B49] brightness-90 cursor-wait shadow-lg'
                  : 'bg-gradient-to-br from-[#EE8361] to-[#D96B49] shadow-[0_0_25px_rgba(238,131,97,0.8)] hover:scale-105 animate-pulse'
              }`}
            >
              <RotateCw
                className={`w-4 h-4 mb-0.5 text-white ${
                  isSpinning ? 'animate-spin' : ''
                }`}
              />
              <span className="font-black text-sm tracking-wide">
                {isSpinning
                  ? 'يدور...'
                  : allowance.remainingPlays <= 0
                  ? 'تم اليوم'
                  : 'تدوير'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Hint / Subtext */}
      <div className="text-center text-xs text-white/60 mt-3 pt-3 border-t border-[#2AC3BB]/15">
        {allowance.remainingPlays > 0 ? (
          <span className="text-[#2AC3BB]">
            اضغط على زر التدوير في المنتصف لتجربة حظك اليوم!
          </span>
        ) : (
          <span>
            لقد استخدمت محاولة التدوير اليومية. موعدنا غداً مع محاولة جديدة! 🌟
          </span>
        )}
      </div>

      {/* Prize Claim Celebration Dialog */}
      {showPrizeModal && wonPrize && (
        <div className="absolute inset-0 z-30 bg-[#072424]/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm rounded-3xl bg-[#007472] border-2 border-[#2AC3BB] p-6 text-center text-[#FCF6EE] shadow-2xl relative overflow-hidden">
            <div className="w-18 h-18 mx-auto mb-3 rounded-2xl bg-[#EE8361]/25 border-2 border-[#EE8361] flex items-center justify-center text-amber-300 shadow-inner">
              {wonPrize.type === 'streak_freeze' ? (
                <Shield className="w-10 h-10 text-[#2AC3BB]" />
              ) : wonPrize.type === 'multiplier' ? (
                <Zap className="w-10 h-10 text-amber-300 fill-amber-300" />
              ) : wonPrize.type === 'mystery' ? (
                <Gift className="w-10 h-10 text-[#FBDFC7]" />
              ) : wonPrize.type === 'xp' ? (
                <Sparkles className="w-10 h-10 text-[#2AC3BB]" />
              ) : (
                <Trophy className="w-10 h-10 fill-amber-300 text-amber-300" />
              )}
            </div>

            <h3 className="text-2xl font-black mb-1">مبروك الجائزة! 🎁</h3>
            <p className="text-xs text-[#FBDFC7] mb-4">
              وقفت العجلة على جائزتك اليومية الرائعة:
            </p>

            <div className="p-4 rounded-2xl bg-[#072424]/70 border border-[#2AC3BB]/40 mb-5">
              <div className="text-2xl font-black text-[#FBDFC7] font-mono mb-1">
                {wonPrize.label}
              </div>
              <div className="text-xs text-[#2AC3BB]">
                {wonPrize.description || 'مكافأة فورية مضافة إلى حسابك'}
              </div>
            </div>

            <button
              onClick={handleClaimPrize}
              className="w-full py-3.5 rounded-2xl bg-[#EE8361] text-[#FCF6EE] font-bold text-base hover:brightness-110 active:scale-95 transition shadow-lg"
            >
              استلام الجائزة 🎉
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
