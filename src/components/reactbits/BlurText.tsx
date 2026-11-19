import React, { useEffect, useRef, useState } from 'react';

export interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  threshold?: number;
  rootMargin?: string;
}

export const BlurText: React.FC<BlurTextProps> = ({
  text = '',
  delay = 50,
  className = '',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
}) => {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <p ref={ref} className={`inline-flex flex-wrap ${className}`}>
      {elements.map((element, i) => (
        <span
          key={i}
          className="inline-block transition-all ease-out"
          style={{
            transitionDuration: '0.6s',
            transitionDelay: `${i * delay}ms`,
            filter: inView ? 'blur(0px)' : 'blur(10px)',
            opacity: inView ? 1 : 0,
            transform: inView
              ? 'translate3d(0,0,0)'
              : `translate3d(0, ${direction === 'top' ? '-18px' : '18px'}, 0)`,
          }}
        >
          {element === ' ' ? '\u00A0' : element}
          {animateBy === 'words' && i < elements.length - 1 && '\u00A0'}
        </span>
      ))}
    </p>
  );
};

export default BlurText;
