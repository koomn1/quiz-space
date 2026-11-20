import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export type CosmoOrbState = 'idle' | 'thinking';

interface CosmoOrbProps {
  size?: number;
  state?: CosmoOrbState;
  className?: string;
}

/**
 * AI's visual identity — a small glowing core orbited by two rings, used
 * everywhere AI appears (sidebar icon, floating launcher, chat avatar,
 * "thinking" indicator, info modal). One SVG mark instead of an emoji or a
 * cartoon robot face, so it reads as a single coherent brand across the app.
 *
 * `state="thinking"` speeds up the orbit rings and intensifies the core
 * pulse/glow — used while AI is generating or streaming a reply.
 */
export default function CosmoOrb({ size = 32, state = 'idle', className = '' }: CosmoOrbProps) {
  const outerRingRef = useRef<SVGGElement>(null);
  const innerRingRef = useRef<SVGGElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const outerTweenRef = useRef<gsap.core.Tween | null>(null);
  const innerTweenRef = useRef<gsap.core.Tween | null>(null);
  const coreTweenRef = useRef<gsap.core.Tween | null>(null);
  const glowTweenRef = useRef<gsap.core.Tween | null>(null);
  const scopeRef = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    outerTweenRef.current = gsap.to(outerRingRef.current, {
      rotation: 360,
      transformOrigin: '50% 50%',
      duration: 7,
      repeat: -1,
      ease: 'none',
    });
    innerTweenRef.current = gsap.to(innerRingRef.current, {
      rotation: -360,
      transformOrigin: '50% 50%',
      duration: 5,
      repeat: -1,
      ease: 'none',
    });
    coreTweenRef.current = gsap.to(coreRef.current, {
      scale: 1.15,
      transformOrigin: '50% 50%',
      duration: 1.3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
    glowTweenRef.current = gsap.to(glowRef.current, {
      opacity: 0.85,
      scale: 1.3,
      transformOrigin: '50% 50%',
      duration: 1.3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, { scope: scopeRef });

  // Thinking = faster orbits + a brighter, quicker core pulse. Switching
  // timeScale (rather than rebuilding the tweens) keeps the motion smooth
  // instead of snapping when the state flips mid-animation.
  useEffect(() => {
    const speed = state === 'thinking' ? 3.2 : 1;
    const pulseSpeed = state === 'thinking' ? 2.4 : 1;
    outerTweenRef.current?.timeScale(speed);
    innerTweenRef.current?.timeScale(speed);
    coreTweenRef.current?.timeScale(pulseSpeed);
    glowTweenRef.current?.timeScale(pulseSpeed);
  }, [state]);

  return (
    <svg
      ref={scopeRef}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cosmo AI"
    >
      <defs>
        <radialGradient id="aiCoreGrad" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FCF6EE" />
          <stop offset="35%" stopColor="#55E2DB" />
          <stop offset="70%" stopColor="#2AC3BB" />
          <stop offset="100%" stopColor="#007472" />
        </radialGradient>
        <linearGradient id="aiRingGradOuter" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2AC3BB" />
          <stop offset="50%" stopColor="#EE8361" />
          <stop offset="100%" stopColor="#007472" />
        </linearGradient>
        <linearGradient id="aiRingGradInner" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#55E2DB" />
          <stop offset="100%" stopColor="#FCF6EE" />
        </linearGradient>
      </defs>

      {/* Ambient breathing glow behind everything */}
      <circle ref={glowRef} cx="24" cy="24" r="13" fill="#2AC3BB" opacity="0.45" style={{ filter: 'blur(6px)' }} />

      {/* Outer tilted orbit ring */}
      <g ref={outerRingRef}>
        <ellipse cx="24" cy="24" rx="21" ry="8" fill="none" stroke="url(#aiRingGradOuter)" strokeWidth="1.6" opacity="0.85" transform="rotate(-24 24 24)" />
        <circle cx="45" cy="21.5" r="1.6" fill="#EE8361" transform="rotate(-24 24 24)" />
      </g>

      {/* Inner tilted orbit ring, opposite direction */}
      <g ref={innerRingRef}>
        <ellipse cx="24" cy="24" rx="16" ry="6" fill="none" stroke="url(#aiRingGradInner)" strokeWidth="1.4" opacity="0.8" transform="rotate(35 24 24)" />
        <circle cx="8.4" cy="24.9" r="1.3" fill="#2AC3BB" transform="rotate(35 24 24)" />
      </g>

      {/* Glowing core */}
      <circle ref={coreRef} cx="24" cy="24" r="8.5" fill="url(#aiCoreGrad)" />
      <circle cx="21" cy="20.5" r="2.4" fill="#ffffff" opacity="0.55" />
    </svg>
  );
}
