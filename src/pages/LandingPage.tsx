/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Quiz } from '../types';
import { BookOpen, Star, Play, Share2, Search, ArrowLeft, RefreshCw, FileText, CheckCircle, Sparkles, Trash2, Cpu, Trophy, Layers, Flame, Lightbulb, Check, HelpCircle, MessageCircle, BrainCircuit, Rocket, Tag, LayoutGrid, List, Users } from 'lucide-react';
import { translations } from '../lib/i18n';
import { MainLogo } from '../components/MainLogo';
import ThreeDIcon from '../components/ThreeDIcon';
import { playChimeSound } from '../lib/chime';
import ParallaxTiltCard from '../components/ParallaxTiltCard';
import { getApiUrl } from '../lib/origin';
import { UserBadge } from '../components/UserBadge';
import { getAllProfiles, getSiteStats } from '../lib/db';
import DailyQuizCard from '../components/DailyQuizCard';

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
  dailyQuiz?: { userId?: string | null; planName?: string; isPremium?: boolean; onStartQuiz: (quizId: string) => void; onLoginClick?: () => void };
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
import ContactFooter from '../components/ContactFooter';

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
  onToggleViewMode,
  dailyQuiz
}: LandingPageProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [quizToDelete, setQuizToDelete] = React.useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [ownershipFilter, setOwnershipFilter] = React.useState<'all' | 'my-quizzes'>('all');

  const isAr = lang === 'ar';
  
  // Cosmo AI topics feature
  const currentCosmoAITopics = isAr ? SPARK_TOPICS_AR : SPARK_TOPICS_EN;

  const [profilesMap, setProfilesMap] = React.useState<Record<string, any>>({});
  const [siteStats, setSiteStats] = React.useState<any>(null);

  React.useEffect(() => {
    let active = true;
    
    // Fetch site stats
    getSiteStats().then(s => {
      if (active && s) setSiteStats(s);
    }).catch(() => {});

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
      
      {/* Professional Marketing Landing Hero for Unauthenticated Visitors */}
      <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-8 sm:p-14 text-white border border-indigo-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/25 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-black tracking-wide text-indigo-200">
            <MainLogo size="sm" showText={false} />
            <span>{isAr ? 'المنصة التعليمية الأولى للذكاء الاصطناعي والتحديات' : 'The #1 AI Educational & Quiz Platform'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-display tracking-tight leading-tight">
            {isAr ? 'ارتقِ بمسيرتك التعليمية والاختبارات الذكية مع ' : 'Elevate Your Learning & Quizzes With '}
            <span className="bg-gradient-to-r from-violet-400 via-primary to-cyan-400 bg-clip-text text-transparent">QuizSpace</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {isAr 
              ? 'أنشئ اختباراتك فوراً بالذكاء الاصطناعي، شارك في التحديات اليومية، احصل على جوائز ومكافآت، وتابع أداء طلابك ومجموعاتك بكل احترافية.'
              : 'Create instant AI quizzes, participate in daily challenges, earn rewards, and track your students with absolute precision.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={onLoginClick}
              className="px-8 py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white font-black text-sm sm:text-base transition-all shadow-lg shadow-primary/30 cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <span>{isAr ? 'ابدأ الآن وتصفح المنصة' : 'Get Started Now'}</span>
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
            <a
              href="#features"
              className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md text-white font-bold text-sm sm:text-base border border-white/15 transition-all cursor-pointer"
            >
              {isAr ? 'استكشف المميزات' : 'Explore Features'}
            </a>
          </div>
        </div>

        {/* Product Showcase Mockup Grid (Quizzes, Challenges, Rewards) */}
        <div id="features" className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {[
            {
              titleAr: 'إنشاء الاختبارات الذكية',
              titleEn: 'Instant AI Quiz Creator',
              descAr: 'توليد اختبارات شاملة من النصوص والملفات والروابط بضغطة زر واحدة.',
              descEn: 'Generate comprehensive quizzes from texts and files instantly.',
              icon: BrainCircuit,
              badge: isAr ? 'توليد ذكي' : 'AI Gen'
            },
            {
              titleAr: 'التحديات والمنافسة اليومية',
              titleEn: 'Daily Challenges & Streaks',
              descAr: 'تنافس مع زملائك، تصدر لوحة المتصدرين، واكسب النقاط والعملات.',
              descEn: 'Compete with peers, top the leaderboard, and earn coins.',
              icon: Trophy,
              badge: isAr ? 'تحديات حية' : 'Live'
            },
            {
              titleAr: 'متجر الجوائز والإطارات',
              titleEn: 'Rewards & Custom Frames',
              descAr: 'استبدل نقاطك بإطارات بروفايل مميزة وتفعيل باقات النخبة الحصرية.',
              descEn: 'Redeem points for custom profile frames and elite tiers.',
              icon: Star,
              badge: isAr ? 'مكافآت حصرية' : 'VIP'
            }
          ].map((card, idx) => {
            const IconComp = card.icon;
            return (
              <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between hover:border-violet-500/50 transition-all group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/30 group-hover:scale-110 transition-transform">
                      <IconComp className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base text-white mb-2">{isAr ? card.titleAr : card.titleEn}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{isAr ? card.descAr : card.descEn}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-violet-400">
                  <span>{isAr ? 'معاينة مباشرة' : 'Live Preview'}</span>
                  <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact & Professional Footer Links inside Landing */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-400">
          <div className="flex items-center gap-2">
            <MainLogo size="sm" />
            <span>© 2026 QuizSpace Platform. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="mailto:support@quizspace.app" className="hover:text-white transition-colors">support@quizspace.app</a>
            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1 text-emerald-400">
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Support</span>
            </a>
          </div>
        </div>
      </div>

      {/* Live site stats */}
      {siteStats && (
        <div className="gsap-fade-section mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {siteStats.totalQuizzes > 0 && (
            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-violet-500/10 p-4 text-center backdrop-blur-sm">
              <p className="text-2xl font-black text-purple-500">{siteStats.totalQuizzes.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1">{isAr ? 'اختبار متاح' : 'Quizzes'}</p>
            </div>
          )}
          {siteStats.totalCompletions > 0 && (
            <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-4 text-center backdrop-blur-sm">
              <p className="text-2xl font-black text-cyan-500">{siteStats.totalCompletions.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1">{isAr ? 'حل اختبارات' : 'Solved'}</p>
            </div>
          )}
          {siteStats.totalUsers > 0 && (
            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-green-500/10 p-4 text-center backdrop-blur-sm">
              <p className="text-2xl font-black text-emerald-500">{siteStats.totalUsers.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1">{isAr ? 'مستخدم نشط' : 'Users'}</p>
            </div>
          )}
          {siteStats.todayQuizzes > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4 text-center backdrop-blur-sm">
              <p className="text-2xl font-black text-amber-500">{siteStats.todayQuizzes.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1">{isAr ? 'كويز اليوم 🆕' : 'New Today'}</p>
            </div>
          )}
        </div>
      )}

      {/* Featured quiz of the week */}
      {siteStats?.featuredQuiz && quizzes.length > 0 && (
        <div className="gsap-fade-section mt-8">
          <div className="relative rounded-3xl border-2 border-amber-400/40 bg-gradient-to-r from-amber-400/10 via-yellow-400/5 to-orange-400/10 p-5 backdrop-blur-sm">
            <div className="absolute -top-3 right-4 flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black text-amber-950 shadow-lg">
              <Trophy className="w-3 h-3" />
              {isAr ? 'كويز الأسبوع ⭐' : 'Quiz of the Week ⭐'}
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h4 className="text-lg font-black text-slate-900 dark:text-white">{siteStats.featuredQuiz.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{siteStats.featuredQuiz.description || ''}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-400">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{siteStats.featuredQuiz.takersCount} {isAr ? 'حلّوه' : 'solvers'}</span>
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" />{siteStats.featuredQuiz.avgRating?.toFixed(1) || '—'}</span>
                </div>
              </div>
              <button
                onClick={() => onStartQuiz(siteStats.featuredQuiz.id)}
                className="min-h-11 shrink-0 rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                {isAr ? 'ابدأ الآن' : 'Start Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily challenge stays visible directly above the first quiz. */}
      {dailyQuiz && (
        <div className="gsap-fade-section mt-10">
          <DailyQuizCard
            lang={lang}
            userId={dailyQuiz.userId}
            planName={dailyQuiz.planName}
            isPremium={dailyQuiz.isPremium}
            onStartQuiz={dailyQuiz.onStartQuiz}
            onLoginClick={dailyQuiz.onLoginClick}
          />
        </div>
      )}

      {/* Main Interactive Quizzes Showcase list */}
      <div id="quizzes-catalog" className="space-y-6 mt-8">
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
                className="flex h-11 w-11 items-center justify-center text-xs text-slate-500 hover:text-primary dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                title={viewMode === 'grid' ? (isAr ? 'عرض القائمة' : 'Switch to List View') : (isAr ? 'عرض الشبكة' : 'Switch to Grid View')}
              >
                {viewMode === 'grid' ? <List className="w-4.5 h-4.5" /> : <LayoutGrid className="w-4.5 h-4.5" />}
              </button>
            )}

            <button 
              onClick={onRefresh}
              className="flex min-h-11 items-center justify-center gap-1.5 text-xs text-primary bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold transition-all cursor-pointer"
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

      <ContactFooter lang={lang} />
    </div>
  );
}
