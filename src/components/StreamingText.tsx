import React, { useEffect, useRef, useState } from 'react';

interface StreamingTextProps {
  text: string;
  /** Skip the animation entirely and just show the final text (used for
   * messages loaded from history — only freshly-arrived replies stream). */
  instant?: boolean;
  onProgress?: () => void;
  onDone?: () => void;
  renderContent: (visibleText: string, isStreaming: boolean) => React.ReactNode;
}

/**
 * Reveals `text` progressively, character by character, like Claude/Gemini's
 * live-typing effect — instead of the full reply appearing all at once. The
 * backend returns the whole message in one response (no token streaming),
 * so this simulates the effect client-side at a natural reading pace.
 */
export default function StreamingText({ text, instant = false, onProgress, onDone, renderContent }: StreamingTextProps) {
  const [visibleCount, setVisibleCount] = useState(instant ? text.length : 0);
  const frameRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (instant) {
      setVisibleCount(text.length);
      return;
    }

    setVisibleCount(0);
    doneRef.current = false;
    let lastTime = performance.now();
    let accumulator = 0;
    // A touch faster for long replies so a 600-word answer doesn't take forever,
    // but still visibly "typed" rather than dumped.
    const charsPerSecond = text.length > 600 ? 140 : text.length > 250 ? 90 : 55;

    const step = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      accumulator += (delta / 1000) * charsPerSecond;

      setVisibleCount((prev) => {
        const next = Math.min(text.length, prev + Math.floor(accumulator));
        if (Math.floor(accumulator) > 0) accumulator -= Math.floor(accumulator);
        if (next > prev) onProgress?.();
        return next;
      });

      if (accumulator >= 0 && !doneRef.current) {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [text, instant]);

  useEffect(() => {
    if (!doneRef.current && visibleCount >= text.length && text.length > 0) {
      doneRef.current = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      onDone?.();
    }
  }, [visibleCount, text.length, onDone]);

  const isStreaming = visibleCount < text.length;
  return <>{renderContent(text.slice(0, visibleCount), isStreaming)}</>;
}
