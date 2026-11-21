import React from 'react';
import IOS27Header from '../components/ios27/IOS27Header';
import ProcessingCenterBanner from '../components/ProcessingCenterBanner';
import CommandPalette from '../components/CommandPalette';
import { PremiumCursor } from '../components/PremiumCursor';
import ClickSpark from '../components/ClickSpark';
import { Award, Bell, X } from 'lucide-react';
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
  isAdminUser: boolean;
  isSidebarOpen: boolean;
  sidebarMenuButtonRef: React.RefObject<HTMLButtonElement | null>;
  authIsAuthenticated: boolean;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCosmoTab: boolean;
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
    handleGoogleLogout, lang, setLang, isUserPremium, isAdminUser, isSidebarOpen, sidebarMenuButtonRef, authIsAuthenticated,
    isCommandPaletteOpen, setIsCommandPaletteOpen, isCosmoTab,
    showPushBanner, setShowPushBanner, activePush, setActivePush, setActiveQuizId, quizzes,
  } = props;

  return (
    <>
      {showAppHeader && (
        <IOS27Header
          currentTab={activeTab}
          setTab={handleSetTab}
          toggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          isSidebarOpen={isSidebarOpen}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          userName={userName}
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
          isAdmin={isAdminUser}
        />
      )}
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
          {/* Padding applied here to clear the fixed header for all banners and main content */}
          <div className={`app-shell-content ${isCosmoTab ? 'app-shell-content--chat h-[calc(100dvh-4.5rem-env(safe-area-inset-top))] pt-[calc(env(safe-area-inset-top)+4.5rem)] sm:h-[calc(100dvh-5rem-env(safe-area-inset-top))] sm:pt-[calc(env(safe-area-inset-top)+5rem)] overflow-hidden flex-1 min-h-0' : (showAppHeader ? 'pt-[calc(env(safe-area-inset-top)+4.75rem)] sm:pt-[calc(env(safe-area-inset-top)+5rem)] md:pt-24' : 'pt-0')} flex flex-col w-full relative z-10`}>

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
                      <h4 className="font-black text-slate-900 dark:text-slate-100">{lang === 'ar' ? ' فعل إشعارات لوحة المتصدرين الحية!' : ' Enable Live Leaderboard Alerts!'}</h4>
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
                      {lang === 'ar' ? 'تفعيل الإشعارات الآن ' : 'Enable Notifications '}
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
                className="uipro-glass-surface fixed top-24 sm:top-28 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-50 p-4 rounded-2xl border border-primary/25 text-[var(--lg-text)] flex gap-3.5 items-start cursor-pointer select-none ring-1 ring-primary/40"
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
                  <h5 className="font-display font-black text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <span>{lang === 'ar' ? ' كسر الرقم القياسي للتو!' : ' Leaderboard Record Broken!'}</span>
                  </h5>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-semibold">
                    {activePush.body}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/80 dark:border-slate-700/80 mt-1.5">
                    <span>{lang === 'ar' ? 'اضغط لتحدي البطل من جديد ' : 'Click to reclaim your throne '}</span>
                    <span className="font-mono">Web Push API</span>
                  </div>
                </div>
                <button
                  aria-label={lang === 'ar' ? 'إغلاق التنبيه' : 'Close notification'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePush(null);
                  }}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white text-xs"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Main page frame: React Bits click feedback is applied consistently to all non-chat pages. */}
            {isCosmoTab ? children : (
              <ClickSpark
                className="min-h-0 w-full"
                sparkColor={['#7C3AED', '#06B6D4', '#F59E0B']}
                sparkSize={7}
                sparkCount={7}
                sparkRadius={16}
                duration={480}
                shape="dot"
                glow={0.8}
              >
                {children}
              </ClickSpark>
            )}
          </div>

          {/* Footer copyright — hidden on the Cosmo chat page so the chat
              surface stays edge-to-edge under the fixed header */}
          <footer className={`theme-surface w-full border-t py-6 text-center text-xs theme-muted font-medium print:hidden transition-colors ${isCosmoTab ? 'hidden' : ''}`}>
            <p>{lang === 'ar' ? 'جميع الحقوق محفوظة لموقع Quiz Space © 2026 - بواسطة يوسف بدوي' : 'All rights reserved © 2026 Quiz Space - Built by Youssef Badawy'}</p>
            <nav className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4" aria-label={lang === 'ar' ? 'روابط قانونية' : 'Legal links'}>
              {[
                ['terms', lang === 'ar' ? 'الشروط' : 'Terms'],
                ['privacy', lang === 'ar' ? 'الخصوصية' : 'Privacy'],
                ['cookies', lang === 'ar' ? 'ملفات الارتباط' : 'Cookies'],
                ['acceptable-use', lang === 'ar' ? 'الاستخدام المقبول' : 'Acceptable use'],
                ['contact', lang === 'ar' ? 'التواصل' : 'Contact'],
              ].map(([page, label]) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => handleSetTab(`legal-${page}`, true)}
                  className="min-h-11 px-2 inline-flex items-center transition-colors hover:text-cyan-500"
                >
                  {label}
                </button>
              ))}
              <a href="https://jo-badawy.lovable.app/" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-cyan-500">{lang === 'ar' ? 'البورتفوليو' : 'Portfolio'}</a>
            </nav>
          </footer>
        </div>
      </div>

    </>
  );
}
