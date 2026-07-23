import React, { useEffect, useState } from 'react';
import { MainLogo } from './MainLogo';

interface SplashScreenProps {
  onComplete: () => void;
  lang: 'ar' | 'en';
  userName?: string;
  isGuest?: boolean;
}

export default function SplashScreen({ onComplete, lang, userName, isGuest = false }: SplashScreenProps) {
  const [showProgress, setShowProgress] = useState(0);

  useEffect(() => {
    // Elegant progression bar counter
    const interval = setInterval(() => {
      setShowProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 80);

    // Complete loader after a premium 2-second experience
    const timeout = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onComplete]);

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
      {/* Dynamic stellar backing elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse pointer-events-none" />

      {/* Synchronized staggered animations wrapper */}
      <div className="relative z-10 flex flex-col items-center justify-center max-w-lg px-6 text-center space-y-8">
        
        {/* Animated unified premium logo */}
        <div
          
          
          
          className="flex flex-col items-center justify-center space-y-4"
        >
          <MainLogo size="lg" className="flex-col !gap-4" />
        </div>

        {/* Customized welcome messages */}
        <div className="space-y-4">
          <p
            
            
            
            className="text-sm md:text-base font-medium text-slate-300/90 leading-relaxed max-w-sm"
          >
            {greetingText}
          </p>
        </div>

        {/* High-end Minimalistic Progression Engine */}
        <div
          
          
          
          className="w-48 space-y-2 pt-4"
        >
          <div className="h-0.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
              
              />
          </div>
          <span className="text-[10px] font-mono tracking-widest text-indigo-400/70 block">
            {isAr ? `تأمين الحماية والاتصال... ${showProgress}%` : `SECURING SYNCHRONY... ${showProgress}%`}
          </span>
        </div>
      </div>
    </div>
  );
}
