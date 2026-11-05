import React from 'react';
import { Home, Sparkles, Plus, BookOpen, LayoutGrid, X, GraduationCap, Building2, Flame, CreditCard, HelpCircle, ShieldAlert } from 'lucide-react';
import { Sheet } from '../../ios27/components/Sheet';

export interface IOS27FloatingTabBarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  lang: 'ar' | 'en';
  isAdmin?: boolean;
  isAuthenticated?: boolean;
}

export default function IOS27FloatingTabBar({
  currentTab,
  setTab,
  lang,
  isAdmin = false,
  isAuthenticated = false,
}: IOS27FloatingTabBarProps) {
  // Hide completely when user is not authenticated
  if (!isAuthenticated) return null;

  const isAr = lang === 'ar';
  const [isMoreSheetOpen, setIsMoreSheetOpen] = React.useState(false);

  const navItems = [
    {
      id: 'landing',
      label: isAr ? 'الرئيسية' : 'Home',
      icon: Home,
    },
    {
      id: 'aichat',
      label: isAr ? 'كوزمو AI' : 'Cosmo AI',
      icon: Sparkles,
      highlight: true,
    },
    {
      id: 'create',
      label: isAr ? 'ابتكار' : 'Create',
      icon: Plus,
      isAction: true,
    },
    {
      id: 'my-quizzes',
      label: isAr ? 'مكتبتي' : 'Library',
      icon: BookOpen,
    },
  ];

  const secondaryTools = [
    { id: 'classrooms', label: isAr ? 'الفصول الدراسية' : 'Classrooms', desc: isAr ? 'الواجبات والتحديات الطلابية' : 'Student assignments & live tests', icon: GraduationCap, color: 'text-blue-500 bg-blue-500/10' },
    { id: 'motivation', label: isAr ? 'مركز التحفيز' : 'Motivation Hub', desc: isAr ? 'الرتب والنقاط والمواسم' : 'XP, streaks, ranks & store', icon: Flame, color: 'text-amber-500 bg-amber-500/10' },
    { id: 'institution', label: isAr ? 'مساحة المؤسسة' : 'Institution Workspace', desc: isAr ? 'إدارة المدارس والجامعات' : 'Schools & Universities enterprise', icon: Building2, color: 'text-indigo-500 bg-indigo-500/10' },
    { id: 'billing', label: isAr ? 'باقات الاشتراك' : 'Subscription Plans', desc: isAr ? 'ترقية الحساب والوصول غير المحدود' : 'Upgrade to Pro & VIP', icon: CreditCard, color: 'text-emerald-500 bg-emerald-500/10' },
    { id: 'support', label: isAr ? 'الدعم والمساعدة' : 'Support', desc: isAr ? 'تواصل مع فريق الدعم الفني' : 'Technical help & FAQs', icon: HelpCircle, color: 'text-purple-500 bg-purple-500/10' },
  ];

  if (isAdmin) {
    secondaryTools.push({
      id: 'admin',
      label: isAr ? 'لوحة الإدارة' : 'Admin Panel',
      desc: isAr ? 'التحكم الإداري والمشتركون' : 'Site admin & payment requests',
      icon: ShieldAlert,
      color: 'text-rose-500 bg-rose-500/10',
    });
  }

  return (
    <>
      <nav
        aria-label={isAr ? 'شريط التنقل العائم' : 'Floating Tab Bar'}
        className="lg:hidden fixed left-1/2 -translate-x-1/2 z-40 transition-transform duration-300 pointer-events-auto select-none max-w-[calc(100vw-1.5rem)] animate-in fade-in slide-in-from-bottom-3 duration-200"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 16px))' }}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="liquid-glass-large px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full flex items-center gap-1 sm:gap-2 shadow-2xl border border-white/30 dark:border-white/10 backdrop-blur-2xl">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;

            if (item.isAction) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className="mx-1 px-3.5 sm:px-4 min-h-[44px] rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-violet-500/30 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden xs:inline">{item.label}</span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`relative px-2.5 sm:px-3.5 min-h-[44px] rounded-full flex flex-col xs:flex-row items-center justify-center gap-1 sm:gap-1.5 text-xs font-semibold transition-all duration-200 select-none cursor-pointer ${
                  isActive
                    ? 'text-violet-600 dark:text-violet-400 bg-violet-500/15 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] sm:text-xs">{item.label}</span>
              </button>
            );
          })}

          {/* More Sheet Trigger */}
          <button
            type="button"
            onClick={() => setIsMoreSheetOpen(true)}
            className="px-2.5 sm:px-3.5 min-h-[44px] rounded-full flex flex-col xs:flex-row items-center justify-center gap-1 sm:gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all select-none cursor-pointer"
            title={isAr ? 'المزيد من الأدوات' : 'More Tools'}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="text-[10px] sm:text-xs">{isAr ? 'المزيد' : 'More'}</span>
          </button>
        </div>
      </nav>

      {/* iOS 27 Sheet for Secondary Features on Mobile/Tablet */}
      <Sheet
        open={isMoreSheetOpen}
        onClose={() => setIsMoreSheetOpen(false)}
        detent="medium"
      >
        <div className="p-5 sm:p-6 text-right" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-display font-black text-lg text-slate-900 dark:text-white">
                {isAr ? 'أدوات QuizSpace' : 'QuizSpace Tools'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr ? 'استكشف الفصول والتحفيز والاشتراكات' : 'Classrooms, motivation & settings'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsMoreSheetOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {secondaryTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    setTab(tool.id);
                    setIsMoreSheetOpen(false);
                  }}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3.5 text-right transition-all hover:scale-101 active:scale-99 cursor-pointer group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tool.color} group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display font-bold text-xs text-slate-900 dark:text-white truncate">
                      {tool.label}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {tool.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Sheet>
    </>
  );
}
