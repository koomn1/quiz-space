import { Check } from 'lucide-react';

export type ExtractionStage = 'analyzing' | 'extracting' | 'generating' | 'solving' | 'compiling' | 'saving';

interface ExtractionStageTimelineProps {
  currentStage: ExtractionStage;
  language: 'ar' | 'en';
  mode: 'literal' | 'generate';
}

const stageOrder: ExtractionStage[] = ['analyzing', 'extracting', 'generating', 'solving', 'compiling', 'saving'];

export default function ExtractionStageTimeline({ currentStage, language, mode }: ExtractionStageTimelineProps) {
  const isArabic = language === 'ar';
  const currentIndex = Math.max(0, stageOrder.indexOf(currentStage));
  const stages = [
    { key: 'analyzing', title: isArabic ? 'فحص المصدر' : 'Inspect source', detail: isArabic ? 'النوع والصفحات' : 'File and pages' },
    { key: 'extracting', title: isArabic ? 'قراءة المحتوى' : 'Read content', detail: isArabic ? 'النص أو الصفحات' : 'Text or page images' },
    {
      key: 'generating',
      title: isArabic ? (mode === 'literal' ? 'ترتيب الأسئلة' : 'بناء الأسئلة') : (mode === 'literal' ? 'Structure questions' : 'Build questions'),
      detail: isArabic ? (mode === 'literal' ? 'السؤال والاختيارات' : 'من محتوى المصدر') : (mode === 'literal' ? 'Stem and choices' : 'From the source'),
    },
    { key: 'solving', title: isArabic ? 'مراجعة الإجابات' : 'Review answers', detail: isArabic ? 'مطابقة الإجابة بالمصدر' : 'Check against source' },
    { key: 'compiling', title: isArabic ? 'مراجعة التغطية' : 'Check coverage', detail: isArabic ? 'الأجزاء وعدد الأسئلة' : 'Sections and question count' },
    { key: 'saving', title: isArabic ? 'تجهيز الاختبار' : 'Prepare quiz', detail: isArabic ? 'للمراجعة والحفظ' : 'For review and saving' },
  ] as const;

  return (
    <section
      aria-label={isArabic ? 'مراحل معالجة الملف' : 'Document processing stages'}
      className="rounded-[1.4rem] border border-white/60 bg-white/45 p-3 shadow-[0_12px_35px_rgba(67,56,202,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/35 sm:p-4"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 sm:text-sm">{isArabic ? 'مراحل العمل' : 'Work stages'}</h3>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {isArabic ? 'ملخص مرئي من قراءة الملف حتى مراجعة الناتج.' : 'A live summary from file reading through result review.'}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-violet-200/80 bg-violet-100/70 px-2.5 py-1 text-[10px] font-black text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200">
          {isArabic ? `المرحلة ${currentIndex + 1} من ${stages.length}` : `Stage ${currentIndex + 1} of ${stages.length}`}
        </span>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-live="polite">
        {stages.map((stage, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <li
              key={stage.key}
              aria-current={isCurrent ? 'step' : undefined}
              className={`relative min-h-[4.6rem] rounded-2xl border px-2.5 py-2 transition-all duration-300 ${
                isCurrent
                  ? 'border-violet-400/70 bg-gradient-to-br from-violet-100/90 to-cyan-50/80 shadow-[0_0_22px_rgba(139,92,246,0.16)] dark:border-violet-300/30 dark:from-violet-400/15 dark:to-cyan-400/5'
                  : isComplete
                    ? 'border-emerald-300/60 bg-emerald-50/65 dark:border-emerald-400/20 dark:bg-emerald-400/[0.07]'
                    : 'border-slate-200/70 bg-white/35 dark:border-white/[0.07] dark:bg-white/[0.025]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                  isCurrent
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25'
                    : isComplete
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200/80 text-slate-500 dark:bg-slate-700/80 dark:text-slate-300'
                }`}>
                  {isComplete ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <span className={`truncate text-[10px] font-extrabold sm:text-[11px] ${isCurrent ? 'text-violet-800 dark:text-violet-100' : 'text-slate-700 dark:text-slate-200'}`}>
                  {stage.title}
                </span>
              </div>
              <p className="mt-1.5 truncate ps-8 text-[9px] font-semibold text-slate-500 dark:text-slate-400">{stage.detail}</p>
              {isCurrent && <span className="absolute bottom-0 inset-x-3 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
