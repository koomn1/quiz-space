import React from 'react';
import { BookOpen, BrainCircuit, FileText, GraduationCap } from 'lucide-react';
import { COSMO_AVATAR } from './CosmoAvatar';
import { CosmoPalette } from './CosmoPalette';

export const STARTERS = [
  {
    icon: BookOpen,
    title: 'اشرحلي درس أو مفهوم معقد',
    sub: 'تبسيط النظريات والقوانين بأمثلة عملية',
    color: '#007472',
    bg: 'rgba(0,116,114,0.08)',
    border: 'rgba(0,116,114,0.25)',
  },
  {
    icon: BrainCircuit,
    title: 'لخصلي محتوى ملف أو محاضرة',
    sub: 'استخراج الأفكار الرئيسية والمفاهيم المهمة',
    color: '#06B6D4',
    bg: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.25)',
  },
  {
    icon: FileText,
    title: 'استخرج كل الأسئلة من ملف',
    sub: 'أرفق الملف واطلب استخراج الأسئلة حرفيًا',
    color: '#EE8361',
    bg: 'rgba(238,131,97,0.08)',
    border: 'rgba(238,131,97,0.25)',
  },
  {
    icon: GraduationCap,
    title: 'ضع لي خطة مراجعة للامتحان',
    sub: 'جدول دراسي مركز وتوقعات لأهم الأسئلة',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.25)',
  },
];

export function CosmoWelcomeHero({
  userName,
  theme,
  isAr,
  onSelectStarter,
  onOpenQuizStudio: _onOpenQuizStudio,
}: {
  userName?: string;
  theme: CosmoPalette;
  isAr: boolean;
  onSelectStarter: (title: string) => void;
  onOpenQuizStudio: (topic?: string) => void;
}) {
  return (
    <div className="flex min-h-full flex-col justify-center px-3 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center gap-3 border-b pb-5" style={{ borderColor: theme.BORDER_SOFT }}>
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-[#2AC3BB]/40 p-0.5 shadow-lg shadow-[#007472]/20" style={{ background: theme.CARD }}>
            <img src={COSMO_AVATAR} alt="Cosmo AI" className="h-full w-full rounded-[14px] object-cover" />
            <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2AC3BB]">QuizSpace assistant</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl" style={{ color: theme.FG }}>
              {isAr ? `إزاي أساعدك يا ${userName || 'صديقي'}؟` : `How can I help, ${userName || 'Scholar'}?`}
            </h1>
          </div>
        </div>
        <p className="mb-6 max-w-xl text-sm leading-7 text-slate-400">
          {isAr ? 'اسأل براحتك. ارفع ملفًا، اطلب شرحًا، أو قل لكوزمو أن ينشئ اختبارًا—وهو سيتولى اختيار الخطوة المناسبة.' : 'Ask naturally. Attach a file, request an explanation, or ask Cosmo to create a quiz—the right next step is handled for you.'}
        </p>

      <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        {STARTERS.map(({ icon: Icon, title, sub, color, bg, border }) => (
          <button
            key={title}
            onClick={() => {
              onSelectStarter(title);
            }}
            className="group text-right p-4 rounded-2xl transition-all duration-200 border cursor-pointer hover:-translate-y-1 shadow-sm hover:shadow-lg"
            style={{ background: theme.CARD, borderColor: theme.BORDER }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = color;
              (e.currentTarget as HTMLElement).style.background = bg;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = theme.BORDER;
              (e.currentTarget as HTMLElement).style.background = theme.CARD;
            }}
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-xs"
                style={{ background: bg, border: `1px solid ${border}` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: theme.FG }}>
                  {title}
                </p>
                <p className="text-xs mt-0.5 truncate text-slate-400">{sub}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}

export default CosmoWelcomeHero;
