import React from 'react';

interface CosmicLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string | null;
}

export default function CosmicLoader({ size = 'md', message = 'Loading...' }: CosmicLoaderProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full">
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-violet-500 opacity-30 blur-xl animate-pulse" />
        
        {/* Core Circular Engine */}
        <div className="w-full h-full relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-primary border-b-violet-500/30 border-l-violet-500/30 backdrop-blur-md animate-spin" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-2 rounded-full border-2 border-l-primary border-t-violet-500 border-r-transparent border-b-transparent animate-spin" style={{ animationDuration: '2.5s', animationDirection: 'reverse' }} />
          <div className="absolute inset-4 rounded-full bg-violet-600/20 border border-primary/50 shadow-[0_0_15px_rgba(124,58,237,0.5)] animate-pulse" />
        </div>
      </div>
      
      {message && (
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-500 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
