import React, { useEffect, useRef, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  lang: 'ar' | 'en';
  userName?: string;
  isGuest?: boolean;
}

// Duration of the splash in ms — matches the video duration closely
const SPLASH_DURATION_MS = 2000;

export default function SplashScreen({ onComplete, lang, userName, isGuest = false }: SplashScreenProps) {
  const [showProgress, setShowProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    let raf: number;
    let startTime: number | null = null;
    let completed = false;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.round((elapsed / SPLASH_DURATION_MS) * 100));
      setShowProgress(pct);

      if (!completed) {
        if (pct >= 100) {
          completed = true;
          onCompleteRef.current();
        } else {
          raf = requestAnimationFrame(tick);
        }
      }
    };

    // Try to sync with actual video playback time
    const videoEl = videoRef.current;
    let useVideo = false;
    let syncInterval: ReturnType<typeof setInterval> | null = null;

    const startSync = () => {
      if (!videoEl || videoEl.duration <= 0 || completed) {
        // Fallback: RAF-based timer
        raf = requestAnimationFrame(tick);
        return;
      }
      useVideo = true;
      const videoDuration = Math.max(videoEl.duration * 1000, SPLASH_DURATION_MS);
      syncInterval = setInterval(() => {
        if (!videoEl || completed) { clearInterval(syncInterval!); return; }
        const pct = Math.min(100, Math.round(((videoEl.currentTime * 1000) / videoDuration) * 100));
        setShowProgress(pct);
        if (pct >= 100) {
          completed = true;
          clearInterval(syncInterval!);
          onCompleteRef.current();
        }
      }, 50);
    };

    // Hard fallback timeout regardless
    const fallbackTimeout = setTimeout(() => {
      if (!completed) {
        completed = true;
        if (syncInterval) clearInterval(syncInterval);
        cancelAnimationFrame(raf);
        setShowProgress(100);
        onCompleteRef.current();
      }
    }, SPLASH_DURATION_MS + 500);

    if (videoEl && videoEl.readyState >= 1) {
      startSync();
    } else if (videoEl) {
      videoEl.addEventListener('loadedmetadata', startSync, { once: true });
      // If metadata never arrives (e.g. network blocked), use RAF fallback
      const metaTimeout = setTimeout(() => { if (!useVideo) raf = requestAnimationFrame(tick); }, 300);
      return () => {
        clearTimeout(metaTimeout);
        clearTimeout(fallbackTimeout);
        if (syncInterval) clearInterval(syncInterval);
        cancelAnimationFrame(raf);
        videoEl.removeEventListener('loadedmetadata', startSync);
      };
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      clearTimeout(fallbackTimeout);
      if (syncInterval) clearInterval(syncInterval);
      cancelAnimationFrame(raf);
    };
  }, []);

  const isAr = lang === 'ar';

  // Determine dynamic greeting text based on user session status
  let greetingText = '';
  if (userName && userName.trim() && !isGuest && userName !== 'طالب زائر' && userName !== 'Guest Student') {
    greetingText = isAr 
      ? `أهلاً بك مجدداً، ${userName} ✨` 
      : `Welcome back, ${userName} ✨`;
  } else {
    greetingText = isAr 
      ? 'مرحباً بك في فضاء الاختبارات الذكية 🚀' 
      : 'Welcome to your premium academic space 🚀';
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05060f] text-slate-100 overflow-hidden"
    >
      {/* Animated intro video — preload=auto so browsers cache it after first
          download. object-cover centres the 16:9 clip on any viewport. */}
      {/* Responsive intro videos (mobile & desktop) with automatic fallback */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={`${import.meta.env.BASE_URL}videos/splash-mobile.mp4`} media="(max-width: 767px)" type="video/mp4" />
        <source src={`${import.meta.env.BASE_URL}videos/splash-desktop.mp4`} media="(min-width: 768px)" type="video/mp4" />
        <source src={`${import.meta.env.BASE_URL}videos/splash-intro.mp4`} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* Content anchored to the bottom — centred horizontally */}
      <div className="relative z-10 flex flex-col items-center justify-end h-full w-full max-w-lg px-6 pb-16 text-center space-y-8">

        {/* Customized welcome messages */}
        <div className="space-y-4">
          <p
            className="text-sm md:text-base font-medium text-white leading-relaxed max-w-sm drop-shadow-lg"
          >
            {greetingText}
          </p>
        </div>

        {/* High-end Minimalistic Progression Engine — synced to video */}
        <div className="w-48 space-y-2">
          <div className="h-0.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-none"
              style={{ width: `${showProgress}%` }}
            />
          </div>
          <span className="text-[10px] font-mono tracking-widest text-indigo-300/90 block drop-shadow">
            {isAr ? `تأمين الحماية والاتصال... ${showProgress}%` : `SECURING SYNCHRONY... ${showProgress}%`}
          </span>
        </div>
      </div>
    </div>
  );
}
