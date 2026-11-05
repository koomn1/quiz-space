/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { Quiz } from '../types';
import {
  Sparkles,
  Search,
  Play,
  Share2,
  Trash2,
  Edit3,
  BookOpen,
  Flame,
  Clock,
  HelpCircle,
  ArrowUpRight,
  Zap,
} from 'lucide-react';
import { Button } from '../ios27/components/Button';
import { SegmentedControl } from '../ios27/components/SegmentedControl';

interface DeleteQuizConfirmDialogProps {
  isAr: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteQuizConfirmDialog({ isAr, onCancel, onConfirm }: DeleteQuizConfirmDialogProps) {
  const confirmButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    confirmButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/60 p-4 backdrop-blur-xs select-none animate-in fade-in duration-200"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="liquid-glass-large my-auto max-h-[min(640px,90dvh)] w-full max-w-sm overflow-y-auto rounded-3xl border border-white/40 dark:border-white/10 p-6 text-right shadow-2xl backdrop-blur-2xl sm:w-96 animate-in zoom-in-95 duration-200"
        dir={isAr ? 'rtl' : 'ltr'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-quiz-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 justify-start flex-row bg-red-50 dark:bg-red-950/25 p-3.5 rounded-2xl border border-red-100 dark:border-red-950/40">
          <div className="p-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-450 rounded-xl shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="text-right">
            <h4 id="delete-quiz-dialog-title" className="font-display font-black text-sm text-red-800 dark:text-red-300">
              {isAr ? 'تأكيد حذف الاختبار نهائياً' : 'Confirm Delete Quiz'}
            </h4>
            <p className="text-[10px] text-red-600 dark:text-red-400 font-bold mt-0.5">
              {isAr ? 'إجراء خطير ومستديم وقاطع' : 'This action is permanent and cannot be undone'}
            </p>
          </div>
        </div>

        <p className="mt-5 text-xs text-slate-900 dark:text-slate-100 leading-relaxed font-black">
          {isAr
            ? 'هل أنت متأكد من رغبتك في حذف هذا الاختبار نهائياً؟ سيتم إزالته بالكامل من خوادم قاعدة البيانات، واللوحات، والنتائج، ولا يمكن استرجاعه مجدداً.'
            : 'Are you sure you want to permanently delete this quiz? It will be fully removed from database servers, dashboards, and completions forever.'}
        </p>

        <div className="flex items-center gap-2.5 pt-5 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 border border-slate-200/50 dark:border-slate-600/30 cursor-pointer"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white shadow-md shadow-red-600/15 transition-all hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-650 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'تأكيد الحذف' : 'Delete Quiz'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export interface LandingPageProps {
  quizzes: Quiz[];
  isLoading: boolean;
  currentUserEmail?: string | null;
  currentUserId?: string | null;
  isAdmin?: boolean;
  onRefresh: () => void;
  onStartQuiz: (quizId: string) => void;
  onCreateQuizTab: (topic?: string) => void;
  onShareQuiz: (quizId: string, quizTitle: string, quizDescription?: string) => void;
  onEditQuiz?: (quiz: Quiz) => void;
  onViewProfile?: (creatorId: string) => void;
  onDeleteQuiz?: (quizId: string) => void;
  lang?: 'ar' | 'en';
  onLoginClick?: () => void;
  planName?: string;
  isPremium?: boolean;
  viewMode?: 'grid' | 'list';
  onToggleViewMode?: () => void;
  dailyQuiz?: {
    userId?: string | null;
    planName?: string;
    isPremium?: boolean;
    onStartQuiz: (quizId: string) => void;
    onLoginClick?: () => void;
  };
}

export default function LandingPage({
  quizzes,
  isLoading,
  currentUserEmail,
  currentUserId,
  isAdmin = false,
  onRefresh,
  onStartQuiz,
  onCreateQuizTab,
  onShareQuiz,
  onEditQuiz,
  onDeleteQuiz,
  onViewProfile,
  lang = 'ar',
  onLoginClick,
  planName = 'free',
  isPremium = false,
  dailyQuiz,
}: LandingPageProps) {
  const isAr = lang === 'ar';
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState('all');
  const [aiPromptInput, setAiPromptInput] = React.useState('');
  const [quizToDelete, setQuizToDelete] = React.useState<string | null>(null);

  const categoryKeys = React.useMemo(() => ['all', 'ai', 'science', 'code', 'history'], []);
  const categoryLabels = React.useMemo(
    () => [
      isAr ? 'الكل' : 'All',
      isAr ? 'ذكاء اصطناعي' : 'AI & Tech',
      isAr ? 'علوم وفيزياء' : 'Science',
      isAr ? 'برمجة وتطوير' : 'Coding',
      isAr ? 'تاريخ وثقافة' : 'History',
    ],
    [isAr]
  );
  const [selectedCategoryIndex, setSelectedCategoryIndex] = React.useState(0);

  const quickPrompts = isAr
    ? ['فيزياء الكم والكون', 'تاريخ مصر القديمة', 'أساسيات بايثون', 'الذكاء الاصطناعي التوليدي']
    : ['Quantum Physics', 'Ancient Egypt', 'Python Basics', 'Generative AI'];

  // Filter quizzes cleanly
  const filteredQuizzes = React.useMemo(() => {
    return quizzes.filter((q) => {
      const title = (q.title || '').toLowerCase();
      const desc = (q.description || '').toLowerCase();
      const creator = (q.creatorName || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || title.includes(query) || desc.includes(query) || creator.includes(query);

      let matchesCat = true;
      if (activeCategory === 'ai') {
        matchesCat = title.includes('ai') || title.includes('ذكاء') || desc.includes('ذكاء');
      } else if (activeCategory === 'science') {
        matchesCat = title.includes('فيزياء') || title.includes('علوم') || title.includes('science') || desc.includes('علوم');
      } else if (activeCategory === 'code') {
        matchesCat = title.includes('برمج') || title.includes('code') || title.includes('python') || title.includes('web');
      } else if (activeCategory === 'history') {
        matchesCat = title.includes('تاريخ') || title.includes('history') || title.includes('حضار');
      }

      return matchesSearch && matchesCat;
    });
  }, [quizzes, searchQuery, activeCategory]);

  const handleInstantGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const topic = aiPromptInput.trim();
    if (topic) {
      localStorage.setItem('quiz_prefill_topic', topic);
      onCreateQuizTab(topic);
    } else {
      onCreateQuizTab();
    }
  };

  const handleDeleteConfirm = () => {
    if (quizToDelete) {
      if (onDeleteQuiz) onDeleteQuiz(quizToDelete);
      setQuizToDelete(null);
    }
  };

  return (
    <div className="w-full min-h-dvh pb-28 lg:pb-16 select-none" dir={isAr ? 'rtl' : 'ltr'}>
      {quizToDelete && (
        <DeleteQuizConfirmDialog
          isAr={isAr}
          onCancel={() => setQuizToDelete(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {/* Hero Atmosphere — Containerless & Directly on the Canvas ("على الأرض") */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-12 max-w-6xl mx-auto text-center">
        {/* Subtle Ambient Glow Aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[300px] bg-gradient-to-tr from-violet-600/15 via-indigo-500/10 to-cyan-400/15 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 dark:bg-violet-400/15 text-violet-600 dark:text-violet-300 text-xs font-black tracking-wide mb-5">
          <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>{isAr ? 'فضاء الاختبارات الذكية • إصدار الجيل القادم' : 'QuizSpace Intelligent Universe • Next-Gen'}</span>
        </div>

        {/* Large Canvas Headline */}
        <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl tracking-tight text-slate-900 dark:text-white leading-[1.12]">
          {isAr ? (
            <>
              اصنع <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400">•</span> اختبر{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400">•</span> تنافس
            </>
          ) : (
            <>
              Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400">•</span> Test{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400">•</span> Excel
            </>
          )}
        </h1>

        <p className="mt-4 text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
          {isAr
            ? 'حوّل أي مادة أو فكرة إلى اختبار ذكي فوري بالذكاء الاصطناعي دون تعقيد أو حواجز.'
            : 'Transform lectures, files, and ideas into instant interactive quizzes seamlessly.'}
        </p>

        {/* Ethereal AI Prompt Input — Floating directly on the Canvas */}
        <div className="mt-9 max-w-2xl mx-auto">
          <form
            onSubmit={handleInstantGenerate}
            className="group relative flex flex-col sm:flex-row items-center gap-2 p-1.5 sm:p-2 rounded-2xl sm:rounded-full bg-white/60 dark:bg-slate-900/60 shadow-lg shadow-violet-500/5 ring-1 ring-slate-200/80 dark:ring-white/10 hover:ring-violet-500/40 transition-all duration-300 backdrop-blur-md"
          >
            <div className="flex items-center gap-3 px-4 py-2 flex-1 w-full text-right">
              <Sparkles className="w-5 h-5 text-violet-500 shrink-0 animate-pulse" />
              <input
                type="text"
                value={aiPromptInput}
                onChange={(e) => setAiPromptInput(e.target.value)}
                placeholder={
                  isAr
                    ? 'اكتب أي موضوع تريده وسيبنيه الذكاء الاصطناعي لك مباشرة...'
                    : 'Type any study topic and AI builds your quiz...'
                }
                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 font-semibold"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl sm:rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-black text-xs sm:text-sm shadow-md shadow-violet-500/25 flex items-center justify-center gap-2 shrink-0 transition-transform duration-200 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAr ? 'توليد فوري ⚡' : 'Generate ⚡'}</span>
            </button>
          </form>

          {/* Quick Constellation Pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap mt-3.5">
            <span className="text-[11px] text-slate-400 font-bold">
              {isAr ? 'مواضيع شائعة:' : 'Trending:'}
            </span>
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setAiPromptInput(prompt)}
                className="text-[11px] font-semibold px-3 py-1 rounded-full text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-300 bg-black/5 dark:bg-white/5 hover:bg-violet-500/10 transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Spotlight — Borderless Magazine Spread ("على الأرض") */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="relative py-6 sm:py-8 border-y border-slate-200/60 dark:border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl text-right">
            <div className="inline-flex items-center gap-1.5 text-amber-500 dark:text-amber-400 text-xs font-black tracking-wide">
              <Flame className="w-4 h-4" />
              <span>{isAr ? 'تحدي اليوم الحصري 🏆' : 'Daily Spotlight Challenge 🏆'}</span>
            </div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">
              {isAr ? 'اختبر معلوماتك العامة والذكاء الاصطناعي' : 'Test Your AI & General Knowledge'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              {isAr
                ? 'اختبار سريع ومتجدد يومياً لتطوير مهاراتك ورفع رتبتك في لوحة المتصدرين مع مكافأة +150 XP.'
                : 'A rapid daily test to build your streak, raise your rank on the leaderboard and earn +150 XP.'}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1 font-bold">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-violet-500" />
                <span>5 {isAr ? 'دقائق' : 'mins'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-500" />
                <span>10 {isAr ? 'أسئلة' : 'questions'}</span>
              </span>
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Flame className="w-3.5 h-3.5" />
                <span>+150 XP</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (quizzes.length > 0) {
                onStartQuiz(quizzes[0].id);
              } else {
                onCreateQuizTab();
              }
            }}
            className="w-full md:w-auto min-h-[48px] px-8 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-violet-500/25 shrink-0 flex items-center justify-center gap-2 transition-transform duration-200 active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isAr ? 'بدء التحدي الآن' : 'Start Challenge Now'}</span>
          </button>
        </div>
      </section>

      {/* Filter and Live Search Controls */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-auto overflow-x-auto pb-1 max-w-full">
            <SegmentedControl
              segments={categoryLabels}
              selected={selectedCategoryIndex}
              onChange={(idx) => {
                setSelectedCategoryIndex(idx);
                setActiveCategory(categoryKeys[idx] || 'all');
              }}
            />
          </div>

          <div className="w-full md:w-72">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث سريع في الاختبارات...' : 'Search quizzes...'}
                className="w-full pr-10 pl-4 py-2 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quizzes Stream — Floating directly on the Canvas with zero boxed containers ("على الأرض") */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="py-4 space-y-3 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="text-center py-20 px-4">
            <BookOpen className="w-12 h-12 text-slate-400/60 mx-auto mb-3" />
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              {isAr ? 'لا توجد اختبارات في هذا القسم' : 'No quizzes found here'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {isAr
                ? 'جرّب كتابة موضوع في شريط التوليد بالأعلى وسيقوم الذكاء الاصطناعي بإنشاء اختبار فوري لك!'
                : 'Type any topic in the generator above to create an instant quiz!'}
            </p>
            <button
              type="button"
              onClick={() => onCreateQuizTab()}
              className="mt-5 min-h-[44px] px-6 rounded-full bg-violet-600 text-white font-bold text-xs shadow-md shadow-violet-500/20 cursor-pointer"
            >
              {isAr ? 'إنشاء اختبار الآن' : 'Create Quiz Now'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {filteredQuizzes.map((quiz) => {
              const questionsCount = quiz.questions?.length || 10;
              const isOwner = currentUserId && quiz.creatorId === currentUserId;

              return (
                <div
                  key={quiz.id}
                  className="group relative flex flex-col justify-between py-2 transition-all duration-300 text-right"
                >
                  {/* Subtle Canvas Hover Aura */}
                  <div className="absolute -inset-3 rounded-2xl bg-violet-500/0 group-hover:bg-violet-500/[0.04] dark:group-hover:bg-violet-400/[0.04] transition-colors duration-300 pointer-events-none -z-10" />

                  <div>
                    {/* Top Row: Count & Actions */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-violet-500 group-hover:scale-125 transition-transform" />
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {questionsCount} {isAr ? 'أسئلة' : 'Q’s'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {isOwner && onEditQuiz && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditQuiz(quiz);
                            }}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                            title={isAr ? 'تعديل الاختبار' : 'Edit Quiz'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(isOwner || isAdmin) && onDeleteQuiz && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuizToDelete(quiz.id);
                            }}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                            title={isAr ? 'حذف الاختبار' : 'Delete Quiz'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShareQuiz(quiz.id, quiz.title, quiz.description);
                          }}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                          title={isAr ? 'مشاركة الاختبار' : 'Share Quiz'}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quiz Title */}
                    <h3
                      onClick={() => onStartQuiz(quiz.id)}
                      className="font-display font-black text-base sm:text-lg text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors cursor-pointer"
                    >
                      {quiz.title}
                    </h3>

                    {/* Quiz Description */}
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {quiz.description || (isAr ? 'اختبار تفاعلي شيق لاختبار معلوماتك.' : 'Interactive comprehension quiz.')}
                    </p>
                  </div>

                  {/* Card Floor Footer */}
                  <div className="pt-3 mt-3 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (quiz.creatorId && onViewProfile) {
                          onViewProfile(quiz.creatorId);
                        }
                      }}
                      className="text-[11px] text-slate-400 hover:text-violet-500 font-semibold truncate max-w-[120px] transition-colors cursor-pointer"
                    >
                      {quiz.creatorName || (isAr ? 'QuizSpace AI' : 'QuizSpace')}
                    </button>

                    <button
                      type="button"
                      onClick={() => onStartQuiz(quiz.id)}
                      className="min-h-[36px] px-4 rounded-full bg-violet-600/10 hover:bg-violet-600 text-violet-600 hover:text-white dark:text-violet-400 dark:hover:text-white font-black text-xs flex items-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer shadow-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isAr ? 'بدء' : 'Start'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
