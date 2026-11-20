import React, { useEffect, useRef, useState } from 'react';
import { FormattedText } from './CosmoMarkdown';
import { type CosmoPalette } from './CosmoPalette';

export interface CosmoTypewriterProps {
  fullText: string;
  theme: CosmoPalette;
  isStreaming?: boolean;
  speedMs?: number;
  onDrainComplete?: () => void;
}

export function useTypewriterBuffer(targetText: string, speedMs: number = 14): string {
  // If targetText is empty, start empty; otherwise start with first char for instant reactivity
  const [displayedText, setDisplayedText] = useState(() => targetText ? targetText.slice(0, 1) : '');
  const displayedLengthRef = useRef(displayedText.length);
  const targetTextRef = useRef(targetText);
  targetTextRef.current = targetText;

  useEffect(() => {
    let lastTime = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const targetLen = targetTextRef.current.length;
      const currentLen = displayedLengthRef.current;

      if (currentLen < targetLen) {
        const delta = now - lastTime;
        const lag = targetLen - currentLen;
        // Adaptive catch-up: if chunks arrive fast, consume more characters per frame
        const charsToAdvance = lag > 120 ? 6 : lag > 50 ? 3 : lag > 20 ? 2 : 1;
        const effectiveInterval = Math.max(4, speedMs / charsToAdvance);

        if (delta >= effectiveInterval) {
          const nextLen = Math.min(targetLen, currentLen + charsToAdvance);
          displayedLengthRef.current = nextLen;
          setDisplayedText(targetTextRef.current.slice(0, nextLen));
          lastTime = now;
        }
        rafId = requestAnimationFrame(tick);
      } else if (currentLen > targetLen) {
        displayedLengthRef.current = targetLen;
        setDisplayedText(targetTextRef.current);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [targetText, speedMs]);

  return displayedText;
}

export function CosmoTypewriter({
  fullText,
  theme,
  isStreaming = true,
  speedMs = 14,
}: CosmoTypewriterProps) {
  const displayedText = useTypewriterBuffer(fullText, speedMs);

  return (
    <div className="relative">
      <FormattedText text={displayedText} fg={theme.FG} theme={theme} />
      {isStreaming && (
        <span
          className="inline-block w-2 h-4 bg-[#2AC3BB] animate-pulse ml-1 align-middle rounded-xs"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
