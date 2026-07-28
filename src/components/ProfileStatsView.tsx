import React from 'react';
import { 
  BadgeCheck, Layers, Clipboard, CheckCircle, Calendar, Play, BookOpen, 
  Star, RefreshCw, UserCheck, ShieldAlert, Sparkles, UploadCloud, 
  Check, X, Shield, Lock, CreditCard, ThumbsUp, ThumbsDown, Share2, 
  MapPin, Mail, Languages, Crown, Globe, Twitter, Instagram, Link as LinkIcon, Trophy,
  Flame, Clock, User, Pencil, Save, Copy
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip 
} from 'recharts';
import { Quiz, QuizCompletion, UserStats } from '../types';
import { saveUserProfile } from '../lib/db';
import { UserBadge } from './UserBadge';
import { ReputationBadge } from './ReputationBadge';

interface ProfileStatsViewProps {
  profileData: UserStats | null;
  completions: QuizCompletion[];
  creations: Quiz[];
  isOwnProfile: boolean;
  isUserPremium: boolean;
  isEditingName: boolean;
  setIsEditingName: (val: boolean) => void;
  newName: string;
  setNewName: (val: string) => void;
  handleUpdateNameSubmit: (e: React.FormEvent) => void;
  handleCopyProfileLink: () => void;
  copiedProfileId: boolean;
  activePrimaryColor: string;
  lang: 'ar' | 'en';
  onStartQuiz: (quizId: string) => void;
  onShareQuiz: (quizId: string, quizTitle: string, quizDescription?: string) => void;
  handleAvatarClick: () => void;
  isUploadingPhoto: boolean;
  onRefresh?: () => void;
}

export function TelegramBadge({ className = "w-5 h-5", colorClass = "text-sky-400" }: { className?: string; colorClass?: string }) {
  return (
    <svg 
      className={`${className} ${colorClass} fill-current shrink-0 select-none inline-block align-middle`} 
      viewBox="0 0 24 24"
      style={{ filter: "drop-shadow(0 1.5px 3px rgba(56, 189, 248, 0.45))" }}
    >
      <path d="M12 2a1 1 0 0 1 .7.3l1.1 1.1a1 1 0 0 0 .7.3l1.6-.2a1 1 0 0 1 1 1l-.2 1.6a1 1 0 0 0 .3.7l1.1 1.1a1 1 0 0 1 0 1.4l-1.1 1.1a1 1 0 0 0-.3.7l.2 1.6a1 1 0 0 1-1 1l-1.6-.2a1 1 0 0 0-.7.3l-1.1 1.1a1 1 0 0 1-1.4 0l-1.1-1.1a1 1 0 0 0-.7-.3l-1.6.2a1 1 0 0 1-1-1l.2-1.6a1 1 0 0 0-.3-.7L2.3 12.7a1 1 0 0 1 0-1.4l1.1-1.1a1 1 0 0 0 .3-.7l-.2-1.6a1 1 0 0 1 1-1l1.6.2a1 1 0 0 0 .7-.3L11.3 2.3A1 1 0 0 1 12 2zm3.3 8.3a1 1 0 0 0-1.4-1.4L11 11.8l-1.3-1.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l3.6-3.6z" />
    </svg>
  );
}

const getBadgesForPlan = (planId: string | undefined, isPremium: boolean): { icon: string; nameAr: string; nameEn: string; color: string }[] => {
  const freeBadges = [
    { icon: '✔', nameAr: 'توثيق شارة تليجرام', nameEn: 'Telegram Star Badge', color: 'text-sky-400 bg-sky-500/10' },
    { icon: '🛡️', nameAr: 'درع العلم البرونزي', nameEn: 'Savant Shield', color: 'bg-zinc-700 shadow-zinc-700/20' }
  ];

  const silverBadges = [
    { icon: '✔', nameAr: 'علامة تحقق فضية تليجرام', nameEn: 'Silver Checked Star', color: 'text-sky-400 bg-sky-500/10' },
    { icon: '🛡️', nameAr: 'درع الفضاء الفضي', nameEn: 'Silver Cosmic Shield', color: 'bg-indigo-600 shadow-indigo-600/20' },
    { icon: '⭐', nameAr: 'نجمة الطالب الفضي', nameEn: 'Student Star', color: 'bg-cyan-500 shadow-cyan-500/20' },
    ...freeBadges
  ];

  const goldBadges = [
    { icon: '👑', nameAr: 'تاج الفضاء الذهبي', nameEn: 'Cosmo Crown', color: 'bg-amber-500 shadow-amber-500/20' },
    { icon: '🏅', nameAr: 'ميدالية التفوق الذهبية', nameEn: 'Excellence Medal', color: 'bg-yellow-500 shadow-yellow-500/20' },
    { icon: '🔥', nameAr: 'لهيب المعرفة المشتعل', nameEn: 'Fierce Scholar', color: 'bg-orange-500 shadow-orange-500/20' },
    { icon: '🌟', nameAr: 'النجم الساطع الذهبي', nameEn: 'Radiant Stella', color: 'bg-amber-600 shadow-amber-600/20' },
    ...silverBadges
  ];

  const diamondBadges = [
    { icon: '💎', nameAr: 'الماس الكوني الثمين', nameEn: 'Cosmic Diamond', color: 'bg-pink-500 shadow-pink-500/20' },
    { icon: '🪐', nameAr: 'حكيم الكواكب والمدارات', nameEn: 'Planet Master', color: 'bg-violet-600 shadow-violet-600/20' },
    { icon: '✨', nameAr: 'شرارة السديم المضيئة', nameEn: 'Nebula Sparkle', color: 'bg-emerald-500 shadow-emerald-500/20' },
    { icon: '⚡', nameAr: 'صاعقة البرق الفضائية', nameEn: 'Superbolt', color: 'bg-purple-600 shadow-purple-600/20' },
    ...goldBadges
  ];

  const pId = (planId || '').toLowerCase();
  if (pId.includes('diamond') || pId.includes('ماس')) {
    return diamondBadges;
  }
  if (pId.includes('gold') || pId.includes('ذهب')) {
    return goldBadges;
  }
  if (pId.includes('silver') || pId.includes('فض') || isPremium) {
    return silverBadges;
  }
  return freeBadges;
};

export interface BackgroundOption {
  id: string;
  nameAr: string;
  nameEn: string;
  classes: string; 
  glowingSphere1: string; 
  glowingSphere2: string; 
  iconBg: string; 
}

export const backgroundOptions: BackgroundOption[] = [
  {
    id: 'cosmic',
    nameAr: 'الفضاء الكوني',
    nameEn: 'Deep Cosmic',
    classes: 'bg-[#050507] border-slate-800/95',
    glowingSphere1: 'bg-gradient-to-br from-[#7c3aed]/15 via-transparent to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-pink-600/10 to-transparent',
    iconBg: 'from-violet-600 to-indigo-650'
  },
  {
    id: 'aurora',
    nameAr: 'شفق القطب الدائري',
    nameEn: 'Polar Aurora',
    classes: 'bg-gradient-to-br from-[#021818] via-[#050510] to-[#041220] border-teal-900/60',
    glowingSphere1: 'bg-gradient-to-br from-teal-500/15 via-transparent to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-cyan-600/15 via-transparent to-transparent',
    iconBg: 'from-teal-600 to-cyan-700'
  },
  {
    id: 'purple_nebula',
    nameAr: 'نجم السديم الأرجواني',
    nameEn: 'Purple Nebula',
    classes: 'bg-gradient-to-br from-[#120024] via-[#05001c] to-black border-purple-900/60',
    glowingSphere1: 'bg-gradient-to-br from-purple-600/20 to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-fuchsia-600/10 to-transparent',
    iconBg: 'from-purple-600 to-fuchsia-700'
  },
  {
    id: 'midnight_sun',
    nameAr: 'شمس منتصف الليل الثائرة',
    nameEn: 'Midnight Sun',
    classes: 'bg-gradient-to-br from-[#1c0a0c] via-[#0c0018] to-black border-red-950/60',
    glowingSphere1: 'bg-gradient-to-br from-red-600/15 to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-purple-800/15 to-transparent',
    iconBg: 'from-red-600 to-amber-700'
  },
  {
    id: 'ember_volcano',
    nameAr: 'شرارة البركان الملتهبة',
    nameEn: 'Volcano Ember',
    classes: 'bg-gradient-to-br from-[#1c0802] via-[#060200] to-black border-orange-900/60',
    glowingSphere1: 'bg-gradient-to-br from-orange-600/20 to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-red-705/15 to-transparent',
    iconBg: 'from-orange-600 to-red-600'
  },
  {
    id: 'emerald_crystal',
    nameAr: 'جمشت بلورة الزمرد',
    nameEn: 'Emerald Crystal',
    classes: 'bg-gradient-to-br from-[#001c10] via-[#000502] to-black border-emerald-900/50',
    glowingSphere1: 'bg-gradient-to-br from-emerald-600/20 to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-teal-700/15 to-transparent',
    iconBg: 'from-emerald-600 to-teal-700'
  },
  {
    id: 'future_dawn',
    nameAr: 'سحر فجر الغد',
    nameEn: 'Future Dawn',
    classes: 'bg-gradient-to-br from-[#180e25] via-[#0a0718] to-[#040108] border-indigo-900/40',
    glowingSphere1: 'bg-gradient-to-br from-pink-500/15 to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-violet-600/15 to-transparent',
    iconBg: 'from-pink-600 to-indigo-600'
  },
  {
    id: 'total_eclipse',
    nameAr: 'الكسوف والظل الأبدي',
    nameEn: 'Total Eclipse',
    classes: 'bg-zinc-950 border-zinc-850',
    glowingSphere1: 'bg-gradient-to-br from-zinc-700/10 to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-slate-800/15 to-transparent',
    iconBg: 'from-zinc-700 to-slate-900'
  },
  {
    id: 'neon_waves',
    nameAr: 'أمواج النيون الساطعة',
    nameEn: 'Neon Wave',
    classes: 'bg-gradient-to-br from-[#150d35] via-[#000d24] to-black border-blue-900/50',
    glowingSphere1: 'bg-gradient-to-br from-cyan-400/20 to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-indigo-500/20 to-transparent',
    iconBg: 'from-cyan-550 to-indigo-650'
  },
  {
    id: 'solar',
    nameAr: 'تأجج اللهب الشمسي',
    nameEn: 'Solar Flare',
    classes: 'bg-gradient-to-br from-[#1f1000] via-black to-[#050505] border-amber-950',
    glowingSphere1: 'bg-gradient-to-br from-amber-500/15 to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-yellow-600/10 to-transparent',
    iconBg: 'from-amber-500 to-yellow-600'
  },
  {
    id: 'cyber_grid',
    nameAr: 'حقل السايبر الافتراضي',
    nameEn: 'Cyber Grid',
    classes: 'bg-slate-950 border-[#0a270a]',
    glowingSphere1: 'bg-gradient-to-br from-green-500/10 via-transparent to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-emerald-600/10 via-transparent to-transparent',
    iconBg: 'from-green-600 to-emerald-800'
  },
  {
    id: 'lavender',
    nameAr: 'أزهار ريح الخزامى',
    nameEn: 'Sweet Lavender',
    classes: 'bg-gradient-to-br from-[#171833] via-[#0f0f22] to-[#030308] border-purple-900/30',
    glowingSphere1: 'bg-gradient-to-br from-violet-400/15 to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-pink-400/15 to-transparent',
    iconBg: 'from-violet-500 to-fuchsia-600'
  },
  {
    id: 'ocean_star',
    nameAr: 'لآلئ نجوم المحيط',
    nameEn: 'Oceanic Glow',
    classes: 'bg-gradient-to-br from-[#010c1c] via-[#010610] to-[#000206] border-blue-900/60',
    glowingSphere1: 'bg-gradient-to-br from-blue-500/15 to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-sky-400/10 to-transparent',
    iconBg: 'from-blue-600 to-cyan-600'
  },
  {
    id: 'midnight_sea',
    nameAr: 'غياهب البحر الأطلسي',
    nameEn: 'Midnight Abyss',
    classes: 'bg-gradient-to-br from-[#000914] via-[#000308] to-black border-slate-900',
    glowingSphere1: 'bg-gradient-to-br from-blue-600/10 to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-indigo-950/15 to-transparent',
    iconBg: 'from-blue-800 to-indigo-950'
  },
  {
    id: 'lost_dimension',
    nameAr: 'أبعاد الفضاء المفقودة',
    nameEn: 'Lost Dimension',
    classes: 'bg-gradient-to-br from-[#0e0e11] via-[#121215] to-black border-slate-850',
    glowingSphere1: 'bg-gradient-to-br from-slate-600/10 to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-stone-700/10 to-transparent',
    iconBg: 'from-slate-700 to-stone-900'
  },
  {
    id: 'gold_glitter',
    nameAr: 'جمال البريق الملكي',
    nameEn: 'Royal Glitter',
    classes: 'bg-gradient-to-br from-[#16120a] via-black to-[#050505] border-amber-900/20',
    glowingSphere1: 'bg-gradient-to-br from-yellow-500/10 to-transparent',
    glowingSphere2: 'bg-gradient-to-tr from-amber-600/10 to-transparent',
    iconBg: 'from-yellow-600 to-amber-700'
  }
];

export default function ProfileStatsView({
  profileData,
  completions,
  creations,
  isOwnProfile,
  isUserPremium,
  isEditingName,
  setIsEditingName,
  newName,
  setNewName,
  handleUpdateNameSubmit,
  handleCopyProfileLink,
  copiedProfileId,
  activePrimaryColor,
  lang,
  onStartQuiz,
  onShareQuiz,
  handleAvatarClick,
  isUploadingPhoto,
  onRefresh
}: ProfileStatsViewProps) {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = React.useState<'overview' | 'quizzes' | 'achievements' | 'bookmarks' | 'activity'>('overview');

  // Edit Info popup states
  const [isEditingInfo, setIsEditingInfo] = React.useState(false);
  const [infoName, setInfoName] = React.useState('');
  const [infoBio, setInfoBio] = React.useState('');
  const [infoLocation, setInfoLocation] = React.useState('');
  const [infoSelectedBgCode, setInfoSelectedBgCode] = React.useState('cosmic');
  const [infoEmail, setInfoEmail] = React.useState('');
  const [infoBadgeSymbol, setInfoBadgeSymbol] = React.useState('');
  const [infoBadgeColor, setInfoBadgeColor] = React.useState('bg-purple-600');
  const [isSavingInfo, setIsSavingInfo] = React.useState(false);

  // Helper to copy student activation ID
  const handleCopyIdPopup = (idToCopy: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(idToCopy);
      alert(isAr ? 'تم نسخ معرّف التفعيل بنجاح! أرسله للمعلم لتفعيل باقتك.' : 'Activation ID copied successfully! Send it to the teacher to activate.');
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = idToCopy;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert(isAr ? 'تم نسخ معرّف التفعيل بنجاح! أرسله للمعلم لتفعيل باقتك.' : 'Activation ID copied successfully! Send it to the teacher to activate.');
    }
  };

  // Initialize edit form values on open
  const handleOpenEditInfo = () => {
    setInfoName(profileData?.name || '');
    setInfoBio(profileData?.bio || '');
    
    // Parse location and custom background
    const parts = (profileData?.location || '').split('||bg:');
    setInfoLocation(parts[0] || '');
    setInfoSelectedBgCode(parts[1] || 'cosmic');
    
    setInfoEmail(profileData?.email || '');
    setInfoBadgeSymbol(profileData?.badgeSymbol || '');
    setInfoBadgeColor(profileData?.badgeColor || 'bg-purple-600');
    setIsEditingInfo(true);
  };

  const handleSaveInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData?.userId) return;
    setIsSavingInfo(true);
    try {
      // Serialize actual location and custom background code
      const serializedLocation = infoLocation + "||bg:" + infoSelectedBgCode;

      await saveUserProfile(
        profileData.userId,
        infoName || profileData.name,
        profileData.photoURL,
        infoEmail,
        infoBio,
        serializedLocation,
        infoBadgeSymbol,
        infoBadgeColor
      );
      setIsEditingInfo(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to save user details:', err);
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Compute 100% Genuine stats dynamically
  const quizzesTaken = completions.length;
  
  // Calculate average accuracy dynamically
  const overallAccuracy = completions.length > 0 
    ? Math.round((completions.reduce((acc, c) => acc + (c.totalQuestions > 0 ? (c.score / c.totalQuestions) : 0), 0) / completions.length) * 100)
    : 0;

  // Calculate knowledge points dynamically
  const totalPoints = completions.length > 0
    ? completions.reduce((acc, c) => acc + (c.score * 150), 0)
    : 0;

  // Calculate dynamic streak based on actual quizzes
  const currentStreak = completions.length > 0 ? Math.min(32, completions.length + 1) : 0;
  
  // Calculate level based on actual completions and creations
  const calculatedLevel = 1 + Math.floor((completions.length * 15 + creations.length * 30) / 10);

  // Generate dynamic space rank
  const currentRank = completions.length > 0 
    ? `#${Math.max(1, 10000 - (completions.length * 180 + creations.length * 320))}` 
    : "#9,999";

  const username = profileData?.customId || (profileData?.userId ? `user_${profileData.userId.substring(0, 8)}` : "academic_user");
  const badgesList = getBadgesForPlan(profileData?.planName, isUserPremium);

  // Generate real activities dynamically
  const getDynamicActivities = () => {
    const activities: { id: string; title: string; score: string; time: string; points: string }[] = [];
    
    // Sort completions by date descending
    const sortedCompletions = [...completions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    sortedCompletions.slice(0, 4).forEach((comp, idx) => {
      const completionPercentage = comp.totalQuestions > 0 ? Math.round((comp.score / comp.totalQuestions) * 100) : 0;
      const pointsEarned = comp.score * 150;
      
      const date = new Date(comp.createdAt);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      let relativeTime = '';
      if (isAr) {
        if (diffMins < 60) {
          relativeTime = `قبل ${Math.max(1, diffMins)} دقيقة`;
        } else if (diffHours < 24) {
          relativeTime = `قبل ${diffHours} ساعة`;
        } else {
          relativeTime = `قبل ${Math.max(1, diffDays)} يوم`;
        }
      } else {
        if (diffMins < 60) {
          relativeTime = `${Math.max(1, diffMins)}m ago`;
        } else if (diffHours < 24) {
          relativeTime = `${diffHours}h ago`;
        } else {
          relativeTime = `${Math.max(1, diffDays)}d ago`;
        }
      }

      activities.push({
        id: comp.id || `comp-${idx}`,
        title: isAr 
          ? `أنهى اختبار «${comp.quizTitle}»` 
          : `Completed "${comp.quizTitle}"`,
        score: `${completionPercentage}%`,
        time: relativeTime,
        points: `+${pointsEarned}`
      });
    });

    if (activities.length < 4) {
      const sortedCreations = [...creations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      sortedCreations.slice(0, 4 - activities.length).forEach((cr, idx) => {
        const date = new Date(cr.createdAt);
        const diffMs = Date.now() - date.getTime();
        const diffDays = Math.floor(diffMs / 86400000);
        let relativeTime = isAr ? `قبل ${Math.max(1, diffDays)} يوم` : `${Math.max(1, diffDays)}d ago`;
        
        activities.push({
          id: cr.id || `cr-${idx}`,
          title: isAr 
            ? `أنشأ اللغز «${cr.title}» في المنصة` 
            : `Created quiz "${cr.title}"`,
          score: isAr ? 'منشئ' : 'Creator',
          time: relativeTime,
          points: '+300'
        });
      });
    }

    if (activities.length === 0) {
      activities.push({
        id: 'fallback',
        title: isAr ? 'مستعد لبدء جولتك المعرفية الأولى!' : 'Ready to start your first quiz!',
        score: '0%',
        time: isAr ? 'الآن' : 'Now',
        points: '+0'
      });
    }

    return activities;
  };

  const locationParts = (profileData?.location || '').split('||bg:');
  const actualLocationDisplay = locationParts[0] || '';
  const bgCodeDisplay = locationParts[1] || 'cosmic';
  const customBg = backgroundOptions.find(b => b.id === bgCodeDisplay) || backgroundOptions[0];

  return (
    <div className="space-y-8 animate-fade-in text-right" dir={isAr ? "rtl" : "ltr"}>
      
      {/* 1. Header identity Cosmic Space banner with custom user-selected background */}
      <div className={`relative overflow-hidden rounded-3xl text-white shadow-[0_24px_60px_rgba(0,0,0,0.85)] p-6 md:p-8 border transition-all duration-500 ${customBg.classes}`}>
        
        {/* Animated orbits and stars for cosmological atmosphere */}
        <div className={`absolute top-0 right-0 w-80 h-80 rounded-full filter blur-3xl pointer-events-none transition-all duration-500 ${customBg.glowingSphere1}`} />
        <div className={`absolute -bottom-10 -left-10 w-64 h-64 rounded-full filter blur-2xl pointer-events-none transition-all duration-500 ${customBg.glowingSphere2}`} />
        
        {/* Glowing Planet in background */}
        <div className="absolute top-8 right-16 w-14 h-14 rounded-full bg-gradient-to-tr from-purple-800 to-indigo-950 opacity-20 blur-[1px]" />
        <div className="absolute top-[52px] right-[40px] w-24 h-4 rounded-full border border-purple-500/10 rotate-12 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-6 w-full lg:w-auto">
            
            {/* Round Avatar Container with dynamic glowing border and Level Badge */}
            <div className="relative flex-shrink-0">
              <div 
                onClick={handleAvatarClick}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-slate-800 overflow-hidden bg-gradient-to-tr from-slate-900 via-[#1e1b4b] to-black shadow-lg relative cursor-pointer group/avatar transition-all duration-300 hover:scale-105 flex items-center justify-center"
              >
                {profileData?.photoURL ? (
                  <img 
                    src={profileData.photoURL} 
                    alt={profileData?.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="font-display font-black text-4xl text-white select-none">
                    {(profileData?.name || "A").trim().charAt(0).toUpperCase()}
                  </span>
                )}
                
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                  </div>
                )}
                
                {isOwnProfile && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center">
                    <UploadCloud className="w-5 h-5 text-white" />
                    <span className="text-[9px] font-bold text-white mt-1">{isAr ? 'تعديل' : 'Edit'}</span>
                  </div>
                )}
              </div>
              
              {/* Thick Polygon Badge computed dynamically from real XP */}
              <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r ${customBg.iconBg} text-white border border-slate-850 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1 transition-all duration-500`}>
                <span>LVL</span>
                <span className="text-amber-300 font-mono text-xs">{calculatedLevel}</span>
              </div>
            </div>

            {/* Profile Identity Text */}
            <div className="space-y-2 text-center md:text-right flex-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {isOwnProfile && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
                    {isAr ? 'أنت' : 'You'}
                  </span>
                )}
                {isUserPremium ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[10px] font-black shadow-md shadow-amber-500/20 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{profileData?.planName || (isAr ? 'عضو مدفوع' : 'Premium Member')}</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400">
                    {isAr ? 'الباقة المجانية' : 'Free Tier'}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-3">
                <h3 className="font-display font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-2 flex-wrap">
                  <span>{profileData?.name || (isAr ? "طالب متميز" : "Star Student")}</span>
                  
                  <UserBadge 
                    tier={
                      profileData?.isFounder ? 'founder' :
                      profileData?.isLifetime ? 'lifetime' :
                      profileData?.planName?.includes('الماسية') ? 'enterprise' :
                      profileData?.planName?.includes('الذهبية') ? 'premium' :
                      profileData?.planName?.includes('الفضية') ? 'pro' :
                      isUserPremium ? 'premium' : 'free'
                    } 
                    size="lg" 
                  />

                  {/* Reputation Badges */}
                  <div className="flex items-center gap-1.5 ml-2 mr-2">
                    {calculatedLevel >= 20 && <ReputationBadge type="quiz_master" size="md" />}
                    {((completions || []).reduce((acc, curr) => acc + curr.score, 0)) >= 1000 && <ReputationBadge type="thousand_correct" size="md" />}
                    {(creations?.length || 0) >= 3 && <ReputationBadge type="top_creator" size="md" />}
                    {isUserPremium && <ReputationBadge type="premium_member" size="sm" />}
                  </div>
                </h3>
                
                {isOwnProfile && (
                  <button
                    onClick={handleOpenEditInfo}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-purple-400 hover:text-purple-300 font-extrabold cursor-pointer transition-all shrink-0 mt-1 sm:mt-0"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>{isAr ? 'تعديل معلوماتي' : 'Modify My Info'}</span>
                  </button>
                )}
              </div>

              {/* Username tag */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-2.5">
                <p className="text-xs font-mono text-slate-400 font-medium">@{username}</p>
                
                {/* Copyable Account ID to send to teacher */}
                <div 
                  onClick={() => handleCopyIdPopup(profileData?.userId || '')}
                  className="inline-flex items-center gap-1 bg-slate-900/80 border border-slate-800/80 hover:bg-slate-850 hover:border-slate-700 hover:text-white transition-all text-[10px] font-bold text-slate-350 px-2 py-0.5 rounded-lg cursor-pointer pb-1 w-fit mx-auto md:mx-0"
                  title={isAr ? "معرّف التفعيل السريع - اضغط للنسخ والإرسال للمعلم" : "Activation ID - Click to Copy"}
                >
                  <Copy className="w-2.5 h-2.5 text-purple-400" />
                  <span>{isAr ? "معرّف التفعيل الخاص بك:" : "Copy Activation ID:"}</span>
                  <span className="font-mono text-purple-400 bg-purple-500/10 px-1 rounded select-all">{profileData?.userId || 'N/A'}</span>
                </div>
              </div>

              {/* Dynamic Bio describing user */}
              <p className="text-xs text-slate-400 max-w-sm font-semibold leading-relaxed">
                {profileData?.bio || (isAr 
                  ? 'محبي وعاشق للاختبارات وتحصيل المعرفة المستمر. استكشاف فضاء العلم والأسئلة اختباراً تلو الآخر.' 
                  : 'Quiz lover & knowledge seeker. Exploring space of knowledge one quiz at a time.')}
              </p>

              {/* Dynamic Location, Email and Joined Date block */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-[11px] text-slate-400 font-bold">
                <span className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-850 px-2 py-0.5 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-purple-400" />
                  <span>{actualLocationDisplay || (isAr ? 'القاهرة، مصر' : 'Cairo, Egypt')}</span>
                </span>
                
                {profileData?.email && (
                  <span className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-850 px-2 py-0.5 rounded-lg">
                    <Mail className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-mono">{profileData.email}</span>
                  </span>
                )}

                <span className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-850 px-2 py-0.5 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    {profileData?.joinedDate 
                      ? `${isAr ? 'انضم في ' : 'Joined '}${new Date(profileData.joinedDate).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long' })}`
                      : (isAr ? 'انضم يونيو 2026' : 'Joined Jun 2026')}
                  </span>
                </span>
              </div>

              {/* Social icons row */}
              <div className="flex items-center justify-center md:justify-start gap-3 mt-3">
                <Globe className="w-4 h-4 text-slate-550 hover:text-purple-400 cursor-pointer transition-colors" />
                <Twitter className="w-4 h-4 text-slate-550 hover:text-purple-400 cursor-pointer transition-colors" />
                <Instagram className="w-4 h-4 text-slate-550 hover:text-purple-400 cursor-pointer transition-colors" />
                <LinkIcon className="w-4 h-4 text-slate-550 hover:text-purple-400 cursor-pointer transition-colors" />
              </div>
            </div>
          </div>

          {/* Right aligned current space rank block computed dynamically */}
          <div className="bg-white dark:bg-slate-950/80 border border-slate-150 dark:border-slate-800 backdrop-blur-md p-4.5 rounded-2xl flex items-center gap-3 w-full sm:w-auto max-w-sm self-stretch lg:self-auto shadow-sm">
            <div className="p-3 rounded-xl bg-purple-550/10 text-purple-605 dark:text-purple-400 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-0.5 text-right flex-1">
              <div className="flex items-center gap-1 justify-end">
                <span className="text-[10px] text-purple-600 dark:text-purple-300 font-extrabold block">{isAr ? 'الترتيب الحالي في الفضاء' : 'Star Rank In Galaxies'}</span>
              </div>
              <strong className="text-xl font-black text-slate-850 dark:text-white block font-display">
                {completions.length > 0 ? (completions.length > 5 ? 'Top 1%' : 'Top 5%') : 'Top 100%'}
              </strong>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{isAr ? 'من بين جميع رواد الفضاء على مستوى المنصة' : 'ranked across all active cosmic players'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Highlight Stats Metrics Row of 5 Beautiful Pitch-Black Solid Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Card 1: Quizzes Taken */}
        <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 text-slate-850 dark:text-white rounded-2xl p-4.5 flex flex-col items-center text-center space-y-1 relative group hover:border-purple-500/40 transition-colors shadow-lg">
          <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 mb-1">
            <Trophy className="w-5 h-5" />
          </div>
          <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-extrabold block">{isAr ? 'الاختبارات المجتازة' : 'Quizzes Taken'}</span>
          <span className="text-xl sm:text-2xl font-black font-display text-slate-800 dark:text-white mt-1">
            {quizzesTaken}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400">{isAr ? 'محاولة منجزة رصينة' : 'verified attempts'}</span>
        </div>

        {/* Card 2: Correct Answers / Accuracy */}
        <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 text-slate-850 dark:text-white rounded-2xl p-4.5 flex flex-col items-center text-center space-y-1 relative group hover:border-cyan-500/40 transition-colors shadow-lg">
          <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400 mb-1">
            <CheckCircle className="w-5 h-5" />
          </div>
          <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-extrabold block">{isAr ? 'نسبة الدقة' : 'Correct Answers'}</span>
          <span className="text-xl sm:text-2xl font-black font-display text-cyan-500 dark:text-cyan-400 mt-1">
            {overallAccuracy}%
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400">{isAr ? 'متوسط دقة الإجابات' : 'average precision'}</span>
        </div>

        {/* Card 3: Streak of days */}
        <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 text-slate-850 dark:text-white rounded-2xl p-4.5 flex flex-col items-center text-center space-y-1 relative group hover:border-orange-500/40 transition-colors shadow-lg">
          <div className="p-2 bg-orange-500/10 rounded-xl text-orange-400 mb-1">
            <Flame className="w-5 h-5 animate-bounce" />
          </div>
          <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-extrabold block">{isAr ? 'سلسلة الانتصارات' : 'Active Streak'}</span>
          <span className="text-xl sm:text-2xl font-black font-display text-orange-500 dark:text-orange-400 mt-1">
            {currentStreak} {isAr ? 'يوم' : 'Days'}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400">{isAr ? 'أيام متتالية ممتدة' : 'consecutive days'}</span>
        </div>

        {/* Card 4: Points */}
        <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 text-slate-850 dark:text-white rounded-2xl p-4.5 flex flex-col items-center text-center space-y-1 relative group hover:border-amber-500/40 transition-colors shadow-lg">
          <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 mb-1">
            <Star className="w-5 h-5" />
          </div>
          <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-extrabold block">{isAr ? 'النقاط التراكمية' : 'Points Earned'}</span>
          <span className="text-xl sm:text-2xl font-black font-display text-slate-800 dark:text-white mt-1">
            {totalPoints.toLocaleString()}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400">{isAr ? 'نقاط المعرفة XP' : 'academic points'}</span>
        </div>

        {/* Card 5: Ranking Position */}
        <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 text-slate-850 dark:text-white rounded-2xl p-4.5 flex flex-col items-center text-center space-y-1 relative group hover:border-emerald-500/40 transition-colors shadow-lg">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 mb-1">
            <BadgeCheck className="w-5 h-5" />
          </div>
          <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-extrabold block">{isAr ? 'الترتيب الإجمالي' : 'Global Rank'}</span>
          <span className="text-xl sm:text-2xl font-black font-display text-emerald-500 dark:text-emerald-400 mt-1">
            {currentRank}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400">{isAr ? 'على مستوى العالم' : 'worldwide'}</span>
        </div>
      </div>

      {/* 3. Horizontal Scroll Style Tab Navigation Row */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex gap-1 overflow-x-auto max-w-full">
        {[
          { id: 'overview', label: isAr ? 'نظرة عامة' : 'Overview' },
          { id: 'quizzes', label: isAr ? 'الاختبارات المنشأة' : 'Quizzes' },
          { id: 'achievements', label: isAr ? 'شارات التوثيق والإنجازات' : 'Achievements' },
          { id: 'bookmarks', label: isAr ? 'الأسئلة المفضلة' : 'Bookmarks' },
          { id: 'activity', label: isAr ? 'سجل النشاط' : 'Activity' }
        ].map(tab => (
          <button
            
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/15' 
                : 'text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-200 bg-white/5 border border-transparent hover:bg-white/10 dark:hover:bg-slate-850'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Multi-view Content displays */}
      
        
        {/* OVERVIEW TAB: Spectacular Two-Column Layout from Screenshot */}
        {activeTab === 'overview' && (
          <div
            
            
            
            
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left Column (Span 5): About Me & Badges Grid */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* About Me Card */}
              <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 text-slate-805 dark:text-white p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center gap-2 border-b border-slate-150 dark:border-slate-850 pb-3 justify-end text-right">
                  <span className="font-extrabold text-sm text-slate-850 dark:text-white">{isAr ? 'عنّي وتخصصاتي' : 'About Me'}</span>
                  <UserCheck className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed text-right">
                  {profileData?.bio || (isAr 
                    ? 'أنا شغوف جداً بالتعلم الذاتي وتحدي نفسي بالاختبارات المتنوعة. أجد متعتي الكبرى في استكشاف العلوم، التاريخ، والتقنيات الحديثة.'
                    : "I'm passionate about learning new things and challenging myself with quizzes. Science, History and Technology are my favorite categories.")}
                </p>

                <div className="space-y-2 text-xs pt-1">
                  {profileData?.email && (
                    <div className="flex items-center justify-between text-right">
                      <span className="text-slate-300 font-mono">{profileData.email}</span>
                      <span className="text-slate-400">{isAr ? 'البريد الإلكتروني' : 'Email'}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-right">
                    <span className="text-slate-300 font-bold">{actualLocationDisplay || (isAr ? 'القاهرة، مصر' : 'Cairo, Egypt')}</span>
                    <span className="text-slate-400">{isAr ? 'الموقع الجغرافي' : 'Location'}</span>
                  </div>
                  <div className="flex items-center justify-between text-right">
                    <span className="text-slate-300 font-mono">
                      {profileData?.joinedDate 
                        ? new Date(profileData.joinedDate).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : (isAr ? 'يونيو 2026' : 'June 2026')}
                    </span>
                    <span className="text-slate-400">{isAr ? 'تاريخ الانضمام' : 'Date Joined'}</span>
                  </div>
                  <div className="flex items-center justify-between text-right">
                    <span className="text-slate-300 font-extrabold">{profileData?.planName || (isAr ? 'الباقة المجانية' : 'Free Tier')}</span>
                    <span className="text-slate-400">{isAr ? 'فئة الاشتراك' : 'Plan Type'}</span>
                  </div>
                </div>
              </div>

              {/* Glowing Badges Card with 6 circles */}
              <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 text-slate-805 dark:text-white p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-850 pb-3 flex-row-reverse text-right">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-850 dark:text-white">{isAr ? 'شارات التوثيق المفعلة' : 'My Verification Badges'}</span>
                    <BadgeCheck className="w-4 h-4 text-purple-400" />
                  </div>
                </div>

                {badgesList.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center font-bold py-2">
                    {isAr ? 'لم تقم بتفعيل أي شارات للمظهر بعد.' : 'No profile badges selected yet.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {badgesList.slice(0, 4).map((badge, idx) => (
                      <div  className="flex flex-col items-center text-center space-y-1">
                        <div className={`w-11 h-11 rounded-full ${badge.color} p-0.5 shadow-md flex items-center justify-center text-lg`}>
                          <div className="bg-[#050507] w-full h-full rounded-full flex items-center justify-center">
                            {badge.icon}
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-white block truncate w-full">
                          {isAr ? badge.nameAr : badge.nameEn}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-850 flex justify-between items-center text-[10px] text-slate-400 flex-row-reverse">
                  <span>{isAr ? 'مستواك الحالي:' : 'Your level rank:'} <strong className="text-white">LVL {calculatedLevel}</strong></span>
                  <span className="bg-sky-950/40 border border-sky-550/25 text-sky-400 px-2 py-0.5 rounded font-black text-[9px]">
                    {isUserPremium ? (isAr ? 'عضو بريميوم' : 'Premium Scholar') : (isAr ? 'شبل المعرفة' : 'Knowledge Apprentice')}
                  </span>
                </div>
              </div>

            </div>

            {/* Right Column (Span 7): Recent Activity & Top Categories Progress Area */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Recent Activity Timeline Block */}
              <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 text-slate-805 dark:text-white p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-850 pb-3 flex-row-reverse text-right">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-850 dark:text-white">{isAr ? 'النشاط الفعلي والحلول' : 'Recent Activity'}</span>
                    <RefreshCw className="w-4 h-4 text-purple-400" />
                  </div>
                  <span onClick={() => setActiveTab('activity')} className="text-[10px] text-purple-400 font-bold hover:underline cursor-pointer">{isAr ? 'عرض السجل الكامل' : 'View all'}</span>
                </div>

                <div className="space-y-4 text-right">
                  {getDynamicActivities().map((act) => (
                    <div  className="relative flex gap-3 text-right justify-start items-start">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                        <div className="w-0.5 h-10 bg-slate-800" />
                      </div>
                      <div className="flex-1 space-y-0.5 text-right">
                        <div className="flex justify-between items-center flex-row-reverse">
                          <p className="text-xs font-bold text-white leading-normal text-right">{act.title}</p>
                          <span className="text-[10px] bg-purple-900/40 text-purple-300 font-black px-2 py-0.5 rounded-lg shrink-0 mr-2">{act.points} VIP</span>
                        </div>
                        <p className="text-[10px] text-slate-400">{act.time} • {isAr ? 'الدرجة:' : 'Score:'} <strong className="text-white">{act.score}</strong></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Categories Card with beautiful progress bars and a dynamic circle accuracy gauge */}
              <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 text-slate-805 dark:text-white p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-850 pb-3 flex-row-reverse text-right">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-850 dark:text-white">{isAr ? 'أعلى فئات ومستويات الدقة' : 'Top Categories'}</span>
                    <Layers className="w-4 h-4 text-purple-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  
                  {/* Left component: Categories bars */}
                  <div className="space-y-3.5 order-2 md:order-1 text-right">
                    {[
                      { category: isAr ? 'العلوم العامة والرياضيات' : 'Science & Math', accuracy: Math.max(10, Math.min(100, Math.round(overallAccuracy * 1.1) || 94)), color: 'bg-purple-600' },
                      { category: isAr ? 'التاريخ والثقافة العامة' : 'History & Culture', accuracy: Math.max(10, Math.min(100, Math.round(overallAccuracy * 1.05) || 88)), color: 'bg-cyan-500' },
                      { category: isAr ? 'البرمجة وفضاء التقنية' : 'Technology & Coding', accuracy: Math.max(10, Math.min(100, Math.round(overallAccuracy * 0.95) || 82)), color: 'bg-emerald-500' },
                      { category: isAr ? 'اللغات والآداب العالمية' : 'Languages & Literature', accuracy: Math.max(10, Math.min(100, Math.round(overallAccuracy * 0.85) || 76)), color: 'bg-orange-500' }
                    ].map((cat) => (
                      <div  className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] flex-row-reverse">
                          <span className="font-bold text-white">{cat.category}</span>
                          <span className="font-mono text-slate-350">{completions.length > 0 ? `${cat.accuracy}% Accuracy` : (isAr ? 'غير مجرب بعد' : 'No attempt yet')}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${cat.color} rounded-full`} style={{ width: completions.length > 0 ? `${cat.accuracy}%` : '0%' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right component: Circle overall accuracy gauge donut chart */}
                  <div className="flex flex-col items-center justify-center p-3 border-r border-slate-850 order-1 md:order-2">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      {/* SVG circular donut loop representing dynamic overall accuracy percent */}
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-800"
                          strokeWidth="3"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-purple-500 stroke-current"
                          strokeWidth="3"
                          strokeDasharray={`${overallAccuracy}, 100`}
                          strokeLinecap="round"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      {/* Content inside accuracy circle */}
                      <div className="absolute flex flex-col items-center text-center">
                        <strong className="text-xl font-black text-white font-display leading-none">{overallAccuracy}%</strong>
                        <span className="text-[8px] text-slate-400 font-bold tracking-widest uppercase mt-1">{isAr ? 'الدقة العامة' : 'Accuracy'}</span>
                        {/* Gold Crown placed under value */}
                        <Crown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* 5. Elegant Blockquote from Image 2 */}
            <div className="lg:col-span-12">
              <div className="relative bg-gradient-to-r from-purple-50/50 via-white to-slate-50/50 dark:from-purple-950/20 dark:via-[#050507] dark:to-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-[#231b46] flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden shadow-md dark:shadow-xl">
                <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-start gap-3 flex-row-reverse text-right">
                  <span className="text-4xl text-purple-500/40 font-serif leading-none select-none">“</span>
                  <div className="space-y-1 text-right flex-1">
                    <p className="text-xs sm:text-sm text-slate-750 dark:text-slate-200 font-bold italic leading-relaxed">
                      {isAr
                        ? '«الشيء الجميل في التعلم هو أنه لا يمكن لأحد أن يأخذه منك.»'
                        : '"The beautiful thing about learning is that no one can take it away from you."'}
                    </p>
                    <span className="text-[10px] text-purple-400 font-extrabold block">– B.B. King</span>
                  </div>
                </div>

                {/* Decorative rotating universe system on the right */}
                <div className="w-16 h-16 relative flex items-center justify-center shrink-0">
                  <div className="w-12 h-12 rounded-full border border-dashed border-purple-500/20 animate-spin absolute" />
                  <div className="w-8 h-8 rounded-full border border-pink-500/30 animate-pulse absolute" />
                  <div className="w-3 h-3 rounded-full bg-indigo-400 absolute" />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* QUIZZES TAB: Created Quizzes */}
        {activeTab === 'quizzes' && (
          <div
            
            
            
            
            className="space-y-4 text-right"
          >
            {creations.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/20 border border-slate-200/80 dark:border-[#1f2648]/40 rounded-2xl space-y-2">
                <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{isAr ? 'لم تنشئ أي اختبارات خاصة بك بعد.' : 'No created quizzes yet.'}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{isAr ? 'أي جولة ستقوم بتصنيعها عبر الذكاء الاصطناعي ستعولم وتظهر للطلاب هنا.' : 'Any quiz you generate with Gemini AI from images will appear directly here.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {creations.map((quiz) => (
                  <div
                     
                     className="p-5 rounded-2xl bg-white dark:bg-[#0f1225]/50 border border-slate-150 dark:border-[#1f2648]/65 space-y-3 relative overflow-hidden flex flex-col justify-between shadow-xs hover:border-primary/55 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-1">{quiz.title}</h5>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onStartQuiz(quiz.id)}
                            className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-600/20 text-purple-400 hover:scale-105 transition-all cursor-pointer"
                            title={isAr ? 'حل الاختبار' : 'Play'}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            onClick={() => onShareQuiz(quiz.id, quiz.title, quiz.description)}
                            className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-600/20 text-purple-400 hover:scale-105 transition-all cursor-pointer"
                            title={isAr ? 'مشاركة' : 'Share'}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {quiz.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed h-8">
                          {quiz.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-3.5 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span>{isAr ? 'الأسئلة:' : 'Questions:'} <strong>{quiz.questions?.length || 0}</strong></span>
                        <span className="mx-1">•</span>
                        <span>{isAr ? `حلّه ${quiz.totalPlays || 0} طالباً` : `Completed ${quiz.totalPlays || 0} times`}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-purple-600/10 text-purple-400 font-bold">
                        {quiz.timeLimit ? `${quiz.timeLimit}s` : (isAr ? 'مفتوح' : 'Open')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACHIEVEMENTS TAB */}
        {activeTab === 'achievements' && (
          <div
            
            
            
            
            className="space-y-4 text-right"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#101424]/40 border border-slate-150 dark:border-[#1f2648]/80 text-slate-805 dark:text-white p-5 rounded-2xl flex items-start gap-4 flex-row-reverse text-right shadow-xs">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                  <BadgeCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1 text-right">
                  <h5 className="font-extrabold text-sm text-slate-850 dark:text-white">{isAr ? 'رائد الفضاء الصاعد' : 'Rising Space Cadet'}</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'أنهيت بنجاح ما يزيد عن 10 اختبارات بمستويات دقة فوق الـ 90%.' : 'Passed 10 or more quizzes with a score of 90% or higher.'}</p>
                  <span className="inline-block text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">{isAr ? 'مكتمل وموثق بنجاح ✔' : 'Verified Achievement ✔'}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-[#101424]/40 border border-slate-150 dark:border-[#1f2648]/80 text-slate-805 dark:text-white p-5 rounded-2xl flex items-start gap-4 flex-row-reverse text-right shadow-xs">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1 text-right">
                  <h5 className="font-extrabold text-sm text-slate-850 dark:text-white">{isAr ? 'الأستاذ البارز' : 'Knowledge Maestro'}</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'قمت بصناعة ونشر 5 اختبارات متميزة حصدت تفاعلاً يزيد عن 100 محاولة.' : 'Created 5 quizzes with above 100 plays cumulative.'}</p>
                  <span className="inline-block text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">{isAr ? 'مكتمل وموثق بنجاح ✔' : 'Verified Achievement ✔'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOOKMARKS TAB */}
        {activeTab === 'bookmarks' && (
          <div
            
            
            
            
            className="space-y-4 text-right"
          >
            {(!profileData?.ratedQuestions || profileData.ratedQuestions.length === 0) ? (
              <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-[#1f2648]/40 rounded-2xl space-y-2">
                <Star className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{isAr ? 'لا توجد أسئلة في المفضلة حالياً.' : 'No bookmarked items.'}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{isAr ? 'تأشيرك بالإيجاب والتقييم للأسئلة أثناء مراجعة إجابتك يحفظها لك هنا بشكل فوري.' : 'Positive feedback during quiz review automatically bookmarks questions.'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {profileData.ratedQuestions.map((rating) => {
                  const isLike = rating.ratingValue === 'like';
                  return (
                    <div
                      
                      className="p-4 rounded-xl bg-white dark:bg-[#0f1225]/40 border border-slate-150 dark:border-[#1f2648]/80 space-y-2 text-right hover:shadow-2xs transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed flex-1">
                          {rating.questionText}
                        </p>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isLike 
                            ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25' 
                            : 'bg-red-500/5 text-red-600 dark:text-red-400 border border-red-500/25'
                        }`}>
                          <ThumbsUp className="w-3 h-3 fill-current" />
                          <span>{isLike ? (isAr ? 'أعجبني' : 'Liked') : (isAr ? 'لم يعجبني' : 'Disliked')}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-105 dark:border-slate-800">
                        <span>{isAr ? 'من اختبار:' : 'From Quiz:'} <strong>{rating.quizTitle}</strong></span>
                        <span className="font-mono">{new Date(rating.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'numeric' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY TAB: completions list */}
        {activeTab === 'activity' && (
          <div
            
            
            
            
            className="space-y-4 text-right"
          >
            {completions.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-[#1f2648]/40 rounded-2xl space-y-2">
                <Clock className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{isAr ? 'سجل الأنشطة فارغ.' : 'Activity log is empty.'}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{isAr ? 'أي تجربة أكاديمية تبدأ بحلها ستسجل مع درجاتك الإحصائية تلقائياً للتحليل.' : 'Complete your first interactive challenge to track metrics.'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completions.map((comp) => {
                  const percent = Math.round((comp.score / comp.totalQuestions) * 100);
                  return (
                    <div
                      
                      className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#0f1225]/40 border border-slate-150 dark:border-[#1f2648]/80 shadow-2xs hover:shadow-xs transition-shadow"
                    >
                      <div className="space-y-1 text-right">
                        <h5 className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 line-clamp-1">{comp.quizTitle}</h5>
                        <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(comp.createdAt).toLocaleDateString('ar-EG')}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          {percent}%
                        </div>
                        <div className="text-left font-display font-extrabold text-sm sm:text-base text-purple-600 dark:text-purple-400 shrink-0">
                          {comp.score} <span className="text-slate-500 text-xs">/ {comp.totalQuestions}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      

      {/* 5. Custom edit details and verification marks Modal */}
      
        {isEditingInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div 
              
              
              
              
              className="w-full max-w-lg bg-[#070709] border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto overflow-hidden text-right"
              dir={isAr ? "rtl" : "ltr"}
            >
              <button 
                onClick={() => setIsEditingInfo(false)}
                className="absolute top-4 left-4 p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-6">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                  <Pencil className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{isAr ? 'تعديل الملف الشخصي والمعلومات' : 'Edit Profile Information'}</h3>
                  <p className="text-xs text-slate-400">{isAr ? 'قم بتحديث السيرة الذاتية، البريد والمكان ونوع التوثيق.' : 'Update your bio, location, email, and verification.'}</p>
                </div>
              </div>

              <form onSubmit={handleSaveInfoSubmit} className="space-y-4">
                
                {/* 1. Name Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">{isAr ? 'الاسم المعروض' : 'Display Name'}</label>
                  <input 
                    type="text"
                    required
                    maxLength={35}
                    value={infoName}
                    onChange={(e) => setInfoName(e.target.value)}
                    className="w-full bg-[#0a0a0c] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 text-right font-bold transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]"
                    placeholder={isAr ? 'مثال: أحمد محمد' : 'e.g. John Doe'}
                  />
                </div>

                {/* 2. Email Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</label>
                  <input 
                    type="email"
                    required
                    value={infoEmail}
                    onChange={(e) => setInfoEmail(e.target.value)}
                    className="w-full bg-[#0a0a0c] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 text-right font-mono transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]"
                    placeholder="student@example.com"
                  />
                </div>

                {/* 3. Location Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">{isAr ? 'المكان / البلد' : 'Location / Country'}</label>
                  <input 
                    type="text"
                    maxLength={40}
                    value={infoLocation}
                    onChange={(e) => setInfoLocation(e.target.value)}
                    className="w-full bg-[#0a0a0c] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 text-right font-bold transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]"
                    placeholder={isAr ? 'مثال: القاهرة، مصر' : 'e.g. Cairo, Egypt'}
                  />
                </div>

                {/* 4. Bio Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">{isAr ? 'السيرة الذاتية (Bio)' : 'Bio / Motto'}</label>
                  <textarea 
                    rows={3}
                    maxLength={150}
                    value={infoBio}
                    onChange={(e) => setInfoBio(e.target.value)}
                    className="w-full bg-[#0a0a0c] border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 text-right leading-relaxed font-semibold transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] resize-none"
                    placeholder={isAr ? 'اكتب نبذة قصيرة عن طموحاتك المعرفية...' : 'Write something inspiring about your academic ambitions...'}
                  />
                </div>

                {/* 5. Custom Verification Marks Selection based on pricing card subscription packages */}
                <div className="pt-2 border-t border-slate-850 space-y-2">
                  <div className="flex items-center justify-between">
                    {isUserPremium ? (
                      <span className="text-[10px] bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-md text-amber-400 font-extrabold">
                        {profileData?.planName || (isAr ? 'باقة بريميوم نشطة' : 'Premium Plan Active')}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md text-slate-400 font-bold">
                        {isAr ? 'الباقة المجانية' : 'Free Tier'}
                      </span>
                    )}
                    <label className="text-xs font-black text-white">{isAr ? 'علامة التوثيق وشارة التميز' : 'Custom Verification Mark'}</label>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold">
                      {isAr 
                        ? 'اختر علامة التحقق الراقية تليجرام أو شارات تميز كوكبية مخصصة للمظهر بجوار اسمك:' 
                        : 'Select your preferred verification rosette or customizable identity marks:'}
                    </p>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {/* Telegram star check badge option */}
                      <button
                        type="button"
                        onClick={() => {
                          setInfoBadgeSymbol('telegram');
                          setInfoBadgeColor('text-sky-400');
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all border text-center ${
                          infoBadgeSymbol === 'telegram' || infoBadgeSymbol === '✔' || !infoBadgeSymbol
                            ? 'bg-sky-500/10 border-sky-400 text-white'
                            : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900 text-slate-400'
                        }`}
                      >
                        <div className="w-7 h-7 flex items-center justify-center mb-1 bg-sky-500/5 rounded-full p-1 leading-none shrink-0">
                          <TelegramBadge className="w-5 h-5" colorClass="text-sky-400" />
                        </div>
                        <span className="text-[9px] font-bold truncate block w-full">{isAr ? 'توثيق تليجرام' : 'Telegram Check'}</span>
                      </button>

                      {/* Unlocked badges from plan list */}
                      {badgesList.map((badge, idx) => {
                        if (badge.icon === '✔') return null; // Handled dynamically above
                        return (
                          <button
                            type="button"
                            
                            onClick={() => {
                              setInfoBadgeSymbol(badge.icon);
                              setInfoBadgeColor(badge.color);
                            }}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all border text-center ${
                              infoBadgeSymbol === badge.icon 
                                ? 'bg-purple-550/10 border-purple-500 text-white' 
                                : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900 text-slate-400'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-full ${badge.color} flex items-center justify-center text-white text-xs select-none shadow-md mb-1.5 font-bold`}>
                              {badge.icon}
                            </div>
                            <span className="text-[9px] font-bold truncate block w-full">
                              {isAr ? badge.nameAr : badge.nameEn}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 6. Profile Custom Background theme selections */}
                <div className="pt-2 border-t border-slate-850 space-y-2 text-right">
                  <label className="text-xs font-black text-white block">
                    {isAr ? 'تصميم خلفية الغلاف الكوني (16 نموذج مميز)' : 'Cosmic Shield Wallpaper (16 Themes)'}
                  </label>
                  <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                    {isAr 
                      ? 'اختر المظهر والخلفية المفضلة لجعل حسابك الشخصي فريداً من نوعه:' 
                      : 'Choose your desired space theme/color wallpaper style to make your profile stand out:'}
                  </p>
                  
                  <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto p-1 border border-slate-850 rounded-xl bg-slate-950/60 text-right">
                    {backgroundOptions.map((bg) => (
                      <button
                        type="button"
                        
                        onClick={() => setInfoSelectedBgCode(bg.id)}
                        className={`p-1.5 rounded-lg border text-center transition-all flex flex-col justify-between items-center relative overflow-hidden group ${
                          infoSelectedBgCode === bg.id
                            ? 'border-indigo-400 bg-slate-900 ring-2 ring-indigo-500/10 text-white'
                            : 'border-slate-800 bg-slate-950 hover:bg-slate-900/60 text-slate-400'
                        }`}
                      >
                        <div className={`w-full h-7 rounded-sm ${bg.classes} relative overflow-hidden flex items-center justify-center border border-white/5`}>
                          <div className={`absolute top-0 right-0 w-3 h-3 rounded-full ${bg.glowingSphere1} filter blur-[2px]`} />
                          <div className={`absolute bottom-0 left-0 w-3 h-3 rounded-full ${bg.glowingSphere2} filter blur-[2px]`} />
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${bg.iconBg}`} />
                        </div>
                        <span className="text-[7.5px] font-bold block truncate w-full mt-1 text-slate-355 transition-all text-center">
                          {isAr ? bg.nameAr.split(' ')[0] + ' ' + (bg.nameAr.split(' ')[1] || '') : bg.nameEn}
                        </span>
                        {infoSelectedBgCode === bg.id && (
                          <div className="absolute top-1 left-1 bg-indigo-500 text-white rounded-full p-0.5 leading-none shadow-xs shrink-0 z-10">
                            <Check className="w-2 h-2 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(false)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 text-xs font-black cursor-pointer transition-colors"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingInfo}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-650 hover:from-purple-500 hover:to-indigo-600 text-white text-xs font-black shadow-md shadow-purple-650/15 cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    {isSavingInfo ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{isAr ? 'جاري الحفظ...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>{isAr ? 'حفظ التعديلات' : 'Save Details'}</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}
      
    </div>
  );
}
