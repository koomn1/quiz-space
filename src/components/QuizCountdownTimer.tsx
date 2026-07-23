import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface QuizCountdownTimerProps {
  timeLeft: number;
  totalTime: number;
  lang?: 'ar' | 'en';
}

export default function QuizCountdownTimer({
  timeLeft,
  totalTime,
  lang = 'ar'
}: QuizCountdownTimerProps) {
  const isAr = lang === 'ar';
  
  // Guard against invalid inputs
  const maxTime = totalTime > 0 ? totalTime : 1;
  const ratio = Math.max(0, Math.min(1, timeLeft / maxTime));
  
  // SVG circular properties
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ratio);

  // Formatting minutes and seconds
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Decide colors based on urgency
  const isUrgent = timeLeft <= 15;
  const isWarning = timeLeft > 15 && timeLeft <= 45;

  let trackColor = 'text-emerald-500 dark:text-emerald-400';
  let badgeBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-55/35';
  
  if (isUrgent) {
    trackColor = 'text-rose-500 dark:text-rose-400';
    badgeBg = 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse';
  } else if (isWarning) {
    trackColor = 'text-amber-500 dark:text-amber-400';
    badgeBg = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
  }

  return (
    <div 
      className={`flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 ${badgeBg}`}
      style={{ direction: isAr ? 'rtl' : 'ltr' }}
    >
      {/* Animated SVG Circle Loader */}
      <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
        <svg className="w-full h-full transform -rotate-90">
          {/* Static gray track */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            className="text-slate-200 dark:text-slate-800"
            strokeWidth="3.5"
            stroke="currentColor"
            fill="transparent"
          />
          {/* Dynamic timer progress circle */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            className={trackColor}
            strokeWidth="3.5"
            stroke="currentColor"
            fill="transparent"
            strokeDasharray={circumference}
            
            
          />
        </svg>
        {/* Centered Icon depending on urgency */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isUrgent ? (
            <AlertCircle className="w-5 h-5 text-rose-500 animate-bounce" />
          ) : (
            <Clock className={`w-5 h-5 ${isWarning ? 'text-amber-500' : 'text-emerald-500'}`} />
          )}
        </div>
      </div>

      {/* Countdown details text */}
      <div className="space-y-0.5 text-right font-sans">
        <span className="text-[10px] text-slate-400 block font-semibold leading-none">
          {isAr ? 'الوقت المتبقي لإنهاء الاختبار:' : 'Time Left to Finish Quiz:'}
        </span>
        <div className="flex items-baseline gap-1">
          <span className={`font-mono text-xl font-black tracking-tight leading-none ${isUrgent ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-slate-800 dark:text-slate-100'}`}>
            {formattedTime}
          </span>
          <span className="text-[9px] text-slate-400 dark:text-slate-500">
            {isAr ? 'د:ث' : 'm:s'}
          </span>
        </div>
        
        {isUrgent && (
          <span className="text-[9px] text-rose-500 font-extrabold block animate-pulse">
            {isAr ? '⏳ أسرع! الوقت ينفد بسرعة!' : '⏳ Hurry up! Time is running out!'}
          </span>
        )}
      </div>
    </div>
  );
}
