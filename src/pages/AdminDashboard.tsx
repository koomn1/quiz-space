import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Shield, Users, Database, LayoutDashboard, Crown, Ticket, AlertTriangle, Settings, Bell, Search, Activity, Trash2, Edit2, Play, PlusCircle, EyeOff, MessageSquare, Lock, ShieldCheck } from 'lucide-react';
import { Quiz } from '../types';
import { getAllProfiles, sendDirectMessage, createNotification, getCoupons, saveCoupon, deleteCoupon } from '../lib/db';
import { LiquidGlassSwitch } from '../components/LiquidGlassSwitch';
import { getApiUrl } from '../lib/origin';
import { decryptMessage } from '../lib/encryption';

import AdminSubscriptions from '../components/AdminSubscriptions';

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
  
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'users' | 'quizzes' | 'subscriptions' | 'coupons' | 'settings' | 'classrooms'>('overview');
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
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowRegistrations, setAllowRegistrations] = useState(true);

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

  useEffect(() => {
    (async () => {
      try {
        const profiles = await getAllProfiles();
        setAllUsers(profiles);
      } catch (e) {
        console.warn('Error loading profiles:', e);
      }

      try {
        const list = await getCoupons();
        if (Array.isArray(list)) {
          setCoupons(list);
        }
      } catch (e) {
        console.error('Error loading coupons:', e);
      }

      try {
        const { data, error } = await supabase.from('classrooms').select('*');
        if (!error && data) setAdminClassrooms(data);
      } catch (e) {
        console.error('Error fetching admin classrooms:', e);
      }

      try {
        const { data, error } = await supabase.from('classroom_students').select('*');
        if (!error && data) setAdminStudents(data);
      } catch (e) {
        console.error('Error fetching admin students:', e);
      }
    })();
  }, []);

  // Fetch classroom messages directly from Supabase if active
  useEffect(() => {
    if (!activeAdminClassroom) return;
    (async () => {
      try {
        const { data, error } = await supabase.from('classroom_messages')
          .select('*')
          .eq('classroom_id', activeAdminClassroom.id)
          .order('created_at', { ascending: true });
        if (!error && data) setAdminMessages(data);
      } catch (e) {
        console.error('Error loading classroom messages for admin:', e);
      }
    })();
  }, [activeAdminClassroom]);

  const premiumUsersCount = allUsers.filter(u => u.isPremium).length;
  const activeAttempts = quizzes.reduce((acc, q) => acc + (q.totalPlays || 0), 0);
  const revenueEstimate = premiumUsersCount * 99; // Simple placeholder revenue calculation

  const adminTabs = [
    { id: 'overview', name: isAr ? 'نظرة عامة' : 'Overview', icon: LayoutDashboard },
    { id: 'users', name: isAr ? 'المستخدمين' : 'Users', icon: Users },
    { id: 'classrooms', name: isAr ? 'الفصول (الشبح 👻)' : 'Classrooms (Ghost 👻)', icon: EyeOff },
    { id: 'quizzes', name: isAr ? 'الاختبارات' : 'Quizzes', icon: Database },
    { id: 'subscriptions', name: isAr ? 'الاشتراكات' : 'Subscriptions', icon: Crown },
    { id: 'coupons', name: isAr ? 'الكوبونات' : 'Coupons', icon: Ticket },
    { id: 'settings', name: isAr ? 'الإعدادات' : 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-8" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-6 rounded-[24px]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center p-3 animate-pulse border border-red-500/20">
            <Shield className="w-full h-full" />
          </div>
          <div className="text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
            <h2 className="font-display font-black text-2xl text-slate-800 dark:text-white">
              {isAr ? 'لوحة تحكم المسؤول' : 'Admin Dashboard'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {isAr ? 'إدارة المنصة، المستخدمين، والاختبارات بصلاحيات كاملة' : 'Platform management with administrative privileges'}
            </p>
          </div>
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
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all whitespace-nowrap lg:whitespace-normal font-bold text-sm ${
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
        <div className="flex-1 min-w-0 glass-card p-6 sm:p-8 rounded-[32px] min-h-[500px]">
          
            <div
              
              
              
              
            >
              {activeAdminTab === 'overview' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: isAr ? 'إجمالي للمستخدمين' : 'Total Users', value: allUsers.length.toString(), icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                      { label: isAr ? 'إجمالي الاختبارات' : 'Total Quizzes', value: quizzes.length.toString(), icon: Database, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                      { label: isAr ? 'محاولات نشطة' : 'Active Attempts', value: activeAttempts.toString(), icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                      { label: isAr ? 'الإيرادات' : 'Revenue', value: `$${revenueEstimate}`, icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    ].map((stat, i) => (
                      <div key={i} className="glass-panel p-5 rounded-2xl flex items-center justify-between border border-slate-200/50 dark:border-slate-700/50">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                          <h4 className="font-black text-2xl text-slate-800 dark:text-white">{stat.value}</h4>
                        </div>
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50">
                     <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">
                        {isAr ? 'تقارير حديثة بحاجة لمراجعة' : 'Recent Reports to Review'}
                     </h3>
                     <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <AlertTriangle className="w-10 h-10 mb-2 opacity-50" />
                        <p>{isAr ? 'لا توجد تقارير جديدة' : 'No new reports'}</p>
                     </div>
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
                        {allUsers.slice(0, 20).map((u: any, idx) => (
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

                                await createNotification(
                                  promoType === 'Promo Code' ? (isAr ? '🎉 كود خصم جديد!' : '🎉 New Promo Code!') : (isAr ? '🎁 عرض خاص!' : '🎁 Special Offer!'),
                                  `${promoCode}: ${promoMessage}` + (isAr ? ' (متوفر الآن في صفحة الدفع)' : ' (Now available on checkout)'),
                                  'adman777888999@gmail.com',
                                  'system'
                                );

                                for (const user of allUsers) {
                                  if (user.userId && user.userId !== 'anonymous') {
                                    try {
                                      await sendDirectMessage(
                                        'cosmo-sys',
                                        isAr ? 'كوزمو 🤖' : 'Cosmo 🤖',
                                        user.userId,
                                        user.name || 'Student',
                                        `${promoMessage} ${promoType === 'Promo Code' ? `Code: ${promoCode}` : ''}`
                                      );
                                    } catch (err) {
                                      console.log('Failed to DM user', user.userId);
                                    }
                                  }
                                }

                                alert(isAr ? `تم إرسال العرض بنجاح وبدأت كوزمو بإرسال الرسائل لجميع الـ ${allUsers.length} مستخدمين!` : `Offer sent successfully, Cosmo is messaging all ${allUsers.length} users!`);
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

              {activeAdminTab === 'settings' && (
                 <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                         {isAr ? 'إعدادات المنصة' : 'Platform Settings'}
                      </h3>
                   </div>
                   <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                         <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">{isAr ? 'وضع الصيانة' : 'Maintenance Mode'}</h4>
                            <p className="text-xs text-slate-500">{isAr ? 'إيقاف المنصة مؤقتاً للتحديثات' : 'Temporarily disable the platform for updates'}</p>
                         </div>
                         <LiquidGlassSwitch checked={maintenanceMode} onChange={(checked) => setMaintenanceMode(checked)} size="sm" />
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                         <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">{isAr ? 'السماح بتسجيل حسابات جديدة' : 'Allow New Registrations'}</h4>
                            <p className="text-xs text-slate-500">{isAr ? 'فتح باب التسجيل للمستخدمين الجدد' : 'Open registration for new users'}</p>
                         </div>
                         <LiquidGlassSwitch checked={allowRegistrations} onChange={(checked) => setAllowRegistrations(checked)} size="sm" />
                      </div>
                   </div>
                 </div>
              )}
            </div>
          
        </div>
      </div>

      {/* GHOST MODE INTERACTION OVERLAY MODAL */}
      
        {activeAdminClassroom && (
          <div
            
            
            
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <div
              
              
              
              className="w-full max-w-4xl bg-[#090514] border border-purple-500/20 rounded-[32px] p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6"
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
        )}
      
    </div>
  );
}
