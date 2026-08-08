import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export type CoverMode =
  | 'cosmic'
  | 'waves'
  | 'aurora'
  | 'sunset'
  | 'ocean'
  | 'matrix'
  | 'velvet'
  | 'prism'
  | 'custom';

interface GsapCoverBackgroundProps {
  mode: string;
  customImage?: string;
}

const modeClasses: Record<string, string> = {
  cosmic: 'bg-cosmic', waves: 'bg-waves', aurora: 'bg-aurora', sunset: 'bg-sunset',
  ocean: 'bg-ocean', matrix: 'bg-matrix', velvet: 'bg-velvet', prism: 'bg-prism',
};

const modeStyles: Record<string, React.CSSProperties> = {
  cosmic: { background: 'radial-gradient(circle at 25% 20%, #312e81 0%, #111827 46%, #020617 100%)' },
  waves: { background: 'linear-gradient(135deg, #09051a 0%, #172554 48%, #4c1d95 100%)' },
  aurora: { background: 'linear-gradient(125deg, #042f2e 0%, #164e63 38%, #581c87 100%)' },
  sunset: { background: 'linear-gradient(135deg, #431407 0%, #9a3412 42%, #701a75 100%)' },
  ocean: { background: 'linear-gradient(135deg, #082f49 0%, #075985 45%, #164e63 100%)' },
  matrix: { background: 'linear-gradient(135deg, #052e16 0%, #064e3b 45%, #020617 100%)' },
  velvet: { background: 'linear-gradient(135deg, #2e1065 0%, #581c87 48%, #1e1b4b 100%)' },
  prism: { background: 'linear-gradient(120deg, #172554 0%, #6d28d9 36%, #be185d 68%, #0e7490 100%)' },
};

export const GsapCoverBackground: React.FC<GsapCoverBackgroundProps> = ({ mode, customImage }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const safeMode = mode === 'custom' && customImage ? 'custom' : (modeClasses[mode] ? mode : 'cosmic');

  useGSAP(() => {
    const root = containerRef.current;
    if (!root || safeMode === 'custom') return;
    const items = gsap.utils.toArray<HTMLElement>('.cover-orb, .cover-line, .cover-star', root);
    gsap.to(items, {
      x: 'random(-28, 28)', y: 'random(-18, 18)', rotation: 'random(-12, 12)',
      opacity: 'random(0.35, 1)', scale: 'random(0.82, 1.18)',
      duration: 'random(3, 7)', repeat: -1, yoyo: true, stagger: 0.04, ease: 'sine.inOut'
    });
    gsap.to('.cover-rotate', { rotation: 360, duration: safeMode === 'waves' ? 26 : 34, repeat: -1, ease: 'none' });
    gsap.to('.cover-shimmer', { xPercent: 120, duration: 7, repeat: -1, ease: 'none', delay: 1 });
  }, { scope: containerRef, dependencies: [safeMode] });

  if (safeMode === 'custom') {
    return <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-slate-950" style={{ backgroundImage: `linear-gradient(115deg, rgba(5,8,25,.72), rgba(7,12,35,.18)), url(${customImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />;
  }

  const stars = Array.from({ length: safeMode === 'matrix' ? 26 : 34 });
  return (
    <div ref={containerRef} style={modeStyles[safeMode]} className={`absolute inset-0 overflow-hidden ${modeClasses[safeMode]}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,.12),transparent_48%)]" />
      <div className="cover-rotate absolute -inset-1/2 rounded-[45%] border border-white/10 opacity-60" />
      <div className="cover-rotate absolute -inset-1/3 rounded-[42%] border border-white/10 opacity-40" style={{ animationDirection: 'reverse' }} />
      <div className="cover-orb absolute -top-20 left-[10%] h-52 w-52 rounded-full bg-fuchsia-400/25 blur-3xl" />
      <div className="cover-orb absolute -bottom-24 right-[8%] h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="cover-shimmer pointer-events-none absolute -left-1/2 top-0 h-full w-1/3 skew-x-[-22deg] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {safeMode === 'waves' && <div className="cover-line absolute inset-x-[-20%] top-1/2 h-24 rounded-[50%] border-y-2 border-cyan-300/50 shadow-[0_0_35px_rgba(34,211,238,.45)]" />}
      {safeMode === 'aurora' && <div className="cover-line absolute -left-1/4 top-1/4 h-32 w-[150%] rotate-[-12deg] rounded-[50%] bg-gradient-to-r from-cyan-300/0 via-cyan-300/40 to-violet-400/0 blur-xl" />}
      {safeMode === 'matrix' && <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(74,222,128,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(74,222,128,.18)_1px,transparent_1px)] [background-size:22px_22px]" />}
      {safeMode === 'prism' && <div className="cover-line absolute left-1/2 top-1/2 h-[180%] w-20 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gradient-to-b from-transparent via-white/25 to-transparent blur-xl" />}
      {stars.map((_, i) => (
        <span key={i} className="cover-star absolute rounded-full bg-white" style={{ width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, top: `${(i * 37) % 100}%`, left: `${(i * 61) % 100}%`, opacity: 0.25 + (i % 5) / 10, boxShadow: '0 0 10px rgba(255,255,255,.8)' }} />
      ))}
    </div>
  );
};
