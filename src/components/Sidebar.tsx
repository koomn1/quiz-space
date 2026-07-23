import React from 'react';
import { 
  Crown, Gem, Bot, Medal, Home, Compass, Sparkles, BookOpen, 
  Users, CreditCard, Settings, LogOut, ShieldAlert, User, Check, GraduationCap, MessageCircle 
} from 'lucide-react';
import { translations } from '../lib/i18n';
import { AnimatedSidebarIcon } from './AnimatedSidebarIcon';
import { UserBadge } from './UserBadge';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  lang: 'ar' | 'en';
  onLogout: () => void;
  userName: string;
  unreadMessagesCount?: number;
  isPremium?: boolean;
  planName?: string;
  userEmail?: string | null;
  photoUrl?: string | null;
  avatar_url?: string | null;
}

export default function Sidebar({ 
  currentTab, 
  setTab, 
  lang, 
  onLogout, 
  userName, 
  unreadMessagesCount = 0,
  isPremium = false,
  planName = '',
  userEmail = null,
  photoUrl = null,
  avatar_url = null
}: SidebarProps) {
  const t = translations[lang] as any;
  const isAr = lang === 'ar';

  // Robustly determine active tier from plan name or premium flag
  const planClean = (planName || '').toLowerCase();
  let activePlanId: 'free' | 'silver' | 'gold' | 'diamond' = 'free';
  if (isPremium) {
    if (planClean.includes('diamond') || planClean.includes('الماسية') || planClean.includes('ماسية') || planClean.includes('مؤسسات') || planClean.includes('المدرسة')) {
      activePlanId = 'diamond';
    } else if (planClean.includes('gold') || planClean.includes('الذهبية') || planClean.includes('ذهبية') || planClean.includes('معلم')) {
      activePlanId = 'gold';
    } else {
      activePlanId = 'silver';
    }
  }

  const menuItems: Array<{ id: string; label: string; isPremiumOnly?: boolean; showBadge?: string | number; isLink?: boolean; href?: string }> = [
    { id: 'landing', label: isAr ? 'الرئيسية' : 'Home' },
    { id: 'explore', label: isAr ? 'استكشاف' : 'Explore' },
    { id: 'create', label: isAr ? 'إنشاء اختبار' : 'Create Quiz' },
    { id: 'my-quizzes', label: isAr ? 'اختباراتي' : 'My Quizzes' },
    { id: 'classrooms', label: isAr ? 'الفصول الدراسية' : 'Classrooms' },
    ...(activePlanId !== 'free' 
      ? [{ id: 'cosmobot', label: isAr ? 'المساعد كوزمو' : 'Cosmo Assistant', isPremiumOnly: true }] 
      : [{ id: 'support', label: isAr ? 'الدعم الفني' : 'Support', isLink: true, href: 'https://wa.me/201018995002' }]),
    { id: 'community', label: isAr ? 'المجتمع' : 'Community' },
    { id: 'billing', label: isAr ? 'باقات الاشتراك' : 'Subscription Plans' },
    { id: 'settings', label: isAr ? 'الإعدادات' : 'Settings' }
  ];

  if (userEmail === 'adman777888999@gmail.com') {
    menuItems.push({ id: 'admin', label: isAr ? 'لوحة الإدارة' : 'Admin Panel' });
  }

  const isGuest = !userEmail;

  // Minimalist Line-Art Icon Mapper
  const getNavIcon = (id: string, isActive: boolean) => {
    const size = 18;
    const colorClass = isActive 
      ? 'text-[#b175ff] drop-shadow-[0_0_6px_rgba(177,117,255,0.8)]' 
      : 'text-slate-400 group-hover:text-[#b175ff] transition-colors duration-200';

    switch (id) {
      case 'landing':
        return <Home size={size} className={colorClass} />;
      case 'explore':
        return <Compass size={size} className={colorClass} />;
      case 'create':
        return <Sparkles size={size} className={colorClass} />;
      case 'my-quizzes':
        return <BookOpen size={size} className={colorClass} />;
      case 'classrooms':
        return <GraduationCap size={size} className={colorClass} />;
      case 'cosmobot':
        return <Bot size={size} className={colorClass} />;
      case 'support':
        return <MessageCircle size={size} className={colorClass} />;
      case 'community':
        return <Users size={size} className={colorClass} />;
      case 'billing':
        return <CreditCard size={size} className={colorClass} />;
      case 'settings':
        return <Settings size={size} className={colorClass} />;
      case 'admin':
        return <ShieldAlert size={size} className={colorClass} />;
      case 'profile':
        return <User size={size} className={colorClass} />;
      default:
        return <Home size={size} className={colorClass} />;
    }
  };

  return (
    <aside className="w-full h-full bg-[#0a0518]/95 backdrop-blur-3xl border-none text-slate-200 p-3 sm:p-4 flex flex-col justify-between overflow-y-auto overscroll-contain z-50 scrollbar-none max-h-[100dvh]">
      {/* Premium Custom SVG Logo */}
      <div className="flex items-center gap-2 justify-start select-none py-1 mb-1 shrink-0" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
        <div 
          
          
          className="relative w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center shrink-0"
        >
          <svg className="w-full h-full overflow-visible" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Background ambient glow */}
            <circle cx="18" cy="18" r="14" fill="rgba(155, 81, 224, 0.15)" className="blur-md" />
            
            {/* Neon Galaxy Rings */}
            <ellipse cx="18" cy="18" rx="16" ry="5" transform="rotate(-20, 18, 18)" stroke="#9b51e0" strokeWidth="2" fill="none" className="opacity-80" />
            <ellipse cx="18" cy="18" rx="12" ry="3.5" transform="rotate(25, 18, 18)" stroke="#ec4899" strokeWidth="1.5" fill="none" className="opacity-70" />
            
            {/* Magnifying Glass Frame (integrated with the galaxy core) */}
            <circle cx="18" cy="18" r="8" stroke="#ffffff" strokeWidth="2" fill="rgba(15, 23, 42, 0.4)" className="backdrop-blur-sm" />
            
            {/* Magnifying Glass Handle */}
            <line x1="23.6" y1="23.6" x2="34" y2="34" stroke="#b175ff" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="25.5" y1="25.5" x2="32" y2="32" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
 
            {/* Neon pulsating galaxy center (glowing core) */}
            <circle cx="18" cy="18" r="4" fill="#d8b4fe" style={{ filter: 'drop-shadow(0 0 6px #a855f7)' }} />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-display font-black text-sm sm:text-base tracking-tight leading-none bg-gradient-to-r from-white via-indigo-200 to-[#b175ff] bg-clip-text text-transparent">
            QuizSpace
          </span>
          <span className="text-[8px] sm:text-[9px] font-black text-[#b175ff] tracking-widest mt-0.5 uppercase leading-none">
            {isAr ? 'الذكاء الاصطناعي السحابي' : 'COSMIC AI PLATFORM'}
          </span>
        </div>
      </div>
 
      {/* User profile card with purple border ring and hover glow */}
      <div className="mt-1 mb-1.5 shrink-0" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
        {isGuest ? (
          <div className="p-2 sm:p-3 rounded-2xl bg-slate-900/40 border border-[#3d1d6d]/30 backdrop-blur-md">
            <div className="flex items-center gap-2 text-[11px] font-black text-slate-300">
              <span className="text-xs">☄️</span>
              <span>{isAr ? 'مرحباً بك كطالب زائر!' : 'Welcome Guest!'}</span>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setTab('profile')} 
            className="w-full p-2 sm:p-2.5 rounded-2xl bg-slate-900/50 hover:bg-[#130b2b]/60 border-2 border-[#b175ff]/20 hover:border-[#b175ff]/60 hover:shadow-[0_0_20px_rgba(177,117,255,0.25)] transition-all duration-300 cursor-pointer text-right relative overflow-hidden group" 
            style={{ textAlign: isAr ? 'right' : 'left' }}
          >
            <div className="flex items-center gap-2.5 w-full">
              {/* Glowing ring container around avatar */}
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#9b51e0] to-[#b175ff] p-[2px] shrink-0 shadow-md ring-2 ring-offset-2 ring-offset-[#130b2b] ring-[#9b51e0] group-hover:ring-[#b175ff] group-hover:scale-105 transition-all duration-300 animate-[pulse_3s_infinite]">
                <div className="w-full h-full rounded-full bg-[#0a0518] flex items-center justify-center overflow-hidden">
                  {(photoUrl || avatar_url) ? (
                    <img 
                      src={photoUrl || avatar_url || undefined} 
                      alt={userName} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[#b175ff] font-black text-sm">{userName?.charAt(0)?.toUpperCase()}</span>
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="text-[11px] sm:text-xs font-black text-white truncate w-full flex items-center gap-1.5">
                  <span className="truncate">{userName}</span>
                  <UserBadge 
                    tier={
                      activePlanId === 'diamond' ? 'enterprise' :
                      activePlanId === 'gold' ? 'premium' :
                      activePlanId === 'silver' ? 'pro' : 
                      'free'
                    } 
                    size="sm" 
                    showTooltip={false} 
                  />
                </div>
                <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold truncate mt-0.5">
                  {isAr ? 'عرض الملف الشخصي' : 'View Profile'}
                </p>
              </div>
            </div>
          </button>
        )}
      </div>
 
      {/* Navigation items with micro-animations & layoutId glassmorphism active pill */}
      <nav className="flex-1 space-y-0.5 py-1 pr-0.5 overflow-y-auto scrollbar-none">
        {menuItems.map((item) => {
          const isActive = currentTab === item.id;
          const isLocked = item.isPremiumOnly && activePlanId === 'free';
          
          if (item.isLink) {
            return (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center justify-between px-3 py-1.5 sm:py-2 rounded-xl transition-all cursor-pointer text-[11px] sm:text-xs relative group shrink-0 ${
                  isActive 
                    ? 'text-white font-extrabold' 
                    : 'hover:text-white text-slate-400 font-bold'
                }`}
                style={{ direction: isAr ? 'rtl' : 'ltr' }}
              >
                <div className="flex items-center gap-3 min-w-0 z-10">
                <AnimatedSidebarIcon isActive={isActive}>
                  {getNavIcon(item.id, isActive)}
                </AnimatedSidebarIcon>
                  <span className="truncate">{item.label}</span>
                </div>
              </a>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isLocked) {
                  alert(isAr ? 'المساعد كوزمو متاح فقط للباقات الفضية فأعلى. يرجى الترقية.' : 'Cosmo Assistant is only available for Silver plans and above. Please upgrade.');
                  setTab('billing');
                } else {
                  setTab(item.id);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 sm:py-2 rounded-xl transition-all cursor-pointer text-[11px] sm:text-xs relative group shrink-0 ${
                isActive 
                  ? 'text-white font-extrabold' 
                  : 'hover:text-white text-slate-400 font-bold'
              } ${isLocked ? 'opacity-80' : ''}`}
              style={{ direction: isAr ? 'rtl' : 'ltr' }}
            >
              {isActive && (
                <div
                  
                  className="absolute inset-0 bg-[#b175ff]/15 border border-[#b175ff]/35 shadow-lg shadow-[#b175ff]/5 rounded-xl -z-10"
                  
                />
              )}
              <div className="flex items-center gap-3 min-w-0 z-10">
                <AnimatedSidebarIcon isActive={isActive}>
                  {getNavIcon(item.id, isActive)}
                </AnimatedSidebarIcon>
                <span className="truncate">{item.label}</span>
                {isLocked && (
                  <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-md ml-2 ml-auto" style={{ marginRight: isAr ? 'auto' : 0, marginLeft: isAr ? 0 : 'auto' }}>
                    {isAr ? 'برو' : 'PRO'}
                  </span>
                )}
              </div>
              {item.showBadge !== undefined && (
                <span className="inline-flex items-center justify-center bg-red-500 text-white font-black text-[9px] w-4.5 h-4.5 rounded-full animate-bounce px-1 py-1 leading-none shrink-0 border border-white dark:border-[#090d16] shadow-md z-10">
                  {item.showBadge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer options - Pinned at the bottom */}
      <div className="border-t border-[#3d1d6d]/30 pt-2 mt-auto space-y-1 shrink-0">
        {!isGuest && (
          <button 
            onClick={onLogout} 
            className="w-full flex items-center gap-3 px-3 py-1.5 text-xs font-bold rounded-xl hover:bg-red-950/20 text-red-400 cursor-pointer group shrink-0"
            style={{ direction: isAr ? 'rtl' : 'ltr' }}
          >
            <LogOut size={14} className="text-red-400 group-hover:translate-x-[-2px] transition-transform duration-200" />
            <span>{t.tabLogout || (isAr ? 'تسجيل الخروج' : 'Logout')}</span>
          </button>
        )}
        
        {/* Dynamic Interactive Upgrade block based on user active subscription level */}
        {(() => {
          if (activePlanId === 'diamond') {
            return (
              <div className="bg-gradient-to-br from-[#9b51e0]/10 via-[#ec4899]/5 to-transparent border border-[#9b51e0]/30 p-2 rounded-2xl text-center space-y-0.5 relative overflow-hidden select-none shadow-md shrink-0">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#b175ff]/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex justify-center gap-1.5 text-lg text-amber-500 animate-pulse mb-0.5">
                  <Gem className="w-4 h-4 text-indigo-400" />
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-amber-400 font-extrabold text-[10px]">
                    {isAr ? 'الباقة الماسية الفاخرة (القصوى)' : 'Diamond Elite VIP Member'}
                  </p>
                  <p className="text-[9px] text-slate-400 leading-normal font-bold hidden sm:block mt-0.5">
                    {isAr ? 'نشكرك على ثقتك الغالية وشراكتك في نجاح Quiz Space! ❤️' : 'Thank you for your support and partnership! ❤️'}
                  </p>
                </div>
              </div>
            );
          } else if (activePlanId === 'gold') {
            return (
              <div className="bg-gradient-to-br from-[#130b2b]/60 via-[#1b0e3c]/40 to-slate-900 border border-[#b175ff]/15 p-2 rounded-2xl text-center space-y-1 relative overflow-hidden select-none shadow-xs shrink-0">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#b175ff]/10 rounded-full blur-xl pointer-events-none" />
                <Crown className="w-4 h-4 mx-auto text-amber-400 animate-pulse" />
                <div>
                  <p className="text-white font-black text-[10px] sm:text-xs">
                    {isAr ? 'أنت في الباقة الذهبية' : 'Active: Educator Gold'}
                  </p>
                  <p className="text-[9px] text-slate-400 leading-normal font-medium hidden sm:block mt-0.5">
                    {isAr ? 'اصعد بصلاحياتك لتشمل تصدير excel للمدارس.' : 'Upgrade your tier to export class scores to Excel.'}
                  </p>
                </div>
                <button 
                  onClick={() => setTab('billing')}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[9px] font-black py-1 px-2 rounded-xl w-full hover:scale-102 transition-transform cursor-pointer shadow-md shadow-amber-500/10"
                >
                  {isAr ? 'ترقية للباقة الماسية' : 'Upgrade to Diamond'}
                  <Gem className="inline w-2 h-2 ml-1" />
                </button>
              </div>
            );
          } else if (activePlanId === 'silver') {
            return (
              <div className="bg-gradient-to-br from-[#130b2b]/60 via-[#1b0e3c]/40 to-slate-900 border border-[#b175ff]/15 p-2 rounded-2xl text-center space-y-1 relative overflow-hidden select-none shadow-xs shrink-0">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#b175ff]/10 rounded-full blur-xl pointer-events-none" />
                <Medal className="w-4 h-4 mx-auto text-slate-400 animate-pulse" />
                <div>
                  <p className="text-white font-black text-[10px] sm:text-xs">
                    {isAr ? 'أنت في الباقة الفضية' : 'Active: Student Silver'}
                  </p>
                  <p className="text-[9px] text-slate-400 leading-normal font-medium hidden sm:block mt-0.5">
                    {isAr ? 'احصل على ميزات طباعة تقارير الإجابات PDF.' : 'Unlock downloading professional PDF analysis.'}
                  </p>
                </div>
                <button 
                  onClick={() => setTab('billing')}
                  className="bg-primary hover:bg-primary-hover text-white text-[9px] font-black py-1 px-2 rounded-xl w-full hover:scale-102 transition-transform cursor-pointer shadow-md"
                >
                  {isAr ? 'ترقية للباقة الذهبية' : 'Upgrade to Gold'}
                  <Crown className="w-2 h-2 inline ml-1" />
                </button>
              </div>
            );
          } else {
            // Free / Guest tier
            return (
              <div className="bg-gradient-to-br from-[#130b2b]/60 via-[#1b0e3c]/40 to-slate-900 border border-[#b175ff]/15 p-2 rounded-2xl text-center space-y-1 relative overflow-hidden select-none shadow-xs shrink-0">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-xl pointer-events-none" />
                <Crown className="w-4 h-4 mx-auto text-[#b175ff] animate-pulse" />
                <div>
                  <p className="text-white font-black text-[10px] sm:text-xs">
                    {isAr ? 'الترقية للميزات الكبرى ✨' : 'Unlock Educator Pro ✨'}
                  </p>
                  <p className="text-[9px] text-slate-400 leading-normal hidden sm:block mt-0.5">
                    {isAr ? 'توليد غير محدود بالذكاء الاصطناعي وبدون إعلانات.' : 'Uncaps Gemini AI creation features forever.'}
                  </p>
                </div>
                <button 
                  onClick={() => setTab('billing')}
                  className="bg-primary hover:bg-primary-hover text-white text-[9px] font-black py-1.5 px-2 rounded-xl w-full hover:scale-102 transition-transform cursor-pointer shadow-md"
                >
                  {isAr ? 'ترقية وتفعيل الآن ✨' : 'Unlock Now ✨'}
                </button>
              </div>
            );
          }
        })()}
      </div>
    </aside>
  );
}
