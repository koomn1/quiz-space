import React, { useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Quiz } from '../types';
import { translations } from '../lib/i18n';
import { BookOpen, RefreshCw } from 'lucide-react';
import { InteractiveQuizCard } from '../components/InteractiveQuizCard';

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
  isAdmin = false,
  onStartQuiz,
  onEditQuiz,
  onDeleteQuiz,
  onShareQuiz,
  fetchQuizzesList,
  userEmail
}: MyQuizzesProps) {
  const isAr = lang === 'ar';
  const myQuizzes = quizzes.filter(q => q.creatorId === userId);
  const t = translations[lang];
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-display text-slate-800 dark:text-white mb-2">
            {isAr ? 'اختباراتي الخاصة 📚' : 'My Personal Quizzes 📚'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {isAr ? 'إدارة وتحرير وحذف كافة الاختبارات العلمية التي قمت بتأليفها.' : 'Manage, edit, and inspect all quizzes authored by your account.'}
          </p>
        </div>
        
        <button 
          onClick={fetchQuizzesList}
          className="flex items-center justify-center gap-1.5 text-xs text-primary bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-bold transition-all cursor-pointer h-9 w-fit self-end sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{isAr ? 'تحديث القائمة' : 'Refresh List'}</span>
        </button>
      </div>

      {myQuizzes.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-850 shadow-sm max-w-xl mx-auto flex flex-col items-center justify-center space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500">
            <BookOpen className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-700 dark:text-slate-200">
              {isAr ? 'لم تقم بإنشاء أي اختبار بعد' : 'You haven\'t created any quizzes yet'}
            </h3>
            <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed">
              {isAr ? 'ابدأ الآن بتأليف اختبار تفاعلي باستخدام كوزمو لتبدأ رحلتك العلمية!' : 'Author a smart quiz or prompt the AI companion right now to start your cosmic journey!'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 [perspective:1400px]">
          
            {myQuizzes.map((quiz, idx) => (
              <InteractiveQuizCard
                
                quiz={quiz}
                idx={idx}
                isAr={isAr}
                t={t}
                currentUserEmail={userEmail}
                currentUserId={userId}
                isAdmin={isAdmin}
                onStartQuiz={onStartQuiz}
                onShareQuiz={onShareQuiz}
                onEditQuiz={onEditQuiz}
                onDeleteClick={(id) => {
                  setQuizToDelete(id);
                }}
                view="grid"
              />
            ))}
          
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
    </div>
  );
}
