import React from 'react';
import { BookOpen, BrainCircuit, Zap, GraduationCap } from 'lucide-react';
import { QuizSpacePointsToken } from '../brand/QuizSpaceTokens';
import { COSMO_AVATAR } from './CosmoAvatar';
import { CosmoPalette } from './CosmoPalette';

const ACCENT = '#007472';

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
    icon: Zap,
    title: 'اختبرني فوراً في مادة محددة',
    sub: 'توليد كويز تفاعلي فوري لقياس الفهم',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
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
  onOpenQuizStudio,
}: {
  userName?: string;
  theme: CosmoPalette;
  isAr: boolean;
  onSelectStarter: (title: string) => void;
  onOpenQuizStudio: (topic?: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-12 max-w-2xl mx-auto">
      <div className="welcome-title flex flex-col items-center text-center mb-10">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#007472]/30 to-[#2AC3BB]/20 blur-2xl scale-150 animate-pulse" />
          <div
            className="relative w-24 h-24 rounded-3xl overflow-hidden p-1.5 border-2 border-[#2AC3BB]/40 shadow-2xl shadow-[#007472]/30"
            style={{ background: theme.CARD }}
          >
            <img src={COSMO_AVATAR} alt="Cosmo AI" className="w-full h-full object-cover rounded-2xl" />
          </div>
          <span className="absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-md">
            جاهز للمذاكرة والاختبار
          </span>
        </div>

        <div
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold mb-3 border"
          style={{
            background: theme.IS_DARK ? 'rgba(0,116,114,0.15)' : 'rgba(0,116,114,0.08)',
            borderColor: 'rgba(0,116,114,0.3)',
            color: ACCENT,
          }}
        >
          <QuizSpacePointsToken className="w-3.5 h-3.5" />
          <span>{isAr ? 'كوزمو 2.5 فلاش • الذكاء الأكاديمي' : 'Cosmo 2.5 Flash • Academic AI'}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3" style={{ color: theme.FG }}>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#007472] via-[#2AC3BB] to-[#EE8361]">
            {isAr ? `أهلاً بك يا ${userName || 'صديقي'} ` : `Welcome, ${userName || 'Scholar'} `}
          </span>
        </h1>
        <p className="text-sm leading-relaxed max-w-lg text-slate-400">
          {isAr
            ? 'اسألني في أي مادة، أو ارفع ملفك لتلخيصه وتوليد كويز تفاعلي فوري. أسئلتك وشروحاتك تُصاغ بأعلى دقة أكاديمية.'
            : 'Ask any question or attach files for instant summaries and high-quality quizzes.'}
        </p>
      </div>

      {/* Quick Starter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
        {STARTERS.map(({ icon: Icon, title, sub, color, bg, border }) => (
          <button
            key={title}
            onClick={() => {
              if (title.includes('اختبرني')) {
                onOpenQuizStudio('معلومات عامة وتفكير نقدي');
              } else {
                onSelectStarter(title);
              }
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
  );
}

export default CosmoWelcomeHero;
