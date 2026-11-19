import React, { useEffect, useRef, useState } from 'react';

export interface TrueFocusProps {
  sentence?: string;
  manualMode?: boolean;
  blurAmount?: number;
  borderColor?: string;
  glowColor?: string;
  animationDuration?: number;
  pauseBetweenAnimations?: number;
  className?: string;
}

export const TrueFocus: React.FC<TrueFocusProps> = ({
  sentence = 'Quiz Space',
  manualMode = false,
  blurAmount = 4,
  borderColor = '#2AC3BB',
  glowColor = 'rgba(42, 195, 187, 0.45)',
  animationDuration = 0.5,
  pauseBetweenAnimations = 1.2,
  className = '',
}) => {
  const words = sentence.split(' ');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [focusRect, setFocusRect] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (manualMode) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, (animationDuration + pauseBetweenAnimations) * 1000);

    return () => clearInterval(interval);
  }, [manualMode, animationDuration, pauseBetweenAnimations, words.length]);

  useEffect(() => {
    const activeWord = wordRefs.current[currentIndex];
    const container = containerRef.current;
    if (!activeWord || !container) return;

    const wordRect = activeWord.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setFocusRect({
      x: wordRect.left - containerRect.left - 4,
      y: wordRect.top - containerRect.top - 2,
      width: wordRect.width + 8,
      height: wordRect.height + 4,
    });
  }, [currentIndex, sentence]);

  const handleMouseEnter = (index: number) => {
    if (manualMode) {
      setLastActiveIndex(index);
      setCurrentIndex(index);
    }
  };

  const handleMouseLeave = () => {
    if (manualMode && lastActiveIndex !== null) {
      setCurrentIndex(lastActiveIndex);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-wrap items-center gap-2 select-none ${className}`}
      onMouseLeave={handleMouseLeave}
    >
      {/* Floating Focus Frame */}
      <div
        className="pointer-events-none absolute rounded-lg border-2 transition-all"
        style={{
          transform: `translate3d(${focusRect.x}px, ${focusRect.y}px, 0)`,
          width: `${focusRect.width}px`,
          height: `${focusRect.height}px`,
          borderColor: borderColor,
          boxShadow: `0 0 16px ${glowColor}`,
          transitionDuration: `${animationDuration}s`,
          transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      >
        <span
          className="absolute -top-1 -start-1 h-2 w-2 border-t-2 border-s-2"
          style={{ borderColor: borderColor }}
        />
        <span
          className="absolute -top-1 -end-1 h-2 w-2 border-t-2 border-e-2"
          style={{ borderColor: borderColor }}
        />
        <span
          className="absolute -bottom-1 -start-1 h-2 w-2 border-b-2 border-s-2"
          style={{ borderColor: borderColor }}
        />
        <span
          className="absolute -bottom-1 -end-1 h-2 w-2 border-b-2 border-e-2"
          style={{ borderColor: borderColor }}
        />
      </div>

      {words.map((word, index) => {
        const isActive = index === currentIndex;
        return (
          <span
            key={index}
            ref={(el) => {
              wordRefs.current[index] = el;
            }}
            onMouseEnter={() => handleMouseEnter(index)}
            className="relative cursor-pointer transition-all duration-300 px-1 py-0.5"
            style={{
              filter: isActive ? 'blur(0px)' : `blur(${blurAmount}px)`,
              opacity: isActive ? 1 : 0.65,
              transform: isActive ? 'scale(1.05)' : 'scale(1)',
              transitionDuration: `${animationDuration}s`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

export default TrueFocus;
