import React from 'react';
import gsap from 'gsap';
import { ArrowLeft, ArrowRight, Home, Sparkles } from 'lucide-react';

interface NotFoundProps {
  lang?: 'ar' | 'en';
  onGoHome?: () => void;
}

export default function NotFound({ lang = 'ar', onGoHome }: NotFoundProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const textRef = React.useRef<HTMLParagraphElement>(null);
  const actionsRef = React.useRef<HTMLDivElement>(null);
  const isAr = lang === 'ar';

  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const digits = gsap.utils.toArray<HTMLElement>('.nf-digit');
      gsap.set([titleRef.current, textRef.current, actionsRef.current], { opacity: 0, y: 18 });
      gsap.set(digits, { opacity: 0, y: 24, rotateX: -28 });
      if (reduced) {
        gsap.set([titleRef.current, textRef.current, actionsRef.current], { opacity: 1, y: 0 });
        gsap.set(digits, { opacity: 1, y: 0, rotateX: 0 });
        return;
      }
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .to(digits, { opacity: 1, y: 0, rotateX: 0, duration: 0.7, stagger: 0.11 })
        .to(titleRef.current, { opacity: 1, y: 0, duration: 0.6 }, '-=.25')
        .to(textRef.current, { opacity: 1, y: 0, duration: 0.5 }, '-=.25')
        .to(actionsRef.current, { opacity: 1, y: 0, duration: 0.45 }, '-=.18');
      gsap.to('.nf-digit', { y: -7, duration: 2.6, repeat: -1, yoyo: true, stagger: 0.18, ease: 'sine.inOut' });
      gsap.to('.nf-signal', { scaleX: 1.45, opacity: 0.35, duration: 2.2, repeat: -1, yoyo: true, stagger: 0.12, ease: 'sine.inOut' });
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
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_70%_35%,#28134b_0%,#0c0b1e_44%,#05050b_100%)]" />
      <div className="absolute -left-24 top-1/3 -z-10 h-72 w-72 rounded-full bg-fuchsia-700/10 blur-[110px]" />
      <div className="absolute -right-20 bottom-0 -z-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="nf-scan pointer-events-none absolute -left-1/3 top-0 -z-10 h-full w-1/4 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/[.045] to-transparent" />

      <section className="relative w-full max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
          <div className="order-2 text-center lg:order-1 lg:text-right">
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[.035] px-4 py-2 text-[10px] font-bold uppercase tracking-[.28em] text-cyan-200/70 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
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
            <div className="relative w-[min(88vw,470px)] py-10">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/15 blur-3xl" />
              <div className="relative flex items-center justify-center gap-2 sm:gap-4" aria-label="404">
                {['4', '0', '4'].map((digit, index) => (
                  <span key={`${digit}-${index}`} className="nf-digit flex aspect-[.72] w-[clamp(4.5rem,18vw,8rem)] items-center justify-center rounded-[1.2rem] border border-white/15 bg-gradient-to-b from-white/[.16] to-white/[.035] font-mono text-[clamp(5.5rem,18vw,10rem)] font-black leading-none text-transparent bg-clip-text shadow-[inset_0_1px_0_rgba(255,255,255,.16),0_18px_60px_rgba(139,92,246,.18)] backdrop-blur-sm" style={{ backgroundImage: index === 1 ? 'linear-gradient(180deg, #67e8f9 0%, #a78bfa 48%, #f9a8d4 100%)' : 'linear-gradient(180deg, #ffffff 0%, #e9d5ff 46%, #67e8f9 100%)' }}>{digit}</span>
                ))}
              </div>
              <div className="mt-7 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[.45em] text-white/35">
                <span className="nf-signal h-px w-10 bg-cyan-300/60" />
                <span>signal lost</span>
                <span className="nf-signal h-px w-10 bg-fuchsia-300/60" />
              </div>
              <div className="mt-6 grid grid-cols-5 gap-2 opacity-50">
                {[1, 2, 3, 4, 5].map((item) => <span key={item} className="nf-signal h-1 rounded-full bg-gradient-to-r from-cyan-300 to-fuchsia-300" />)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
