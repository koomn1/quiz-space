import React from 'react';
import Header from '../components/Header';
import ProcessingCenterBanner from '../components/ProcessingCenterBanner';
import CommandPalette from '../components/CommandPalette';
import { PremiumCursor } from '../components/PremiumCursor';
import { AlertTriangle, Award, Bell, ExternalLink, XCircle } from 'lucide-react';
import { registerPushNotifications } from '../lib/pushManager';
import { pushNotificationsManager, PushNotificationPayload } from '../lib/pushNotifications';
import { playNotificationSound } from '../lib/sound';

export interface AppShellProps {
  children: React.ReactNode;
  showAppHeader: boolean;
  activeTab: string;
  handleSetTab: (tab: string, bypassAuth?: boolean, overrideProfileId?: string | null) => void;
  isQuizLocked: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  colorTheme: string;
  setColorTheme: (theme: string) => void;
  userName: string;
  setUserName: React.Dispatch<React.SetStateAction<string>>;
  userId: string;
  userPhoto: string | null;
  setAuthModalMode: (mode: any) => void;
  setIsAuthModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleGoogleLogout: () => void;
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
  isUserPremium: boolean;
  isSidebarOpen: boolean;
  sidebarMenuButtonRef: React.RefObject<HTMLButtonElement | null>;
  authIsAuthenticated: boolean;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCosmoTab: boolean;
  showQuotaWarning: boolean;
  setShowQuotaWarning: React.Dispatch<React.SetStateAction<boolean>>;
  showPushBanner: boolean;
  setShowPushBanner: React.Dispatch<React.SetStateAction<boolean>>;
  activePush: PushNotificationPayload | null;
  setActivePush: React.Dispatch<React.SetStateAction<PushNotificationPayload | null>>;
  setActiveQuizId: React.Dispatch<React.SetStateAction<string | null>>;
  quizzes: any[];
}

export default function AppShell(props: AppShellProps) {
  const {
    children, showAppHeader, activeTab, handleSetTab, isQuizLocked, setIsSidebarOpen, darkMode, setDarkMode,
    colorTheme, setColorTheme, userName, setUserName, userId, userPhoto, setAuthModalMode, setIsAuthModalOpen,
    handleGoogleLogout, lang, setLang, isUserPremium, isSidebarOpen, sidebarMenuButtonRef, authIsAuthenticated,
    isCommandPaletteOpen, setIsCommandPaletteOpen, isCosmoTab, showQuotaWarning, setShowQuotaWarning,
    showPushBanner, setShowPushBanner, activePush, setActivePush, setActiveQuizId, quizzes,
  } = props;

  return (
    <>
                {showAppHeader && <Header
            currentTab={activeTab}
            setTab={handleSetTab}
            toggleSidebar={() => {
              if (!isQuizLocked) {
                setIsSidebarOpen((open) => !open);
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
            menuButtonRef={sidebarMenuButtonRef}
          />}
          <ProcessingCenterBanner
            lang={lang}
            enabled={Boolean(authIsAuthenticated && userId && !userId.startsWith('user-guest'))}
            onOpenCreator={() => handleSetTab('create')}
          />
          {showAppHeader && !isQuizLocked && (
            <CommandPalette
              isOpen={isCommandPaletteOpen}
              lang={lang}
              onOpen={() => setIsCommandPaletteOpen(true)}
              onClose={() => setIsCommandPaletteOpen(false)}
              onNavigate={(tab) => handleSetTab(tab)}
            />
          )}

          <div
          className={`light-readable-ui theme-page min-h-dvh w-full max-w-none overflow-x-hidden ${isCosmoTab ? 'h-dvh overflow-hidden' : ''}`}
        >
          <PremiumCursor />
      
                <div className={`relative flex min-h-0 min-w-0 flex-1 flex-col ${isCosmoTab ? 'h-full overflow-hidden' : 'min-h-dvh overflow-x-hidden'}`}>

                
        <div className={`theme-animated-bg fixed inset-0 pointer-events-none z-0 overflow-hidden select-none ${isCosmoTab ? 'hidden' : ''}`}>
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
            <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-cyan-400/5 blur-[120px] mix-blend-screen" />
            <div className="absolute top-[30%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-cyan-500/10 blur-[120px] mix-blend-screen" />
          </div>
        </div>

        <div className={`absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-indigo-50/40 dark:from-indigo-950/10 to-transparent pointer-events-none ${isCosmoTab ? 'hidden' : ''}`} />

        {/* Padding applied here to clear the fixed header for all banners and main content */}
        <div className={`${isCosmoTab ? 'h-[calc(100dvh-3.5rem)] pt-14 sm:h-[calc(100dvh-4rem)] sm:pt-16 overflow-hidden flex-1 min-h-0' : (showAppHeader ? 'pt-20 sm:pt-24 md:pt-28' : 'pt-0')} flex flex-col w-full relative z-10`}>
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
      {children}
      </div>

      {/* Footer copyright — hidden on the Cosmo chat page so the chat
          surface stays edge-to-edge under the fixed header */}
      <footer className={`theme-surface w-full border-t py-6 text-center text-xs theme-muted font-medium print:hidden transition-colors ${isCosmoTab ? 'hidden' : ''}`}>
        <p>{lang === 'ar' ? 'جميع الحقوق محفوظة لموقع Quiz Space © 2026 - بواسطة يوسف بدوي' : 'All rights reserved © 2026 Quiz Space - Built by Youssef Badawy'}</p>
      </footer>

      </div> {/* Closes <div className="flex-1 flex flex-col min-w-0 ..."> at line 961 */}
    </div> {/* Closes <div  ...> at line 931 */}
    </>
  );
}
