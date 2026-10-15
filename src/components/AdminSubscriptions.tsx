import React, { useState, useEffect } from "react";
import {
  Shield,
  CreditCard,
  Award,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Sparkles,
  Megaphone,
  Calendar,
  Users,
  Percent,
  Gift,
  Crown,
  Search,
  Filter,
  Clock,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Eye,
  HelpCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { UserBadge } from "./UserBadge";
import { showToast } from "./Toast";
import { UserStats, SubscriptionPlan, PaymentProof } from "../types";
import { supabase } from "../lib/supabaseClient";
import { askAI } from "../services/aiWorkerClient";
import {
  getAllProfiles,
  getPremiumRequests,
  getCoupons,
  saveCoupon,
  deleteCoupon,
  updateUserSubscription,
  updateAdminUserSuspension,
  getSubscriptionPlans,
  saveAdminSubscriptionPlan,
  deleteAdminSubscriptionPlan,
  createNotification,
  createCommunityPost,
  COSMO_ADMIN_UID,
  getTrialOffers,
  TRIAL_OFFER_DURATIONS,
  TrialOfferDuration,
  updateTrialOfferState,
  updatePremiumRequest,
} from "../lib/db";
import { activateDiamondInstitution } from "../lib/institutions";
import { mapPendingPaymentRequests, mapAllPaymentRequests } from "../lib/paymentQueue";

interface AdminSubscriptionsProps {
  lang: "ar" | "en";
  onViewProfile?: (userId: string) => void;
}

export default function AdminSubscriptions({
  lang,
  onViewProfile,
}: AdminSubscriptionsProps) {
  const isAr = lang === "ar";
  const [subTab, setSubTab] = useState<
    "users" | "payments" | "plans" | "coupons"
  >("users");

  const [mockUsers, setMockUsers] = useState<UserStats[]>([]);
  const [mockPlans, setMockPlans] = useState<SubscriptionPlan[]>([
    {
      id: "silver",
      name: isAr ? "الباقة الفضية" : "Silver Plan",
      price: 4.99,
      durationMonths: 1,
      features: ["Basic features"],
      badgeStyle: "pro",
      badgeColor: "#c0c0c0",
      priorityLevel: 1,
    },
    {
      id: "gold",
      name: isAr ? "الباقة الذهبية" : "Gold Plan",
      price: 9.99,
      durationMonths: 1,
      features: ["Advanced features"],
      badgeStyle: "premium",
      badgeColor: "#f59e0b",
      priorityLevel: 2,
    },
    {
      id: "diamond",
      name: isAr ? "الباقة الماسية" : "Diamond Plan",
      price: 49.99,
      durationMonths: 12,
      features: ["All features unlocked"],
      badgeStyle: "founder",
      badgeColor: "#8b5cf6",
      priorityLevel: 3,
    },
  ]);
  const [mockPayments, setMockPayments] = useState<PaymentProof[]>([]);
  const [paymentLoadError, setPaymentLoadError] = useState<string | null>(null);
  const [paymentViewMode, setPaymentViewMode] = useState<"queue" | "ledger">("queue");
  const [paymentLedger, setPaymentLedger] = useState<(PaymentProof & { rejectReason?: string; updatedAt?: string; email?: string })[]>([]);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<string>("all");
  const [ledgerMethodFilter, setLedgerMethodFilter] = useState<string>("all");
  const [inspectingPayment, setInspectingPayment] = useState<(PaymentProof & { rejectReason?: string; updatedAt?: string; email?: string }) | null>(null);
  const [planDraft, setPlanDraft] = useState<SubscriptionPlan>({
    id: '', name: '', nameAr: '', price: 0, currency: 'EGP', durationMonths: 1,
    features: [], badgeStyle: 'pro', badgeColor: '#3b82f6', priorityLevel: 1, isActive: true,
  });
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planBusyId, setPlanBusyId] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [subscriptionRenewalDate, setSubscriptionRenewalDate] = useState<string>("");

  // Coupons States
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isCouponsLoading, setIsCouponsLoading] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newDiscountPercent, setNewDiscountPercent] = useState<number>(50);
  const [newMaxUses, setNewMaxUses] = useState<number>(10);
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [newApplicablePlans, setNewApplicablePlans] = useState<string[]>(['silver', 'gold', 'diamond']);
  const [aiPromoMsg, setAiPromoMsg] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [trialOffers, setTrialOffers] = useState<Record<TrialOfferDuration, boolean>>({ 7: false, 14: false, 30: false });
  const [isTrialOffersLoading, setIsTrialOffersLoading] = useState(false);
  const [trialOfferBusyDays, setTrialOfferBusyDays] = useState<TrialOfferDuration | null>(null);

  const loadTrialOffers = async () => {
    setIsTrialOffersLoading(true);
    try {
      const offers = await getTrialOffers();
      setTrialOffers(offers.reduce<Record<TrialOfferDuration, boolean>>((state, offer) => {
        state[offer.durationDays] = offer.isActive;
        return state;
      }, { 7: false, 14: false, 30: false }));
    } catch (error) {
      console.error('Failed to load trial offers:', error);
      showToast('error', isAr ? 'تعذر تحميل حالة العروض التجريبية من المنصة.' : 'Unable to load trial offer status from the platform.');
    } finally {
      setIsTrialOffersLoading(false);
    }
  };

  const toggleTrialOffer = async (days: TrialOfferDuration) => {
    if (trialOfferBusyDays !== null) return;
    const nextState = !trialOffers[days];
    setTrialOfferBusyDays(days);
    try {
      const savedOffer = await updateTrialOfferState(days, nextState);
      setTrialOffers((offers) => ({ ...offers, [savedOffer.durationDays]: savedOffer.isActive }));
      showToast('success', isAr ? (savedOffer.isActive ? `تم إطلاق عرض الـ ${days} يوم بنجاح!` : `تم إيقاف عرض الـ ${days} يوم`) : (savedOffer.isActive ? `${days}-Day trial activated!` : `${days}-Day trial deactivated`));
    } catch (error) {
      console.error('Failed to update trial offer:', error);
      showToast('error', isAr ? 'تعذر تحديث العرض التجريبي. تحقق من صلاحية السوبر أدمن وحاول مجدداً.' : 'Unable to update trial offer. Verify super-admin access and try again.');
    } finally {
      setTrialOfferBusyDays(null);
    }
  };

  const loadRealData = async () => {
    try {
      const [profiles, plans] = await Promise.all([getAllProfiles(), getSubscriptionPlans()]);
      if (plans.length > 0) setMockPlans(plans);
      const mappedUsers = profiles.map((p) => ({
        userId: p.uid || p.id || p.userId,
        name: p.name || "Unknown",
        email: p.email || "",
        isPremium: p.is_premium || p.isPremium || false,
        planName: p.plan_name || p.planName || "Free",
        planId: p.plan_id || p.planId || undefined,
        renewalDate: p.renewal_date || p.renewalDate || undefined,
        membershipStatus: p.membership_status || (p.is_membership_expired ? 'expired' : ((p.is_premium || p.isPremium) ? 'active' : 'free')),
        isMembershipExpired: Boolean(p.is_membership_expired),
        badgeSymbol: (p.is_premium || p.isPremium) ? "✔" : "",
        createdQuizzes: [],
        completions: [],
      }));
      setMockUsers(mappedUsers);
    } catch (err) {
      console.error('Failed to load admin users/plans:', err);
    }

    // Keep payment requests independent from the other admin queries. A failure
    // in profiles or plans must not make a real payment queue look empty.
    try {
      // This is an admin-scoped query; do not apply the current admin's user_id.
      const requests = await getPremiumRequests(undefined, { adminQueue: true });
      setMockPayments(mapPendingPaymentRequests(requests));
      setPaymentLoadError(null);
    } catch (err) {
      console.error('Failed to load premium payment requests:', err);
      setMockPayments([]);
      setPaymentLoadError(isAr ? 'تعذر تحميل طلبات الدفع. اضغط إعادة المحاولة.' : 'Unable to load payment requests. Try again.');
    }

    try {
      setIsLedgerLoading(true);
      const allRequests = await getPremiumRequests(undefined, { adminLedger: true });
      setPaymentLedger(mapAllPaymentRequests(allRequests));
    } catch (err) {
      console.warn('Failed to load full payment ledger:', err);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  const loadLedgerOnly = async () => {
    setIsLedgerLoading(true);
    try {
      const [allRequests, pendingReqs] = await Promise.all([
        getPremiumRequests(undefined, { adminLedger: true }),
        getPremiumRequests(undefined, { adminQueue: true }),
      ]);
      setPaymentLedger(mapAllPaymentRequests(allRequests));
      setMockPayments(mapPendingPaymentRequests(pendingReqs));
      showToast('success', isAr ? 'تم تحديث سجل المدفوعات والطلبات بنجاح' : 'Payment ledger and requests refreshed');
    } catch (err) {
      console.error('Error reloading payment ledger:', err);
      showToast('error', isAr ? 'تعذر تحديث سجل المدفوعات' : 'Unable to refresh payment ledger');
    } finally {
      setIsLedgerLoading(false);
    }
  };

  useEffect(() => {
    loadRealData();
    void loadTrialOffers();

    const handleNewRequest = () => {
      loadRealData();
    };
    window.addEventListener('quizspace-payment-request-submitted', handleNewRequest);
    return () => {
      window.removeEventListener('quizspace-payment-request-submitted', handleNewRequest);
    };
  }, []);

  const loadCoupons = async () => {
    setIsCouponsLoading(true);
    try {
      const data = await getCoupons();
      if (data) {
        setCoupons(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCouponsLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === "coupons") {
      loadCoupons();
    }
  }, [subTab]);

  const handleSaveCoupon = async () => {
    if (!newPromoCode.trim()) {
      alert(isAr ? "برجاء إدخال كود الخصم." : "Please enter discount code.");
      return;
    }
    if (!newExpiryDate) {
      alert(
        isAr
          ? "برجاء اختيار تاريخ صلاحية الانتهاء."
          : "Please select expiration date.",
      );
      return;
    }
    if (newApplicablePlans.length === 0) {
      alert(
        isAr
          ? "برجاء اختيار باقة واحدة على الأقل ليسري عليها كود الخصم."
          : "Please select at least one applicable plan.",
      );
      return;
    }

    try {
      await saveCoupon({
        id: newPromoCode.trim().toUpperCase(),
        code: newPromoCode.trim(),
        discountPercent: newDiscountPercent,
        maxUses: newMaxUses,
        expiryDate: newExpiryDate,
        usedCount: 0,
        isActive: true,
        applicablePlans: newApplicablePlans.join(','),
        createdAt: new Date().toISOString()
      });

      alert(
        isAr ? "تم حفظ كود الخصم بنجاح!" : "Coupon code saved successfully!",
      );
      setNewPromoCode("");
      setNewApplicablePlans(['silver', 'gold', 'diamond']);
      loadCoupons();
    } catch (err: any) {
      console.error(err);
      const detail = err?.message || err?.error_description || JSON.stringify(err);
      showToast('error', isAr ? `فشل حفظ الكوبون: ${detail}` : `Coupon save failed: ${detail}`);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (
      !window.confirm(
        isAr
          ? "هل أنت متأكد من حذف كود الخصم هذا؟"
          : "Are you sure you want to delete this coupon?",
      )
    )
      return;
    try {
      await deleteCoupon(id);
      if (true) {
        loadCoupons();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatPromotionMessage = (text: string, code: string, percent: number) => {
    const cleaned = text
      .replace(/\*\*/g, '')
      .replace(/^[#>]+\s*/gm, '')
      .replace(/\s+/g, ' ')
      .trim();

    const sentences = cleaned
      .split(/(?<=[.!؟!])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    const lead = sentences[0] || `خصم ${percent}% على خدمات SpaceQuiz`;
    const details = sentences.slice(1).join(' ') || 'استفيدوا من العرض وابدأوا تجربتكم الآن.';

    return [
      `🎁 عرض خاص من SpaceQuiz`,
      '',
      `استخدموا كود الخصم: ${code}`,
      `واحصلوا على خصم ${percent}% على خدماتنا.`,
      '',
      `✨ ${lead}`,
      details ? `📌 ${details}` : '',
      '',
      '⏳ العرض لفترة محدودة.',
      '🚀 سارعوا بالاشتراك الآن واستفيدوا من الخصم!',
    ].filter(Boolean).join('\n');
  };

  const handleGenerateAiMessageForCoupon = async (
    code: string,
    percent: number,
  ) => {
    setIsGeneratingAi(true);
    try {
      const prompt = `أنت كاتب تسويق عربي محترف. اكتب جملة أو جملتين فقط، جذابتين وواضحتين، عن كود الخصم ${code} ونسبة الخصم ${percent}%. لا تستخدم Markdown أو علامات ** أو عناوين أو مقدمات، ولا تكرر الكود أو النسبة أكثر من مرة.`;
      const { text } = await askAI(prompt);
      setAiPromoMsg(formatPromotionMessage(text || '', code, percent));
    } catch (err) {
      console.error(err);
      setAiPromoMsg(formatPromotionMessage('', code, percent));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleBroadcastMessage = async () => {
    if (!aiPromoMsg.trim()) {
      alert(
        isAr
          ? "برجاء توليد أو كتابة نص الرسالة أولاً."
          : "Please enter or generate message content first.",
      );
      return;
    }
    setIsBroadcasting(true);
    try {
      const usersData = await getAllProfiles();
      
      const messagesToInsert = usersData
        .filter(u => (u.uid || u.id) && (u.uid || u.id) !== 'anonymous')
        .map(u => ({
          id: 'msg-' + Math.random().toString(36).substring(2, 11),
          sender_id: COSMO_ADMIN_UID,
          sender_name: isAr ? 'المساعد كوزمو' : 'Cosmo Assistant',
          receiver_id: u.uid || u.id,
          receiver_name: u.name || 'Student',
          text: aiPromoMsg,
          is_read: false
        }));

      try {
        if (messagesToInsert.length > 0) {
          await supabase.from('direct_messages').insert(messagesToInsert);
        }
      } catch (e) {
        console.warn('Could not insert direct messages to database:', e);
      }

      await createCommunityPost(
        aiPromoMsg,
        COSMO_ADMIN_UID,
        isAr ? 'المساعد كوزمو' : 'Cosmo Assistant',
        '🤖',
        '#8b5cf6'
      );

      let pushSent = 0;
      try {
        const { data: pushResult, error: pushError } = await supabase.functions.invoke('send-promotion-push', {
          body: {
            title: isAr ? '🎁 عرض جديد من SpaceQuiz' : '🎁 New SpaceQuiz offer',
            body: aiPromoMsg.replace(/\n+/g, ' ').slice(0, 180),
            url: 'https://quiz-space-app.pages.dev/#/dashboard/landing',
            category: 'promotion',
          },
        });
        if (pushError) console.warn('Push broadcast was not delivered:', pushError.message);
        pushSent = Number(pushResult?.sent || 0);
      } catch (pushError) {
        console.warn('Push broadcast is unavailable until the Edge Function is deployed:', pushError);
      }

      alert(
        isAr
          ? `تم بث الإعلان بنجاح ونشره بالمجتمع! الرسائل الخاصة: ${messagesToInsert.length}، وإشعارات الهاتف: ${pushSent}.`
          : `Promotion broadcasted successfully! Direct messages: ${messagesToInsert.length}; push notifications: ${pushSent}.`,
      );
      setAiPromoMsg("");
    } catch (err) {
      console.error(err);
      alert(isAr ? "فشل إرسال البث لجميع الطلاب." : "Failed to broadcast message.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleActivateSubscription = async () => {
    if (!selectedUser) return;
    const plan = mockPlans.find((p) => p.id === selectedPlanId);

    const targetPlanName = plan ? plan.name : "Free";
    const targetIsPremium = !!plan;

    try {
      if (plan?.id === "diamond") {
        const proposedName = `${selectedUser.name || "QuizSpace"} ${isAr ? "للتعليم" : "Education"}`;
        const institutionName = window.prompt(
          isAr ? "اكتب اسم المدرسة أو المؤسسة:" : "Enter the school or institution name:",
          proposedName,
        )?.trim();
        if (!institutionName) return;

        const seatInput = window.prompt(
          isAr ? "عدد المقاعد (من 1 إلى 100، الافتراضي 15):" : "Seat count (1–100, default 15):",
          "15",
        );
        const seatLimit = Number.parseInt(seatInput || "15", 10);
        if (!Number.isInteger(seatLimit) || seatLimit < 1 || seatLimit > 100) {
          alert(isAr ? "عدد المقاعد يجب أن يكون بين 1 و100." : "Seat count must be between 1 and 100.");
          return;
        }

        await activateDiamondInstitution(selectedUser.userId, institutionName, seatLimit);
        alert(isAr ? "تم تفعيل المؤسسة والمقاعد. يمكن للمالك الآن إدارة الفريق من مساحة المؤسسة." : "Institution and seats activated. The owner can now manage the team from Institution Workspace.");
        await loadRealData();
        return;
      }

      const isLifetime = Boolean(plan?.isLifetime || plan?.badgeStyle === 'lifetime');
      const isFounder = Boolean(plan?.badgeStyle === 'founder');
      const renewalDate = targetIsPremium && !isLifetime && !isFounder && subscriptionRenewalDate
        ? new Date(`${subscriptionRenewalDate}T23:59:59`).toISOString()
        : undefined;
      const { error } = await updateUserSubscription(selectedUser.userId, targetIsPremium, targetPlanName, plan?.id, isLifetime, isFounder, renewalDate);

      if (!error) {
        alert(
          isAr
            ? "تم تحديث خطة الاشتراك بنجاح في قاعدة البيانات!"
            : "Subscription plan updated successfully in database!",
        );
        // Update local state right away
        const updatedUsers = mockUsers.map((u) => {
          if (u.userId === selectedUser.userId) {
            if (!plan) {
              // Free
              return {
                ...u,
                isPremium: false,
                planId: undefined,
                planName: "Free",
                isLifetime: false,
                isFounder: false,
                renewalDate: undefined,
                membershipStatus: 'free' as const,
                isMembershipExpired: false,
              };
            }
            return {
              ...u,
              isPremium: true,
              planId: plan.id,
              planName: plan.name,
              isLifetime: plan.badgeStyle === "lifetime" || plan.isLifetime,
              isFounder: plan.badgeStyle === "founder",
              renewalDate,
              membershipStatus: 'active' as const,
              isMembershipExpired: false,
            };
          }
          return u;
        });

        setMockUsers(updatedUsers);
        setSelectedUser(
          updatedUsers.find((u) => u.userId === selectedUser.userId) || null,
        );
        setSubscriptionRenewalDate(renewalDate ? renewalDate.slice(0, 10) : '');
        // Refresh with all database info too
        loadRealData();
      } else {
        alert(
          isAr
            ? `فشل تحديث اشتراك العضو: ${error.message}`
            : `Failed to update subscription: ${error.message}`,
        );
      }
    } catch (err) {
      console.error(err);
      alert(
        isAr
          ? "فشل الاتصال بالخادم لتحديث الاشتراك."
          : "Server connection failed while updating subscription.",
      );
    }
  };

  const handleSuspend = () => {
    if (!selectedUser) return;
    void (async () => {
      const nextSuspended = !selectedUser.isSuspended;
      try {
        await updateAdminUserSuspension(selectedUser.userId, nextSuspended);
        const updatedUsers = mockUsers.map((u) => u.userId === selectedUser.userId ? { ...u, isSuspended: nextSuspended } : u);
        setMockUsers(updatedUsers);
        setSelectedUser(updatedUsers.find((u) => u.userId === selectedUser.userId) || null);
        showToast('success', isAr ? (nextSuspended ? 'تم إيقاف الحساب وحفظ الحالة.' : 'تمت استعادة الحساب وحفظ الحالة.') : (nextSuspended ? 'Account suspended and saved.' : 'Account restored and saved.'));
      } catch (error: any) {
        showToast('error', error?.message || (isAr ? 'تعذر حفظ حالة الحساب.' : 'Unable to save account status.'));
      }
    })();
  };

  const approvePayment = async (payId: string) => {
    try {
      const payInfo = mockPayments.find((p) => p.id === payId) || paymentLedger.find((p) => p.id === payId);
      if (!payInfo) return;

      await updatePremiumRequest(
        payId,
        'approved',
        payInfo.userId,
        undefined,
        payInfo.planName,
      );

      setMockPayments((prev) => prev.filter((p) => p.id !== payId));
      setPaymentLedger((prev) =>
        prev.map((p) => (p.id === payId ? { ...p, status: 'approved' as const, updatedAt: new Date().toISOString() } : p))
      );
      if (inspectingPayment?.id === payId) {
        setInspectingPayment((prev) => prev ? { ...prev, status: 'approved' as const, updatedAt: new Date().toISOString() } : null);
      }
      showToast('success', isAr ? "تم قبول الدفعة وتفعيل الاشتراك بنجاح 🚀" : "Payment approved and subscription activated 🚀");

      try {
        const { createNotification } = await import("../lib/db");
        await createNotification(
          isAr ? "ترقية للباقة المتقدمة 🚀" : "Premium Upgrade 🚀",
          isAr
            ? `انضم مستخدم جديد لباقة ${payInfo.planName}! نتمنى له رحلة ممتعة.`
            : `A user has just upgraded to ${payInfo.planName}! We wish them a great journey.`,
          "System",
          "community",
        );
      } catch (e) {
        console.error(e);
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', isAr ? "فشل قبول العملية: " + err.message : "Failed to approve: " + err.message);
    }
  };

  const rejectPayment = async (payId: string, customReason?: string) => {
    try {
      const payInfo = mockPayments.find((p) => p.id === payId) || paymentLedger.find((p) => p.id === payId);
      if (!payInfo) return;

      const reason = customReason || (isAr ? "بيانات التحويل غير مطابقة أو الإيصال غير صالح" : "Payment details or receipt invalid");
      const { error } = await supabase.from('premium_requests').update({
        status: 'rejected',
        reject_reason: reason,
        updated_at: new Date().toISOString(),
      }).eq('id', payId);

      if (!error) {
        setMockPayments((prev) => prev.filter((p) => p.id !== payId));
        setPaymentLedger((prev) =>
          prev.map((p) => (p.id === payId ? { ...p, status: 'rejected' as const, rejectReason: reason, updatedAt: new Date().toISOString() } : p))
        );
        if (inspectingPayment?.id === payId) {
          setInspectingPayment((prev) => prev ? { ...prev, status: 'rejected' as const, rejectReason: reason, updatedAt: new Date().toISOString() } : null);
        }
        showToast('info', isAr ? "تم رفض الطلب وتحديث السجل." : "Payment marked as rejected.");
      }
    } catch (err) {
      console.error(err);
      showToast('error', isAr ? "تعذر تحديث حالة الرفض" : "Failed to reject payment");
    }
  };

  const requestPaymentInfo = async (payId: string) => {
    try {
      const { error } = await supabase.from('premium_requests').update({
        status: 'needs_info',
        updated_at: new Date().toISOString(),
      }).eq('id', payId);
      if (error) throw error;
      setMockPayments((prev) => prev.filter((p) => p.id !== payId));
      setPaymentLedger((prev) =>
        prev.map((p) => (p.id === payId ? { ...p, status: 'needs_info' as const, updatedAt: new Date().toISOString() } : p))
      );
      if (inspectingPayment?.id === payId) {
        setInspectingPayment((prev) => prev ? { ...prev, status: 'needs_info' as const, updatedAt: new Date().toISOString() } : null);
      }
      showToast('success', isAr ? 'تم تحويل الطلب إلى يحتاج معلومات.' : 'Payment marked as needing more information.');
    } catch (error: any) {
      showToast('error', error?.message || (isAr ? 'تعذر تحديث حالة الدفع.' : 'Unable to update payment status.'));
    }
  };

  const exportLedgerToCSV = () => {
    if (paymentLedger.length === 0) {
      showToast('info', isAr ? 'لا توجد بيانات لتصديرها' : 'No records to export');
      return;
    }
    const headers = ['ID', 'User Name', 'User ID', 'Email', 'Plan', 'Amount', 'Payment Method', 'Status', 'Submitted At', 'Updated At', 'Reject Reason'];
    const rows = filteredLedger.map((item) => [
      item.id,
      `"${(item.userName || '').replace(/"/g, '""')}"`,
      item.userId,
      item.email || '',
      `"${(item.planName || '').replace(/"/g, '""')}"`,
      item.amount || '',
      item.method || item.paymentMethod || '',
      item.status,
      item.submittedAt || '',
      item.updatedAt || '',
      `"${(item.rejectReason || item.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `quizspace-payment-ledger-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', isAr ? 'تم تصدير سجل المدفوعات بنجاح' : 'Payment ledger exported successfully');
  };

  const filteredLedger = paymentLedger.filter((item) => {
    if (ledgerStatusFilter !== 'all' && item.status !== ledgerStatusFilter) return false;
    if (ledgerMethodFilter !== 'all') {
      const m = (item.method || item.paymentMethod || '').toLowerCase();
      if (!m.includes(ledgerMethodFilter.toLowerCase())) return false;
    }
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase().trim();
      const matchName = (item.userName || '').toLowerCase().includes(q);
      const matchEmail = (item.email || '').toLowerCase().includes(q);
      const matchUserId = (item.userId || '').toLowerCase().includes(q);
      const matchPlan = (item.planName || '').toLowerCase().includes(q);
      const matchMethod = (item.method || item.paymentMethod || '').toLowerCase().includes(q);
      const matchNotes = (item.notes || item.rejectReason || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchUserId && !matchPlan && !matchMethod && !matchNotes) return false;
    }
    return true;
  });

  const ledgerStats = {
    total: paymentLedger.length,
    approved: paymentLedger.filter((p) => p.status === 'approved').length,
    pending: paymentLedger.filter((p) => p.status === 'pending').length,
    rejected: paymentLedger.filter((p) => p.status === 'rejected').length,
    needsInfo: paymentLedger.filter((p) => p.status === 'needs_info').length,
    totalVolumeEGP: paymentLedger
      .filter((p) => p.status === 'approved')
      .reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : Number(p.amount) || 0), 0),
  };

  const openNewPlan = () => {
    setPlanDraft({ id: `custom-${Date.now().toString(36)}`, name: '', nameAr: '', price: 0, currency: 'EGP', durationMonths: 1, features: [], badgeStyle: 'pro', badgeColor: '#3b82f6', priorityLevel: 1, isActive: true });
    setSelectedPlanId('new');
  };

  const openEditPlan = (plan: SubscriptionPlan) => {
    setPlanDraft({ ...plan, features: [...(plan.features || [])] });
    setSelectedPlanId(`edit:${plan.id}`);
  };

  const savePlan = async () => {
    if (!planDraft.name.trim() || planDraft.price < 0 || planDraft.durationMonths < 1) {
      showToast('error', isAr ? 'أكمل اسم الخطة والسعر والمدة بشكل صحيح.' : 'Enter a valid plan name, price, and duration.');
      return;
    }
    setIsSavingPlan(true);
    try {
      const saved = await saveAdminSubscriptionPlan({ ...planDraft, name: planDraft.name.trim(), features: planDraft.features.filter(Boolean) });
      setMockPlans((prev) => [...prev.filter((p) => p.id !== saved.id), saved].sort((a, b) => a.priorityLevel - b.priorityLevel));
      setSelectedPlanId('');
      showToast('success', isAr ? 'تم حفظ الخطة على الخادم.' : 'Plan saved to the server.');
    } catch (error: any) {
      showToast('error', error?.message || (isAr ? 'تعذر حفظ الخطة.' : 'Unable to save the plan.'));
    } finally { setIsSavingPlan(false); }
  };

  const removePlan = async (plan: SubscriptionPlan) => {
    if (planBusyId) return;
    if (!window.confirm(isAr ? `حذف خطة «${plan.name}»؟` : `Delete “${plan.name}”?`)) return;
    setPlanBusyId(plan.id);
    try {
      await deleteAdminSubscriptionPlan(plan.id);
      setMockPlans((prev) => prev.filter((p) => p.id !== plan.id));
      showToast('success', isAr ? 'تم حذف الخطة.' : 'Plan deleted.');
    } catch (error: any) {
      showToast('error', error?.message || (isAr ? 'تعذر حذف الخطة.' : 'Unable to delete the plan.'));
    } finally { setPlanBusyId(null); }
  };

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Sub Tabs */}
      <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-2 dark:border-slate-800 sm:flex sm:overflow-x-auto">
        <button
          type="button"
          onClick={() => setSubTab("users")}
          className={`min-h-11 rounded-xl px-3 py-2 text-center text-xs font-black transition-colors sm:px-4 sm:text-sm ${subTab === "users" ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}
        >
          {isAr ? "إدارة اشتراكات المستخدمين" : "User Subscriptions"}
        </button>
        <button
          type="button"
          onClick={() => setSubTab("payments")}
          className={`min-h-11 rounded-xl px-3 py-2 text-center text-xs font-black transition-colors sm:px-4 sm:text-sm flex items-center justify-center gap-1.5 ${subTab === "payments" ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}
        >
          <span>{isAr ? "طلبات وسجل المدفوعات" : "Payments & Ledger"}</span>
          {mockPayments.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] animate-pulse">
              {mockPayments.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSubTab("plans")}
          className={`min-h-11 rounded-xl px-3 py-2 text-center text-xs font-black transition-colors sm:px-4 sm:text-sm ${subTab === "plans" ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}
        >
          {isAr ? "الخطط المخصصة" : "Custom Plans"}
        </button>
        <button
          type="button"
          onClick={() => setSubTab("coupons")}
          className={`min-h-11 rounded-xl px-3 py-2 text-center text-xs font-black transition-colors sm:px-4 sm:text-sm ${subTab === "coupons" ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}
        >
          {isAr ? "إدارة أكواد الخصم 🎫" : "Discount Coupons 🎫"}
        </button>
      </div>

      {/* Users Tab */}
      {subTab === "users" && !selectedUser && (
        <div className="space-y-6 text-sm">
          {/* Trial Analytics Dashboard Card */}
          {(() => {
            const now = Date.now();
            const activeTrials = mockUsers.filter(u => u.isPremium);
            const expiringSoon = activeTrials.filter(u => {
              const renewal = (u as any).renewalDate ? new Date((u as any).renewalDate).getTime() : 0;
              if (!renewal) return false;
              const diffDays = Math.ceil((renewal - now) / (1000 * 60 * 60 * 24));
              return diffDays > 0 && diffDays <= 3;
            });
            return (
              <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-6 rounded-3xl border border-indigo-500/30 text-white shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-500/20 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-black">
                      📊
                    </span>
                    <div>
                      <h3 className="text-base font-black">
                        {isAr ? "إحصائيات الفترات التجريبية والاشتراكات" : "Trial & Subscription Analytics"}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {isAr ? "متابعة حية للاشتراكات النشطة والحسابات القريبة من انتهاء الفترة التجريبية" : "Live tracking of active subscriptions and expiring trials"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-black">
                      {isAr ? `إجمالي النشطين: ${activeTrials.length}` : `Active Total: ${activeTrials.length}`}
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/35 text-rose-300 text-xs font-black animate-pulse">
                      {isAr ? `ينتهي قريباً (≤3 أيام): ${expiringSoon.length}` : `Expiring Soon (≤3d): ${expiringSoon.length}`}
                    </span>
                  </div>
                </div>

                {expiringSoon.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>{isAr ? "حسابات تجريبية تقترب من انتهاء الصلاحية:" : "Trials expiring in 3 days or less:"}</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {expiringSoon.map((u) => {
                        const renewal = new Date((u as any).renewalDate).getTime();
                        const daysLeft = Math.ceil((renewal - now) / (1000 * 60 * 60 * 24));
                        return (
                          <div key={u.userId} className="bg-slate-900/90 border border-rose-500/40 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-md">
                            <div className="min-w-0">
                              <p className="font-bold text-xs truncate text-white">{u.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{u.email || u.userId}</p>
                              <p className="text-[10px] text-rose-400 font-extrabold mt-0.5">
                                {isAr ? `متبقي ${daysLeft} أيام فقط` : `${daysLeft} days left`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedUser(u)}
                              className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] transition-all shrink-0 cursor-pointer"
                            >
                              {isAr ? "إدارة" : "Manage"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-4 gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 dark:text-white mb-2">
                {isAr ? "تفعيل يدوي برقم UID" : "Manual Activation by UID"}
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="manual_uid_input"
                  type="text"
                  placeholder="User UID"
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs outline-none"
                />
                <select
                  id="manual_plan_select"
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs outline-none"
                >
                  {mockPlans.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    const uidVal = (
                      document.getElementById(
                        "manual_uid_input",
                      ) as HTMLInputElement
                    ).value;
                    const planVal = (
                      document.getElementById(
                        "manual_plan_select",
                      ) as HTMLSelectElement
                    ).value;
                    if (!uidVal) return;
                    try {
                      const { error } = await updateUserSubscription(uidVal, true, planVal);

                      if (!error) {
                        alert(
                          isAr
                            ? `تم تفعيل حساب ${uidVal} بنجاح لخطة ${planVal}`
                            : `Activated ${uidVal} successfully to ${planVal}`,
                        );
                        loadRealData();

                        try {
                          await createNotification(
                            isAr ? "عضو جديد في الباقات" : "New Premium Member",
                            isAr
                              ? `انضم مستخدم جديد لباقة ${planVal}! مرحباً بك في عائلة Quiz Space.`
                              : `A new user joined the ${planVal} plan! Welcome to the Quiz Space family.`,
                            "System",
                            "community",
                          );
                        } catch (e) {
                          console.error("Failed to broadcast global activation notification", e);
                        }
                        return;
                      } else {
                        alert(
                          isAr
                            ? "فشل تفعيل الاشتراك: " + error.message
                            : "Failed to activate subscription: " + error.message,
                        );
                        return;
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="min-h-11 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs"
                >
                  {isAr ? "تفعيل" : "Activate"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:hidden">
            {mockUsers.map((user, idx) => (
              <article key={user.userId || idx} className="glass-panel rounded-2xl border border-slate-200/50 p-4 dark:border-slate-700/50">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => onViewProfile?.(user.userId)} className="min-w-0 text-start">
                    <p className="truncate text-sm font-black text-slate-900 dark:text-white">{user.name}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{user.email || user.userId}</p>
                  </button>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${user.isSuspended || user.isMembershipExpired ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{user.isSuspended ? (isAr ? 'موقوف' : 'Suspended') : user.isMembershipExpired ? (isAr ? 'منتهية' : 'Expired') : (isAr ? 'نشط' : 'Active')}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{user.planName || 'Free'}</span><button type="button" onClick={() => { setSelectedUser(user); setSelectedPlanId(user.planId || ''); setSubscriptionRenewalDate(user.renewalDate ? user.renewalDate.slice(0, 10) : ''); }} className="min-h-11 rounded-xl bg-blue-500/10 px-4 font-bold text-blue-600">{isAr ? 'إدارة' : 'Manage'}</button></div>
              </article>
            ))}
          </div>
          <div className="glass-panel hidden overflow-x-auto p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 md:block">
            <table className="w-full text-left" dir={isAr ? "rtl" : "ltr"}>
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">{isAr ? "المستخدم" : "User"}</th>
                  <th className="px-4 py-3">{isAr ? "الخطة" : "Plan"}</th>
                  <th className="px-4 py-3 text-center">
                        {isAr ? "حالة" : "Status"}
                      </th>
                      <th className="px-4 py-3">{isAr ? "ينتهي في" : "Expires"}</th>
                      <th className="px-4 py-3 text-center">
                    {isAr ? "إجراءات" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockUsers.map((user, idx) => (
                  <tr
                    key={user.userId || idx}
                    className="border-b border-slate-200/50 dark:border-slate-700/50 last:border-0"
                  >
                    <td
                      onClick={() => onViewProfile?.(user.userId)}
                      title={isAr ? "عرض الملف الشخصي" : "View profile"}
                      className="px-4 py-3 font-bold text-slate-800 dark:text-white cursor-pointer hover:text-primary transition-colors"
                    >
                      <div className="flex items-center gap-2">{user.name}{(user.isLifetime || user.isFounder) && <UserBadge tier={user.isFounder ? "founder" : "lifetime"} size="sm" showTooltip={false} />}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {user.planName || "Free"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 text-[10px] font-bold rounded-md ${user.isSuspended || user.isMembershipExpired ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}
                      >
                        {user.isSuspended
                          ? isAr
                            ? "موقوف"
                            : "Suspended"
                          : user.isMembershipExpired
                            ? (isAr ? "منتهية" : "Expired")
                            : isAr
                              ? "نشط"
                              : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {user.renewalDate ? new Date(user.renewalDate).toLocaleString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }) : user.isLifetime || user.isFounder ? (isAr ? 'بدون انتهاء' : 'No expiry') : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => { setSelectedUser(user); setSelectedPlanId(user.planId || ''); setSubscriptionRenewalDate(user.renewalDate ? user.renewalDate.slice(0, 10) : ''); }}
                        className="px-3 py-1 bg-blue-500/10 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-500/20"
                      >
                        {isAr ? "إدارة" : "Manage"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected User Management */}
      {subTab === "users" && selectedUser && (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedUser(null)}
            className="text-sm font-bold text-blue-500 mb-2 block"
          >
            &larr; {isAr ? "عودة للقائمة" : "Back to list"}
          </button>
          <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-display font-black text-xl flex items-center gap-2">
                  {isAr ? "إدارة المستخدم:" : "Manage User:"}{" "}
                  {selectedUser.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedUser.email}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onViewProfile?.(selectedUser.userId)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
                >
                  {isAr ? "عرض الملف" : "View Profile"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">
                  {isAr ? "إدارة الاشتراك والخطة" : "Change Plan"}
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">
                    {isAr
                      ? "مجاني (إزالة الاشتراك)"
                      : "Free (Remove Subscription)"}
                  </option>
                  {mockPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isLifetime ? "✨" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">
                  {isAr ? "تاريخ الانتهاء" : "Expiry Date"}
                </label>
                  <input
                  type="date"
                  value={subscriptionRenewalDate}
                  onChange={(e) => setSubscriptionRenewalDate(e.target.value)}
                  disabled={selectedUser.isLifetime || selectedUser.isFounder}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500">
                  {isAr ? "ملاحظات إدارية" : "Admin Notes"}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? "اكتب ملاحظة هنا..." : "Enter note..."}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-sm border-t border-slate-200/50 dark:border-slate-700/50 pt-6">
              <button
                onClick={handleActivateSubscription}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold hover:opacity-90"
              >
                {isAr ? "تفعيل الاشتراك" : "Activate Subscription"}
              </button>
              <button
                onClick={handleSuspend}
                className={`px-4 py-3 rounded-xl font-bold transition-colors ${selectedUser.isSuspended ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"}`}
              >
                {selectedUser.isSuspended
                  ? isAr
                    ? "إلغاء الإيقاف (استعادة)"
                    : "Unban / Restore"
                  : isAr
                    ? "إيقاف / حظر (Ban)"
                    : "Ban / Suspend"}
              </button>
              <button
                onClick={() => {
                  setSelectedPlanId("");
                  handleActivateSubscription();
                }}
                className="px-4 py-3 bg-red-500/10 text-red-600 rounded-xl font-bold hover:bg-red-500/20"
              >
                {isAr ? "إزالة" : "Remove"}
              </button>
              <button
                onClick={handleSuspend}
                className="px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
              >
                {isAr ? "تعطيل الحساب على الخادم" : "Deactivate account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {subTab === "payments" && (
        <div className="space-y-6">
          {/* Top Sub-Navigation Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <span>{isAr ? "إدارة ومراجعة طلبات الدفع والاشتراكات" : "Payment Operations & Ledger"}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isAr
                  ? "مراجعة وتفعيل إيصالات المشتركين أو تصفح السجل الكامل لكافة المعاملات المالية السابقة."
                  : "Review pending subscriber receipts or browse the complete historical ledger of all payment requests."}
              </p>
            </div>

            {/* Segmented Switch: Queue vs Ledger */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setPaymentViewMode("queue")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                  paymentViewMode === "queue"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Clock className="w-4 h-4 text-amber-500" />
                <span>{isAr ? "طابور الطلبات المعلقة" : "Pending Queue"}</span>
                {mockPayments.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                    {mockPayments.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPaymentViewMode("ledger")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                  paymentViewMode === "ledger"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4 text-purple-500" />
                <span>{isAr ? "سجل طلبات الدفع والعمليات" : "Payment Ledger"}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black">
                  {paymentLedger.length}
                </span>
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: PENDING QUEUE */}
          {paymentViewMode === "queue" && (
            <div className="space-y-4">
              {paymentLoadError ? (
                <div className="rounded-2xl border border-rose-300/50 bg-rose-500/10 p-5 text-sm text-rose-700 dark:text-rose-300">
                  <p className="font-bold">{paymentLoadError}</p>
                  <button
                    type="button"
                    onClick={() => void loadRealData()}
                    className="mt-3 min-h-11 rounded-xl bg-rose-600 px-4 py-2 font-bold text-white transition hover:bg-rose-700"
                  >
                    {isAr ? "إعادة المحاولة" : "Retry"}
                  </button>
                </div>
              ) : mockPayments.length === 0 ? (
                <div className="glass-panel rounded-3xl border border-slate-200/60 dark:border-slate-800 p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                      {isAr ? "لا توجد طلبات دفع معلقة حالياً" : "No pending payment requests"}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {isAr
                        ? "رائع! تم اعتماد ومراجعة جميع طلبات الدفع المرسلة. يمكنك الانتقال إلى السجل للاطلاع على العمليات المعتمدة السابقة."
                        : "All caught up! All submitted payment requests have been reviewed. You can browse the payment ledger to review past records."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentViewMode("ledger")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-black text-xs shadow-md hover:opacity-95 transition-all"
                  >
                    <span>{isAr ? "عرض سجل جميع العمليات" : "View Complete Ledger"}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-13rem)] overflow-y-auto overscroll-contain pr-1 sm:pr-2">
                  <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                    <span>
                      {isAr
                        ? `يتم عرض ${mockPayments.length} طلب دفع معلق — مرّر لرؤية القائمة كاملة.`
                        : `${mockPayments.length} pending payment requests — scroll to review the full queue.`}
                    </span>
                    <span className="text-[11px] text-primary underline cursor-pointer" onClick={() => setPaymentViewMode("ledger")}>
                      {isAr ? "فتح السجل الكامل" : "Open Full Ledger"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {mockPayments.map((pay, idx) => (
                      <div
                        key={pay.id || idx}
                        className="glass-panel overflow-hidden rounded-2xl border border-slate-200/50 p-4 dark:border-slate-700/50 sm:p-5"
                      >
                        <div className="mb-4 flex flex-col gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-700/60 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h4 className="truncate text-base font-black text-slate-900 dark:text-white sm:text-lg">
                              {pay.userName}
                            </h4>
                            <p className="mt-1 truncate text-[11px] text-slate-500">
                              {pay.userId || (isAr ? "مستخدم" : "User")}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1 sm:shrink-0">
                            <button
                              type="button"
                              onClick={() => approvePayment(pay.id)}
                              aria-label={isAr ? "قبول وتفعيل" : "Approve and activate"}
                              title={isAr ? "قبول وتفعيل" : "Approve & Activate"}
                              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2 text-emerald-500 transition-colors hover:bg-emerald-500/10 cursor-pointer"
                            >
                              <CheckCircle className="w-5 h-5" />
                              <span className="hidden text-[11px] font-black sm:inline">
                                {isAr ? "اعتماد" : "Approve"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => requestPaymentInfo(pay.id)}
                              aria-label={isAr ? "طلب المزيد من المعلومات" : "Request more information"}
                              title={isAr ? "طلب المزيد من المعلومات" : "Request Info"}
                              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2 text-amber-500 transition-colors hover:bg-amber-500/10 cursor-pointer"
                            >
                              <Edit2 className="w-5 h-5" />
                              <span className="hidden text-[11px] font-black sm:inline">
                                {isAr ? "معلومات" : "Info"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectPayment(pay.id)}
                              aria-label={isAr ? "رفض الدفع" : "Reject payment"}
                              title={isAr ? "رفض" : "Reject"}
                              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2 text-red-500 transition-colors hover:bg-red-500/10 cursor-pointer"
                            >
                              <XCircle className="w-5 h-5" />
                              <span className="hidden text-[11px] font-black sm:inline">
                                {isAr ? "رفض" : "Reject"}
                              </span>
                            </button>
                          </div>
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                          <div className="rounded-xl bg-slate-100/70 p-3 dark:bg-slate-800/60">
                            <span className="block text-[10px] font-bold text-slate-500">{isAr ? "الخطة" : "Plan"}</span>
                            <span className="mt-1 block truncate font-black text-slate-800 dark:text-slate-100">
                              {pay.planName}
                            </span>
                          </div>
                          <div className="rounded-xl bg-slate-100/70 p-3 dark:bg-slate-800/60">
                            <span className="block text-[10px] font-bold text-slate-500">
                              {isAr ? "طريقة الدفع" : "Payment method"}
                            </span>
                            <span className="mt-1 block truncate font-black text-slate-800 dark:text-slate-100">
                              {pay.method === "instapay"
                                ? "InstaPay"
                                : pay.method === "vodafone" || pay.method === "vodafone_cash"
                                ? "Vodafone Cash"
                                : pay.method === "bank_transfer"
                                ? isAr
                                  ? "تحويل بنكي"
                                  : "Bank transfer"
                                : isAr
                                ? "غير محددة"
                                : "Not specified"}
                            </span>
                          </div>
                          <div className="col-span-2 rounded-xl bg-emerald-500/10 p-3 sm:col-span-1">
                            <span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                              {isAr ? "المبلغ" : "Amount"}
                            </span>
                            <span className="mt-1 block text-xl font-black text-emerald-600">
                              {typeof pay.amount === "number"
                                ? pay.amount.toLocaleString(isAr ? "ar-EG" : "en-US")
                                : pay.amount || "—"}{" "}
                              <span className="text-xs">{isAr ? "ج.م" : "EGP"}</span>
                            </span>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200/70 bg-slate-100/40 p-3 dark:border-slate-700/70 dark:bg-slate-900/40">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-[11px] font-black text-slate-500">{isAr ? "إيصال الدفع" : "Payment receipt"}</p>
                            {pay.receiptUrl && (
                              <button
                                type="button"
                                onClick={() => setInspectingPayment(pay as any)}
                                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>{isAr ? "تكبير وفحص" : "Inspect"}</span>
                              </button>
                            )}
                          </div>
                          {pay.receiptUrl ? (
                            pay.receiptUrl.startsWith("data:image") ? (
                              <img
                                src={pay.receiptUrl}
                                alt={isAr ? "إيصال الدفع" : "Payment receipt"}
                                onClick={() => setInspectingPayment(pay as any)}
                                className="h-auto max-h-72 w-full rounded-xl border border-slate-200 bg-white object-contain p-1 dark:border-slate-700 dark:bg-slate-950 cursor-pointer hover:opacity-95 transition-opacity"
                              />
                            ) : (
                              <a
                                href={pay.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-11 items-center rounded-xl bg-blue-500/10 px-3 text-xs font-bold text-blue-500 underline"
                              >
                                {isAr ? "عرض الإيصال / التفاصيل" : "View Receipt / Details"}
                              </a>
                            )
                          ) : (
                            <span className="text-xs text-slate-500 italic">
                              {isAr ? "لا يوجد ايصال مرفق" : "No receipt attached"}
                            </span>
                          )}
                          {pay.notes && (
                            <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs leading-5 text-slate-700 dark:text-slate-200">
                              <strong>{isAr ? "ملاحظات: " : "Notes: "}</strong>
                              {pay.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: COMPLETE PAYMENT REQUESTS LEDGER */}
          {paymentViewMode === "ledger" && (
            <div className="space-y-6">
              {/* Summary Metrics Ribbon */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="glass-panel rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold">{isAr ? "إجمالي العمليات" : "Total Requests"}</span>
                    <FileText className="w-4 h-4 text-purple-500" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {ledgerStats.total}
                  </p>
                </div>

                <div className="glass-panel rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold">{isAr ? "المعتمدة والمفعلة" : "Approved"}</span>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {ledgerStats.approved}
                  </p>
                </div>

                <div className="glass-panel rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold">{isAr ? "قيد الانتظار" : "Pending"}</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-amber-500">
                    {ledgerStats.pending}
                  </p>
                </div>

                <div className="glass-panel rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold">{isAr ? "إجمالي الإيرادات" : "Total Volume"}</span>
                    <Crown className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="mt-2 text-xl font-black text-slate-900 dark:text-white truncate">
                    {ledgerStats.totalVolumeEGP.toLocaleString(isAr ? "ar-EG" : "en-US")}{" "}
                    <span className="text-xs text-slate-400 font-bold">{isAr ? "ج.م" : "EGP"}</span>
                  </p>
                </div>
              </div>

              {/* Ledger Controls & Filters */}
              <div className="glass-panel rounded-3xl border border-slate-200/70 p-4 sm:p-5 dark:border-slate-800 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  {/* Search Input */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      placeholder={isAr ? "بحث بالاسم، البريد، الباقة، طريقة الدفع..." : "Search by name, email, plan, method..."}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                    />
                    {ledgerSearch && (
                      <button
                        type="button"
                        onClick={() => setLedgerSearch("")}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Actions & Filters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Method Filter */}
                    <select
                      value={ledgerMethodFilter}
                      onChange={(e) => setLedgerMethodFilter(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">{isAr ? "جميع طرق الدفع" : "All Methods"}</option>
                      <option value="instapay">InstaPay</option>
                      <option value="vodafone">Vodafone Cash</option>
                      <option value="bank">Bank Transfer</option>
                    </select>

                    {/* Reload Button */}
                    <button
                      type="button"
                      onClick={() => void loadLedgerOnly()}
                      disabled={isLedgerLoading}
                      title={isAr ? "تحديث السجل" : "Refresh ledger"}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLedgerLoading ? "animate-spin text-primary" : ""}`} />
                    </button>

                    {/* CSV Export Button */}
                    <button
                      type="button"
                      onClick={exportLedgerToCSV}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-black text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-primary" />
                      <span>{isAr ? "تصدير CSV" : "Export CSV"}</span>
                    </button>
                  </div>
                </div>

                {/* Status Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {[
                    { id: "all", label: isAr ? "الكل" : "All", count: paymentLedger.length },
                    { id: "pending", label: isAr ? "قيد الانتظار" : "Pending", count: ledgerStats.pending, color: "text-amber-500" },
                    { id: "approved", label: isAr ? "معتمد ومفعل" : "Approved", count: ledgerStats.approved, color: "text-emerald-500" },
                    { id: "rejected", label: isAr ? "مرفوض" : "Rejected", count: ledgerStats.rejected, color: "text-rose-500" },
                    { id: "needs_info", label: isAr ? "يحتاج معلومات" : "Needs Info", count: ledgerStats.needsInfo, color: "text-purple-500" },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setLedgerStatusFilter(chip.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                        ledgerStatusFilter === chip.id
                          ? "bg-primary text-white shadow-sm"
                          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span>{chip.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        ledgerStatusFilter === chip.id ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      }`}>
                        {chip.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ledger Records Table & Responsive Cards */}
              {isLedgerLoading ? (
                <div className="glass-panel p-12 text-center rounded-3xl border border-slate-200/70 dark:border-slate-800 space-y-3">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">{isAr ? "جاري تحميل سجل المدفوعات..." : "Loading payment ledger..."}</p>
                </div>
              ) : filteredLedger.length === 0 ? (
                <div className="glass-panel p-10 text-center rounded-3xl border border-slate-200/70 dark:border-slate-800 space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isAr ? "لا توجد نتائج مطابقة لبحثك" : "No matching payment records"}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {isAr ? "جرّب تغيير فلاتر الحالة أو مسح عبارة البحث." : "Try adjusting your search criteria or resetting filters."}
                  </p>
                </div>
              ) : (
                <div className="glass-panel overflow-hidden rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs" style={{ direction: isAr ? "rtl" : "ltr", textAlign: isAr ? "right" : "left" }}>
                      <thead>
                        <tr className="border-b border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60 text-slate-500 font-black">
                          <th className="py-3 px-4">{isAr ? "المشترك" : "Subscriber"}</th>
                          <th className="py-3 px-4">{isAr ? "الباقة" : "Plan"}</th>
                          <th className="py-3 px-4">{isAr ? "المبلغ" : "Amount"}</th>
                          <th className="py-3 px-4">{isAr ? "طريقة الدفع" : "Method"}</th>
                          <th className="py-3 px-4">{isAr ? "الحالة" : "Status"}</th>
                          <th className="py-3 px-4">{isAr ? "التاريخ" : "Date"}</th>
                          <th className="py-3 px-4">{isAr ? "الإيصال" : "Receipt"}</th>
                          <th className="py-3 px-4 text-center">{isAr ? "إجراءات" : "Actions"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredLedger.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                            {/* Subscriber Info */}
                            <td className="py-3 px-4 min-w-[180px]">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                  {(item.userName || "U").charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <strong className="block truncate text-slate-900 dark:text-white font-black">
                                    {item.userName}
                                  </strong>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                    <span className="truncate max-w-[130px]">{item.email || item.userId}</span>
                                    {onViewProfile && item.userId && (
                                      <button
                                        type="button"
                                        onClick={() => onViewProfile(item.userId)}
                                        className="text-primary hover:underline"
                                        title={isAr ? "عرض الملف" : "View profile"}
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Plan Name */}
                            <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-black border border-slate-200/50 dark:border-slate-700/50">
                                {item.planName}
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="py-3 px-4 whitespace-nowrap font-black text-emerald-600 dark:text-emerald-400 text-sm">
                              {typeof item.amount === "number"
                                ? item.amount.toLocaleString(isAr ? "ar-EG" : "en-US")
                                : item.amount || "—"}{" "}
                              <span className="text-[10px] font-bold text-slate-400">{isAr ? "ج.م" : "EGP"}</span>
                            </td>

                            {/* Payment Method */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {item.method === "instapay" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                                  InstaPay
                                </span>
                              ) : item.method === "vodafone" || item.method === "vodafone_cash" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/20">
                                  Vodafone Cash
                                </span>
                              ) : item.method === "bank_transfer" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20">
                                  {isAr ? "تحويل بنكي" : "Bank Transfer"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-500/10 text-slate-600 dark:text-slate-400">
                                  {item.paymentMethod || item.method || "—"}
                                </span>
                              )}
                            </td>

                            {/* Status Pill */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {item.status === "approved" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>{isAr ? "معتمد ومفعل" : "Approved"}</span>
                                </span>
                              ) : item.status === "pending" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  <Clock className="w-3 h-3 animate-spin" style={{ animationDuration: "6s" }} />
                                  <span>{isAr ? "قيد الانتظار" : "Pending"}</span>
                                </span>
                              ) : item.status === "rejected" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                  <XCircle className="w-3 h-3" />
                                  <span>{isAr ? "مرفوض" : "Rejected"}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                                  <HelpCircle className="w-3 h-3" />
                                  <span>{isAr ? "يحتاج معلومات" : "Needs Info"}</span>
                                </span>
                              )}
                            </td>

                            {/* Date */}
                            <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-500">
                              {item.submittedAt ? (
                                <div>
                                  <span className="block font-bold text-slate-700 dark:text-slate-300">
                                    {new Date(item.submittedAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                  <span className="block text-[10px] text-slate-400">
                                    {new Date(item.submittedAt).toLocaleTimeString(isAr ? "ar-EG" : "en-US", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>

                            {/* Receipt Thumbnail */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {item.receiptUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setInspectingPayment(item)}
                                  className="group relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                  title={isAr ? "عرض الإيصال" : "View receipt"}
                                >
                                  {item.receiptUrl.startsWith("data:image") ? (
                                    <img
                                      src={item.receiptUrl}
                                      alt="Receipt"
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                    />
                                  ) : (
                                    <FileText className="w-4 h-4 text-primary" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">
                                  {isAr ? "بدون إيصال" : "No receipt"}
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setInspectingPayment(item)}
                                  title={isAr ? "عرض التفاصيل الكاملة" : "View details"}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {item.status !== "approved" && (
                                  <button
                                    type="button"
                                    onClick={() => approvePayment(item.id)}
                                    title={isAr ? "اعتماد وتفعيل الاشتراك" : "Approve & Activate"}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                                {item.status === "pending" && (
                                  <button
                                    type="button"
                                    onClick={() => rejectPayment(item.id)}
                                    title={isAr ? "رفض الطلب" : "Reject"}
                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LIGHTBOX / RECEIPT INSPECTION MODAL */}
          {inspectingPayment && (
            <div
              role="dialog"
              aria-modal="true"
              onClick={() => setInspectingPayment(null)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-2xl w-full rounded-3xl border border-slate-700/80 bg-slate-900 text-white p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col space-y-4"
                style={{ direction: isAr ? "rtl" : "ltr", textAlign: isAr ? "right" : "left" }}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-amber-400" />
                      <span>{isAr ? "تفاصيل إيصال الدفع والطلب" : "Payment Proof & Request Details"}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isAr ? `معرف العملية: ${inspectingPayment.id}` : `Request ID: ${inspectingPayment.id}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectingPayment(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto space-y-4 pr-1">
                  {/* Receipt Image */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-center">
                    {inspectingPayment.receiptUrl ? (
                      inspectingPayment.receiptUrl.startsWith("data:image") ? (
                        <img
                          src={inspectingPayment.receiptUrl}
                          alt="Full Receipt"
                          className="max-h-80 w-auto mx-auto rounded-xl object-contain shadow-lg"
                        />
                      ) : (
                        <div className="py-8">
                          <a
                            href={inspectingPayment.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-black text-xs hover:opacity-95"
                          >
                            <span>{isAr ? "فتح الإيصال في نافذة جديدة" : "Open Receipt in New Tab"}</span>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      )
                    ) : (
                      <div className="py-8 text-slate-500 text-xs italic">
                        {isAr ? "لم يتم إرفاق إيصال مع هذا الطلب" : "No receipt attached"}
                      </div>
                    )}
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-800/60 p-3">
                      <span className="block text-[10px] font-bold text-slate-400">{isAr ? "المشترك" : "Subscriber"}</span>
                      <strong className="block truncate text-white mt-1">{inspectingPayment.userName}</strong>
                      <span className="block truncate text-[10px] text-slate-400">{inspectingPayment.email || inspectingPayment.userId}</span>
                    </div>

                    <div className="rounded-xl bg-slate-800/60 p-3">
                      <span className="block text-[10px] font-bold text-slate-400">{isAr ? "الباقة" : "Plan"}</span>
                      <strong className="block truncate text-amber-300 mt-1">{inspectingPayment.planName}</strong>
                    </div>

                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 col-span-2 sm:col-span-1">
                      <span className="block text-[10px] font-bold text-emerald-400">{isAr ? "المبلغ المطلوب" : "Amount"}</span>
                      <strong className="block text-lg font-black text-emerald-400 mt-0.5">
                        {inspectingPayment.amount} {isAr ? "ج.م" : "EGP"}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-slate-800/60 p-3">
                      <span className="block text-[10px] font-bold text-slate-400">{isAr ? "طريقة التحويل" : "Payment Method"}</span>
                      <strong className="block truncate text-white mt-1">
                        {inspectingPayment.method === "instapay"
                          ? "InstaPay"
                          : inspectingPayment.method === "vodafone" || inspectingPayment.method === "vodafone_cash"
                          ? "Vodafone Cash"
                          : inspectingPayment.method === "bank_transfer"
                          ? (isAr ? "تحويل بنكي" : "Bank Transfer")
                          : inspectingPayment.method || "—"}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-slate-800/60 p-3">
                      <span className="block text-[10px] font-bold text-slate-400">{isAr ? "الحالة الحالية" : "Current Status"}</span>
                      <span className="mt-1 inline-block font-black text-xs">
                        {inspectingPayment.status === "approved" ? (
                          <span className="text-emerald-400">{isAr ? "معتمد ومفعل" : "Approved"}</span>
                        ) : inspectingPayment.status === "pending" ? (
                          <span className="text-amber-400">{isAr ? "قيد الانتظار" : "Pending"}</span>
                        ) : inspectingPayment.status === "rejected" ? (
                          <span className="text-rose-400">{isAr ? "مرفوض" : "Rejected"}</span>
                        ) : (
                          <span className="text-purple-400">{isAr ? "يحتاج معلومات" : "Needs Info"}</span>
                        )}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-800/60 p-3">
                      <span className="block text-[10px] font-bold text-slate-400">{isAr ? "تاريخ الطلب" : "Submitted At"}</span>
                      <span className="block text-[11px] text-slate-300 mt-1">
                        {inspectingPayment.submittedAt ? new Date(inspectingPayment.submittedAt).toLocaleString(isAr ? "ar-EG" : "en-US") : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Notes / Reject Reason */}
                  {inspectingPayment.notes && (
                    <div className="rounded-xl bg-slate-800/50 p-3 text-xs">
                      <strong className="block text-amber-300 mb-1">{isAr ? "ملاحظات المشترك:" : "User Notes:"}</strong>
                      <p className="text-slate-200 leading-relaxed">{inspectingPayment.notes}</p>
                    </div>
                  )}

                  {inspectingPayment.rejectReason && (
                    <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs">
                      <strong className="block text-rose-300 mb-1">{isAr ? "سبب الرفض المسجل:" : "Recorded Reject Reason:"}</strong>
                      <p className="text-rose-200 leading-relaxed">{inspectingPayment.rejectReason}</p>
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-3 flex-wrap">
                  {onViewProfile && inspectingPayment.userId && (
                    <button
                      type="button"
                      onClick={() => {
                        setInspectingPayment(null);
                        onViewProfile(inspectingPayment.userId);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
                    >
                      {isAr ? "الملف الشخصي للمشترك" : "View Profile"}
                    </button>
                  )}

                  <div className="flex items-center gap-2 mr-auto">
                    {inspectingPayment.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() => void approvePayment(inspectingPayment.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{isAr ? "قبول وتفعيل الاشتراك" : "Approve & Activate"}</span>
                      </button>
                    )}

                    {inspectingPayment.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => void requestPaymentInfo(inspectingPayment.id)}
                        className="px-3.5 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-bold transition-colors"
                      >
                        {isAr ? "طلب معلومات" : "Request Info"}
                      </button>
                    )}

                    {inspectingPayment.status !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => void rejectPayment(inspectingPayment.id)}
                        className="px-3.5 py-2 rounded-xl bg-rose-600/20 text-rose-300 border border-rose-600/40 hover:bg-rose-600/30 text-xs font-bold transition-colors"
                      >
                        {isAr ? "رفض الدفع" : "Reject"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plans Tab */}
      {subTab === "plans" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={openNewPlan}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> {isAr ? "إضافة خطة" : "Add Plan"}
            </button>
          </div>

          {(selectedPlanId === "new" || selectedPlanId.startsWith('edit:')) && (
            <div className="glass-panel p-6 rounded-3xl border border-primary/20 dark:border-primary/20 ring-4 ring-primary/5 mb-6">
              <h3 className="font-bold text-lg mb-4">
                {isAr
                  ? "إنشاء خطة مخصصة لا محدودة"
                  : "Create Unlimited Custom Plan"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={planDraft.name}
                    onChange={(e) => setPlanDraft((draft) => ({ ...draft, name: e.target.value }))}
                    placeholder="e.g. Creator Plan"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={planDraft.price}
                    onChange={(e) => setPlanDraft((draft) => ({ ...draft, price: Number(e.target.value) }))}
                    placeholder="19.99"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">
                    Duration (Months) [1200 for Lifetime]
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={planDraft.durationMonths}
                    onChange={(e) => setPlanDraft((draft) => ({ ...draft, durationMonths: Number(e.target.value) }))}
                    placeholder="1"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">
                    Features (comma separated)
                  </label>
                  <input
                    type="text"
                    value={planDraft.features.join(', ')}
                    onChange={(e) => setPlanDraft((draft) => ({ ...draft, features: e.target.value.split(',').map((feature) => feature.trim()).filter(Boolean) }))}
                    placeholder="e.g. VIP unlocked, Custom domain"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">
                    Badge Style
                  </label>
                  <select value={planDraft.badgeStyle} onChange={(e) => setPlanDraft((draft) => ({ ...draft, badgeStyle: e.target.value as SubscriptionPlan['badgeStyle'] }))} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary">
                    <option value="pro">Pro (Blue)</option>
                    <option value="premium">Premium (Purple)</option>
                    <option value="team">Team (Cyan Diamond)</option>
                    <option value="enterprise">Enterprise (Gold Crown)</option>
                    <option value="lifetime">
                      Lifetime (Gold Liquid Glass)
                    </option>
                    <option value="founder">
                      Founder (Animated Crown + Rainbow)
                    </option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">
                    Priority Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={planDraft.priorityLevel}
                    onChange={(e) => setPlanDraft((draft) => ({ ...draft, priorityLevel: Number(e.target.value) }))}
                    placeholder="Priority (higher overrides lower)"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">
                    Custom Badge Color (Hex)
                  </label>
                  <input
                    type="text"
                    value={planDraft.badgeColor}
                    onChange={(e) => setPlanDraft((draft) => ({ ...draft, badgeColor: e.target.value }))}
                    placeholder="#ff00ff"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => void savePlan()}
                  disabled={isSavingPlan}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl font-bold"
                >
                  {isSavingPlan ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ الخطة' : 'Save Plan')}
                </button>
                <button
                  onClick={() => setSelectedPlanId("")}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockPlans.map((plan) => (
              <div
                key={plan.id}
                className="glass-panel p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      {plan.name}
                      <UserBadge
                        tier={plan.badgeStyle as any}
                        size="sm"
                        showTooltip={false}
                      />
                    </h4>
                    <p className="text-sm font-black text-amber-600">
                      ${plan.price}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEditPlan(plan)} className="text-slate-400 hover:text-blue-500 min-h-11 min-w-11 rounded-xl">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button type="button" disabled={planBusyId === plan.id} onClick={() => void removePlan(plan)} className="text-slate-400 hover:text-red-500 min-h-11 min-w-11 rounded-xl disabled:opacity-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <ul className="mt-4 space-y-1 text-xs text-slate-500">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex gap-1 items-center">
                      <span>•</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coupons Tab */}
      {subTab === "coupons" && (
        <div className="space-y-6 text-sm">
          {/* Create Coupon Card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white">
            <div className="flex items-center gap-2 mb-4 text-violet-400">
              <Gift className="w-5 h-5" />
              <h3 className="font-extrabold text-lg">
                {isAr ? "إنشاء كود خصم جديد ترويجي" : "Create New Promotional Coupon"}
              </h3>
            </div>

            {/* Quick Trial Offers Builder (7, 14, 30 Days) managed exclusively by Super Admin */}
            <div className="mb-6 bg-slate-950/80 p-5 rounded-2xl border border-indigo-500/30">
              <p className="text-xs font-extrabold text-indigo-300 mb-3 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                {isAr ? "إدارة العروض التجريبية النشطة (7، 14، أو 30 يوماً)" : "Manage Active Trial Offers (7, 14, or 30 days)"}
              </p>
              <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                {isAr 
                  ? "عند تفعيل أحد العروض التجريبية أدناه، سيظهر للمستخدمين المسجلين حصراً في صفحة باقات الاشتراك لإرسال طلب تفعيل فوري يراجعه السوبر أدمن." 
                  : "When active, trial offers appear exclusively for registered members on the subscription plans page to request super-admin activation."}
              </p>
              <div className="flex flex-wrap gap-3">
                {TRIAL_OFFER_DURATIONS.map((days) => {
                  const isLive = Boolean(trialOffers[days]);
                  const isBusy = isTrialOffersLoading || trialOfferBusyDays === days;
                  return (
                    <div key={days} className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl">
                      <span className="text-xs font-black text-white">{isAr ? `عرض ${days} يوماً` : `${days}-Day Trial`}</span>
                      <button
                        type="button"
                        onClick={() => void toggleTrialOffer(days)}
                        disabled={isBusy}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer disabled:cursor-wait disabled:opacity-60 ${
                          isLive 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isBusy ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : isLive ? (isAr ? 'نشط (يعمل)' : 'Active') : (isAr ? 'معطل (مخفي)' : 'Inactive')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" />
                  {isAr ? "كود الخصم كابيتال" : "Coupon Code (Uppercase)"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. KOSMO100"
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-primary font-bold tracking-widest text-center"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5" />
                  {isAr ? "نسبة الخصم (%)" : "Discount Percent (%)"}
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newDiscountPercent}
                  onChange={(e) => setNewDiscountPercent(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-primary font-bold text-center"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {isAr ? "الحد الأقصى للاستخدام" : "Max Uses Limit"}
                </label>
                <input
                  type="number"
                  min="1"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-primary font-bold text-center"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {isAr ? "تاريخ انتهاء كود الخصم" : "Expiration Date"}
                </label>
                <input
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-primary font-mono text-center"
                />
              </div>
            </div>

            {/* Applicable Plans Checklist */}
            <div className="mt-5 space-y-2.5">
              <label className="text-xs font-extrabold text-violet-300 flex items-center gap-1.5 matches-label uppercase tracking-wider">
                <Crown className="w-4 h-4 text-amber-400" />
                {isAr ? "الباقات المستهدفة للخصم (اختر واحدة على الأقل):" : "Target plans for this coupon (Select at least one):"}
              </label>
              <div className="flex flex-wrap gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                {[
                  { id: 'silver', label: isAr ? 'الباقة الفضية (Silver)' : 'Silver Scholar', color: 'text-slate-300' },
                  { id: 'gold', label: isAr ? 'الباقة الذهبية (Gold)' : 'Educators Gold', color: 'text-amber-400' },
                  { id: 'diamond', label: isAr ? 'الباقة الماسية (Diamond)' : 'Diamond Elite VIP', color: 'text-cyan-400' }
                ].map((p) => {
                  const isChecked = newApplicablePlans.includes(p.id);
                  return (
                    <label 
                      key={p.id} 
                      className={`flex items-center gap-2.5 cursor-pointer select-none text-xs font-extrabold px-3.5 py-2 bg-slate-900 border ${isChecked ? 'border-violet-500 bg-violet-950/20' : 'border-slate-800 hover:border-slate-700'} rounded-xl transition-all`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setNewApplicablePlans(newApplicablePlans.filter(pid => pid !== p.id));
                          } else {
                            setNewApplicablePlans([...newApplicablePlans, p.id]);
                          }
                        }}
                        className="w-4 h-4 rounded text-violet-500 bg-slate-950 border-slate-800 focus:ring-violet-500 focus:ring-offset-slate-950"
                      />
                      <span className={p.color}>{p.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4 items-center justify-between border-t border-slate-800 pt-4">
              <div className="flex gap-2">
                <button
                  onClick={handleSaveCoupon}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isAr ? "حفظ وتفعيل الكود" : "Save & Activate Code"}
                </button>

                <button
                  disabled={!newPromoCode.trim() || isGeneratingAi}
                  onClick={() =>
                    handleGenerateAiMessageForCoupon(
                      newPromoCode,
                      newDiscountPercent,
                    )
                  }
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGeneratingAi
                    ? isAr
                      ? "جاري الصياغة..."
                      : "Generating..."
                    : isAr
                      ? "صياغة رسالة ترويجية بالذكاء الاصطناعي 🤖"
                      : "Draft Beautiful Call with AI 🤖"}
                </button>
              </div>
            </div>
          </div>

          {/* AI Generation Message & Broadcasting Tool */}
          {aiPromoMsg && (
            <div className="glass-panel p-6 rounded-3xl border border-violet-500/30 bg-gradient-to-r from-slate-900 to-violet-950 text-white ring-4 ring-violet-500/5 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-violet-300">
                  <Megaphone className="w-5 h-5 animate-bounce" />
                  <h4 className="font-extrabold text-base">
                    {isAr
                      ? "الرسالة الترويجية المقترحة من كوزمو 🤖"
                      : "Proposed AI Advertisement Text"}
                  </h4>
                </div>
                <button
                  onClick={() => setAiPromoMsg("")}
                  className="text-slate-400 hover:text-white"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <textarea
                value={aiPromoMsg}
                onChange={(e) => setAiPromoMsg(e.target.value)}
                rows={4}
                className="w-full bg-slate-950/80 p-4 rounded-xl border border-violet-500/30 text-white text-xs font-semibold leading-relaxed outline-none focus:ring-2 focus:ring-violet-400 font-sans"
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setAiPromoMsg("")}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  {isAr ? "تجاهل" : "Discard"}
                </button>
                <button
                  disabled={isBroadcasting}
                  onClick={handleBroadcastMessage}
                  className="px-6 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-violet-500/20 cursor-pointer"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  {isBroadcasting
                    ? isAr
                      ? "جاري البث والتعميم..."
                      : "Broadcasting..."
                    : isAr
                      ? "نشر وتعميم كبث لرسائل الطلاب والمجتمع 🚀"
                      : "Broadcast to All Messages & Community 🚀"}
                </button>
              </div>
            </div>
          )}

          {/* List of Coupon Codes */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-900 text-white">
            <h3 className="font-extrabold text-base mb-4 flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              {isAr
                ? "كوبونات الخصم النشطة والمنتهية"
                : "Active and Expired Promotion Codes"}
            </h3>

            {isCouponsLoading ? (
              <div className="py-12 text-center text-slate-400 font-bold">
                {isAr ? "جاري تحميل الكوبونات..." : "Loading Coupons..."}
              </div>
            ) : coupons.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                {isAr ? "لا توجد أكواد خصم حالية." : "No promotional codes registered yet."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right" dir={isAr ? "rtl" : "ltr"}>
                  <thead className="text-xs text-slate-400 uppercase bg-slate-950/80">
                    <tr className="border-b border-slate-800">
                      <th className="px-4 py-3 text-center">
                        {isAr ? "الكود" : "Promo Code"}
                      </th>
                      <th className="px-4 py-3 text-center">
                        {isAr ? "الخصم" : "Discount"}
                      </th>
                      <th className="px-4 py-3 text-center">
                        {isAr ? "الاستخدام" : "Usage"}
                      </th>
                      <th className="px-4 py-3 text-center">
                        {isAr ? "الحد الأقصى" : "Max Limit"}
                      </th>
                      <th className="px-4 py-3 text-center">
                        {isAr ? "تاريخ الصلاحية" : "Expiry"}
                      </th>
                      <th className="px-4 py-3 text-center">
                        {isAr ? "الباقات المشمولة" : "Target Plans"}
                      </th>
                      <th className="px-4 py-3 text-center">
                        {isAr ? "العمليات" : "Actions"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 text-xs font-semibold">
                    {coupons.map((c, idx) => {
                      const isExpired =
                        new Date(c.expiryDate).getTime() < Date.now();
                      return (
                        <tr key={c.id || c.code || idx} className="hover:bg-slate-800/40">
                          <td className="px-4 py-3.5 text-center font-bold text-amber-500 tracking-wider bg-slate-950/30">
                            {c.code}
                          </td>
                          <td className="px-4 py-3 text-center text-emerald-400 font-extrabold">
                            {c.discountPercent}%
                          </td>
                          <td className="px-4 py-3 text-center font-mono">
                            {c.usedCount || 0}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-slate-400">
                            {c.maxUses || 9999}
                          </td>
                          <td className="px-4 py-3 text-center font-mono">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] ${isExpired ? "bg-red-950 text-red-400 border border-red-900" : "bg-emerald-950 text-emerald-400 border border-emerald-900"}`}
                            >
                              {c.expiryDate}{" "}
                              {isExpired && (isAr ? " (منتهي)" : " (Expired)")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-wrap gap-1 justify-center max-w-[150px] mx-auto">
                              {(c.applicablePlans ? c.applicablePlans.split(',') : ['silver', 'gold', 'diamond']).map(pid => {
                                let planBadgeColor = "bg-slate-800 text-slate-300";
                                let planBadgeLabel = pid;
                                if (pid === 'silver') {
                                  planBadgeColor = "bg-slate-700 text-slate-100";
                                  planBadgeLabel = isAr ? "فضية" : "Silver";
                                } else if (pid === 'gold') {
                                  planBadgeColor = "bg-amber-950/80 text-amber-300 border border-amber-900/40";
                                  planBadgeLabel = isAr ? "ذهبية" : "Gold";
                                } else if (pid === 'diamond') {
                                  planBadgeColor = "bg-cyan-950/80 text-cyan-300 border border-cyan-900/40";
                                  planBadgeLabel = isAr ? "ماسية" : "Diamond";
                                }
                                return (
                                  <span key={pid} className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${planBadgeColor}`}>
                                    {planBadgeLabel}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleDeleteCoupon(c.id)}
                              className="p-1 px-2 hover:bg-red-950/40 border border-red-900/30 text-red-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                              title={isAr ? "حذف" : "Delete"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
