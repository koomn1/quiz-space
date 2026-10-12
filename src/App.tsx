import CosmicLoader from "./components/CosmicLoader";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSearchParams } from './hooks/useSearchParams';
import { Quiz, UserStats, getUserRoleAndPlan } from './types';
import { AVATAR_PRESETS, getDefaultAvatar, resolveProfileImageUrl } from './constants/profileAssets';
import { supabase } from './lib/supabaseClient';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { playChimeSound } from './lib/chime';
import ShareModal from './components/ShareModal';
import OnboardingTour from './components/OnboardingTour';
import { AuthModal } from './components/AuthModal';
import WelcomeAuthOverlay from './components/WelcomeAuthOverlay';
import PopupBlockedModal from './components/PopupBlockedModal';
import NetworkFailedModal from './components/NetworkFailedModal';
import { PremiumCursor } from './components/PremiumCursor';
import { PostRegisterOnboardingModal } from './components/PostRegisterOnboardingModal';
import OverlayPortal from './components/OverlayPortal';
import DailyQuizCard from './components/DailyQuizCard';
import SplashScreen from './components/SplashScreen';
import { ToastHost } from './components/Toast';
import ProcessingCenterBanner from './components/ProcessingCenterBanner';
import CommandPalette from './components/CommandPalette';
import { Sparkles, Edit, Compass, Info, XCircle, Award, Volume2, Globe, Bell, AlertTriangle, ExternalLink, User, Bot, Zap, MessageCircle } from 'lucide-react';

import { saveUserProfile, deleteQuiz, getUserProfileStats, getRecentCompletions, getPlatformSettings } from './lib/db';
import { playNotificationSound } from './lib/sound';
import { translations } from './lib/i18n';
import { getApiUrl } from './lib/origin';
import { generateCoolStudentName } from './lib/nameGenerator';
import { getOrCreateGuestIdentity } from './lib/guestIdentity';
import { startWebVitalsReporting } from './lib/performanceTelemetry';
import { getOnboardingTourStorageKey, shouldShowOnboardingTour } from './lib/onboardingState';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { useLocale } from './context/LocaleContext';
import { useAppBootstrap, useQuizCatalog } from './hooks/useAppBootstrap';
import { useAuthBootstrap } from './hooks/useAuthBootstrap';
import { useNotificationsRealtime } from './hooks/useNotificationsRealtime';
import { useVisibilityPolling } from './hooks/useVisibilityPolling';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import AppRoutes from './app/AppRoutes';
import AppShell from './app/AppShell';

gsap.registerPlugin(useGSAP, ScrollTrigger);

function normalizeUserPhoto(value: unknown): string | null {
  const raw = String(value || '').trim();
  return raw ? resolveProfileImageUrl(raw) : null;
}

export default function App() {
  const mainContainerRef = React.useRef<HTMLElement>(null);

  const authContext = useAuth();
  const { darkMode, setDarkMode, colorTheme, setColorTheme } = useTheme();
  const { lang, setLang } = useLocale();
  // The intro belongs to a fresh load of the primary root URL only.
  // Inner hash routes and auth refreshes use the normal application loader.
  const [splashActive, setSplashActive] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    const isPrimaryHost = window.location.hostname.toLowerCase() === 'quiz-space-app.pages.dev';
    const isRootPath = window.location.pathname === '/' || window.location.pathname === '';
    const hasInnerRoute = Boolean(window.location.hash && window.location.hash !== '#/' && window.location.hash !== '#');
    return isPrimaryHost && isRootPath && !hasInnerRoute;
  });
  const [platformMaintenanceActive, setPlatformMaintenanceActive] = React.useState(false);

  const [isQuizLocked, setIsQuizLocked] = React.useState(false);
  const [userId, setUserId] = React.useState('');
  const [userName, setUserName] = React.useState('');
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [userPhoto, setUserPhoto] = React.useState<string | null>(null);
  const [userCustomId, setUserCustomId] = React.useState<string | null>(null);
  const [isUserPremium, setIsUserPremium] = React.useState(false);
  // True only for the unauthenticated local trial mode (activateLocalSandboxMode).
  // Never true for a real Supabase Auth session. Used to block writes that require
  // a verified account: creating classrooms, posting to community, uploading files,
  // premium activation, leaderboard entries.
  const [isGuestSandbox, setIsGuestSandbox] = React.useState(false);
  const [userPlanName, setUserPlanName] = React.useState('');
  const [quizToEdit, setQuizToEdit] = React.useState<any | null>(null);
  const [isStatsLoaded, setIsStatsLoaded] = React.useState(false);
  const [userStats, setUserStats] = React.useState<UserStats | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);
  // The server-backed is_admin column is the only client-side signal used for
  // administrative UI. Database policies independently enforce every privileged write.
  const isAdminUser = userStats?.isAdmin === true;

  React.useEffect(() => {
    if (!authContext.user) return;
    const u = authContext.user;
    setUserId(u.uid);
    setUserName(u.name || '');
    setUserEmail(u.email || null);
    setUserPhoto(normalizeUserPhoto(u.photoURL));
    setUserCustomId(u.customId || null);
    setIsUserPremium(!!u.isPremium);
    setUserPlanName(u.planName || '');
  }, [authContext.user?.uid, authContext.user?.name, authContext.user?.photoURL, authContext.user?.customId, authContext.user?.isPremium, authContext.user?.planName]);

  React.useEffect(() => {
    if (!authContext.user?.uid) return;
    startWebVitalsReporting();
  }, [authContext.user?.uid]);

  React.useEffect(() => {
    if (!authContext.passwordRecovery) return;
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  }, [authContext.passwordRecovery]);

  // States for Forced Welcome-Login on Quiz
  const [authRedirectQuizId, setAuthRedirectQuizId] = React.useState<string | null>(null);
  const authRedirectQuizIdRef = React.useRef<string | null>(null);

  const [loginRedirectTab, _setLoginRedirectTab] = React.useState<string | null>(null);
  const loginRedirectTabRef = React.useRef<string | null>(null);
  const setLoginRedirectTab = (val: string | null) => {
    loginRedirectTabRef.current = val;
    _setLoginRedirectTab(val);
  };

  // General tab navigation
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = React.useMemo(() => {
    // Check search params first
    const tabParam = searchParams.get('tab');
    if (tabParam) return tabParam;

    // Check pathname
    const path = window.location.pathname;
    const cleanPath = path.replace(/^\//, '').split('?')[0];
    let pathParts = cleanPath.split('/');
    if (pathParts[0] === 'quiz-space') {
      pathParts = pathParts.slice(1);
    }
    if (pathParts[0] === 'dashboard' && pathParts[1]) {
      return pathParts[1];
    }
    if (pathParts[0] === 'quiz' && pathParts[1]) {
      return 'quiz';
    }
    if (pathParts[0] === 'profile' && pathParts[1]) {
      return 'profile';
    }
    if (pathParts[0] === 'quiz' || pathParts[0] === 'dashboard') {
      return 'landing';
    }
    if (pathParts[0]) {
      const knownTabs = new Set(['landing', 'explore', 'categories', 'community', 'messages', 'classrooms', 'institution', 'bookmarks', 'achievements', 'leaderboard', 'analytics', 'billing', 'notifications', 'create', 'profile', 'aichat', 'my-quizzes', 'settings', 'support', 'admin', 'motivation', 'motivation-lucky', 'motivation-brain', 'motivation-review', 'motivation-season', 'motivation-duel', 'motivation-store']);
      return knownTabs.has(pathParts[0]) ? pathParts[0] : 'not-found';
    }

    // Check hash
    const hash = window.location.hash;
    if (hash) {
      const hashClean = hash.replace(/^#\/?/, '').split('?')[0];
      const parts = hashClean.split('/');
      if (parts[0] === 'dashboard' && parts[1]) {
        return parts[1];
      }
      if (parts[0] === 'quiz' && parts[1]) {
        return 'quiz';
      }
      if (parts[0] === 'profile' && parts[1]) {
        return 'profile';
      }
      if (parts[0] === 'join' && parts[1]) {
        return 'classrooms';
      }
      if (parts[0] === 'quiz' || parts[0] === 'dashboard') {
        return 'landing';
      }
      if (parts[0]) {
        const knownTabs = new Set(['landing', 'explore', 'categories', 'community', 'messages', 'classrooms', 'institution', 'bookmarks', 'achievements', 'leaderboard', 'analytics', 'billing', 'notifications', 'create', 'profile', 'aichat', 'my-quizzes', 'settings', 'support', 'admin', 'motivation', 'motivation-lucky', 'motivation-brain', 'motivation-review', 'motivation-season', 'motivation-duel', 'motivation-store']);
        return knownTabs.has(parts[0]) ? parts[0] : 'not-found';
      }
    }

    return 'landing';
  }, [searchParams]);

  const activeQuizId = React.useMemo(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'quiz' && searchParams.get('quizId')) {
      return searchParams.get('quizId');
    }
    if (searchParams.get('quizId')) {
      return searchParams.get('quizId');
    }

    let path = window.location.pathname;
    if (path.startsWith('/quiz-space')) {
      path = path.slice(11);
    }
    const hash = window.location.hash;

    if (hash) {
      const hashClean = hash.replace(/^#\/?/, '').split('?')[0];
      const match = hashClean.match(/^quiz\/([^\/]+)/);
      if (match) return match[1];
    }

    const match = path.match(/^\/quiz\/([^\/]+)/) || path.match(/^\/apps\/([^\/]+)/);
    if (match) return match[1];

    return null;
  }, [searchParams]);

  const urlProfileId = React.useMemo(() => {
    if (searchParams.get('profileId')) {
      return searchParams.get('profileId');
    }

    let path = window.location.pathname;
    if (path.startsWith('/quiz-space')) {
      path = path.slice(11);
    }
    const hash = window.location.hash;

    if (hash) {
      const hashClean = hash.replace(/^#\/?/, '').split('?')[0];
      const match = hashClean.match(/^profile\/([^\/]+)/);
      if (match) return match[1];
    }

    const match = path.match(/^\/profile\/([^\/]+)/);
    if (match) return match[1];

    return null;
  }, [searchParams]);

  // Read view mode state from ?view= parameter, default to 'grid'
  const viewMode = (searchParams.get('view') as 'grid' | 'list') || 'grid';

  // Read showAssistant state from ?showAssistant= parameter, default to false
  const showAssistant = searchParams.get('showAssistant') === 'true';

  const getAppBasePath = React.useCallback(() => {
    const currentPath = window.location.pathname;
    const hostname = window.location.hostname.toLowerCase();
    if (hostname === 'quiz-space-app.pages.dev') {
      return '/';
    }
    if (currentPath.includes('/quiz-space') || hostname.includes('github.io')) {
      return '/quiz-space/';
    }
    const base = import.meta.env.BASE_URL || '/';
    return base.endsWith('/') ? base : base + '/';
  }, []);

  const setActiveTab = React.useCallback((tab: string) => {
    const basePath = getAppBasePath();
    const nextParams = new URLSearchParams(window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : ''));

    if (tab === 'landing') {
      nextParams.delete('tab');
      nextParams.delete('quizId');
      nextParams.delete('profileId');
      const queryString = nextParams.toString();
      const targetUrl = queryString ? `${basePath}?${queryString}` : basePath;
      window.history.pushState(null, '', targetUrl);
      setSearchParams(nextParams);
      return;
    }

    nextParams.set('tab', tab);
    nextParams.delete('quizId'); // Clear active quiz when changing tabs

    const isProfile = tab === 'profile';
    if (isProfile) {
      const profileId = nextParams.get('profileId') || userId || '';
      if (profileId) nextParams.set('profileId', profileId);
      window.history.pushState(null, '', `${basePath}#/profile/${profileId}?${nextParams.toString()}`);
    } else {
      nextParams.delete('profileId');
      window.history.pushState(null, '', `${basePath}#/dashboard/${tab}?${nextParams.toString()}`);
    }
  }, [userId, getAppBasePath, setSearchParams]);

  const setActiveQuizId = React.useCallback((quizId: string | null) => {
    const nextParams = new URLSearchParams(window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : ''));
    const basePath = getAppBasePath();
    if (quizId) {
      nextParams.set('quizId', quizId);
      nextParams.set('tab', 'quiz');
      window.history.pushState(null, '', `${basePath}#/quiz/${quizId}?${nextParams.toString()}`);
    } else {
      nextParams.delete('quizId');
      if (nextParams.get('tab') === 'quiz') {
        nextParams.set('tab', 'landing');
      }
      const tab = nextParams.get('tab') || 'landing';
      window.history.pushState(null, '', `${basePath}#/dashboard/${tab}?${nextParams.toString()}`);
    }
  }, [getAppBasePath]);

  const setUrlProfileId = React.useCallback((profileId: string | null) => {
    const nextParams = new URLSearchParams(window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : ''));
    const basePath = getAppBasePath();
    if (profileId) {
      nextParams.set('profileId', profileId);
      nextParams.set('tab', 'profile');
      window.history.pushState(null, '', `${basePath}#/profile/${profileId}?${nextParams.toString()}`);
    } else {
      nextParams.delete('profileId');
      if (nextParams.get('tab') === 'profile') {
        nextParams.set('tab', 'landing');
      }
      const tab = nextParams.get('tab') || 'landing';
      window.history.pushState(null, '', `${basePath}#/dashboard/${tab}?${nextParams.toString()}`);
    }
  }, [getAppBasePath]);

  const handleToggleViewMode = React.useCallback(() => {
    setSearchParams((prev) => {
      const currentView = prev.get('view') || 'grid';
      const nextView = currentView === 'grid' ? 'list' : 'grid';
      prev.set('view', nextView);
      return prev;
    });
  }, [setSearchParams]);

  const handleToggleAssistant = React.useCallback(() => {
    setSearchParams((prev) => {
      const currentAss = prev.get('showAssistant') === 'true';
      if (currentAss) {
        prev.delete('showAssistant');
      } else {
        prev.set('showAssistant', 'true');
      }
      return prev;
    });
  }, [setSearchParams]);

  const [completions, setCompletions] = React.useState<any[]>([]);
  const [sharingQuiz, setSharingQuiz] = React.useState<{ id: string; title: string; description?: string } | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const sidebarMenuButtonRef = React.useRef<HTMLButtonElement>(null);
  const sidebarPanelRef = React.useRef<HTMLDivElement>(null);
  const sidebarWasOpenRef = React.useRef(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [popupBlocked, setPopupBlocked] = React.useState(false);
  const [networkFailedError, setNetworkFailedError] = React.useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [authModalMode, setAuthModalMode] = React.useState<'login' | 'register'>('register');
  const [showPostRegisterModal, setShowPostRegisterModal] = React.useState(false);
  const [navKey, setNavKey] = React.useState(0);

  useGSAP(() => {
    // Wait a brief moment to allow Framer Motion to switch tabs
    const timeout = setTimeout(() => {
      const tabWrapper = document.querySelector('.gsap-tab-wrapper');
      if (!tabWrapper) return;
      
      // Get the currently active tab content (usually the last child if during AnimatePresence exit)
      const activeContent = tabWrapper.children[tabWrapper.children.length - 1];
      if (!activeContent) return;
      
      const sections = gsap.utils.toArray(activeContent.children);
      
      sections.forEach((section: any, idx: number) => {
        // Skip elements that shouldn't be animated (e.g. Hero Section is often index 0)
        if (idx === 0) return;
        
        // Create ScrollTrigger animation for each section
        gsap.fromTo(section, 
          { opacity: 0, y: 40 },
          {
            opacity: 1, 
            y: 0, 
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
              toggleActions: 'play none none none'
            }
          }
        );
      });
      ScrollTrigger.refresh();
    }, 150);
    
    return () => clearTimeout(timeout);
  }, { scope: mainContainerRef, dependencies: [activeTab] });

  const { quizzes, isLoadingQuizzes, fetchQuizzesList } = useQuizCatalog();
  const handleQuizDetected = React.useCallback((quizId: string) => {
    authRedirectQuizIdRef.current = quizId;
  }, []);
  useAppBootstrap({ onQuizDetected: handleQuizDetected, fetchQuizzesList });

  const {
    unreadMessagesCount,
    activePush,
    setActivePush,
    showPushBanner,
    setShowPushBanner,
    showQuotaWarning,
    setShowQuotaWarning,
  } = useNotificationsRealtime({ userId, userName, lang });

  const refreshPlatformSettings = React.useCallback(async () => {
    const settings = await getPlatformSettings();
    setPlatformMaintenanceActive(settings.maintenanceMode);
  }, []);
  useVisibilityPolling(refreshPlatformSettings, 30000);

  // A membership is active when the profile is marked premium or carries a paid plan.
  // Keep this check centralized so navigation, direct links, and rendering agree.
  const hasActiveMembership = isUserPremium || ['gold', 'diamond', 'premium'].includes((userPlanName || '').trim().toLowerCase());

  // Cosmo (AIChat) is a full-height app shell only for active members.
  // Guests and free accounts are redirected to the plans page before the chat opens.
  const isCosmoTab = activeTab === 'aichat' && !activeQuizId && hasActiveMembership;

  // Body scroll lock when mobile sidebar, auth modals, or the Cosmo chat
  // screen are open — the chat page itself never scrolls
  React.useEffect(() => {
    if (isSidebarOpen || isAuthModalOpen || authRedirectQuizId || isCosmoTab) {
      document.body.classList.add('scroll-lock');
      return () => {
        document.body.classList.remove('scroll-lock');
      };
    }
  }, [isSidebarOpen, isAuthModalOpen, authRedirectQuizId, isCosmoTab]);

  React.useEffect(() => {
    if (!isSidebarOpen) {
      if (sidebarWasOpenRef.current) {
        sidebarMenuButtonRef.current?.focus({ preventScroll: true });
        sidebarWasOpenRef.current = false;
      }
      return;
    }
    sidebarWasOpenRef.current = true;
    sidebarPanelRef.current?.focus({ preventScroll: true });
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSidebarOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSidebarOpen]);

  // Scroll to top when active tab or active quiz changes
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab, activeQuizId]);

  // Magnetic Cursor Glow Tracker
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll('.glass-panel, .glass-card, .card-3d');
      for (const card of cards) {
        const rect = (card as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        (card as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
        (card as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  React.useEffect(() => {
    if (userId && !userId.startsWith('user-') && isStatsLoaded) {
      try {
        const cachedKey = `user_profile_fallback_${userId}`;
        const existingDataStr = localStorage.getItem(cachedKey);
        const existingData = existingDataStr ? JSON.parse(existingDataStr) : {};
        localStorage.setItem(cachedKey, JSON.stringify({
          ...existingData,
          uid: userId,
          photoURL: userPhoto,
          customId: userCustomId
        }));
      } catch (_) {}
    }
  }, [userId, userPhoto, userCustomId, isStatsLoaded]);

  // Trigger the tour only after the account-backed onboarding state has loaded.
  // This prevents an already onboarded user from seeing it again on a new browser.
  React.useEffect(() => {
    const tourCompletedLocally = userId
      ? localStorage.getItem(getOnboardingTourStorageKey(userId)) === 'true'
      : false;
    const shouldShow = shouldShowOnboardingTour({
      userId,
      isGuestSandbox,
      isStatsLoaded,
      serverOnboarded: userStats?.onboarded,
      tourCompletedLocally,
    });

    if (!shouldShow) {
      setShowOnboarding(false);
      return;
    }

    const timer = window.setTimeout(() => setShowOnboarding(true), 1200);
    return () => window.clearTimeout(timer);
  }, [userId, userStats?.onboarded, isGuestSandbox, isStatsLoaded]);

  useAuthBootstrap({
    lang,
    getAppBasePath,
    authRedirectQuizIdRef,
    loginRedirectTabRef,
    setLoginRedirectTab: _setLoginRedirectTab,
    setActiveTab,
    setUrlProfileId,
    setActiveQuizId,
    setAuthRedirectQuizId,
    setUserId,
    setUserName,
    setUserEmail,
    setUserPhoto,
    setUserCustomId,
    setIsUserPremium,
    setUserPlanName,
    setIsGuestSandbox,
    setIsStatsLoaded,
    setUserStats,
    setCompletions,
    setShowPushBanner,
    setShowPostRegisterModal,
    normalizeUserPhoto,
  });

  React.useEffect(() => {
    if (!userId || userId.startsWith('user-guest')) return;
    const handleFocus = async () => {
      try {
        const stats = await getUserProfileStats(userId);
        if (stats) {
          setIsUserPremium(!!stats.isPremium);
          setUserPlanName(stats.planName || '');
          setUserStats(stats);
          if (stats.photoURL) {
            setUserPhoto(normalizeUserPhoto(stats.photoURL));
          }
        }
      } catch (_) {}
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [userId]);
  // Activate Local Sandbox Simulation Mode to handle network blocks / iframe sandboxing.
  // This is a guest/trial mode only: it must never carry real privileges (premium,
  // class creation, community posting, etc.) since it isn't backed by a Supabase
  // Auth session or a verified database row. Those actions must prompt sign-in.
  const activateLocalSandboxMode = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.onLine === false) {
      alert(lang === 'ar' ? 'عذراً، التطبيق يحتاج إلى اتصال بالإنترنت للاتصال بقاعدة البيانات ومزامنة الحسابات. يرجى التحقق من الشبكة والمحاولة مرة أخرى.' : 'Offline mode is disabled. Please check your internet connection to sync with Supabase.');
      return;
    }
    const guestIdentity = getOrCreateGuestIdentity(lang);
    const id = guestIdentity.id;
    const generatedName = guestIdentity.name;
    setUserId(id);
    setUserName(generatedName);
    setUserEmail('local.student@spacequiz.local');
    setUserPhoto(null);
    setIsUserPremium(false);
    setUserPlanName(lang === 'ar' ? 'وضع تجربة (زائر)' : 'Guest Trial Mode');
    setIsGuestSandbox(true);
    localStorage.setItem('quiz_userId', id);
    localStorage.setItem('quiz_userName', generatedName);
    localStorage.setItem('quiz_isLocalSandbox', 'true');
    setNetworkFailedError(false);
    playNotificationSound('chime');
    
    const basePath = getAppBasePath();
    // Check if there was a quiz click waiting for login
    const pendingQuizId = authRedirectQuizIdRef.current;
    if (pendingQuizId && pendingQuizId !== 'login-trigger') {
      authRedirectQuizIdRef.current = null;
      setAuthRedirectQuizId(null);
      setActiveQuizId(pendingQuizId);
      window.history.pushState(null, '', `${basePath}#/quiz/${pendingQuizId}`);
    } else if (pendingQuizId === 'login-trigger') {
      authRedirectQuizIdRef.current = null;
      setAuthRedirectQuizId(null);
    }

    // Check if there was a tab switch waiting for login
    const pendingTab = loginRedirectTabRef.current;
    if (pendingTab) {
      loginRedirectTabRef.current = null;
      _setLoginRedirectTab(null);
      setActiveTab(pendingTab);
      if (pendingTab === 'profile') {
        setUrlProfileId(id);
        window.history.pushState(null, '', `${basePath}#/profile/${id}`);
      } else {
        setUrlProfileId(null);
        window.history.pushState(null, '', basePath);
      }
    }
  };

  // Google Sign-In uses the shared AuthContext. On Android this opens the
  // native account picker; the web fallback remains inside AuthContext.
  const handleGoogleLogin = async () => {
    try {
      setPopupBlocked(false);
      setNetworkFailedError(false);
      const signedIn = await authContext.signInWithGoogle();
      if (signedIn) {
        setAuthRedirectQuizId(null);
        setLoginRedirectTab(null);
      }
    } catch (e: any) {
      console.error('Google Sign In Error:', e?.message || 'unknown');
      const message = e?.message || (lang === 'ar' ? 'تعذر تسجيل الدخول بجوجل حالياً.' : 'Google sign-in is unavailable right now.');
      alert(message);
    }
  };

  // Sign-out
  const handleGoogleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsGuestSandbox(false);
      localStorage.removeItem('quiz_userId');
      localStorage.removeItem('quiz_userName');
      localStorage.removeItem('quiz_isLocalSandbox');
      localStorage.removeItem('local_auth_token');
      localStorage.removeItem('quiz_userEmail');
      localStorage.removeItem('quiz_userPhoto');
      setUserId('');
      setUserEmail(null);
      setUserName('طالب زائر');
      setUserPhoto(null);
      setIsUserPremium(false);
      setUserPlanName('');
      playNotificationSound('delete');
      // Delay slightly for the sound to finish playing, then hard redirect / reload back to home/dashboard
      setTimeout(() => {
        const basePath = getAppBasePath();
        window.location.href = `${basePath}/#/dashboard/landing`;
      }, 400);
    } catch (e: any) {
      console.error('Google Sign Out Error:', e);
    }
  };

  // Switch tabs and handle client-side HTML5 route cleanups
  const handleSetTab = (tab: string, bypassAuth = false, overrideProfileId: string | null = null) => {
    playNotificationSound('tap');

    const validOverrideId = overrideProfileId && overrideProfileId.trim() !== '';

    // Strict Guest Auth Guard: Guests can ONLY view landing, explore, or support. Any other direct link or tab forces AuthModal.
    const isGuest = (!userId || userId.startsWith('user-guest') || userId === '') && !authContext.isAuthenticated;
    const allowedGuestTabs = ['landing', 'explore', 'support'];
    if (!bypassAuth && isGuest && !allowedGuestTabs.includes(tab)) {
      setLoginRedirectTab('landing');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    // Cosmo is a paid feature. Do not allow free accounts or direct links to open it.
    if (!bypassAuth && tab === 'aichat' && !hasActiveMembership) {
      const basePath = getAppBasePath();
      const billingParams = new URLSearchParams({ tab: 'billing' });
      window.history.pushState(null, '', `${basePath}#/dashboard/billing?${billingParams.toString()}`);
      setSearchParams(billingParams);
      setActiveTab('billing');
      setNavKey(prev => prev + 1);
      return;
    }

    const currentParams = new URLSearchParams(window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : ''));
    const basePath = getAppBasePath();

    setNavKey(prev => prev + 1);

    if (tab === 'landing') {
      currentParams.delete('tab');
      currentParams.delete('quizId');
      currentParams.delete('profileId');
      const queryString = currentParams.toString();
      const targetUrl = queryString ? `${basePath}?${queryString}` : basePath;
      window.history.pushState(null, '', targetUrl);
      setSearchParams(currentParams);
      return;
    }

    currentParams.set('tab', tab);
    currentParams.delete('quizId'); // Clear active quiz when changing tabs

    if (tab === 'profile') {
      const targetProfileId = validOverrideId ? overrideProfileId : userId;
      currentParams.set('profileId', targetProfileId || '');
      window.history.pushState(null, '', `${basePath}#/profile/${targetProfileId}?${currentParams.toString()}`);
    } else {
      currentParams.delete('profileId');
      window.history.pushState(null, '', `${basePath}#/dashboard/${tab}?${currentParams.toString()}`);
    }
    };

  React.useEffect(() => {
    const handleCommandShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !isTyping) {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleCommandShortcut);
    return () => window.removeEventListener('keydown', handleCommandShortcut);
  }, []);

  // Direct hash links must follow the same membership rule as sidebar clicks.
  React.useEffect(() => {
    if (activeTab !== 'aichat' || hasActiveMembership || authContext.loading || !isStatsLoaded) return;
    const basePath = getAppBasePath();
    const billingParams = new URLSearchParams({ tab: 'billing' });
    window.history.replaceState(null, '', `${basePath}#/dashboard/billing?${billingParams.toString()}`);
    setSearchParams(billingParams);
    setActiveTab('billing');
  }, [activeTab, hasActiveMembership, authContext.loading, isStatsLoaded]);

  // Trigger login guard when starting any quiz to track progress
  const handleStartQuiz = (quizId: string) => {
    // User is truly a guest only if: not authenticated via Supabase AND userId is a guest placeholder
    const isRealGuest = !authContext.isAuthenticated && (!userId || userId.startsWith('user-guest'));
    if (isRealGuest) {
      authRedirectQuizIdRef.current = quizId;
      setAuthRedirectQuizId(quizId);
    } else {
      // Logged in user: start quiz directly
      const basePath = getAppBasePath();
      setActiveQuizId(quizId);
      window.history.pushState(null, '', `${basePath}#/quiz/${quizId}`);
    }
  };

  React.useEffect(() => {
    const refreshXpAfterQuiz = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (!userId || (detail?.userId && detail.userId !== userId)) return;
      getUserProfileStats(userId).then(stats => {
        setUserStats(stats);
        if (stats.completions) setCompletions(stats.completions);
      }).catch(e => console.warn('Error refreshing XP after quiz:', e));
    };
    window.addEventListener('quizspace:xp-updated', refreshXpAfterQuiz);
    return () => window.removeEventListener('quizspace:xp-updated', refreshXpAfterQuiz);
  }, [userId]);

  const handleExitQuiz = () => {
    setActiveQuizId(null);
    fetchQuizzesList(); // Refresh dashboards ratings
    
    // Refresh statistics when exiting a quiz to ensure dashboard is up to date
    if (userId) {
      getUserProfileStats(userId).then(stats => {
        if (stats) {
          setUserStats(stats);
          if (stats.completions) {
            setCompletions(stats.completions);
          }
        }
      }).catch(e => console.warn('Error refreshing stats on exit:', e));
    }
  };

  // Direct links can bypass handleSetTab(), so protect the create route during initial render.
  // Rendering QuizCreator without an authenticated user previously left the app blank in this case.
  const isGuestCreateRoute = activeTab === 'create' && !authContext.loading && !authContext.isAuthenticated && !userId;
  const motivationTabs = ['motivation', 'motivation-lucky', 'motivation-brain', 'motivation-review', 'motivation-season', 'motivation-duel', 'motivation-store'];
  const isGuestMotivationRoute = motivationTabs.includes(activeTab) && !authContext.loading && !authContext.isAuthenticated && (!userId || userId.startsWith('user-guest'));

  React.useEffect(() => {
    if (!isGuestMotivationRoute) return;
    setLoginRedirectTab(activeTab);
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  }, [activeTab, isGuestMotivationRoute]);

  // Core sections keep the shared content frame, while independent screens
  // use their own full-screen surface. The global Header remains available
  // on every non-quiz screen so users never lose navigation context.
  const showAppHeader = !activeQuizId;
  const isNotFoundTab = activeTab === 'not-found' && !activeQuizId;
  const usesSharedFrame = React.useMemo(() => {
    const sharedTabs = new Set([
      'landing',
      'profile',
      'create',
      'community',
      'settings',
      'my-quizzes',
      'billing',
      'institution',
    ]);
    return sharedTabs.has(activeTab) && !activeQuizId;
  }, [activeTab, activeQuizId]);

  React.useEffect(() => {
    if (!isGuestCreateRoute) return;
    setLoginRedirectTab('create');
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  }, [isGuestCreateRoute]);

  const handleShareQuiz = (id: string, title: string, desc?: string) => {
    const isSuperAdmin = isAdminUser;
    const roleAndPlan = getUserRoleAndPlan(userStats);
    const isTeacher = roleAndPlan.role === 'teacher' || userPlanName === 'Gold' || userPlanName === 'Diamond';
    
    let isGroupOwner = false;
    try {
      const storedClassrooms = localStorage.getItem('classroom_list');
      if (storedClassrooms) {
        const parsed = JSON.parse(storedClassrooms);
        isGroupOwner = Array.isArray(parsed) && parsed.some((c: any) => c.createdBy === userId);
      }
    } catch (_) {}

    if (isSuperAdmin || isTeacher || isGroupOwner || !!userId) {
      setSharingQuiz({ id, title, description: desc });
    } else {
      alert(lang === 'ar' 
        ? 'عذراً! ميزة مشاركة الاختبارات مخصصة حصرياً لمعلمي المجموعات، ملاك الفصول، والمشرفين الإداريين.' 
        : 'Access Restricted! Quiz sharing is a privilege reserved exclusively for Group Owners, Teachers, and Super Admins.'
      );
    }
  };

  const isBootstrapLoading = authContext.loading || !isStatsLoaded || isLoadingQuizzes;
  const bootstrapMessage = authContext.loading
    ? (lang === 'ar' ? 'جارٍ التحقق من جلسة الدخول...' : 'Checking your session...')
    : !isStatsLoaded
      ? (lang === 'ar' ? 'جارٍ تحميل بيانات حسابك...' : 'Loading your account data...')
      : (lang === 'ar' ? 'جارٍ تجهيز الاختبارات والموارد...' : 'Preparing quizzes and assets...');

  return (
        <>
          <a className="skip-link" href="#main-content">
            {lang === 'ar' ? 'تخطَّ إلى المحتوى الرئيسي' : 'Skip to main content'}
          </a>
          <ToastHost />
          {splashActive ? (
        <SplashScreen
          lang={lang}
          userName={userName}
          isGuest={!userId || userId.startsWith('user-')}
          onComplete={() => {
            setSplashActive(false);
          }}
        />
      ) : isBootstrapLoading ? (
        <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-slate-950/95 px-6 text-center backdrop-blur-xl" dir={lang === 'ar' ? 'rtl' : 'ltr'} role="status" aria-live="polite">
          <CosmicLoader size="lg" message={bootstrapMessage} />
        </div>
      ) : (
        <>
          {platformMaintenanceActive && !isAdminUser && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/95 px-6 text-center backdrop-blur-xl" role="alert" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              <div className="max-w-md rounded-3xl border border-amber-400/30 bg-slate-900 p-8 shadow-2xl shadow-amber-500/10">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300"><AlertTriangle className="h-7 w-7" /></div>
                <h1 className="text-xl font-black text-white">{lang === 'ar' ? 'المنصة تحت الصيانة حالياً' : 'The platform is currently under maintenance'}</h1>
                <p className="mt-3 text-sm leading-7 text-slate-300">{lang === 'ar' ? 'نعمل على تحسين QuizSpace. يرجى المحاولة مجدداً بعد قليل.' : 'We are improving QuizSpace. Please try again shortly.'}</p>
                <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 transition hover:bg-amber-400">{lang === 'ar' ? 'إعادة المحاولة' : 'Try again'}</button>
              </div>
            </div>
          )}
        <AppShell
          showAppHeader={showAppHeader}
          activeTab={activeTab}
          handleSetTab={handleSetTab}
          isQuizLocked={isQuizLocked}
          setIsSidebarOpen={setIsSidebarOpen}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          colorTheme={colorTheme}
          setColorTheme={setColorTheme}
          userName={userName}
          setUserName={setUserName}
          userId={userId}
          userPhoto={userPhoto}
          setAuthModalMode={setAuthModalMode}
          setIsAuthModalOpen={setIsAuthModalOpen}
          handleGoogleLogout={handleGoogleLogout}
          lang={lang}
          setLang={setLang}
          isUserPremium={isUserPremium}
          isSidebarOpen={isSidebarOpen}
          sidebarMenuButtonRef={sidebarMenuButtonRef}
          authIsAuthenticated={authContext.isAuthenticated}
          isCommandPaletteOpen={isCommandPaletteOpen}
          setIsCommandPaletteOpen={setIsCommandPaletteOpen}
          isCosmoTab={isCosmoTab}
          showQuotaWarning={showQuotaWarning}
          setShowQuotaWarning={setShowQuotaWarning}
          showPushBanner={showPushBanner}
          setShowPushBanner={setShowPushBanner}
          activePush={activePush}
          setActivePush={setActivePush}
          setActiveQuizId={setActiveQuizId}
          quizzes={quizzes}
        >
        <AppRoutes
          mainContainerRef={mainContainerRef}
          activeQuizId={activeQuizId}
          activeTab={activeTab}
          userId={userId}
          userName={userName}
          quizToEdit={quizToEdit}
          userEmail={userEmail}
          userPhoto={userPhoto}
          userPlanName={userPlanName}
          isUserPremium={isUserPremium}
          isAdminUser={isAdminUser}
          isGuestSandbox={isGuestSandbox}
          isGuestCreateRoute={isGuestCreateRoute}
          isGuestMotivationRoute={isGuestMotivationRoute}
          motivationTabs={motivationTabs}
          isCosmoTab={isCosmoTab}
          isNotFoundTab={isNotFoundTab}
          usesSharedFrame={usesSharedFrame}
          isLoadingQuizzes={isLoadingQuizzes}
          navKey={navKey}
          quizzes={quizzes}
          completions={completions}
          userStats={userStats}
          urlProfileId={urlProfileId}
          viewMode={viewMode}
          lang={lang}
          darkMode={darkMode}
          colorTheme={colorTheme}
          hasActiveMembership={hasActiveMembership}
          authIsAuthenticated={authContext.isAuthenticated}
          handleSetTab={handleSetTab}
          handleStartQuiz={handleStartQuiz}
          handleExitQuiz={handleExitQuiz}
          handleShareQuiz={handleShareQuiz}
          handleToggleViewMode={handleToggleViewMode}
          fetchQuizzesList={fetchQuizzesList}
          setIsQuizLocked={setIsQuizLocked}
          setQuizToEdit={setQuizToEdit}
          setAuthModalMode={setAuthModalMode}
          setIsAuthModalOpen={setIsAuthModalOpen}
          setLoginRedirectTab={setLoginRedirectTab}
          setColorTheme={setColorTheme}
          setDarkMode={setDarkMode}
          setUserName={setUserName}
          setUserPhoto={setUserPhoto}
          setUserCustomId={setUserCustomId}
          setIsUserPremium={setIsUserPremium}
          setUserPlanName={setUserPlanName}
          normalizeUserPhoto={normalizeUserPhoto}
        />
        </AppShell>

      {/* Onboarding tour guide overlay */}
      
        {showOnboarding && (
          <OnboardingTour
            activeTab={activeTab as any}
            setActiveTab={(tab) => handleSetTab(tab as any, true)}
            onClose={() => {
              setShowOnboarding(false);
              if (userId) {
                localStorage.setItem(getOnboardingTourStorageKey(userId), 'true');
              }
              if (userId && !isGuestSandbox) {
                saveUserProfile(userId, userName, undefined, userEmail || undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);
              }
            }}
          />
        )}
      

      {/* Beautiful Forced/Manual Welcoming Login Screen Overlay - Only for guests */}
        {authRedirectQuizId && !authContext.isAuthenticated && (!userId || userId.startsWith('user-guest')) && (
          <WelcomeAuthOverlay
            authRedirectQuizId={authRedirectQuizId}
            quizzes={quizzes}
            lang={lang}
            userName={userName}
            setUserName={(name) => {
              setUserName(name);
              localStorage.setItem('quiz_userName', name);
            }}
            loginRedirectTab={loginRedirectTab}
            onGoogleLogin={handleGoogleLogin}
            onClose={() => {
              const isAuthQuiz = authRedirectQuizId !== 'login-trigger';
              if (isAuthQuiz && authRedirectQuizId) {
                setActiveQuizId(authRedirectQuizId);
                window.history.pushState(null, '', `${getAppBasePath()}#/quiz/${authRedirectQuizId}`);
              }
              authRedirectQuizIdRef.current = null;
              setAuthRedirectQuizId(null);
              setLoginRedirectTab(null);
            }}
            onContinueAsGuest={(quizId) => {
              authRedirectQuizIdRef.current = null;
              setAuthRedirectQuizId(null);
              setLoginRedirectTab(null);
              setActiveQuizId(quizId);
              window.history.pushState(null, '', `${getAppBasePath()}#/quiz/${quizId}`);
            }}
          />
        )}
      

      {/* Google Pop-up Blocked Fallback/troubleshooter Modal */}
      
        <PopupBlockedModal
          isOpen={popupBlocked}
          lang={lang}
          onClose={() => setPopupBlocked(false)}
        />
      

      {/* Firebase Network Request Failed Troubleshooter Modal */}
      
        <NetworkFailedModal
          isOpen={networkFailedError}
          lang={lang}
          onClose={() => setNetworkFailedError(false)}
          onActivateLocalSandboxMode={() => {
            setNetworkFailedError(false);
            activateLocalSandboxMode();
          }}
          onRetryConnecting={() => {
            setNetworkFailedError(false);
            handleGoogleLogin();
          }}
        />
      

      {/* Share Modal overlay */}
      
        {sharingQuiz && (
          <ShareModal
            quizId={sharingQuiz.id}
            quizTitle={sharingQuiz.title}
            quizDescription={sharingQuiz.description}
            onClose={() => setSharingQuiz(null)}
          />
        )}
      

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => {
          authContext.clearPasswordRecovery();
          setIsAuthModalOpen(false);
        }}
        initialMode={authModalMode}
      />

      
        {isSidebarOpen && !isQuizLocked && (
          <OverlayPortal>
            {/* Backdrop */}
            <div 
              
              
              
              className="fixed inset-0 z-[9998] cursor-pointer bg-black/35"
              onClick={() => setIsSidebarOpen(false)} 
            />

            {/* Sidebar Slide-in Panel */}
            <div
              id="quizspace-primary-sidebar"
              ref={sidebarPanelRef}
              role="dialog"
              aria-modal="true"
              aria-label={lang === 'ar' ? 'القائمة الرئيسية' : 'Primary navigation'}
              tabIndex={-1}
              className={`fixed inset-y-0 ${lang === 'ar' ? 'right-0' : 'left-0'} z-[9999] w-64 h-[100dvh] flex flex-col overflow-hidden transform-gpu bg-[#0a0518] border-x border-[#3d1d6d]/60 shadow-2xl`}
              style={{ backfaceVisibility: 'hidden', isolation: 'isolate' }}
            >
              <Sidebar 
                currentTab={activeTab} 
                setTab={(tab) => { handleSetTab(tab); setIsSidebarOpen(false); }} 
                lang={lang} 
                onLogout={handleGoogleLogout} 
                userName={userName} 
                unreadMessagesCount={unreadMessagesCount} 
                isPremium={isUserPremium}
                planName={userPlanName}
                userEmail={userEmail}
                photoUrl={userPhoto}
                isAdmin={isAdminUser}
                badgeTier={(userStats as any)?.badgeTier}
                nameColor={(userStats as any)?.nameColor}
                badgeColor={(userStats as any)?.badgeColor}
              />                
            </div>
          </OverlayPortal>
        )}
      

      {/* Support button removed as requested */}
      
        <PostRegisterOnboardingModal
          isOpen={showPostRegisterModal}
          onClose={() => setShowPostRegisterModal(false)}
          userId={userId}
          initialName={userName}
          onSaveName={(newName) => {
            setUserName(newName);
            localStorage.setItem('quiz_userName', newName);
          }}
          lang={lang}
          onSelectPlan={(plan) => {
            if (plan === 'free') {
              handleSetTab('profile');
            } else {
              handleSetTab('billing');
            }
          }}
        />
        </>
      )}
    
    </>
  );
}
