import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface GsapCoverBackgroundProps {
  mode: string;
}

export const GsapCoverBackground: React.FC<GsapCoverBackgroundProps> = ({ mode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (mode === 'cosmic') {
      // Cosmic Stars Animation
      const stars = gsap.utils.toArray('.cosmic-star');
      
      stars.forEach((star: any) => {
        gsap.to(star, {
          y: 'random(-50, 50)',
          x: 'random(-50, 50)',
          opacity: 'random(0.3, 1)',
          scale: 'random(0.5, 1.5)',
          duration: 'random(2, 5)',
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut'
        });
      });
      
      gsap.to('.cosmic-nebula', {
        rotation: 360,
        scale: 1.2,
        duration: 30,
        repeat: -1,
        yoyo: true,
        ease: 'none',
        transformOrigin: 'center'
      });
      
    } else if (mode === 'waves') {
      // Neon Waves Animation
      gsap.to('.wave-line-1', {
        x: '-50%',
        duration: 15,
        repeat: -1,
        ease: 'none'
      });
      gsap.to('.wave-line-2', {
        x: '-50%',
        duration: 20,
        repeat: -1,
        ease: 'none'
      });
      gsap.to('.wave-line-3', {
        x: '-50%',
        duration: 25,
        repeat: -1,
        ease: 'none'
      });
      
      gsap.to('.wave-glow', {
        opacity: 0.8,
        scale: 1.1,
        duration: 4,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      });
    }
  }, { scope: containerRef, dependencies: [mode] });

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden w-full h-full bg-slate-950">
      {mode === 'cosmic' && (
        <div className="absolute inset-0">
          {/* Deep space background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-black" />
          
          {/* Rotating Nebula */}
          <div className="cosmic-nebula absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent blur-[100px]" />
          <div className="cosmic-nebula absolute top-1/4 left-1/4 w-[100%] h-[100%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent blur-[80px]" style={{ animationDelay: '-5s' }} />
          
          {/* Generating some random stars */}
          {Array.from({ length: 40 }).map((_, i) => (
            <div 
              key={i}
              className="cosmic-star absolute rounded-full bg-white"
              style={{
                width: Math.random() * 3 + 1 + 'px',
                height: Math.random() * 3 + 1 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                opacity: Math.random() * 0.5 + 0.1,
                boxShadow: `0 0 ${Math.random() * 10 + 2}px rgba(255,255,255,0.8)`
              }}
            />
          ))}
        </div>
      )}

      {mode === 'waves' && (
        <div className="absolute inset-0 bg-[#0a0514]">
          {/* Ambient Glows */}
          <div className="wave-glow absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px]" />
          <div className="wave-glow absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-[100px]" style={{ animationDelay: '-2s' }} />
          <div className="wave-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-32 bg-cyan-500/10 rounded-full blur-[80px]" />
          
          {/* SVG Waves */}
          <div className="absolute inset-0 flex items-center justify-center opacity-60 mix-blend-screen">
            <svg className="w-[200%] h-full" preserveAspectRatio="none" viewBox="0 0 1200 400">
              <path 
                className="wave-line-1" 
                d="M0,200 C300,100 300,300 600,200 C900,100 900,300 1200,200 C1500,100 1500,300 1800,200 C2100,100 2100,300 2400,200" 
                fill="none" 
                stroke="url(#grad1)" 
                strokeWidth="4"
              />
              <path 
                className="wave-line-2" 
                d="M0,220 C250,150 350,280 600,220 C850,150 950,280 1200,220 C1450,150 1550,280 1800,220 C2050,150 2150,280 2400,220" 
                fill="none" 
                stroke="url(#grad2)" 
                strokeWidth="3"
                opacity="0.7"
              />
              <path 
                className="wave-line-3" 
                d="M0,180 C350,250 250,120 600,180 C950,250 850,120 1200,180 C1550,250 1450,120 1800,180 C2150,250 2050,120 2400,180" 
                fill="none" 
                stroke="url(#grad3)" 
                strokeWidth="2"
                opacity="0.5"
              />
              
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="25%" stopColor="#ec4899" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="75%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="50%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
