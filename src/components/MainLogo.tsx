import React from 'react';

interface MainLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const sizeMap = {
  sm: { icon: 'w-9 h-9 sm:w-10 sm:h-10', text: 'text-xl sm:text-2xl', spacing: 'gap-2' },
  md: { icon: 'w-12 h-12', text: 'text-2xl', spacing: 'gap-3' },
  lg: { icon: 'w-20 h-20', text: 'text-3xl', spacing: 'gap-4' },
  xl: { icon: 'w-28 h-28', text: 'text-5xl', spacing: 'gap-5' },
};

export const MainLogo = ({ className = '', size = 'md', showText = true }: MainLogoProps) => {
  const currentSize = sizeMap[size];
  const baseUrl = import.meta.env.BASE_URL || '/';
  const logoSrc = `${baseUrl}brand/quizspace-logo-512.png`;

  return (
    <div className={`inline-flex items-center ${currentSize.spacing} ${className} select-none cursor-pointer group`}>
      <div className={`relative flex items-center justify-center ${currentSize.icon} shrink-0 transition-transform duration-300 group-hover:scale-110`}>
        <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-cyan-400/25 via-violet-500/20 to-amber-300/20 blur-xl opacity-80 group-hover:opacity-100 transition-opacity" />
        <img
          src={logoSrc}
          alt="QuizSpace"
          className="relative z-10 w-full h-full object-contain drop-shadow-[0_0_12px_rgba(124,58,237,0.55)]"
          draggable={false}
        />
      </div>

      {showText && (
        <div className="flex flex-col justify-center text-left">
          <span className={`font-display font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-violet-400 to-amber-300 group-hover:from-cyan-200 group-hover:to-amber-200 transition-all duration-300 ${currentSize.text}`}>
            QuizSpace
          </span>
          {size === 'lg' && (
            <span className="text-[10px] font-mono tracking-widest text-cyan-300/80 uppercase -mt-1">
              Learn · Challenge · Lead
            </span>
          )}
          {size === 'xl' && (
            <span className="text-[12px] font-mono tracking-widest text-cyan-300/80 uppercase mt-0">
              Intelligent Learning Universe
            </span>
          )}
        </div>
      )}
    </div>
  );
};
