import React, { useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Quiz } from '../types';
import { BookOpen, Clock, Edit3, Play, RefreshCw, Share2, Star, Trash2, Users } from 'lucide-react';
import { EssayReviewModal } from '../components/EssayReviewModal';
import { getPendingEssayReviews } from '../lib/db';

interface MyQuizzesProps {
  quizzes: Quiz[];
  userId: string;
  lang: 'ar' | 'en';
  isAdmin?: boolean;
  onStartQuiz: (id: string) => void;
  onEditQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (id: string) => void;
  onShareQuiz: (id: string, title: string, desc?: string) => void;
  fetchQuizzesList: () => void;
  userEmail: string | null;
}

export function MyQuizzes({
  quizzes,
  userId,
  lang,
  onStartQuiz,
  onEditQuiz,
  onDeleteQuiz,
  onShareQuiz,
  fetchQuizzesList
}: MyQuizzesProps) {
  const isAr = lang === 'ar';
  const myQuizzes = quizzes.filter(q => q.creatorId === userId);
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [essayModalOpen, setEssayModalOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const checkPendingReviews = async () => {
    try {
      const pending = await getPendingEssayReviews();
      setPendingCount(pending.length);
    } catch (_) {
      setPendingCount(0);
    }
  };

  useEffect(() => {
    checkPendingReviews();
  }, [userId, quizzes]);

  useGSAP(() => {
    if (myQuizzes.length > 0 && containerRef.current) {
      gsap.from(containerRef.current.querySelectorAll('.my-quiz-card-wrapper'), {
        opacity: 0,
        y: 16,
        duration: 0.45,
        stagger: 0.06,
        ease: 'power2.out',
        clearProps: 'all'
      });
    }
  }, { scope: containerRef, dependencies: [myQuizzes.length] });

  return (
    <div ref={containerRef} className="max-w-6xl mx-auto space-y-8 animate-fade-in text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-2xl font-black font-display text-slate-800 dark:text-white">
              {isAr ? 'اختباراتي الخاصة' : 'My Personal Quizzes'}
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {myQuizzes.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {isAr ? 'إدارة وتحرير وحذف كافة الاختبارات العلمية التي قمت بتأليفها.' : 'Manage, edit, and inspect all quizzes authored by your account.'}
          </p>
        </div>
        
        <button 
          onClick={fetchQuizzesList}
          className="uipro-btn-tactile flex items-center justify-center gap-2 text-xs text-primary bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-black transition-all cursor-pointer shadow-xs self-end sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{isAr ? 'تحديث القائمة' : 'Refresh List'}</span>
        </button>
      </div>

      {pendingCount > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-950/20 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 text-xl font-bold border border-amber-500/20">
              ✍️
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isAr ? 'يوجد إجابات مقالية بانتظار تصحيحك ومراجعتك' : 'Pending essay answers need your grading'}</span>
                <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[11px] font-black text-amber-700 dark:text-amber-300">
                  {pendingCount}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? 'قام بعض الطلاب بحل اختباراتك المقالية؛ قم بالاطلاع على إجاباتهم ورصد الدرجات والملاحظات.'
                  : 'Students have completed your essay quizzes. Review their answers and record scores & feedback.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEssayModalOpen(true)}
            className="uipro-btn-tactile inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 text-xs font-black shadow-sm cursor-pointer active:scale-95 transition-all"
          >
            <span>✍️</span>
            <span>{isAr ? 'مراجعة وتصحيح الإجابات الآن' : 'Review & Grade Essays Now'}</span>
          </button>
        </div>
      )}

      {myQuizzes.length === 0 ? (
        <div className="uipro-clay-card text-center py-20 rounded-[32px] border-dashed border-2 border-slate-200 dark:border-slate-800 max-w-xl mx-auto flex flex-col items-center justify-center space-y-4 p-8">
          <div className="p-4 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary shadow-inner">
            <BookOpen className="w-10 h-10" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 font-display">
              {isAr ? 'لم تقم بإنشاء أي اختبار بعد' : 'You haven\'t created any quizzes yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold max-w-xs leading-relaxed">
              {isAr ? 'ابدأ الآن بتأليف اختبار تفاعلي باستخدام كوزمو لتبدأ رحلتك العلمية!' : 'Author a smart quiz or prompt the AI companion right now to start your cosmic journey!'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {myQuizzes.map((quiz) => {
            const questionsCount = quiz.questions?.length || 10;
            const plays = quiz.totalPlays || 0;
            const rating = quiz.avgRating ? quiz.avgRating.toFixed(1) : '5.0';
            const estMinutes = Math.max(3, Math.round(questionsCount * 0.7));

            return (
              <div
                key={quiz.id}
                className="my-quiz-card-wrapper group relative flex flex-col justify-between p-5 rounded-3xl bg-white/[0.6] dark:bg-slate-900/40 hover:bg-white/[0.9] dark:hover:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 hover:border-sky-500/40 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 text-right backdrop-blur-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                        <Users className="w-3 h-3" />
                        <span>{plays > 0 ? (isAr ? `${plays.toLocaleString()} حلاً` : `${plays} solved`) : (isAr ? 'جديد ⚡' : 'New ⚡')}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-bold">
                        <span>{questionsCount} {isAr ? 'سؤالاً' : 'Q’s'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>{rating}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => onEditQuiz(quiz)} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer" title={isAr ? 'تعديل الاختبار' : 'Edit Quiz'}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setQuizToDelete(quiz.id)} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors cursor-pointer" title={isAr ? 'حذف الاختبار' : 'Delete Quiz'}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => onShareQuiz(quiz.id, quiz.title, quiz.description)} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer" title={isAr ? 'مشاركة الاختبار' : 'Share Quiz'}>
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 onClick={() => onStartQuiz(quiz.id)} className="font-display font-black text-base sm:text-lg text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors cursor-pointer">
                    {quiz.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                    {quiz.description || (isAr ? 'اختبار تفاعلي شيق لقياس مستواك المعرفي.' : 'Interactive comprehension quiz.')}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-semibold mt-3">
                    <Clock className="w-3 h-3 text-sky-400" />
                    <span>{isAr ? `الزمن المقدر: ~${estMinutes} دقائق` : `Est. time: ~${estMinutes} mins`}</span>
                  </div>
                </div>

                <div className="pt-3.5 mt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-right max-w-[150px] truncate">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs">
                      {quiz.creatorName ? quiz.creatorName.charAt(0).toUpperCase() : 'Q'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate leading-none">
                        {quiz.creatorName || (isAr ? 'QuizSpace AI' : 'QuizSpace')}
                      </p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                        {isAr ? 'صانع الاختبار' : 'Quiz Creator'}
                      </p>
                    </div>
                  </div>

                  <button type="button" onClick={() => onStartQuiz(quiz.id)} className="min-h-[38px] px-4 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer shadow-md shadow-sky-500/20">
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isAr ? 'ابدأ الحل' : 'Start'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {quizToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="my-quizzes-delete-title">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-right shadow-2xl dark:border-slate-700 dark:bg-slate-900" dir={isAr ? 'rtl' : 'ltr'}>
            <h3 id="my-quizzes-delete-title" className="mb-2 text-lg font-black text-slate-900 dark:text-white">
              {isAr ? 'حذف الاختبار؟' : 'Delete quiz?'}
            </h3>
            <p className="mb-6 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {isAr ? 'هل أنت متأكد من حذف هذا الاختبار نهائياً؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to permanently delete this quiz? This action cannot be undone.'}
            </p>
            <div className="flex justify-start gap-3">
              <button type="button" onClick={() => setQuizToDelete(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" onClick={() => { const id = quizToDelete; setQuizToDelete(null); onDeleteQuiz(id); }} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700">
                {isAr ? 'حذف نهائياً' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      <EssayReviewModal
        isOpen={essayModalOpen}
        onClose={() => setEssayModalOpen(false)}
        lang={lang}
        onGraded={() => {
          checkPendingReviews();
          fetchQuizzesList();
        }}
      />
    </div>
  );
}
