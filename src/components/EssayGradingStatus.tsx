import React from 'react';

interface EssayGradingStatusProps {
  isArabic: boolean;
  isLoading: boolean;
  isAssessed: boolean | null;
  error?: string;
}

export default function EssayGradingStatus({
  isArabic,
  isLoading,
  isAssessed,
  error,
}: EssayGradingStatusProps) {
  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
        <span>{error}</span>
      </div>
    );
  }

  if (isLoading || isAssessed === null) {
    return (
      <div className="p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-dashed border-primary/20 text-center text-xs font-bold text-primary animate-pulse">
        {isLoading
          ? (isArabic ? 'جارٍ تصحيح الإجابة المقالية بالذكاء الاصطناعي...' : 'AI is grading your essay...')
          : (isArabic ? 'جارٍ التحقق من صحة الإجابة تلقائيًا...' : 'Checking your answer...')}
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl border border-dotted border-slate-300/60 text-center text-xs font-semibold bg-slate-50 dark:bg-slate-900/40">
      {isAssessed
        ? <span className="text-emerald-600 dark:text-emerald-400">{isArabic ? ' رائع! قُيّمت الإجابة على أنها صحيحة.' : 'Great! Your answer was graded correct.'}</span>
        : <span className="text-slate-500 dark:text-slate-400">{isArabic ? 'تم رصد السؤال كإجابة تحتاج لمزيد من المراجعة والتحصيل الفردي.' : 'This answer needs further review.'}</span>}
    </div>
  );
}
