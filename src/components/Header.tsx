/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React from 'react';
import { Sparkles, Sun, Moon, Award, User, Layers, BookOpen, LogIn, LogOut, Globe, Menu, Coins } from 'lucide-react';
import { translations } from '../lib/i18n';
import { MainLogo } from './MainLogo';
import { AnimatedGlobeIcon } from './AnimatedGlobeIcon';
import { AnimatedMenuIcon } from './AnimatedMenuIcon';
import { AnimatedThemeIcon } from './AnimatedThemeIcon';
import HeaderMessages from './HeaderMessages';
import { UserBadge } from './UserBadge';
import { NotificationDropdown } from './NotificationDropdown';
import { getRewardsSummary } from '../lib/db';

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
  const [rewardPoints, setRewardPoints] = React.useState(0);
  const [rewardCoins, setRewardCoins] = React.useState(0);

  const refreshRewards = React.useCallback(async () => {
    if (!userId || userId.startsWith('user-')) {
      setRewardPoints(0);
      setRewardCoins(0);
      return;
    }
    const summary = await getRewardsSummary(userId);
    setRewardPoints(summary?.points || 0);
    setRewardCoins(summary?.coins || 0);
  }, [userId]);

  React.useEffect(() => {
    refreshRewards();
    const handleRewardsUpdated = () => refreshRewards();
    window.addEventListener('quizspace-rewards-updated', handleRewardsUpdated);
    return () => window.removeEventListener('quizspace-rewards-updated', handleRewardsUpdated);
  }, [refreshRewards]);

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

  const formatLargeNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
    }
    if (num >= 10000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toLocaleString();
  };

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
    <header className="fixed inset-x-0 top-0 z-50 w-full transition-all duration-300 pointer-events-none bg-white/95 px-0 pb-2 pt-0 backdrop-blur-xl dark:bg-[#020617]/95 sm:pb-3">
      <div className="w-full pointer-events-auto">
        <div 
          className="flex min-w-0 items-center justify-between h-14 sm:h-16 w-full flex-row gap-2 bg-white/90 dark:bg-slate-950/90 border-b border-slate-100 dark:border-slate-800/80 rounded-b-2xl px-3 sm:px-6 lg:px-10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)] transition-all duration-500"
          
          
          
        >
          
          {/* Logo & Headline */}
          <div className="flex items-center gap-2">
            {!isQuizLocked && (
              <button aria-label={lang === 'ar' ? 'فتح القائمة' : 'Open navigation'} className="flex h-11 w-11 items-center justify-center p-0 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200" onClick={toggleSidebar}>
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
	            <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 flex-shrink-0">
	              {!isGuest && (
	                <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 rounded-2xl border border-amber-200/60 bg-amber-50/40 px-2 py-1.5 dark:border-amber-900/30 dark:bg-amber-950/10 sm:px-3 sm:py-2 flex-shrink min-w-0" title={lang === 'ar' ? 'رصيد المكافآت' : 'Rewards balance'}>
		                  <div className="flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 sm:text-xs whitespace-nowrap">
		                  <Award className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
		                    <span className="tabular-nums">{formatLargeNumber(rewardPoints)}</span>
		                  </div>
		                  {rewardCoins > 0 && (
		                    <>
		                      <span className="h-3 w-px bg-amber-200/80 dark:bg-amber-800/80" />
		                      <div className="flex items-center gap-1 text-[10px] font-black text-sky-600 dark:text-sky-400 sm:text-xs whitespace-nowrap">
		                        <Coins className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
		                        <span className="tabular-nums">{formatLargeNumber(rewardCoins)}</span>
		                      </div>
		                    </>
		                  )}
	                </div>
	              )}

	              {!isGuest && (
	                <button
	                  type="button"
	                  onClick={() => setTab('profile')}
	                  className="hidden min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-right shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 sm:flex"
	                  aria-label={lang === 'ar' ? 'فتح الملف الشخصي' : 'Open profile'}
	                >
	                  {photoURL ? (
	                    <img src={photoURL} alt="" className="h-7 w-7 rounded-lg object-cover" />
	                  ) : (
	                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary"><User className="h-4 w-4" /></span>
	                  )}
	                  <span className="max-w-24 truncate text-xs font-black text-slate-700 dark:text-slate-100">{userName || (lang === 'ar' ? 'حسابي' : 'My account')}</span>
	                </button>
	              )}


	              {/* Authentication Triggers */}
              {isGuest ? (
                <button
                  onClick={onLogin}
                  className="flex h-11 w-11 items-center justify-center sm:w-auto sm:px-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-[10px] sm:text-xs transition-colors cursor-pointer shadow-sm shadow-primary/15"
                  title={lang === 'ar' ? 'التسجيل / الدخول' : 'Register / Login'}
                >
                  <LogIn className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline sm:ml-1 sm:mt-[1px] rtl:sm:mr-1 rtl:sm:ml-0">{lang === 'ar' ? 'التسجيل / الدخول' : 'Register / Login'}</span>
                </button>
              ) : (
                <button
                  onClick={onLogout}
                  className="flex h-11 w-11 items-center justify-center sm:w-auto sm:px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 hover:text-red-500 font-bold text-[10px] sm:text-xs transition-colors cursor-pointer border border-transparent hover:border-red-100 dark:hover:border-red-950/30"
                  title={t.logout}
                >
                  <LogOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline sm:ml-1 sm:mt-[1px] rtl:sm:mr-1 rtl:sm:ml-0">{t.logout}</span>
                </button>
              )}

              {/* Notification Dropdown */}
              {!isGuest && <NotificationDropdown userId={userId} lang={lang} />}



	               {/* Dark Mode Toggle Button - Redesigned to be fancier */}
	              <button
	                onClick={() => setDarkMode(!darkMode)}
		                className="group relative flex items-center justify-center w-11 h-11 rounded-[18px] bg-gradient-to-tr from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 hover:from-white hover:to-slate-50 dark:hover:from-slate-800 dark:hover:to-slate-700 border-2 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.3)] transition-all duration-300 cursor-pointer overflow-hidden active:scale-95"
	                title={t.toggleTheme}
	              >
	                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
	                <AnimatedThemeIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5 relative z-10 transition-transform duration-500 group-hover:rotate-12" darkMode={darkMode} />
	                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
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
