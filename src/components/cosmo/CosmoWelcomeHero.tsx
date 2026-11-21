import React from 'react';
import { BookOpen, BrainCircuit, FileText, GraduationCap, ArrowUpLeft } from 'lucide-react';
import { COSMO_AVATAR } from './CosmoAvatar';
import { CosmoPalette } from './CosmoPalette';
import { MagneticButton, SplitText } from '../reactbits';

export const STARTERS = [
  {
    icon: BookOpen,
    title: 'اشرحلي درس أو مفهوم معقد',
    sub: 'تبسيط النظريات والقوانين بأمثلة عملية',
    color: '#2AC3BB',
    bg: 'rgba(42,195,187,0.09)',
    border: 'rgba(42,195,187,0.24)',
  },
  {
    icon: BrainCircuit,
    title: 'لخصلي محتوى ملف أو محاضرة',
    sub: 'استخراج الأفكار الرئيسية والمفاهيم المهمة',
    color: '#5BC0EB',
    bg: 'rgba(91,192,235,0.09)',
    border: 'rgba(91,192,235,0.24)',
  },
  {
    icon: FileText,
    title: 'استخرج كل الأسئلة من ملف',
    sub: 'أرفق الملف واطلب استخراج الأسئلة حرفيًا',
    color: '#EE8361',
    bg: 'rgba(238,131,97,0.09)',
    border: 'rgba(238,131,97,0.24)',
  },
  {
    icon: GraduationCap,
    title: 'ضع لي خطة مراجعة للامتحان',
    sub: 'جدول دراسي مركز وتوقعات لأهم الأسئلة',
    color: '#9B8AFB',
    bg: 'rgba(155,138,251,0.09)',
    border: 'rgba(155,138,251,0.24)',
  },
];

export function CosmoWelcomeHero({
  userName,
  theme,
  isAr,
  onSelectStarter,
}: {
  userName?: string;
  theme: CosmoPalette;
  isAr: boolean;
  onSelectStarter: (title: string) => void;
}) {
  const greeting = isAr ? `إزاي أساعدك يا ${userName || 'صديقي'}؟` : `How can I help, ${userName || 'Scholar'}?`;
  const description = isAr
    ? 'اسأل كوزمو بشكل طبيعي. ارفع ملفًا، اطلب شرحًا، أو حوّل مادتك إلى اختبار.'
    : 'Ask naturally. Upload a file, request an explanation, or turn your study material into a quiz.';

  return (
    <div className="flex min-h-full items-center px-4 py-8 sm:px-8 sm:py-12" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mx-auto w-full max-w-3xl">
        <div className="mx-auto max-w-2xl text-center">
          <div className="relative mx-auto mb-5 h-16 w-16 overflow-hidden rounded-[22px] border border-[#2AC3BB]/40 bg-[#072424] p-1 shadow-[0_16px_40px_rgba(0,116,114,0.22)]">
            <img src={COSMO_AVATAR} alt="Cosmo AI" className="h-full w-full rounded-[17px] object-cover" />
            <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-[#072424] bg-emerald-400" aria-label={isAr ? 'متصل' : 'Online'} />
          </div>
          <p className="mb-3 text-[11px] font-bold tracking-[0.2em] text-[#2AC3BB]">QUIZSPACE · COSMO AI</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl" style={{ color: theme.FG }}>
            <SplitText text={greeting} splitType="words" stagger={0.045} duration={0.5} />
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7" style={{ color: theme.MUTED }}>
            {description}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold" style={{ color: theme.SUBTLE_TEXT }}>
            <span className="rounded-full border px-3 py-1.5" style={{ borderColor: theme.BORDER_SOFT, background: theme.HOVER_SOFT }}>
              {isAr ? 'شرح واضح' : 'Clear explanations'}
            </span>
            <span className="rounded-full border px-3 py-1.5" style={{ borderColor: theme.BORDER_SOFT, background: theme.HOVER_SOFT }}>
              {isAr ? 'تحليل الملفات' : 'File analysis'}
            </span>
            <span className="rounded-full border px-3 py-1.5" style={{ borderColor: theme.BORDER_SOFT, background: theme.HOVER_SOFT }}>
              {isAr ? 'إنشاء اختبارات' : 'Quiz creation'}
            </span>
          </div>
        </div>

        <div className="mt-9 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {STARTERS.map(({ icon: Icon, title, sub, color, bg, border }) => (
            <MagneticButton
              key={title}
              type="button"
              strength={0.12}
              onClick={() => onSelectStarter(title)}
              className="group flex min-h-[88px] w-full items-center gap-3 rounded-2xl border p-4 text-right transition-colors duration-200 hover:border-[#2AC3BB]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2AC3BB] focus-visible:ring-offset-2"
              style={{ background: theme.CARD, borderColor: theme.BORDER, color: theme.FG }}
              aria-label={title}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:rotate-[-4deg] group-hover:scale-105" style={{ background: bg, borderColor: border }}>
                <Icon className="h-5 w-5" style={{ color }} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{title}</span>
                <span className="mt-1 block truncate text-xs" style={{ color: theme.MUTED }}>{sub}</span>
              </span>
              <ArrowUpLeft className="h-4 w-4 shrink-0 opacity-40 transition-all duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" style={{ color }} aria-hidden="true" />
            </MagneticButton>
          ))}
        </div>

        <p className="mt-7 text-center text-[11px]" style={{ color: theme.SUBTLE_TEXT }}>
          {isAr ? 'أو اكتب طلبك مباشرة في مربع المحادثة بالأسفل' : 'Or write your request directly in the composer below'}
        </p>
      </div>
    </div>
  );
}

export default CosmoWelcomeHero;
