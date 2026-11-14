import React from 'react';
import {
  Sun,
  Moon,
  Globe,
  User,
  LogIn,
  LogOut,
  Home,
  Plus,
  BookOpen,
  LayoutGrid,
  GraduationCap,
  Flame,
  Building2,
  CreditCard,
  ChevronDown,
  Bell,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { MainLogo } from '../MainLogo';
import { Button } from '../../ios27/components/Button';

export interface IOS27HeaderProps {
  currentTab: string;
  setTab: (tab: string) => void;
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
  currentTab,
  setTab,
  darkMode,
  setDarkMode,
  userName,
  userId,
  photoURL,
  onLogin,
  onLogout,
  lang,
  setLang,
  isPremium = false,
  isAdmin = false,
}: IOS27HeaderProps) {
  const isAr = lang === 'ar';
  const isAuthenticated = Boolean(userId && !userId.startsWith('user-guest'));
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = React.useState(false);

  const menuRef = React.useRef<HTMLDivElement>(null);
  const toolsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const desktopNavItems = [
    { id: 'landing', label: isAr ? 'الرئيسية' : 'Home', icon: Home },
    { id: 'aichat', label: isAr ? 'كوزمو AI' : 'Cosmo AI', icon: SparklesIcon },
    { id: 'create', label: isAr ? 'إنشاء اختبار' : 'Create', icon: Plus },
    { id: 'my-quizzes', label: isAr ? 'مكتبتي' : 'Library', icon: BookOpen },
  ];

  const toolsItems = [
    { id: 'classrooms', label: isAr ? 'الفصول الدراسية' : 'Classrooms', icon: GraduationCap },
    { id: 'motivation', label: isAr ? 'مركز التحفيز' : 'Motivation Hub', icon: Flame },
    { id: 'institution', label: isAr ? 'مساحة المؤسسة' : 'Institution Workspace', icon: Building2 },
    { id: 'billing', label: isAr ? 'باقات الاشتراك' : 'Subscription Plans', icon: CreditCard },
    { id: 'settings', label: isAr ? 'الإعدادات' : 'Settings', icon: Settings },
    { id: 'notifications', label: isAr ? 'الإشعارات' : 'Notifications', icon: Bell },
  ];
  if (isAdmin) {
    toolsItems.push({ id: 'admin', label: isAr ? 'لوحة الإدارة' : 'Admin Panel', icon: ShieldAlert });
  }

  function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-3.5 h-3.5"
        {...props}
      >
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>
    );
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 transition-all duration-300 pointer-events-auto select-none"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 8px))' }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="liquid-glass-large px-3.5 py-2 sm:px-5 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 border border-white/30 dark:border-white/10 shadow-lg backdrop-blur-xl rounded-2xl sm:rounded-full">
          {/* Official Platform Logo */}
          <div
            onClick={() => setTab('landing')}
            className="flex items-center gap-2 cursor-pointer shrink-0"
          >
            <MainLogo size="sm" showText={true} />
            {isPremium && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                PRO
              </span>
            )}
          </div>

          {/* Desktop Navigation Tabs: ONLY SHOWN IF AUTHENTICATED */}
          {isAuthenticated && (
            <nav className="hidden lg:flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/5 animate-in fade-in duration-200">
              {desktopNavItems.map((item) => {
                const isActive = currentTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-slate-800 text-sky-500 dark:text-sky-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'scale-110' : ''}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* Tools Dropdown */}
              <div className="relative" ref={toolsRef}>
                <button
                  type="button"
                  onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                    toolsItems.some((t) => t.id === currentTab)
                      ? 'bg-white dark:bg-slate-800 text-sky-500 dark:text-sky-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{isAr ? 'الأدوات' : 'Tools'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isToolsMenuOpen && (
                  <div
                    className={`absolute top-full mt-2 ${isAr ? 'left-0' : 'right-0'} w-52 rounded-2xl liquid-glass-large border border-white/30 dark:border-white/10 shadow-2xl p-1.5 z-50 text-right animate-in fade-in zoom-in-95 duration-150`}
                  >
                    {toolsItems.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => {
                            setTab(tool.id);
                            setIsToolsMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-500/10 hover:text-sky-500 dark:hover:text-sky-400 transition-colors cursor-pointer"
                        >
                          <Icon className="w-4 h-4 text-sky-500 shrink-0" />
                          <span>{tool.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          )}

          {/* Action Pills: Lang, Theme, User */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isAuthenticated && (
              <div className="hidden lg:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTab('notifications')}
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition-colors cursor-pointer ${currentTab === 'notifications' ? 'bg-sky-500/15 text-sky-500 dark:text-sky-300 border-sky-500/30' : 'text-slate-700 dark:text-slate-200 bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10'}`}
                  aria-label={isAr ? 'فتح الإشعارات' : 'Open notifications'}
                  title={isAr ? 'الإشعارات' : 'Notifications'}
                >
                  <Bell className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTab('settings')}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors cursor-pointer ${currentTab === 'settings' ? 'bg-sky-500/15 text-sky-500 dark:text-sky-300 border-sky-500/30' : 'text-slate-700 dark:text-slate-200 bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10'}`}
                  aria-label={isAr ? 'فتح الإعدادات' : 'Open settings'}
                  title={isAr ? 'الإعدادات' : 'Settings'}
                >
                  <Settings className="h-4 w-4" />
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setTab('admin')}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors cursor-pointer ${currentTab === 'admin' ? 'bg-rose-500/15 text-rose-500 dark:text-rose-300 border-rose-500/30' : 'text-slate-700 dark:text-slate-200 bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10'}`}
                    aria-label={isAr ? 'فتح لوحة الإدارة' : 'Open admin panel'}
                    title={isAr ? 'لوحة الإدارة' : 'Admin panel'}
                  >
                    <ShieldAlert className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => setLang(isAr ? 'en' : 'ar')}
              className="min-h-11 h-11 px-2 sm:px-2.5 rounded-full flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors border border-black/5 dark:border-white/10 cursor-pointer min-w-[44px] justify-center"
              title={isAr ? 'Switch to English' : 'التحويل للعربية'}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isAr ? 'EN' : 'عربي'}</span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="w-11 h-11 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors border border-black/5 dark:border-white/10 cursor-pointer"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Account Pill */}
            {isAuthenticated ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 p-1 sm:pr-3 sm:pl-1 rounded-full bg-sky-500/10 dark:bg-sky-400/15 border border-sky-500/20 text-slate-900 dark:text-white text-xs font-bold transition-all hover:scale-102 active:scale-98 cursor-pointer"
                >
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt={userName}
                      className="w-6 h-6 rounded-full object-cover border border-sky-400/30"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                      {userName ? userName.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                    </div>
                  )}
                  <span className="hidden sm:inline max-w-[80px] md:max-w-[100px] truncate">
                    {userName || (isAr ? 'حسابي' : 'Account')}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    className={`absolute top-full mt-2 ${isAr ? 'left-0' : 'right-0'} w-48 rounded-2xl liquid-glass-large border border-white/30 dark:border-white/10 shadow-2xl p-1.5 z-50 text-right animate-in fade-in zoom-in-95 duration-150`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setTab('profile');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-sky-500/10 hover:text-sky-500 dark:hover:text-sky-400 transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4 text-sky-500" />
                      <span>{isAr ? 'الملف الشخصي' : 'User Profile'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{isAr ? 'تسجيل الخروج' : 'Log Out'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="liquid-glass"
                size="small"
                onClick={onLogin}
                className="!min-h-11 !text-[11px] sm:!text-xs !py-1.5 !px-3 sm:!px-4 font-bold !rounded-full shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-500" />
                <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
