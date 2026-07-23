/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Quiz } from '../types';
import { BookOpen, Star, Play, Share2, Search, ArrowLeft, RefreshCw, FileText, CheckCircle, Sparkles, Trash2, Cpu, Trophy, Layers, Flame, Lightbulb, Check, HelpCircle, MessageCircle, BrainCircuit, Rocket, Tag, LayoutGrid, List } from 'lucide-react';
import { translations } from '../lib/i18n';
import { MainLogo } from '../components/MainLogo';
import ThreeDIcon from '../components/ThreeDIcon';
import { playChimeSound } from '../components/ExtraFeatures';
import ParallaxTiltCard from '../components/ParallaxTiltCard';
import { getApiUrl } from '../lib/origin';
import { UserBadge } from '../components/UserBadge';
import { getAllProfiles } from '../lib/db';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

import { Hero3DScene } from '../components/Hero3DScene';
import { InteractiveQuizCard } from '../components/InteractiveQuizCard';
import { HeroAnimation } from '../components/HeroAnimation';

interface LandingPageProps {
  quizzes: Quiz[];
  isLoading: boolean;
  currentUserEmail?: string | null;
  currentUserId?: string | null;
  onRefresh: () => void;
  onStartQuiz: (quizId: string) => void;
  onCreateQuizTab: () => void;
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
}

const SPARK_TOPICS_EN = [
  "Black Holes & The Universe",
  "History of AI",
  "World War II",
  "The Deep Ocean & Bioluminescence",
  "Ancient Egyptian Civilization",
  "Quantum Mechanics",
  "Discovery of Penicillin",
  "Future of Renewable Energy",
  "Journey to Mars",
  "Dinosaurs & Extinction",
  "DNA Structure",
  "Greek Mythology",
  "The Roman Empire",
  "Psychology of Dreams"
];

const SPARK_TOPICS_AR = [
  "الثقوب السوداء ونشأة الكون",
  "تاريخ الذكاء الاصطناعي",
  "الحرب العالمية الثانية",
  "أعماق المحيطات والمخلوقات المضيئة",
  "الحضارة المصرية القديمة",
  "ميكانيكا الكم",
  "اكتشاف البنسلين",
  "مستقبل الطاقة المتجددة",
  "الرحلة إلى المريخ",
  "الديناصورات وعصر الانقراض",
  "تركيبة الحمض النووي (DNA)",
  "الأساطير الإغريقية",
  "الامبراطورية الرومانية",
  "سيكولوجية الأحلام"
];

import { PremiumLoader } from '../components/PremiumLoader';

export default function LandingPage({
  quizzes,
  isLoading,
  currentUserEmail,
  currentUserId,
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
  viewMode = 'grid',
  onToggleViewMode
}: LandingPageProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [quizToDelete, setQuizToDelete] = React.useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [ownershipFilter, setOwnershipFilter] = React.useState<'all' | 'my-quizzes'>('all');

  const isAr = lang === 'ar';
  
  // Spark topics feature
  const currentSparkTopics = isAr ? SPARK_TOPICS_AR : SPARK_TOPICS_EN;

  const [profilesMap, setProfilesMap] = React.useState<Record<string, any>>({});

  React.useEffect(() => {
    let active = true;
    
    // Fetch profiles map to show correct badges
    const loadProfiles = async () => {
      try {
        const pList = await getAllProfiles();
        const map: Record<string, any> = {};
        pList.forEach(p => {
          map[p.userId] = p;
        });
        if (active) setProfilesMap(map);
      } catch (err) {
        console.error('Failed to load profiles map', err);
      }
    };

    loadProfiles();

    return () => {
      active = false;
    };
  }, [planName]);

  const t = translations[lang];
  const isGuest = !currentUserId || currentUserId.startsWith('user-');

  const tags = isAr 
    ? ['الذكاء الاصطناعي', 'البرمجة', 'الفيزياء', 'التاريخ', 'الفضاء', 'الطب', 'العلوم', 'تطوير الويب'] 
    : ['AI', 'Programming', 'Physics', 'History', 'Space', 'Medicine', 'Science', 'Web Dev'];

  const filteredQuizzes = quizzes.filter(
    (q) => {
      // Handle ownership filter
      if (ownershipFilter === 'my-quizzes') {
        if (!currentUserId || q.creatorId !== currentUserId) return false;
      } else {
        const isPublic = !q.distributionRouting || q.distributionRouting === 'public';
        if (!isPublic) return false;
      }

      // Handle search query
      const matchesSearch = (q.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (q.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (q.creatorName || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      // Handle tag/category filter
      const matchesCategory = !selectedCategory || 
                              (q.title || '').toLowerCase().includes(selectedCategory.toLowerCase()) || 
                              (q.description || '').toLowerCase().includes(selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    }
  );

  const containerRef = React.useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.fromTo('.gsap-hero-title-1', { opacity: 0, y: 50, rotateX: -20 }, { opacity: 1, y: 0, rotateX: 0, duration: 1, ease: 'power4.out' })
      .fromTo('.gsap-hero-title-2', { opacity: 0, y: 50, rotateX: -20 }, { opacity: 1, y: 0, rotateX: 0, duration: 1, ease: 'power4.out' }, '-=0.8')
      .fromTo('.gsap-hero-desc', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
      .fromTo('.gsap-hero-btns', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.5)' }, '-=0.4');

    gsap.fromTo('.gsap-stat-card', 
      { opacity: 0, y: 40, scale: 0.9 },
      { 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        duration: 0.6, 
        stagger: 0.1, 
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.gsap-stats-container',
          start: 'top 85%',
        }
      }
    );

    gsap.utils.toArray('.gsap-fade-section').forEach((section: any) => {
      gsap.fromTo(section,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
          }
        }
      );
    });

  }, { scope: containerRef });


  return (
    <div ref={containerRef} className="space-y-12 pb-16" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Massive GSAP Hero Section */}
      <HeroAnimation t={t} isAr={isAr} onCreateQuizTab={onCreateQuizTab} sparkTopics={currentSparkTopics} />

      {/* Statistics Banner / Interactive counters */}
      <div className="gsap-stats-container grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-12 relative z-10">
        <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10 blur-[100px] -z-10 rounded-full"></div>
        {[
          { 
            label: t.activeQuizzes, 
            val: `${quizzes.length}`, 
            color: 'from-emerald-400 to-cyan-400',
            bg: 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]'
          },
          { 
            label: t.totalPlays, 
            val: `${quizzes.reduce((acc, q) => acc + (q.totalPlays || 0), 0)}`, 
            color: 'from-indigo-400 to-violet-500',
            bg: 'bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)]'
          },
          { 
            label: t.aiEngines, 
            val: 'Gemini 2.5', 
            color: 'from-purple-400 to-pink-500',
            bg: 'bg-purple-500/10 border-purple-500/20 shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)]'
          },
          { 
            label: t.avgRating, 
            val: '4.9 ★', 
            color: 'from-amber-400 to-orange-500',
            bg: 'bg-amber-500/10 border-amber-500/20 shadow-[0_0_30px_-10px_rgba(245,158,11,0.3)]'
          }
        ].map((stat, i) => (
          <div 
            key={i} 
            className={`gsap-stat-card ${stat.bg} backdrop-blur-xl border p-6 sm:p-8 rounded-[32px] flex flex-col items-center justify-center text-center transition-all duration-500 select-none group hover:-translate-y-2 hover:scale-[1.02] relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-overlay"></div>
            <span className={`text-4xl sm:text-5xl font-black font-display tracking-tighter bg-gradient-to-br ${stat.color} bg-clip-text text-transparent block mb-2 group-hover:scale-110 transition-transform duration-500 drop-shadow-sm`}>{stat.val}</span>
            <span className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 font-bold uppercase tracking-[0.2em]">{stat.label}</span>
          </div>
        ))}
      </div>



      {/* Guest Welcome Board / Login CTA */}
      {isGuest && (
        <div
          className="gsap-fade-section overflow-hidden py-4 px-6 rounded-2xl bg-indigo-50/50 dark:bg-[#111827]/40 border border-indigo-100 dark:border-indigo-900/30 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8"
        >
          <div className="flex items-center gap-3 text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
            <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-xl hidden sm:block">
              <Rocket className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                {isAr ? 'أنت تتصفح كزائر' : 'Browsing as Guest'}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr 
                  ? 'سجل دخولك لحفظ إجاباتك والمنافسة في لوحة المتصدرين'
                  : 'Sign in to save your progress and compete on leaderboards'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onLoginClick}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-600/20 transition-all cursor-pointer whitespace-nowrap"
          >
            {isAr ? 'تفعيل الحساب' : 'Sign In'}
          </button>
        </div>
      )}

      {/* Main Interactive Quizzes Showcase list */}
      <div id="quizzes-catalog" className="space-y-6 mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
            <h3 className="font-display text-2xl sm:text-3xl font-black bg-gradient-to-r from-primary via-violet-500 to-cyan-500 bg-clip-text text-transparent inline-block">
              {t.catalogTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold">
              {t.catalogSubTitle}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {onToggleViewMode && (
              <button 
                onClick={onToggleViewMode}
                className="flex items-center justify-center p-2 text-xs text-slate-500 hover:text-primary dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer h-9"
                title={viewMode === 'grid' ? (isAr ? 'عرض القائمة' : 'Switch to List View') : (isAr ? 'عرض الشبكة' : 'Switch to Grid View')}
              >
                {viewMode === 'grid' ? <List className="w-4.5 h-4.5" /> : <LayoutGrid className="w-4.5 h-4.5" />}
              </button>
            )}

            <button 
              onClick={onRefresh}
              className="flex items-center justify-center gap-1.5 text-xs text-primary bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold transition-all cursor-pointer h-9"
              disabled={isLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{t.refreshBtn}</span>
            </button>
          </div>
        </div>

        {/* Search controls row */}
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 pr-11 pl-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 outline-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary dark:focus:border-primary transition-all duration-200"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Ownership Filter */}
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              <button
                onClick={() => setOwnershipFilter('all')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  ownershipFilter === 'all' 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {isAr ? 'الكل (عام)' : 'All (Public)'}
              </button>
              <button
                onClick={() => setOwnershipFilter('my-quizzes')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  ownershipFilter === 'my-quizzes' 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {isAr ? 'اختباراتي' : 'My Quizzes'}
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                  !selectedCategory 
                    ? 'bg-primary border-primary text-white shadow-md' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isAr ? '🌐 الكل' : 'All'}
              </button>
              {tags.map(tag => (
                <button 
                  key={tag}
                  onClick={() => setSelectedCategory(tag)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                    selectedCategory === tag 
                      ? 'bg-primary border-primary text-white shadow-md' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quizzes List rendering */}
        {isLoading ? (
          <PremiumLoader text={t.loadingQuizzes} />
        ) : filteredQuizzes.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 sm:p-12 text-center max-w-xl mx-auto space-y-6 flex flex-col items-center justify-center glow-card">
            <div className="animate-pulse">
              <ThreeDIcon name="science" className="w-28 h-28 mx-auto drop-shadow-[0_20px_20px_rgba(124,58,237,0.3)] filter brightness-110" />
            </div>
            <div className="space-y-2">
              <h4 className="font-display font-black text-2xl text-slate-800 dark:text-slate-100">{t.noQuizzesFound}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                {t.noQuizzesSub}
              </p>
            </div>
            <button
              onClick={onCreateQuizTab}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary-hover text-white font-black text-sm transition-all hover:scale-105 hover:shadow-lg shadow-primary/20 cursor-pointer"
            >
              {t.createFirstQuiz}
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 [perspective:1400px]" : "flex flex-col gap-4 max-w-4xl mx-auto"}>
            {filteredQuizzes.map((quiz, idx) => {
              const creatorProfile = profilesMap[quiz.creatorId || ''];
              const creatorTier = creatorProfile?.planName || (quiz.creatorId === 'sys-1' || quiz.creatorName?.includes('أدمن') ? 'enterprise' : 'free');
              return (
                <InteractiveQuizCard
                  key={quiz.id}
                  quiz={quiz}
                  idx={idx}
                  isAr={isAr}
                  t={t}
                  currentUserEmail={currentUserEmail}
                  currentUserId={currentUserId}
                  onStartQuiz={onStartQuiz}
                  onShareQuiz={onShareQuiz}
                  onEditQuiz={onEditQuiz}
                  onViewProfile={onViewProfile}
                  creatorTier={creatorTier}
                  onDeleteClick={setQuizToDelete}
                  view={viewMode}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Non-blocking Custom Confirm Delete Dialog Modals */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-sm w-full p-6 shadow-xl space-y-5 text-right w-80 sm:w-96 animate-in zoom-in-95 duration-200"
            dir={isAr ? 'rtl' : 'ltr'}
          >
              <div className="flex items-center gap-3 justify-start flex-row bg-red-50 dark:bg-red-950/25 p-3.5 rounded-2xl border border-red-100 dark:border-red-950/40">
                <div className="p-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-450 rounded-xl flex-shrink-0 animate-bounce">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <h4 className="font-display font-black text-sm text-red-800 dark:text-red-300">
                    {isAr ? 'تأكيد حذف الاختبار نهائياً' : 'Confirm Delete Quiz'}
                  </h4>
                  <p className="text-[10px] text-red-600 dark:text-red-400 font-bold mt-0.5">
                    {isAr ? 'إجراء خطير ومستديم وقاطع' : 'This action is permanent and cannot be undone'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-900 dark:text-slate-100 leading-relaxed font-black">
                {isAr 
                  ? 'هل أنت متأكد من رغبتك في حذف هذا الاختبار نهائياً؟ سيتم إزالته بالكامل من خوادم قاعدة البيانات، واللوحات، والنتائج، ولا يمكن استرجاعه مجدداً.'
                  : 'Are you sure you want to permanently delete this quiz? It will be fully removed from database servers, dashboards, and completions forever.'}
              </p>

              <div className="flex items-center gap-2.5 pt-1.5 justify-end">
                <button
                  type="button"
                  onClick={() => setQuizToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200/50 dark:border-slate-600/30"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteQuiz && quizToDelete) {
                      onDeleteQuiz(quizToDelete);
                    }
                    setQuizToDelete(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-650 text-white text-xs font-black shadow-md shadow-red-600/15 transition-all cursor-pointer"
                >
                  {isAr ? 'تأكيد الحذف 🗑' : 'Delete Quiz 🗑'}
                </button>
              </div>
            </div>
          </div>
        )}

    </div>
  );
}
