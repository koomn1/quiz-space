import React, { useEffect, useRef, useState, useCallback } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  lang: 'ar' | 'en';
  userName?: string;
  isGuest?: boolean;
}

export default function SplashScreen({ onComplete, lang, userName, isGuest = false }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  // isBuffering = true while video hasn't loaded yet (shows black screen)
  // false once video can play (black screen fades out)
  const [isBuffering, setIsBuffering] = useState(true);
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
    if (!videoEl) {
      // No video element — just finish after a short delay
      const t = setTimeout(finish, 2000);
      return () => clearTimeout(t);
    }

    // ── Progress tracking via timeupdate ────────────────────────────────
    const handleTimeUpdate = () => {
      if (!videoEl.duration || completedRef.current) return;
      const pct = Math.min(99, Math.round((videoEl.currentTime / videoEl.duration) * 100));
      setProgress(pct);
    };

    // ── Video ready — hide the black buffering screen ───────────────────
    const handleCanPlay = () => {
      setIsBuffering(false);
      // Start playing (autoplay may not have fired yet on slow connections)
      videoEl.play().catch(() => {});
    };

    // ── Video ended — call onComplete ───────────────────────────────────
    const handleEnded = () => {
      finish();
    };

    // ── Hard fallback: if video never loads within 3 s, skip it ─────────
    const fallback = setTimeout(() => {
      if (!completedRef.current) {
        setIsBuffering(false);
        finish();
      }
    }, 10000);

    // If the video is already buffered (served from Service Worker cache)
    if (videoEl.readyState >= 3) {
      setIsBuffering(false);
    }

    videoEl.addEventListener('canplay', handleCanPlay);
    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    videoEl.addEventListener('ended', handleEnded);

    return () => {
      clearTimeout(fallback);
      videoEl.removeEventListener('canplay', handleCanPlay);
      videoEl.removeEventListener('timeupdate', handleTimeUpdate);
      videoEl.removeEventListener('ended', handleEnded);
    };
  }, [finish]);

  const isAr = lang === 'ar';

  // Greeting text
  let greetingText = '';
  if (userName && userName.trim() && !isGuest && userName !== 'طالب زائر' && userName !== 'Guest Student') {
    greetingText = isAr ? `أهلاً بك مجدداً، ${userName} ✨` : `Welcome back, ${userName} ✨`;
  } else {
    greetingText = isAr ? 'مرحباً بك في فضاء الاختبارات الذكية 🚀' : 'Welcome to your premium academic space 🚀';
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">

      {/* ── Black buffering overlay — shown ONLY while video is loading ── */}
      {isBuffering && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#05060f]"
          style={{ transition: 'opacity 0.4s ease' }}
        >
          {/* Minimal loading ring */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: '3px solid rgba(139,92,246,0.15)',
            borderTopColor: '#8b5cf6',
            animation: 'spin 0.9s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{
            marginTop: 16,
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'rgba(139,92,246,0.7)',
            fontFamily: 'monospace'
          }}>
            {isAr ? 'جارٍ التحضير...' : 'LOADING...'}
          </p>
        </div>
      )}

      {/* ── Splash video — plays once, no loop ─────────────────────────── */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: isBuffering ? 0 : 1, transition: 'opacity 0.5s ease' }}
      >
        <source src={`${import.meta.env.BASE_URL}videos/splash-mobile.mp4`} media="(max-width: 767px)" type="video/mp4" />
        <source src={`${import.meta.env.BASE_URL}videos/splash-desktop.mp4`} media="(min-width: 768px)" type="video/mp4" />
        <source src={`${import.meta.env.BASE_URL}videos/splash-intro.mp4`} type="video/mp4" />
      </video>

      {/* Overlay tint */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none z-10" />

      {/* ── Bottom content (progress bar + greeting) ────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-end h-full w-full max-w-lg px-6 pb-16 text-center space-y-8">
        <div className="space-y-4">
          <p className="text-sm md:text-base font-medium text-white leading-relaxed max-w-sm drop-shadow-lg">
            {greetingText}
          </p>
        </div>

        {!isBuffering && (
          <div className="w-48 space-y-2">
            <div className="h-0.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                style={{ width: `${progress}%`, transition: 'width 0.15s linear' }}
              />
            </div>
            <span className="text-[10px] font-mono tracking-widest text-indigo-300/90 block drop-shadow">
              {isAr ? `تأمين الحماية والاتصال... ${progress}%` : `SECURING SYNCHRONY... ${progress}%`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

