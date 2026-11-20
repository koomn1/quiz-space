import React, { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  Layers,
  Award,
  Clock,
  Sparkles,
  Play,
  Eye,
  ChevronUp,
  ChevronDown,
  Share2,
  Check,
  Lightbulb,
} from 'lucide-react';
import { CosmoPalette } from './CosmoPalette';

export interface CreatedQuizMeta {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  difficulty: string;
  questions?: {
    text: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }[];
}

export function QuizShowcaseCard({
  quiz,
  onStartQuiz,
  theme,
  isAr,
}: {
  quiz: CreatedQuizMeta;
  onStartQuiz?: (quizId: string) => void;
  theme: CosmoPalette;
  isAr: boolean;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/quiz/${quiz.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      className="mt-4 rounded-2xl border p-5 shadow-xl transition-all"
      style={{
        background: theme.IS_DARK
          ? 'linear-gradient(145deg, #101628 0%, #0c101c 100%)'
          : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
        borderColor: 'rgba(0,116,114,0.35)',
        boxShadow: '0 8px 30px rgba(0,116,114,0.12)',
      }}
      dir="rtl"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-[#007472] via-[#2AC3BB] to-[#EE8361] text-white shadow-lg shadow-[#EE8361]/25">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{isAr ? 'اختبار تفاعلي جاهز للبدء' : 'Quiz ready to play'}</span>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg" style={{ color: theme.FG }}>
              {quiz.title}
            </h3>
          </div>
        </div>
      </div>

      {quiz.description && (
        <p className="text-xs leading-relaxed text-slate-400 mb-4">{quiz.description}</p>
      )}

      {/* Meta Stats Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div
          className="p-2.5 rounded-xl border flex items-center gap-2"
          style={{ background: theme.INPUT_BG, borderColor: theme.BORDER }}
        >
          <Layers className="w-4 h-4 text-[#2AC3BB]" />
          <div>
            <span className="block text-[10px] text-slate-400">{isAr ? 'عدد الأسئلة' : 'Questions'}</span>
            <span className="font-bold text-xs" style={{ color: theme.FG }}>
              {quiz.questionCount} {isAr ? 'سؤال' : 'Q'}
            </span>
          </div>
        </div>
        <div
          className="p-2.5 rounded-xl border flex items-center gap-2"
          style={{ background: theme.INPUT_BG, borderColor: theme.BORDER }}
        >
          <Award className="w-4 h-4 text-amber-400" />
          <div>
            <span className="block text-[10px] text-slate-400">{isAr ? 'الصعوبة' : 'Difficulty'}</span>
            <span className="font-bold text-xs" style={{ color: theme.FG }}>
              {quiz.difficulty}
            </span>
          </div>
        </div>
        <div
          className="p-2.5 rounded-xl border flex items-center gap-2"
          style={{ background: theme.INPUT_BG, borderColor: theme.BORDER }}
        >
          <Clock className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="block text-[10px] text-slate-400">{isAr ? 'الوقت المقدر' : 'Time'}</span>
            <span className="font-bold text-xs" style={{ color: theme.FG }}>
              {quiz.questionCount} {isAr ? 'دقيقة' : 'min'}
            </span>
          </div>
        </div>
        <div
          className="p-2.5 rounded-xl border flex items-center gap-2"
          style={{ background: theme.INPUT_BG, borderColor: theme.BORDER }}
        >
          <Sparkles className="w-4 h-4 text-[#EE8361]" />
          <div>
            <span className="block text-[10px] text-slate-400">{isAr ? 'مكافأة الإنجاز' : 'Reward'}</span>
            <span className="font-bold text-xs text-[#EE8361]">+{quiz.questionCount * 5} XP</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => onStartQuiz?.(quiz.id)}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs text-white shadow-lg shadow-[#EE8361]/25 transition-all hover:scale-[1.02] hover:brightness-110 active:scale-95 cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #007472 0%, #2AC3BB 50%, #EE8361 100%)' }}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isAr ? 'ابدأ الاختبار الآن في المنصة' : 'Start Quiz in Platform'}</span>
        </button>

        {quiz.questions && quiz.questions.length > 0 && (
          <button
            onClick={() => setShowPreview(prev => !prev)}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-bold text-xs border transition-all hover:bg-[#007472]/10 cursor-pointer"
            style={{ background: theme.INPUT_BG, borderColor: theme.BORDER, color: theme.FG }}
          >
            <Eye className="w-4 h-4 text-[#007472] dark:text-[#2AC3BB]" />
            <span>
              {showPreview
                ? isAr
                  ? 'إخفاء المعاينة'
                  : 'Hide'
                : isAr
                ? `معاينة الأسئلة (${quiz.questions.length})`
                : 'Preview'}
            </span>
            {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}

        <button
          onClick={handleCopyLink}
          aria-label={isAr ? 'نسخ رابط الاختبار للمشاركة' : 'Share Quiz'}
          className="p-3 rounded-xl border transition-all hover:bg-[#007472]/10 cursor-pointer"
          style={{ background: theme.INPUT_BG, borderColor: theme.BORDER, color: theme.MUTED }}
          title={isAr ? 'نسخ رابط الاختبار للمشاركة' : 'Share Quiz'}
        >
          {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Questions Preview Accordion */}
      {showPreview && quiz.questions && (
        <div className="mt-4 pt-4 border-t space-y-3.5" style={{ borderColor: theme.BORDER_SOFT }}>
          <p className="text-xs font-bold text-[#007472] dark:text-[#2AC3BB]">
            {isAr ? 'قائمة الأسئلة والإجابات النموذجية والشروحات:' : 'Questions and Model Answers:'}
          </p>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {quiz.questions.map((q, qIndex) => (
              <div
                key={qIndex}
                className="p-3.5 rounded-xl border text-xs"
                style={{ background: theme.INPUT_BG, borderColor: theme.BORDER }}
              >
                <div className="flex items-start gap-2 mb-2 font-bold" style={{ color: theme.FG }}>
                  <span className="w-5 h-5 rounded-full bg-[#007472]/15 text-[#007472] dark:bg-[#2AC3BB]/15 dark:text-[#2AC3BB] flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    {qIndex + 1}
                  </span>
                  <p className="flex-1 leading-relaxed">{q.text}</p>
                </div>

                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 my-2 mr-6">
                    {q.options.map((opt, optIndex) => {
                      const isCorrect = optIndex === q.correctIndex;
                      return (
                        <div
                          key={optIndex}
                          className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-1 text-[11px]"
                          style={{
                            background: isCorrect
                              ? 'rgba(16,185,129,0.12)'
                              : theme.IS_DARK
                              ? 'rgba(255,255,255,0.02)'
                              : 'rgba(0,0,0,0.02)',
                            borderColor: isCorrect ? 'rgba(16,185,129,0.4)' : theme.BORDER_SOFT,
                            color: isCorrect ? '#10b981' : theme.MUTED,
                            fontWeight: isCorrect ? 600 : 400,
                          }}
                        >
                          <span>{opt}</span>
                          {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.explanation && (
                  <div className="flex items-start gap-1.5 mt-2 mr-6 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>{isAr ? 'التفسير: ' : 'Explanation: '}</strong>
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
