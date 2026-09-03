import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Shield, Users, Database, LayoutDashboard, Crown, Ticket, AlertTriangle, Settings, Bell, Search, Activity, BarChart3, Trash2, Edit2, Play, PlusCircle, EyeOff, MessageSquare, Lock, ShieldCheck, Gift, Coins, WalletCards, CheckCircle2, XCircle, Loader2, ArrowUpRight, RefreshCw, UserRoundCheck } from 'lucide-react';
import { Quiz } from '../types';
import { getAdminOverviewSnapshot, getAllProfiles, sendDirectMessage, broadcastPlatformNotification, getCoupons, saveCoupon, deleteCoupon, COSMO_SYSTEM_UID, getAiPerformanceLogs, adminGrantRewardPoints, adminReviewRewardOrder, getRewardStoreOrders, getPlatformSettings, updatePlatformSettings } from '../lib/db';
import { LiquidGlassSwitch } from '../components/LiquidGlassSwitch';
import AdminRewardCatalogPanel from '../components/AdminRewardCatalogPanel';
import { getApiUrl } from '../lib/origin';
import { decryptMessage } from '../lib/encryption';

import AdminSubscriptions from '../components/AdminSubscriptions';
import AdminMotivationUsagePanel from '../components/AdminMotivationUsagePanel';
import OverlayPortal from '../components/OverlayPortal';

function DecryptedMessageItem({ msg, classId, isAr, currentUserEmail }: { msg: any; classId: string; isAr: boolean; currentUserEmail?: string }) {
  const [decrypted, setDecrypted] = useState<string>('...');

  useEffect(() => {
    let active = true;
    decryptMessage(msg.encryptedText, classId, currentUserEmail).then(res => {
      if (active) setDecrypted(res);
    });
    return () => { active = false; };
  }, [msg.encryptedText, classId, currentUserEmail]);

  return (
    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-1">
      <div className="flex justify-between items-center text-[10px] text-slate-400">
        <span className="font-bold text-slate-300">{msg.senderName}</span>
        <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
      </div>
      <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">{decrypted}</p>
    </div>
  );
}

interface AdminDashboardProps {
  quizzes: Quiz[];
  lang: 'ar' | 'en';
  onViewProfile?: (userId: string) => void;
  currentUserId?: string;
  currentUserEmail?: string;
}

export default function AdminDashboard({ quizzes, lang, onViewProfile, currentUserId, currentUserEmail }: AdminDashboardProps) {
  const isAr = lang === 'ar';
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'users' | 'quizzes' | 'subscriptions' | 'coupons' | 'settings' | 'classrooms' | 'ai_monitoring' | 'rewards' | 'motivation_usage'>('overview');
  useGSAP(() => {
    // Initial load animation for header and stats
    gsap.fromTo(
      ".admin-header-anim",
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out" }
    );
    
    gsap.fromTo(
      ".admin-nav-item",
      { opacity: 0, x: -10 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: "back.out(1.2)" }
    );
  }, { scope: containerRef });

  useGSAP(() => {
    // Animate tab content switching
    gsap.fromTo(
      ".admin-content-panel",
      { opacity: 0, y: 15, scale: 0.99 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power2.out", clearProps: "all" }
    );
  }, { scope: containerRef, dependencies: [activeAdminTab] });

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const [platformSettingsBusy, setPlatformSettingsBusy] = useState(false);
  const [platformSettingsNotice, setPlatformSettingsNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [overviewLoadError, setOverviewLoadError] = useState<string | null>(null);
  const [overviewRefreshKey, setOverviewRefreshKey] = useState(0);

  const [promoType, setPromoType] = useState('Promo Code');
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [promoDiscountPercent, setPromoDiscountPercent] = useState<number>(50);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isSendingPromo, setIsSendingPromo] = useState(false);

  // Classroom override state for Super Admin Ghost Mode
  const [adminClassrooms, setAdminClassrooms] = useState<any[]>([]);
  const [adminStudents, setAdminStudents] = useState<any[]>([]);
  const [activeAdminClassroom, setActiveAdminClassroom] = useState<any | null>(null);
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [newAdminMsgText, setNewAdminMsgText] = useState('');
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [aiMonitoringError, setAiMonitoringError] = useState<string | null>(null);
  const [rewardBalances, setRewardBalances] = useState<Record<string, any>>({});
  const [rewardOrders, setRewardOrders] = useState<any[]>([]);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantPoints, setGrantPoints] = useState(100);
  const [grantCurrency, setGrantCurrency] = useState<'points' | 'coins'>('points');
  const [grantNote, setGrantNote] = useState('');
  const [rewardNotice, setRewardNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [rewardBusy, setRewardBusy] = useState<string | null>(null);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const userListRef = useRef<HTMLDivElement>(null);

  const loadAiMonitoringLogs = async () => {
    setIsLoadingLogs(true);
    setAiMonitoringError(null);
    try {
      const logs = await getAiPerformanceLogs();
      setAiLogs(Array.isArray(logs) ? logs.filter((log) => log && typeof log === 'object') : []);
    } catch (error) {
      console.error('Failed to load AI performance logs:', error);
      setAiLogs([]);
      setAiMonitoringError(isAr ? 'تعذر تحميل سجلات مراقبة الذكاء الاصطناعي. أعد المحاولة لاحقاً.' : 'AI monitoring logs could not be loaded. Please try again later.');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    let active = true;
    getPlatformSettings()
      .then((settings) => {
        if (!active) return;
        setMaintenanceMode(settings.maintenanceMode);
        setAllowRegistrations(settings.allowRegistrations);
      })
      .catch(() => {
        if (active) setPlatformSettingsNotice({ ok: false, text: isAr ? 'تعذر تحميل إعدادات المنصة.' : 'Unable to load platform settings.' });
      });
    return () => { active = false; };
  }, [isAr]);

  const handlePlatformSettingsChange = async (nextMaintenanceMode: boolean, nextAllowRegistrations: boolean) => {
    if (platformSettingsBusy) return;
    setPlatformSettingsBusy(true);
    setPlatformSettingsNotice(null);
    try {
      const saved = await updatePlatformSettings(nextMaintenanceMode, nextAllowRegistrations);
      setMaintenanceMode(saved.maintenanceMode);
      setAllowRegistrations(saved.allowRegistrations);
      setPlatformSettingsNotice({ ok: true, text: isAr ? 'تم حفظ إعدادات المنصة وتطبيقها بنجاح.' : 'Platform settings were saved and applied.' });
    } catch (error) {
      console.error('Failed to save platform settings:', error);
      setPlatformSettingsNotice({ ok: false, text: isAr ? 'تعذر حفظ إعدادات المنصة. حاول مرة أخرى.' : 'Unable to save platform settings. Please try again.' });
    } finally {
      setPlatformSettingsBusy(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userListRef.current && !userListRef.current.contains(event.target as Node)) {
        setIsUserListOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeAdminTab === 'rewards') {
      (async () => {
        try {
          const [{ data: balances }, orders] = await Promise.all([
            supabase.from('user_reward_balances').select('user_id, points, coins, level').limit(500),
            getRewardStoreOrders(),
          ]);
          const map: Record<string, any> = {};
          (balances || []).forEach((row: any) => { map[row.user_id] = row; });
          setRewardBalances(map);
          setRewardOrders(orders);
        } catch (error: any) {
          setRewardNotice({ ok: false, text: error?.message || 'Could not load rewards data' });
        }
      })();
    }
  }, [activeAdminTab]);

  useEffect(() => {
    if (activeAdminTab === 'ai_monitoring') {
      void loadAiMonitoringLogs();
    }
  }, [activeAdminTab]);

  useEffect(() => {
    let isMounted = true;
    const loadAdminOverview = async () => {
      setIsLoadingOverview(true);
      setOverviewLoadError(null);

      const [profilesResult, couponsResult, overviewResult] = await Promise.allSettled([
        getAllProfiles(),
        getCoupons(),
        getAdminOverviewSnapshot(),
      ]);

      if (!isMounted) return;

      let hasLoadFailure = false;
      if (profilesResult.status === 'fulfilled') {
        setAllUsers(profilesResult.value);
      } else {
        hasLoadFailure = true;
        console.warn('Error loading profiles:', profilesResult.reason);
      }

      if (couponsResult.status === 'fulfilled') {
        setCoupons(Array.isArray(couponsResult.value) ? couponsResult.value : []);
      } else {
        hasLoadFailure = true;
        console.error('Error loading coupons:', couponsResult.reason);
      }

      if (overviewResult.status === 'fulfilled') {
        const data = overviewResult.value.classrooms || [];
        setAdminClassrooms(data.map((classroom: any) => ({
          ...classroom,
          createdAt: classroom.created_at || classroom.createdAt,
          creatorName: classroom.creator_name || classroom.creatorName || classroom.created_by_name || (isAr ? 'غير محدد' : 'Unknown'),
        })));
      } else {
        hasLoadFailure = true;
        console.error('Error fetching admin overview snapshot:', overviewResult.reason);
      }

      if (overviewResult.status === 'fulfilled') {
        const data = overviewResult.value.students || [];
        setAdminStudents(data.map((student: any) => ({
          ...student,
          classCode: student.class_code || student.classCode,
          studentName: student.student_name || student.studentName || student.name || (isAr ? 'طالب' : 'Student'),
          studentPhoto: student.student_photo || student.studentPhoto || null,
          avgScore: Number(student.avg_score ?? student.avgScore ?? 0),
        })));
      } else {
        hasLoadFailure = true;
        console.error('Error fetching admin students from snapshot:', overviewResult.reason);
      }

      if (hasLoadFailure) {
        setOverviewLoadError(isAr ? 'تعذر تحميل جزء من بيانات الإدارة. يمكنك إعادة المحاولة دون فقدان البيانات المعروضة.' : 'Part of the admin data could not be loaded. You can retry without losing the current view.');
      }
      setIsLoadingOverview(false);
    };

    void loadAdminOverview();
    return () => { isMounted = false; };
  }, [isAr, overviewRefreshKey]);

  // Fetch classroom messages directly from Supabase if active
  useEffect(() => {
    if (!activeAdminClassroom) return;
    (async () => {
      try {
        const { data, error } = await supabase.from('classroom_messages')
          .select('*')
          .eq('classroom_id', activeAdminClassroom.id)
          .order('created_at', { ascending: true });
        if (!error && data) {
          setAdminMessages(data.map((message: any) => ({
            ...message,
            senderId: message.sender_id || message.senderId,
            senderName: message.sender_name || message.senderName || (isAr ? 'مستخدم' : 'User'),
            senderPhoto: message.sender_photo || message.senderPhoto || null,
            encryptedText: message.encrypted_text || message.encryptedText,
            createdAt: message.created_at || message.createdAt,
          })));
        }
      } catch (e) {
        console.error('Error loading classroom messages for admin:', e);
      }
    })();
  }, [activeAdminClassroom]);

  const premiumUsersCount = allUsers.filter(u => u.is_premium).length;
  const activeAttempts = quizzes.reduce((acc, q) => acc + (q.totalPlays || 0), 0);
  const averageAttemptsPerQuiz = quizzes.length > 0 ? Math.round(activeAttempts / quizzes.length) : 0;
  const premiumAdoptionRate = allUsers.length > 0 ? Math.round((premiumUsersCount / allUsers.length) * 100) : 0;

  const adminTabs = [
    { id: 'overview', name: isAr ? 'نظرة عامة' : 'Overview', icon: LayoutDashboard },
    { id: 'users', name: isAr ? 'المستخدمين' : 'Users', icon: Users },
    { id: 'classrooms', name: isAr ? 'الفصول (الشبح 👻)' : 'Classrooms (Ghost 👻)', icon: EyeOff },
    { id: 'quizzes', name: isAr ? 'الاختبارات' : 'Quizzes', icon: Database },
    { id: 'subscriptions', name: isAr ? 'الاشتراكات' : 'Subscriptions', icon: Crown },
    { id: 'coupons', name: isAr ? 'الكوبونات' : 'Coupons', icon: Ticket },
    { id: 'ai_monitoring', name: isAr ? 'مراقبة الذكاء الاصطناعي' : 'AI Monitoring', icon: Activity },
    { id: 'rewards', name: isAr ? 'النقاط والمتجر' : 'Rewards & Store', icon: Gift },
    { id: 'motivation_usage', name: isAr ? 'استخدام التحفيز' : 'Motivation usage', icon: BarChart3 },
    { id: 'settings', name: isAr ? 'الإعدادات' : 'Settings', icon: Settings },
  ];

  return (
    <div ref={containerRef} className="space-y-6 sm:space-y-8" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="admin-header-anim relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/65 sm:p-6">
        <div className="pointer-events-none absolute -top-20 left-10 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
	        <div className="flex items-center gap-4">
	          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 p-3 text-purple-700 dark:text-purple-300">
	            <Shield className="h-full w-full" />
	          </div>
            <div className="text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
              <h2 className="font-display text-2xl font-black text-slate-900 dark:text-white">
                {isAr ? 'لوحة تحكم المسؤول' : 'Admin Dashboard'}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                {isAr ? 'إدارة المنصة، المستخدمين، والاختبارات بصلاحيات كاملة' : 'Platform management with administrative privileges'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOverviewRefreshKey((value) => value + 1)}
            disabled={isLoadingOverview}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingOverview ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'تحديث البيانات' : 'Refresh data'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeAdminTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveAdminTab(tab.id as any)}
                aria-current={isActive ? 'page' : undefined}
                className={`admin-nav-item flex min-h-11 items-center gap-3 px-4 py-3.5 rounded-2xl transition-all whitespace-nowrap lg:whitespace-normal font-bold text-sm ${
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'glass-panel text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'opacity-100' : 'opacity-70'}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 min-h-[500px] rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/55 sm:p-8">
          
            <div className="admin-content-panel">
              {activeAdminTab === 'overview' && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600 dark:text-purple-300">{isAr ? 'نبض المنصة' : 'Platform pulse'}</p>
                      <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{isAr ? 'نظرة تشغيلية موثوقة' : 'A trustworthy operating view'}</h3>
                    </div>
                    <p className="max-w-lg text-xs leading-5 text-slate-600 dark:text-slate-400">{isAr ? 'تعرض المؤشرات بيانات المستخدمين والاختبارات والفصول المتاحة حاليًا، دون تقديرات إيرادات غير مؤكدة.' : 'Metrics use the currently available users, quizzes, and classrooms without unverified revenue estimates.'}</p>
                  </div>

                  {overviewLoadError && (
                    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{overviewLoadError}</span>
                    </div>
                  )}

                  {isLoadingOverview ? (
                    <div aria-busy="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {[0, 1, 2, 3].map((index) => <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900" />)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        { label: isAr ? 'إجمالي المستخدمين' : 'Total users', value: allUsers.length.toLocaleString(), caption: isAr ? 'حسابات ظاهرة للإدارة' : 'Accounts visible to admin', icon: Users, color: 'text-blue-600 dark:text-blue-300', bg: 'bg-blue-500/10' },
                        { label: isAr ? 'الفصول النشطة' : 'Classrooms', value: adminClassrooms.length.toLocaleString(), caption: isAr ? `${adminStudents.length} عضوية طالب` : `${adminStudents.length} learner memberships`, icon: UserRoundCheck, color: 'text-purple-600 dark:text-purple-300', bg: 'bg-purple-500/10' },
                        { label: isAr ? 'إجمالي الاختبارات' : 'Published quizzes', value: quizzes.length.toLocaleString(), caption: isAr ? `${averageAttemptsPerQuiz} متوسط محاولة لكل اختبار` : `${averageAttemptsPerQuiz} average attempts per quiz`, icon: Database, color: 'text-emerald-600 dark:text-emerald-300', bg: 'bg-emerald-500/10' },
                        { label: isAr ? 'تبني الباقات المدفوعة' : 'Premium adoption', value: `${premiumAdoptionRate}%`, caption: isAr ? `${premiumUsersCount} مستخدمًا بباقات مدفوعة` : `${premiumUsersCount} paid members`, icon: Crown, color: 'text-amber-600 dark:text-amber-300', bg: 'bg-amber-500/10' },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/55">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{stat.label}</p>
                              <h4 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{stat.value}</h4>
                            </div>
                            <div className={`rounded-2xl p-3 ${stat.bg} ${stat.color}`}><stat.icon className="h-5 w-5" /></div>
                          </div>
                          <p className="mt-4 text-[11px] font-medium leading-4 text-slate-500 dark:text-slate-400">{stat.caption}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {[
                      { tab: 'users', title: isAr ? 'إدارة المستخدمين' : 'Review users', text: isAr ? 'ابحث في الملفات والحالة قبل أي إجراء.' : 'Search profiles and account status before taking action.', icon: Users },
                      { tab: 'ai_monitoring', title: isAr ? 'متابعة الذكاء الاصطناعي' : 'Review AI activity', text: isAr ? 'راجع السجلات ونتائج الطلبات الفعلية.' : 'Inspect logs and the outcome of real requests.', icon: Activity },
                      { tab: 'rewards', title: isAr ? 'النقاط والمتجر' : 'Rewards operations', text: isAr ? 'تابع الأرصدة والطلبات المؤكدة.' : 'Review verified balances and store orders.', icon: Gift },
                    ].map((action) => {
                      const ActionIcon = action.icon;
                      return (
                        <button key={action.tab} type="button" onClick={() => setActiveAdminTab(action.tab as typeof activeAdminTab)} className="group min-h-32 rounded-3xl border border-slate-200 bg-white p-5 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:border-purple-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/45 dark:hover:border-purple-500/60" style={{ textAlign: isAr ? 'right' : 'left' }}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="rounded-2xl bg-purple-500/10 p-3 text-purple-600 dark:text-purple-300"><ActionIcon className="h-5 w-5" /></div>
                            <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                          </div>
                          <h4 className="mt-4 text-sm font-black text-slate-900 dark:text-white">{action.title}</h4>
                          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">{action.text}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeAdminTab === 'users' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                        {isAr ? 'إدارة المستخدمين' : 'User Management'}
                     </h3>
                     <div className="relative">
                        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-slate-400" />
                        <input 
                          type="text" 
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder={isAr ? 'بحث عن مستخدم...' : 'Search a user...'} 
                          className="pl-4 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                     </div>
                  </div>
                  <div className="glass-panel p-4 rounded-3xl overflow-hidden overflow-x-auto border border-slate-200/50 dark:border-slate-700/50">
                    <table className="w-full text-sm text-left" dir={isAr ? 'rtl' : 'ltr'}>
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-800/50">
                        <tr>
                          <th className="px-6 py-3">{isAr ? 'الاسم' : 'Name'}</th>
                          <th className="px-6 py-3">{isAr ? 'البريد' : 'Email'}</th>
                          <th className="px-6 py-3">{isAr ? 'حالة الحساب' : 'Status'}</th>
                          <th className="px-6 py-3 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers
                          .filter((u: any) => {
                            const q = userSearchQuery.trim().toLowerCase();
                            if (!q) return true;
                            return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.uid || u.id || '').toLowerCase().includes(q);
                          })
                          .slice(0, userSearchQuery.trim() ? 100 : 50)
                          .map((u: any, idx) => (
                           <tr key={u.uid || u.id || idx} className="border-b border-slate-200/50 dark:border-slate-700/50">
                             <td 
                               title={isAr ? "عرض الملف الشخصي" : "View profile"}
                               onClick={() => onViewProfile?.(u.uid || u.id)}
                               className="px-6 py-4 font-bold text-slate-800 dark:text-white flex items-center justify-start gap-2 cursor-pointer hover:text-primary transition-colors"
                             >
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                                  {u.photo_url ? <img src={u.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xs">{u.name?.charAt(0) || 'U'}</div>}
                               </div>
                               {u.name || 'User'}
                             </td>
                             <td className="px-6 py-4 text-slate-500">{u.email || u.uid}</td>
                             <td className="px-6 py-4">
                                <span className={`px-2 py-1 ${u.is_premium ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'} rounded-md text-xs font-bold`}>
                                  {u.is_premium ? 'Premium' : 'Active'}
                                </span>
                             </td>
                             <td className="px-6 py-4 flex justify-center gap-2">
                               <button onClick={() => onViewProfile?.(u.uid || u.id)} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-lg hover:bg-slate-200" title="Profile"><Users className="w-4 h-4" /></button>
                             </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeAdminTab === 'quizzes' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                        {isAr ? 'إدارة الاختبارات' : 'Quiz Management'}
                     </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {quizzes.map((quiz, idx) => (
                        <div key={quiz.id || idx} className="glass-panel p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between">
                           <div>
                              <h4 className="font-bold text-slate-800 dark:text-white line-clamp-1">{quiz.title}</h4>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{quiz.description}</p>
                           </div>
                           <div className="flex items-center justify-between mt-4">
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-md font-bold">General</span>
                              <div className="flex items-center gap-1">
                                 <button className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                 <button className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
                </div>
              )}

              {activeAdminTab === 'subscriptions' && (
                <AdminSubscriptions lang={lang} onViewProfile={onViewProfile} />
              )}

              {activeAdminTab === 'coupons' && (
                 <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                         {isAr ? 'إرسال أكواد خصم وعروض' : 'Send Promo Codes & Offers'}
                      </h3>
                   </div>
                   <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                         <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">{isAr ? 'نوع التنبيه' : 'Notification Type'}</label>
                            <select 
                              value={promoType} 
                              onChange={e => setPromoType(e.target.value)} 
                              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white"
                            >
                              <option value="Promo Code">{isAr ? 'كود خصم (ترويجي)' : 'Promo Code'}</option>
                              <option value="Special Offer">{isAr ? 'عرض خاص' : 'Special Offer'}</option>
                              <option value="System Alert">{isAr ? 'تنبيه نظام' : 'System Alert'}</option>
                            </select>
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">{isAr ? 'الكود أو العرض' : 'Code / Offer Name'}</label>
                            <input 
                              type="text" 
                              value={promoCode} 
                              onChange={e => setPromoCode(e.target.value)} 
                              placeholder="e.g. FREE50" 
                              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white" 
                            />
                         </div>
                         {promoType === 'Promo Code' && (
                           <div>
                              <label className="text-xs font-bold text-slate-500 block mb-1">{isAr ? 'نسبة الخصم (%)' : 'Discount Percentage (%)'}</label>
                              <input 
                                type="number" 
                                min="1"
                                max="100"
                                value={promoDiscountPercent} 
                                onChange={e => setPromoDiscountPercent(Number(e.target.value))} 
                                placeholder="50" 
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white" 
                              />
                           </div>
                         )}
                          <div>
                             <label className="text-xs font-bold text-slate-500 block mb-1">{isAr ? 'نص الرسالة' : 'Message Body'}</label>
                             <textarea 
                               rows={3} 
                               value={promoMessage} 
                               onChange={e => setPromoMessage(e.target.value)} 
                               placeholder={isAr ? 'اكتب رسالة العرض أو كود هنا للاعضاء...' : 'Write your offer or code here...'} 
                               className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary resize-none text-slate-800 dark:text-white"
                             ></textarea>
                          </div>
                          <button 
                            disabled={isSendingPromo || !promoMessage || !promoCode}
                            onClick={async () => {
                              setIsSendingPromo(true);
                              try {
                                if (promoType === 'Promo Code') {
                                  const codeId = promoCode.trim().toUpperCase();
                                  const couponObj = {
                                    id: codeId,
                                    code: promoCode.trim(),
                                    discountPercent: promoDiscountPercent || 50,
                                    maxUses: 9999,
                                    usedCount: 0,
                                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                                    isActive: true,
                                    createdAt: new Date().toISOString()
                                  };
                                  await saveCoupon(couponObj);
                                  const list = await getCoupons();
                                  if (Array.isArray(list)) {
                                    setCoupons(list);
                                  }
                                }

                                await broadcastPlatformNotification(
                                  promoType === 'Promo Code' ? (isAr ? '🎉 كود خصم جديد!' : '🎉 New Promo Code!') : (isAr ? '🎁 عرض خاص!' : '🎁 Special Offer!'),
                                  `${promoCode}: ${promoMessage}` + (isAr ? ' (متوفر الآن في صفحة الدفع)' : ' (Now available on checkout)')
                                );

                                for (const user of allUsers) {
                                  if (user.userId && user.userId !== 'anonymous') {
                                    try {
                                      await sendDirectMessage(
                                        COSMO_SYSTEM_UID,
                                        isAr ? 'كوزمو 🤖' : 'AI 🤖',
                                        user.userId,
                                        user.name || 'Student',
                                        `${promoMessage} ${promoType === 'Promo Code' ? `Code: ${promoCode}` : ''}`
                                      );
                                    } catch (err) {
                                      console.log('Failed to DM user', user.userId);
                                    }
                                  }
                                }

                                alert(isAr ? `تم إرسال العرض بنجاح وبدأ كوزمو بإرسال الرسائل لجميع الـ ${allUsers.length} مستخدمين!` : `Offer sent successfully, AI is messaging all ${allUsers.length} users!`);
                                setPromoCode('');
                                setPromoMessage('');
                              } catch (err) {
                                alert('Error sending promo.');
                              } finally {
                                setIsSendingPromo(false);
                              }
                            }} 
                            className="w-full py-3 bg-gradient-to-r from-primary to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {isSendingPromo ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال التنبيه الآن' : 'Send Notification Now')}
                          </button>
                       </div>

                       <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                          <h4 className="font-bold text-sm mb-4 text-slate-800 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-700">
                            {isAr ? 'الأكواد والعروض الفعالة' : 'Active Codes & Offers'}
                          </h4>
                          <div className="space-y-3">
                            {coupons.length === 0 ? (
                              <div className="text-center p-6 text-xs text-slate-400">
                                {isAr ? 'لا توجد أكواد خصم نشطة حالياً. يمكنك إنشاء كود جديد.' : 'No active coupon codes. Create a new one.'}
                              </div>
                            ) : (
                              coupons.map((coupon) => (
                                <div key={coupon.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm flex items-center justify-between border border-slate-200 dark:border-slate-700 animate-none">
                                  <div>
                                    <div className="font-bold text-emerald-500">{coupon.code}</div>
                                    <div className="text-[10px] text-slate-500">
                                      {isAr ? `خصم %${coupon.discountPercent} على الاشتراكات` : `${coupon.discountPercent}% off on subscriptions`}
                                    </div>
                                  </div>
                                  <button 
                                    onClick={async () => {
                                      if (confirm(isAr ? `هل أنت متأكد من حذف الكود ${coupon.code}؟` : `Are you sure you want to delete coupon ${coupon.code}?`)) {
                                        try {
                                          await deleteCoupon(coupon.id);
                                          const list = await getCoupons();
                                          if (Array.isArray(list)) {
                                            setCoupons(list);
                                          }
                                        } catch (err) {
                                          alert(isAr ? 'فشل حذف الكوبون' : 'Failed to delete coupon');
                                        }
                                      }
                                    }}
                                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-lg cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                       </div>
                    </div>
                 </div>
              )}

              {activeAdminTab === 'classrooms' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <EyeOff className="w-5 h-5 text-purple-500" />
                        <span>{isAr ? 'الرقابة العامة والتحكم الفائق (وضع الشبح 👻)' : 'Global Override & Stealth Ghost Mode'}</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {isAr 
                          ? 'صلاحيات المسؤول الفائق (Super Admin): استعراض ودخول كافة الفصول الدراسية وتشفير E2EE دون ترك أي سجل أو إرسال إشعارات.'
                          : 'Super Admin master authorization: browse and intercept all classrooms and decrypt E2EE logs without leaving any footprints.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminClassrooms.map(c => {
                      const studentsCount = adminStudents.filter(s => s.classCode === c.code).length;
                      return (
                        <div key={c.id || c.code} className="glass-panel p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 flex flex-col justify-between space-y-4 hover:border-purple-500/30 transition-all relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all" />
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-400 text-[10px] font-mono font-bold">
                                {c.code}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="font-black text-slate-800 dark:text-white text-sm line-clamp-1">{c.name}</h4>
                            <p className="text-xs text-slate-500">
                              {isAr ? `المعلم: ${c.creatorName}` : `Teacher: ${c.creatorName}`}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-500 font-bold">
                            <span>{isAr ? `👥 الطلاب: ${studentsCount}` : `👥 Enrolled: ${studentsCount}`}</span>
                            <button
                              onClick={() => {
                                setActiveAdminClassroom(c);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm shadow-purple-500/15 cursor-pointer"
                            >
                              <span>{isAr ? 'دخول الشبح 👻' : 'Ghost Entry 👻'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {adminClassrooms.length === 0 && (
                      <div className="col-span-full text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-3xl">
                        <EyeOff className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-sm font-bold">{isAr ? 'لا توجد فصول دراسية منشأة حالياً.' : 'No classrooms created yet on the platform.'}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeAdminTab === 'rewards' && (
                <div className="space-y-8 admin-content-panel">
                  {rewardNotice && (
                    <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold ${rewardNotice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'}`}>
                      <span>{rewardNotice.text}</span>
                      <button type="button" onClick={() => setRewardNotice(null)}><XCircle className="h-4 w-4" /></button>
                    </div>
                  )}

                  <AdminRewardCatalogPanel lang={lang} />

                  <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 dark:border-amber-900/50 dark:from-amber-950/20 dark:to-orange-950/20">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><Gift className="h-5 w-5" /></div>
                      <div><h3 className="text-lg font-black text-slate-900 dark:text-white">{isAr ? 'منح نقاط يدوية' : 'Manual points grant'}</h3><p className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'امنح نقاطاً للمستخدم من خلال RPC محمي بصلاحية السوبر أدمن.' : 'Grant points through an RPC protected by the super-admin role.'}</p></div>
                    </div>
	                    <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_.7fr_1.5fr_auto]">
	                      {/* Custom Searchable User Dropdown */}
	                      <div className="relative" ref={userListRef}>
	                        <button
	                          type="button"
	                          onClick={() => setIsUserListOpen(!isUserListOpen)}
	                          className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white transition-all hover:border-amber-300"
	                        >
	                          <span className="truncate">
	                            {grantUserId 
	                              ? allUsers.find(u => (u.userId || u.uid) === grantUserId)?.name || 'Unknown User'
	                              : (isAr ? 'اختر مستخدماً' : 'Select a user')}
	                          </span>
	                          <Search className={`h-4 w-4 transition-transform ${isUserListOpen ? 'rotate-180' : ''}`} />
	                        </button>
	                        
	                        {isUserListOpen && (
	                          <div className="absolute top-full left-0 right-0 z-[100] mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in slide-in-from-top-2 duration-200">
	                            <div className="sticky top-0 mb-2 bg-white dark:bg-slate-900 pb-2 border-b border-slate-100 dark:border-slate-800">
	                              <input
	                                type="text"
	                                autoFocus
	                                placeholder={isAr ? 'بحث عن مستخدم...' : 'Search users...'}
	                                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-amber-500 dark:border-slate-800 dark:bg-slate-950"
	                                onChange={(e) => setUserSearchQuery(e.target.value)}
	                                value={userSearchQuery}
	                              />
	                            </div>
	                            <div className="space-y-1">
	                              {[...allUsers]
	                                .filter(u => (u.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()))
	                                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
	                                .map((user) => {
	                                  const id = user.userId || user.uid;
	                                  return (
	                                    <button
	                                      key={id}
	                                      type="button"
	                                      onClick={() => {
	                                        setGrantUserId(id);
	                                        setIsUserListOpen(false);
	                                        setUserSearchQuery('');
	                                      }}
	                                      className={`w-full flex flex-col items-start rounded-xl px-3 py-2 text-right transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20 ${grantUserId === id ? 'bg-amber-50 dark:bg-amber-900/30' : ''}`}
	                                    >
	                                      <span className="text-sm font-black text-slate-800 dark:text-white">{user.name || 'Unknown User'}</span>
	                                      <span className="text-[10px] text-slate-400 font-mono truncate w-full">{id}</span>
	                                    </button>
	                                  );
	                                })}
	                            </div>
	                          </div>
	                        )}
	                      </div>

	                      <select value={grantCurrency} onChange={(event) => setGrantCurrency(event.target.value as any)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                        <option value="points">{isAr ? 'نقاط ✦' : 'Points ✦'}</option>
                        <option value="coins">{isAr ? 'عملات ◈' : 'Coins ◈'}</option>
                      </select>
                      <input type="number" min={1} max={1000000} value={grantPoints} onChange={(event) => setGrantPoints(Number(event.target.value))} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" placeholder={isAr ? 'الكمية' : 'Amount'} />
                      <input value={grantNote} onChange={(event) => setGrantNote(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" placeholder={isAr ? 'ملاحظة المنح (اختياري)' : 'Grant note (optional)'} />
                      <button type="button" disabled={!grantUserId || grantPoints <= 0 || rewardBusy === 'grant'} onClick={async () => { setRewardBusy('grant'); const result = await adminGrantRewardPoints(grantUserId, grantPoints, grantNote, grantCurrency); setRewardBusy(null); if (result?.success) { setRewardNotice({ ok: true, text: isAr ? `تمت إضافة ${grantPoints} ${grantCurrency === 'points' ? 'نقطة' : 'عملة'} بنجاح.` : `${grantPoints} ${grantCurrency} granted successfully.` }); setRewardBalances((current) => ({ ...current, [grantUserId]: { ...(current[grantUserId] || {}), [grantCurrency]: Number(current[grantUserId]?.[grantCurrency] || 0) + grantPoints } })); setGrantNote(''); } else setRewardNotice({ ok: false, text: result?.message || 'Grant failed' }); }} className="flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-xs font-black text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50">{rewardBusy === 'grant' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}{isAr ? 'إضافة المكافأة' : 'Grant reward'}</button>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-black text-slate-900 dark:text-white">{isAr ? 'أرصدة المستخدمين' : 'User reward balances'}</h3><p className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'الرصيد الموحد الذي يظهر في Header والملف الشخصي.' : 'The canonical balance shown in Header and Profile.'}</p></div><Coins className="h-6 w-6 text-sky-500" /></div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {[...allUsers]
                        .filter(u => rewardBalances[u.userId || u.uid])
                        .sort((a, b) => (rewardBalances[b.userId || b.uid]?.points || 0) - (rewardBalances[a.userId || a.uid]?.points || 0))
                        .slice(0, 60)
                        .map((user) => { 
                          const id = user.userId || user.uid; 
                          const balance = rewardBalances[id] || {}; 
                          return (
                            <div key={id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-black text-slate-800 dark:text-white">{user.name || user.displayName || 'User'}</span>
                                <span className="text-[10px] font-bold text-slate-400">Lv. {balance.level || 1}</span>
                              </div>
                              <div className="mt-3 flex items-center gap-4 text-xs font-black">
                                <span className="text-amber-600 dark:text-amber-300">✦ {Number(balance.points || 0).toLocaleString()}</span>
                                <span className="text-sky-600 dark:text-sky-300">◈ {Number(balance.coins || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          ); 
                        })
                      }
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-black text-slate-900 dark:text-white">{isAr ? 'طلبات شراء النقاط' : 'Points purchase orders'}</h3><p className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'راجع التحويلات الواردة من Vodafone Cash وInstaPay ثم أضف النقاط.' : 'Review Vodafone Cash and InstaPay transfers before adding points.'}</p></div><WalletCards className="h-6 w-6 text-emerald-500" /></div>
                    <div className="space-y-3">{rewardOrders.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm font-bold text-slate-400 dark:border-slate-700">{isAr ? 'لا توجد طلبات معلقة.' : 'No payment orders yet.'}</p> : rewardOrders.map((order) => <div key={order.id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{order.payment_method === 'vodafone_cash' ? 'Vodafone Cash' : 'InstaPay'}</span><span className={`rounded-lg px-2 py-1 text-[10px] font-black ${order.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : order.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'}`}>{order.status}</span></div><p className="mt-2 truncate text-xs font-black text-slate-800 dark:text-white">{order.user_id} · {order.item_id}</p><p className="mt-1 text-xs text-slate-500">{Number(order.amount_points || 0).toLocaleString()} {isAr ? 'نقطة' : 'points'} · {order.amount_egp} EGP · {order.payment_reference || (isAr ? 'بدون رقم عملية' : 'No reference')}</p><p className="mt-1 text-[10px] text-slate-400">{new Date(order.created_at).toLocaleString()}</p>{order.receipt_url && <a href={order.receipt_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[10px] font-black text-primary hover:underline">{isAr ? 'فتح الإيصال' : 'Open receipt'}</a>}</div>{order.status === 'pending' && <div className="flex shrink-0 gap-2"><button type="button" disabled={rewardBusy === order.id} onClick={async () => { setRewardBusy(order.id); const result = await adminReviewRewardOrder(order.id, 'approved'); setRewardBusy(null); if (result?.success) { setRewardOrders((orders) => orders.map((item) => item.id === order.id ? { ...item, status: 'approved' } : item)); setRewardNotice({ ok: true, text: isAr ? `تم اعتماد الطلب وإضافة ${result.points_added || order.amount_points} نقطة.` : `Order approved and ${result.points_added || order.amount_points} points added.` }); } else setRewardNotice({ ok: false, text: result?.message || 'Approval failed' }); }} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />{isAr ? 'اعتماد' : 'Approve'}</button><button type="button" disabled={rewardBusy === order.id} onClick={async () => { setRewardBusy(order.id); const result = await adminReviewRewardOrder(order.id, 'rejected'); setRewardBusy(null); if (result?.success) { setRewardOrders((orders) => orders.map((item) => item.id === order.id ? { ...item, status: 'rejected' } : item)); setRewardNotice({ ok: true, text: isAr ? 'تم رفض الطلب.' : 'Order rejected.' }); } else setRewardNotice({ ok: false, text: result?.message || 'Rejection failed' }); }} className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-[11px] font-black text-white disabled:opacity-50"><XCircle className="h-4 w-4" />{isAr ? 'رفض' : 'Reject'}</button></div>}</div>)}</div>
                  </section>
                </div>
              )}
              {activeAdminTab === 'motivation_usage' && <AdminMotivationUsagePanel lang={lang} />}
              {activeAdminTab === 'ai_monitoring' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                      {isAr ? 'مراقبة أداء محرك الذكاء الاصطناعي' : 'AI Engine Performance Monitoring'}
                    </h3>
                    <button 
                      onClick={() => void loadAiMonitoringLogs()}
                      disabled={isLoadingLogs}
                      className="text-xs font-bold text-primary hover:underline disabled:cursor-wait disabled:opacity-60"
                    >
                      {isAr ? 'تحديث البيانات' : 'Refresh Data'}
                    </button>
                  </div>

                  {aiMonitoringError && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-700 dark:text-amber-300">
                      {aiMonitoringError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-panel p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? 'إجمالي الطلبات (آخر 100)' : 'Total Requests (Last 100)'}</p>
                      <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{aiLogs.length}</h4>
                    </div>
                    <div className="glass-panel p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? 'متوسط زمن الاستجابة' : 'Avg Latency'}</p>
                      <h4 className="text-2xl font-black text-emerald-500 mt-1">
                        {aiLogs.length > 0 ? Math.round(aiLogs.reduce((acc, log) => acc + (log.latency_ms || 0), 0) / aiLogs.length) : 0} ms
                      </h4>
                    </div>
                    <div className="glass-panel p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? 'معدل النجاح' : 'Success Rate'}</p>
                      <h4 className="text-2xl font-black text-blue-500 mt-1">
                        {aiLogs.length > 0 ? Math.round((aiLogs.filter(l => l.status === 'success').length / aiLogs.length) * 100) : 0}%
                      </h4>
                    </div>
                  </div>

                  <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 overflow-x-auto">
                    <table className="min-w-[760px] w-full text-sm text-left" dir={isAr ? 'rtl' : 'ltr'}>
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-800/50">
                        <tr>
                          <th className="px-4 py-3">{isAr ? 'العملية' : 'Operation'}</th>
                          <th className="px-4 py-3">{isAr ? 'المزود' : 'Provider'}</th>
                          <th className="px-4 py-3">{isAr ? 'الـ Chunks' : 'Chunks'}</th>
                          <th className="px-4 py-3">{isAr ? 'الصفحات' : 'Pages'}</th>
                          <th className="px-4 py-3">{isAr ? 'الحالة' : 'Status'}</th>
                          <th className="px-4 py-3">{isAr ? 'الزمن' : 'Latency'}</th>
                          <th className="px-4 py-3">{isAr ? 'التفاصيل' : 'Details'}</th>
                          <th className="px-4 py-3">{isAr ? 'التاريخ' : 'Date'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingLogs ? (
                          <tr><td colSpan={8} className="text-center py-10 text-slate-400">{isAr ? 'جاري التحميل...' : 'Loading...'}</td></tr>
                        ) : aiLogs.length === 0 ? (
                          <tr><td colSpan={8} className="text-center py-10 text-slate-400">{isAr ? 'لا توجد طلبات ذكاء اصطناعي مسجلة بعد. ستظهر محاولات النجاح والفشل هنا تلقائياً.' : 'No AI requests are recorded yet. Both successful and failed attempts will appear here automatically.'}</td></tr>
                        ) : aiLogs.map((log, i) => (
                          <tr key={log.id || i} className="border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50/30 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${log.operation === 'extraction' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {log.operation}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500">{log.provider}</td>
                            <td className="px-4 py-3 text-slate-500">{log.chunk_count || 1}</td>
                            <td className="px-4 py-3 text-slate-500">{log.total_pages || 1}</td>
                            <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-600 dark:text-rose-300'}`}>{log.status === 'success' ? (isAr ? 'نجاح' : 'Success') : (isAr ? 'فشل' : 'Error')}</span></td>
                            <td className="px-4 py-3 font-mono text-xs">{log.latency_ms}ms</td>
                            <td className="max-w-56 truncate px-4 py-3 text-xs text-slate-500" title={log.error_message || ''}>{log.error_message || '—'}</td>
                            <td className="px-4 py-3 text-slate-400 text-[10px]">{new Date(log.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeAdminTab === 'settings' && (
                 <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                         {isAr ? 'إعدادات المنصة' : 'Platform Settings'}
                      </h3>
                   </div>
                   {platformSettingsNotice && (
                     <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold ${platformSettingsNotice.ok ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300'}`}>
                       {platformSettingsNotice.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                       <span>{platformSettingsNotice.text}</span>
                     </div>
                   )}
                   <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                         <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">{isAr ? 'وضع الصيانة' : 'Maintenance Mode'}</h4>
                            <p className="text-xs text-slate-500">{isAr ? 'إيقاف المنصة مؤقتاً للتحديثات' : 'Temporarily disable the platform for updates'}</p>
                         </div>
                         <LiquidGlassSwitch checked={maintenanceMode} onChange={(checked) => void handlePlatformSettingsChange(checked, allowRegistrations)} size="sm" disabled={platformSettingsBusy} ariaLabel={isAr ? 'تبديل وضع الصيانة' : 'Toggle maintenance mode'} />
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                         <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">{isAr ? 'السماح بتسجيل حسابات جديدة' : 'Allow New Registrations'}</h4>
                            <p className="text-xs text-slate-500">{isAr ? 'فتح باب التسجيل للمستخدمين الجدد' : 'Open registration for new users'}</p>
                         </div>
                         <LiquidGlassSwitch checked={allowRegistrations} onChange={(checked) => void handlePlatformSettingsChange(maintenanceMode, checked)} size="sm" disabled={platformSettingsBusy} ariaLabel={isAr ? 'تبديل السماح بالتسجيلات الجديدة' : 'Toggle new registrations'} />
                      </div>
                   </div>
                 </div>
              )}
            </div>
          
        </div>
      </div>

      {/* GHOST MODE INTERACTION OVERLAY MODAL */}
      
        {activeAdminClassroom && (
          <OverlayPortal>
          <div
            
            
            
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
          >
            <div
              
              
              
              className="my-auto w-full max-w-4xl bg-[#090514] border border-purple-500/20 rounded-[32px] p-6 md:p-8 shadow-2xl relative max-h-[90dvh] overflow-y-auto space-y-6"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center font-bold">
                    👻
                  </div>
                  <div className="text-right sm:text-left" style={{ textAlign: isAr ? 'right' : 'left' }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>{activeAdminClassroom.name}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[8px] tracking-wide uppercase font-bold">
                        {isAr ? 'بث تجسسي نشط' : 'Active Ghost Stream'}
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {isAr 
                        ? `بوابة الشبح الفائقة | المعلم: ${activeAdminClassroom.creatorName} | الكود: ${activeAdminClassroom.code}`
                        : `Admin Ghost Portal | Teacher: ${activeAdminClassroom.creatorName} | Code: ${activeAdminClassroom.code}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveAdminClassroom(null)}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Students roster and analytics */}
                <div className="space-y-4">
                  <h4 className="font-black text-white text-xs flex items-center gap-1.5" style={{ justifyContent: isAr ? 'flex-end' : 'flex-start' }}>
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>{isAr ? 'سجل الطلاب المنضمين (تخطي التحقق)' : 'Bypassed Enrolled Students'}</span>
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                    {adminStudents.filter(s => s.classCode === activeAdminClassroom.code).map((s, idx) => (
                      <div key={s.id || idx} className="p-3 bg-slate-950/60 rounded-xl border border-slate-900/80 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-200 overflow-hidden text-[10px]">
                            {s.studentPhoto ? <img src={s.studentPhoto} alt={s.studentName} className="w-full h-full object-cover" /> : s.studentName.charAt(0)}
                          </div>
                          <div className="text-right sm:text-left" style={{ textAlign: isAr ? 'right' : 'left' }}>
                            <span className="font-bold text-white block">{s.studentName}</span>
                            <span className="text-[8px] text-slate-400">
                              {s.role === 'co-moderator' ? '⭐️ Co-Moderator' : 'Student'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                          <span>Avg: {s.avgScore}%</span>
                        </div>
                      </div>
                    ))}

                    {adminStudents.filter(s => s.classCode === activeAdminClassroom.code).length === 0 && (
                      <p className="text-center py-6 text-slate-600 text-xs">{isAr ? 'لا يوجد طلاب منضمين حالياً' : 'No students joined'}</p>
                    )}
                  </div>
                </div>

                {/* E2EE Chat log & Master audit recovery */}
                <div className="space-y-4">
                  <h4 className="font-black text-white text-xs flex items-center justify-between" style={{ flexDirection: isAr ? 'row-reverse' : 'row' }}>
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-purple-400" />
                      <span>{isAr ? 'مراقبة المحادثات المشفرة (E2EE)' : 'E2EE Secure Chat Monitor'}</span>
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-bold rounded-lg flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{isAr ? 'محلول التشفير الفوري' : 'Decrypted Live'}</span>
                    </span>
                  </h4>

                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-3">
                    <div className="h-[200px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
                      {adminMessages.map(msg => (
                        <DecryptedMessageItem
                          key={msg.id}
                          msg={msg}
                          classId={activeAdminClassroom.id}
                          isAr={isAr}
                          currentUserEmail={currentUserEmail}
                        />
                      ))}

                      {adminMessages.length === 0 && (
                        <p className="text-center py-10 text-slate-600 text-xs">{isAr ? 'لا توجد رسائل في هذا الفصل بعد' : 'No messages in this classroom yet'}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={isAr ? 'إرسال كمسؤول خفي...' : 'Send as stealth admin...'}
                        value={newAdminMsgText}
                        onChange={(e) => setNewAdminMsgText(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                        style={{ textAlign: isAr ? 'right' : 'left' }}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            const val = newAdminMsgText.trim();
                            if (!val) return;
                            setNewAdminMsgText('');

                            // Encrypt text string locally using classroom symmetric key
                            const { encryptMessage } = await import('../lib/encryption');
                            const cipher = await encryptMessage(val, activeAdminClassroom.id);

                            fetch(getApiUrl(`/api/classrooms/${activeAdminClassroom.id}/messages`), {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                senderId: currentUserId || 'admin-stealth',
                                senderName: isAr ? 'المشرف العام (تخفي) 👻' : 'Super Admin (Stealth) 👻',
                                senderPhoto: null,
                                encryptedText: cipher,
                              }),
                            })
                            .then(() => {
                              // Reload messages
                              fetch(getApiUrl(`/api/classrooms/${activeAdminClassroom.id}/messages`))
                                .then(r => r.json())
                                .then(d => { if (Array.isArray(d)) setAdminMessages(d); });
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </OverlayPortal>
        )}
      
    </div>
  );
}
