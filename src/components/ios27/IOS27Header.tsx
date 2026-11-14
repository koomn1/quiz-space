import React from 'react';
import { Bell, LogIn } from 'lucide-react';
import CardNav from '../CardNav';
import { MainLogo } from '../MainLogo';

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
  onLogin,
  onLogout,
  lang,
  setLang,
  isPremium = false,
  isAdmin = false,
}: IOS27HeaderProps) {
  const isAr = lang === 'ar';
  const isAuthenticated = Boolean(userId && !userId.startsWith('user-guest'));
  const accountName = userName || (isAr ? 'حسابي' : 'My account');

  const items: any[] = [
    {
      label: isAr ? 'التنقل' : 'Navigate',
      description: isAr ? 'انتقل إلى أقسام QuizSpace الرئيسية.' : 'Jump to the main QuizSpace sections.',
      links: [
        { label: isAr ? 'الرئيسية' : 'Home', tab: 'landing' },
        { label: isAr ? 'كوزمو AI' : 'Cosmo AI', tab: 'aichat' },
        { label: isAr ? 'إنشاء اختبار' : 'Create a quiz', tab: 'create' },
        { label: isAr ? 'مكتبتي' : 'My quizzes', tab: 'my-quizzes' },
      ],
    },
    {
      label: isAr ? 'الأدوات والمساحات' : 'Tools & spaces',
      description: isAr ? 'الفصول، التحفيز، الاشتراكات والمساعدة.' : 'Classrooms, motivation, plans, and support.',
      links: [
        { label: isAr ? 'الفصول الدراسية' : 'Classrooms', tab: 'classrooms' },
        { label: isAr ? 'مركز التحفيز' : 'Motivation hub', tab: 'motivation' },
        { label: isAr ? 'مساحة المؤسسة' : 'Institution workspace', tab: 'institution' },
        { label: isAr ? 'باقات الاشتراك' : 'Subscription plans', tab: 'billing' },
        { label: isAr ? 'الدعم والمساعدة' : 'Support', tab: 'support' },
        ...(isAdmin ? [{ label: isAr ? 'لوحة الإدارة' : 'Admin panel', tab: 'admin' }] : []),
      ],
    },
    {
      label: isAr ? 'الحساب والتفضيلات' : 'Account & preferences',
      description: isAuthenticated
        ? `${accountName}${isPremium ? ' · PRO' : ''}`
        : (isAr ? 'تسجيل الدخول وإعدادات العرض واللغة.' : 'Sign in and manage display and language settings.'),
      links: [
        ...(isAuthenticated
          ? [
              { label: isAr ? 'الإشعارات' : 'Notifications', tab: 'notifications' },
              { label: isAr ? 'الملف الشخصي' : 'Profile', tab: 'profile' },
              { label: isAr ? 'الإعدادات' : 'Settings', tab: 'settings' },
            ]
          : [{ label: isAr ? 'تسجيل الدخول' : 'Sign in', action: 'login' as const }]),
        {
          label: isAr
            ? (darkMode ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن')
            : (darkMode ? 'Switch to light mode' : 'Switch to dark mode'),
          action: 'toggle-theme',
        },
        {
          label: isAr ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic',
          action: 'toggle-language',
        },
        ...(isAuthenticated ? [{ label: isAr ? 'تسجيل الخروج' : 'Sign out', action: 'logout' as const }] : []),
      ],
    },
  ];

  const cta = isAuthenticated
    ? {
        label: isAr ? 'الإشعارات' : 'Notifications',
        ariaLabel: isAr ? 'فتح الإشعارات' : 'Open notifications',
        icon: <Bell aria-hidden="true" />,
        onClick: () => setTab('notifications'),
      }
    : {
        label: isAr ? 'تسجيل الدخول' : 'Sign in',
        ariaLabel: isAr ? 'تسجيل الدخول' : 'Sign in',
        icon: <LogIn aria-hidden="true" />,
        onClick: onLogin,
      };

  const handleLinkClick = (link: any) => {
    if (link.action === 'toggle-language') {
      setLang(isAr ? 'en' : 'ar');
      return;
    }
    if (link.action === 'toggle-theme') {
      setDarkMode(!darkMode);
      return;
    }
    if (link.action === 'login') {
      onLogin();
      return;
    }
    if (link.action === 'logout') {
      onLogout();
      return;
    }
    if (link.tab) setTab(link.tab);
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 pointer-events-auto select-none"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 8px))' }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <CardNav
          logo={<MainLogo size="sm" showText={false} />}
          logoAlt="QuizSpace"
          logoHref="#"
          onLogoClick={() => setTab('landing')}
          items={items}
          cta={cta}
          theme={darkMode ? 'dark' : 'light'}
          surface="glass"
          openOn="click"
          cardEffect="rise"
          stagger={0.1}
          bounce={0.14}
          speed={1}
          cardHeight={136}
          maxWidth={1120}
          accentColor="#4f46e5"
          menuLabel
          menuText={isAr ? 'القائمة' : 'Menu'}
          closeText={isAr ? 'إغلاق' : 'Close'}
          menuOpenLabel={isAr ? 'فتح القائمة' : 'Open menu'}
          menuCloseLabel={isAr ? 'إغلاق القائمة' : 'Close menu'}
          intro
          activeTab={currentTab}
          ariaLabel={isAr ? 'التنقل الرئيسي' : 'Main navigation'}
          onLinkClick={(link: any) => handleLinkClick(link)}
        />
      </div>
    </header>
  );
}
