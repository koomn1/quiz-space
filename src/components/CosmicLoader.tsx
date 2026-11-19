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
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/15 bg-white/90 dark:bg-[#07171d]/90 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl shadow-primary/10">
        {/* Ambient subtle glow behind */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#007472]/15 dark:bg-[#2AC3BB]/15 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-[#EE8361]/15 blur-2xl pointer-events-none" />

        {/* Shimmering translucent skeleton bars */}
        <div className="space-y-3.5 relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="h-5 w-2/5 rounded-xl bg-slate-200/90 dark:bg-white/20 animate-pulse" />
            <div className="h-4 w-16 rounded-lg bg-slate-200/80 dark:bg-white/15 animate-pulse" />
          </div>

          <div className="h-3.5 w-4/5 rounded-lg bg-slate-200/70 dark:bg-white/12 animate-pulse" />

          {/* Translucent placeholder rows */}
          <div className="grid gap-2 pt-2">
            <div className="h-11 w-full rounded-2xl bg-slate-100/90 dark:bg-white/[0.08] animate-pulse border border-slate-200/90 dark:border-white/15" />
            <div className="h-11 w-full rounded-2xl bg-slate-100/80 dark:bg-white/[0.06] animate-pulse border border-slate-200/80 dark:border-white/12" />
            {size !== 'sm' && (
              <div className="h-11 w-full rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] animate-pulse border border-slate-200/70 dark:border-white/10" />
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className="flex items-center justify-center gap-2.5 text-center">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EE8361] shadow-[0_0_12px_rgba(238,131,97,0.8)] animate-ping" />
          <p className="text-xs font-black text-slate-800 dark:text-[#FCF6EE] animate-pulse drop-shadow-sm">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}

