import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Sun, Moon } from 'lucide-react';

gsap.registerPlugin(useGSAP);

export function AnimatedThemeIcon({ darkMode = false, className = '' }: { darkMode?: boolean, className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useGSAP(() => {
    if (iconRef.current) {
      if (darkMode) {
        gsap.fromTo(iconRef.current, 
          { rotation: -90, scale: 0.5, opacity: 0 },
          { rotation: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' }
        );
      } else {
        gsap.fromTo(iconRef.current, 
          { rotation: 90, scale: 0.5, opacity: 0 },
          { rotation: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' }
        );
      }
    }
  }, { dependencies: [darkMode], scope: containerRef });

  useGSAP(() => {
    if (isHovered && iconRef.current) {
      gsap.to(iconRef.current, {
        rotation: darkMode ? -20 : 20,
        scale: 1.1,
        duration: 0.3,
        ease: 'power1.inOut',
        yoyo: true,
        repeat: 1
      });
    }
  }, { dependencies: [isHovered, darkMode], scope: containerRef });

  return (
    <div 
      ref={containerRef}
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div ref={iconRef}>
        {darkMode ? <Sun className="w-full h-full text-amber-500" /> : <Moon className="w-full h-full text-primary" />}
      </div>
    </div>
  );
}
