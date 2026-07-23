import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface AnimatedLogoProps {
  className?: string;
  text?: string;
  isHovered?: boolean;
}

export function AnimatedLogo({ className = '', text = 'SpaceQuiz', isHovered: externalHover }: AnimatedLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const magneticRef = useRef<HTMLDivElement>(null);

  const [internalHover, setInternalHover] = useState(false);
  const isHovered = externalHover !== undefined ? externalHover : internalHover;

  useGSAP(() => {
    // Initial entrance animation - ultra premium
    const tl = gsap.timeline();
    
    tl.fromTo(
      iconRef.current,
      { scale: 0.5, opacity: 0, rotationY: 90 },
      { scale: 1, opacity: 1, rotationY: 0, duration: 1.5, ease: 'expo.out' }
    )
    .fromTo(
      textRef.current,
      { x: -30, opacity: 0, filter: 'blur(10px)' },
      { x: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2, ease: 'expo.out' },
      "-=1.2"
    );

    // Idle floating animation
    gsap.to(iconRef.current, {
      y: -5,
      rotationX: 5,
      rotationY: 5,
      duration: 3,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  }, { scope: containerRef });

  useEffect(() => {
    const magnetic = magneticRef.current;
    if (!magnetic) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = magnetic.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.4;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.4;
      
      gsap.to(iconRef.current, {
        x: x,
        y: y,
        rotationY: x * 0.5,
        rotationX: -y * 0.5,
        duration: 0.8,
        ease: 'power3.out'
      });
      gsap.to(textRef.current, {
        x: x * 0.5,
        y: y * 0.5,
        duration: 0.8,
        ease: 'power3.out'
      });
    };

    const handleMouseLeave = () => {
      gsap.to([iconRef.current, textRef.current], {
        x: 0,
        y: 0,
        rotationY: 0,
        rotationX: 0,
        duration: 1.2,
        ease: 'elastic.out(1, 0.3)'
      });
    };

    const handleTouchStart = () => {
      gsap.to(iconRef.current, { scale: 0.85, duration: 0.2, ease: 'power2.inOut' });
      gsap.to(textRef.current, { scale: 0.95, duration: 0.2, ease: 'power2.inOut' });
    };

    const handleTouchEnd = () => {
      gsap.to([iconRef.current, textRef.current], {
        scale: 1,
        duration: 0.8,
        ease: 'elastic.out(1.2, 0.4)'
      });
    };

    magnetic.addEventListener('mousemove', handleMouseMove);
    magnetic.addEventListener('mouseleave', handleMouseLeave);
    magnetic.addEventListener('mousedown', handleTouchStart);
    magnetic.addEventListener('mouseup', handleTouchEnd);
    magnetic.addEventListener('touchstart', handleTouchStart, { passive: true });
    magnetic.addEventListener('touchend', handleTouchEnd);

    return () => {
      magnetic.removeEventListener('mousemove', handleMouseMove);
      magnetic.removeEventListener('mouseleave', handleMouseLeave);
      magnetic.removeEventListener('mousedown', handleTouchStart);
      magnetic.removeEventListener('mouseup', handleTouchEnd);
      magnetic.removeEventListener('touchstart', handleTouchStart);
      magnetic.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative inline-flex items-center gap-3 cursor-pointer select-none group perspective-[800px] ${className}`}
      onMouseEnter={() => setInternalHover(true)}
      onMouseLeave={() => setInternalHover(false)}
    >
      {/* Magnetic interaction area */}
      <div ref={magneticRef} className="absolute -inset-6 z-20" />
      
      <div 
        ref={iconRef} 
        className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 z-10 transition-colors duration-500"
      >
        {/* Premium multi-layered glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-500 rounded-lg sm:rounded-xl opacity-40 blur-xl group-hover:opacity-80 group-hover:blur-2xl transition-all duration-700" />
        
        {/* Solid background shape */}
        <div className="absolute inset-0 bg-slate-900 dark:bg-slate-950 rounded-lg sm:rounded-xl border border-white/20 dark:border-slate-700/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(100,116,139,0.3),transparent_60%)]" />
        </div>

        {/* Abstract futuristic shape instead of generic planet */}
        <svg viewBox="0 0 100 100" className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" /> {/* Cyan 400 */}
              <stop offset="50%" stopColor="#818cf8" /> {/* Indigo 400 */}
              <stop offset="100%" stopColor="#c084fc" /> {/* Purple 400 */}
            </linearGradient>
          </defs>
          <path 
            d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" 
            fill="none" 
            stroke="url(#logoGrad)" 
            strokeWidth="8" 
            strokeLinejoin="round"
            className="opacity-90"
          />
          <path 
            d="M50 10 L50 50 M15 30 L50 50 M85 30 L50 50 M50 90 L50 50 M15 70 L50 50 M85 70 L50 50" 
            stroke="url(#logoGrad)" 
            strokeWidth="3.5"
            strokeLinecap="round"
            className="opacity-60"
          />
          <circle cx="50" cy="50" r="10" fill="#ffffff" className="drop-shadow-[0_0_12px_rgba(255,255,255,1)]" />
        </svg>
      </div>

      <span 
        ref={textRef}
        className="relative font-display font-black text-xl sm:text-2xl tracking-tight z-10 pt-1"
      >
        <span className="text-slate-800 dark:text-white transition-colors duration-500">
          Space
        </span>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 transition-colors duration-500 group-hover:from-indigo-400 group-hover:to-purple-500">
          Quiz
        </span>
      </span>
    </div>
  );
}
