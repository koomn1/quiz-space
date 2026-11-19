import React, { useEffect, useRef, useState } from 'react';

export interface CountUpProps {
  to: number;
  from?: number;
  direction?: 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  startWhen = true,
  separator = ',',
  decimals = 0,
  prefix = '',
  suffix = '',
}) => {
  const [value, setValue] = useState(from);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!startWhen) return;

    let startTime: number | null = null;
    let animationFrameId: number;

    const startVal = direction === 'down' ? to : from;
    const endVal = direction === 'down' ? from : to;

    const timeoutId = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
        // easeOutExpo
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = startVal + (endVal - startVal) * easeProgress;

        setValue(current);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(step);
        } else {
          setValue(endVal);
        }
      };

      animationFrameId = requestAnimationFrame(step);
    }, delay * 1000);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(animationFrameId);
    };
  }, [to, from, direction, delay, duration, startWhen]);

  const formattedNumber = Number(value.toFixed(decimals))
    .toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    .replace(/,/g, separator);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formattedNumber}
      {suffix}
    </span>
  );
};

export default CountUp;
