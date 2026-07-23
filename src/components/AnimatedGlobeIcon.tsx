import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export function AnimatedGlobeIcon({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<SVGSVGElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useGSAP(() => {
    if (isHovered) {
      gsap.to(globeRef.current, {
        rotation: 180,
        scale: 1.1,
        duration: 0.6,
        ease: 'back.out(2)',
        transformOrigin: "center center"
      });
    } else {
      gsap.to(globeRef.current, {
        rotation: 0,
        scale: 1,
        duration: 0.6,
        ease: 'power2.out',
        transformOrigin: "center center"
      });
    }
  }, { dependencies: [isHovered], scope: containerRef });

  return (
    <div 
      ref={containerRef}
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg
        ref={globeRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    </div>
  );
}
