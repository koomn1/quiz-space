/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React from 'react';
import { Sparkles, Sun, Moon, Award, User, Layers, BookOpen, LogIn, LogOut, Globe, Menu } from 'lucide-react';
import { translations } from '../lib/i18n';
import { MainLogo } from './MainLogo';
import { AnimatedGlobeIcon } from './AnimatedGlobeIcon';
import { AnimatedMenuIcon } from './AnimatedMenuIcon';
import { AnimatedThemeIcon } from './AnimatedThemeIcon';
import HeaderMessages from './HeaderMessages';
import { UserBadge } from './UserBadge';

interface HeaderProps {
  currentTab: string;
  setTab: (tab: string) => void;
  toggleSidebar: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  colorTheme: string;
  setColorTheme: (theme: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  userId: string;
  photoURL?: string;
  onLogin: () => void;
  onLogout: () => void;
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
  isPremium?: boolean;
  isSidebarOpen?: boolean;
  isQuizLocked?: boolean;
}

export default function Header({
  currentTab,
  setTab,
  toggleSidebar,
  darkMode,
  setDarkMode,
  colorTheme,
  setColorTheme,
  userName,
  setUserName,
  userId,
  photoURL,
  onLogin,
  onLogout,
  lang,
  setLang,
  isPremium,
  isSidebarOpen = false,
  isQuizLocked = false
}: HeaderProps) {
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [tempName, setTempName] = React.useState(userName);
  const [isThemeOpen, setIsThemeOpen] = React.useState(false);

  const [userLevel, setUserLevel] = React.useState(() => {
    return Number(localStorage.getItem('quiz_user_level') || '4');
  });

  React.useEffect(() => {
    const handleUpdate = () => {
      setUserLevel(Number(localStorage.getItem('quiz_user_level') || '4'));
    };
    window.addEventListener('storage', handleUpdate);
    const interval = setInterval(handleUpdate, 2000);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const t = translations[lang];

  const themes = [
    { id: 'indigo', name: t.themeIndigo, emoji: '🌌', color: 'from-indigo-500 to-purple-600' },
    { id: 'emerald', name: t.themeEmerald, emoji: '🌿', color: 'from-teal-500 to-emerald-600' },
    { id: 'sunset', name: t.themeSunset, emoji: '🌅', color: 'from-rose-500 to-orange-500' },
    { id: 'sky', name: t.themeSky, emoji: '💙', color: 'from-sky-500 to-cyan-500' },
    { id: 'honey', name: t.themeHoney, emoji: '🍯', color: 'from-amber-500 to-yellow-500' }
  ];

  const saveName = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      localStorage.setItem('quiz_userName', tempName.trim());
    }
    setIsEditingName(false);
  };

  const isGuest = !userId || userId.startsWith('user-');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 pointer-events-none px-2 sm:px-4 py-2 sm:py-3 bg-transparent/0">
      <div className="max-w-5xl mx-auto pointer-events-auto">
        <div 
          className="flex items-center justify-between h-14 sm:h-16 w-full flex-row gap-2 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md saturate-150 border border-slate-100 dark:border-slate-800/80 rounded-2xl px-4 sm:px-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)] transition-all duration-500"
          
          
          
        >
          
          {/* Logo & Headline */}
          <div className="flex items-center gap-2">
            {!isQuizLocked && (
              <button className="p-2 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200" onClick={toggleSidebar}>
                <AnimatedMenuIcon className="w-5 h-5 sm:w-6 sm:h-6" isOpen={isSidebarOpen} />
              </button>
            )}
            <div 
              className={`flex items-center gap-1.5 sm:gap-3 select-none transition-all duration-300 ${isQuizLocked ? 'cursor-default pointer-events-none' : 'cursor-pointer group'}`} 
              onClick={() => {
                if (!isQuizLocked) {
                  setTab('landing');
                }
              }}
            >
              <MainLogo size="sm" />
            </div>
          </div>

          {/* User Profile Info, Theme Select & Dark Mode */}
          {!isQuizLocked ? (
            <div className="flex items-center gap-1 sm:gap-2.5">
              {/* Real-time Interactive Communication Message Dropdown widget */}
              {!isGuest && (
                <HeaderMessages 
                  userId={userId} 
                  userName={userName} 
                  lang={lang} 
                />
              )}

              {/* Authentication Triggers */}
              {isGuest ? (
                <button
                  onClick={onLogin}
                  className="flex items-center justify-center sm:px-3 w-8 sm:w-auto h-8 sm:h-10 rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-[10px] sm:text-xs transition-colors cursor-pointer shadow-sm shadow-primary/15"
                  title={lang === 'ar' ? 'التسجيل / الدخول' : 'Register / Login'}
                >
                  <LogIn className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline sm:ml-1 sm:mt-[1px] rtl:sm:mr-1 rtl:sm:ml-0">{lang === 'ar' ? 'التسجيل / الدخول' : 'Register / Login'}</span>
                </button>
              ) : (
                <button
                  onClick={onLogout}
                  className="flex items-center justify-center sm:px-3 w-8 sm:w-auto h-8 sm:h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 hover:text-red-500 font-bold text-[10px] sm:text-xs transition-colors cursor-pointer border border-transparent hover:border-red-100 dark:hover:border-red-950/30"
                  title={t.logout}
                >
                  <LogOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline sm:ml-1 sm:mt-[1px] rtl:sm:mr-1 rtl:sm:ml-0">{t.logout}</span>
                </button>
              )}

              {/* Language Switch Button */}
              <button
                onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 w-8 sm:w-auto h-8 sm:h-10 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 font-extrabold text-xs transition-all duration-200 shadow-sm cursor-pointer hover:scale-105 select-none shrink-0"
                title={lang === 'ar' ? 'English' : 'العربية'}
              >
                <AnimatedGlobeIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-primary" />
                <span className="hidden sm:inline text-[10px] uppercase font-mono tracking-wider">{lang === 'ar' ? 'English' : 'العربية'}</span>
                <span className="inline sm:hidden text-[9px] uppercase font-mono tracking-wider">{lang === 'ar' ? 'EN' : 'ع'}</span>
              </button>

               {/* Dark Mode Toggle Button */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 cursor-pointer hover:scale-105"
                title={t.toggleTheme}
              >
                <AnimatedThemeIcon className="w-4 h-4" darkMode={darkMode} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono font-bold tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-2xl animate-pulse">
              <span>⚠️ SECURE EVALUATION ENVIRONMENT</span>
            </div>
          )}

        </div>
      </div>
    </header>
  );
}
