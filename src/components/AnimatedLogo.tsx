import React from 'react';
import { MainLogo } from './MainLogo';

interface AnimatedLogoProps {
  className?: string;
  text?: string;
  isHovered?: boolean;
}

/** Backwards-compatible alias for the single official animated brand component. */
export function AnimatedLogo({ className = '' }: AnimatedLogoProps) {
  return <MainLogo className={className} size="md" showText />;
}
