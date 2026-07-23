import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface ParallaxTiltCardProps {
  key?: React.Key;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  idx?: number;
  initial?: any;
  whileInView?: any;
  viewport?: any;
}

export default function ParallaxTiltCard({
  children,
  className = '',
  onClick,
  idx = 0,
}: ParallaxTiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glareX, setGlareX] = useState(50);
  const [glareY, setGlareY] = useState(50);
  const [isHovered, setIsHovered] = useState(false);

  const { contextSafe } = useGSAP({ scope: cardRef });

  const handleMouseMove = contextSafe((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = (mouseX / width) - 0.5;
    const yPct = (mouseY / height) - 0.5;

    const rX = -yPct * 15; 
    const rY = xPct * 15;  

    setGlareX((mouseX / width) * 100);
    setGlareY((mouseY / height) * 100);

    gsap.to(card, {
      rotateX: rX,
      rotateY: rY,
      scale: 1.04,
      boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.7), 0 0 50px rgba(99, 102, 241, 0.25)',
      duration: 0.1,
      ease: 'power1.out',
      transformPerspective: 1000,
      transformOrigin: 'center center'
    });
  });

  const handleMouseEnter = contextSafe(() => {
    setIsHovered(true);
  });

  const handleMouseLeave = contextSafe(() => {
    setIsHovered(false);
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.15)',
      duration: 0.5,
      ease: 'power3.out'
    });
  });

  useGSAP(() => {
    if (cardRef.current) {
      const sideOffset = idx !== undefined ? (idx % 2 === 0 ? -50 : 50) : 0;
      const initialRotateY = idx !== undefined ? (idx % 2 === 0 ? -8 : 8) : 0;

      gsap.fromTo(cardRef.current, 
        { opacity: 0, x: sideOffset, rotateY: initialRotateY, scale: 0.94, filter: 'blur(3px)' }, 
        { 
          opacity: 1, 
          x: 0, 
          rotateY: 0, 
          scale: 1, 
          filter: 'blur(0px)',
          duration: 0.8, 
          delay: Math.min((idx % 3) * 0.05, 0.15), 
          ease: 'power3.out',
          scrollTrigger: {
            trigger: cardRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }
  });

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`group relative duration-350 cursor-pointer ${className}`}
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      {/* DynamicGlowing 3D Border outline overlay */}
      <div 
        className="absolute inset-0 rounded-3xl border border-primary/25 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
        style={{ transform: 'translateZ(3px)', zIndex: 10 }}
      />

      {/* 3D Glass Flare Effect overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl" 
        style={{
          background: `radial-gradient(circle 220px at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.15), transparent)`,
          transform: 'translateZ(2px)',
          zIndex: 5
        }}
      />
      {children}
    </div>
  );
}
