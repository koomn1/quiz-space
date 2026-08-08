import React from 'react';
import gsap from 'gsap';
import { ArrowLeft, ArrowRight, Compass, Home, Sparkles } from 'lucide-react';

interface NotFoundProps {
  lang?: 'ar' | 'en';
  onGoHome?: () => void;
}

const orbitWords = ['LOST', '404', 'QUIZSPACE', '404', 'LOST', '404'];

export default function NotFound({ lang = 'ar', onGoHome }: NotFoundProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const ringRef = React.useRef<HTMLDivElement>(null);
  const glyphsRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const subtitleRef = React.useRef<HTMLParagraphElement>(null);
  const ctaRef = React.useRef<HTMLDivElement>(null);
  const isAr = lang === 'ar';

  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      gsap.set([titleRef.current, subtitleRef.current, ctaRef.current], { opacity: 0, y: 24 });
      gsap.set(glyphsRef.current?.children || [], { opacity: 0, scale: 0.7, rotation: -18 });

      if (reduceMotion) {
        gsap.set([titleRef.current, subtitleRef.current, ctaRef.current], { opacity: 1, y: 0 });
        gsap.set(glyphsRef.current?.children || [], { opacity: 0.42, scale: 1, rotation: 0 });
        return;
      }

      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .to(glyphsRef.current?.children || [], { opacity: 0.42, scale: 1, rotation: 0, duration: 0.75, stagger: 0.08 })
        .to(titleRef.current, { opacity: 1, y: 0, duration: 0.7 }, '-=0.28')
        .to(subtitleRef.current, { opacity: 1, y: 0, duration: 0.55 }, '-=0.35')
        .to(ctaRef.current, { opacity: 1, y: 0, duration: 0.45 }, '-=0.25');

      gsap.to(ringRef.current, { rotation: 360, duration: 28, repeat: -1, ease: 'none' });
      gsap.to(glyphsRef.current?.children || [], {
        rotation: '+=360',
        duration: 18,
        repeat: -1,
        ease: 'none',
        stagger: { each: 1.2, repeat: -1 },
      });
      gsap.to(glyphsRef.current?.children || [], {
        color: 'random([#8b5cf6,#22d3ee,#f472b6,#fbbf24,#a78bfa])',
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        stagger: 0.35,
        ease: 'sine.inOut',
      });
      gsap.to(root, { '--glow-x': '62%', '--glow-y': '42%', duration: 5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }, root);

    return () => ctx.revert();
  }, []);

  const handleHome = () => {
    if (onGoHome) {
      onGoHome();
      return;
    }
    const base = import.meta.env.BASE_URL || '/';
    window.location.assign(base);
  };

  return (
    <main ref={rootRef} dir={isAr ? 'rtl' : 'ltr'} className="quizspace-404 relative isolate flex min-h-[calc(100vh-5rem)] w-full items-center justify-center overflow-hidden px-5 py-16 text-white">
      <div className="absolute inset-0 -z-20 bg-[#030014]" />
      <div className="absolute inset-0 -z-10 opacity-70 [background-image:radial-gradient(circle_at_var(--glow-x,50%)_var(--glow-y,40%),rgba(109,40,217,.34),transparent_32%),radial-gradient(circle_at_15%_85%,rgba(8,145,178,.18),transparent_28%)]" />
      <div className="absolute inset-0 -z-10 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="pointer-events-none absolute left-[8%] top-[16%] h-1 w-1 rounded-full bg-cyan-200 shadow-[0_0_18px_5px_rgba(103,232,249,.75)]" />
      <div className="pointer-events-none absolute right-[14%] top-[28%] h-1.5 w-1.5 rounded-full bg-fuchsia-300 shadow-[0_0_22px_6px_rgba(244,114,182,.7)]" />
      <div className="pointer-events-none absolute bottom-[17%] left-[22%] h-1 w-1 rounded-full bg-violet-200 shadow-[0_0_16px_4px_rgba(196,181,253,.8)]" />

      <section className="relative flex w-full max-w-5xl flex-col items-center text-center">
        <div className="relative mb-8 h-64 w-64 sm:h-80 sm:w-80">
          <div ref={ringRef} className="absolute inset-4 rounded-full border border-violet-300/25 [box-shadow:0_0_55px_rgba(124,58,237,.18),inset_0_0_55px_rgba(34,211,238,.12)]">
            <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_24px_8px_rgba(103,232,249,.65)]" />
            <span className="absolute -bottom-1 left-1/4 h-2 w-2 rounded-full bg-fuchsia-300 shadow-[0_0_18px_6px_rgba(244,114,182,.7)]" />
          </div>
          <div className="absolute inset-14 rounded-full border border-white/10 bg-white/[0.035] backdrop-blur-sm" />
          <div ref={glyphsRef} className="absolute inset-0">
            {orbitWords.map((word, index) => (
              <span key={`${word}-${index}`} className="absolute left-1/2 top-1/2 origin-[0_0] font-mono text-[10px] font-bold tracking-[0.38em] text-violet-200/70" style={{ transform: `rotate(${index * 60}deg) translateX(112px)` }}>
                {word}
              </span>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[clamp(5rem,17vw,9rem)] font-black leading-none tracking-[-.16em] text-transparent [background:linear-gradient(135deg,#f0abfc_0%,#8b5cf6_42%,#22d3ee_100%)] bg-clip-text">404</span>
            <span className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.42em] text-cyan-200/75"><Sparkles size={11} /> signal lost</span>
          </div>
        </div>

        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.35em] text-violet-200/65"><Compass size={14} /> {isAr ? 'إحداثيات غير معروفة' : 'unknown coordinates'}</p>
        <h1 ref={titleRef} className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-5xl">{isAr ? 'الصفحة خرجت من المدار' : 'This page drifted out of orbit'}</h1>
        <p ref={subtitleRef} className="mt-5 max-w-xl text-sm leading-8 text-slate-300/75 sm:text-base">{isAr ? 'الرابط الذي وصلت إليه غير موجود، لكن رحلتك داخل QuizSpace لم تنتهِ. ارجع إلى المسار الرئيسي واستكشف شيئاً جديداً.' : 'The coordinates you entered do not exist, but your QuizSpace journey is still on. Return to the main orbit and discover something new.'}</p>
        <div ref={ctaRef} className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={handleHome} className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-950 shadow-[0_12px_40px_rgba(139,92,246,.3)] transition duration-200 hover:-translate-y-0.5 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-cyan-300 active:scale-[.97]">
            <Home size={16} /> {isAr ? 'العودة للرئيسية' : 'Return home'}
            {isAr ? <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> : <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
          </button>
          <button type="button" onClick={() => window.history.back()} className="rounded-full border border-white/15 bg-white/[.05] px-6 py-3 text-sm font-semibold text-white/80 backdrop-blur transition duration-200 hover:border-cyan-300/50 hover:bg-white/[.1] focus:outline-none focus:ring-2 focus:ring-cyan-300 active:scale-[.97]">{isAr ? 'العودة خطوة' : 'Go back'}</button>
        </div>
      </section>
    </main>
  );
}
