import React, { useState, useEffect, useRef } from 'react';

export interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: 'start' | 'end' | 'center';
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  encryptedClassName?: string;
  parentClassName?: string;
  animateOn?: 'view' | 'hover' | 'both';
}

const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

export const DecryptedText: React.FC<DecryptedTextProps> = ({
  text,
  speed = 45,
  maxIterations = 8,
  sequential = true,
  revealDirection = 'start',
  useOriginalCharsOnly = false,
  characters = DEFAULT_CHARS,
  className = '',
  encryptedClassName = 'opacity-70 text-[#2AC3BB]',
  parentClassName = '',
  animateOn = 'both',
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const [isScrambling, setIsScrambling] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLSpanElement>(null);
  const hasAnimatedRef = useRef(false);

  const availableChars = useOriginalCharsOnly
    ? Array.from(new Set(text.split(''))).filter((c) => c !== ' ')
    : characters.split('');

  const getRandomChar = () => {
    return availableChars[Math.floor(Math.random() * availableChars.length)] || '*';
  };

  const startAnimation = () => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      setDisplayText(text);
      setRevealedIndices(new Set(Array.from({ length: text.length }, (_, i) => i)));
      return;
    }

    setIsScrambling(true);
    let iteration = 0;
    const currentRevealed = new Set<number>();

    const interval = setInterval(() => {
      iteration++;

      if (sequential) {
        let nextIndexToReveal = -1;
        if (revealDirection === 'start') {
          nextIndexToReveal = currentRevealed.size;
        } else if (revealDirection === 'end') {
          nextIndexToReveal = text.length - 1 - currentRevealed.size;
        } else {
          // center outward
          const mid = Math.floor(text.length / 2);
          const offset = Math.floor(currentRevealed.size / 2);
          nextIndexToReveal = currentRevealed.size % 2 === 0 ? mid + offset : mid - offset;
        }

        if (nextIndexToReveal >= 0 && nextIndexToReveal < text.length) {
          currentRevealed.add(nextIndexToReveal);
          setRevealedIndices(new Set(currentRevealed));
        }
      }

      setDisplayText((prev) =>
        text
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' ';
            if (sequential && currentRevealed.has(i)) return char;
            if (!sequential && iteration >= maxIterations) return char;
            return getRandomChar();
          })
          .join('')
      );

      const allDone = sequential
        ? currentRevealed.size >= text.length
        : iteration >= maxIterations;

      if (allDone) {
        clearInterval(interval);
        setDisplayText(text);
        setIsScrambling(false);
        setRevealedIndices(new Set(Array.from({ length: text.length }, (_, i) => i)));
      }
    }, speed);

    return () => clearInterval(interval);
  };

  useEffect(() => {
    if (animateOn === 'view' || animateOn === 'both') {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && !hasAnimatedRef.current) {
            hasAnimatedRef.current = true;
            startAnimation();
          }
        },
        { threshold: 0.1 }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }
      return () => observer.disconnect();
    }
  }, [text, animateOn]);

  const handleMouseEnter = () => {
    if ((animateOn === 'hover' || animateOn === 'both') && !isScrambling) {
      setIsHovering(true);
      startAnimation();
    }
  };

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      className={`inline-block cursor-default select-none ${parentClassName}`}
    >
      {displayText.split('').map((char, index) => {
        const isRevealed = revealedIndices.has(index);
        return (
          <span
            key={index}
            className={isRevealed ? className : `${className} ${encryptedClassName}`}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
};

export default DecryptedText;
