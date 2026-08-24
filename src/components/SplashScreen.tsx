import React, { useEffect, useRef, useState, useCallback } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  lang: 'ar' | 'en';
  userName?: string;
  isGuest?: boolean;
}

const EDUCATIONAL_TIPS = {
  ar: [
    "هل تعلم؟ الـ AI في Quiz Space يساعدك على استخراج الأسئلة بدقة lossless.",
    "نصيحة: يمكنك تقسيم الـ PDF الكبير لزيادة دقة استخراج الأسئلة.",
    "معلومة: Quiz Space يدعم ملفات Word و Excel و PowerPoint أيضاً.",
    "نصيحة: استخدم وضع الـ 'Literal' إذا كنت تريد استخراج الأسئلة كما هي بالضبط.",
    "هل تعلم؟ يمكنك متابعة أداء الـ AI من لوحة تحكم الأدمن."
  ],
  en: [
    "Did you know? Quiz Space AI uses lossless extraction for maximum accuracy.",
    "Tip: Splitting large PDFs into chunks improves extraction quality.",
    "Fact: Quiz Space also supports Word, Excel, and PowerPoint files.",
    "Tip: Use 'Literal' mode if you want to extract questions exactly as written.",
    "Did you know? You can monitor AI performance in the Admin Dashboard."
  ]
};

export default function SplashScreen({ onComplete, lang, userName, isGuest = false }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showSkip, setShowSkip] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
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
    
    // Rotate tips every 3 seconds
    const tipInterval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % EDUCATIONAL_TIPS[lang].length);
    }, 3500);

    // Show skip button after 2 seconds
    const skipTimer = setTimeout(() => setShowSkip(true), 2000);

    if (!videoEl) {
      const t = setTimeout(finish, 2000);
      return () => {
        clearTimeout(t);
        clearTimeout(skipTimer);
        clearInterval(tipInterval);
      };
    }

    const handleTimeUpdate = () => {
      if (!videoEl.duration || completedRef.current) return;
      const pct = Math.min(99, Math.round((videoEl.currentTime / videoEl.duration) * 100));
      setProgress(pct);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
      videoEl.play().catch(() => {});
    };

    const handleEnded = () => {
      finish();
    };

    const fallback = setTimeout(() => {
      if (!completedRef.current) {
        setIsBuffering(false);
        finish();
      }
    }, 8000);

    if (videoEl.readyState >= 3) {
      setIsBuffering(false);
    }

    videoEl.addEventListener('canplay', handleCanPlay);
    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    videoEl.addEventListener('ended', handleEnded);

    return () => {
      clearTimeout(fallback);
      clearTimeout(skipTimer);
      clearInterval(tipInterval);
      videoEl.removeEventListener('canplay', handleCanPlay);
      videoEl.removeEventListener('timeupdate', handleTimeUpdate);
      videoEl.removeEventListener('ended', handleEnded);
    };
  }, [finish, lang]);

  const isAr = lang === 'ar';

  let greetingText = '';
  if (userName && userName.trim() && !isGuest && userName !== 'طالب متميز' && userName !== 'طالب زائر' && userName !== 'Guest Student') {
    greetingText = isAr ? `أهلاً بك مجدداً، ${userName} ✨` : `Welcome back, ${userName} ✨`;
  } else {
    greetingText = isAr ? 'مرحباً بك في فضاء الاختبارات الذكية 🚀' : 'Welcome to your premium academic space 🚀';
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#05060f]">
      
      {/* Skip Button */}
      {showSkip && (
        <button 
          onClick={finish}
          className="absolute top-8 right-8 z-[110] inline-flex min-h-11 min-w-11 items-center justify-center px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white/70 text-xs font-bold transition-all hover:scale-105 active:scale-95"
        >
          {isAr ? 'تخطي' : 'SKIP'}
        </button>
      )}

      {/* Buffering Overlay */}
      {isBuffering && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#05060f]">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 blur-xl animate-pulse" />
            </div>
          </div>
          <p className="mt-6 text-[10px] tracking-[0.3em] text-indigo-400/60 font-mono uppercase">
            {isAr ? 'جاري التحميل' : 'INITIALIZING'}
          </p>
        </div>
      )}

      {/* Video Content */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: isBuffering ? 0 : 1, transition: 'opacity 0.8s ease' }}
      >
        <source src={`${import.meta.env.BASE_URL}videos/splash-mobile.mp4`} media="(max-width: 767px)" type="video/mp4" />
        <source src={`${import.meta.env.BASE_URL}videos/splash-desktop.mp4`} media="(min-width: 768px)" type="video/mp4" />
        <source src={`${import.meta.env.BASE_URL}videos/splash-intro.mp4`} type="video/mp4" />
      </video>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#05060f] z-10 pointer-events-none" />

      {/* Bottom Content Area */}
      <div className="relative z-10 flex flex-col items-center justify-end h-full w-full max-w-2xl px-8 pb-20 text-center space-y-10">
        
        {/* Greeting & Tip */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h2 className="text-lg md:text-xl font-black text-white drop-shadow-2xl">
            {greetingText}
          </h2>
          <p className="text-xs md:text-sm text-indigo-200/70 font-medium italic max-w-md mx-auto transition-all duration-500">
            {EDUCATIONAL_TIPS[lang][tipIndex]}
          </p>
        </div>

        {/* Progress & Loading State */}
        {!isBuffering && (
          <div className="w-full max-w-xs space-y-4">
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                style={{ width: `${progress}%`, transition: 'width 0.2s linear' }}
              />
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="text-[9px] font-mono tracking-tighter text-indigo-400/80 uppercase">
                {isAr ? 'مزامنة البيانات...' : 'SYNCING CORE...'}
              </span>
              <span className="text-[10px] font-mono text-white/40">
                {progress}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-in { animation-fill-mode: forwards; }
      `}</style>
    </div>
  );
}
