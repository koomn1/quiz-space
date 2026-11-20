import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  Shield, Users, Database, LayoutDashboard, Crown, Ticket, AlertTriangle,
  Settings, Search, Activity, Trash2, Edit2,
  EyeOff, Lock, ShieldCheck, Gift, Coins,
  WalletCards, CheckCircle2, XCircle, Loader2, ArrowUpRight, RefreshCw,
  UserRoundCheck, BookOpen, Sparkles, X, Check, Copy
} from 'lucide-react';
import { Quiz } from '../types';
import {
  getAdminOverviewSnapshot, getAllProfiles, sendDirectMessage,
  broadcastPlatformNotification, getCoupons, saveCoupon, deleteCoupon,
  COSMO_SYSTEM_UID, getAiPerformanceLogs, adminGrantRewardPoints,
  adminReviewRewardOrder, getRewardStoreOrders, getPlatformSettings,
  updatePlatformSettings, getPendingPaymentRequestsCount, getPendingEssayReviews
} from '../lib/db';
import { LiquidGlassSwitch } from '../components/LiquidGlassSwitch';
import AdminRewardCatalogPanel from '../components/AdminRewardCatalogPanel';
import { getApiUrl } from '../lib/origin';
import { decryptMessage } from '../lib/encryption';
import { EssayReviewModal } from '../components/EssayReviewModal';
import AdminSubscriptions from '../components/AdminSubscriptions';
import OverlayPortal from '../components/OverlayPortal';
import { showToast, showAppMessage } from '../components/Toast';
import { CountUp, ShinyText } from '../components/reactbits';

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
    <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
      <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
        <span className="font-bold text-slate-800 dark:text-slate-200">{msg.senderName}</span>
        <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
      </div>
      <p className="text-xs text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">{decrypted}</p>
    </div>
  );
}

interface AdminDashboardProps {
  quizzes: Quiz[];
  lang: 'ar' | 'en';
  onViewProfile?: (userId: string) => void;
  onEditQuiz?: (quiz: Quiz) => void;
  onDeleteQuiz?: (quizId: string) => Promise<void>;
  currentUserId?: string;
  currentUserEmail?: string;
}

export default function AdminDashboard({
  quizzes,
  lang,
  onViewProfile,
  onEditQuiz,
  onDeleteQuiz,
  currentUserId,
  currentUserEmail
}: AdminDashboardProps) {
  const isAr = lang === 'ar';
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'users' | 'quizzes' | 'subscriptions' | 'coupons' | 'settings' | 'classrooms' | 'ai_monitoring' | 'rewards'>(() => {
    if (typeof window !== 'undefined' && (window.location.hash.includes('subscriptions') || window.location.hash.includes('payments'))) {
      return 'subscriptions';
    }
    return 'overview';
  });

  const [initialSubTab, setInitialSubTab] = useState<"users" | "payments" | "plans" | "coupons">(() => {
    if (typeof window !== 'undefined' && (window.location.hash.includes('subscriptions') || window.location.hash.includes('payments'))) {
      return 'payments';
    }
    return 'users';
  });

  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [quizSearchQuery, setQuizSearchQuery] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const [platformSettingsBusy, setPlatformSettingsBusy] = useState(false);
  const [platformSettingsNotice, setPlatformSettingsNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [overviewLoadError, setOverviewLoadError] = useState<string | null>(null);
  const [overviewRefreshKey, setOverviewRefreshKey] = useState(0);
  const [pendingPaymentCount, setPendingPaymentCount] = useState<number>(0);
  const [pendingEssayCount, setPendingEssayCount] = useState<number>(0);
  const [adminEssayModalOpen, setAdminEssayModalOpen] = useState<boolean>(false);
  const [selectedReviewQuizId, setSelectedReviewQuizId] = useState<string | undefined>(undefined);
  const [selectedReviewQuizTitle, setSelectedReviewQuizTitle] = useState<string | undefined>(undefined);

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

  useGSAP(() => {
    gsap.fromTo(
      ".admin-header-anim",
      { opacity: 0, y: -16 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );
  }, { scope: containerRef });

  useGSAP(() => {
    gsap.fromTo(
      ".admin-content-panel",
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", clearProps: "all" }
    );
  }, { scope: containerRef, dependencies: [activeAdminTab] });

  const refreshPendingEssays = async () => {
    try {
      const data = await getPendingEssayReviews();
      setPendingEssayCount(data.length);
    } catch (_) {
      setPendingEssayCount(0);
    }
  };

  useEffect(() => {
    void refreshPendingEssays();
  }, [overviewRefreshKey]);

  useEffect(() => {
    let mounted = true;
    const refreshPending = async () => {
      try {
        const count = await getPendingPaymentRequestsCount();
        if (mounted) setPendingPaymentCount(count);
      } catch (e) {
        // Safe fallback
      }
    };
    void refreshPending();

    const handleNewRequest = () => {
      void refreshPending();
      void refreshPendingEssays();
    };
    window.addEventListener('quizspace-payment-request-submitted', handleNewRequest);
    return () => {
      mounted = false;
      window.removeEventListener('quizspace-payment-request-submitted', handleNewRequest);
    };
  }, []);

  useEffect(() => {
    const handleHash = () => {
      if (typeof window !== 'undefined' && (window.location.hash.includes('subscriptions') || window.location.hash.includes('payments'))) {
        setActiveAdminTab('subscriptions');
        setInitialSubTab('payments');
      }
    };
    const handleAdminNavigation = (e: any) => {
      if (e?.detail?.tab) setActiveAdminTab(e.detail.tab);
      if (e?.detail?.subTab) setInitialSubTab(e.detail.subTab);
    };
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('quizspace-navigate-admin-tab', handleAdminNavigation);
    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('quizspace-navigate-admin-tab', handleAdminNavigation);
    };
  }, []);

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

      const [profilesResult, couponsResult, overviewResult, pendingCountResult] = await Promise.allSettled([
        getAllProfiles(),
        getCoupons(),
        getAdminOverviewSnapshot(),
        getPendingPaymentRequestsCount(),
      ]);

      if (!isMounted) return;

      if (pendingCountResult.status === 'fulfilled') {
        setPendingPaymentCount(pendingCountResult.value);
      }

      let hasLoadFailure = false;
      if (profilesResult.status === 'fulfilled') {
        setAllUsers(profilesResult.value);
      } else {
        hasLoadFailure = true;
      }

      if (couponsResult.status === 'fulfilled') {
        setCoupons(Array.isArray(couponsResult.value) ? couponsResult.value : []);
      } else {
        hasLoadFailure = true;
      }

      if (overviewResult.status === 'fulfilled') {
        const data = overviewResult.value.classrooms || [];
        setAdminClassrooms(data.map((classroom: any) => ({
          ...classroom,
          createdAt: classroom.created_at || classroom.createdAt,
          creatorName: classroom.creator_name || classroom.creatorName || classroom.created_by_name || (isAr ? 'غير محدد' : 'Unknown'),
        })));
        const students = overviewResult.value.students || [];
        setAdminStudents(students.map((student: any) => ({
          ...student,
          classCode: student.class_code || student.classCode,
          studentName: student.student_name || student.studentName || student.name || (isAr ? 'طالب' : 'Student'),
          studentPhoto: student.student_photo || student.studentPhoto || null,
          avgScore: Number(student.avg_score ?? student.avgScore ?? 0),
        })));
      } else {
        hasLoadFailure = true;
      }

      if (hasLoadFailure) {
        setOverviewLoadError(isAr ? 'تعذر تحميل جزء من بيانات الإدارة. يمكنك إعادة المحاولة.' : 'Part of admin data could not be loaded. Please refresh.');
      }
      setIsLoadingOverview(false);
    };

    void loadAdminOverview();
    return () => { isMounted = false; };
  }, [isAr, overviewRefreshKey]);

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
  }, [activeAdminClassroom, isAr]);

  const premiumUsersCount = allUsers.filter(u => u.is_premium).length;
  const activeAttempts = quizzes.reduce((acc, q) => acc + (q.totalPlays || 0), 0);
  const averageAttemptsPerQuiz = quizzes.length > 0 ? Math.round(activeAttempts / quizzes.length) : 0;
  const premiumAdoptionRate = allUsers.length > 0 ? Math.round((premiumUsersCount / allUsers.length) * 100) : 0;

  const adminTabs = [
    { id: 'overview', name: isAr ? 'نظرة عامة' : 'Overview', icon: LayoutDashboard },
    { id: 'users', name: isAr ? 'المستخدمين' : 'Users', icon: Users, badge: allUsers.length ? allUsers.length : null },
    { id: 'quizzes', name: isAr ? 'الاختبارات' : 'Quizzes', icon: Database, badge: pendingEssayCount > 0 ? `${pendingEssayCount} مقالي` : (quizzes.length ? quizzes.length : null) },
    { id: 'subscriptions', name: isAr ? 'الاشتراكات' : 'Subscriptions', icon: Crown, badge: pendingPaymentCount > 0 ? `${pendingPaymentCount} طلب` : null, urgent: pendingPaymentCount > 0 },
    { id: 'coupons', name: isAr ? 'الكوبونات' : 'Coupons', icon: Ticket },
    { id: 'classrooms', name: isAr ? 'الفصول (التخفي)' : 'Classrooms (Stealth)', icon: EyeOff },
    { id: 'rewards', name: isAr ? 'النقاط والمتجر' : 'Points & Store', icon: Gift },
    { id: 'ai_monitoring', name: isAr ? 'مراقبة AI' : 'AI Monitoring', icon: Activity },
    { id: 'settings', name: isAr ? 'الإعدادات' : 'Settings', icon: Settings },
  ];

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-7xl px-4 pb-16 pt-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Executive Command Header */}
      <header className="admin-header-anim relative overflow-hidden rounded-[30px] border border-[#007472]/30 bg-gradient-to-r from-white via-teal-50/40 to-white dark:from-slate-950 dark:via-[#007472]/15 dark:to-slate-950 p-6 shadow-sm dark:shadow-[0_12px_36px_rgba(0,116,114,0.12)] dark:border-[#2AC3BB]/30">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#007472] via-[#2AC3BB] to-[#EE8361] text-white shadow-md shadow-[#EE8361]/25">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#FCF6EE] tracking-tight">
                  {isAr ? 'مركز قيادة المنصة' : 'Platform Command Center'}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {isAr ? 'الأنظمة نشطة 100%' : 'All Systems Operational'}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-[#8BAEAD]">
                {isAr ? 'الرقابة الشاملة، إدارة المستخدمين، الاعتمادات المالية والمراقبة المباشرة' : 'Global oversight, user management, financial approvals & live monitoring'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setOverviewRefreshKey((v) => v + 1)}
              disabled={isLoadingOverview}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 text-xs font-black text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 shadow-xs transition cursor-pointer disabled:cursor-wait"
            >
              <RefreshCw className={`h-4 w-4 text-[#007472] dark:text-[#2AC3BB] ${isLoadingOverview ? 'animate-spin' : ''}`} />
              <span>{isAr ? 'تحديث البيانات' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Critical Alert Banners */}
      {pendingPaymentCount > 0 && (
        <aside className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-amber-400/80 bg-amber-50/95 dark:border-amber-600/50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/40 shadow-xs">
              <WalletCards className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-950 dark:text-white">
                  {isAr ? `يوجد ${pendingPaymentCount} طلب اشتراك ودفع معلق بحاجة لاعتمادك` : `${pendingPaymentCount} pending subscription payment request(s) awaiting review`}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-600 text-white animate-pulse">
                  {isAr ? 'عاجل' : 'Urgent'}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-amber-200/80 mt-0.5">
                {isAr ? 'قام مشتركون بإرسال إيصالات دفع وفودافون كاش / إنستاباي، اضغط لمراجعة وتفعيل اشتراكاتهم فوراً.' : 'Subscribers submitted payment receipts. Inspect and activate their memberships instantly.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveAdminTab('subscriptions');
              setInitialSubTab('payments');
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs transition shadow-md flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>{isAr ? 'الانتقال لطلبات الدفع' : 'Review Requests'}</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </aside>
      )}

      {pendingEssayCount > 0 && (
        <aside className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-[#EE8361]/40 bg-gradient-to-r from-amber-500/10 via-[#EE8361]/10 to-teal-50/50 dark:border-[#EE8361]/40 dark:bg-gradient-to-r dark:from-[#EE8361]/15 dark:to-[#072424] text-slate-950 dark:text-white shadow-sm animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#EE8361]/15 text-[#EE8361] flex items-center justify-center shrink-0 border border-[#EE8361]/25 shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-950 dark:text-white">
                  {isAr ? `يوجد ${pendingEssayCount} إجابة مقالية معلقة بانتظار التصحيح والتقييم` : `${pendingEssayCount} pending essay answer(s) awaiting grading`}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#EE8361] text-white animate-pulse">
                  {isAr ? 'تصحيح مقالي' : 'Essay Review'}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                {isAr ? 'بصفتك مسؤولاً عاماً، يمكنك مراجعة وتقييم إجابات الطلاب على مستوى المنصة ورصد الدرجات.' : 'As super admin, you can review, grade, and feedback student essay submissions across the platform.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedReviewQuizId(undefined);
              setSelectedReviewQuizTitle(undefined);
              setAdminEssayModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#007472] via-[#2AC3BB] to-[#EE8361] hover:brightness-110 text-white font-black text-xs transition shadow-md shadow-[#EE8361]/25 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>{isAr ? 'تصحيح الإجابات الآن' : 'Grade Essays Now'}</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </aside>
      )}

      {/* Main Command Workspace */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Navigation Rail */}
        <nav aria-label={isAr ? 'تبويبات لوحة الإدارة' : 'Admin navigation'} className="w-full lg:w-72 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeAdminTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveAdminTab(tab.id as any)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-12 items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap lg:whitespace-normal cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#007472] dark:bg-[#2AC3BB] text-white dark:text-slate-950 shadow-md shadow-[#007472]/20 font-black'
                    : 'bg-white/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-[#007472]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white dark:text-slate-950' : 'text-[#007472] dark:text-[#2AC3BB]'}`} />
                  <span>{tab.name}</span>
                </div>
                {tab.badge ? (
                  <span className={`inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-black rounded-full shadow-xs ${
                    isActive
                      ? 'bg-white/25 text-white dark:text-slate-950'
                      : tab.urgent
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-[#007472]/15 text-[#007472] dark:bg-[#2AC3BB]/20 dark:text-[#2AC3BB]'
                  }`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Content Viewport */}
        <div className="flex-1 min-w-0 rounded-[30px] border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 sm:p-8">
          <div className="admin-content-panel">
            {/* 1. OVERVIEW TAB */}
            {activeAdminTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    <ShinyText text={isAr ? 'المؤشرات التشغيلية للمنصة' : 'Platform Operational Metrics'} speed={3.5} />
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isAr ? 'بيانات حية وموثوقة لحركة المستخدمين والاختبارات والفصول الدراسية' : 'A trustworthy operating view of users, active quizzes, and classrooms'}
                  </p>
                </div>

                {overviewLoadError && (
                  <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-400 bg-amber-50 p-4 text-xs font-bold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>{overviewLoadError}</span>
                  </div>
                )}

                {isLoadingOverview ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: isAr ? 'إجمالي المستخدمين' : 'Total Users', count: allUsers.length, caption: isAr ? 'حساب مسجل بالمنصة' : 'Registered user accounts', icon: Users, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-200 dark:border-sky-900/40' },
                      { label: isAr ? 'الفصول النشطة' : 'Classrooms', count: adminClassrooms.length, caption: isAr ? `${adminStudents.length} عضوية طالب مسجل` : `${adminStudents.length} enrolled students`, icon: UserRoundCheck, color: 'text-[#007472] dark:text-[#2AC3BB]', bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200 dark:border-teal-900/40' },
                      { label: isAr ? 'الاختبارات المنشورة' : 'Published Quizzes', count: quizzes.length, caption: isAr ? `${averageAttemptsPerQuiz} متوسط الحل لكل اختبار` : `${averageAttemptsPerQuiz} avg plays per quiz`, icon: Database, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-900/40' },
                      { label: isAr ? 'نسبة الاشتراكات' : 'Premium adoption', count: premiumAdoptionRate, isSuffixPercent: true, caption: isAr ? `${premiumUsersCount} مستخدمًا بباقات مدفوعة` : `${premiumUsersCount} paid members`, icon: Crown, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900/40' },
                    ].map((stat) => (
                      <div key={stat.label} className={`rounded-2xl border ${stat.border} ${stat.bg} p-5 shadow-xs`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{stat.label}</p>
                            <h4 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                              <CountUp to={stat.count} duration={1.5} suffix={stat.isSuffixPercent ? '%' : ''} />
                            </h4>
                          </div>
                          <div className={`rounded-2xl p-3 ${stat.color}`}><stat.icon className="h-6 w-6" /></div>
                        </div>
                        <p className="mt-3 text-[11px] font-semibold text-slate-600 dark:text-slate-400">{stat.caption}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Command Cards */}
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white mb-3">{isAr ? 'الوصول السريع للأقسام الإدارية' : 'Quick Management Hubs'}</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[
                      { tab: 'users', title: isAr ? 'إدارة المستخدمين' : 'User Profiles', desc: isAr ? 'البحث وتعديل الصلاحيات وفحص الحسابات.' : 'Search profiles and manage privileges.', icon: Users },
                      { tab: 'ai_monitoring', title: isAr ? 'مراقبة الذكاء الاصطناعي' : 'AI Request Logs', desc: isAr ? 'فحص زمن الاستجابة ونسبة النجاح للأوامر.' : 'Inspect latency, status and token usage.', icon: Activity },
                      { tab: 'rewards', title: isAr ? 'النقاط والمتجر' : 'Points & Orders', desc: isAr ? 'منح النقاط واعتماد التحويلات النقدية.' : 'Grant points and verify money transfers.', icon: Gift },
                    ].map((hub) => {
                      const HubIcon = hub.icon;
                      return (
                        <button
                          key={hub.tab}
                          type="button"
                          onClick={() => setActiveAdminTab(hub.tab as any)}
                          className="group flex flex-col justify-between p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-[#007472]/60 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-[#2AC3BB]/50 text-start transition cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="p-3 rounded-xl bg-[#007472]/10 text-[#007472] dark:bg-[#2AC3BB]/15 dark:text-[#2AC3BB]"><HubIcon className="h-5 w-5" /></span>
                            <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-[#007472] dark:group-hover:text-[#2AC3BB] transition" />
                          </div>
                          <div className="mt-4">
                            <h5 className="text-sm font-black text-slate-900 dark:text-white">{hub.title}</h5>
                            <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">{hub.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. USERS TAB */}
            {activeAdminTab === 'users' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{isAr ? 'إدارة المستخدمين والحسابات' : 'User Accounts Management'}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">{isAr ? `إجمالي الحسابات الظاهرة: ${allUsers.length}` : `Total registered accounts: ${allUsers.length}`}</p>
                  </div>
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder={isAr ? 'ابحث بالاسم أو البريد أو المعرف...' : 'Search by name, email, or UID...'}
                      className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#007472] dark:focus:border-[#2AC3BB]"
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-start" dir={isAr ? 'rtl' : 'ltr'}>
                      <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-black uppercase text-[11px] border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-5 py-3.5 text-start">{isAr ? 'المستخدم' : 'User'}</th>
                          <th className="px-5 py-3.5 text-start">{isAr ? 'البريد / المعرف' : 'Email / ID'}</th>
                          <th className="px-5 py-3.5 text-start">{isAr ? 'نوع الحساب' : 'Account Type'}</th>
                          <th className="px-5 py-3.5 text-center">{isAr ? 'الإجراء' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {allUsers
                          .filter((u: any) => {
                            const q = userSearchQuery.trim().toLowerCase();
                            if (!q) return true;
                            return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.uid || u.id || '').toLowerCase().includes(q);
                          })
                          .slice(0, userSearchQuery.trim() ? 100 : 50)
                          .map((u: any, idx) => (
                            <tr key={u.uid || u.id || idx} className="hover:bg-teal-50/30 dark:hover:bg-slate-800/40 transition">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-xs text-[#007472] dark:text-[#2AC3BB]">
                                    {u.photo_url ? <img src={u.photo_url} alt="" className="w-full h-full object-cover" /> : (u.name?.charAt(0) || 'U')}
                                  </div>
                                  <span className="font-bold text-slate-900 dark:text-white">{u.name || (isAr ? 'مستخدم' : 'User')}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-400">{u.email || u.uid}</td>
                              <td className="px-5 py-3.5">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${u.is_premium ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'}`}>
                                  {u.is_premium ? (u.plan_name || 'Premium') : (isAr ? 'عضو نشط' : 'Active')}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => onViewProfile?.(u.uid || u.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition shadow-2xs cursor-pointer"
                                  title={isAr ? 'عرض الملف الشخصي' : 'View Profile'}
                                >
                                  <Users className="w-3.5 h-3.5 text-[#007472] dark:text-[#2AC3BB]" />
                                  <span>{isAr ? 'الملف' : 'Profile'}</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. QUIZZES TAB */}
            {activeAdminTab === 'quizzes' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{isAr ? 'إدارة بنك الاختبارات' : 'Quiz Bank Management'}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">{isAr ? `إجمالي الاختبارات: ${quizzes.length}` : `Total quizzes: ${quizzes.length}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReviewQuizId(undefined);
                        setSelectedReviewQuizTitle(undefined);
                        setAdminEssayModalOpen(true);
                      }}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#007472] hover:bg-[#005e5c] dark:bg-[#2AC3BB] dark:hover:bg-[#22aba3] px-4 py-2.5 text-xs font-black text-white dark:text-slate-950 shadow-sm transition cursor-pointer"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>{isAr ? 'تصحيح الأسئلة المقالية' : 'Grade Essays'}</span>
                      {pendingEssayCount > 0 && (
                        <span className="rounded-full bg-white/20 dark:bg-slate-900/30 px-2 py-0.5 text-[10px] font-black">
                          {pendingEssayCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quizzes.map((quiz, idx) => (
                    <article key={quiz.id || idx} className="flex flex-col justify-between p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-[#007472]/40 dark:hover:border-[#2AC3BB]/40 transition">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-black text-sm text-slate-900 dark:text-white line-clamp-1">{quiz.title}</h4>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#007472]/10 text-[#007472] dark:bg-[#2AC3BB]/20 dark:text-[#2AC3BB] shrink-0">
                            {quiz.questions?.length || 0} {isAr ? 'سؤال' : 'Q'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {quiz.description || (isAr ? 'بدون وصف' : 'No description')}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3.5">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {quiz.totalPlays || 0} {isAr ? 'محاولة' : 'plays'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {quiz.questions?.some(q => q.type === 'essay') && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReviewQuizId(quiz.id);
                                setSelectedReviewQuizTitle(quiz.title);
                                setAdminEssayModalOpen(true);
                              }}
                              title={isAr ? 'تصحيح الإجابات المقالية لهذا الاختبار' : 'Grade essay answers for this quiz'}
                              className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer"
                            >
                              <BookOpen className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEditQuiz?.(quiz)}
                            disabled={!onEditQuiz}
                            title={isAr ? 'تعديل الاختبار' : 'Edit quiz'}
                            className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition cursor-pointer disabled:opacity-40"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!onDeleteQuiz || deletingQuizId) return;
                              if (!window.confirm(isAr ? `حذف اختبار «${quiz.title}» نهائياً؟` : `Delete "${quiz.title}" permanently?`)) return;
                              setDeletingQuizId(quiz.id);
                              try { await onDeleteQuiz(quiz.id); } finally { setDeletingQuizId(null); }
                            }}
                            disabled={!onDeleteQuiz || deletingQuizId === quiz.id}
                            title={isAr ? 'حذف الاختبار' : 'Delete quiz'}
                            className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer disabled:opacity-40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* 4. SUBSCRIPTIONS TAB */}
            {activeAdminTab === 'subscriptions' && (
              <AdminSubscriptions lang={lang} onViewProfile={onViewProfile} initialSubTab={initialSubTab} />
            )}

            {/* 5. COUPONS TAB */}
            {activeAdminTab === 'coupons' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{isAr ? 'إنشاء أكواد الخصم والعروض' : 'Promo Codes & Broadcasts'}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">{isAr ? 'أنشئ كوبونات خصم وبث إشعارات ترويجية مباشرة لجميع المستخدمين' : 'Generate discount codes and broadcast alerts directly to all members'}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Form */}
                  <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'نوع التنبيه' : 'Notification Type'}</label>
                      <select
                        value={promoType}
                        onChange={e => setPromoType(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#007472]"
                      >
                        <option value="Promo Code">{isAr ? 'كود خصم (ترويجي)' : 'Promo Code'}</option>
                        <option value="Special Offer">{isAr ? 'عرض خاص' : 'Special Offer'}</option>
                        <option value="System Alert">{isAr ? 'تنبيه نظام' : 'System Alert'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'الكود أو اسم العرض' : 'Code / Offer Tag'}</label>
                      <input
                        type="text"
                        value={promoCode}
                        onChange={e => setPromoCode(e.target.value)}
                        placeholder="e.g. VIP50"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#007472]"
                      />
                    </div>

                    {promoType === 'Promo Code' && (
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'نسبة الخصم (%)' : 'Discount Percentage (%)'}</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={promoDiscountPercent}
                          onChange={e => setPromoDiscountPercent(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#007472]"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'نص الرسالة للمستخدمين' : 'Broadcast Message'}</label>
                      <textarea
                        rows={3}
                        value={promoMessage}
                        onChange={e => setPromoMessage(e.target.value)}
                        placeholder={isAr ? 'اكتب رسالة العرض أو تفاصيل الكوبون هنا...' : 'Write promo message details here...'}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-[#007472] resize-none"
                      />
                    </div>

                    <button
                      type="button"
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
                            if (Array.isArray(list)) setCoupons(list);
                          }

                          await broadcastPlatformNotification(
                            promoType === 'Promo Code' ? (isAr ? 'كود خصم جديد' : 'New Promo Code') : (isAr ? 'عرض خاص' : 'Special Offer'),
                            `${promoCode}: ${promoMessage}` + (isAr ? ' (متوفر الآن في صفحة الدفع)' : ' (Now available on checkout)')
                          );

                          for (const user of allUsers) {
                            if (user.userId && user.userId !== 'anonymous') {
                              try {
                                await sendDirectMessage(
                                  COSMO_SYSTEM_UID,
                                  isAr ? 'كوزمو' : 'Cosmo AI',
                                  user.userId,
                                  user.name || 'Student',
                                  `${promoMessage} ${promoType === 'Promo Code' ? `Code: ${promoCode}` : ''}`
                                );
                              } catch (_) {}
                            }
                          }

                          showAppMessage(isAr ? `تم إرسال العرض بنجاح وبدأ كوزمو بإرسال الرسائل لجميع الـ ${allUsers.length} مستخدمين!` : `Offer sent successfully, AI is messaging all ${allUsers.length} users!`);
                          setPromoCode('');
                          setPromoMessage('');
                        } catch (err) {
                          showAppMessage('Error sending promo.');
                        } finally {
                          setIsSendingPromo(false);
                        }
                      }}
                      className="w-full py-3 bg-[#007472] hover:bg-[#005e5c] dark:bg-[#2AC3BB] dark:hover:bg-[#22aba3] text-white dark:text-slate-950 font-black text-xs rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSendingPromo ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال التنبيه الآن' : 'Broadcast Notification Now')}
                    </button>
                  </div>

                  {/* Active Coupons List */}
                  <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-4">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                      {isAr ? 'الأكواد والعروض الفعالة' : 'Active Coupons'}
                    </h4>
                    <div className="space-y-3">
                      {coupons.length === 0 ? (
                        <div className="text-center py-8 text-xs font-bold text-slate-500">
                          {isAr ? 'لا توجد أكواد خصم نشطة حالياً.' : 'No active coupon codes.'}
                        </div>
                      ) : (
                        coupons.map((coupon) => (
                          <div key={coupon.id} className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between">
                            <div>
                              <div className="font-black font-mono text-sm text-emerald-700 dark:text-emerald-400">{coupon.code}</div>
                              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                {isAr ? `خصم %${coupon.discountPercent} على الاشتراكات` : `${coupon.discountPercent}% off`}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(isAr ? `حذف الكود ${coupon.code}؟` : `Delete coupon ${coupon.code}?`)) {
                                  try {
                                    await deleteCoupon(coupon.id);
                                    const list = await getCoupons();
                                    if (Array.isArray(list)) setCoupons(list);
                                    showToast('success', isAr ? 'تم حذف الكوبون.' : 'Coupon deleted.');
                                  } catch (_) {
                                    showToast('error', isAr ? 'فشل حذف الكوبون.' : 'Failed to delete.');
                                  }
                                }
                              }}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                              title={isAr ? 'حذف الكود' : 'Delete'}
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

            {/* 6. CLASSROOMS TAB */}
            {activeAdminTab === 'classrooms' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <EyeOff className="w-5 h-5 text-[#007472] dark:text-[#2AC3BB]" />
                    <span>{isAr ? 'الرقابة العامة والتحكم الفائق (وضع التخفي)' : 'Global Override & Stealth Mode'}</span>
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {isAr
                      ? 'صلاحيات المشرف الفائق: استعراض الفصول، فحص الطلاب، وفك تشفير المحادثات دون تنبيه المستخدمين.'
                      : 'Super Admin master authorization: browse classrooms, inspect students, and decrypt chat without alerts.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {adminClassrooms.map((c) => {
                    const studentsCount = adminStudents.filter((s) => s.classCode === c.code).length;
                    return (
                      <article key={c.id || c.code} className="flex flex-col justify-between p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-[#007472]/40 dark:hover:border-[#2AC3BB]/40 transition">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-[#007472] dark:text-[#2AC3BB] text-xs font-mono font-bold">
                              {c.code}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="font-black text-slate-900 dark:text-white text-sm mt-3 line-clamp-1">{c.name}</h4>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1">
                            {isAr ? `المعلم: ${c.creatorName}` : `Teacher: ${c.creatorName}`}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <span className="font-bold text-slate-600 dark:text-slate-400">
                            {isAr ? `الطلاب: ${studentsCount}` : `Students: ${studentsCount}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveAdminClassroom(c)}
                            className="px-3 py-1.5 rounded-xl bg-[#007472] hover:bg-[#005e5c] dark:bg-[#2AC3BB] dark:hover:bg-[#22aba3] text-white dark:text-slate-950 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>{isAr ? 'دخول بالتخفي' : 'Stealth Access'}</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}

                  {adminClassrooms.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-500 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl font-bold text-xs">
                      {isAr ? 'لا توجد فصول دراسية منشأة حالياً.' : 'No classrooms created yet.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. REWARDS & STORE TAB */}
            {activeAdminTab === 'rewards' && (
              <div className="space-y-8">
                {rewardNotice && (
                  <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-xs font-bold ${rewardNotice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'}`}>
                    <span>{rewardNotice.text}</span>
                    <button type="button" onClick={() => setRewardNotice(null)}><X className="h-4 w-4" /></button>
                  </div>
                )}

                <AdminRewardCatalogPanel lang={lang} />

                {/* Manual Points Grant Section */}
                <section className="rounded-2xl border border-amber-300/80 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-xl bg-amber-500/20 p-2.5 text-amber-800 dark:text-amber-300"><Gift className="h-5 w-5" /></div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">{isAr ? 'منح نقاط وعملات يدوية' : 'Manual Points & Coins Grant'}</h3>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{isAr ? 'امنح نقاطاً أو عملات للمستخدم مباشرة عبر صلاحيات المشرف.' : 'Grant reward points or coins to any user account directly.'}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_.8fr_1.5fr_auto]">
                    {/* User Dropdown */}
                    <div className="relative" ref={userListRef}>
                      <button
                        type="button"
                        onClick={() => setIsUserListOpen(!isUserListOpen)}
                        className="w-full flex items-center justify-between rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <span className="truncate">
                          {grantUserId
                            ? allUsers.find(u => (u.userId || u.uid) === grantUserId)?.name || 'Unknown User'
                            : (isAr ? 'اختر مستخدماً...' : 'Select a user...')}
                        </span>
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                      </button>

                      {isUserListOpen && (
                        <div className="absolute top-full left-0 right-0 z-[100] mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                          <input
                            type="text"
                            placeholder={isAr ? 'بحث بالاسم...' : 'Search name...'}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-950 mb-2"
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            value={userSearchQuery}
                          />
                          <div className="space-y-1">
                            {allUsers
                              .filter(u => (u.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()))
                              .slice(0, 30)
                              .map((u) => {
                                const id = u.userId || u.uid;
                                return (
                                  <button
                                    key={id}
                                    type="button"
                                    onClick={() => { setGrantUserId(id); setIsUserListOpen(false); }}
                                    className="w-full text-start px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                                  >
                                    <span className="block text-slate-900 dark:text-white">{u.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{u.email || id}</span>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>

                    <select
                      value={grantCurrency}
                      onChange={(e) => setGrantCurrency(e.target.value as any)}
                      className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="points">{isAr ? 'نقاط مكافأة' : 'Reward Points'}</option>
                      <option value="coins">{isAr ? 'عملات كوزميك ◈' : 'Coins ◈'}</option>
                    </select>

                    <input
                      type="number"
                      min={1}
                      max={1000000}
                      value={grantPoints}
                      onChange={(e) => setGrantPoints(Number(e.target.value))}
                      className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      placeholder={isAr ? 'الكمية' : 'Amount'}
                    />

                    <input
                      value={grantNote}
                      onChange={(e) => setGrantNote(e.target.value)}
                      placeholder={isAr ? 'ملاحظة (اختياري)' : 'Note (optional)'}
                      className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />

                    <button
                      type="button"
                      disabled={!grantUserId || grantPoints <= 0 || rewardBusy === 'grant'}
                      onClick={async () => {
                        setRewardBusy('grant');
                        const result = await adminGrantRewardPoints(grantUserId, grantPoints, grantNote, grantCurrency);
                        setRewardBusy(null);
                        if (result?.success) {
                          setRewardNotice({ ok: true, text: isAr ? `تمت إضافة ${grantPoints} ${grantCurrency === 'points' ? 'نقطة' : 'عملة'} بنجاح.` : `${grantPoints} ${grantCurrency} granted.` });
                          setRewardBalances((current) => ({
                            ...current,
                            [grantUserId]: {
                              ...(current[grantUserId] || {}),
                              [grantCurrency]: Number(current[grantUserId]?.[grantCurrency] || 0) + grantPoints
                            }
                          }));
                          setGrantNote('');
                        } else {
                          setRewardNotice({ ok: false, text: result?.message || 'Grant failed' });
                        }
                      }}
                      className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2.5 text-xs font-black text-white transition disabled:opacity-50 cursor-pointer"
                    >
                      {rewardBusy === 'grant' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                      <span>{isAr ? 'منح المكافأة' : 'Grant'}</span>
                    </button>
                  </div>
                </section>

                {/* Purchase Orders Review */}
                <section className="rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">{isAr ? 'طلبات شراء النقاط النقدية' : 'Points Cash Purchase Orders'}</h3>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{isAr ? 'راجع تحويلات فودافون كاش وإنستاباي واعتمد الإيداعات' : 'Verify Vodafone Cash and InstaPay receipts'}</p>
                    </div>
                    <WalletCards className="h-5 w-5 text-emerald-600" />
                  </div>

                  <div className="space-y-3">
                    {rewardOrders.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-8 text-center text-xs font-bold text-slate-500">
                        {isAr ? 'لا توجد طلبات معلقة حالياً.' : 'No pending orders.'}
                      </p>
                    ) : (
                      rewardOrders.map((order) => (
                        <div key={order.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/50">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:text-emerald-300">
                                {order.payment_method === 'vodafone_cash' ? 'Vodafone Cash' : 'InstaPay'}
                              </span>
                              <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${order.status === 'pending' ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300' : order.status === 'approved' ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-800 dark:text-rose-300'}`}>
                                {order.status}
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs font-black text-slate-900 dark:text-white">{order.user_id} · {order.item_id}</p>
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              {Number(order.amount_points || 0).toLocaleString()} {isAr ? 'نقطة' : 'pts'} · {order.amount_egp} EGP · Ref: {order.payment_reference || '—'}
                            </p>
                          </div>
                          {order.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={rewardBusy === order.id}
                                onClick={async () => {
                                  setRewardBusy(order.id);
                                  const result = await adminReviewRewardOrder(order.id, 'approved');
                                  setRewardBusy(null);
                                  if (result?.success) {
                                    setRewardOrders((ords) => ords.map((o) => o.id === order.id ? { ...o, status: 'approved' } : o));
                                    showToast('success', isAr ? 'تم اعتماد الطلب بنجاح.' : 'Order approved.');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition cursor-pointer"
                              >
                                {isAr ? 'اعتماد' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                disabled={rewardBusy === order.id}
                                onClick={async () => {
                                  setRewardBusy(order.id);
                                  const result = await adminReviewRewardOrder(order.id, 'rejected');
                                  setRewardBusy(null);
                                  if (result?.success) {
                                    setRewardOrders((ords) => ords.map((o) => o.id === order.id ? { ...o, status: 'rejected' } : o));
                                    showToast('info', isAr ? 'تم رفض الطلب.' : 'Order rejected.');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 transition cursor-pointer"
                              >
                                {isAr ? 'رفض' : 'Reject'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* 8. AI MONITORING TAB */}
            {activeAdminTab === 'ai_monitoring' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{isAr ? 'مراقبة محرك الذكاء الاصطناعي' : 'AI Engine Monitoring'}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">{isAr ? 'تحليل زمن الاستجابة، معدل النجاح، وسجلات العمليات' : 'Latency, success rate, and operational logs'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadAiMonitoringLogs()}
                    disabled={isLoadingLogs}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-[#007472] dark:text-[#2AC3BB] hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                    <span>{isAr ? 'تحديث السجلات' : 'Refresh Logs'}</span>
                  </button>
                </div>

                {aiMonitoringError && (
                  <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between">
                    <span>{aiMonitoringError}</span>
                    <button
                      type="button"
                      onClick={() => void loadAiMonitoringLogs()}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition cursor-pointer"
                    >
                      {isAr ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{isAr ? 'إجمالي الطلبات (آخر 100)' : 'Total Requests'}</p>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{aiLogs.length}</h4>
                  </div>
                  <div className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{isAr ? 'متوسط زمن الاستجابة' : 'Avg Latency'}</p>
                    <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                      {aiLogs.length > 0 ? Math.round(aiLogs.reduce((acc, log) => acc + (log.latency_ms || 0), 0) / aiLogs.length) : 0} ms
                    </h4>
                  </div>
                  <div className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{isAr ? 'معدل النجاح' : 'Success Rate'}</p>
                    <h4 className="text-2xl font-black text-[#007472] dark:text-[#2AC3BB] mt-1 tabular-nums">
                      {aiLogs.length > 0 ? Math.round((aiLogs.filter(l => l.status === 'success').length / aiLogs.length) * 100) : 0}%
                    </h4>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-start" dir={isAr ? 'rtl' : 'ltr'}>
                      <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-black uppercase text-[11px] border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3 text-start">{isAr ? 'العملية' : 'Operation'}</th>
                          <th className="px-4 py-3 text-start">{isAr ? 'المزود' : 'Provider'}</th>
                          <th className="px-4 py-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                          <th className="px-4 py-3 text-start">{isAr ? 'الزمن' : 'Latency'}</th>
                          <th className="px-4 py-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {aiLogs.length === 0 ? (
                          <tr><td colSpan={5} className="text-center py-8 text-slate-500 font-bold">{isAr ? 'لا توجد سجلات حالياً.' : 'No logs recorded.'}</td></tr>
                        ) : (
                          aiLogs.slice(0, 40).map((log, i) => (
                            <tr key={log.id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{log.operation}</td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{log.provider}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${log.status === 'success' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'}`}>
                                  {log.status === 'success' ? 'OK' : 'ERR'}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{log.latency_ms}ms</td>
                              <td className="px-4 py-3 text-slate-500">{new Date(log.created_at).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 9. SETTINGS TAB */}
            {activeAdminTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{isAr ? 'إعدادات التحكم في المنصة' : 'Platform System Controls'}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">{isAr ? 'التحكم الفوري في وضع الصيانة وبوابة تسجيل الأعضاء الجدد' : 'Instant controls for maintenance mode and member registration'}</p>
                </div>

                {platformSettingsNotice && (
                  <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold ${platformSettingsNotice.ok ? 'border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-rose-500/30 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200'}`}>
                    {platformSettingsNotice.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />}
                    <span>{platformSettingsNotice.text}</span>
                  </div>
                )}

                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">{isAr ? 'وضع الصيانة العام' : 'Maintenance Mode'}</h4>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">{isAr ? 'إيقاف دخول الطلاب مؤقتاً لتطبيق التحديثات البرمجية' : 'Temporarily gate platform access for updates'}</p>
                    </div>
                    <LiquidGlassSwitch
                      checked={maintenanceMode}
                      onChange={(checked) => void handlePlatformSettingsChange(checked, allowRegistrations)}
                      size="sm"
                      disabled={platformSettingsBusy}
                      ariaLabel={isAr ? 'تبديل وضع الصيانة' : 'Toggle maintenance mode'}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-6">
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">{isAr ? 'السماح بتسجيل حسابات جديدة' : 'Allow New Registrations'}</h4>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">{isAr ? 'فتح باب إنشاء الحسابات للطلاب والزوار الجدد' : 'Open registration for new users'}</p>
                    </div>
                    <LiquidGlassSwitch
                      checked={allowRegistrations}
                      onChange={(checked) => void handlePlatformSettingsChange(maintenanceMode, checked)}
                      size="sm"
                      disabled={platformSettingsBusy}
                      ariaLabel={isAr ? 'تبديل السماح بالتسجيلات' : 'Toggle new registrations'}
                    />
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
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
            <div className="my-auto w-full max-w-4xl bg-white dark:bg-[#090D10] border border-slate-200 dark:border-[#2AC3BB]/30 rounded-[30px] p-6 sm:p-8 shadow-2xl relative max-h-[90dvh] overflow-y-auto space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#007472]/15 text-[#007472] dark:text-[#2AC3BB] rounded-xl flex items-center justify-center font-bold">
                    <EyeOff className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{activeAdminClassroom.name}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                        {isAr ? 'بث تجسسي نشط' : 'Active Ghost Stream'}
                      </span>
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {isAr ? `المعلم: ${activeAdminClassroom.creatorName} | الكود: ${activeAdminClassroom.code}` : `Teacher: ${activeAdminClassroom.creatorName} | Code: ${activeAdminClassroom.code}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAdminClassroom(null)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-500 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Students Roster */}
                <div className="space-y-3">
                  <h4 className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#007472] dark:text-[#2AC3BB]" />
                    <span>{isAr ? 'سجل الطلاب المنضمين' : 'Enrolled Students'}</span>
                  </h4>
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {adminStudents.filter(s => s.classCode === activeAdminClassroom.code).map((s, idx) => (
                      <div key={s.id || idx} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 overflow-hidden text-[10px]">
                            {s.studentPhoto ? <img src={s.studentPhoto} alt={s.studentName} className="w-full h-full object-cover" /> : s.studentName.charAt(0)}
                          </div>
                          <span className="text-slate-900 dark:text-white">{s.studentName}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-500">Avg: {s.avgScore}%</span>
                      </div>
                    ))}
                    {adminStudents.filter(s => s.classCode === activeAdminClassroom.code).length === 0 && (
                      <p className="text-center py-6 text-slate-500 text-xs font-bold">{isAr ? 'لا يوجد طلاب منضمين حالياً' : 'No students joined'}</p>
                    )}
                  </div>
                </div>

                {/* E2EE Chat log */}
                <div className="space-y-3">
                  <h4 className="font-black text-xs text-slate-900 dark:text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-[#007472] dark:text-[#2AC3BB]" />
                      <span>{isAr ? 'مراقبة المحادثات المشفرة (E2EE)' : 'E2EE Secure Chat Monitor'}</span>
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-lg flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{isAr ? 'محلول التشفير' : 'Decrypted'}</span>
                    </span>
                  </h4>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="h-[180px] overflow-y-auto space-y-2 pr-1">
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
                        <p className="text-center py-10 text-slate-500 text-xs font-bold">{isAr ? 'لا توجد رسائل في هذا الفصل بعد' : 'No messages in this classroom yet'}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={isAr ? 'إرسال كمسؤول خفي...' : 'Send as stealth admin...'}
                        value={newAdminMsgText}
                        onChange={(e) => setNewAdminMsgText(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-[#007472]"
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            const val = newAdminMsgText.trim();
                            if (!val) return;
                            setNewAdminMsgText('');

                            const { encryptMessage } = await import('../lib/encryption');
                            const cipher = await encryptMessage(val, activeAdminClassroom.id);

                            fetch(getApiUrl(`/api/classrooms/${activeAdminClassroom.id}/messages`), {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                senderId: currentUserId || 'admin-stealth',
                                senderName: isAr ? 'المشرف العام (تخفي) ' : 'Super Admin (Stealth) ',
                                senderPhoto: null,
                                encryptedText: cipher,
                              }),
                            })
                            .then(() => {
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

      {/* ESSAY REVIEW MODAL */}
      <EssayReviewModal
        isOpen={adminEssayModalOpen}
        onClose={() => {
          setAdminEssayModalOpen(false);
          setSelectedReviewQuizId(undefined);
          setSelectedReviewQuizTitle(undefined);
        }}
        quizId={selectedReviewQuizId}
        quizTitle={selectedReviewQuizTitle}
        lang={lang}
        onGraded={() => {
          void refreshPendingEssays();
        }}
      />
    </div>
  );
}
