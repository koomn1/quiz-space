import React from 'react';

interface CosmicLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string | null;
}

export default function CosmicLoader({ size = 'md', message = 'Loading...' }: CosmicLoaderProps) {
  const containerWidth = size === 'sm' ? 'max-w-xs' : size === 'lg' ? 'max-w-xl' : 'max-w-md';

  return (
    <div className={`w-full ${containerWidth} mx-auto p-4 sm:p-6 space-y-4 animate-fade-in`}>
      {/* Translucent glass shimmer card simulating content loading in place */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-800/60 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl p-5 sm:p-6 shadow-sm">
        {/* Ambient subtle glow behind */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />

        {/* Shimmering translucent skeleton bars */}
        <div className="space-y-3.5 relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="h-5 w-2/5 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
            <div className="h-4 w-16 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
          </div>

          <div className="h-3.5 w-4/5 rounded-lg bg-slate-200/40 dark:bg-slate-800/40 animate-pulse" />

          {/* Translucent placeholder rows */}
          <div className="grid gap-2 pt-2">
            <div className="h-11 w-full rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse border border-slate-200/40 dark:border-slate-700/30" />
            <div className="h-11 w-full rounded-2xl bg-slate-200/40 dark:bg-slate-800/40 animate-pulse border border-slate-200/30 dark:border-slate-700/20" />
            {size !== 'sm' && (
              <div className="h-11 w-full rounded-2xl bg-slate-200/30 dark:bg-slate-800/30 animate-pulse border border-slate-200/20 dark:border-slate-700/10" />
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className="flex items-center justify-center gap-2 text-center">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}

