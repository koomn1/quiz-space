import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export function AnimatedMenuIcon({ className = '', isOpen = false }: { className?: string, isOpen?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<SVGLineElement>(null);
  const line2Ref = useRef<SVGLineElement>(null);
  const line3Ref = useRef<SVGLineElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useGSAP(() => {
    const tl = gsap.timeline();
    if (isOpen) {
      tl.to(line1Ref.current, { y: 6, rotation: 45, transformOrigin: 'center', duration: 0.3, ease: 'power2.inOut' }, 0)
        .to(line2Ref.current, { scaleX: 0, opacity: 0, transformOrigin: 'center', duration: 0.2, ease: 'power2.inOut' }, 0)
        .to(line3Ref.current, { y: -6, rotation: -45, transformOrigin: 'center', duration: 0.3, ease: 'power2.inOut' }, 0);
    } else {
      tl.to(line1Ref.current, { y: 0, rotation: 0, transformOrigin: 'center', duration: 0.3, ease: 'power2.inOut' }, 0)
        .to(line2Ref.current, { scaleX: 1, opacity: 1, transformOrigin: 'center', duration: 0.3, ease: 'power2.inOut' }, 0)
        .to(line3Ref.current, { y: 0, rotation: 0, transformOrigin: 'center', duration: 0.3, ease: 'power2.inOut' }, 0);
        
      if (isHovered) {
        gsap.to([line1Ref.current, line3Ref.current], {
          scaleX: 0.8,
          duration: 0.2,
          ease: 'power1.inOut',
          yoyo: true,
          repeat: 1
        });
      }
    }
  }, { dependencies: [isOpen, isHovered], scope: containerRef });

  return (
    <div 
      ref={containerRef}
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full"
      >
        <line ref={line1Ref} x1="4" y1="6" x2="20" y2="6" />
        <line ref={line2Ref} x1="4" y1="12" x2="20" y2="12" />
        <line ref={line3Ref} x1="4" y1="18" x2="20" y2="18" />
      </svg>
    </div>
  );
}
