import React from 'react';
import { MainLogo } from './MainLogo';

export const QuizSpaceLogo = ({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' | 'hero' }) => {
  const sizeMap = { sm: 'sm', md: 'md', lg: 'lg', hero: 'xl' } as const;
  return <MainLogo className={className} size={sizeMap[size]} showText />;
};
