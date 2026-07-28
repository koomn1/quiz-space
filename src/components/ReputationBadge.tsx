import React from 'react';

export type ReputationType = 
  | 'quiz_master'
  | 'trending_creator'
  | 'early_adopter'
  | 'premium_member'
  | 'top_creator'
  | 'thousand_correct'
  | 'verified_educator';

interface ReputationBadgeProps {
  type: ReputationType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const badgeConfig: Record<ReputationType, { icon: string, label: string, color: string, bg: string, border: string }> = {
  quiz_master: {
    icon: '🏆',
    label: 'Quiz Master',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    border: 'border-amber-200 dark:border-amber-500/30'
  },
  trending_creator: {
    icon: '🔥',
    label: 'Trending Creator',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10 dark:bg-orange-500/20',
    border: 'border-orange-200 dark:border-orange-500/30'
  },
  early_adopter: {
    icon: '🚀',
    label: 'Early Adopter',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    border: 'border-blue-200 dark:border-blue-500/30'
  },
  premium_member: {
    icon: '💎',
    label: 'Premium Member',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    border: 'border-cyan-200 dark:border-cyan-500/30'
  },
  top_creator: {
    icon: '👑',
    label: 'Top Creator',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10 dark:bg-yellow-500/20',
    border: 'border-yellow-200 dark:border-yellow-500/30'
  },
  thousand_correct: {
    icon: '🎯',
    label: '1000 Correct Answers',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    border: 'border-emerald-200 dark:border-emerald-500/30'
  },
  verified_educator: {
    icon: '⭐',
    label: 'Verified Educator',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    border: 'border-indigo-200 dark:border-indigo-500/30'
  }
};

export function ReputationBadge({ type, size = 'md', className = '', showTooltip = true }: ReputationBadgeProps) {
  const config = badgeConfig[type];
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  return (
    <div className={`relative group inline-flex items-center justify-center ${className}`}>
      <div 
        
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center border ${config.bg} ${config.border} shadow-sm backdrop-blur-sm cursor-help hover:shadow-md transition-all duration-300`}
      >
        <span className="drop-shadow-sm select-none">{config.icon}</span>
      </div>
      
      {showTooltip && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg border border-slate-700 dark:border-slate-600">
          <div className="flex items-center gap-1.5">
            <span>{config.label}</span>
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
        </div>
      )}
    </div>
  );
}
