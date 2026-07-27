import React, { useState } from 'react';
import { Question } from '../types';
import { explainQuestionWithGemini } from '../services/geminiService';
import { Check, X, BookOpen, ThumbsUp, ThumbsDown, Filter, HelpCircle, ArrowDown, Sparkles } from 'lucide-react';
import { getApiUrl } from '../lib/origin';
import { fetchWithAuth } from '../lib/authFetch';

interface QuizDetailedReportProps {
  questions: Question[];
  userAnswers: number[];
  essayAnswers: string[];
  essayAssessments: Record<number, boolean>;
  lang?: 'ar' | 'en';
  questionRatings: Record<string, 'like' | 'dislike'>;
  onRateQuestion: (qId: string, qText: string, rating: 'like' | 'dislike') => void;
}

export default function QuizDetailedReport({
  questions,
  userAnswers,
  essayAnswers,
  essayAssessments,
  lang = 'ar',
  questionRatings,
  onRateQuestion
}: QuizDetailedReportProps) {
  const isAr = lang === 'ar';
  const [activeFilter, setActiveFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const handleFetchAiExplanation = async (qId: string, q: Question, originalIdx: number) => {
    if (aiLoading[qId]) return;
    setAiLoading(prev => ({ ...prev, [qId]: true }));
    try {
      let userAnswer = '';
      if (q.type === 'essay') {
        userAnswer = essayAnswers[originalIdx] || '';
      } else if (q.type === 'mcq') {
        userAnswer = q.options[userAnswers[originalIdx]] || '';
      } else {
        userAnswer = userAnswers[originalIdx] === 0 ? (isAr ? 'صح' : 'True') : (isAr ? 'خطأ' : 'False');
      }

      let correctAnswer = '';
      if (q.type === 'essay') {
        correctAnswer = q.correctAnswer || '';
      } else {
        correctAnswer = q.type === 'mcq' 
          ? q.options[q.correctIndex] 
          : (q.correctIndex === 0 ? (isAr ? 'صح' : 'True') : (isAr ? 'خطأ' : 'False'));
      }

      const { explanation } = await explainQuestionWithGemini(
        q.text,
        q.options || [],
        correctAnswer
      );
      if (explanation) {
        setAiExplanations(prev => ({ ...prev, [qId]: explanation }));
      } else {
        setAiExplanations(prev => ({ ...prev, [qId]: isAr ? 'عذراً، فشل توليد الشرح العلمي في الوقت الحالي.' : 'Failed to generate academic concept explanation.' }));
      }
    } catch (err) {
      setAiExplanations(prev => ({ ...prev, [qId]: isAr ? 'حدث خطأ أثناء الاتصال بالمعلم الذكي.' : 'Error contacting the AI Tutor.' }));
    } finally {
      setAiLoading(prev => ({ ...prev, [qId]: false }));
    }
  };

  // Helper to determine if a question was answered correctly
  const isCorrect = (q: Question, idx: number) => {
    if (q.type === 'essay') {
      return essayAssessments[idx] === true;
    }
    return userAnswers[idx] === q.correctIndex;
  };

  // Filtered list
  const filteredQuestions = questions.map((q, idx) => ({ q, originalIdx: idx })).filter(({ q, originalIdx }) => {
    if (activeFilter === 'correct') {
      return isCorrect(q, originalIdx);
    }
    if (activeFilter === 'incorrect') {
      return !isCorrect(q, originalIdx);
    }
    return true;
  });

  return (
    <div 
      id="quiz-detailed-interactive-report" 
      className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6 text-right"
      style={{ direction: isAr ? 'rtl' : 'ltr' }}
    >
      {/* Header and Filter triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-700/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="font-display font-extrabold text-lg text-slate-800 dark:text-slate-100">
              {isAr ? 'التقرير الأكاديمي المفصل للإجابات' : 'Detailed Academic Answers Report'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr 
              ? 'تصفح جميع الأسئلة مع توضيح الإجابات المسجلة والتحليلات العلمية المصاحبة.' 
              : 'Browse all questions with recorded answers and educational explanations.'}
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1.5 self-start sm:self-center bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'الكل' : 'All'} ({questions.length})
          </button>
          <button
            onClick={() => setActiveFilter('correct')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'correct'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isAr ? 'الصحيحة' : 'Correct'}</span>
          </button>
          <button
            onClick={() => setActiveFilter('incorrect')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'incorrect'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>{isAr ? 'الخاطئة' : 'Incorrect'}</span>
          </button>
        </div>
      </div>

      {/* Questions list Accordion / cards stack */}
      <div className="space-y-6">
        
          {filteredQuestions.length === 0 ? (
            <div
              
              
              
              className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm font-semibold border border-dashed border-slate-200 dark:border-slate-700/60 rounded-2xl"
            >
              {isAr ? 'لا توجد أسئلة تطابق الفلتر المحدد.' : 'No questions matching selected filters.'}
            </div>
          ) : (
            filteredQuestions.map(({ q, originalIdx }, qArrIdx) => {
              const qId = q.id || `q-${originalIdx}`;
              const answeredCorrectly = isCorrect(q, originalIdx);
              const userAnswerIdx = userAnswers[originalIdx];

              return (
                <div
                  
                  
                  
                  
                  
                  className={`p-5 rounded-2xl border transition-all duration-300 ${
                    answeredCorrectly
                      ? 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/[0.01]'
                      : 'border-rose-100 dark:border-rose-900/30 bg-rose-50/[0.01]'
                  }`}
                >
                  {/* Top line with category / status */}
                  <div className="flex items-start justify-between gap-3 mb-3 pb-2 border-b border-slate-100/60 dark:border-slate-750/30">
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center justify-center font-mono text-xs font-black">
                        {originalIdx + 1}
                      </span>
                      <h4 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100 leading-relaxed text-right">
                        {q.text}
                      </h4>
                    </div>

                    {/* Check or Cross symbol badge */}
                    <div className="flex-shrink-0">
                      {answeredCorrectly ? (
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                          <Check className="w-3.5 h-3.5" />
                          <span>{isAr ? 'إجابة صحيحة' : 'Correct'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-905/50">
                          <X className="w-3.5 h-3.5" />
                          <span>{isAr ? 'إجابة خاطئة' : 'Incorrect'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Question Image if present */}
                  {q.imageUrl && (
                    <div className="my-3 flex justify-start">
                      <img
                        src={q.imageUrl}
                        alt="Question Diagram"
                        referrerPolicy="no-referrer"
                        className="max-h-48 rounded-xl object-contain border border-slate-200 dark:border-slate-700/60 shadow-xs"
                      />
                    </div>
                  )}

                  {/* Options Render */}
                  {q.type === 'essay' ? (
                    <div className="space-y-3.5 pt-1 text-xs">
                      {/* Written essay feedback */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-1.5 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded leading-none inline-block">
                          {isAr ? 'إجابتك المسودة:' : 'Your draft answer:'}
                        </span>
                        <p className="text-slate-750 dark:text-slate-300 leading-relaxed whitespace-pre-wrap italic">
                          {essayAnswers[originalIdx] || (isAr ? 'لم تكتب إجابة مسبقة.' : 'No draft answer recorded.')}
                        </p>
                      </div>

                      {/* Correct answer standard */}
                      <div className="p-3.5 bg-emerald-500/[0.03] dark:bg-emerald-950/[0.05] rounded-xl space-y-1.5 border border-emerald-100/50 dark:border-emerald-900/20">
                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded leading-none inline-block">
                          {isAr ? 'الجواب النموذجي المرصود:' : 'Model Answer Standard:'}
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 font-bold leading-relaxed whitespace-pre-wrap">
                          {q.correctAnswer || (isAr ? 'لم يتم صياغة إجابة نموذجية.' : 'No standard answer supplied.')}
                        </p>
                      </div>
                    </div>
                  ) : q.type === 'mcq' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {q.options.map((option, oIdx) => {
                        const isThisCorrect = oIdx === q.correctIndex;
                        const isUserSelected = userAnswerIdx === oIdx;

                        let styleClass = 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400';
                        let indicatorIcon = null;

                        if (isThisCorrect) {
                          styleClass = 'border-emerald-500 bg-emerald-55/35 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 font-bold';
                          indicatorIcon = <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />;
                        } else if (isUserSelected) {
                          styleClass = 'border-rose-500 bg-rose-55/35 dark:bg-rose-950/10 text-rose-800 dark:text-rose-400 font-bold';
                          indicatorIcon = <X className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />;
                        }

                        return (
                          <div
                            
                            className={`flex items-center justify-between p-3 border rounded-xl text-xs leading-relaxed ${styleClass}`}
                          >
                            <span>{option}</span>
                            {indicatorIcon}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // True or False choices
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {[0, 1].map((oIdx) => {
                        const label = oIdx === 0 ? (isAr ? 'صح' : 'True') : (isAr ? 'خطأ' : 'False');
                        const isThisCorrect = oIdx === q.correctIndex;
                        const isUserSelected = userAnswerIdx === oIdx;

                        let styleClass = 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400';
                        let indicatorIcon = null;

                        if (isThisCorrect) {
                          styleClass = 'border-emerald-500 bg-emerald-55/35 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 font-bold';
                          indicatorIcon = <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />;
                        } else if (isUserSelected) {
                          styleClass = 'border-rose-500 bg-rose-55/35 dark:bg-rose-950/10 text-rose-800 dark:text-rose-400 font-bold';
                          indicatorIcon = <X className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />;
                        }

                        return (
                          <div
                            
                            className={`flex items-center justify-between p-3 border rounded-xl text-xs leading-relaxed ${styleClass}`}
                          >
                            <span>{label}</span>
                            {indicatorIcon}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Educational Explanation Box */}
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-750/80 space-y-3.5 text-xs">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 text-primary font-black">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span>{isAr ? 'الشرح والتحليل المعرفي:' : 'Educational Insight & Explanation:'}</span>
                      </div>
                      
                      {/* AI Explain Mechanism */}
                      <button
                        onClick={() => handleFetchAiExplanation(qId, q, originalIdx)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer transition-all border shadow-xs ${
                          aiLoading[qId]
                            ? 'bg-purple-100 dark:bg-purple-950/45 text-purple-605 dark:text-purple-300 border-purple-200/50 animate-pulse'
                            : aiExplanations[qId]
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-purple-500/5 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 dark:hover:bg-purple-500/20 border-purple-500/20'
                        }`}
                        disabled={aiLoading[qId]}
                      >
                        <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>
                          {aiLoading[qId] 
                            ? (isAr ? 'جاري استدعاء كوزمو...' : 'Summoning Cosmo AI...') 
                            : aiExplanations[qId] 
                            ? (isAr ? 'تم استحضار الشرح الذكي ✔' : 'AI Explanation Ready ✔') 
                            : (isAr ? 'اسأل كوزمو لشرح أعمق بالذكاء الاصطناعي 🧠' : 'Ask Cosmo AI for Deep Explanation 🧠')}
                        </span>
                      </button>
                    </div>

                    <p className="text-slate-650 dark:text-slate-300 leading-relaxed font-semibold">
                      {q.explanation || (isAr 
                        ? 'تم إعداد هذا السؤال لقياس الاستجابة والذاكرة بشكل مباشر وفعال.' 
                        : 'This question was formatted to gauge explicit memory and cognitive response recall directly.')}
                    </p>

                    {/* AI explanation loading state */}
                    {aiLoading[qId] && (
                      <div className="pt-2 animate-pulse space-y-1.5">
                        <div className="h-2 bg-purple-500/10 dark:bg-purple-400/10 rounded w-5/6"></div>
                        <div className="h-2 bg-purple-500/10 dark:bg-purple-400/10 rounded w-full"></div>
                        <div className="h-2 bg-purple-500/10 dark:bg-purple-400/10 rounded w-2/3"></div>
                      </div>
                    )}

                    {/* AI custom generated lesson explanation block */}
                    {aiExplanations[qId] && (
                      <div 
                        
                        
                        className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5"
                      >
                        <div className="text-[10px] uppercase font-black text-purple-600 dark:text-purple-400 tracking-wider">
                          {isAr ? '💡 شرح المعلم الذكي (كوزمو):' : '💡 Lesson by AI Tutor (Cosmo):'}
                        </div>
                        <p className="text-slate-705 dark:text-purple-100 text-xs leading-relaxed whitespace-pre-line bg-purple-500/[0.025] dark:bg-purple-950/15 p-3 rounded-xl border border-purple-500/10 font-medium">
                          {aiExplanations[qId]}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Live Feedback voting under each item */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100/60 dark:border-slate-750/30">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {isAr ? 'هل ترى صياغة السؤال دقيقة وممتازة؟' : 'Did you find this question wording precise and helpful?'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onRateQuestion(qId, q.text, 'like')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                          questionRatings[qId] === 'like'
                            ? 'bg-emerald-500 text-white border border-emerald-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/65'
                        }`}
                        title="Excellent"
                      >
                        <ThumbsUp className={`w-3 h-3 ${questionRatings[qId] === 'like' ? 'fill-white' : ''}`} />
                        <span>{isAr ? 'أعجبني' : 'Like'}</span>
                      </button>
                      <button
                        onClick={() => onRateQuestion(qId, q.text, 'dislike')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                          questionRatings[qId] === 'dislike'
                            ? 'bg-red-500 text-white border border-red-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/65'
                        }`}
                        title="Not clear"
                      >
                        <ThumbsDown className={`w-3 h-3 ${questionRatings[qId] === 'dislike' ? 'fill-white' : ''}`} />
                        <span>{isAr ? 'لم يعجبني' : 'Dislike'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        
      </div>
    </div>
  );
}
