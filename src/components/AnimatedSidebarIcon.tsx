import React, { useRef, useState, cloneElement, ReactElement } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export function AnimatedSidebarIcon({ children, isActive = false }: { children: ReactElement, isActive?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useGSAP(() => {
    const el = containerRef.current?.firstElementChild;
    if (!el) return;

    if (isActive) {
      gsap.to(el, {
        scale: 1.15,
        rotation: 0,
        y: -2,
        duration: 0.5,
        ease: 'back.out(2)',
      });
    } else if (isHovered) {
      gsap.to(el, {
        scale: 1.1,
        rotation: 5,
        y: -1,
        duration: 0.3,
        ease: 'power2.out',
      });
    } else {
      gsap.to(el, {
        scale: 1,
        rotation: 0,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
      });
    }
  }, { dependencies: [isActive, isHovered], scope: containerRef });

  return (
    <div 
      ref={containerRef}
      className="inline-flex shrink-0 items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  );
}
