import React, { useEffect, useState, useCallback, useRef } from 'react';

export interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface CosmoTourSpotlightProps {
  isActive: boolean;
  targetSelector?: string;
  targetRect?: SpotlightRect;
  padding?: number;
  borderRadius?: number;
  onDismiss?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export const CosmoTourSpotlight: React.FC<CosmoTourSpotlightProps> = ({
  isActive,
  targetSelector,
  targetRect: customTargetRect,
  padding = 8,
  borderRadius = 16,
  onDismiss,
  children,
  className = '',
}) => {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const updatePosition = useCallback(() => {
    if (!isActive) return;

    if (customTargetRect) {
      setRect(customTargetRect);
      return;
    }

    if (!targetSelector) {
      setRect(null);
      return;
    }

    const element = document.querySelector(targetSelector);
    if (element) {
      const domRect = element.getBoundingClientRect();
      setRect({
        top: domRect.top,
        left: domRect.left,
        width: domRect.width,
        height: domRect.height,
      });
    } else {
      setRect(null);
    }
  }, [isActive, targetSelector, customTargetRect]);

  useEffect(() => {
    if (!isActive) {
      setRect(null);
      return;
    }

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    if (targetSelector) {
      const el = document.querySelector(targetSelector);
      if (el) {
        observerRef.current = new ResizeObserver(() => {
          updatePosition();
        });
        observerRef.current.observe(el);
      }
    }

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isActive, targetSelector, updatePosition]);

  if (!isActive) return null;

  const spotlightTop = rect ? Math.max(0, rect.top - padding) : 0;
  const spotlightLeft = rect ? Math.max(0, rect.left - padding) : 0;
  const spotlightWidth = rect ? rect.width + padding * 2 : 0;
  const spotlightHeight = rect ? rect.height + padding * 2 : 0;

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden pointer-events-auto transition-opacity duration-300 ${className}`}
      data-testid="cosmo-tour-spotlight-overlay"
      aria-modal="true"
      role="dialog"
    >
      {/* Clickable Backdrop Dismiss Layer */}
      <div
        className="absolute inset-0 bg-[#031717]/80 backdrop-blur-[2px] transition-opacity"
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Spotlight Ring Cutout */}
      {rect && (
        <div
          className="absolute transition-all duration-300 ease-out pointer-events-none"
          style={{
            top: spotlightTop,
            left: spotlightLeft,
            width: spotlightWidth,
            height: spotlightHeight,
            borderRadius: `${borderRadius}px`,
            boxShadow: `
              0 0 0 9999px rgba(3, 23, 23, 0.78),
              0 0 28px 4px rgba(42, 195, 187, 0.85),
              inset 0 0 20px 2px rgba(42, 195, 187, 0.4)
            `,
            border: '2px solid #2AC3BB',
          }}
          data-testid="cosmo-spotlight-ring"
        >
          {/* Subtle Outer Pulsing Wave */}
          <div
            className="absolute -inset-1.5 rounded-[20px] border border-[#2AC3BB]/60 animate-ping pointer-events-none"
            style={{ animationDuration: '2.5s' }}
          />

          {/* Coral Corner Accent Spark */}
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#EE8361] rounded-full shadow-[0_0_8px_#EE8361]" />
        </div>
      )}

      {/* Floating Children (Cosmo Mascot + Dialogue Bubble Anchored) */}
      {children && (
        <div
          className="relative z-10 w-full h-full pointer-events-auto flex items-center justify-center p-4"
          onClick={(e) => {
            // Prevent clicks inside child container from dismissing backdrop
            e.stopPropagation();
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default CosmoTourSpotlight;
