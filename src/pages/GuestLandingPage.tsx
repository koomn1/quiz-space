import React from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  Mail,
  MessageCircle,
  Phone,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MainLogo } from '../components/MainLogo';
import BlurText from '../components/reactbits/BlurText';
import DecryptedText from '../components/reactbits/DecryptedText';
import GradientText from '../components/reactbits/GradientText';
import LogoLoop from '../components/reactbits/LogoLoop';
import SpotlightCard from '../components/reactbits/SpotlightCard';
import MagneticButton from '../components/reactbits/MagneticButton';
import CircularText from '../components/reactbits/CircularText';

gsap.registerPlugin(ScrollTrigger);

interface GuestLandingPageProps {
  lang: 'ar' | 'en';
  onLogin: () => void;
  onExplore: () => void;
  onSupport: () => void;
}

const productAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
const sticker = (code: string) => productAsset(`/whiteboard/stickers/${code}.svg`);

const ORBIT_OUTER = ['1F3C6', '1F9E0', '26A1', '1F4DA', '2728', '1F3AF'];
const ORBIT_INNER = ['1F525', '2B50', '1F9EA'];

function useIsDark(): boolean {
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains('dark'));
  React.useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export default function GuestLandingPage({ lang, onLogin, onExplore }: GuestLandingPageProps) {
  const isAr = lang === 'ar';
  const isDark = useIsDark();
  const rootRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const ctx = gsap.context(() => {
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
  const headline = isAr ? 'تعلّم. نافس. تصدّر المدار.' : 'Learn. Compete. Own your orbit.';
  const eyebrow = isAr ? 'مساحة منظمة للتعلم والاختبارات والتقدم' : 'A focused home for learning, quizzes, and progress';

  const highlights = [
    {
      titleAr: 'الرئيسية والمتابعة اليومية',
      titleEn: 'Home and Daily Progress',
      descriptionAr: 'تابع اختباراتك، اكتشف المحتوى الجديد، وابدأ يومك من لوحة واحدة واضحة ومباشرة على الشاشة.',
      descriptionEn: 'Follow your quizzes, discover fresh content, and start from one fluid dashboard directly on the canvas.',
      image: productAsset('/showcase/home-dashboard.webp'),
      imageAlt: isAr ? 'لقطة من الصفحة الرئيسية في QuizSpace' : 'QuizSpace home dashboard screenshot',
      stickerCode: '1F4BB',
    },
    {
      titleAr: 'إنشاء اختبارات منظمة',
      titleEn: 'Structured Quiz Creation',
      descriptionAr: 'حوّل أفكارك ومصادرك إلى اختبارات جاهزة للمشاركة مع الطلاب في خطوات واضحة.',
      descriptionEn: 'Turn ideas and sources into share-ready student quizzes through clear steps.',
      image: productAsset('/showcase/quiz-creator.png'),
      imageAlt: isAr ? 'لقطة حقيقية من صفحة إنشاء الاختبارات في QuizSpace' : 'Real QuizSpace quiz creation screen screenshot',
      stickerCode: '1F4DA',
    },
    {
      titleAr: 'التحديات اليومية',
      titleEn: 'Daily Challenges',
      descriptionAr: 'ادخل تحديات منظمة تساعدك على الحفاظ على الاستمرارية والعودة للتعلم كل يوم.',
      descriptionEn: 'Join structured challenges that help you stay consistent and return to learning every day.',
      image: productAsset('/images/brain_challenge.webp'),
      imageAlt: isAr ? 'معاينة التحديات اليومية في QuizSpace' : 'QuizSpace daily challenges preview',
      stickerCode: '1F3AF',
    },
    {
      titleAr: 'الجوائز والتخصيص',
      titleEn: 'Rewards and Personalization',
      descriptionAr: 'اجمع نقاطك، فعّل مكافآتك، وخصص حسابك بعناصر تُظهر إنجازاتك.',
      descriptionEn: 'Collect points, unlock rewards, and personalize your account with achievement-based items.',
      image: productAsset('/images/lucky_wheel.webp'),
      imageAlt: isAr ? 'معاينة الجوائز داخل QuizSpace' : 'QuizSpace rewards preview',
      stickerCode: '1F3C6',
    },
  ];

  const marqueeWords = isAr
    ? ['اختبارات ذكية', 'تحديات يومية', 'جوائز ونقاط', 'متابعة تقدم', 'مشاركة مع الأصدقاء', 'تعلم ممتع']
    : ['Smart quizzes', 'Daily challenges', 'Points and rewards', 'Progress tracking', 'Share with friends', 'Learning that sticks'];

  const loopItems = marqueeWords.flatMap((word, i) => [
    { src: sticker(ORBIT_OUTER[i % ORBIT_OUTER.length]), alt: '', width: 30, height: 30 },
    { node: <span className="gl2-loop-word">{word}</span>, title: word },
  ]);

  return (
    <main
      ref={rootRef}
      className="guest-landing gl2 theme-page min-h-screen w-full max-w-[100vw] pb-20 select-none overflow-x-clip"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* ============ HERO: sticker orbit system ============ */}
      <section className="gl2-hero relative px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-10 max-w-6xl mx-auto text-center">
        <div className="gl2-stars" aria-hidden="true" />
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[340px] sm:w-[620px] h-[340px] sm:h-[440px] rounded-full bg-gradient-to-tr from-[#007472]/25 via-[#2AC3BB]/15 to-[#EE8361]/20 blur-[110px] pointer-events-none -z-10" />

        <div className="gl2-orbit relative mx-auto mb-8 h-44 w-44 sm:h-56 sm:w-56" aria-hidden="true">
          <div className="gl2-orbit__core">
            <MainLogo size="lg" showText={false} />
          </div>
          <div className="gl2-orbit__ring gl2-orbit__ring--outer">
            {ORBIT_OUTER.map((code, i) => (
              <span key={code} className="gl2-orbit__sat" style={{ '--sat-i': i, '--sat-n': ORBIT_OUTER.length } as React.CSSProperties}>
                <span className="gl2-orbit__sat-icon gl2-orbit__sat-icon--sticker" style={{ '--sat-i': i } as React.CSSProperties}>
                  <img src={sticker(code)} alt="" loading="eager" />
                </span>
              </span>
            ))}
          </div>
          <div className="gl2-orbit__ring gl2-orbit__ring--inner">
            {ORBIT_INNER.map((code, i) => (
              <span key={code} className="gl2-orbit__sat" style={{ '--sat-i': i, '--sat-n': ORBIT_INNER.length } as React.CSSProperties}>
                <span className="gl2-orbit__sat-icon gl2-orbit__sat-icon--sticker gl2-orbit__sat-icon--small" style={{ '--sat-i': i } as React.CSSProperties}>
                  <img src={sticker(code)} alt="" loading="eager" />
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 dark:bg-[#007472]/25 text-[#005f5d] dark:text-[#2AC3BB] text-xs font-black tracking-wide mb-6 backdrop-blur-md border border-[#007472]/25 dark:border-[#2AC3BB]/35 max-w-[92vw]">
          <img src={sticker('2728')} alt="" className="h-4 w-4 shrink-0" />
          <DecryptedText
            text={eyebrow}
            speed={36}
            maxIterations={14}
            sequential
            animateOn="view"
            characters={isAr ? 'أبتثجحخدذرزسشصضطظعغفقكلمنهوي0123456789' : undefined}
          />
        </div>

        <h1 className={`${displayFont} font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.25] max-w-4xl mx-auto text-slate-900 dark:text-[#FCF6EE]`}>
          <BlurText text={headline} animateBy="words" direction="top" />
        </h1>

        <p className="mt-6 text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
          {isAr
            ? 'QuizSpace يجمع الاختبارات، التحديات، والجوائز في تجربة واحدة مصممة للطلاب والمعلمين والمؤسسات — كل شيء يدور حول تقدمك.'
            : 'QuizSpace brings quizzes, challenges, and rewards into one experience for students, educators, and institutions — everything revolves around your progress.'}
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
          <MagneticButton
            type="button"
            onClick={onLogin}
            strength={0.3}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#007472] via-[#2AC3BB] to-[#EE8361] hover:brightness-110 text-white font-black text-sm px-8 py-3 shadow-xl shadow-[#007472]/30 transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EE8361]"
          >
            <span>{isAr ? 'أنشئ حسابك مجاناً' : 'Create a free account'}</span>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </MagneticButton>
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-slate-900 dark:text-[#FCF6EE] font-bold text-sm px-7 py-3 backdrop-blur-md border border-slate-200/80 dark:border-white/10 transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:focus-visible:outline-white"
          >
            <span>{isAr ? 'استكشف الاختبارات' : 'Explore quizzes'}</span>
          </button>
        </div>
      </section>

      {/* ============ React Bits LogoLoop: seamless sticker marquee ============ */}
      <section data-reveal dir="ltr" className="gl2-loop-band" aria-hidden="true">
        <LogoLoop
          logos={loopItems}
          speed={48}
          direction="left"
          width="100%"
          logoHeight={30}
          gap={44}
          pauseOnHover
          scaleOnHover
          fadeOut={false}
          ariaLabel={isAr ? 'مزايا المنصة' : 'Platform highlights'}
        />
      </section>

      {/* ============ Showcase: real screenshots in SpotlightCards ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14" data-reveal>
          <span className="text-xs font-black tracking-widest uppercase text-[#007472] dark:text-[#2AC3BB]">
            {isAr ? 'من داخل المنصة' : 'Inside the platform'}
          </span>
          <h2 className={`${displayFont} font-black text-2xl sm:text-4xl tracking-tight mt-2`}>
            <GradientText
              colors={['#007472', '#2AC3BB', '#EE8361', '#2AC3BB']}
              animationSpeed={9}
              className="font-black"
            >
              {isAr ? 'شاهد ما ستجده بعد تسجيل الدخول' : 'See what awaits after sign-in'}
            </GradientText>
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            {isAr
              ? 'هذه لقطات ومشاهد من أقسام QuizSpace الفعلية؛ الحساب المجاني يمنحك نقطة انطلاق واضحة، ويمكنك تطوير تجربتك وقتما تحتاج.'
              : 'These are real previews from QuizSpace. A free account gives you a clear start, with room to grow whenever you need.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
          {highlights.map((item) => (
            <SpotlightCard
              key={item.titleEn}
              theme={isDark ? 'dark' : 'light'}
              spotlightColor="rgba(42, 195, 187, 0.28)"
              data-reveal
              className="gl2-rb-card"
            >
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800/50 shadow-md ring-1 ring-black/5 dark:ring-white/10 mb-4">
                <img
                  src={item.image}
                  alt={item.imageAlt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="flex items-center gap-2 text-[#007472] dark:text-[#2AC3BB] mb-2">
                <img src={sticker(item.stickerCode)} alt="" className="h-6 w-6" />
                <span className="text-xs font-black">{isAr ? 'ميزة داخل المنصة' : 'In-product feature'}</span>
              </div>
              <h3 className={`${displayFont} font-black text-base sm:text-lg text-slate-900 dark:text-[#FCF6EE] leading-snug`}>
                {isAr ? item.titleAr : item.titleEn}
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {isAr ? item.descriptionAr : item.descriptionEn}
              </p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* ============ Gamification band with CircularText badge ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="gl2-band flex flex-col md:flex-row items-center justify-between gap-8 py-10 px-6 sm:px-10 rounded-3xl" data-reveal>
          <div className="gl2-band__badge" aria-hidden="true">
            <CircularText
              text="QUIZSPACE * DAILY WINS * "
              spinDuration={18}
              onHover="speedUp"
              size={104}
              fontSize={11}
              letterSpacing={2}
              color={isDark ? '#FCF6EE' : '#0f172a'}
            />
            <span className="gl2-band__badge-core"><img src={sticker('1F3C6')} alt="" className="h-7 w-7" /></span>
          </div>

          <div className="max-w-2xl text-center md:text-start">
            <div className="inline-flex items-center gap-2 text-[#EE8361] font-black text-xs mb-2">
              <img src={sticker('1F525')} alt="" className="h-4 w-4" />
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

          <MagneticButton
            type="button"
            onClick={onLogin}
            strength={0.3}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full font-black text-sm px-8 py-3 transition-all duration-200 active:scale-95 shadow-xl shadow-[#EE8361]/25 cursor-pointer shrink-0 bg-gradient-to-r from-[#007472] via-[#2AC3BB] to-[#EE8361] hover:brightness-110 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EE8361]"
          >
            <span>{isAr ? 'الدخول إلى المنصة' : 'Enter the platform'}</span>
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </MagneticButton>
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
