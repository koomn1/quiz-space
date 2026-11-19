import React from 'react';
import { DivisionInfo, getDivisionForLevel } from '../lib/levelingSystem';
import {
  Compass,
  BookOpen,
  Shield,
  Sparkles,
  Feather,
  Crown,
  Sword,
  Gem,
  Flame,
  Star,
} from 'lucide-react';

export interface TitleAvatarBadgeProps {
  level: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIconOnly?: boolean;
  className?: string;
  lang?: 'ar' | 'en';
  onClick?: () => void;
}

export function TitleAvatarIcon({ division, size = 'md' }: { division: DivisionInfo; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const iconSizeClasses = {
    xs: 'h-3.5 w-3.5',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
  }[size];

  switch (division.avatarIcon) {
    case 'compass':
      return <Compass className={iconSizeClasses} />;
    case 'book':
      return <BookOpen className={iconSizeClasses} />;
    case 'shield':
      return <Shield className={iconSizeClasses} />;
    case 'sparkles':
      return <Sparkles className={iconSizeClasses} />;
    case 'feather':
      return <Feather className={iconSizeClasses} />;
    case 'crown':
      return <Crown className={iconSizeClasses} />;
    case 'sword':
      return <Sword className={iconSizeClasses} />;
    case 'gem':
      return <Gem className={iconSizeClasses} />;
    case 'flame':
      return <Flame className={iconSizeClasses} />;
    case 'star':
    default:
      return <Star className={iconSizeClasses} />;
  }
}

export default function TitleAvatarBadge({
  level,
  size = 'md',
  showLabel = true,
  showIconOnly = false,
  className = '',
  lang = 'ar',
  onClick,
}: TitleAvatarBadgeProps) {
  const isAr = lang === 'ar';
  const division = getDivisionForLevel(level);

  const containerPadding = {
    xs: 'px-1.5 py-0.5 text-[9px] gap-1',
    sm: 'px-2.5 py-1 text-[10px] gap-1.5',
    md: 'px-3 py-1.5 text-xs gap-2',
    lg: 'px-4 py-2 text-sm gap-2.5',
  }[size];

  const iconWrapperSize = {
    xs: 'h-5 w-5',
    sm: 'h-6 w-6',
    md: 'h-7 w-7',
    lg: 'h-10 w-10',
  }[size];

  if (showIconOnly) {
    return (
      <div
        onClick={onClick}
        title={`${division.titleAr} (Lv.${level})`}
        className={`relative inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${division.gradient} p-0.5 text-white shadow-sm ring-1 ring-white/20 transition hover:scale-105 ${onClick ? 'cursor-pointer active:scale-95' : ''} ${className}`}
      >
        <div className={`flex items-center justify-center rounded-[10px] bg-slate-950/40 backdrop-blur-xs ${iconWrapperSize}`}>
          <TitleAvatarIcon division={division} size={size} />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={isAr ? `رتبة ${division.titleAr} • المستوى ${level}` : `${division.titleEn} Rank • Level ${level}`}
      className={`inline-flex items-center rounded-2xl border ${division.borderColor} bg-slate-50/90 dark:bg-[#072424]/90 backdrop-blur-md shadow-xs transition-all hover:shadow-md ${onClick ? 'cursor-pointer hover:border-primary/50 active:scale-98' : ''} ${containerPadding} ${className}`}
    >
      {/* Visual Avatar Crest */}
      <div className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${division.gradient} text-white shadow-xs ${iconWrapperSize}`}>
        <TitleAvatarIcon division={division} size={size} />
      </div>

      {/* Title Text */}
      {showLabel && (
        <div className="flex flex-col text-start leading-tight">
          <div className="flex items-center gap-1">
            <span className={`font-black ${division.badgeColor}`}>
              {isAr ? division.titleAr : division.titleEn}
            </span>
            <span className="rounded-full bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300">
              Lv.{level}
            </span>
          </div>
          <span className="text-[9px] font-medium text-slate-400 dark:text-slate-400">
            {division.badgeName}
          </span>
        </div>
      )}
    </div>
  );
}
