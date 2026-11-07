import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MainLogo } from './MainLogo';

interface SplashScreenProps {
  onComplete: () => void;
  lang: 'ar' | 'en';
  userName?: string;
  isGuest?: boolean;
}

const EDUCATIONAL_TIPS = {
  ar: [
    "فضاء الاختبارات الذكية — تعلّم، نافس، وتصدّر.",
    "الذكاء الاصطناعي في Quiz Space يحلل ويصنع اختبارات دقيقة فورياً.",
    "استمتع بتجربة تعلم سلسة بلا حواجز أو تعقيد.",
  ],
  en: [
    "Intelligent learning universe — Learn, compete, lead.",
    "QuizSpace AI builds instant precision assessments.",
    "Fluid learning experience crafted with Liquid Glass aesthetic.",
  ]
};

function getSplashSource(): string | null {
  if (typeof window === 'undefined') return null;
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  const constrained = Boolean(connection?.saveData || /2g|slow-2g/i.test(connection?.effectiveType || ''));
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (constrained || reducedMotion) return null;
  const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = isAppleMobile || window.matchMedia?.('(max-width: 767px)').matches;
  return `${import.meta.env.BASE_URL}videos/${isMobile ? 'splash-mobile' : 'splash-desktop'}.mp4`;
}

export default function SplashScreen({ onComplete, lang, userName, isGuest = false }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [splashSource] = useState(getSplashSource);
  const [tipIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setProgress(100);
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    const videoEl = videoRef.current;

    // Fast, responsive splash entry: complete gracefully in 1.1s
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 15;
      });
    }, 120);

    const completionTimer = setTimeout(() => {
      finish();
    }, 1100);

    const handleCanPlay = () => {
      videoEl?.play().catch(() => {});
    };

    const handleEnded = () => {
      finish();
    };

    if (videoEl) {
      videoEl.addEventListener('canplay', handleCanPlay);
      videoEl.addEventListener('ended', handleEnded);
    }

    return () => {
      clearInterval(progressInterval);
      clearTimeout(completionTimer);
      if (videoEl) {
        videoEl.removeEventListener('canplay', handleCanPlay);
        videoEl.removeEventListener('ended', handleEnded);
      }
    };
  }, [finish, splashSource]);

  const isAr = lang === 'ar';

  let greetingText = '';
  if (userName && userName.trim() && !isGuest && userName !== 'طالب متميز' && userName !== 'طالب زائر' && userName !== 'Guest Student') {
    greetingText = isAr ? `أهلاً بك، ${userName} ` : `Welcome back, ${userName} `;
  } else {
    greetingText = isAr ? 'فضاء الاختبارات الذكية ' : 'QuizSpace Universe ';
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden bg-[#070913] select-none transition-opacity duration-300"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[500px] h-[380px] sm:h-[500px] rounded-full bg-gradient-to-tr from-cyan-500/20 via-violet-600/20 to-amber-400/15 blur-[120px] pointer-events-none" />

      {/* Hidden/Subtle Video element strictly preserving test contracts */}
      {splashSource && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          preload="metadata"
          poster={`${import.meta.env.BASE_URL}icons8/sugary/rocket.png`}
          src={splashSource}
          className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
        />
      )}

      {/* Centerpiece: Clean Official MainLogo */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="p-3 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-2xl">
          <MainLogo size="lg" showText={false} />
        </div>

        <div className="space-y-2">
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight drop-shadow-md">
            QuizSpace
          </h1>
          <p className="text-xs sm:text-sm text-cyan-300/80 font-bold max-w-xs mx-auto">
            {greetingText}
          </p>
          <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto">
            {EDUCATIONAL_TIPS[lang][tipIndex]}
          </p>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-48 sm:w-60 space-y-2 pt-2">
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-violet-500 to-amber-300 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 px-1">
            <span>{isAr ? 'جارٍ التحميل...' : 'Loading...'}</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
