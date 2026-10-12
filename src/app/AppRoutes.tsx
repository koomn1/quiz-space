import React from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { AVATAR_PRESETS } from '../constants/profileAssets';
import { getUserProfileStats, deleteQuiz } from '../lib/db';
import { getUserRoleAndPlan } from '../types';
import { playNotificationSound } from '../lib/sound';
import LandingPage from '../pages/LandingPage';
import GuestLandingPage from '../pages/GuestLandingPage';
import NotFound from '../pages/NotFound';
import QuizResolver from '../components/QuizResolver';
import MessageInbox from '../components/MessageInbox';
import AdminGuard from '../components/AdminGuard';
import CosmicLoader from '../components/CosmicLoader';
import PageSkeleton from '../components/PageSkeleton';
import { MyQuizzes } from '../pages/MyQuizzes';
import { ExploreSection, CategoriesSection, CommunitySection, BookmarksSection, AchievementsSection, SettingsSection, LeaderboardSection } from '../components/ExtraFeatures';
import { AnalyticsDashboard } from '../pages/AnalyticsDashboard';
import { BillingSection } from '../components/BillingSection';
import InstitutionWorkspace from '../components/InstitutionWorkspace';
import UserProfile from '../pages/UserProfile';
import AdminDashboard from '../pages/AdminDashboard';
import Support from '../pages/Support';
import Classrooms from '../components/Classrooms';
import MotivationHubPage, { type MotivationSection } from '../pages/MotivationHubPage';
import AIChat from '../pages/AIChat';
import QuizCreator from '../pages/QuizCreator';

function lazyWithRetry<T extends React.ComponentType<any>>(loader: () => Promise<{ default: T }>, routeKey: string) {
  return React.lazy(async () => {
    try {
      const module = await loader();
      window.sessionStorage.removeItem(`quizspace-lazy-retry:${routeKey}`);
      return module;
    } catch (error) {
      const retryKey = `quizspace-lazy-retry:${routeKey}`;
      if (!window.sessionStorage.getItem(retryKey)) {
        window.sessionStorage.setItem(retryKey, '1');
        const retryUrl = new URL(window.location.href);
        retryUrl.searchParams.set('asset-retry', Date.now().toString());
        window.location.replace(retryUrl.toString());
        return new Promise<never>(() => undefined);
      }
      throw error;
    }
  });
}

class LazyRouteErrorBoundary extends React.Component<React.PropsWithChildren<{ lang: 'ar' | 'en' }>, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: unknown, info: React.ErrorInfo) { console.error('[QuizSpace] lazy route render failed', error, info.componentStack); }
  render() {
    if (this.state.hasError) {
      const isAr = this.props.lang === 'ar';
      return (
        <section className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center" role="alert">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500"><AlertTriangle className="h-7 w-7" /></div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">{isAr ? 'تعذر فتح هذه الصفحة' : 'This page could not be opened'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{isAr ? 'حدث ذلك غالباً بعد تحديث المنصة. أعد تحميل الصفحة للحصول على الإصدار الأحدث.' : 'This usually happens after a platform update. Reload the page to get the latest version.'}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 min-h-11 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-500">{isAr ? 'إعادة التحميل' : 'Reload page'}</button>
        </section>
      );
    }
    return this.props.children;
  }
}

const LazyQuizCreator = lazyWithRetry(() => import('../pages/QuizCreator'), 'quiz-creator');
const LazyUserProfile = lazyWithRetry(() => import('../pages/UserProfile'), 'user-profile');
const LazySupport = lazyWithRetry(() => import('../pages/Support'), 'support');
const LazyMyQuizzes = lazyWithRetry(() => import('../pages/MyQuizzes').then(module => ({ default: module.MyQuizzes })), 'my-quizzes');
const LazyAdminDashboard = lazyWithRetry(() => import('../pages/AdminDashboard'), 'admin-dashboard');
const LazyAnalyticsDashboard = lazyWithRetry(() => import('../pages/AnalyticsDashboard').then(module => ({ default: module.AnalyticsDashboard })), 'analytics-dashboard');
const LazyBillingSection = lazyWithRetry(() => import('../components/BillingSection').then(module => ({ default: module.BillingSection })), 'billing');
const LazyInstitutionWorkspace = lazyWithRetry(() => import('../components/InstitutionWorkspace'), 'institution-workspace');
const LazyExploreSection = lazyWithRetry(() => import('../components/ExtraFeatures').then(module => ({ default: module.ExploreSection })), 'explore');
const LazyCategoriesSection = lazyWithRetry(() => import('../components/ExtraFeatures').then(module => ({ default: module.CategoriesSection })), 'categories');
const LazyCommunitySection = lazyWithRetry(() => import('../components/ExtraFeatures').then(module => ({ default: module.CommunitySection })), 'community');
const LazyBookmarksSection = lazyWithRetry(() => import('../components/ExtraFeatures').then(module => ({ default: module.BookmarksSection })), 'bookmarks');
const LazyAchievementsSection = lazyWithRetry(() => import('../components/ExtraFeatures').then(module => ({ default: module.AchievementsSection })), 'achievements');
const LazySettingsSection = lazyWithRetry(() => import('../components/ExtraFeatures').then(module => ({ default: module.SettingsSection })), 'settings');
const LazyLeaderboardSection = lazyWithRetry(() => import('../components/ExtraFeatures').then(module => ({ default: module.LeaderboardSection })), 'leaderboard');
const LazyAIChat = lazyWithRetry(() => import('../pages/AIChat'), 'ai-chat');
const LazyClassrooms = lazyWithRetry(() => import('../components/Classrooms'), 'classrooms');
const LazyMotivationHubPage = lazyWithRetry(() => import('../pages/MotivationHubPage'), 'motivation-hub');

export interface AppRoutesProps {
  mainContainerRef: React.RefObject<HTMLElement | null>;
  activeQuizId: string | null;
  activeTab: string;
  userId: string;
  userName: string;
  quizToEdit: any | null;
  userEmail: string | null;
  userPhoto: string | null;
  userPlanName: string;
  isUserPremium: boolean;
  isAdminUser: boolean;
  isGuestSandbox: boolean;
  isGuestCreateRoute: boolean;
  isGuestMotivationRoute: boolean;
  motivationTabs: string[];
  isCosmoTab: boolean;
  isNotFoundTab: boolean;
  usesSharedFrame: boolean;
  isLoadingQuizzes: boolean;
  navKey: number;
  quizzes: any[];
  completions: any[];
  userStats: any;
  urlProfileId: string | null;
  viewMode: 'grid' | 'list';
  lang: 'ar' | 'en';
  darkMode: boolean;
  colorTheme: string;
  hasActiveMembership: boolean;
  authIsAuthenticated: boolean;
  handleSetTab: (tab: string, bypassAuth?: boolean, overrideProfileId?: string | null) => void;
  handleStartQuiz: (quizId: string) => void;
  handleExitQuiz: () => void;
  handleShareQuiz: (id: string, title: string, desc?: string) => void;
  handleToggleViewMode: () => void;
  fetchQuizzesList: () => Promise<void>;
  setIsQuizLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setQuizToEdit: React.Dispatch<React.SetStateAction<any | null>>;
  setAuthModalMode: (mode: any) => void;
  setIsAuthModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setLoginRedirectTab: (tab: string | null) => void;
  setColorTheme: (theme: string) => void;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  setUserName: React.Dispatch<React.SetStateAction<string>>;
  setUserPhoto: React.Dispatch<React.SetStateAction<string | null>>;
  setUserCustomId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsUserPremium: React.Dispatch<React.SetStateAction<boolean>>;
  setUserPlanName: React.Dispatch<React.SetStateAction<string>>;
  normalizeUserPhoto: (value: unknown) => string | null;
}

export default function AppRoutes(props: AppRoutesProps) {
  const {
    mainContainerRef, activeQuizId, activeTab, userId, userName, quizToEdit, userEmail, userPhoto, userPlanName,
    isUserPremium, isAdminUser, isGuestSandbox, isGuestCreateRoute, isGuestMotivationRoute, motivationTabs,
    isCosmoTab, isNotFoundTab, usesSharedFrame, isLoadingQuizzes, navKey, quizzes, completions, userStats,
    urlProfileId, viewMode, lang, darkMode, colorTheme, hasActiveMembership, authIsAuthenticated, handleSetTab,
    handleStartQuiz, handleExitQuiz, handleShareQuiz, handleToggleViewMode, fetchQuizzesList, setIsQuizLocked,
    setQuizToEdit, setAuthModalMode, setIsAuthModalOpen, setLoginRedirectTab, setColorTheme, setDarkMode, setUserName, setUserPhoto, setUserCustomId,
    setIsUserPremium, setUserPlanName, normalizeUserPhoto,
  } = props;

  return (
    <main id="main-content" ref={mainContainerRef} tabIndex={-1} className={`theme-page ${isCosmoTab ? 'flex-1 w-full p-0 overflow-hidden min-h-0' : (isNotFoundTab ? 'flex-1 w-full min-h-0 p-0 relative z-10' : (usesSharedFrame ? 'flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-4 relative z-10' : 'flex-1 w-full min-h-[100dvh] p-0 relative z-10'))}`}>

        {/* Dynamic screen display selection routing */}
        {activeQuizId ? (
          <QuizResolver
            
            quizId={activeQuizId}
            userId={userId}
            userName={userName}
            onGoHome={handleExitQuiz}
            onShareQuiz={handleShareQuiz}
            lang={lang}
            onQuizLockChange={setIsQuizLocked}
            userPlan={getUserRoleAndPlan(userStats).plan}
            planName={userPlanName}
            isPremium={isUserPremium}
          />
        ) : (
          
            <div
              key={`${activeTab}-${activeQuizId || 'screen'}-${navKey}`}
              className={`${isCosmoTab || isNotFoundTab ? 'h-full min-h-0' : (usesSharedFrame ? '' : 'min-h-[100dvh]')} page-transition-enter will-change-transform transform-gpu gsap-tab-wrapper`}
              style={{ backfaceVisibility: 'hidden' }}
            >
              <LazyRouteErrorBoundary lang={lang}>
                <React.Suspense fallback={<PageSkeleton lang={lang} />}>
              {activeTab === 'not-found' && (
                <NotFound lang={lang} onGoHome={() => handleSetTab('landing')} />
              )}
              {motivationTabs.includes(activeTab) && (isGuestMotivationRoute ? (
                <section className="mx-auto flex min-h-[54vh] max-w-xl flex-col items-center justify-center px-6 text-center" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-500/15 text-violet-600 dark:text-violet-300"><Sparkles className="h-8 w-8" /></div>
                  <h1 className="mt-5 text-2xl font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'سجّل الدخول لفتح مركز التحفيز' : 'Sign in to open Motivation Hub'}</h1>
                  <p className="mt-3 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-300">{lang === 'ar' ? 'المراجعة الذكية، المواسم، والتحديات الخاصة تحفظ تقدمك ومكافآتك على حسابك بشكل آمن.' : 'Smart review, seasons, and private challenges securely save your progress and rewards to your account.'}</p>
                  <button type="button" onClick={() => { setLoginRedirectTab(activeTab); setAuthModalMode('register'); setIsAuthModalOpen(true); }} className="mt-7 min-h-11 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-black text-white transition hover:bg-violet-500">{lang === 'ar' ? 'التسجيل أو الدخول' : 'Sign in or register'}</button>
                </section>
              ) : (
                <LazyMotivationHubPage
                  userId={userId}
                  userName={userName}
                  isPremium={isUserPremium}
                  planName={userPlanName}
                  lang={lang}
                  section={activeTab as MotivationSection}
                  onNavigate={(section) => handleSetTab(section)}
                />
              ))}
              {activeTab === 'landing' && (
                authIsAuthenticated && userId && !userId.startsWith('user-guest') ? (
                  <LandingPage
                  quizzes={quizzes}
                  isLoading={isLoadingQuizzes}
                  currentUserEmail={userEmail}
                  currentUserId={userId}
                  isAdmin={isAdminUser}
                  planName={userPlanName}
                  isPremium={isUserPremium}
                  onRefresh={fetchQuizzesList}
                  onStartQuiz={handleStartQuiz}
                  onCreateQuizTab={() => handleSetTab('create')}
                  onShareQuiz={handleShareQuiz}
                  onEditQuiz={(quiz) => {
                    setQuizToEdit(quiz);
                    handleSetTab('create');
                  }}
                  onViewProfile={(creatorId) => {
                    handleSetTab('profile', false, creatorId);
                  }}
                  onDeleteQuiz={async (quizId) => {
                    const preservedScrollY = window.scrollY;
                    try {
                      await deleteQuiz(quizId);
                      playNotificationSound('delete');
                      await fetchQuizzesList();
                      window.requestAnimationFrame(() => window.scrollTo({ top: preservedScrollY, behavior: 'instant' }));
                    } catch (e) {
                      console.error(e);
                      alert(lang === 'ar' ? 'عذراً، فشل حذف الاختبار من خوادم قاعدة البيانات.' : 'Error, failed to remove quiz from server.');
                    }
                  }}
                  lang={lang}
                  onLoginClick={() => {
                    setIsAuthModalOpen(true);
                  }}
                  viewMode={viewMode}
                  onToggleViewMode={handleToggleViewMode}
                  dailyQuiz={{
                    userId,
                    planName: userPlanName,
                    isPremium: isUserPremium,
                    onStartQuiz: handleStartQuiz,
                    onLoginClick: () => setIsAuthModalOpen(true),
                  }}
                />
                ) : (
                  <GuestLandingPage
                    lang={lang}
                    onLogin={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
                    onExplore={() => handleSetTab('explore', true)}
                    onSupport={() => handleSetTab('support', true)}
                  />
                )
              )}

              {activeTab === 'my-quizzes' && (
                <LazyMyQuizzes
                  quizzes={quizzes}
                  userId={userId}
                  lang={lang}
                  isAdmin={isAdminUser}
                  onStartQuiz={handleStartQuiz}
                  onEditQuiz={(quiz) => {
                    setQuizToEdit(quiz);
                    handleSetTab('create');
                  }}
                  onDeleteQuiz={async (quizId) => {
                    const preservedScrollY = window.scrollY;
                    try {
                      await deleteQuiz(quizId);
                      playNotificationSound('delete');
                      await fetchQuizzesList();
                      window.requestAnimationFrame(() => window.scrollTo({ top: preservedScrollY, behavior: 'instant' }));
                    } catch (e) {
                      console.error(e);
                      alert(lang === 'ar' ? 'عذراً، فشل الحذف.' : 'Delete failed.');
                    }
                  }}
                  onShareQuiz={handleShareQuiz}
                  fetchQuizzesList={fetchQuizzesList}
                  userEmail={userEmail}
                />
              )}

              {activeTab === 'analytics' && (
                <LazyAnalyticsDashboard
                  userId={userId}
                  quizzes={quizzes}
                  completions={completions}
                  lang={lang}
                  onStartQuiz={handleStartQuiz}
                  isLoading={isLoadingQuizzes}
                />
              )}

              {activeTab === 'billing' && (
                <LazyBillingSection
                  userId={userId}
                  userEmail={userEmail}
                  lang={lang}
                  isPremium={isUserPremium}
                  userName={userName}
                />
              )}

              {activeTab === 'notifications' && (
                <MessageInbox lang={lang} userId={userId} userName={userName} />
              )}

              {activeTab === 'create' && (
                isGuestCreateRoute ? (
                  <section className="min-h-[60vh] flex items-center justify-center py-12" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <div className="w-full max-w-xl rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-8 sm:p-10 text-center shadow-xl backdrop-blur-xl">
                      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-3xl">🔐</div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        {lang === 'ar' ? 'سجّل الدخول لإنشاء اختبار' : 'Sign in to create a quiz'}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
                        {lang === 'ar' ? 'يمكنك تصفح الاختبارات كزائر، لكن إنشاء اختبار جديد يتطلب حساباً.' : 'You can browse quizzes as a guest, but creating a quiz requires an account.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalMode('register');
                          setIsAuthModalOpen(true);
                        }}
                        className="mt-7 rounded-2xl bg-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700"
                      >
                        {lang === 'ar' ? 'التسجيل أو تسجيل الدخول' : 'Sign up or sign in'}
                      </button>
                    </div>
                  </section>
                ) : (
                  <LazyQuizCreator
                    userId={userId}
                    userName={userName}
                    userEmail={userEmail || ''}
                    quizToEdit={quizToEdit}
                    onQuizCreated={(options) => {
                      // The extraction/solve flow intentionally keeps the verified
                      // editor mounted. Clearing quizToEdit here can trigger a
                      // parent-driven state transition while QuizCreator is still
                      // applying the solved questions, which makes the editor look
                      // empty even though the quiz was already saved.
                      if (!options?.keepCreatorOpen) {
                        setQuizToEdit(null);
                        handleSetTab('my-quizzes');
                      }
                      void fetchQuizzesList();
                    }}
                    onCancelEdit={() => {
                      setQuizToEdit(null);
                      handleSetTab('my-quizzes');
                    }}
                    lang={lang}
                    onOpenAuthModal={(mode) => {
                      setAuthModalMode(mode);
                      setIsAuthModalOpen(true);
                    }}
                    userPlan={getUserRoleAndPlan(userStats || { userId: '', name: '', createdQuizzes: [], completions: [] }).plan}
                    isAdmin={isAdminUser}
                  />
                )
              )}

              {activeTab === 'profile' && (
                <LazyUserProfile
                  profileId={urlProfileId || userId}
                  currentUserId={userId}
                  currentUserName={userName}
                  currentUserEmail={userEmail}
                  onUpdateName={(name) => {
                    setUserName(name);
                    localStorage.setItem('quiz_userName', name);
                  }}
                  onUpdatePhoto={(photo) => {
                    setUserPhoto(normalizeUserPhoto(photo));
                  }}
                  onUpdateCustomId={(cid) => {
                    setUserCustomId(cid);
                  }}
                   onStartQuiz={handleStartQuiz}
                   onShareQuiz={handleShareQuiz}
                  lang={lang}
                  colorTheme={colorTheme}
                  setColorTheme={setColorTheme}
                  onPremiumStatusChange={async (isPremium, plan) => {
                    try {
                      const stats = await getUserProfileStats(urlProfileId || userId);
                      if (stats) {
                        setIsUserPremium(!!stats.isPremium);
                        setUserPlanName(stats.planName || '');
                      }
                    } catch (_) {
                      setIsUserPremium(isPremium);
                      if (plan !== undefined) setUserPlanName(plan);
                    }
                  }}
                  onOpenBilling={() => handleSetTab('billing')}
                />
              )}

              {activeTab === 'explore' && (
                <LazyExploreSection 
                  quizzes={quizzes} 
                  onStartQuiz={handleStartQuiz} 
                  lang={lang} 
                  onViewProfile={(creatorId) => { handleSetTab('profile', false, creatorId); }}
                />
              )}

              {activeTab === 'aichat' && hasActiveMembership && (
                <LazyAIChat 
                  lang={lang} 
                  darkMode={darkMode} 
                  isPremium={isUserPremium} 
                  planName={userPlanName} 
                  userId={userId}
                  userName={userName}
                  currentPage={activeTab}
                  siteStatus="QuizSpace يعمل بشكل طبيعي"
                  userPhoto={userPhoto || undefined}
                  defaultAvatar={AVATAR_PRESETS[0].url}
                  onUpgradeClick={() => handleSetTab('billing')}
                  onOpenGeneratedQuiz={(quizId) => handleStartQuiz(quizId)}
                  onOpenAuthModal={(mode) => {
                    setAuthModalMode(mode);
                    setIsAuthModalOpen(true);
                  }}
                />
              )}
              {activeTab === 'aichat' && !hasActiveMembership && (
                <section className="flex min-h-[65vh] w-full items-center justify-center px-4 py-16 sm:px-6">
                  <div className="w-full max-w-xl rounded-3xl border border-violet-200/70 bg-white/90 p-8 text-center shadow-xl shadow-violet-500/10 backdrop-blur-xl dark:border-violet-500/20 dark:bg-slate-950/90 sm:p-12">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-3xl shadow-lg shadow-violet-500/25">✦</div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'كوزمو متاح للأعضاء فقط' : 'Cosmo is for members only'}</h2>
                    <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-300">{lang === 'ar' ? 'فعّل أي عضوية للوصول إلى المحادثة الذكية وأدوات كوزمو.' : 'Activate any membership to unlock Cosmo AI chat and its tools.'}</p>
                    <button type="button" onClick={() => handleSetTab('billing')} className="mt-7 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5">{lang === 'ar' ? 'عرض الباقات وتفعيل العضوية' : 'View plans and activate membership'}</button>
                  </div>
                </section>
              )}

              {activeTab === 'categories' && (
                <LazyCategoriesSection 
                  quizzes={quizzes} 
                  onStartQuiz={handleStartQuiz} 
                  lang={lang} 
                  onViewProfile={(creatorId) => { handleSetTab('profile', false, creatorId); }}
                />
              )}

              {activeTab === 'community' && (
                <LazyCommunitySection lang={lang} userId={userId} userName={userName} userEmail={userEmail} userRole={getUserRoleAndPlan(userStats).role} isGuest={isGuestSandbox} isAdmin={isAdminUser} />
              )}

              {activeTab === 'messages' && (
                <MessageInbox lang={lang} userId={userId} userName={userName} userPhoto={userPhoto || undefined} defaultAvatar={AVATAR_PRESETS[0].url} />
              )}

              {activeTab === 'classrooms' && (
                <LazyClassrooms 
                  lang={lang} 
                  currentUserId={userId} 
                  currentUserName={userName} 
                  currentUserPhoto={userPhoto} 
                  userPlan={getUserRoleAndPlan(userStats).plan}
                  currentUserEmail={userEmail}
                  onStartQuiz={handleStartQuiz}
                  isGuest={isGuestSandbox}
                  isAdmin={isAdminUser}
                  quizzes={quizzes}
                />
              )}

              {activeTab === 'institution' && (
                <LazyInstitutionWorkspace
                  userId={userId}
                  lang={lang}
                  onOpenBilling={() => handleSetTab('billing')}
                />
              )}

              {activeTab === 'bookmarks' && (
                <LazyBookmarksSection 
                  quizzes={quizzes} 
                  onStartQuiz={handleStartQuiz} 
                  lang={lang} 
                  onViewProfile={(creatorId) => { handleSetTab('profile', false, creatorId); }}
                  userId={userId}
                />
              )}

              {activeTab === 'achievements' && (
                <LazyAchievementsSection lang={lang} completions={completions} quizzes={quizzes} userId={userId} isPremium={isUserPremium} />
              )}

              {activeTab === 'leaderboard' && (
                <LazyLeaderboardSection lang={lang} quizzes={quizzes} />
              )}

              {activeTab === 'settings' && (
                <LazySettingsSection 
                  lang={lang} 
                  userName={userName} 
                  onUpdateName={(name) => {
                    setUserName(name);
                    localStorage.setItem('quiz_userName', name);
                  }}
                  colorTheme={colorTheme} 
                  setColorTheme={setColorTheme} 
                  darkMode={darkMode} 
                  setDarkMode={setDarkMode} 
                  isPremium={isUserPremium} 
                  currentUserId={userId}
                  currentUserEmail={userEmail}
                  userPlanName={getUserRoleAndPlan(userStats).plan}
                />
              )}

              {activeTab === 'support' && (
                <React.Suspense fallback={<CosmicLoader />}>
                  <LazySupport lang={lang} />
                </React.Suspense>
              )}

              {activeTab === 'admin' && (
                <AdminGuard userId={userId}>
                  <React.Suspense fallback={
                    <div className="flex items-center justify-center min-h-[400px]">
                      <CosmicLoader />
                    </div>
                  }>
                    <LazyAdminDashboard 
                      quizzes={quizzes} 
                      lang={lang} 
                      onViewProfile={(creatorId) => { handleSetTab('profile', false, creatorId); }}
                      onEditQuiz={(quiz) => { setQuizToEdit(quiz); handleSetTab('create'); }}
                      onDeleteQuiz={async (quizId) => {
                        await deleteQuiz(quizId);
                        await fetchQuizzesList();
                      }}
                      currentUserId={userId}
                      currentUserEmail={userEmail}
                    />
                  </React.Suspense>
                </AdminGuard>
              )}
                </React.Suspense>
              </LazyRouteErrorBoundary>
            </div>
          
        )}

    </main>
  );
}
