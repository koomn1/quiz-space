import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: 'chars' | 'words';
  stagger?: number;
  textAlign?: 'left' | 'right' | 'center' | 'start' | 'end';
  onLetterAnimationComplete?: () => void;
}

export const SplitText: React.FC<SplitTextProps> = ({
  text = '',
  className = '',
  delay = 0,
  duration = 0.6,
  ease = 'back.out(1.7)',
  splitType = 'chars',
  stagger = 0.035,
  textAlign = 'start',
  onLetterAnimationComplete,
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const elementsRef = useRef<(HTMLSpanElement | null)[]>([]);

  // Split into words or chars while preserving spaces
  const tokens = React.useMemo(() => {
    if (!text) return [];
    if (splitType === 'words') {
      return text.split(/(\s+)/);
    }
    // Chars mode: split into individual characters
    return Array.from(text);
  }, [text, splitType]);

  useGSAP(
    () => {
      const validElements = elementsRef.current.filter(Boolean) as HTMLSpanElement[];
      if (validElements.length === 0) return;

      const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      if (reduceMotion) {
        gsap.set(validElements, { opacity: 1, y: 0, scale: 1, rotateX: 0 });
        onLetterAnimationComplete?.();
        return;
      }

      gsap.fromTo(
        validElements,
        {
          opacity: 0,
          y: 20,
          scale: 0.85,
          rotateX: -40,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          duration,
          delay: delay / 1000,
          ease,
          stagger,
          onComplete: onLetterAnimationComplete,
        }
      );
    },
    { scope: containerRef, dependencies: [text, delay, duration, ease, stagger] }
  );

  return (
    <span
      ref={containerRef}
      className={`inline-block [perspective:800px] ${className}`}
      style={{ textAlign, display: 'inline-block' }}
      aria-label={text}
    >
      {tokens.map((token, index) => {
        const isSpace = /^\s+$/.test(token);
        if (isSpace) {
          return (
            <span key={`space-${index}`} className="inline">
              {token}
            </span>
          );
        }
        return (
          <span
            key={`token-${index}`}
            ref={(el) => {
              elementsRef.current[index] = el;
            }}
            className="inline-block will-change-transform will-change-opacity"
            style={{ display: 'inline-block' }}
            aria-hidden="true"
          >
            {token}
          </span>
        );
      })}
    </span>
  );
};

export default SplitText;
