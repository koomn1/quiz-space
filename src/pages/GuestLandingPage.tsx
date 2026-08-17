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
} from 'lucide-react';
import { MainLogo } from '../components/MainLogo';

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
      descriptionAr: 'تابع اختباراتك، اكتشف المحتوى الجديد، وابدأ يومك من لوحة واحدة واضحة.',
      descriptionEn: 'Follow your quizzes, discover fresh content, and start from one clear dashboard.',
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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white" dir={isAr ? 'rtl' : 'ltr'}>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#061027] via-[#16255c] to-[#3b176c] px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16">
        <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-violet-500/30 blur-[120px]" />

        <div className="relative mx-auto max-w-6xl">
          <nav className="flex items-center justify-between gap-4">
            <MainLogo size="md" />
            <button
              type="button"
              onClick={onLogin}
              className="min-h-11 rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-lg transition-transform duration-200 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {isAr ? 'تسجيل الدخول' : 'Sign in'}
            </button>
          </nav>

          <div className="grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
            <div className="text-center lg:text-right">
              <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-indigo-100 backdrop-blur-sm">
                {isAr ? 'مساحة منظمة للتعلم والاختبارات والتقدم' : 'A focused home for learning, quizzes, and progress'}
              </p>
              <h1 className="text-4xl font-black leading-[1.18] tracking-tight text-white sm:text-6xl">
                {isAr ? 'كل ما تحتاجه لتجربة تعلم أكثر وضوحاً وتحفيزاً.' : 'Everything you need for a clearer, more motivating learning journey.'}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-indigo-100 sm:text-lg lg:mx-0">
                {isAr
                  ? 'QuizSpace يجمع الاختبارات، التحديات، والجوائز في تجربة واحدة مصممة للطلاب والمعلمين والمؤسسات.'
                  : 'QuizSpace brings quizzes, challenges, and rewards into one experience for students, educators, and institutions.'}
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <button
                  type="button"
                  onClick={onLogin}
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#f2b94b] px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-950/20 transition-transform duration-200 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
                >
                  <span>{isAr ? 'أنشئ حسابك مجاناً' : 'Create a free account'}</span>
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={onExplore}
                  className="min-h-12 rounded-2xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {isAr ? 'استكشف الاختبارات' : 'Explore quizzes'}
                </button>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl rounded-[28px] border border-white/20 bg-slate-950/45 p-3 shadow-2xl backdrop-blur-md">
              <img
                src={productAsset('/showcase/home-dashboard.webp')}
                alt={isAr ? 'لقطة حقيقية من الصفحة الرئيسية لمنصة QuizSpace' : 'Real QuizSpace home page screenshot'}
                loading="eager"
                className="aspect-[4/3] w-full rounded-[20px] object-cover object-top"
              />
              <div className="absolute bottom-7 right-7 rounded-xl border border-white/20 bg-slate-950/75 px-4 py-3 text-right text-xs text-white shadow-xl backdrop-blur-md">
                <p className="font-black">{isAr ? 'لوحة واحدة لكل ما يهمك' : 'One dashboard for what matters'}</p>
                <p className="mt-1 text-slate-300">{isAr ? 'اختبارات، مهام، ومتابعة تقدمك' : 'Quizzes, tasks, and progress tracking'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-black text-indigo-600 dark:text-indigo-300">{isAr ? 'من داخل المنصة' : 'Inside the platform'}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{isAr ? 'شاهد ما ستجده بعد تسجيل الدخول' : 'See what awaits after sign-in'}</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
            {isAr ? 'هذه لقطات ومشاهد من أقسام QuizSpace الفعلية؛ الحساب المجاني يمنحك نقطة انطلاق واضحة، ويمكنك تطوير تجربتك وقتما تحتاج.' : 'These are real previews from QuizSpace. A free account gives you a clear start, with room to grow whenever you need.'}
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.titleEn} className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img src={item.image} alt={item.imageAlt} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300">
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-black">{isAr ? 'ميزة داخل المنصة' : 'In-product feature'}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-black">{isAr ? item.titleAr : item.titleEn}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{isAr ? item.descriptionAr : item.descriptionEn}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-16 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-3 text-amber-700 dark:text-amber-300">
              <Gift className="h-6 w-6" />
              <span className="text-sm font-black">{isAr ? 'التقدم له قيمة' : 'Progress has value'}</span>
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{isAr ? 'حوّل التعلم اليومي إلى إنجازات ملموسة.' : 'Turn everyday learning into measurable wins.'}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              {isAr ? 'سجّل دخولك لمتابعة التحديات، رصيد الجوائز، ونشاط حسابك من مكان واحد.' : 'Sign in to follow challenges, rewards, and your account activity from one place.'}
            </p>
          </div>
          <button type="button" onClick={onLogin} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition-colors duration-200 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100">
            <span>{isAr ? 'الدخول إلى المنصة' : 'Enter the platform'}</span>
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-14 text-white sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 md:flex-row md:items-center">
          <div>
            <MainLogo size="md" />
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-300">{isAr ? 'هل تحتاج إلى مساعدة قبل البدء؟ فريق الدعم جاهز لمساعدتك.' : 'Need help before getting started? Our support team is ready.'}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="mailto:youssefbadawy5002@gmail.com" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-900">
              <Mail className="h-4 w-4" />
              {isAr ? 'البريد الإلكتروني' : 'Email'}
            </a>
            <a href="tel:01018995002" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-900">
              <Phone className="h-4 w-4" />
              {isAr ? 'اتصل بالدعم' : 'Call support'}
            </a>
            <a href="https://wa.me/201018995002" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-emerald-600">
              <MessageCircle className="h-4 w-4" />
              {isAr ? 'واتساب' : 'WhatsApp'}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
