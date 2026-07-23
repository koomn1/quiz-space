import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  Crown, 
  Gem, 
  Check, 
  Upload, 
  Trash2, 
  Landmark, 
  Smartphone, 
  Sparkles, 
  FileCheck, 
  Calendar, 
  AlertCircle,
  HelpCircle,
  Clock,
  CheckCircle,
  PartyPopper
} from 'lucide-react';
import { createPremiumRequest, getPremiumRequests, getCouponByCode } from '../lib/db';
import { getApiUrl } from '../lib/origin';
import { supabase } from '../lib/supabaseClient';

interface BillingSectionProps {
  userId: string;
  userEmail: string | null;
  lang: 'ar' | 'en';
  isPremium: boolean;
  userName?: string;
}

export function BillingSection({ userId, userEmail, lang, isPremium, userName = 'المستخدم الكوزميك' }: BillingSectionProps) {
  const isAr = lang === 'ar';
  
  // Available Plans
  const plans = [
    {
      id: 'silver',
      name: isAr ? 'الباقة الفضية (Silver)' : 'Silver Scholar',
      price: isAr ? '150 ج.م' : '150 EGP',
      priceNum: 150,
      duration: isAr ? 'شهرياً' : '/mo',
      color: 'from-slate-400 to-slate-500',
      tagColor: 'bg-slate-500 text-white',
      badge: isAr ? 'طالب متميز' : 'Student Pro',
      features: isAr ? [
        'المساعد كوزمو الشخصي (Cosmo AI)',
        'اختبارات تفاعلية لا محدودة',
        'توليد 10 اختبارات بالذكاء الاصطناعي شهرياً',
        'تحميل تقارير حلول الاختبارات بصيغة PDF',
        'دعم فني متميز عبر البريد الإلكتروني'
      ] : [
        'Cosmo Personal Assistant (AI)',
        'Unlimited interactive quizzes',
        'Generating 10 quizzes by AI per month',
        'Download student results as PDF documents',
        'Standard customer support email response'
      ]
    },
    {
      id: 'gold',
      name: isAr ? 'الباقة الذهبية للمعلمين (Gold)' : 'Educator Gold',
      price: isAr ? '300 ج.م' : '300 EGP',
      priceNum: 300,
      duration: isAr ? 'شهرياً' : '/mo',
      color: 'from-amber-400 to-amber-600',
      tagColor: 'bg-amber-500 text-white',
      badge: isAr ? 'الأكثر شيوعاً' : 'Most Popular',
      features: isAr ? [
        'كل مميزات الخطة الفضية',
        'توليد لا محدود بالذكاء الاصطناعي (Gemini UI)',
        'لوحات متصدرين مخصصة لفصولك الطلابية',
        'التحكم الكامل في زمن الاختبارات وإصدار شهادات مخصصة',
        'إصدار تقارير مخصصة لكل صف وشعبة'
      ] : [
        'All Silver properties included',
        'Unlimited AI generative creation with Gemini',
        'Custom private Class Leaderboards',
        'Full countdown timer customization with badges',
        'Detailed score reports per student & section'
      ]
    },
    {
      id: 'diamond',
      name: isAr ? 'الباقة الماسية للمؤسسات (Diamond)' : 'Diamond Elite VIP',
      price: isAr ? '1500 ج.م' : '1500 EGP',
      priceNum: 1500,
      duration: isAr ? 'شهرياً' : '/mo',
      color: 'from-cyan-400 to-indigo-600',
      tagColor: 'bg-indigo-600 text-white',
      badge: isAr ? 'مؤسسات مدارس' : 'Schools & VIP',
      features: isAr ? [
        'كل مميزات الخطة الذهبية الفائقة',
        'وصول كامل لمؤسستك أو لـ 15 معلماً معاً',
        'تصدير درجات الطلاب فورا بصيغة Microsoft Excel',
        'تقارير تحليل ذكاء اصطناعي تفصيلية لكل طالب',
        'إمكانية إخفاء شعار المنصة وتخصيص ثيم الألوان للعلامة التجارية',
        'دعم فني خاص على مدار الساعة عبر الواتساب والهاتف'
      ] : [
        'All Gold VIP properties included',
        'Multi-user login seats (Up to 15 teachers combined)',
        'Direct bulk Excel spreadsheet scores export',
        'AI detailed learning insights for schools',
        'White-labeled branding options for quizzes',
        '24/7 dedicated telephone and WhatsApp VIP support'
      ]
    }
  ];

  // Payment Methods
  const paymentMethods = [
    {
      id: 'instapay',
      title: isAr ? 'إنستاباي (Instapay)' : 'Instapay Egypt',
      subtitle: isAr ? 'تحويل فوري عبر التطبيق' : 'Instant transfer via IPN app',
      icon: <Smartphone className="w-5 h-5 text-purple-500" />,
      details: {
        address: 'jobadawy@instapay',
        link: 'https://ipn.eg/S/jobadawy/instapay/2D5ZTT',
        instructions: isAr 
          ? 'اضغط الرابط التالي لإرسال النقود مباشرة إلى حسابنا: Powered by InstaPay' 
          : 'Click the link below to send money directly to jobadawy@instapay - Powered by InstaPay'
      }
    },
    {
      id: 'vodafone',
      title: isAr ? 'فودافون كاش' : 'Vodafone Cash Egypt',
      subtitle: isAr ? 'إرسال للمحفظة الإلكترونية' : 'Send to Egypt Cash wallets',
      icon: <Smartphone className="w-5 h-5 text-red-500" />,
      details: {
        mobile: '01037560348',
        instructions: isAr ? 'يرجى تحويل المبلغ المطلوب إلى هذا الرقم (فودافون كاش: 01037560348) وإرفاق لقطة شاشة التحويل.' : 'Please transfer the exact amount to this subscriber wallet (Vodafone: 01037560348) and upload receipt.'
      }
    }
  ];

  // States
  const [selectedPlan, setSelectedPlan] = useState<string>('gold');
  const [selectedMethod, setSelectedMethod] = useState<string>('instapay');
  const [promoCode, setPromoCode] = useState('');
  const [subscriberName, setSubscriberName] = useState(userName);
  const [subscriberEmail, setSubscriberEmail] = useState(userEmail || '');
  const [screenshotBase64, setScreenshotBase64] = useState<string>('');
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Helper to compress image to max width 800px and jpeg quality 0.7
  const compressAndResizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDimension = 800;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => {
          resolve(event.target?.result as string);
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(file);
    });
  };
  
  // History tracking state
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Fetch individual's requests
  const fetchMyRequests = async () => {
    try {
      setLoadingRequests(true);
      const all = await getPremiumRequests();
      // Filter requests belonging to this user
      const filtered = all.filter((r: any) => r.userId === userId);
      setUserRequests(filtered);
    } catch (err) {
      console.error('Error fetching user requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, [userId]);

  // Reactive verification of applied coupon when selectedPlan is changed
  useEffect(() => {
    if (promoDiscount > 0 && promoCode) {
      const code = promoCode.trim().toUpperCase();
      if (code === 'QUIZ50' || code === 'SUPER50' || code === 'GEMINI55' || code === 'FREE100' || code === 'ADMAN100') {
        return;
      }
      const checkCouponSuitability = async () => {
        try {
          const coupon = await getCouponByCode(code);
          if (coupon) {
            const applicablePlans = coupon.applicable_plans || coupon.applicablePlans;
            if (applicablePlans) {
              const allowed = applicablePlans.split(',');
              if (!allowed.includes(selectedPlan)) {
                alert(isAr 
                  ? `تنبيه: كود الخصم المطبق "${code}" لا يسري على باقة "${selectedPlan === 'silver' ? 'الفضية' : selectedPlan === 'gold' ? 'الذهبية' : 'الماسية'}". تم إلغاء تفعيل الخصم.`
                  : `Notice: applied coupon "${code}" is not applicable on the selected plan "${selectedPlan}". Discount has been reset.`
                );
                setPromoDiscount(0);
                setPromoCode('');
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      };
      checkCouponSuitability();
    }
  }, [selectedPlan]);

  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Handle promo code application with dynamic Postgres coupons check & expiry validation
  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      alert(isAr ? 'يرجى كتابة كود الخصم أولاً.' : 'Please enter a coupon code.');
      return;
    }

    setIsApplyingPromo(true);
    try {
      // Hardcoded VIP backstops
      if (code === 'QUIZ50' || code === 'SUPER50' || code === 'GEMINI55') {
        setPromoDiscount(50);
        alert(isAr ? 'تم تطبيق كود الخصم الفعال بنسبة 50% بنجاح!' : 'Coupon applied! Enjoy 50% discount.');
        setIsApplyingPromo(false);
        return;
      } else if (code === 'FREE100' || code === 'ADMAN100') {
        setPromoDiscount(100);
        alert(isAr ? 'كود الخصم الفعال للمشرف بنسبة 100% تم تطبيقه بنجاح! التفعيل سيتم فورياً وتلقائياً.' : 'VIP 100% discount code applied successfully! Activation will be instant & automatic.');
        setIsApplyingPromo(false);
        return;
      }

      // Dynamic database check
      const coupon = await getCouponByCode(code);
      if (coupon) {
        const isActive = coupon.is_active !== undefined ? coupon.is_active : coupon.isActive;
        if (!isActive) {
          alert(isAr ? 'كود الخصم هذا موقوف حالياً وغير فعال.' : 'This coupon is currently inactive.');
          setPromoDiscount(0);
          return;
        }

        // Validate expiration date
        const expiryDate = coupon.expiry_date || coupon.expiryDate;
        if (expiryDate) {
          const expDate = new Date(expiryDate);
          const nowStr = new Date();
          if (expDate < nowStr) {
            alert(isAr 
              ? `عذراً، كود الخصم منتهي الصلاحية! تاريخ الانتهاء كان: ${new Date(expiryDate).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}` 
              : `Sorry, this coupon is expired! Expiry was: ${new Date(expiryDate).toLocaleDateString()}`
            );
            setPromoDiscount(0);
            return;
          }
        }

        // Validate max uses
        if (coupon.maxUses && coupon.usedCount !== undefined && coupon.usedCount >= coupon.maxUses) {
          alert(isAr ? 'عذراً، استنفد هذا الكود الحد الأقصى للاستخدام.' : 'Sorry, this coupon has reached its maximum uses.');
          setPromoDiscount(0);
          return;
        }

        // Validate plan suitability
        if (coupon.applicablePlans) {
          const allowed = coupon.applicablePlans.split(',');
          if (!allowed.includes(selectedPlan)) {
            alert(isAr 
              ? `عذراً، كود الخصم هذا لا يسري على الباقة المحددة (${selectedPlan === 'silver' ? 'الفضية' : selectedPlan === 'gold' ? 'الذهبية' : 'الماسية'}).` 
              : `Sorry, this coupon is not applicable to the selected plan (${selectedPlan}).`
            );
            setPromoDiscount(0);
            return;
          }
        }

        // Successfully applied
        setPromoDiscount(coupon.discountPercent);
        alert(isAr 
          ? `تم تطبيق كود الخصم المعتمد بخصم ${coupon.discountPercent}% بنجاح!` 
          : `Promo code discount of ${coupon.discountPercent}% applied successfully!`
        );
      } else {
        alert(isAr ? 'كود الخصم غير موجود أو انتهت صلاحيته.' : 'Discount code not found or expired.');
        setPromoDiscount(0);
      }
    } catch (err) {
      console.error(err);
      alert(isAr ? 'حدث خطأ أثناء تفعيل كود الخصم.' : 'Error checking coupon code.');
      setPromoDiscount(0);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // Convert uploaded image file to base64 with compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingFile(true);
      try {
        const compressedBase64 = await compressAndResizeImage(file);
        setScreenshotBase64(compressedBase64);
        setScreenshotName(file.name);
      } catch (err) {
        console.error('Error auto-compressing image:', err);
      } finally {
        setIsProcessingFile(false);
      }
    }
  };

  // Drag and Drop files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setIsProcessingFile(true);
      try {
        const compressedBase64 = await compressAndResizeImage(file);
        setScreenshotBase64(compressedBase64);
        setScreenshotName(file.name);
      } catch (err) {
        console.error('Error auto-compressing image:', err);
      } finally {
        setIsProcessingFile(false);
      }
    }
  };

  // Submit subscription request to backend REST api
  const handleSubmitPaidRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subscriberName.trim()) {
      alert(isAr ? 'يرجى كتابة اسم المشترك' : 'Please input premium subscriber name.');
      return;
    }

    if (!subscriberEmail.trim()) {
      alert(isAr ? 'يرجى كتابة البريد الإلكتروني للمطابقة والتفعيل' : 'Please input email address.');
      return;
    }

    if (promoDiscount < 100 && !screenshotBase64) {
      alert(isAr ? 'يرجى إرفاق صورة لقطة الشاشة أو إيصال تحويل الدفع لإثبات المعاملة.' : 'Please attach a payment receipt photo or screenshot to verify payment.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const targetPlanObj = plans.find(p => p.id === selectedPlan);
      const basePrice = targetPlanObj ? targetPlanObj.priceNum : 300;
      const discountedPrice = basePrice * (1 - promoDiscount / 100);
      const formattedPrice = discountedPrice === 0 ? 'FREE' : `${discountedPrice} EGP / ${discountedPrice} ج.م`;

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      await createPremiumRequest(requestId, {
        userId,
        name: subscriberName,
        email: subscriberEmail,
        userEmail: subscriberEmail,
        planName: targetPlanObj?.name || selectedPlan,
        planPrice: formattedPrice,
        paymentScreenshot: screenshotBase64 || 'PROMO_100_FREE',
        promoCodeUsed: promoCode ? `${promoCode} (${promoDiscount}%)` : '',
        status: promoDiscount === 100 ? 'approved' : 'pending',
        createdAt: new Date().toISOString()
      });

      // Special handling if 100% off has activated user premium status immediately
      if (promoDiscount === 100) {
        alert(isAr 
          ? 'تهانينا! كود الخصم الحصري الخاص بك فعّل لك باقة النخبة فوراً وتلقائياً مجاناً! 🎉' 
          : 'Congratulations! Your VIP 100% coupon immediately activated your Premium status! 🎉'
        );
        window.location.reload();
      } else {
        alert(isAr 
          ? 'تم إرسال طلب التفعيل وإيصال الدفع بنجاح! سيقوم فريق الإدارة بموجات التحقق وقبول تفعيل حسابك خلال دقائق قليلة.' 
          : 'Receipt submitted successfully! Admin will check details and upgrade your account in a few minutes.'
        );
      }

      // Reset
      setScreenshotBase64('');
      setScreenshotName('');
      setPromoCode('');
      setPromoDiscount(0);
      
      // Update requests list
      await fetchMyRequests();
    } catch (err) {
      console.error('Failed paid request submission:', err);
      alert(isAr ? 'حدث خطأ أثناء إرسال الإيصال. يرجى المحاولة مرة أخرى.' : 'Error sending receipt. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in text-right" style={{ direction: isAr ? 'rtl' : 'ltr', textAlign: isAr ? 'right' : 'left' }}>
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black font-display text-slate-800 dark:text-white flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary animate-pulse" />
            {isAr ? 'الاشتراكات وتفعيل باقات النخبة' : 'Subscriptions & Premium Plans'}
          </h2>
          <p className="text-sm text-slate-550 dark:text-slate-400 mt-1 font-medium">
            {isAr ? 'تحوّل إلى الفضاء اللامحدود بالذكاء الاصطناعي وجدول لوحات اختبار المعلمين لطلابك.' : 'Unlock full AI generation and access premium educational scoreboards today.'}
          </p>
        </div>
        
        {/* Dynamic badge on current subscription status */}
        <div className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 border font-bold text-xs shadow-sm bg-white dark:bg-slate-900 ${
          isPremium 
            ? 'border-amber-500/30 text-amber-600 dark:text-amber-400' 
            : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
        }`}>
          {isPremium ? (
            <>
              <Crown className="w-5 h-5 text-amber-500 animate-bounce" />
              <span>{isAr ? 'باقة النخبة (مفعّلة) 👑' : 'Premium Elite (Active)'}</span>
            </>
          ) : (
            <>
              <Clock className="w-5 h-5 text-slate-400" />
              <span>{isAr ? 'الباقة المجانية (Free Tier)' : 'Free Plan Membership'}</span>
            </>
          )}
        </div>
      </div>

      {/* Global Promo Code Section */}
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm mx-auto sm:mx-0">
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
          <PartyPopper className="w-4 h-4 text-emerald-500" />
          {isAr ? 'لديك كود خصم للباقات الأساسية أو النخبة؟ (اختياري)' : 'Have a Promo Code? Apply it for all plans!'}
        </label>
        <div className="flex gap-2">
          <input 
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder={isAr ? 'أدخل كود الخصم مثل: QUIZ50' : 'Enter promo code (e.g. QUIZ50)'}
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none uppercase font-mono tracking-widest placeholder-slate-400 focus:border-primary/50"
          />
          <button 
            type="button"
            onClick={handleApplyPromo}
            disabled={isApplyingPromo}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-500 text-white hover:bg-emerald-600 shrink-0 transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 flex items-center gap-1 min-w-[90px] justify-center disabled:opacity-50"
          >
            {isApplyingPromo ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              isAr ? 'تفعيل الكود' : 'Apply'
            )}
          </button>
        </div>
        {promoDiscount > 0 && (
          <p 
             
            className="text-[11px] text-emerald-500 font-black mt-2 bg-emerald-500/10 inline-block px-3 py-1.5 rounded-lg border border-emerald-500/20"
          >
            🎉 {isAr ? `كود خصم فعال! تم تطبيق حسم %${promoDiscount} لجميع الباقات تلقائياً.` : `Coupon active! A ${promoDiscount}% discount is applied to all plans below.`}
          </p>
        )}
      </div>

      {/* Plans Showcase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isSelected = selectedPlan === p.id;
          return (
            <div 
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`rounded-3xl p-6 transition-all duration-300 relative cursor-pointer border flex flex-col justify-between ${
                isSelected 
                  ? 'bg-gradient-to-b from-primary/10 via-white/5 to-transparent dark:from-primary/15 border-2 border-primary shadow-xl scale-[1.02]' 
                  : 'bg-white dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-850 hover:border-slate-350 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              <div>
                {/* Popularity badge */}
                <span className={`absolute top-0 right-6 translate-y-[-50%] text-[9px] font-black tracking-wider px-3 py-1 rounded-full shadow ${p.tagColor}`}>
                  {p.badge}
                </span>

                <h4 className="text-lg font-black text-slate-850 dark:text-white mb-1.5 flex items-center gap-1.5">
                  {p.id === 'diamond' && <Gem className="w-5 h-5 text-cyan-400" />}
                  {p.id === 'gold' && <Crown className="w-5 h-5 text-amber-400" />}
                  {p.id === 'silver' && <Zap className="w-5 h-5 text-slate-400" />}
                  {p.name}
                </h4>

                <div className="flex items-baseline gap-1 mt-3 mb-6 flex-wrap">
                  {promoDiscount > 0 && p.priceNum > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 line-through decoration-rose-500/60 decoration-2">
                        {p.price}
                      </span>
                      <span className="text-4xl font-extrabold font-mono text-emerald-500 dark:text-emerald-400">
                        {Math.floor(p.priceNum * (1 - promoDiscount / 100))} <span className="text-base font-bold">{isAr ? 'ج.م' : 'EGP'}</span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-4xl font-extrabold font-mono text-primary dark:text-primary-hover">
                      {p.price.split(' ')[0]} <span className="text-base font-bold">{p.price.split(' ')[1]}</span>
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-bold ltr:ml-1 rtl:mr-1 self-end mb-1.5">{p.duration}</span>
                </div>

                <div className="h-px bg-slate-200/60 dark:bg-slate-800/80 mb-5" />

                <ul className="space-y-3">
                  {p.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 font-bold">
                      <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-primary' : 'text-emerald-500'}`} />
                      <span className="leading-relaxed">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <button 
                  type="button"
                  className={`w-full py-3 rounded-xl font-extrabold text-xs transition-all ${
                    isSelected
                      ? 'bg-primary text-white hover:bg-primary/95 shadow-md shadow-primary/20'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {isSelected ? (isAr ? 'تم تحديد الباقة بنجاح ✓' : 'Plan Selected ✓') : (isAr ? 'تحديد هذه الباقة' : 'Select Plan')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Part: Payment Instructions & Submission Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Payment Methods Info Box (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-850 p-6 rounded-3xl space-y-6 shadow-sm">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              {isAr ? 'خطوات دفع ثمن الاشتراك' : 'Payment Methods & Instructions'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              {isAr ? 'اختر الطريقة الأسهل لك، بعد تحويل المبلغ قم بملء النموذج المجاور وإرفاق إيصال التحويل لتفعيل باقتك فوراً.' : 'Choose any method below, complete transfer, and fill out the receipt form on the right.'}
            </p>
          </div>

          <div className="space-y-3">
            {paymentMethods.map((m) => {
              const activeMethod = selectedMethod === m.id;
              return (
                <div 
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id)}
                  className={`border p-4.5 rounded-2xl transition-all cursor-pointer relative ${
                    activeMethod 
                      ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                      : 'border-slate-150 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 shadow-sm shrink-0">
                      {m.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-850 dark:text-slate-100">{m.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{m.subtitle}</p>
                    </div>
                    {activeMethod && (
                      <span className="absolute top-4 left-4 text-primary font-black text-xs">✓</span>
                    )}
                  </div>

                  {activeMethod && (
                    <div 
                      
                      
                      className="mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-800/40 text-[11px] text-slate-600 dark:text-slate-350 space-y-2 font-mono bg-white/40 dark:bg-slate-950/40 p-2.5 rounded-lg select-text"
                    >
                      {m.id === 'instapay' && (
                        <>
                          <div className="flex justify-between">
                            <span>{isAr ? 'عنوان الدفع الفريد:' : 'IPA IPA:'}</span>
                            <span className="font-bold text-primary">{(m.details as any).address}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{isAr ? 'رقم الهاتف:' : 'Mobile Num:'}</span>
                            <span className="font-bold">{(m.details as any).mobile}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{isAr ? 'اسم المستلم:' : 'Account Holder Name:'}</span>
                            <span className="font-bold truncate max-w-[120px]">{(m.details as any).name}</span>
                          </div>
                          <p className="text-[9.5px] text-purple-600 dark:text-purple-400 mt-1.5 font-sans leading-relaxed">
                            {isAr ? '⚠️ برجاء التحويل من تطبيق إنستاباي للهاتف المحمول وإرفاق صورة بالتحويل الناجح.' : '⚠️ Open Instapay mobile app to send, then snap and upload a screenshot.'}
                          </p>
                        </>
                      )}

                      {m.id === 'vodafone' && (
                        <>
                          <div className="flex justify-between">
                            <span>{isAr ? 'رقم محفظة فودافون كاش:' : 'Wallet Cash Number:'}</span>
                            <span className="font-extrabold text-red-500 text-xs">{(m.details as any).mobile}</span>
                          </div>
                          <p className="text-[9.5px] text-slate-500 leading-normal font-sans mt-2">
                            {(m.details as any).instructions}
                          </p>
                        </>
                      )}

                      {m.id === 'bank' && (
                        <div className="space-y-1 text-[10px]">
                          <div><strong>{isAr ? 'اسم البنك:' : 'Bank Name:'}</strong> {(m.details as any).bankName}</div>
                          <div><strong>{isAr ? 'اسم الحساب:' : 'Account Name:'}</strong> {(m.details as any).accountName}</div>
                          <div><strong>{isAr ? 'رقم الحساب:' : 'Account Number:'}</strong> {(m.details as any).accountNumber}</div>
                          <div className="break-all"><strong>{isAr ? 'الآيبان IBAN:' : 'IBAN Code:'}</strong> {(m.details as any).iban}</div>
                          <div><strong>{isAr ? 'سويفت كود SWIFT:' : 'SWIFT/BIC:'}</strong> {(m.details as any).swift}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-slate-100/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-200/20 text-xs space-y-1.5 leading-relaxed text-slate-500 dark:text-slate-350">
            <p className="font-bold text-primary flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 shrink-0" />
              {isAr ? 'ملاحظات الدفع والتفعيل:' : 'Verification and Processing:'}
            </p>
            <p>{isAr ? '• يستغرق فحص إيصال التحويل وقبول طلبك فترة تتراوح في العادة بين 5 و 15 دقيقة فقط.' : '• Checking bank receipts is manual and usually takes between 5 and 15 minutes.'}</p>
            <p>{isAr ? '• في حال واجهت أي مشاكل تفعيل، بإمكانك الضغط على أيقونة الدعم الفني بالأسفل لحلها فوراً.' : '• Should you get stuck, feel free to drop an inbox message to support line.'}</p>
          </div>
        </div>

        {/* Form to submit receipts (7 cols) */}
        <div className="lg:col-span-12 xl:col-span-7 bg-white dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-850 p-6 rounded-3xl shadow-sm">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-500 animate-pulse" />
              {isAr ? 'تأكيد عملية الدفع وتعبئة نموذج الترقية' : 'Paid Premium Activation Form'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isAr ? 'برجاء ملاءمة البيانات ورفع لقطة الشاشة ليتحقق منها المسؤول ويفعل حسابك.' : 'Provide the subcriber details and the transaction photo/screenshot below.'}
            </p>
          </div>

          <form onSubmit={handleSubmitPaidRequest} className="mt-6 space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  {isAr ? 'الاسم بالكامل المشترك:' : 'Subscriber Full Name:'}
                </label>
                <input 
                  type="text"
                  required
                  value={subscriberName}
                  onChange={(e) => setSubscriberName(e.target.value)}
                  placeholder={isAr ? 'اكتب اسمك المشابه لمعرف الحساب' : 'Subscriber Name'}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  {isAr ? 'البريد الإلكتروني للتثبيت والارتباط:' : 'Subscribed Email Address:'}
                </label>
                <input 
                  type="email"
                  required
                  value={subscriberEmail}
                  onChange={(e) => setSubscriberEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all font-mono"
                />
              </div>
            </div>

            {/* Target Package selection review */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 font-extrabold block">{isAr ? 'الباقة المحددة للتفعيل حالياً:' : 'Target Activation Plan:'}</span>
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {plans.find(p => p.id === selectedPlan)?.name || selectedPlan}
                </span>
                <span className="text-sm font-extrabold text-primary font-mono select-text flex items-center gap-1.5">
                  {promoDiscount > 0 ? (
                    <>
                      <span className="line-through text-[11px] text-slate-400 font-bold">
                        {plans.find(p => p.id === selectedPlan)?.price}
                      </span>
                      <span className="text-emerald-500 font-black">
                        {((plans.find(p => p.id === selectedPlan)?.priceNum || 0) * (1 - promoDiscount / 100)).toFixed(0)} {isAr ? 'ج.م' : 'EGP'}
                      </span>
                    </>
                  ) : (
                    <span>
                      {plans.find(p => p.id === selectedPlan)?.price}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 normal-case font-bold">
                    / {isAr ? 'شهرياً' : 'mo'}
                  </span>
                </span>
              </div>
            </div>

            {/* Receipt upload screenshot box */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                {isAr ? 'صورة إيصال التحويل أو لقطة الشاشة (إثبات الدفع):' : 'Transaction Proof Screenshot / Receipt Photo:'}
              </label>
              
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-primary dark:hover:border-primary transition-all relative group bg-slate-50/50 dark:bg-slate-950/20"
              >
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={promoDiscount === 100}
                />
                
                {isProcessingFile ? (
                  <div className="space-y-2 pointer-events-none p-4">
                    <div className="w-8 h-8 rounded-full border-3 border-indigo-200 border-t-indigo-600 animate-spin mx-auto" />
                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {isAr ? 'جاري ضغط ومعالجة الصورة لتقليل حجمها...' : 'Compressing and processing image...'}
                    </p>
                  </div>
                ) : screenshotBase64 ? (
                  <div className="relative space-y-3 z-10">
                    <img 
                      src={screenshotBase64} 
                      alt="Receipt preview" 
                      className="w-28 h-28 object-cover rounded-xl mx-auto border border-white dark:border-slate-800 shadow-lg"
                    />
                    <div>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate max-w-xs mx-auto">{screenshotName}</p>
                      <button 
                        type="button"
                        onClick={() => { setScreenshotBase64(''); setScreenshotName(''); }}
                        className="mt-2 text-red-500 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/60 p-2 rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {isAr ? 'حذف وطمس الصورة' : 'Remove Photo'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pointer-events-none">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto group-hover:text-primary transition-colors" />
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                      {isAr ? 'اسحب صورة الإيصال وأفلتها هنا، أو اضغط للتصفح لبدء الرفع.' : 'Drag & drop payment screenshot here, or click to browse'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold">
                      {isAr ? 'الملفات المتاحة: PNG, JPG, JPEG (أقصى حد: 3.5 ميجابايت)' : 'Supports PNG, JPG, JPEG (up to 3.5MB)'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Submission button */}
            <button 
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-xl font-extrabold text-xs tracking-wide shadow-lg cursor-pointer transition-transform hover:scale-[1.01] flex items-center justify-center gap-2 ${
                isSubmitting 
                  ? 'bg-slate-400 text-slate-200' 
                  : 'bg-primary text-white shadow-primary/20 hover:bg-primary/95'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  <span>{isAr ? 'جاري إرسال إيصال الدفع للفحص...' : 'Uploading Payment receipt...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{isAr ? 'إرسال تأكيد الدفع لطلب تفعيل الباقة' : 'Submit Bank Receipt for Activation'}</span>
                </>
              )}
            </button>

          </form>
        </div>
      </div>

      {/* Subscription Request notifications tracker list (طلبات الدفع ومراقبة القبول والرفض) */}
      <div className="bg-white dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-850 p-6 rounded-3xl space-y-6 shadow-sm">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500 animate-pulse" />
              {isAr ? 'تاريخ طلبات الدفع وتلقي إشعارات القبول أو الرفض' : 'My Payment Requests & Activation Notifications'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr ? 'راقب حالة تفعيل اشتراكك وتلقَّ معلومات الرد وسجل الرفض من الإدارة فوراً.' : 'Observe live review status of your premium requests.'}
            </p>
          </div>
          <button 
            type="button" 
            onClick={fetchMyRequests}
            className="px-3.5 py-1.5 rounded-xl text-[10px] font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200/40 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
          >
            {isAr ? 'تحديث الحالة ⟳' : 'Refresh State ⟳'}
          </button>
        </div>

        {loadingRequests ? (
          <div className="py-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <span>{isAr ? 'جاري مطابقة وتحديث طلباتك الحالية في قاعدة البيانات...' : 'Checking database status...'}</span>
          </div>
        ) : userRequests.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border border-dashed border-slate-150 dark:border-slate-850 text-slate-400 font-bold text-xs bg-slate-50/50 dark:bg-slate-900/10">
            <p className="text-sm">☄️</p>
            <p className="mt-1">{isAr ? 'لا توجد أي طلبات تفعيل سابقة لحسابك.' : 'No active or archived premium requests found.'}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              {isAr ? 'يمكنك ترقية حسابك والدفع الآن لتشترك بـ Quiz Space!' : 'You can subscribe and send a receipt above anytime!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            
              {userRequests.map((req, index) => {
                const statusColor = 
                  req.status === 'approved' 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-350 border-emerald-200 dark:border-emerald-800'
                    : req.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-350 border-rose-200 dark:border-rose-900'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-350 border-amber-200 dark:border-amber-800';

                const statusLabel = 
                  req.status === 'approved' 
                    ? (isAr ? 'تم القبول والتفعيل ✓' : 'Approved & Active ✓')
                    : req.status === 'rejected'
                      ? (isAr ? 'تم الرفض ✕' : 'Rejected ✕')
                      : (isAr ? 'قيد المراجعة الفنية...' : 'Pending Review...');

                return (
                  <div 
                    key={req.id || index}
                    className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60 flex flex-col gap-4"
                  >
                    <div className="flex flex-wrap justify-between items-center gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                          <Crown className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-850 dark:text-white">
                            {req.planName}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-bold flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            {req.createdAt ? new Date(req.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US') : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {req.paymentScreenshot && req.paymentScreenshot !== 'PROMO_100_FREE' && (
                          <div className="text-[10px] text-primary font-bold bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/10">
                            {isAr ? 'مرفق لقطة الشاشة ✓' : 'Screenshot Attached ✓'}
                          </div>
                        )}
                        <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold border shadow-xs ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    {/* Rejected Reason block if any, directly resolving the user request */}
                    {req.status === 'rejected' && (
                      <div className="p-3.5 rounded-xl bg-red-100/40 dark:bg-red-950/25 border border-red-200/40 dark:border-red-900/30 flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-red-800 dark:text-red-300">
                          <strong className="font-extrabold block mb-0.5">
                            {isAr ? 'سبب رفض تفعيل الاشتراك من فريق الإدارة:' : 'Rejection Reason from Administration:'}
                          </strong>
                          <span className="font-bold leading-relaxed">{req.rejectReason || (isAr ? 'لم يذكر المسؤول سبباً مخصصاً، يرجى إعادة مراجعة صورة التحويل وإرسال طلب تفعيل صحيح.' : 'No detailed reason specified. Please verify the uploaded bank receipt and submit a valid payment receipt.')}</span>
                        </div>
                      </div>
                    )}

                    {/* Approved Info feedback */}
                    {req.status === 'approved' && (
                      <div className="p-3 bg-emerald-100/20 dark:bg-emerald-950/15 border border-emerald-500/15 rounded-xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="font-extrabold">{isAr ? 'حسابك الآن في فئة مميزة بالكامل! تم تفعيل لوحات المعلم والخصائص الإحصائية والشهادات.' : 'Your account successfully converted to high educator capabilities. Explore scoreboards now!'}</span>
                      </div>
                    )}

                  </div>
                );
              })}
            
          </div>
        )}
      </div>

    </div>
  );
}
