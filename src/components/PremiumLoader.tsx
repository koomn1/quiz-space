import React from 'react';

export const PremiumLoader = ({ text = 'Loading...' }: { text?: string }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-8 w-full">
      <div className="relative w-20 h-20 perspective-1000">
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-violet-500 opacity-30 blur-xl animate-pulse"
        />
        
        {/* Core Circular Engine */}
        <div className="w-full h-full relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-primary border-b-violet-500/30 border-l-violet-500/30 backdrop-blur-md animate-spin" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-3 rounded-full border-2 border-l-primary border-t-violet-500 border-r-transparent border-b-transparent animate-spin" style={{ animationDuration: '2.5s', animationDirection: 'reverse' }} />
          <div className="absolute inset-5 rounded-full bg-violet-600/20 border border-primary/50 shadow-[0_0_15px_rgba(124,58,237,0.5)] animate-pulse" />
        </div>
      </div>
      <p 
        className="text-sm text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-500 animate-pulse"
      >
        {text}
      </p>
    </div>
  );
};

export const SmartSkeleton = ({ className = "" }: { className?: string }) => (
  <div 
    className={`bg-slate-200/50 dark:bg-slate-800/50 rounded-[24px] overflow-hidden relative ${className}`}
  >
    <div
      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
    />
  </div>
);
