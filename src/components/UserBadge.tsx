import React from 'react';
import { Shield, Sparkles, Gem, Crown, CheckCircle } from 'lucide-react';

export type SubscriptionTier = 'free' | 'pro' | 'premium' | 'team' | 'enterprise' | 'lifetime' | 'founder';

interface UserBadgeProps {
  tier: SubscriptionTier;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  showLabel?: boolean;
}

export function UserBadge({ tier, className = '', size = 'md', showTooltip = true, showLabel = false }: UserBadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const iconSize = sizeClasses[size];

  if (tier === 'free') {
    return (
      <div className={`relative group inline-flex items-center justify-center ${className}`}>
        <div className={`rounded-full border-[1.5px] border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${iconSize}`}>
          <div className="w-[40%] h-[40%] rounded-full bg-slate-400 dark:bg-slate-500" />
        </div>
        {showTooltip && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Free User
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
          </div>
        )}
      </div>
    );
  }

  if (tier === 'pro') {
    return (
      <div className={`relative group inline-flex items-center justify-center badge-float ${className}`}>
        <div className={`relative rounded-full flex items-center justify-center ${iconSize}`}>
          {/* Soft glow */}
          <div className="absolute inset-0 bg-violet-500/30 rounded-full blur-[4px]" />
          <CheckCircle className="w-full h-full text-violet-500 fill-white dark:fill-slate-900 relative z-10 drop-shadow-sm" />
        </div>
        {showTooltip && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-violet-600 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg shadow-violet-500/20">
            Pro User
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-violet-600" />
          </div>
        )}
      </div>
    );
  }

  if (tier === 'premium') {
    return (
      <div className={`relative group inline-flex items-center justify-center badge-sweep ${className}`}>
        <div className={`relative rounded-xl overflow-hidden glass-card border border-white/40 dark:border-white/10 shadow-[0_2px_10px_rgba(139,92,246,0.3)] bg-gradient-to-br from-violet-400/80 to-blue-500/80 dark:from-violet-500/60 dark:to-blue-600/60 flex items-center justify-center ${iconSize}`}>
          <Sparkles className="w-[60%] h-[60%] text-white drop-shadow-md z-10" />
        </div>
        {showTooltip && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg shadow-indigo-500/30">
            Premium Member
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-blue-600" />
          </div>
        )}
      </div>
    );
  }

  if (tier === 'team') {
    return (
      <div className={`relative group inline-flex items-center justify-center badge-pulse ${className}`}>
        {/* Floating particles */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-1 h-1 bg-cyan-400 rounded-full badge-particle" />
          <div className="absolute bottom-0 left-0 w-1 h-1 bg-blue-400 rounded-full badge-particle" />
          <div className="absolute shadow-[0_0_8px_rgba(6,182,212,0.8)] top-1/2 left-1/2 w-0.5 h-0.5 bg-white rounded-full badge-particle" />
        </div>
        
        <div className={`relative rounded-lg rotate-45 overflow-hidden glass-panel border border-cyan-300/60 dark:border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.4)] bg-gradient-to-br from-cyan-400/90 to-blue-600/90 flex items-center justify-center z-10 ${iconSize}`}>
          <div className="absolute inset-0 bg-white/20 dark:bg-white/10" style={{ transform: 'translateY(-50%) rotate(-45deg)' }} />
          <Gem className="w-[60%] h-[60%] text-white drop-shadow-lg -rotate-45" />
        </div>
        
        {showTooltip && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg shadow-cyan-500/30">
            Team User
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-cyan-600" />
          </div>
        )}
      </div>
    );
  }

  if (tier === 'enterprise') {
    return (
      <div className={`relative group inline-flex items-center justify-center ${className}`}>
        {/* Animated border ring */}
        <div className="absolute inset-[-4px] rounded-full bg-gradient-to-tr from-amber-200 via-amber-500 to-amber-700 opacity-70 animate-[spin_4s_linear_infinite]" />
        <div className="absolute inset-[-4px] rounded-full bg-gradient-to-bl from-yellow-200 via-yellow-500 to-yellow-800 opacity-70 animate-[spin_4s_linear_infinite_reverse]" />
        
        <div className={`relative rounded-full bg-slate-900 border border-amber-300/50 flex items-center justify-center z-10 ${iconSize}`}>
           <div className="absolute inset-0 rounded-full bg-gradient-to-b from-amber-400/20 to-transparent pointer-events-none" />
           <Crown className="w-[60%] h-[60%] text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" strokeWidth={2.5} />
        </div>

        {showTooltip && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-gradient-to-r from-amber-700 to-yellow-600 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg shadow-amber-500/30">
            Enterprise Class
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-600" />
          </div>
        )}
      </div>
    );
  }

  if (tier === 'lifetime') {
    return (
      <div className={`relative group inline-flex items-center justify-center ${className}`}>
        <div className={`relative rounded-lg overflow-hidden border border-yellow-300/60 shadow-[0_0_20px_rgba(250,204,21,0.5)] bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-600 flex items-center justify-center z-10 badge-gold-shine ${iconSize}`}>
          <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />
          <Shield className="w-[65%] h-[65%] text-white drop-shadow-md z-10" />
        </div>
        
        {showTooltip && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg shadow-yellow-500/40">
            Lifetime Premium
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-500" />
          </div>
        )}
      </div>
    );
  }

  if (tier === 'founder') {
    return (
      <div className={`relative group inline-flex items-center justify-center badge-float ${className}`}>
        {/* Animated rainbow glow */}
        <div className="absolute inset-[-6px] rounded-full bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-indigo-500 via-purple-500 to-pink-500 opacity-80 animate-[spin_3s_linear_infinite]" style={{ filter: 'blur(8px)' }} />
        
        <div className={`relative rounded-full glass-card border border-white/50 flex items-center justify-center z-10 ${iconSize}`} style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)' }}>
           <Crown className="w-[70%] h-[70%] text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" strokeWidth={2.5} />
        </div>

        {showTooltip && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-indigo-500 via-purple-500 to-pink-500 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg shadow-purple-500/40">
            Founder
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-purple-500" />
          </div>
        )}
      </div>
    );
  }

  return null;
}
