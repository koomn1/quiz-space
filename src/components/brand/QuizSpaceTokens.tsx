import React from 'react';

interface TokenProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

/**
 * QuizSpace Points Token - Custom Hexagonal Energy Crystal
 * Strictly replaces generic AI 4-point sparkle with QuizSpace brand crystal
 */
export const QuizSpacePointsToken: React.FC<TokenProps> = ({ className = 'w-4 h-4', size, animated = false }) => {
  const dimensionProps = size ? { width: size, height: size } : {};
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 select-none ${animated ? 'animate-pulse' : ''} ${className}`}
      {...dimensionProps}
      aria-label="QuizSpace Points"
    >
      <defs>
        <linearGradient id="qspPtsGrad" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2AC3BB" />
          <stop offset="50%" stopColor="#007472" />
          <stop offset="100%" stopColor="#023b3a" />
        </linearGradient>
        <linearGradient id="qspFacetGlow" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#99F6E4" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#2AC3BB" stopOpacity="0.2" />
        </linearGradient>
        <radialGradient id="qspCoreShine" cx="16" cy="14" r="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#2AC3BB" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#007472" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Outer Glow Hexagon */}
      <polygon
        points="16,2 29,8.5 29,23.5 16,30 3,23.5 3,8.5"
        fill="url(#qspPtsGrad)"
        stroke="#2AC3BB"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Inner Crystal Facets */}
      <polygon
        points="16,6 25,11 25,21 16,26 7,21 7,11"
        fill="url(#qspFacetGlow)"
        opacity="0.65"
      />
      {/* Facet Diagonal Bevel Lines */}
      <line x1="16" y1="2" x2="16" y2="30" stroke="#99F6E4" strokeWidth="1" strokeOpacity="0.75" />
      <line x1="3" y1="8.5" x2="29" y2="23.5" stroke="#99F6E4" strokeWidth="0.8" strokeOpacity="0.5" />
      <line x1="29" y1="8.5" x2="3" y2="23.5" stroke="#99F6E4" strokeWidth="0.8" strokeOpacity="0.5" />
      {/* Center Prismatic Core */}
      <circle cx="16" cy="16" r="4.5" fill="url(#qspCoreShine)" />
      <circle cx="16" cy="16" r="1.8" fill="#FFFFFF" />
    </svg>
  );
};

/**
 * QuizSpace Coins Token - Minted Golden Q-Orbit Game Coin
 */
export const QuizSpaceCoinsToken: React.FC<TokenProps> = ({ className = 'w-4 h-4', size, animated = false }) => {
  const dimensionProps = size ? { width: size, height: size } : {};
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 select-none ${animated ? 'animate-bounce' : ''} ${className}`}
      {...dimensionProps}
      aria-label="QuizSpace Coins"
    >
      <defs>
        <linearGradient id="qspCoinRim" x1="3" y1="3" x2="29" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="35%" stopColor="#F59E0B" />
          <stop offset="70%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
        <radialGradient id="qspCoinFace" cx="13" cy="12" r="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="45%" stopColor="#FBBF24" />
          <stop offset="85%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#B45309" />
        </radialGradient>
      </defs>
      {/* Coin Outer Rim */}
      <circle cx="16" cy="16" r="14" fill="url(#qspCoinRim)" stroke="#FDE68A" strokeWidth="1" />
      {/* Coin Inner Face */}
      <circle cx="16" cy="16" r="11.5" fill="url(#qspCoinFace)" stroke="#78350F" strokeWidth="0.75" />
      {/* Outer Coin Dentils / Ridges */}
      <circle cx="16" cy="16" r="10" stroke="#FDE68A" strokeWidth="0.75" strokeDasharray="1.5 2" opacity="0.8" />
      {/* Central Stamped QuizSpace Q Orbit Emblem */}
      <ellipse cx="16" cy="16" rx="6" ry="6" stroke="#78350F" strokeWidth="1.8" />
      <path d="M19 19L22.5 22.5" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />
      {/* Dynamic Gold Highlight Spark */}
      <path d="M11 9C13 7.5 17 7.5 20 9" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
      <circle cx="12" cy="12" r="1" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
};

/**
 * QuizSpace XP Shield Token - Cyber Experience Crest
 */
export const QuizSpaceXpToken: React.FC<TokenProps> = ({ className = 'w-4 h-4', size, animated = false }) => {
  const dimensionProps = size ? { width: size, height: size } : {};
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 select-none ${animated ? 'animate-pulse' : ''} ${className}`}
      {...dimensionProps}
      aria-label="QuizSpace XP"
    >
      <defs>
        <linearGradient id="qspXpShield" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#007472" />
          <stop offset="50%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#022c2b" />
        </linearGradient>
        <linearGradient id="qspLightning" x1="16" y1="6" x2="16" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EE8361" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      {/* Shield Body */}
      <path
        d="M16 2L27 6V16C27 22.5 22 28 16 30C10 28 5 22.5 5 16V6L16 2Z"
        fill="url(#qspXpShield)"
        stroke="#2AC3BB"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Inner Chevron Inset */}
      <path
        d="M16 5.5L24 8.5V15.5C24 20.5 20.5 24.5 16 26.5C11.5 24.5 8 20.5 8 15.5V8.5L16 5.5Z"
        stroke="#2AC3BB"
        strokeWidth="0.8"
        strokeOpacity="0.6"
        fill="none"
      />
      {/* Energy Lightning Strike Bolt */}
      <path
        d="M17.5 7L11.5 16H16.5L14.5 25L21.5 14.5H16.5L17.5 7Z"
        fill="url(#qspLightning)"
        stroke="#FFFFFF"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * QuizSpace Treasure Chest Token - Isometric Illustrated Chest
 */
export const QuizSpaceChestToken: React.FC<TokenProps> = ({ className = 'w-5 h-5', size }) => {
  const dimensionProps = size ? { width: size, height: size } : {};
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 select-none ${className}`}
      {...dimensionProps}
      aria-label="Mystery Chest"
    >
      <defs>
        <linearGradient id="qspChestWood" x1="4" y1="12" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#78350F" />
          <stop offset="50%" stopColor="#92400E" />
          <stop offset="100%" stopColor="#451A03" />
        </linearGradient>
        <linearGradient id="qspChestGold" x1="2" y1="8" x2="30" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      {/* Chest Base Box */}
      <path d="M4 14H28V26C28 27.5 26.5 28.5 25 28.5H7C5.5 28.5 4 27.5 4 26V14Z" fill="url(#qspChestWood)" stroke="#F59E0B" strokeWidth="1.2" />
      {/* Chest Domed Lid */}
      <path d="M3 14C3 8.5 8 5 16 5C24 5 29 8.5 29 14H3Z" fill="url(#qspChestGold)" stroke="#FDE68A" strokeWidth="1.2" />
      {/* Gold Straps */}
      <rect x="8" y="5.5" width="3" height="23" fill="#F59E0B" stroke="#FDE68A" strokeWidth="0.5" />
      <rect x="21" y="5.5" width="3" height="23" fill="#F59E0B" stroke="#FDE68A" strokeWidth="0.5" />
      {/* Center Lock Plate */}
      <rect x="13.5" y="12" width="5" height="6.5" rx="1.5" fill="#FDE68A" stroke="#78350F" strokeWidth="0.8" />
      <circle cx="16" cy="14.5" r="1.2" fill="#78350F" />
      <rect x="15.5" y="15" width="1" height="2" fill="#78350F" />
      {/* Glowing Seam Light */}
      <line x1="3" y1="14" x2="29" y2="14" stroke="#2AC3BB" strokeWidth="1.2" strokeOpacity="0.9" />
    </svg>
  );
};
