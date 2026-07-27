import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface MainLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const MainLogo = ({ className = '', size = 'md', showText = true }: MainLogoProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Premium GSAP animations for the logo
    if (iconRef.current) {
      // Rotate the outer rings
      gsap.to(".logo-ring-outer", {
        rotation: 360,
        transformOrigin: "center center",
        duration: 25,
        repeat: -1,
        ease: "none"
      });
      
      gsap.to(".logo-ring-inner", {
        rotation: -360,
        transformOrigin: "center center",
        duration: 20,
        repeat: -1,
        ease: "none"
      });
      
      // Floating effect for the core
      gsap.to(".logo-core", {
        y: -4,
        duration: 2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
      });
      
      // Pulsing glow
      gsap.to(".logo-glow", {
        opacity: 0.9,
        scale: 1.15,
        duration: 2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
      });
    }
  }, { scope: containerRef });

  const handleMouseEnter = () => {
    gsap.to(iconRef.current, { scale: 1.08, duration: 0.4, ease: 'back.out(2)' });
    gsap.to(".logo-core", { fill: '#38bdf8', duration: 0.3 });
  };

  const handleMouseLeave = () => {
    gsap.to(iconRef.current, { scale: 1, duration: 0.4, ease: 'power2.out' });
    gsap.to(".logo-core", { fill: 'url(#core-gradient)', duration: 0.3 });
  };

  // Dimensions mapping
  const sizeMap = {
    sm: { icon: 'w-8 h-8 sm:w-10 sm:h-10', text: 'text-xl sm:text-2xl', spacing: 'gap-2' },
    md: { icon: 'w-12 h-12', text: 'text-2xl', spacing: 'gap-3' },
    lg: { icon: 'w-20 h-20', text: 'text-3xl', spacing: 'gap-4' },
    xl: { icon: 'w-28 h-28', text: 'text-5xl', spacing: 'gap-5' },
  };

  const currentSize = sizeMap[size];

  return (
    <div
      ref={containerRef}
      className={`inline-flex items-center ${currentSize.spacing} ${className} select-none cursor-pointer group`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Icon Container */}
      <div className={`relative flex items-center justify-center ${currentSize.icon} shrink-0`}>
        <div className="logo-glow absolute inset-0 bg-gradient-to-tr from-cyan-500/40 to-purple-600/40 rounded-full blur-xl opacity-60" />
        
        <svg
          ref={iconRef}
          viewBox="0 0 100 100"
          className="w-full h-full relative z-10 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"
        >
          <defs>
            <linearGradient id="core-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" /> {/* Cyan 400 */}
              <stop offset="100%" stopColor="#c084fc" /> {/* Purple 400 */}
            </linearGradient>
            <linearGradient id="ring-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" /> {/* Indigo 400 */}
              <stop offset="100%" stopColor="#f472b6" /> {/* Pink 400 */}
            </linearGradient>
          </defs>
          
          {/* Outer dashed ring */}
          <circle 
            className="logo-ring-outer"
            cx="50" cy="50" r="42" 
            fill="none" 
            stroke="url(#ring-gradient)" 
            strokeWidth="2.5" 
            strokeDasharray="12 6" 
            opacity="0.85" 
          />
          
          {/* Inner solid ring with a gap */}
          <circle 
            className="logo-ring-inner"
            cx="50" cy="50" r="32" 
            fill="none" 
            stroke="#22d3ee" 
            strokeWidth="1.5" 
            strokeDasharray="140 40" 
            opacity="0.9" 
            strokeLinecap="round"
          />
          
          {/* Planet core */}
          <circle 
            className="logo-core"
            cx="50" cy="50" r="16" 
            fill="url(#core-gradient)" 
          />
          
          {/* Orbital path */}
          <ellipse 
            cx="50" cy="50" rx="46" ry="14" 
            fill="none" 
            stroke="url(#ring-gradient)" 
            strokeWidth="3.5" 
            transform="rotate(-25 50 50)" 
            opacity="0.9" 
          />
          
          {/* Orbiting star/moon */}
          <circle 
            cx="14" cy="33" r="4.5" 
            fill="#ffffff" 
            className="drop-shadow-[0_0_8px_rgba(255,255,255,1)] logo-ring-inner"
            style={{ transformOrigin: '50px 50px' }}
          />
          
        </svg>
      </div>

      {/* Brand Name Text Section */}
      {showText && (
        <div ref={textRef} className="flex flex-col justify-center text-left">
          <span
            className={`font-display font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 group-hover:from-cyan-300 group-hover:to-purple-400 transition-all duration-300 ${currentSize.text}`}
          >
            SpaceQuiz
          </span>
          {size === 'lg' && (
            <span className="text-[10px] font-mono tracking-widest text-cyan-400/80 uppercase -mt-1 group-hover:text-cyan-300 transition-colors">
              AI-Powered Platform
            </span>
          )}
          {size === 'xl' && (
            <span className="text-[12px] font-mono tracking-widest text-cyan-400/80 uppercase mt-0 group-hover:text-cyan-300 transition-colors">
              Premium Academic Intelligence
            </span>
          )}
        </div>
      )}
    </div>
  );
};
