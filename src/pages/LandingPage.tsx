/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Quiz } from '../types';
import {
  Sparkles,
  Download,
  Search,
  Play,
  Share2,
  Trash2,
  Edit3,
  BookOpen,
  Flame,
  Clock,
  HelpCircle,
  Zap,
  Users,
  Star,
  CheckCircle2,
  X,
  Compass,
  Cpu,
  Code2,
  Atom,
  History,
} from 'lucide-react';
import { createQuizPdfBytes, downloadQuizPdfBytes, getQuizPdfFileName } from '../lib/quizPdf';
import { PremiumNameTag } from '../components/PremiumNameTag';
import DailyQuizCard from '../components/DailyQuizCard';

gsap.registerPlugin(useGSAP);

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
  const [recentPrompts, setRecentPrompts] = React.useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('quizspace_recent_prompts') || '[]');
      return Array.isArray(saved) ? saved.filter((value): value is string => typeof value === 'string').slice(0, 3) : [];
    } catch (_) { return []; }
  });
  const [animatedTopic, setAnimatedTopic] = React.useState('');
  const topicExamples = isAr
    ? ['الذكاء الاصطناعي التوليدي', 'تشريح القلب والدورة الدموية', 'تاريخ مصر القديمة', 'أساسيات لغة Python', 'إدارة الوقت والمذاكرة']
    : ['Generative AI', 'Cardiovascular anatomy', 'Ancient Egyptian history', 'Python fundamentals', 'Study time management'];

  React.useEffect(() => {
    let topicIndex = 0;
    let characterIndex = 0;
    let deleting = false;
    let timer: number | undefined;
    const tick = () => {
      const topic = topicExamples[topicIndex % topicExamples.length];
      if (!deleting) {
        characterIndex += 1;
        setAnimatedTopic(topic.slice(0, characterIndex));
        if (characterIndex >= topic.length) {
          deleting = true;
          timer = window.setTimeout(tick, 1450);
          return;
        }
      } else {
        characterIndex -= 1;
        setAnimatedTopic(topic.slice(0, characterIndex));
        if (characterIndex <= 0) {
          deleting = false;
          topicIndex += 1;
        }
      }
      timer = window.setTimeout(tick, deleting ? 38 : 72);
    };
    timer = window.setTimeout(tick, 500);
    return () => { if (timer) window.clearTimeout(timer); };
  }, [isAr, topicExamples.join('|')]);

  const topicPlaceholderRef = React.useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    if (!topicPlaceholderRef.current || aiPromptInput) return;
    gsap.fromTo(topicPlaceholderRef.current, { opacity: 0.35, y: 3 }, { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' });
  }, { dependencies: [animatedTopic, aiPromptInput], scope: topicPlaceholderRef });

  const categories = React.useMemo(
    () => [
      { id: 'all', label: isAr ? 'الكل' : 'All', icon: Compass, color: 'text-slate-400' },
      { id: 'ai', label: isAr ? 'ذكاء اصطناعي' : 'AI & Tech', icon: Cpu, color: 'text-cyan-400' },
      { id: 'science', label: isAr ? 'علوم وفيزياء' : 'Science', icon: Atom, color: 'text-emerald-400' },
      { id: 'code', label: isAr ? 'برمجة وتطوير' : 'Coding', icon: Code2, color: 'text-sky-400' },
      { id: 'history', label: isAr ? 'تاريخ وثقافة' : 'History', icon: History, color: 'text-amber-400' },
    ],
    [isAr]
  );

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
        matchesCat = title.includes('ai') || title.includes('ذكاء') || desc.includes('ذكاء') || title.includes('تقني');
      } else if (activeCategory === 'science') {
        matchesCat = title.includes('فيزياء') || title.includes('علوم') || title.includes('science') || desc.includes('علوم') || title.includes('طبي');
      } else if (activeCategory === 'code') {
        matchesCat = title.includes('برمج') || title.includes('code') || title.includes('python') || title.includes('web') || title.includes('react');
      } else if (activeCategory === 'history') {
        matchesCat = title.includes('تاريخ') || title.includes('history') || title.includes('حضار') || title.includes('ثقاف');
      }

      return matchesSearch && matchesCat;
    });
  }, [quizzes, searchQuery, activeCategory]);

  const handleInstantGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const topic = aiPromptInput.trim();
    if (topic) {
      localStorage.setItem('quiz_prefill_topic', topic);
      const nextRecent = [topic, ...recentPrompts.filter((item) => item.toLowerCase() !== topic.toLowerCase())].slice(0, 3);
      setRecentPrompts(nextRecent);
      localStorage.setItem('quizspace_recent_prompts', JSON.stringify(nextRecent));
      onCreateQuizTab(topic);
    } else {
      onCreateQuizTab();
    }
  };

  const exportQuizPdf = async (quiz: Quiz) => {
    try {
      const branding = {
        institutionName: quiz.creatorName || '',
        pdfTitle: quiz.title,
        pdfDescription: quiz.description || '',
        studentName: '',
        examDate: new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US'),
        score: null,
        essayAnswerHeight: 120,
      };
      const bytes = await createQuizPdfBytes(quiz, branding);
      downloadQuizPdfBytes(bytes, getQuizPdfFileName(quiz, branding));
    } catch (error) {
      console.error('Quiz PDF export failed:', error);
      window.alert(isAr ? 'تعذر تصدير الاختبار حالياً.' : 'Could not export this quiz right now.');
    }
  };

  const handleDeleteConfirm = () => {
    if (quizToDelete) {
      if (onDeleteQuiz) onDeleteQuiz(quizToDelete);
      setQuizToDelete(null);
    }
  };

  return (
    <div className="w-full min-h-dvh pb-32 select-none" dir={isAr ? 'rtl' : 'ltr'}>
      {quizToDelete && (
        <DeleteQuizConfirmDialog
          isAr={isAr}
          onCancel={() => setQuizToDelete(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {/* Hero Atmosphere — Modern, Balanced & Elevated Canvas */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-6 sm:pt-12 pb-10 max-w-5xl mx-auto text-center">
        {/* Balanced Ambient Glow Aura (Cyan + Amber + Indigo, NOT oversaturated purple) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[600px] h-[280px] bg-gradient-to-tr from-cyan-500/10 via-sky-600/10 to-amber-400/10 rounded-full blur-[110px] pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 text-sky-500 dark:text-sky-300 border border-sky-500/20 text-xs font-black tracking-wide mb-5 shadow-xs">
          <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>{isAr ? 'فضاء الاختبارات التفاعلية • الجيل الجديد' : 'Interactive Assessment Universe • Next-Gen'}</span>
        </div>

        {/* Large Canvas Headline with Iridescent Multi-Color Gradient */}
        <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl tracking-tight text-slate-900 dark:text-white leading-[1.14]">
          {isAr ? (
            <>
              اصنع <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-amber-300">•</span> اختبر{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-amber-300">•</span> وتصدّر
            </>
          ) : (
            <>
              Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-amber-300">•</span> Test{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-amber-300">•</span> Excel
            </>
          )}
        </h1>

        <p className="mt-4 text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
          {isAr
            ? 'حوّل أي مادة أو فكرة إلى اختبار ذكي فوري بالذكاء الاصطناعي دون تعقيد أو حواجز.'
            : 'Transform lectures, files, and ideas into instant interactive quizzes seamlessly.'}
        </p>

        {/* AI Prompt Input Bar — High-Contrast Clean Frosted Capsule */}
        <div className="mt-8 max-w-2xl mx-auto">
          <form
            onSubmit={handleInstantGenerate}
            className="group relative flex flex-col sm:flex-row items-center gap-2 p-1.5 sm:p-2 rounded-2xl sm:rounded-full bg-white/80 dark:bg-slate-900/80 shadow-xl shadow-black/5 ring-1 ring-black/10 dark:ring-white/15 focus-within:ring-2 focus-within:ring-sky-500/50 transition-all duration-300 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 px-4 py-2 flex-1 w-full text-right">
              <Sparkles className="w-5 h-5 text-sky-500 shrink-0 animate-pulse" />
              <input
                type="text"
                value={aiPromptInput}
                onChange={(e) => setAiPromptInput(e.target.value)}
                placeholder=""
                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 font-semibold"
              />
              {!aiPromptInput && (
                <span ref={topicPlaceholderRef} aria-hidden="true" className="pointer-events-none absolute start-14 end-28 truncate text-right text-xs font-semibold text-slate-400 sm:text-sm">
                  {animatedTopic || (isAr ? 'اكتب أي موضوع...' : 'Type any study topic...')}
                  <span className="ms-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-sky-400 align-middle" />
                </span>
              )}
              {aiPromptInput && (
                <button
                  type="button"
                  onClick={() => setAiPromptInput('')}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl sm:rounded-full bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 shrink-0 transition-transform duration-200 active:scale-95 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>{isAr ? 'توليد فوري' : 'Generate'}</span>
            </button>
          </form>

          {/* Quick Trending Topics Pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap mt-3.5">
            <span className="text-[11px] text-slate-400 font-bold">
              {isAr ? 'مواضيع مقترحة:' : 'Popular:'}
            </span>
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setAiPromptInput(prompt)}
                className="text-[11px] font-semibold px-3 py-1 rounded-full text-slate-700 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400 bg-black/5 dark:bg-white/5 hover:bg-sky-500/10 transition-colors cursor-pointer border border-black/5 dark:border-white/5"
              >
                {prompt}
              </button>
            ))}
            {recentPrompts.map((prompt) => (
              <button
                key={`recent-${prompt}`}
                type="button"
                onClick={() => setAiPromptInput(prompt)}
                className="text-[11px] font-semibold px-3 py-1 rounded-full text-violet-700 dark:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 transition-colors cursor-pointer border border-violet-500/15"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tier-aware private daily challenge — rotates from the bank per plan window. */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        {dailyQuiz ? <DailyQuizCard
          lang={lang}
          userId={dailyQuiz.userId || undefined}
          planName={dailyQuiz.planName}
          isPremium={dailyQuiz.isPremium}
          onStartQuiz={dailyQuiz.onStartQuiz}
          onLoginClick={dailyQuiz.onLoginClick}
        /> : <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/[0.08] via-orange-500/[0.05] to-transparent border border-amber-500/20 dark:border-amber-400/15 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2 max-w-2xl text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-black tracking-wide border border-amber-500/20">
              <Flame className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
              <span>{isAr ? 'تحدي اليوم الحصري ' : 'Daily Spotlight Challenge '}</span>
            </div>
            <h2 className="font-display font-black text-xl sm:text-2xl text-slate-900 dark:text-white">
              {isAr ? 'اختبر معلوماتك العامة والذكاء الاصطناعي' : 'Test Your AI & General Knowledge'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              {isAr
                ? 'اختبار سريع ومتجدد يومياً لتطوير مهاراتك ورفع رتبتك في لوحة المتصدرين مع مكافأة +150 XP.'
                : 'A rapid daily test to build your streak, raise your rank on the leaderboard and earn +150 XP.'}
            </p>
            <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1 font-bold flex-wrap">
              <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                <Clock className="w-3.5 h-3.5" />
                <span>5 {isAr ? 'دقائق' : 'mins'}</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>10 {isAr ? 'أسئلة' : 'questions'}</span>
              </span>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black">
                <Star className="w-3.5 h-3.5 fill-current" />
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
            className="w-full md:w-auto min-h-[46px] px-7 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 shrink-0 flex items-center justify-center gap-2 transition-transform duration-200 active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isAr ? 'خُض التحدي الآن' : 'Start Challenge Now'}</span>
          </button>
        </div>}
      </section>

      {/* Filter and Live Search Controls — Fully Responsive with zero collisions */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 space-y-4">
        {/* 1. Full-Width Clean Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث باسم الاختبار، الموضوع، أو اسم المعلم...' : 'Search quizzes by title, topic, or creator...'}
            className="w-full pr-11 pl-10 py-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/40 backdrop-blur-md transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 2. Fluid Horizontal Category Chips (Never Collide) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm scale-102'
                    : 'bg-white/40 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? '' : cat.color}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Quizzes Stream — Breathable, High-Contrast Glass Cards with Solvers Prominently Shown */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-5 rounded-3xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="w-16 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="w-12 h-4 rounded-md bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-full" />
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between">
                  <div className="w-24 h-6 rounded-md bg-slate-200 dark:bg-slate-800" />
                  <div className="w-16 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-3xl bg-white/30 dark:bg-slate-900/30 border border-slate-200 dark:border-white/5">
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
              className="mt-5 min-h-[44px] px-6 rounded-full bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 cursor-pointer hover:bg-sky-400 transition-colors"
            >
              {isAr ? 'إنشاء اختبار الآن' : 'Create Quiz Now'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filteredQuizzes.map((quiz) => {
              const questionsCount = quiz.questions?.length || 10;
              const isOwner = currentUserId && quiz.creatorId === currentUserId;
              const plays = quiz.totalPlays || 0;
              const rating = quiz.avgRating ? quiz.avgRating.toFixed(1) : '5.0';
              const estMinutes = Math.max(3, Math.round(questionsCount * 0.7));

              return (
                <div
                  key={quiz.id}
                  className="group relative flex flex-col justify-between p-5 rounded-3xl bg-white/[0.6] dark:bg-slate-900/40 hover:bg-white/[0.9] dark:hover:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 hover:border-sky-500/40 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 text-right backdrop-blur-md"
                >
                  <div>
                    {/* Top Status Strip: Solvers count, Questions count & Owner Actions */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {/* Solvers & Questions Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Solvers Counter — Clearly highlighting who solved it! */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                          <Users className="w-3 h-3" />
                          <span>
                            {plays > 0
                              ? (isAr ? `${plays.toLocaleString()} حلاً` : `${plays} solved`)
                              : (isAr ? 'جديد ' : 'New ')}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-bold">
                          <span>{questionsCount} {isAr ? 'سؤالاً' : 'Q’s'}</span>
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span>{rating}</span>
                        </span>
                      </div>

                      {/* Action Menu (Share, Edit, Delete) */}
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
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
                      className="font-display font-black text-base sm:text-lg text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors cursor-pointer"
                    >
                      {quiz.title}
                    </h3>

                    {/* Quiz Description */}
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                      {quiz.description || (isAr ? 'اختبار تفاعلي شيق لقياس مستواك المعرفي.' : 'Interactive comprehension quiz.')}
                    </p>

                    {/* Duration badge */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-semibold mt-3">
                      <Clock className="w-3 h-3 text-sky-400" />
                      <span>{isAr ? `الزمن المقدر: ~${estMinutes} دقائق` : `Est. time: ~${estMinutes} mins`}</span>
                    </div>
                  </div>

                  {/* Card Actions: visible on the card, never hidden in a menu */}
                  <div className="pt-3.5 mt-4 border-t border-slate-200/60 dark:border-white/10 space-y-3">
                    <div className="flex flex-wrap items-center gap-2" dir={isAr ? 'rtl' : 'ltr'}>
                      <button type="button" onClick={() => void exportQuizPdf(quiz)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-black text-violet-700 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200" title={isAr ? 'تصدير الاختبار PDF' : 'Export quiz as PDF'}>
                        <Download className="h-3.5 w-3.5" />
                        <span>PDF</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                    {/* Creator Identity with Verified Look */}
                    <button
                      type="button"
                      onClick={() => {
                        if (quiz.creatorId && onViewProfile) {
                          onViewProfile(quiz.creatorId);
                        }
                      }}
                      className="flex items-center gap-2 group/creator text-right max-w-[150px] truncate cursor-pointer"
                    >
                      <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs ring-2 ring-white/70 dark:ring-slate-800 overflow-hidden">
                        {quiz.creatorPhotoURL ? <img src={quiz.creatorPhotoURL} alt="" className="h-full w-full object-cover" loading="lazy" /> : (quiz.creatorName ? quiz.creatorName.charAt(0).toUpperCase() : 'Q')}
                      </div>
                      <div className="min-w-0">
                        <PremiumNameTag
                          name={quiz.creatorName || (isAr ? 'QuizSpace AI' : 'QuizSpace')}
                          isPremium={!!quiz.creatorBadgeTier && quiz.creatorBadgeTier !== 'none'}
                          badgeTier={quiz.creatorBadgeTier as any}
                          nameColor={quiz.creatorNameColor as any}
                          badgeColor={quiz.creatorBadgeColor as any}
                          badgeSize="sm"
                          className="max-w-[130px] truncate text-[11px] font-black group-hover/creator:text-sky-400"
                        />
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {isAr ? 'صانع الاختبار' : 'Quiz Creator'}
                        </p>
                      </div>
                    </button>

                    {/* Prominent Start Button */}
                    <button
                      type="button"
                      onClick={() => onStartQuiz(quiz.id)}
                      className="min-h-[38px] px-4 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer shadow-md shadow-sky-500/20"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isAr ? 'ابدأ الحل' : 'Start'}</span>
                    </button>
                    </div>
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
