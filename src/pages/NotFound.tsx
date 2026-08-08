import React from 'react';
import gsap from 'gsap';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';

interface NotFoundProps {
  lang?: 'ar' | 'en';
  onGoHome?: () => void;
}

const orbitWords = ['LOST', '404', 'QUIZSPACE', 'SIGNAL', '404', 'LOST'];

export default function NotFound({ lang = 'ar', onGoHome }: NotFoundProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const orbitRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const textRef = React.useRef<HTMLParagraphElement>(null);
  const actionsRef = React.useRef<HTMLDivElement>(null);
  const isAr = lang === 'ar';

  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const letters = gsap.utils.toArray<HTMLElement>('.nf-orbit-word');
      gsap.set([titleRef.current, textRef.current, actionsRef.current], { opacity: 0, y: 18 });
      gsap.set(letters, { opacity: 0, scale: 0.7 });
      if (reduced) {
        gsap.set([titleRef.current, textRef.current, actionsRef.current], { opacity: 1, y: 0 });
        gsap.set(letters, { opacity: 0.55, scale: 1 });
        return;
      }
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .to(letters, { opacity: 0.58, scale: 1, duration: 0.8, stagger: 0.07 })
        .to(titleRef.current, { opacity: 1, y: 0, duration: 0.65 }, '-=.28')
        .to(textRef.current, { opacity: 1, y: 0, duration: 0.5 }, '-=.28')
        .to(actionsRef.current, { opacity: 1, y: 0, duration: 0.45 }, '-=.2');
      gsap.to(orbitRef.current, { rotation: 360, duration: 42, repeat: -1, ease: 'none' });
      gsap.to('.nf-pulse', { scale: 1.35, opacity: 0.25, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.nf-scan', { xPercent: 180, duration: 8, repeat: -1, ease: 'none', delay: 1 });
    }, root);
    return () => ctx.revert();
  }, []);

  const handleHome = () => {
    if (onGoHome) return onGoHome();
    window.location.assign(import.meta.env.BASE_URL || '/');
  };

  return (
    <main ref={rootRef} dir={isAr ? 'rtl' : 'ltr'} className="relative isolate flex min-h-[calc(100vh-5rem)] w-full items-center justify-center overflow-hidden bg-[#070711] px-5 py-16 text-white">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_50%_45%,#24134c_0%,#0c0b1e_42%,#05050b_100%)]" />
      <div className="absolute -left-24 top-1/3 -z-10 h-72 w-72 rounded-full bg-fuchsia-700/10 blur-[110px]" />
      <div className="absolute -right-20 bottom-0 -z-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="nf-scan pointer-events-none absolute -left-1/3 top-0 -z-10 h-full w-1/4 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/[.045] to-transparent" />

      <section className="relative w-full max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
          <div className="order-2 text-center lg:order-1 lg:text-right">
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[.035] px-4 py-2 text-[10px] font-bold uppercase tracking-[.28em] text-cyan-200/70 backdrop-blur-md">
              <span className="nf-pulse h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_5px_rgba(103,232,249,.6)]" />
              404 · {isAr ? 'إحداثيات غير معروفة' : 'unknown coordinates'}
            </div>
            <h1 ref={titleRef} className="max-w-2xl text-4xl font-black leading-[1.2] tracking-[-.04em] text-white sm:text-6xl">{isAr ? 'الصفحة خرجت من المدار' : 'This page drifted out of orbit'}</h1>
            <p ref={textRef} className="mt-6 max-w-xl text-sm leading-8 text-slate-300/70 sm:text-base">{isAr ? 'الرابط الذي وصلت إليه غير موجود، لكن رحلتك داخل QuizSpace لم تنتهِ. ارجع إلى المسار الرئيسي واستكشف شيئاً جديداً.' : 'The coordinates you entered do not exist, but your QuizSpace journey is still on. Return to the main orbit and discover something new.'}</p>
            <div ref={actionsRef} className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <button type="button" onClick={handleHome} className="group inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#11101c] shadow-[0_16px_45px_rgba(139,92,246,.24)] transition hover:-translate-y-1 hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300">
                <Home size={16} /> {isAr ? 'العودة للرئيسية' : 'Return home'}
                {isAr ? <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> : <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
              </button>
              <button type="button" onClick={() => window.history.back()} className="rounded-2xl border border-white/15 bg-white/[.035] px-5 py-3 text-sm font-bold text-white/75 backdrop-blur-md transition hover:-translate-y-1 hover:border-white/35 hover:bg-white/[.08]">{isAr ? 'العودة خطوة' : 'Go back'}</button>
            </div>
          </div>

          <div className="order-1 flex justify-center lg:order-2">
            <div className="relative aspect-square w-[min(82vw,430px)]">
              <div className="absolute inset-[8%] rounded-full border border-white/10 bg-white/[.025] shadow-[inset_0_0_80px_rgba(139,92,246,.12),0_0_90px_rgba(34,211,238,.08)] backdrop-blur-sm" />
              <div ref={orbitRef} className="absolute inset-[3%] rounded-full border border-dashed border-violet-300/25">
                <span className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_25px_7px_rgba(103,232,249,.55)]" />
                <span className="absolute bottom-[12%] right-[4%] h-2 w-2 rounded-full bg-fuchsia-300 shadow-[0_0_18px_6px_rgba(244,114,182,.55)]" />
                {orbitWords.map((word, index) => <span key={`${word}-${index}`} className="nf-orbit-word absolute left-1/2 top-1/2 origin-[0_0] font-mono text-[9px] font-bold tracking-[.3em] text-violet-200/70" style={{ transform: `rotate(${index * 60}deg) translateX(145px)` }}>{word}</span>)}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="relative">
                  <span className="absolute -inset-5 rounded-full bg-violet-500/20 blur-2xl" />
                  <span className="relative block bg-gradient-to-br from-white via-fuchsia-200 to-cyan-300 bg-clip-text font-mono text-[clamp(7rem,20vw,12rem)] font-black leading-none tracking-[-.17em] text-transparent">404</span>
                </div>
                <span className="mt-5 text-[10px] font-bold uppercase tracking-[.5em] text-white/35">signal lost</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
