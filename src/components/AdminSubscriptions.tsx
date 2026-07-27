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
} from "lucide-react";
import { UserBadge } from "./UserBadge";
import { UserStats, SubscriptionPlan, PaymentProof } from "../types";
import { supabase } from "../lib/supabaseClient";
import { askGemini } from "../services/aiWorkerClient";
import {
  getAllProfiles,
  getPremiumRequests,
  getCoupons,
  saveCoupon,
  deleteCoupon,
  updateUserSubscription,
  createNotification,
  createCommunityPost
} from "../lib/db";

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

  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

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

  const loadRealData = async () => {
    try {
      const profiles = await getAllProfiles();
      const mappedUsers = profiles.map((p) => ({
        userId: p.uid || p.id || p.userId,
        name: p.name || "Unknown",
        email: p.email || "",
        isPremium: p.is_premium || p.isPremium || false,
        planName: p.plan_name || p.planName || "Free",
        planId: p.plan_id || p.planId || undefined,
        badgeSymbol: (p.is_premium || p.isPremium) ? "✔" : "",
        createdQuizzes: [],
        completions: [],
      }));
      setMockUsers(mappedUsers);

      const requests = await getPremiumRequests();
      const payments = requests.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName || r.userEmail,
        planId: r.planName,
        planName: r.planName,
        amount: r.planPrice,
        method: r.paymentMethod || "request",
        status: r.status || "pending",
        submittedAt: r.timestamp || r.createdAt,
        receiptUrl: r.receiptUrl || r.paymentScreenshot || r.receiptBase64 || '',
        notes: r.notes,
      }));
      setMockPayments(payments as PaymentProof[]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRealData();
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
    } catch (err) {
      console.error(err);
      alert(isAr ? "حدث خطأ أثناء حفظ الكود." : "Error saving coupon.");
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

  const handleGenerateAiMessageForCoupon = async (
    code: string,
    percent: number,
  ) => {
    setIsGeneratingAi(true);
    try {
      const prompt = `أنت خبير تسويق. اكتب رسالة ترويجية قصيرة وجذابة بالعربية لكود خصم (${code}) بقيمة ${percent}%. الرسالة يجب أن تكون احترافية وتشجع على الاشتراك.`;
      const { text } = await askGemini(prompt);
      setAiPromoMsg(text || `🎉 استخدم كود ${code} واحصل على خصم ${percent}% على باقات Quiz Space!`);
    } catch (err) {
      console.error(err);
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
          sender_id: 'admin-cosmo',
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
        'admin-cosmo',
        isAr ? 'المساعد كوزمو' : 'Cosmo Assistant',
        '🤖',
        '#8b5cf6'
      );

      alert(
        isAr
          ? `تم بث الإعلان بنجاح ونشره بالمجتمع! وتم إرساله إلى عدد ${messagesToInsert.length} مستخدم في الرسائل الخاصة.`
          : `Promotion broadcasted successfully! Posted to community feed and delivered as direct messages to ${messagesToInsert.length} users.`,
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
      const { error } = await updateUserSubscription(selectedUser.userId, targetIsPremium, targetPlanName);

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
              };
            }
            return {
              ...u,
              isPremium: true,
              planId: plan.id,
              planName: plan.name,
              isLifetime: plan.badgeStyle === "lifetime" || plan.isLifetime,
              isFounder: plan.badgeStyle === "founder",
            };
          }
          return u;
        });

        setMockUsers(updatedUsers);
        setSelectedUser(
          updatedUsers.find((u) => u.userId === selectedUser.userId) || null,
        );
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
    const updatedUsers = mockUsers.map((u) =>
      u.userId === selectedUser.userId
        ? { ...u, isSuspended: !u.isSuspended }
        : u,
    );
    setMockUsers(updatedUsers);
    setSelectedUser(
      updatedUsers.find((u) => u.userId === selectedUser.userId) || null,
    );
  };

  const approvePayment = async (payId: string) => {
    try {
      const payInfo = mockPayments.find((p) => p.id === payId);
      if (!payInfo) return;

      const { error: requestErr } = await supabase.from('premium_requests').update({
        status: 'approved',
        updated_at: new Date().toISOString()
      }).eq('id', payId);

      if (requestErr) throw requestErr;

      const { error: userErr } = await supabase.from('users').update({
        is_premium: true,
        plan_name: payInfo.planName,
        renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq('uid', payInfo.userId);

      if (userErr) throw userErr;

      setMockPayments((prev) => prev.filter((p) => p.id !== payId));
      alert(
        isAr
          ? "تم قبول الدفعة وتفعيل الاشتراك"
          : "Payment approved and subscription activated.",
      );

      try {
        const { createNotification } = await import("../lib/db");
        await createNotification(
          isAr ? "ترقية للباقت المتقدمة 🚀" : "Premium Upgrade 🚀",
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
      alert(isAr ? "فشل قبول العملية: " + err.message : "Failed to approve: " + err.message);
    }
  };

  const rejectPayment = async (payId: string) => {
    try {
      const payInfo = mockPayments.find((p) => p.id === payId);
      if (!payInfo) return;

      const { error } = await supabase.from('premium_requests').update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      }).eq('id', payId);

      if (!error) {
        setMockPayments((prev) => prev.filter((p) => p.id !== payId));
        alert(isAr ? "تم رفض الدفعة" : "Payment rejected.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setSubTab("users")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${subTab === "users" ? "bg-primary text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
        >
          {isAr ? "إدارة اشتراكات المستخدمين" : "User Subscriptions"}
        </button>
        <button
          onClick={() => setSubTab("payments")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${subTab === "payments" ? "bg-primary text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
        >
          {isAr ? "مراجعة المدفوعات" : "Payment Reviews"}
        </button>
        <button
          onClick={() => setSubTab("plans")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${subTab === "plans" ? "bg-primary text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
        >
          {isAr ? "الخطط المخصصة" : "Custom Plans"}
        </button>
        <button
          onClick={() => setSubTab("coupons")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${subTab === "coupons" ? "bg-primary text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
        >
          {isAr ? "إدارة أكواد الخصم 🎫" : "Discount Coupons 🎫"}
        </button>
      </div>

      {/* Users Tab */}
      {subTab === "users" && !selectedUser && (
        <div className="space-y-4 text-sm">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-4 gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 dark:text-white mb-2">
                {isAr ? "تفعيل يدوي برقم UID" : "Manual Activation by UID"}
              </h3>
              <div className="flex gap-2">
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
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs"
                >
                  {isAr ? "تفعيل" : "Activate"}
                </button>
              </div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <table className="w-full text-left" dir={isAr ? "rtl" : "ltr"}>
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">{isAr ? "المستخدم" : "User"}</th>
                  <th className="px-4 py-3">{isAr ? "الخطة" : "Plan"}</th>
                  <th className="px-4 py-3 text-center">
                    {isAr ? "حالة" : "Status"}
                  </th>
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
                      className="px-4 py-3 font-bold text-slate-800 dark:text-white flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    >
                      {user.name}
                      {(user.isLifetime || user.isFounder) && (
                        <UserBadge
                          tier={user.isFounder ? "founder" : "lifetime"}
                          size="sm"
                          showTooltip={false}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {user.planName || "Free"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 text-[10px] font-bold rounded-md ${user.isSuspended ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}
                      >
                        {user.isSuspended
                          ? isAr
                            ? "موقوف"
                            : "Suspended"
                          : isAr
                            ? "نشط"
                            : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedUser(user)}
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
                <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors">
                  {isAr ? "عرض الاختبارات" : "View Quizzes"}
                </button>
                <button className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-lg text-xs font-bold transition-colors">
                  {isAr ? "توثيق الحساب" : "Verify Account"}
                </button>
                <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors">
                  {isAr ? "إعادة تعيين كلمة المرور" : "Reset Password"}
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary"
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
                onClick={() => {
                  setMockUsers((prev) =>
                    prev.filter((u) => u.userId !== selectedUser.userId),
                  );
                  setSelectedUser(null);
                }}
                className="px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
              >
                {isAr ? "حذف المستخدم نهائياً" : "Delete User completely"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {subTab === "payments" && (
        <div className="space-y-6">
          {mockPayments.length === 0 ? (
            <p className="text-slate-500 text-sm">
              {isAr ? "لا توجد مدفوعات معلقة" : "No pending payments"}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockPayments.map((pay, idx) => (
                <div
                  key={pay.id || idx}
                  className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3 flex gap-1">
                    <button
                      onClick={() => approvePayment(pay.id)}
                      title={isAr ? "قبول وتفعيل" : "Approve & Activate"}
                      className="text-emerald-500 hover:bg-emerald-500/10 p-1.5 rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => rejectPayment(pay.id)}
                      title={isAr ? "طلب المزيد من المعلومات" : "Request Info"}
                      className="text-amber-500 hover:bg-amber-500/10 p-1.5 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => rejectPayment(pay.id)}
                      title={isAr ? "رفض" : "Reject"}
                      className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                  <h4 className="font-bold text-lg">{pay.userName}</h4>
                  <p className="text-xs text-slate-500 mb-2">
                    Plan:{" "}
                    <span className="font-bold text-slate-700 border border-slate-200 px-1 rounded">
                      {pay.planName}
                    </span>{" "}
                    via {pay.method}
                  </p>
                  <p className="text-xl font-black text-emerald-600">
                    ${pay.amount}
                  </p>
                  <div className="mt-3">
                    {pay.receiptUrl ? (
                      pay.receiptUrl.startsWith('data:image') ? (
                        <img
                          src={pay.receiptUrl}
                          alt="Payment receipt"
                          className="max-w-full h-auto rounded-lg border border-slate-200 dark:border-slate-700"
                          style={{ maxHeight: '300px' }}
                        />
                      ) : (
                        <a
                          href={pay.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-blue-500 underline"
                        >
                          {isAr
                            ? "عرض الإيصال / التفاصيل"
                            : "View Receipt / Details"}
                        </a>
                      )
                    ) : (
                      <span className="text-xs text-slate-500 italic">
                        {isAr ? "لا يوجد ايصال مرفق" : "No receipt attached"}
                      </span>
                    )}
                    {pay.notes && (
                      <p className="text-xs mt-1">Notes: {pay.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plans Tab */}
      {subTab === "plans" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setSelectedPlanId("new")}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> {isAr ? "إضافة خطة" : "Add Plan"}
            </button>
          </div>

          {selectedPlanId === "new" && (
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
                    placeholder="e.g. VIP unlocked, Custom domain"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">
                    Badge Style
                  </label>
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary">
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
                    placeholder="#ff00ff"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setSelectedPlanId("")}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl font-bold"
                >
                  Save Plan
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
                    <button className="text-slate-400 hover:text-blue-500 p-1">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="text-slate-400 hover:text-red-500 p-1">
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
