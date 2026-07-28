import React from 'react';
import { Orbit } from 'lucide-react';

export const QuizSpaceLogo = ({ className = '', size = 'md' }: { className?: string, size?: 'sm' | 'md' | 'lg' | 'hero' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    hero: 'w-32 h-32 md:w-40 md:h-40'
  };

  return (
    <div className={`relative flex items-center justify-center ${sizeMap[size]} ${className}`}>
      {/* Premium ambient backdrop glow */}
      <div
        className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/25 blur-lg opacity-80"
        
        
      />

      {/* Main outer premium crescent geometry */}
      <div className="relative w-full h-full flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-[#0c0f1a] dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 border border-slate-200/20 dark:border-slate-700/30 p-2 shadow-2xl">
        {/* Animated accent orbit ring */}
        <div
          className="absolute inset-1 rounded-xl border border-indigo-500/30 border-dashed"
          
          
        />

        {/* Elegant typography element and centered icon */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <div
            
            
            className="text-indigo-400 dark:text-indigo-300"
          >
            <Orbit className={`${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-16 h-16'} stroke-[1.5]`} />
          </div>
          {size !== 'sm' && (
            <span className={`font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 select-none ${size === 'md' ? 'text-[8px]' : size === 'lg' ? 'text-[11px]' : 'text-base pt-2'}`}>
              Q S P A C E
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

