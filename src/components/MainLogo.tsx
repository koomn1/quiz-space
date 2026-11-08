import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface MainLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const sizeMap = {
  sm: { image: 'h-9 w-9', text: 'text-lg sm:text-xl', gap: 'gap-1.5' },
  md: { image: 'h-12 w-12', text: 'text-2xl', gap: 'gap-2' },
  lg: { image: 'h-16 w-16', text: 'text-3xl sm:text-4xl', gap: 'gap-2.5' },
  xl: { image: 'h-24 w-24', text: 'text-4xl sm:text-5xl', gap: 'gap-3' },
};

const logoLetters = 'QuizSpace'.split('');

/** Official QuizSpace mark with an animated, accessible wordmark. */
export const MainLogo = ({ className = '', size = 'md', showText = true }: MainLogoProps) => {
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  const source = `${baseUrl}brand/quizspace-logo-512.webp`;
  const currentSize = sizeMap[size];
  const rootRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<HTMLSpanElement[]>([]);

  useGSAP(() => {
    const letters = lettersRef.current.filter(Boolean);
    if (!showText || letters.length === 0) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      gsap.set(letters, { clearProps: 'all', opacity: 1 });
      return;
    }

    const entrance = gsap.timeline({ defaults: { transformOrigin: '50% 50% -8px' } });
    entrance.fromTo(
      letters,
      { opacity: 0, y: 18, scale: 0.45, rotationY: 180, rotationZ: -12 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        rotationY: 0,
        rotationZ: 0,
        duration: 0.72,
        ease: 'back.out(1.7)',
        stagger: 0.055,
      },
    );

    const float = gsap.to(letters, {
      y: -2,
      rotationZ: 1.5,
      duration: 2.4,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      stagger: { each: 0.06, from: 'center' },
      delay: 0.85,
    });

    return () => {
      entrance.kill();
      float.kill();
    };
  }, { scope: rootRef, dependencies: [showText] });

  return (
    <div
      ref={rootRef}
      className={`inline-flex items-center select-none cursor-pointer group ${currentSize.gap} ${className}`}
      aria-label="QuizSpace"
    >
      <img
        src={source}
        alt="QuizSpace"
        width={96}
        height={96}
        className={`${currentSize.image} shrink-0 object-contain transition-transform duration-300 group-hover:scale-[1.06]`}
        draggable={false}
      />
      {showText && (
        <span
          className={`inline-flex items-baseline whitespace-nowrap font-display font-black tracking-tight ${currentSize.text} [perspective:600px]`}
          aria-hidden="true"
        >
          {logoLetters.map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              ref={(element) => {
                if (element) lettersRef.current[index] = element;
              }}
              className={index < 4
                ? 'text-slate-800 transition-colors duration-300 dark:text-white'
                : 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 transition-colors duration-300 group-hover:from-indigo-400 group-hover:to-fuchsia-500'}
              style={{ display: 'inline-block', willChange: 'transform, opacity' }}
            >
              {letter}
            </span>
          ))}
        </span>
      )}
    </div>
  );
};
