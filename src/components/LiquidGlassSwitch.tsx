import React from 'react';
import { Check, X } from 'lucide-react';

interface LiquidGlassSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LiquidGlassSwitch({
  checked,
  onChange,
  className = '',
  size = 'md',
  id
}: LiquidGlassSwitchProps) {
  
  // Dimensions mapping
  const sizes = {
    sm: {
      width: 'w-14',
      height: 'h-8',
      knob: 'w-6 h-6',
      translate: 24,
      iconSize: 12,
    },
    md: {
      width: 'w-24',
      height: 'h-12',
      knob: 'w-10 h-10',
      translate: 48,
      iconSize: 18,
    },
    lg: {
      width: 'w-32',
      height: 'h-16',
      knob: 'w-14 h-14',
      translate: 64,
      iconSize: 24,
    }
  };

  const currentSize = sizes[size] || sizes.md;

  const handleToggle = () => {
    onChange(!checked);
  };

  return (
    <div className={`relative inline-flex items-center select-none ${className}`} id={id}>
      {/* SVG Filters for premium bloom glow and light refraction */}
      <svg className="absolute w-0 h-0 pointer-events-none" width="0" height="0">
        <defs>
          <filter id="neon-bloom-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="refraction-filter" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Premium Bloom Glow behind the switch when checked */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ filter: 'url(#neon-bloom-glow)' }}
        
        
      />

      {/* Switch Outer Track with Glassmorphism and Neon Border */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        className={`
          ${currentSize.width} ${currentSize.height}
          relative rounded-full p-1 cursor-pointer outline-none transition-all duration-300
          backdrop-blur-md flex items-center border-2
          bg-[#130b2b]/60 border-[#9b51e0]/50
          shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]
          ${checked 
            ? 'shadow-[0_0_15px_rgba(155,81,224,0.4),_inset_0_1px_2px_rgba(255,255,255,0.2)] border-[#b175ff]' 
            : 'border-[#9b51e0]/30 shadow-inner'
          }
        `}
      >
        {/* Subtle glossy refraction layer inside track */}
        <div 
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none rounded-full" 
          style={{ filter: 'url(#refraction-filter)' }}
        />

        {/* Sliding Knob with Framer Motion spring physics */}
        <div
          className={`
            ${currentSize.knob}
            rounded-full flex items-center justify-center absolute left-1 z-10
            shadow-[0_4px_10px_rgba(0,0,0,0.5)] border transition-all duration-300
            ${checked 
              ? 'bg-[#b175ff] border-[#e2c5ff] text-white shadow-[0_0_10px_rgba(177,117,255,0.8)]' 
              : 'bg-slate-900 border-slate-700 text-slate-400'
            }
          `}
          
          
        >
          {/* Subtle reflection inside knob */}
          <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-4/5 h-1/3 bg-white/20 rounded-full blur-[0.5px] pointer-events-none" />

          {/* Micro Icon in Knob center for premium detailing */}
          {checked ? (
            <Check 
              size={currentSize.iconSize - 2} 
              className="text-white font-extrabold stroke-[3.5] filter drop-shadow-[0_0_3px_rgba(255,255,255,0.9)]" 
            />
          ) : (
            <X 
              size={currentSize.iconSize - 2} 
              className="text-slate-400 stroke-[3]" 
            />
          )}
        </div>
      </button>
    </div>
  );
}
