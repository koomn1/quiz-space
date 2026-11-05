import React from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  Gift,
  Mail,
  MessageCircle,
  Phone,
  Trophy,
  Sparkles,
  Zap,
} from 'lucide-react';
import { MainLogo } from '../components/MainLogo';
import { Button } from '../ios27/components/Button';

interface GuestLandingPageProps {
  lang: 'ar' | 'en';
  onLogin: () => void;
  onExplore: () => void;
  onSupport: () => void;
}

const productAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export default function GuestLandingPage({ lang, onLogin, onExplore, onSupport }: GuestLandingPageProps) {
  const isAr = lang === 'ar';

  const highlights = [
    {
      titleAr: 'الرئيسية والمتابعة اليومية',
      titleEn: 'Home and Daily Progress',
      descriptionAr: 'تابع اختباراتك، اكتشف المحتوى الجديد، وابدأ يومك من لوحة واحدة واضحة ومباشرة على الشاشة.',
      descriptionEn: 'Follow your quizzes, discover fresh content, and start from one fluid dashboard directly on the canvas.',
      image: productAsset('/showcase/home-dashboard.webp'),
      imageAlt: isAr ? 'لقطة من الصفحة الرئيسية في QuizSpace' : 'QuizSpace home dashboard screenshot',
      icon: BookOpenCheck,
      gradient: 'from-cyan-500/20 to-blue-500/20',
    },
    {
      titleAr: 'إنشاء اختبارات منظمة',
      titleEn: 'Structured Quiz Creation',
      descriptionAr: 'حوّل أفكارك ومصادرك إلى اختبارات جاهزة للمشاركة مع الطلاب في خطوات واضحة.',
      descriptionEn: 'Turn ideas and sources into share-ready student quizzes through clear steps.',
      image: productAsset('/showcase/quiz-creator.png'),
      imageAlt: isAr ? 'لقطة حقيقية من صفحة إنشاء الاختبارات في QuizSpace' : 'Real QuizSpace quiz creation screen screenshot',
      icon: CheckCircle2,
      gradient: 'from-violet-500/20 to-purple-500/20',
    },
    {
      titleAr: 'التحديات اليومية',
      titleEn: 'Daily Challenges',
      descriptionAr: 'ادخل تحديات منظمة تساعدك على الحفاظ على الاستمرارية والعودة للتعلم كل يوم.',
      descriptionEn: 'Join structured challenges that help you stay consistent and return to learning every day.',
      image: productAsset('/images/brain_challenge.webp'),
      imageAlt: isAr ? 'معاينة التحديات اليومية في QuizSpace' : 'QuizSpace daily challenges preview',
      icon: Trophy,
      gradient: 'from-amber-500/20 to-orange-500/20',
    },
    {
      titleAr: 'الجوائز والتخصيص',
      titleEn: 'Rewards and Personalization',
      descriptionAr: 'اجمع نقاطك، فعّل مكافآتك، وخصص حسابك بعناصر تُظهر إنجازاتك.',
      descriptionEn: 'Collect points, unlock rewards, and personalize your account with achievement-based items.',
      image: productAsset('/images/lucky_wheel.webp'),
      imageAlt: isAr ? 'معاينة الجوائز داخل QuizSpace' : 'QuizSpace rewards preview',
      icon: Gift,
      gradient: 'from-emerald-500/20 to-teal-500/20',
    },
  ];

  return (
    <main
      className="guest-landing theme-page min-h-screen w-full pb-20 select-none overflow-x-hidden"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Hero Atmosphere — 100% Containerless & Directly on the Canvas ("على الأرض") */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-16 max-w-6xl mx-auto text-center">
        {/* Ambient Specular Light Aura */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[650px] h-[350px] sm:h-[450px] rounded-full bg-gradient-to-tr from-cyan-400/15 via-violet-600/15 to-amber-300/10 blur-[120px] pointer-events-none -z-10" />

        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 dark:bg-violet-400/15 text-violet-600 dark:text-violet-300 text-xs font-black tracking-wide mb-6 backdrop-blur-md border border-violet-500/10">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>{isAr ? 'مساحة منظمة للتعلم والاختبارات والتقدم' : 'A focused home for learning, quizzes, and progress'}</span>
        </div>

        {/* Hero Headline */}
        <h1 className="guest-landing__title font-display font-black text-3xl sm:text-5xl lg:text-6xl text-slate-900 dark:text-white tracking-tight leading-[1.18] max-w-4xl mx-auto">
          {isAr
            ? 'QuizSpace — كل ما تحتاجه لتجربة تعلم أكثر وضوحاً وتحفيزاً.'
            : 'QuizSpace — everything you need for a clearer, more motivating learning journey.'}
        </h1>

        {/* Hero Paragraph */}
        <p className="guest-landing__copy mt-6 text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
          {isAr
            ? 'QuizSpace يجمع الاختبارات، التحديات، والجوائز في تجربة واحدة مصممة للطلاب والمعلمين والمؤسسات.'
            : 'QuizSpace brings quizzes, challenges, and rewards into one experience for students, educators, and institutions.'}
        </p>

        {/* Action Buttons directly on the Canvas */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <button
            type="button"
            onClick={onLogin}
            className="guest-landing__primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-black text-xs sm:text-sm px-7 py-3 shadow-lg shadow-violet-500/25 transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <span>{isAr ? 'أنشئ حسابك مجاناً' : 'Create a free account'}</span>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>

          <button
            type="button"
            onClick={onExplore}
            className="guest-landing__secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-slate-900 dark:text-white font-bold text-xs sm:text-sm px-6 py-3 backdrop-blur-md border border-black/5 dark:border-white/10 transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <span>{isAr ? 'استكشف الاختبارات' : 'Explore quizzes'}</span>
          </button>
        </div>

        {/* Fluid Hero Live Showcase Display — Containerless */}
        <div className="mt-12 sm:mt-16 relative max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
            <img
              src={productAsset('/showcase/home-dashboard.webp')}
              alt={isAr ? 'لقطة حقيقية من الصفحة الرئيسية لمنصة QuizSpace' : 'Real QuizSpace home page screenshot'}
              loading="eager"
              className="w-full aspect-[16/10] object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

            <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto p-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-right text-white max-w-xs">
              <p className="font-display font-black text-xs sm:text-sm">
                {isAr ? 'لوحة واحدة لكل ما يهمك' : 'One dashboard for what matters'}
              </p>
              <p className="text-[11px] text-slate-300 mt-1 font-medium">
                {isAr ? 'اختبارات، مهام، ومتابعة تقدمك' : 'Quizzes, tasks, and progress tracking'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid — Laid directly on the Floor ("على الأرض") */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="text-xs font-black tracking-widest uppercase text-violet-500 dark:text-violet-400">
            {isAr ? 'من داخل المنصة' : 'Inside the platform'}
          </span>
          <h2 className="font-display font-black text-2xl sm:text-4xl text-slate-900 dark:text-white tracking-tight mt-2">
            {isAr ? 'شاهد ما ستجده بعد تسجيل الدخول' : 'See what awaits after sign-in'}
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            {isAr
              ? 'هذه لقطات ومشاهد من أقسام QuizSpace الفعلية؛ الحساب المجاني يمنحك نقطة انطلاق واضحة، ويمكنك تطوير تجربتك وقتما تحتاج.'
              : 'These are real previews from QuizSpace. A free account gives you a clear start, with room to grow whenever you need.'}
          </p>
        </div>

        {/* 4 Feature Columns directly on Canvas without enclosing card wrappers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.titleEn}
                className="group relative flex flex-col justify-between transition-all duration-300"
              >
                {/* Subtle Ambient Hover Glow */}
                <div className="absolute -inset-3 rounded-3xl bg-violet-500/0 group-hover:bg-violet-500/[0.04] dark:group-hover:bg-violet-400/[0.04] transition-colors duration-300 pointer-events-none -z-10" />

                <div>
                  {/* Image showcase on canvas */}
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800/50 shadow-md ring-1 ring-black/5 dark:ring-white/10 mb-4">
                    <img
                      src={item.image}
                      alt={item.imageAlt}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Icon & Label */}
                  <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px] font-black">{isAr ? 'ميزة داخل المنصة' : 'In-product feature'}</span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-display font-black text-base sm:text-lg text-slate-900 dark:text-white leading-snug">
                    {isAr ? item.titleAr : item.titleEn}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    {isAr ? item.descriptionAr : item.descriptionEn}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Gamification Strip — Seamless on the Floor */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-8 border-y border-black/5 dark:border-white/5">
          <div className="max-w-2xl text-center md:text-right">
            <div className="inline-flex items-center gap-2 text-amber-500 font-black text-xs mb-2">
              <Gift className="h-4 w-4" />
              <span>{isAr ? 'التقدم له قيمة' : 'Progress has value'}</span>
            </div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
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
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-black text-xs sm:text-sm px-6 py-3 transition-all duration-200 active:scale-95 shadow-md cursor-pointer shrink-0"
          >
            <span>{isAr ? 'الدخول إلى المنصة' : 'Enter the platform'}</span>
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>
      </section>

      {/* Direct Contact & Support Floor Strip */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-6 text-center md:text-right">
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
