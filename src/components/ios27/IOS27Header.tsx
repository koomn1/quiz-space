import React, { useEffect, useState } from 'react';
import { Bell, Globe2, LogIn, Menu, Moon, Sun, UserRound, X } from 'lucide-react';
import { MainLogo } from '../MainLogo';
import { supabase } from '../../lib/supabaseClient';

export interface IOS27HeaderProps {
  currentTab: string;
  setTab: (tab: string) => void;
  toggleSidebar: () => void;
  isSidebarOpen?: boolean;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  userName: string;
  userId: string;
  photoURL?: string;
  onLogin: () => void;
  onLogout: () => void;
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
  isPremium?: boolean;
  isAdmin?: boolean;
}

export default function IOS27Header({
  setTab,
  toggleSidebar,
  isSidebarOpen = false,
  darkMode,
  setDarkMode,
  userName,
  userId,
  onLogin,
  setLang,
  lang,
}: IOS27HeaderProps) {
  const isAr = lang === 'ar';
  const isAuthenticated = Boolean(userId && !userId.startsWith('user-guest'));
  const accountName = userName || (isAr ? 'حسابي' : 'My account');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setUnreadCount(0);
      return;
    }
    let isMounted = true;
    const fetchCount = async () => {
      try {
        const { data, error } = await supabase.rpc('get_unread_notifications_count', { p_user_id: userId });
        if (!error && typeof data === 'number' && isMounted) setUnreadCount(data);
      } catch (error) {
        console.debug('Error fetching unread count:', error);
      }
    };
    void fetchCount();
    const channel = supabase.channel(`header-notif-count-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => void fetchCount()).subscribe();
    const handleUpdate = () => void fetchCount();
    window.addEventListener('quizspace-notifications-updated', handleUpdate);
    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
      window.removeEventListener('quizspace-notifications-updated', handleUpdate);
    };
  }, [userId, isAuthenticated]);

  const label = (ar: string, en: string) => (isAr ? ar : en);
  return (
    <header className="quizspace-app-header fixed inset-x-0 top-0 z-40 select-none" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="quizspace-header-shell mx-auto w-full max-w-[1440px] px-3 sm:px-5 lg:px-8">
        <div className="quizspace-header-bar flex min-h-14 items-center gap-2 rounded-2xl border px-2.5 py-2 sm:min-h-16 sm:px-3 lg:px-4">
          <button type="button" onClick={toggleSidebar} aria-expanded={isSidebarOpen} aria-controls="quizspace-primary-sidebar" aria-label={label(isSidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة', isSidebarOpen ? 'Close navigation' : 'Open navigation')} className="quizspace-header-icon shrink-0">
            {isSidebarOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
          <button type="button" onClick={() => setTab('landing')} aria-label={label('العودة للرئيسية', 'Go to home')} className="quizspace-header-logo min-w-0 flex-1 justify-start">
            <MainLogo size="sm" showText />
          </button>
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {isAuthenticated && <button type="button" onClick={() => setTab('notifications')} aria-label={label('فتح الإشعارات', 'Open notifications')} className="quizspace-header-icon relative"><Bell aria-hidden="true" />{unreadCount > 0 && <span className="quizspace-header-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}</button>}
            <button type="button" onClick={() => setDarkMode(!darkMode)} aria-label={label(darkMode ? 'الوضع الفاتح' : 'الوضع الداكن', darkMode ? 'Light mode' : 'Dark mode')} className="quizspace-header-icon">{darkMode ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</button>
            <button type="button" onClick={() => setLang(isAr ? 'en' : 'ar')} aria-label={label('التبديل للإنجليزية', 'Switch to Arabic')} className="quizspace-header-language"><Globe2 aria-hidden="true" /><span>{isAr ? 'EN' : 'ع'}</span></button>
            {isAuthenticated ? <button type="button" onClick={() => setTab('profile')} aria-label={label(`فتح ${accountName}`, `Open ${accountName}`)} className="quizspace-header-account"><UserRound aria-hidden="true" /><span className="hidden max-w-28 truncate md:inline">{accountName}</span></button> : <button type="button" onClick={onLogin} aria-label={label('التسجيل / الدخول', 'Register / Sign in')} className="quizspace-header-login"><LogIn aria-hidden="true" className="rtl:-scale-x-100" /><span className="whitespace-nowrap">{label('دخول', 'Sign in')}</span></button>}
          </div>
        </div>
      </div>
    </header>
  );
}
