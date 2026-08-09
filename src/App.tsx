import CosmicLoader from "./components/CosmicLoader";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSearchParams } from './hooks/useSearchParams';
import { Quiz, UserStats, getUserRoleAndPlan } from './types';
import { supabase } from './lib/supabaseClient';
import { registerPushNotifications } from './lib/pushManager';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import NotFound from './pages/NotFound';
const QuizCreator = React.lazy(() => import('./pages/QuizCreator'));
import QuizResolver from './components/QuizResolver';
const UserProfile = React.lazy(() => import('./pages/UserProfile'));
const Support = React.lazy(() => import('./pages/Support'));
import MessageInbox from './components/MessageInbox';
const MyQuizzes = React.lazy(() => import('./pages/MyQuizzes').then(module => ({ default: module.MyQuizzes })));
import AdminGuard from './components/AdminGuard';
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AnalyticsDashboard = React.lazy(() => import('./pages/AnalyticsDashboard').then(module => ({ default: module.AnalyticsDashboard })));
const BillingSection = React.lazy(() => import('./components/BillingSection').then(module => ({ default: module.BillingSection })));
import { 
  ExploreSection, 
  CategoriesSection, 
  CommunitySection, 
  BookmarksSection, 
  AchievementsSection, 
  SettingsSection,
  LeaderboardSection,
  playChimeSound 
} from './components/ExtraFeatures';
import ShareModal from './components/ShareModal';
import OnboardingTour from './components/OnboardingTour';
import AuthModal from './components/AuthModal';
import WelcomeAuthOverlay from './components/WelcomeAuthOverlay';
import PopupBlockedModal from './components/PopupBlockedModal';
import NetworkFailedModal from './components/NetworkFailedModal';
import { PremiumCursor } from './components/PremiumCursor';
import { PostRegisterOnboardingModal } from './components/PostRegisterOnboardingModal';
import DailyQuizCard from './components/DailyQuizCard';
const AIChat = React.lazy(() => import('./pages/AIChat'));
import SplashScreen from './components/SplashScreen';
import { ToastHost } from './components/Toast';
const Classrooms = React.lazy(() => import('./components/Classrooms'));
import { Sparkles, Edit, Compass, Info, XCircle, Award, Volume2, Globe, Bell, AlertTriangle, ExternalLink, User, Bot, Zap, MessageCircle } from 'lucide-react';

import { getQuizzes, saveUserProfile, deleteQuiz, getUserProfileStats, getRecentCompletions } from './lib/db';
import { playNotificationSound } from './lib/sound';
import { pushNotificationsManager, PushNotificationPayload } from './lib/pushNotifications';
import { translations } from './lib/i18n';
import { initAppOrigin, getApiUrl } from './lib/origin';
import { generateCoolStudentName } from './lib/nameGenerator';
import { useAuth } from './context/AuthContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function App() {
  const mainContainerRef = React.useRef<HTMLElement>(null);

  const authContext = useAuth();
  // Show splash only once per day — not on every page refresh
  const [splashActive, setSplashActive] = React.useState(true);

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
  // Single source of truth for admin UI checks. Prefers the server-verified,
  // non-self-editable is_admin column (see 20260726_lock_privileged_user_columns.sql);
  // falls back to the legacy hardcoded email/uid check only until that migration
  // has been run and userStats has loaded. This is a UI-visibility convenience only -
  // actual admin-only writes are enforced by RLS + the privileged-columns trigger
  // regardless of what this value says.
  const isAdminUser = userStats?.isAdmin || userId === 'adman777888999' || userEmail === 'adman777888999@gmail.com' || userEmail === 'yo01009950871@gmail.com';

  React.useEffect(() => {
    if (!authContext.user) return;
    const u = authContext.user;
    setUserId(u.uid);
    setUserName(u.name || '');
    setUserEmail(u.email || null);
    setUserPhoto(u.photoURL || null);
    setUserCustomId(u.customId || null);
    setIsUserPremium(!!u.isPremium);
    setUserPlanName(u.planName || '');
  }, [authContext.user?.uid, authContext.user?.name, authContext.user?.photoURL, authContext.user?.customId, authContext.user?.isPremium, authContext.user?.planName]);

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
      const knownTabs = new Set(['landing', 'explore', 'categories', 'community', 'messages', 'classrooms', 'bookmarks', 'achievements', 'leaderboard', 'analytics', 'billing', 'notifications', 'create', 'profile', 'aichat', 'my-quizzes', 'settings', 'support', 'admin']);
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
        const knownTabs = new Set(['landing', 'explore', 'categories', 'community', 'messages', 'classrooms', 'bookmarks', 'achievements', 'leaderboard', 'analytics', 'billing', 'notifications', 'create', 'profile', 'aichat', 'my-quizzes', 'settings', 'support', 'admin']);
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
    if (currentPath.includes('/quiz-space') || window.location.hostname.includes('github.io')) {
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

  const [unreadMessagesCount, setUnreadMessagesCount] = React.useState<number>(0);

  const [quizzes, setQuizzes] = React.useState<Quiz[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = React.useState(true);

  
  const [darkMode, setDarkMode] = React.useState(() => localStorage.getItem('quiz_theme') === 'dark');
  const [colorTheme, setColorTheme] = React.useState(() => localStorage.getItem('quiz_color_theme') || 'indigo');

  // i18n & Push API properties setup
  const [lang, setLang] = React.useState<'ar' | 'en'>(() => {
    return (localStorage.getItem('quiz_language') as 'ar' | 'en') || 'ar';
  });
  const [activePush, setActivePush] = React.useState<PushNotificationPayload | null>(null);
  const [showPushBanner, setShowPushBanner] = React.useState(() => {
    const perm = pushNotificationsManager.getPermissionStatus();
    return perm !== 'granted' && localStorage.getItem('quiz_push_banner_dismissed') !== 'true';
  });
  const [showQuotaWarning, setShowQuotaWarning] = React.useState(() => {
    return localStorage.getItem('firebase_quota_exceeded') === 'true';
  });

  React.useEffect(() => {
    const checkQuota = () => {
      if (localStorage.getItem('firebase_quota_exceeded') === 'true') {
        setShowQuotaWarning(true);
      }
    };
    const interval = setInterval(checkQuota, 3000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    localStorage.setItem('quiz_language', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Show push banner only after login if permission is not granted and banner not dismissed for this session
  React.useEffect(() => {
    if (!userId || userId.startsWith('user-guest')) return;
    const perm = Notification.permission;
    const dismissed = localStorage.getItem('quiz_push_banner_dismissed') === 'true';
    setShowPushBanner(perm !== 'granted' && !dismissed);
  }, [userId]);

  // Reset push banner on logout
  React.useEffect(() => {
    if (!userId || userId.startsWith('user-guest')) {
      setShowPushBanner(false);
    }
  }, [userId]);

  // Cosmo (AIChat) is a full-height app shell: fixed header on top, Cosmo
  // workspace fills ALL remaining height, only its messages scroll internally,
  // and the page itself never scrolls. Site backgrounds/footer are hidden
  // so nothing shows behind the chat; the whole surface recolors with mode.
  const isCosmoTab = activeTab === 'aichat' && !activeQuizId;

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

  React.useEffect(() => {
    const handleNotification = (payload: PushNotificationPayload) => {
      setActivePush(payload);
      setTimeout(() => {
        setActivePush((curr) => curr?.id === payload.id ? null : curr);
      }, 7000);
    };
    pushNotificationsManager.subscribe('app-root', handleNotification);
    
    // Subscribe to the notifications table in real-time via Supabase Realtime
    // (Postgres logical replication under the hood - Supabase's equivalent of onSnapshot).
    if (localStorage.getItem('firebase_quota_exceeded') === 'true') {
      return;
    }
    const sessionBootTime = new Date().toISOString();

    const notifChannel = supabase
      .channel('notifications-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const data = payload.new as any;
          if (data.created_at && data.created_at < sessionBootTime) return;
          if (data.sender_name && data.sender_name === userName) return;

          pushNotificationsManager.trigger({
            title: data.title || (lang === 'ar' ? 'تنبيه جديد 🪐' : 'New Buzz 🪐'),
            body: data.body || '',
            icon: 'bell'
          });
          try {
            playNotificationSound('chime');
          } catch (_) {}
        }
      )
      .subscribe();

    return () => {
      pushNotificationsManager.unsubscribe('app-root');
      void supabase.removeChannel(notifChannel);
    };
  }, [userName, lang]);

  // Request native browser desktop notifications permission on startup

  // Monitor unread direct messages in real-time, compute total unreadMessagesCount, and trigger desktop push notifications
  React.useEffect(() => {
    if (!userId) {
      setUnreadMessagesCount(0);
      return;
    }
    if (localStorage.getItem('firebase_quota_exceeded') === 'true') {
      setUnreadMessagesCount(0);
      return;
    }

    const sessionBootTime = new Date().toISOString();

    // Initial unread count fetch (Supabase Realtime only streams *changes*, not existing rows).
    supabase.from('direct_messages').select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId).eq('is_read', false)
      .then(({ count }) => setUnreadMessagesCount(count || 0));

    const dmChannel = supabase
      .channel(`direct-messages-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${userId}` },
        (payload) => {
          const msg = payload.new as any;
          if (!msg.is_read) setUnreadMessagesCount((prev) => prev + 1);

          const isNew = msg.created_at && new Date(msg.created_at).getTime() > new Date(sessionBootTime).getTime();
          if (isNew) {
            const senderName = msg.sender_name || (lang === 'ar' ? 'مستخدم' : 'Scholar');
            const text = msg.text || '';

            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(lang === 'ar' ? `رسالة جديدة من ${senderName} 💬` : `New message from ${senderName} 💬`, {
                  body: text.length > 70 ? text.substring(0, 70) + '...' : text,
                  icon: `${import.meta.env.BASE_URL || '/'}brand/quizspace-icon-192.png`
                });
              } catch (err) {
                console.warn('Native notification instantiation error:', err);
              }
            }

            pushNotificationsManager.trigger({
              title: lang === 'ar' ? `رسالة جديدة من ${senderName} 💬` : `New message from ${senderName} 💬`,
              body: text,
              icon: 'message'
            });

            try {
              playNotificationSound('chime');
            } catch (_) {}
          }
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(dmChannel); };
  }, [userId, lang]);

  // Bright cheerful theme presets helper configurations & syncing
  React.useEffect(() => {
    const list = [
      { id: 'indigo', primary: '#9333ea', primaryHover: '#7e22ce', primaryLight: '#faf5ff', primaryDark: '#1e0b36', gradientFrom: '#8b5cf6', gradientTo: '#ec4899' },
      { id: 'light', primary: '#4f46e5', primaryHover: '#4338ca', primaryLight: '#f0f2ff', primaryDark: '#1e1b4b', gradientFrom: '#6366f1', gradientTo: '#3b82f6' },
      { id: 'sky', primary: '#0284c7', primaryHover: '#0369a1', primaryLight: '#f0f9ff', primaryDark: '#0c4a6e', gradientFrom: '#0284c7', gradientTo: '#06b6d4' },
      { id: 'emerald', primary: '#10b981', primaryHover: '#059669', primaryLight: '#ecfdf5', primaryDark: '#064e3b', gradientFrom: '#10b981', gradientTo: '#059669' },
      { id: 'sunset', primary: '#ea580c', primaryHover: '#c2410c', primaryLight: '#fff7ed', primaryDark: '#431407', gradientFrom: '#f97316', gradientTo: '#be123c' },
      { id: 'pastelp', primary: '#db2777', primaryHover: '#be185d', primaryLight: '#fdf2f8', primaryDark: '#500724', gradientFrom: '#f472b6', gradientTo: '#fda4af' }
    ];
    const selected = list.find(t => t.id === colorTheme) || list[0];
    localStorage.setItem('quiz_color_theme', colorTheme);

    const root = document.documentElement;
    root.style.setProperty('--theme-primary', selected.primary);
    root.style.setProperty('--theme-primary-hover', selected.primaryHover);
    root.style.setProperty('--theme-primary-light', selected.primaryLight);
    root.style.setProperty('--theme-primary-dark', selected.primaryDark);
    root.style.setProperty('--theme-gradient-from', selected.gradientFrom);
    root.style.setProperty('--theme-gradient-to', selected.gradientTo);
  }, [colorTheme]);

  // Trigger Onboarding for new users on mount
  React.useEffect(() => {
    const tourShown = localStorage.getItem('quiz_onboarding_shown');
    if (!tourShown) {
      // Small delay on mount for transition smoothness
      const timer = setTimeout(() => setShowOnboarding(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync Google Auth State changes
  React.useEffect(() => {
    const localUserId = localStorage.getItem('quiz_userId');
    const isLocalSandbox = localStorage.getItem('quiz_isLocalSandbox') === 'true';
    const localAuthToken = localStorage.getItem('local_auth_token');

    if (localUserId && (isLocalSandbox || localAuthToken)) {
      // Restore local sandbox or custom email/password session
      setIsGuestSandbox(isLocalSandbox && !localAuthToken);
      const savedName = localStorage.getItem('quiz_userName') || generateCoolStudentName(lang);
      const savedEmail = localStorage.getItem('quiz_userEmail') || 'local.student@spacequiz.local';
      setUserId(localUserId);
      setUserName(savedName);
      setUserEmail(savedEmail);
      
      const savedPhoto = localStorage.getItem('quiz_userPhoto');
      if (savedPhoto) setUserPhoto(savedPhoto);

      // Async load their actual Postgres statistics
      getUserProfileStats(localUserId).then(stats => {
        if (stats) {
          setUserStats(stats);
          setIsUserPremium(!!stats.isPremium);
          setUserPlanName(stats.planName || '');
          if (stats.photoURL) {
            setUserPhoto(stats.photoURL);
            localStorage.setItem('quiz_userPhoto', stats.photoURL);
          }
          if (stats.customId) {
            setUserCustomId(stats.customId);
          }
          if (stats.completions) {
            setCompletions(stats.completions);
          }
        }
      }).catch(e => {
        console.warn('Error loading custom local stats:', e);
      }).finally(() => {
        setIsStatsLoaded(true);
      });
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user as any;
      if (user) {
        // Authenticated user
        setIsGuestSandbox(false);
        let finalName = user.user_metadata?.name || user.user_metadata?.full_name;
        if (!finalName) {
          const emailPrefix = user.email?.split('@')[0] || '';
          const hasAlphanumericOnly = /^[a-zA-Z0-9._%+-]+$/.test(emailPrefix);
          const containsDeveloperKeywords = 
            emailPrefix.toLowerCase().includes('jobadawy') || 
            emailPrefix.toLowerCase().includes('badawy') || 
            emailPrefix.toLowerCase().includes('youssef') || 
            emailPrefix.toLowerCase().includes('yousef') ||
            emailPrefix.toLowerCase().includes('yo01009950871');
          
          const localSavedName = localStorage.getItem('quiz_userName');
          if (localSavedName && localSavedName !== 'طالب متميز' && localSavedName !== 'طالب زائر' && !localSavedName.toLowerCase().includes('jobadawy') && !localSavedName.toLowerCase().includes('badawy')) {
            finalName = localSavedName;
          } else if (emailPrefix && !hasAlphanumericOnly && !containsDeveloperKeywords) {
            finalName = emailPrefix;
          } else {
            // Generate a cool Arabic/English random student name instead of email prefix or ID
            finalName = generateCoolStudentName(lang);
          }
        }

        setUserId(user.id);
        setUserName(finalName);
        setUserEmail(user.email || null);
        setUserPhoto(user.user_metadata?.avatar_url || null);
        localStorage.setItem('quiz_userId', user.id);
        localStorage.setItem('quiz_userName', finalName);

        const onboarded = localStorage.getItem(`quiz_profile_onboarded_${user.id}`);
        if (!onboarded) {
          let dbOnboarded = false;
          try {
            const { data: userRow } = await supabase.from('users').select('onboarded').eq('uid', user.id).maybeSingle();
            dbOnboarded = !!userRow?.onboarded;
          } catch (e) {
            dbOnboarded = true;
          }
          if (!dbOnboarded) {
            setShowPostRegisterModal(true);
          } else {
            localStorage.setItem(`quiz_profile_onboarded_${user.id}`, 'true');
          }
        }

        // Success logged in chime sound
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
            setUrlProfileId(user.id);
            window.history.pushState(null, '', `${basePath}#/profile/${user.id}`);
          } else {
            setUrlProfileId(null);
            window.history.pushState(null, '', basePath);
          }
        }

        // Sync profile into Firestore 'users' collection
        try {
          await saveUserProfile(user.id, finalName, user.user_metadata?.avatar_url || undefined, user.email || undefined, undefined, undefined, undefined, undefined, undefined);
        } catch (e) {
          console.error("Error setting user profile: ", e);
        }

        try {
          const stats = await getUserProfileStats(user.id);
          if (stats) {
            setUserStats(stats);
            setIsUserPremium(!!stats.isPremium);
            setUserPlanName(stats.planName || '');
            if (stats.photoURL) {
              setUserPhoto(stats.photoURL);
            }
            if (stats.customId) {
              setUserCustomId(stats.customId);
            }
            if (stats.completions) {
              setCompletions(stats.completions);
            }
          }
        } catch (e) {
          console.error("Error getting user profile stats: ", e);
        } finally {
          registerPushNotifications(user.id).then((permission) => {
            pushNotificationsManager.setPermissionStatus(permission);
            if (permission === 'granted') {
              setShowPushBanner(false);
            }
          });
          setIsStatsLoaded(true);
        }
      } else {
        const localAuthToken = localStorage.getItem('local_auth_token');
        if (localAuthToken) {
          // Securely retain local custom email/password session
          setIsStatsLoaded(true);
          return;
        }

        setIsUserPremium(false);
        setUserPlanName('');
        setUserPhoto(null);
        // Guest user fallback - Keep anonymous state for lists browsing smoothly but do not prompt with welcome wizard
        let storedUserId = localStorage.getItem('quiz_userId');
        let storedUserName = localStorage.getItem('quiz_userName');
        if (!storedUserId) {
          storedUserId = 'user-guest-' + Math.random().toString(36).substring(2, 9);
          localStorage.setItem('quiz_userId', storedUserId);
        }
        if (!storedUserName) {
          storedUserName = 'طالب متميز';
          localStorage.setItem('quiz_userName', storedUserName);
        }
        setUserId(storedUserId);
        setUserName(storedUserName);
        setIsStatsLoaded(true);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);  // Initialize Account and check URL routes on start

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
            setUserPhoto(stats.photoURL);
          }
        }
      } catch (_) {}
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [userId]);
  React.useEffect(() => {
    // 0. Fetch real external public URL origin for sharing purposes
    initAppOrigin();

    // 1. Theme configuration fallback lock
    const isDark = localStorage.getItem('quiz_theme') === 'dark';
    setDarkMode(isDark);

    let path = window.location.pathname;
    if (path.startsWith('/quiz-space')) {
      path = path.slice(11);
    }
    const hash = window.location.hash;

    let quizId = null;
    if (hash) {
      const hashClean = hash.replace(/^#\/?/, "").split('?')[0];
      const qMatch = hashClean.match(/^quiz\/([^\/?#]+)/);
      if (qMatch && qMatch[1]) {
        quizId = qMatch[1];
      }
    }
    if (!quizId) {
      const quizMatch = path.match(/^\/quiz\/([^\/]+)/) || path.match(/^\/apps\/([^\/]+)/);
      if (quizMatch && quizMatch[1]) {
        quizId = quizMatch[1];
      }
    }

    if (quizId) {
      authRedirectQuizIdRef.current = quizId;
    }

    // 3. Fetch Quizzes straight from database
    fetchQuizzesList();
  }, []);

  // Sync dark theme document variables with cinematic transition class
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    const timeout = setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 450);

    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('quiz_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('quiz_theme', 'light');
    }

    return () => clearTimeout(timeout);
  }, [darkMode]);

  // Fetch quizzes list from Firestore
  const fetchQuizzesList = async () => {
    setIsLoadingQuizzes(true);
    try {
      const data = await getQuizzes();
      setQuizzes(data);
    } catch (e) {
      console.error('Error fetching quizzes:', e);
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  // Activate Local Sandbox Simulation Mode to handle network blocks / iframe sandboxing.
  // This is a guest/trial mode only: it must never carry real privileges (premium,
  // class creation, community posting, etc.) since it isn't backed by a Supabase
  // Auth session or a verified database row. Those actions must prompt sign-in.
  const activateLocalSandboxMode = () => {
    const id = 'local-user-' + Math.random().toString(36).substring(2, 9);
    const generatedName = generateCoolStudentName(lang);
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

  // Google Sign-In via Supabase OAuth
  const handleGoogleLogin = async () => {
    try {
      setPopupBlocked(false);
      setNetworkFailedError(false);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + (import.meta.env.BASE_URL || '/'),
        },
      });
      if (error) throw error;
    } catch (e: any) {
      console.error('Google Sign In Error:', e);
      if (
        (e.message && (
          e.message.indexOf('popup-blocked') !== -1 ||
          e.message.indexOf('popup_blocked') !== -1 ||
          e.message.indexOf('Popup blocked') !== -1 ||
          e.message.indexOf('auth/popup-blocked') !== -1
        ))
      ) {
        setPopupBlocked(true);
      } else if (
        e.code === 'auth/network-request-failed' || 
        (e.message && e.message.includes('network-request-failed'))
      ) {
        setNetworkFailedError(true);
      } else if (e.code !== 'auth/popup-closed-by-user') {
        alert(lang === 'ar' ? 'حدث خطأ أثناء تسجيل الدخول بواسطة جوجل: ' + e.message : 'An error occurred during Google sign in: ' + e.message);
      }
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

    // Guest Auth Guard: User is a guest only if userId is missing or explicitly a guest ID AND not authenticated via AuthContext
    const isGuest = (!userId || userId.startsWith('user-guest') || userId === '') && !authContext.isAuthenticated;
    if (!bypassAuth && isGuest && (tab === 'create' || (tab === 'profile' && !validOverrideId))) {
      setLoginRedirectTab(tab);
      setAuthModalMode('register');
      setIsAuthModalOpen(true);
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

  // Core sections keep the shared content frame, while independent screens
  // use their own full-screen surface. The global Header remains available
  // on every non-quiz screen so users never lose navigation context.
  const showAppHeader = !activeQuizId;
  const usesSharedFrame = React.useMemo(() => {
    const sharedTabs = new Set([
      'landing',
      'profile',
      'create',
      'community',
      'settings',
      'my-quizzes',
      'billing',
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

  return (
        <>
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
      ) : (
        <>
          {showAppHeader && <Header
            currentTab={activeTab}
            setTab={handleSetTab}
            toggleSidebar={() => {
              if (!isQuizLocked) {
                setIsSidebarOpen(!isSidebarOpen);
              }
            }}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            colorTheme={colorTheme}
            setColorTheme={setColorTheme}
            userName={userName}
            setUserName={(name) => {
              setUserName(name);
              localStorage.setItem('quiz_userName', name);
            }}
            userId={userId}
            photoURL={userPhoto || undefined}
            onLogin={() => {
              setAuthModalMode('register');
              setIsAuthModalOpen(true);
            }}
            onLogout={handleGoogleLogout}
            lang={lang}
            setLang={setLang}
            isPremium={isUserPremium}
            isSidebarOpen={isSidebarOpen}
            isQuizLocked={isQuizLocked}
          />}

          <div
          className={`min-h-dvh w-full max-w-none overflow-x-hidden transition-colors duration-500 ${isCosmoTab ? 'h-dvh overflow-hidden' : ''} ${
            darkMode
              ? 'bg-[#020617] text-slate-100'
              : 'bg-[#f8fafc] text-slate-800'
          }`}
        >
          <PremiumCursor />
      
                <div className={`relative flex min-h-0 min-w-0 flex-1 flex-col transition-colors duration-300 ${isCosmoTab ? 'h-full overflow-hidden' : 'min-h-dvh overflow-x-hidden'}`}>

                
        <div className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none ${isCosmoTab ? 'hidden' : ''}`}>
          {/* Light mode background elements */}
          <div className="absolute inset-0 dark:hidden opacity-30">
            <div 
              className="absolute -top-40 -left-40 w-[600px] h-[500px] bg-gradient-to-tr from-primary/15 via-emerald-500/5 to-purple-600/10 rounded-full filter blur-[120px] transition-all duration-[20s]"
              style={{ animation: 'pulse 12s infinite ease-in-out alternate' }}
            />
            <div 
              className="absolute -bottom-40 -right-40 w-[700px] h-[600px] bg-gradient-to-br from-indigo-500/10 via-teal-400/10 to-rose-500/5 rounded-full filter blur-[140px] transition-all duration-[25s]"
              style={{ animation: 'pulse 15s infinite ease-in-out alternate-reverse' }}
            />
          </div>

          {/* Dark mode background elements (similar to Landing Page Hero) */}
          <div className="absolute inset-0 hidden dark:block opacity-100">
            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e512_1px,transparent_1px),linear-gradient(to_bottom,#4f46e512_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,#000_80%,transparent_100%)]" />
            
            {/* Glowing Orbs */}
            <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-600/10 blur-[120px] mix-blend-screen" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#0ae448]/5 blur-[120px] mix-blend-screen" />
            <div className="absolute top-[30%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-cyan-500/10 blur-[120px] mix-blend-screen" />
          </div>
        </div>

        <div className={`absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-indigo-50/40 dark:from-indigo-950/10 to-transparent pointer-events-none ${isCosmoTab ? 'hidden' : ''}`} />

        {/* Padding applied here to clear the fixed header for all banners and main content */}
        <div className={`${isCosmoTab ? 'pt-14 sm:pt-16 overflow-hidden flex-1 min-h-0' : (showAppHeader ? 'pt-20 sm:pt-24 md:pt-28' : 'pt-0')} flex flex-col w-full relative z-10`}>
          {showQuotaWarning && localStorage.getItem('firebase_quota_exceeded_dismissed') !== 'true' && (
            <div className="bg-amber-500/10 border-b border-amber-500/25 px-4 py-3 text-amber-700 dark:text-amber-300 font-sans z-30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 max-w-4xl" style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="leading-relaxed font-bold">
                  {lang === 'ar' 
                    ? 'برجاء ملاحظة: تجاوزت قاعدة البيانات السحابة حد الاستعلام المجاني لليوم. تم تشغيل المحاكي وقاعدة البيانات الاحتياطية لضمان استمرار استخدام التطبيق بلا توقف!' 
                    : 'Notice: The cloud database (Firestore) has reached its free limit. Local fallback engine is now running seamlessly to keep you learning!'
                  }
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a 
                  href="https://console.firebase.google.com/project/quiz-spacee/firestore" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-white font-black hover:bg-amber-600 transition-all flex items-center gap-1 active:scale-95 text-[11px] uppercase cursor-pointer"
                >
                  <span>{lang === 'ar' ? 'ترقية للتشغيل السحابي الدائم' : 'Upgrade Cloud'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button 
                  onClick={() => {
                    localStorage.setItem('firebase_quota_exceeded_dismissed', 'true');
                    setShowQuotaWarning(false);
                  }}
                  className="p-1 rounded-full hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 cursor-pointer"
                >
                  <XCircle className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          )}

        {/* Interactive Web Push API Opt-in Header Banner */}
        
          {showPushBanner && (
            <div
              
              
              
              className="w-full bg-gradient-to-r from-primary/10 to-transparent border-b border-primary/20 text-slate-800 dark:text-slate-100 overflow-hidden relative z-35"
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-semibold">
                <div className="flex items-center gap-2.5" style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>
                  <div className="p-2 rounded-xl bg-primary/20 text-primary flex-shrink-0">
                    <Bell className="w-4 h-4 text-primary animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-slate-100">{lang === 'ar' ? '🏆 فعل إشعارات لوحة المتصدرين الحية!' : '🏆 Enable Live Leaderboard Alerts!'}</h4>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold leading-normal mt-0.5">
                      {lang === 'ar' 
                        ? 'احصل على إشعار فوري من المتصفح عندما يقوم طالب آخر بكسر رقمك القياسي واحتلال الصدارة!'
                        : 'Get real-time browser notifications instantly if another player beats your high score on any quiz.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const permission = await registerPushNotifications(userId);
                      pushNotificationsManager.setPermissionStatus(permission);
                      if (permission === 'granted') {
                        playNotificationSound('success');
                      }
                      setShowPushBanner(false);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-[11px] font-black cursor-pointer shadow-sm shadow-primary/20 transition-all hover:scale-103"
                  >
                    {lang === 'ar' ? 'تفعيل الإشعارات الآن 🔔' : 'Enable Notifications 🔔'}
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem('quiz_push_banner_dismissed', 'true');
                      setShowPushBanner(false);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-400 dark:text-slate-500 hover:text-slate-600 cursor-pointer text-[11px]"
                  >
                    {lang === 'ar' ? 'ليس الآن' : 'Later'}
                  </button>
                </div>
              </div>
            </div>
          )}
        

        {/* Dynamic Slide-down Push Notification Toast Alert */}
        
          {activePush && (
            <div
              
              
              
              className="fixed top-24 sm:top-28 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-50 p-4 rounded-2xl bg-[#0b0f19] text-white border border-primary/25 shadow-2xl flex gap-3.5 items-start cursor-pointer select-none ring-1 ring-primary/40"
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
              onClick={() => {
                setActiveQuizId(activePush.quizId === 'mock-quiz-id' ? quizzes[0]?.id || null : activePush.quizId);
                setActivePush(null);
              }}
            >
              <div className="p-2.5 rounded-xl bg-primary/20 text-primary flex-shrink-0 animate-pulse">
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-right flex-1" style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>
                <h5 className="font-display font-black text-xs text-amber-300 flex items-center gap-1">
                  <span>{lang === 'ar' ? '🏆 كسر الرقم القياسي للتو!' : '🏆 Leaderboard Record Broken!'}</span>
                </h5>
                <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">
                  {activePush.body}
                </p>
                <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-800/80 mt-1.5">
                  <span>{lang === 'ar' ? 'اضغط لتحدي البطل من جديد ⚡' : 'Click to reclaim your throne ⚡'}</span>
                  <span className="font-mono">Web Push API</span>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePush(null);
                }}
                className="text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
          )}
        

        {/* Main page frame wrapping */}
        <main ref={mainContainerRef} className={`${isCosmoTab ? 'flex-1 w-full p-0 overflow-hidden min-h-0' : (usesSharedFrame ? 'flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-4 relative z-10' : 'flex-1 w-full min-h-[100dvh] p-0 relative z-10')}`}>

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
              
              
              
              
              
              className={`${isCosmoTab ? 'h-full min-h-0' : (usesSharedFrame ? '' : 'min-h-[100dvh]')} will-change-transform transform-gpu gsap-tab-wrapper`}
              style={{ backfaceVisibility: 'hidden' }}
            >
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] w-full"><CosmicLoader /></div>}>
              {activeTab === 'not-found' && (
                <NotFound lang={lang} onGoHome={() => setActiveTab('landing')} />
              )}
              {activeTab === 'landing' && (
                <>
                  <LandingPage
                  quizzes={quizzes}
                  isLoading={isLoadingQuizzes}
                  currentUserEmail={userEmail}
                  currentUserId={userId}
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
                    try {
                      await deleteQuiz(quizId);
                      playNotificationSound('delete');
                      await fetchQuizzesList();
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
                </>
              )}

              {activeTab === 'my-quizzes' && (
                <MyQuizzes
                  quizzes={quizzes}
                  userId={userId}
                  lang={lang}
                  onStartQuiz={handleStartQuiz}
                  onEditQuiz={(quiz) => {
                    setQuizToEdit(quiz);
                    handleSetTab('create');
                  }}
                  onDeleteQuiz={async (quizId) => {
                    try {
                      await deleteQuiz(quizId);
                      playNotificationSound('delete');
                      await fetchQuizzesList();
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
                <AnalyticsDashboard
                  userId={userId}
                  quizzes={quizzes}
                  completions={completions}
                  lang={lang}
                  onStartQuiz={handleStartQuiz}
                />
              )}

              {activeTab === 'billing' && (
                <BillingSection
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
                  <QuizCreator
                    userId={userId}
                    userName={userName}
                    userEmail={userEmail || ''}
                    quizToEdit={quizToEdit}
                    onQuizCreated={() => {
                      setQuizToEdit(null);
                      handleSetTab('my-quizzes');
                      fetchQuizzesList();
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
                  />
                )
              )}

              {activeTab === 'profile' && (
                <UserProfile
                  profileId={urlProfileId || userId}
                  currentUserId={userId}
                  currentUserName={userName}
                  currentUserEmail={userEmail}
                  onUpdateName={(name) => {
                    setUserName(name);
                    localStorage.setItem('quiz_userName', name);
                  }}
                  onUpdatePhoto={(photo) => {
                    setUserPhoto(photo);
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
                />
              )}

              {activeTab === 'explore' && (
                <ExploreSection 
                  quizzes={quizzes} 
                  onStartQuiz={handleStartQuiz} 
                  lang={lang} 
                  onViewProfile={(creatorId) => { handleSetTab('profile', false, creatorId); }}
                />
              )}

              {activeTab === 'aichat' && (
                <AIChat 
                  lang={lang} 
                  darkMode={darkMode} 
                  isPremium={isUserPremium} 
                  planName={userPlanName} 
                  userId={userId}
                  userName={userName}
                  userPhoto={userPhoto || undefined}
                  defaultAvatar="./avatars/boy-1.png"
                  onUpgradeClick={() => setActiveTab('billing')} 
                  onOpenAuthModal={(mode) => {
                    setAuthModalMode(mode);
                    setIsAuthModalOpen(true);
                  }}
                />
              )}

              {activeTab === 'categories' && (
                <CategoriesSection 
                  quizzes={quizzes} 
                  onStartQuiz={handleStartQuiz} 
                  lang={lang} 
                  onViewProfile={(creatorId) => { handleSetTab('profile', false, creatorId); }}
                />
              )}

              {activeTab === 'community' && (
                <CommunitySection lang={lang} userId={userId} userName={userName} userEmail={userEmail} userRole={getUserRoleAndPlan(userStats).role} isGuest={isGuestSandbox} isAdmin={isAdminUser} />
              )}

              {activeTab === 'messages' && (
                <MessageInbox lang={lang} userId={userId} userName={userName} userPhoto={userPhoto || undefined} defaultAvatar="./avatars/boy-1.png" />
              )}

              {activeTab === 'classrooms' && (
                <Classrooms 
                  lang={lang} 
                  currentUserId={userId} 
                  currentUserName={userName} 
                  currentUserPhoto={userPhoto} 
                  userRole={getUserRoleAndPlan(userStats).role} 
                  userPlan={getUserRoleAndPlan(userStats).plan}
                  currentUserEmail={userEmail}
                  onStartQuiz={handleStartQuiz}
                  isGuest={isGuestSandbox}
                  isAdmin={isAdminUser}
                  quizzes={quizzes}
                />
              )}

              {activeTab === 'bookmarks' && (
                <BookmarksSection 
                  quizzes={quizzes} 
                  onStartQuiz={handleStartQuiz} 
                  lang={lang} 
                  onViewProfile={(creatorId) => { handleSetTab('profile', false, creatorId); }}
                  userId={userId}
                />
              )}

              {activeTab === 'achievements' && (
                <AchievementsSection lang={lang} completions={completions} quizzes={quizzes} userId={userId} isPremium={isUserPremium} />
              )}

              {activeTab === 'leaderboard' && (
                <LeaderboardSection lang={lang} quizzes={quizzes} />
              )}

              {activeTab === 'settings' && (
                <SettingsSection 
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
                  <Support lang={lang} />
                </React.Suspense>
              )}

              {activeTab === 'admin' && (
                <AdminGuard userId={userId} userEmail={userEmail} lang={lang}>
                  <React.Suspense fallback={
                    <div className="flex items-center justify-center min-h-[400px]">
                      <CosmicLoader />
                    </div>
                  }>
                    <AdminDashboard 
                      quizzes={quizzes} 
                      lang={lang} 
                      onViewProfile={(creatorId) => { handleSetTab('profile', false, creatorId); }}
                      currentUserId={userId}
                      currentUserEmail={userEmail}
                    />
                  </React.Suspense>
                </AdminGuard>
              )}
              </React.Suspense>
            </div>
          
        )}

      </main>
      </div>

      {/* Footer copyright — hidden on the Cosmo chat page so the chat
          surface stays edge-to-edge under the fixed header */}
      <footer className={`w-full border-t border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-[#090d16] py-6 text-center text-xs text-slate-400 dark:text-slate-500 font-medium print:hidden transition-colors ${isCosmoTab ? 'hidden' : ''}`}>
        <p>{lang === 'ar' ? 'جميع الحقوق محفوظة لموقع Quiz Space © 2026 - بواسطة يوسف بدوي' : 'All rights reserved © 2026 Quiz Space - Built by Youssef Badawy'}</p>
      </footer>

      </div> {/* Closes <div className="flex-1 flex flex-col min-w-0 ..."> at line 961 */}
    </div> {/* Closes <div  ...> at line 931 */}

      {/* Onboarding tour guide overlay */}
      
        {showOnboarding && (
          <OnboardingTour
            activeTab={activeTab as any}
            setActiveTab={(tab) => handleSetTab(tab as any, true)}
            onClose={() => setShowOnboarding(false)}
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
        onClose={() => setIsAuthModalOpen(false)} 
        mode={authModalMode} 
        onSuccess={(user, token) => {
          localStorage.setItem('local_auth_token', token);
          localStorage.setItem('quiz_userId', user.id);
          localStorage.setItem('quiz_userName', user.name);
          localStorage.setItem('quiz_userEmail', user.email);
          if (user.user_metadata?.avatar_url) {
            localStorage.setItem('quiz_userPhoto', user.user_metadata?.avatar_url);
            setUserPhoto(user.user_metadata?.avatar_url);
          } else {
            setUserPhoto(null);
          }
          setUserId(user.id);
          setUserName(user.name);
          setUserEmail(user.email);
          setIsUserPremium(!!user.isPremium);
          setUserPlanName(user.planName || '');
          if (user.customId) {
            setUserCustomId(user.customId);
          } else {
            setUserCustomId(null);
          }

          // Note: manual session sync removed - the real @supabase/supabase-js client
          // (see AuthContext.tsx) manages session persistence and the onAuthStateChange
          // listener automatically, so this hand-rolled sync is no longer needed.

          playNotificationSound('chime');
          setIsAuthModalOpen(false);
          
          const pendingQuizId = authRedirectQuizIdRef.current;
          if (pendingQuizId && pendingQuizId !== 'login-trigger') {
            authRedirectQuizIdRef.current = null;
            setAuthRedirectQuizId(null);
            setActiveQuizId(pendingQuizId);
            window.history.pushState(null, '', `${getAppBasePath()}#/quiz/${pendingQuizId}`);
          }
        }}
      />

      
        {isSidebarOpen && !isQuizLocked && (
          <>
            {/* Backdrop */}
            <div 
              
              
              
              className="fixed inset-0 bg-black/60 z-[9998] backdrop-blur-sm cursor-pointer" 
              onClick={() => setIsSidebarOpen(false)} 
            />

            {/* Sidebar Slide-in Panel */}
            <div 
              
              
              
              
              className={`fixed inset-y-0 ${lang === 'ar' ? 'right-0' : 'left-0'} z-[9999] w-64 glass-panel border-x shadow-2xl h-[100dvh] flex flex-col overflow-hidden transform-gpu`}
              style={{ backfaceVisibility: 'hidden' }}
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
          </>
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
