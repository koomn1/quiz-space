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
        <div className="liquid-glass-large px-3 py-2 rounded-full flex items-center justify-between gap-1 sm:gap-2 shadow-2xl border border-white/20 dark:border-white/10 backdrop-blur-2xl bg-white/70 dark:bg-slate-950/80">
          
          {/* 1. Home Tab */}
          <button
            type="button"
            onClick={() => setTab('landing')}
            className={`flex-1 min-w-[52px] sm:min-w-[64px] min-h-[46px] rounded-full flex flex-col items-center justify-center gap-1 text-xs transition-all duration-200 cursor-pointer ${
              currentTab === 'landing'
                ? 'text-sky-500 dark:text-sky-400 bg-sky-500/15 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Home className={`w-4 h-4 ${currentTab === 'landing' ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] leading-none">{isAr ? 'الرئيسية' : 'Home'}</span>
          </button>

          {/* 2. Cosmo AI Tab */}
          <button
            type="button"
            onClick={() => setTab('aichat')}
            className={`flex-1 min-w-[52px] sm:min-w-[64px] min-h-[46px] rounded-full flex flex-col items-center justify-center gap-1 text-xs transition-all duration-200 cursor-pointer ${
              currentTab === 'aichat'
                ? 'text-cyan-500 dark:text-cyan-300 bg-cyan-500/15 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className={`w-4 h-4 text-cyan-400 ${currentTab === 'aichat' ? 'scale-110 animate-spin' : ''} transition-transform`} />
            <span className="text-[10px] leading-none">{isAr ? 'كوزمو AI' : 'Cosmo'}</span>
          </button>

          {/* 3. CENTER ACTION: Iconic Floating Plus Button (FAB) — Never squished! */}
          <div className="px-1 shrink-0 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setTab('create')}
              className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center -translate-y-2 bg-gradient-to-tr from-sky-500 via-indigo-600 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white shadow-lg shadow-sky-500/30 ring-3 ring-white/30 dark:ring-slate-900/60 active:scale-90 transition-all duration-200 cursor-pointer"
              title={isAr ? 'إنشاء اختبار جديد' : 'Create Quiz'}
              aria-label={isAr ? 'إنشاء اختبار جديد' : 'Create Quiz'}
            >
              <Plus className="w-6 h-6 text-white stroke-[2.8]" />
            </button>
          </div>

          {/* 4. Library / My Quizzes Tab */}
          <button
            type="button"
            onClick={() => setTab('my-quizzes')}
            className={`flex-1 min-w-[52px] sm:min-w-[64px] min-h-[46px] rounded-full flex flex-col items-center justify-center gap-1 text-xs transition-all duration-200 cursor-pointer ${
              currentTab === 'my-quizzes'
                ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/15 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className={`w-4 h-4 ${currentTab === 'my-quizzes' ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] leading-none">{isAr ? 'مكتبتي' : 'Library'}</span>
          </button>

          {/* 5. More Sheet Trigger */}
          <button
            type="button"
            onClick={() => setIsMoreSheetOpen(true)}
            className="flex-1 min-w-[52px] sm:min-w-[64px] min-h-[46px] rounded-full flex flex-col items-center justify-center gap-1 text-xs transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            title={isAr ? 'المزيد من الأدوات' : 'More Tools'}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="text-[10px] leading-none">{isAr ? 'المزيد' : 'More'}</span>
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
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
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
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-right cursor-pointer border border-black/5 dark:border-white/5"
                >
                  <div className={`p-2.5 rounded-xl ${tool.color} shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">
                      {tool.label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
