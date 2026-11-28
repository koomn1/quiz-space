import React from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  ChevronLeft,
  Gift,
  Mail,
  MessageCircle,
  Phone,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MainLogo } from '../components/MainLogo';

gsap.registerPlugin(ScrollTrigger);

interface GuestLandingPageProps {
  lang: 'ar' | 'en';
  onLogin: () => void;
  onExplore: () => void;
  onSupport: () => void;
}

const productAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

const ORBIT_ICONS = [Trophy, Brain, Zap, CheckCircle2, Sparkles, Gift];

export default function GuestLandingPage({ lang, onLogin, onExplore }: GuestLandingPageProps) {
  const isAr = lang === 'ar';
  const rootRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.gl2-hero-el', {
        y: 44,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.12,
        clearProps: 'transform,opacity',
      });
      gsap.from('.gl2-orbit', {
        scale: 0.6,
        opacity: 0,
        duration: 1.2,
        ease: 'back.out(1.4)',
        delay: 0.15,
        clearProps: 'transform,opacity',
      });
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          y: 56,
          opacity: 0,
          duration: 0.85,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const displayFont = isAr ? 'gl2-display-ar' : 'gl2-display-en';

  const highlights = [
    {
      titleAr: 'الرئيسية والمتابعة اليومية',
      titleEn: 'Home and Daily Progress',
      descriptionAr: 'تابع اختباراتك، اكتشف المحتوى الجديد، وابدأ يومك من لوحة واحدة واضحة ومباشرة على الشاشة.',
      descriptionEn: 'Follow your quizzes, discover fresh content, and start from one fluid dashboard directly on the canvas.',
      image: productAsset('/showcase/home-dashboard.webp'),
      imageAlt: isAr ? 'لقطة من الصفحة الرئيسية في QuizSpace' : 'QuizSpace home dashboard screenshot',
      icon: BookOpenCheck,
    },
    {
      titleAr: 'إنشاء اختبارات منظمة',
      titleEn: 'Structured Quiz Creation',
      descriptionAr: 'حوّل أفكارك ومصادرك إلى اختبارات جاهزة للمشاركة مع الطلاب في خطوات واضحة.',
      descriptionEn: 'Turn ideas and sources into share-ready student quizzes through clear steps.',
      image: productAsset('/showcase/quiz-creator.png'),
      imageAlt: isAr ? 'لقطة حقيقية من صفحة إنشاء الاختبارات في QuizSpace' : 'Real QuizSpace quiz creation screen screenshot',
      icon: CheckCircle2,
    },
    {
      titleAr: 'التحديات اليومية',
      titleEn: 'Daily Challenges',
      descriptionAr: 'ادخل تحديات منظمة تساعدك على الحفاظ على الاستمرارية والعودة للتعلم كل يوم.',
      descriptionEn: 'Join structured challenges that help you stay consistent and return to learning every day.',
      image: productAsset('/images/brain_challenge.webp'),
      imageAlt: isAr ? 'معاينة التحديات اليومية في QuizSpace' : 'QuizSpace daily challenges preview',
      icon: Trophy,
    },
    {
      titleAr: 'الجوائز والتخصيص',
      titleEn: 'Rewards and Personalization',
      descriptionAr: 'اجمع نقاطك، فعّل مكافآتك، وخصص حسابك بعناصر تُظهر إنجازاتك.',
      descriptionEn: 'Collect points, unlock rewards, and personalize your account with achievement-based items.',
      image: productAsset('/images/lucky_wheel.webp'),
      imageAlt: isAr ? 'معاينة الجوائز داخل QuizSpace' : 'QuizSpace rewards preview',
      icon: Gift,
    },
  ];

  const marqueeWords = isAr
    ? ['اختبارات ذكية', 'تحديات يومية', 'جوائز ونقاط', 'متابعة تقدم', 'مشاركة مع الأصدقاء', 'تعلم ممتع']
    : ['Smart quizzes', 'Daily challenges', 'Points and rewards', 'Progress tracking', 'Share with friends', 'Learning that sticks'];

  return (
    <main
      ref={rootRef}
      className="guest-landing gl2 theme-page min-h-screen w-full pb-20 select-none overflow-x-hidden"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* ============ HERO: orbit system ============ */}
      <section className="gl2-hero relative px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-10 max-w-6xl mx-auto text-center">
        <div className="gl2-stars" aria-hidden="true" />
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[340px] sm:w-[620px] h-[340px] sm:h-[440px] rounded-full bg-gradient-to-tr from-[#007472]/25 via-[#2AC3BB]/15 to-[#EE8361]/20 blur-[110px] pointer-events-none -z-10" />

        {/* Orbit system */}
        <div className="gl2-orbit relative mx-auto mb-8 h-44 w-44 sm:h-56 sm:w-56" aria-hidden="true">
          <div className="gl2-orbit__core">
            <MainLogo size="lg" showText={false} />
          </div>
          <div className="gl2-orbit__ring gl2-orbit__ring--outer">
            {ORBIT_ICONS.map((Icon, i) => (
              <span key={i} className="gl2-orbit__sat" style={{ '--sat-i': i, '--sat-n': ORBIT_ICONS.length } as React.CSSProperties}>
                <span className="gl2-orbit__sat-icon"><Icon className="h-4 w-4" /></span>
              </span>
            ))}
          </div>
          <div className="gl2-orbit__ring gl2-orbit__ring--inner">
            <span className="gl2-orbit__sat" style={{ '--sat-i': 0, '--sat-n': 3 } as React.CSSProperties}>
              <span className="gl2-orbit__sat-icon gl2-orbit__sat-icon--coral"><Sparkles className="h-3.5 w-3.5" /></span>
            </span>
            <span className="gl2-orbit__sat" style={{ '--sat-i': 1, '--sat-n': 3 } as React.CSSProperties}>
              <span className="gl2-orbit__sat-icon gl2-orbit__sat-icon--coral"><Zap className="h-3.5 w-3.5" /></span>
            </span>
            <span className="gl2-orbit__sat" style={{ '--sat-i': 2, '--sat-n': 3 } as React.CSSProperties}>
              <span className="gl2-orbit__sat-icon gl2-orbit__sat-icon--coral"><Trophy className="h-3.5 w-3.5" /></span>
            </span>
          </div>
        </div>

        <div className="gl2-hero-el inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 dark:bg-[#007472]/25 text-[#005f5d] dark:text-[#2AC3BB] text-xs font-black tracking-wide mb-6 backdrop-blur-md border border-[#007472]/25 dark:border-[#2AC3BB]/35">
          <Sparkles className="w-3.5 h-3.5 text-[#EE8361] animate-pulse" />
          <span>{isAr ? 'مساحة منظمة للتعلم والاختبارات والتقدم' : 'A focused home for learning, quizzes, and progress'}</span>
        </div>

        <h1 className={`gl2-hero-el ${displayFont} font-black text-4xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.15] max-w-4xl mx-auto`}>
          <span className="gl2-gradient-text">
            {isAr ? 'تعلّم. نافس. تصدّر المدار.' : 'Learn. Compete. Own your orbit.'}
          </span>
        </h1>

        <p className="gl2-hero-el mt-6 text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
          {isAr
            ? 'QuizSpace يجمع الاختبارات، التحديات، والجوائز في تجربة واحدة مصممة للطلاب والمعلمين والمؤسسات — كل شيء يدور حول تقدمك.'
            : 'QuizSpace brings quizzes, challenges, and rewards into one experience for students, educators, and institutions — everything revolves around your progress.'}
        </p>

        <div className="gl2-hero-el mt-9 flex flex-wrap items-center justify-center gap-3.5">
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#007472] via-[#2AC3BB] to-[#EE8361] hover:brightness-110 text-white font-black text-sm px-8 py-3 shadow-xl shadow-[#007472]/30 transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EE8361]"
          >
            <span>{isAr ? 'أنشئ حسابك مجاناً' : 'Create a free account'}</span>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-slate-900 dark:text-[#FCF6EE] font-bold text-sm px-7 py-3 backdrop-blur-md border border-slate-200/80 dark:border-white/10 transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:focus-visible:outline-white"
          >
            <span>{isAr ? 'استكشف الاختبارات' : 'Explore quizzes'}</span>
          </button>
        </div>
      </section>

      {/* ============ Marquee ============ */}
      <section className="gl2-marquee-band" data-reveal aria-hidden="true">
        <div className="gl2-marquee">
          {[0, 1].map((copy) => (
            <div key={copy} className="gl2-marquee__track">
              {marqueeWords.map((w) => (
                <span key={`${copy}-${w}`} className="gl2-marquee__word">
                  <Sparkles className="h-3 w-3 text-[#EE8361]" />
                  {w}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ============ Showcase: real screenshots, spotlight cards ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14" data-reveal>
          <span className="text-xs font-black tracking-widest uppercase text-[#007472] dark:text-[#2AC3BB]">
            {isAr ? 'من داخل المنصة' : 'Inside the platform'}
          </span>
          <h2 className={`${displayFont} font-black text-2xl sm:text-4xl text-slate-900 dark:text-[#FCF6EE] tracking-tight mt-2`}>
            {isAr ? 'شاهد ما ستجده بعد تسجيل الدخول' : 'See what awaits after sign-in'}
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            {isAr
              ? 'هذه لقطات ومشاهد من أقسام QuizSpace الفعلية؛ الحساب المجاني يمنحك نقطة انطلاق واضحة، ويمكنك تطوير تجربتك وقتما تحتاج.'
              : 'These are real previews from QuizSpace. A free account gives you a clear start, with room to grow whenever you need.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.titleEn} className="gl2-card group" data-reveal>
                <div className="gl2-card__glow" aria-hidden="true" />
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800/50 shadow-md ring-1 ring-black/5 dark:ring-white/10 mb-4">
                  <img
                    src={item.image}
                    alt={item.imageAlt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 group-hover:rotate-[0.6deg]"
                  />
                </div>
                <div className="flex items-center gap-2 text-[#007472] dark:text-[#2AC3BB] mb-2">
                  <span className="gl2-card__icon"><Icon className="h-4 w-4" /></span>
                  <span className="text-xs font-black">{isAr ? 'ميزة داخل المنصة' : 'In-product feature'}</span>
                </div>
                <h3 className={`${displayFont} font-black text-base sm:text-lg text-slate-900 dark:text-[#FCF6EE] leading-snug`}>
                  {isAr ? item.titleAr : item.titleEn}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {isAr ? item.descriptionAr : item.descriptionEn}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ Gamification band with spinning badge ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="gl2-band flex flex-col md:flex-row items-center justify-between gap-8 py-10 px-6 sm:px-10 rounded-3xl" data-reveal>
          <div className="gl2-band__badge" aria-hidden="true">
            <svg viewBox="0 0 100 100" className="gl2-band__badge-text h-full w-full">
              <defs>
                <path id="gl2-circle" d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
              </defs>
              <text className="gl2-band__badge-svg" style={{ direction: 'ltr' }}>
                <textPath href="#gl2-circle">
                  {isAr ? 'QUIZSPACE • DAILY WINS • QUIZSPACE • DAILY WINS • ' : 'QUIZSPACE • DAILY WINS • QUIZSPACE • DAILY WINS • '}
                </textPath>
              </text>
            </svg>
            <span className="gl2-band__badge-core"><Gift className="h-6 w-6" /></span>
          </div>

          <div className="max-w-2xl text-center md:text-start">
            <div className="inline-flex items-center gap-2 text-[#EE8361] font-black text-xs mb-2">
              <Gift className="h-4 w-4" />
              <span>{isAr ? 'التقدم له قيمة' : 'Progress has value'}</span>
            </div>
            <h2 className={`${displayFont} font-black text-2xl sm:text-3xl text-slate-900 dark:text-[#FCF6EE] tracking-tight`}>
              {isAr ? 'حوّل التعلم اليومي إلى إنجازات ملموسة.' : 'Turn everyday learning into measurable wins.'}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              {isAr
                ? 'سجّل دخولك لمتابعة التحديات، رصيد الجوائز، ونشاط حسابك من مكان واحد.'
                : 'Sign in to follow challenges, rewards, and your account activity from one place.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onLogin}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full font-black text-sm px-8 py-3 transition-all duration-200 active:scale-95 shadow-xl shadow-[#EE8361]/25 cursor-pointer shrink-0 bg-gradient-to-r from-[#007472] via-[#2AC3BB] to-[#EE8361] hover:brightness-110 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EE8361]"
          >
            <span>{isAr ? 'الدخول إلى المنصة' : 'Enter the platform'}</span>
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>
      </section>

      {/* ============ Contact strip ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8" data-reveal>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-6 border-t border-black/5 dark:border-white/10 text-center md:text-start">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <MainLogo size="sm" showText={true} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {isAr
                ? 'هل تحتاج إلى مساعدة قبل البدء؟ فريق الدعم جاهز لمساعدتك.'
                : 'Need help before getting started? Our support team is ready.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:youssefbadawy5002@gmail.com"
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>{isAr ? 'البريد الإلكتروني' : 'Email'}</span>
            </a>
            <a
              href="tel:01018995002"
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>{isAr ? 'اتصل بالدعم' : 'Call support'}</span>
            </a>
            <a
              href="https://wa.me/201018995002"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-xs font-black text-white transition-colors shadow-sm"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
