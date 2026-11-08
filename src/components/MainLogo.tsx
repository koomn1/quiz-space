import React from 'react';

interface MainLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const sizeMap = {
  sm: { image: 'h-10 w-24 sm:h-11 sm:w-28' },
  md: { image: 'h-14 w-36' },
  lg: { image: 'h-20 w-52' },
  xl: { image: 'h-28 w-72' },
};

/** The platform's official QuizSpace logo asset. */
export const MainLogo = ({ className = '', size = 'md' }: MainLogoProps) => {
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  const source = `${baseUrl}brand/quizspace-logo-512.webp`;
  const currentSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center select-none cursor-pointer group ${className}`}>
      <img
        src={source}
        alt="QuizSpace"
        className={`${currentSize.image} object-contain transition-transform duration-300 group-hover:scale-[1.03]`}
        draggable={false}
      />
    </div>
  );
};
