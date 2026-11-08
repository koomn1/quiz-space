import React from 'react';
import { MainLogo } from './MainLogo';

interface CosmicLogoProps {
  className?: string;
  animate?: boolean;
}

/** Backwards-compatible alias: all platform branding uses the official MainLogo. */
export default function CosmicLogo({ className = '', animate = true }: CosmicLogoProps) {
  return (
    <MainLogo
      className={`${animate ? '' : 'motion-reduce:!transition-none'} ${className}`}
      size="md"
      showText={false}
    />
  );
}
