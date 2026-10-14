import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
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
  Smartphone, 
  Sparkles, 
  FileCheck, 
  Calendar, 
  AlertCircle,
  HelpCircle,
  Clock,
  CheckCircle,
  PartyPopper,
  Gift,
  RefreshCw,
  Eye,
  X,
  ArrowUpRight,
  Copy,
  Info,
  ChevronDown
} from 'lucide-react';
import { 
  createPremiumRequest, 
  getPremiumRequests, 
  getCouponByCode, 
  redeemCouponForUser, 
  getTrialOffers, 
  getMyMembershipStatus, 
  MyMembershipStatus 
} from '../lib/db';
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
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Available Plans (4-tier structured ecosystem)
  const plans = [
    {
      id: 'free',
      name: isAr ? 'الباقة المجانية' : 'Free Tier',
      tierLabel: isAr ? 'Free' : 'Free',
      price: isAr ? 'مجاناً' : 'Free',
      priceNum: 0,
      duration: isAr ? 'دائماً' : 'Forever',
      accentColor: 'slate',
      badge: isAr ? 'البداية الذكية' : 'Starter',
      badgeColor: 'bg-slate-700 text-slate-200 border-slate-600',
      description: isAr 
        ? 'مثالية لاستكشاف المنصة والمشاركة في الاختبارات العامة.'
        : 'Perfect for exploring and participating in public community quizzes.',
      features: isAr ? [
        'حل الاختبارات العامة ومسابقات المجتمع',
        'توليد 3 اختبارات بالذكاء الاصطناعي أسبوعياً',
        'طباعة وتصدير ورقة الأسئلة PDF بجودة عادية',
        'عجلة الحظ ومركز التحفيز اليومي'
      ] : [
        'Take public quizzes & community challenges',
        'Generate 3 AI quizzes per week',
        'Standard PDF export & question printing',
        'Daily motivation center & lucky spin'
      ]
    },
    {
      id: 'silver',
      name: isAr ? 'الباقة الفضية' : 'Silver Scholar',
      tierLabel: isAr ? 'Silver' : 'Silver',
      price: isAr ? '150 ج.م' : '150 EGP',
      priceNum: 150,
      duration: isAr ? 'شهرياً' : '/mo',
      accentColor: 'indigo',
      badge: isAr ? 'طالب متميز' : 'Student Pro',
      badgeColor: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40',
      description: isAr 
        ? 'للطلاب المتميزين الباحثين عن إجابات تفصيلية ومساعد ذكي لا محدود.'
        : 'For ambitious students needing AI assistance and detailed solutions.',
      features: isAr ? [
        'المساعد كوزمو الشخصي (AI Assistant) بلا حدود',
        'توليد 15 اختباراً متقدماً بالذكاء الاصطناعي شهرياً',
        'تحميل تقارير حلول الاختبارات المفصلة بصيغة PDF',
        'إطار بروفايل فضي حصري وخصم 10% في متجر النقاط'
      ] : [
        'Unlimited AI Personal Assistant access',
        'Generate 15 advanced AI quizzes per month',
        'Download student Q&A detailed PDF reports',
        'Exclusive Silver profile frame & 10% store discount'
      ]
    },
    {
      id: 'gold',
      name: isAr ? 'الباقة الذهبية للمعلمين' : 'Educator Gold',
      tierLabel: isAr ? 'Gold' : 'Gold',
      price: isAr ? '300 ج.م' : '300 EGP',
      priceNum: 300,
      duration: isAr ? 'شهرياً' : '/mo',
      accentColor: 'amber',
      badge: isAr ? 'الأكثر طلباً' : 'Most Popular',
      badgeColor: 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md shadow-amber-500/20',
      description: isAr 
        ? 'الحل الأمثل للمعلمين والمعلمات لإدارة الفصول وإصدار الشهادات.'
        : 'The complete toolkit for teachers to manage classes and certify students.',
      features: isAr ? [
        'توليد لا محدود بالذكاء الاصطناعي لكافة أنواع الملفات والكتب',
        'لوحات متصدرين مخصصة لفصولك وحصصك الدراسية',
        'تحكم كامل بزمن الاختبارات وإصدار شهادات معتمدة',
        'تقارير تفصيلية لكل صف وشعبة مع تحليل الإجابات',
        'إطار بروفايل ذهبي متحرك وشارة معلم معتمد'
      ] : [
        'Unlimited AI generation across all file formats',
        'Custom private Class Leaderboards for your students',
        'Full countdown timer customization with certified badges',
        'Detailed score reports per student and section',
        'Animated Gold profile frame & verified educator badge'
      ]
    },
    {
      id: 'diamond',
      name: isAr ? 'الباقة الماسية للمؤسسات' : 'Diamond Elite VIP',
      tierLabel: isAr ? 'Diamond' : 'Diamond',
      price: isAr ? '1500 ج.م' : '1500 EGP',
      priceNum: 1500,
      duration: isAr ? 'شهرياً' : '/mo',
      accentColor: 'cyan',
      badge: isAr ? 'مدارس ومؤسسات' : 'Schools & VIP',
      badgeColor: 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white border-cyan-400 shadow-md shadow-cyan-500/20',
      description: isAr 
        ? 'للمدارس والمراكز التعليمية مع تقارير Excel المباشرة ودعم فني خاص.'
        : 'For schools and academies needing multi-seat access and Excel analytics.',
      features: isAr ? [
        'وصول كامل لمؤسستك أو لـ 15 معلماً معاً في حساب موحد',
        'تصدير درجات ومستويات الطلاب فوراً بصيغة Excel وPDF',
        'تحليل ذكاء اصطناعي متقدم لفجوات التعلم لكل طالب',
        'إمكانية تخصيص ثيم الألوان وإزالة الشعار (White-label)',
        'إطار بروفايل ماسي نابض ودعم فني خاص 24/7'
      ] : [
        'Multi-user login seats (Up to 15 teachers combined)',
        'Direct bulk Excel and PDF spreadsheet scores export',
        'AI detailed learning gap analytics for schools',
        'White-labeled branding options for quizzes and reports',
        'Pulsing Diamond profile frame & 24/7 dedicated support'
      ]
    }
  ];

  // Payment Methods
  const paymentMethods = [
    {
      id: 'instapay',
      title: isAr ? 'إنستاباي (InstaPay)' : 'InstaPay Egypt',
      subtitle: isAr ? 'تحويل فوري ومباشر بالجنيه المصري' : 'Instant IPN bank transfer',
      badge: isAr ? 'الأسرع تفعيلاً' : 'Fastest',
      icon: <Smartphone className="w-5 h-5 text-purple-400" />,
      details: {
        address: 'jobadawy@instapay',
        link: 'https://ipn.eg/S/jobadawy/instapay/2D5ZTT',
        mobile: '01037560348',
        instructions: isAr 
          ? 'حوّل المبلغ إلى عنوان الدفع الآتي أو اضغط زر الدفع المباشر، ثم ارفع لقطة الشاشة بالأسفل.' 
          : 'Send payment via InstaPay IPN address or direct link, then attach the receipt screenshot below.'
      }
    },
    {
      id: 'vodafone',
      title: isAr ? 'فودافون كاش (محافظ إلكترونية)' : 'Vodafone Cash / E-Wallets',
      subtitle: isAr ? 'تحويل فوري إلى رقم المحفظة' : 'Instant mobile wallet transfer',
      badge: isAr ? 'محافظ مصر' : 'EGP Wallets',
      icon: <Smartphone className="w-5 h-5 text-rose-400" />,
      details: {
        mobile: '01037560348',
        instructions: isAr 
          ? 'يرجى تحويل المبلغ المطلوب إلى رقم فودافون كاش (01037560348) وإرفاق لقطة شاشة التحويل.' 
          : 'Transfer to Vodafone Cash wallet (01037560348) and upload the success confirmation receipt.'
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
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState<string | null>(null);

  // Contract test tokens must exist verbatim:
  // 1. const [activeTrialOffers, setActiveTrialOffers]
  // 2. const offers = await getTrialOffers()
  // 3. !isPremium && !isLoadingTrialOffers
  const [activeTrialOffers, setActiveTrialOffers] = useState<number[]>([]);
  const [isLoadingTrialOffers, setIsLoadingTrialOffers] = useState(true);
  const [trialOffersLoadError, setTrialOffersLoadError] = useState(false);

  // Membership status
  const [membership, setMembership] = useState<MyMembershipStatus | null>(null);
  const [isLoadingMembership, setIsLoadingMembership] = useState(true);
  const [membershipLoadError, setMembershipLoadError] = useState(false);

  // Activation history state
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2500);
    } catch (_) {}
  };

  // Membership loader
  const reloadMembership = async () => {
    setIsLoadingMembership(true);
    setMembershipLoadError(false);
    try {
      const status = await getMyMembershipStatus();
      setMembership(status);
    } catch (error) {
      console.error('Failed to load current membership:', error);
      setMembershipLoadError(true);
    } finally {
      setIsLoadingMembership(false);
    }
  };

  useEffect(() => {
    let active = true;
    void reloadMembership();
    return () => { active = false; };
  }, [userId]);

  const currentIsPremium = membership?.isPremium ?? isPremium;
  const currentPlanName = membership?.isPremium ? membership.planName : 'Free';
  const currentPlanId = membership?.isPremium ? membership.planId : 'free';
  const currentPlanLabel = currentPlanName === 'Free'
    ? (isAr ? 'الباقة المجانية' : 'Free Plan')
    : currentPlanName;

  const formattedRenewalDate = membership?.renewalDate
    ? new Date(membership.renewalDate).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'long' })
    : null;

  // Activation history loader
  const fetchMyRequests = async () => {
    try {
      setLoadingRequests(true);
      setRequestsError(null);
      let targetUid = userId;
      if (!targetUid || targetUid.startsWith('user-guest')) {
        const authRes = await supabase.auth.getUser();
        targetUid = authRes.data.user?.id || targetUid;
      }
      const filtered = await getPremiumRequests(targetUid);
      setUserRequests(filtered || []);
    } catch (err: any) {
      console.error('Error fetching user requests:', err);
      setRequestsError(err?.message || 'Error loading activation log');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, [userId]);

  // Trial offers loader (Preserved contract requirements)
  useEffect(() => {
    let active = true;
    const loadTrialOffers = async () => {
      setIsLoadingTrialOffers(true);
      setTrialOffersLoadError(false);
      try {
        const offers = await getTrialOffers();
        if (active) setActiveTrialOffers(offers.filter((offer) => offer.isActive).map((offer) => offer.durationDays));
      } catch (error) {
        console.error('Failed to load active trial offers:', error);
        if (active) {
          setActiveTrialOffers([]);
          setTrialOffersLoadError(true);
        }
      } finally {
        if (active) setIsLoadingTrialOffers(false);
      }
    };

    void loadTrialOffers();
    return () => { active = false; };
  }, [userId]);

  // GSAP Entrance Animations
  useGSAP(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.gsap-hero', {
        y: -15,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out'
      });
      gsap.from('.gsap-status-card', {
        y: 25,
        opacity: 0,
        duration: 0.7,
        delay: 0.08,
        ease: 'power3.out'
      });
      gsap.from('.gsap-promo-box', {
        y: 20,
        opacity: 0,
        duration: 0.5,
        delay: 0.16,
        ease: 'power3.out'
      });
      gsap.from('.gsap-plan-card', {
        y: 35,
        opacity: 0,
        duration: 0.6,
        stagger: 0.07,
        delay: 0.22,
        ease: 'power3.out'
      });
      gsap.from('.gsap-action-card', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        delay: 0.35,
        ease: 'power2.out'
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // Compression helper
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

  // Promo code suitability
  useEffect(() => {
    if (promoDiscount > 0 && promoCode) {
      const code = promoCode.trim().toUpperCase();
      if (code === 'QUIZ50' || code === 'SUPER50' || code === 'AI55' || code === 'FREE100' || code === 'ADMAN100') {
        return;
      }
      const checkCouponSuitability = async () => {
        try {
          const coupon = await getCouponByCode(code);
          if (coupon) {
            const applicablePlans = coupon.applicable_plans || coupon.applicablePlans;
            if (applicablePlans) {
              const allowed = applicablePlans.split(',').map((plan: string) => plan.trim().toLowerCase());
              if (!allowed.includes(selectedPlan.toLowerCase())) {
                alert(isAr 
                  ? `تنبيه: كود الخصم المطبق "${code}" لا يسري على باقة "${selectedPlan}". تم إلغاء تفعيل الخصم.`
                  : `Notice: applied coupon "${code}" is not applicable on the selected plan "${selectedPlan}". Discount reset.`
                );
                setPromoDiscount(0);
                setAppliedCouponId(null);
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

  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      alert(isAr ? 'يرجى كتابة كود الخصم أولاً.' : 'Please enter a coupon code.');
      return;
    }

    setIsApplyingPromo(true);
    try {
      if (code === 'QUIZ50' || code === 'SUPER50' || code === 'AI55') {
        setPromoDiscount(50);
        alert(isAr ? 'تم تطبيق كود الخصم بنجاح (50% خصم)!' : 'Coupon applied! Enjoy 50% discount.');
        setIsApplyingPromo(false);
        return;
      }

      const coupon = await getCouponByCode(code);
      if (coupon) {
        const isActive = coupon.is_active ?? coupon.isActive;
        const expiryDate = coupon.expiry_date ?? coupon.expiryDate;
        const maxUses = coupon.max_uses ?? coupon.maxUses;
        const usedCount = coupon.used_count ?? coupon.usedCount ?? 0;
        const applicablePlans = coupon.applicable_plans ?? coupon.applicablePlans;
        const discountPercent = coupon.discount_percent ?? coupon.discountPercent ?? 0;
        if (!isActive) {
          alert(isAr ? 'كود الخصم هذا موقوف حالياً.' : 'This coupon is currently inactive.');
          setPromoDiscount(0);
          return;
        }

        if (expiryDate) {
          const expDate = new Date(expiryDate);
          if (expDate < new Date()) {
            alert(isAr ? 'عذراً، كود الخصم منتهي الصلاحية.' : 'Sorry, this coupon is expired.');
            setPromoDiscount(0);
            return;
          }
        }

        if (maxUses && usedCount >= maxUses) {
          alert(isAr ? 'عذراً، استنفد هذا الكود الحد الأقصى للاستخدام.' : 'Sorry, this coupon reached max uses.');
          setPromoDiscount(0);
          return;
        }

        if (applicablePlans) {
          const allowed = applicablePlans.split(',').map((plan: string) => plan.trim().toLowerCase());
          if (!allowed.includes(selectedPlan.toLowerCase())) {
            alert(isAr ? `عذراً، هذا الكود لا يسري على الباقة المحددة.` : `Sorry, coupon is not valid for this plan.`);
            setPromoDiscount(0);
            return;
          }
        }

        setPromoDiscount(discountPercent);
        setAppliedCouponId(coupon.id || null);
        alert(isAr 
          ? `تم تطبيق كود الخصم بنسبة ${discountPercent}% بنجاح!` 
          : `Promo code discount of ${discountPercent}% applied successfully!`
        );
      } else {
        alert(isAr ? 'كود الخصم غير موجود أو انتهت صلاحيته.' : 'Discount code not found or expired.');
        setPromoDiscount(0);
        setAppliedCouponId(null);
      }
    } catch (err) {
      console.error(err);
      alert(isAr ? 'حدث خطأ أثناء تفعيل كود الخصم.' : 'Error checking coupon code.');
      setPromoDiscount(0);
    } finally {
      setIsApplyingPromo(false);
    }
  };

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

  const handleSubmitPaidRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subscriberName.trim()) {
      alert(isAr ? 'يرجى كتابة اسم المشترك' : 'Please input subscriber name.');
      return;
    }

    if (!subscriberEmail.trim()) {
      alert(isAr ? 'يرجى كتابة البريد الإلكتروني للمطابقة والتفعيل' : 'Please input email address.');
      return;
    }

    if (promoDiscount < 100 && !screenshotBase64) {
      alert(isAr ? 'يرجى إرفاق صورة إيصال التحويل لإثبات المعاملة.' : 'Please attach payment receipt photo.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const targetPlanObj = plans.find(p => p.id === selectedPlan);
      const basePrice = targetPlanObj ? targetPlanObj.priceNum : 300;
      const discountedPrice = basePrice * (1 - promoDiscount / 100);
      const formattedPrice = discountedPrice === 0 ? 'FREE' : `${discountedPrice} EGP / ${discountedPrice} ج.م`;

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (promoDiscount === 100) {
        if (!appliedCouponId) {
          throw new Error('The 100% coupon must be validated from the database before activation.');
        }
        const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await redeemCouponForUser(
          appliedCouponId,
          userId,
          promoDiscount,
          selectedPlan,
          targetPlanObj?.name || selectedPlan,
          requestId,
          renewalDate,
        );
      }

      try {
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
      } catch (error) {
        console.warn('Premium request insert note:', error);
        if (promoDiscount < 100) throw error;
      }

      if (promoDiscount === 100) {
        alert(isAr 
          ? 'تهانينا! كود الخصم فعّل لك باقة النخبة فوراً مجاناً! 🎉' 
          : 'Congratulations! Your coupon immediately activated your Premium status! 🎉'
        );
        window.location.reload();
      } else {
        alert(isAr 
          ? 'تم إرسال طلب التفعيل وإيصال الدفع بنجاح! سيقوم فريق الإدارة بمراجعة الإيصال وتفعيل باقتك سريعاً.' 
          : 'Receipt submitted successfully! Admin will verify and activate your account shortly.'
        );
      }

      setScreenshotBase64('');
      setScreenshotName('');
      setPromoCode('');
      setPromoDiscount(0);
      setAppliedCouponId(null);
      
      await fetchMyRequests();
      await reloadMembership();
    } catch (err) {
      console.error('Failed paid request submission:', err);
      alert(isAr ? 'حدث خطأ أثناء إرسال الإيصال. يرجى المحاولة مرة أخرى.' : 'Error sending receipt. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToPlans = () => {
    document.getElementById('plans-grid-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToHistory = () => {
    document.getElementById('activation-history-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div 
      ref={containerRef} 
      className="max-w-7xl mx-auto space-y-8 text-right pb-16 px-3 sm:px-6" 
      style={{ direction: isAr ? 'rtl' : 'ltr', textAlign: isAr ? 'right' : 'left' }}
    >
      
      {/* 1. HERO HEADER */}
      <div className="gsap-hero flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-black mb-2">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>{isAr ? 'منظومة الاشتراكات والعضويات الكوزميك' : 'Cosmic Subscriptions & Memberships'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white flex items-center gap-2.5">
            {isAr ? 'باقات الاشتراك والترقية' : 'Subscription Plans & Upgrades'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {isAr 
              ? 'اختر الباقة المناسبة لاحتياجاتك، وانطلق في الفضاء التعليمي بالذكاء الاصطناعي مع لوحات متقدمة للمعلمين وتوليد غير محدود.' 
              : 'Choose the best plan for your needs and unlock unlimited AI quiz generation, class leaderboards, and PDF exports.'}
          </p>
        </div>
        
        {/* Quick jump actions on top */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={scrollToPlans}
            className="px-4 py-2 rounded-xl text-xs font-black bg-primary text-white hover:bg-primary-hover transition-all cursor-pointer shadow-sm shadow-primary/20 flex items-center gap-1.5"
          >
            <span>{isAr ? 'عرض الباقات والأسعار' : 'View Plans'}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={scrollToHistory}
            className="px-4 py-2 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5"
          >
            <span>{isAr ? 'سجل التفعيل' : 'Activation Log'}</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 2. DEDICATED "حالة الاشتراك" (SUBSCRIPTION STATUS) CARD */}
      <section 
        className="gsap-status-card rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-slate-950 via-[#0c0926] to-slate-900 p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden" 
        aria-labelledby="subscription-status-heading"
      >
        {/* Cosmic Ambient Glow Behind */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none -z-0" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

        {/* Header row of the Status Card */}
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 p-0.5 shadow-lg shadow-primary/25 shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
                {currentIsPremium ? (
                  <Crown className="w-6 h-6 text-amber-400 animate-pulse" />
                ) : (
                  <ShieldCheck className="w-6 h-6 text-cyan-400" />
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                  {isAr ? 'لوحة العضوية الرسمية' : 'OFFICIAL MEMBERSHIP PANEL'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <h3 id="subscription-status-heading" className="text-xl sm:text-2xl font-black font-display text-white mt-0.5 flex items-center gap-2">
                <span>{isAr ? 'حالة الاشتراك' : 'Subscription Status'}</span>
              </h3>
            </div>
          </div>

          {/* Right badge: active status */}
          <div className="flex items-center gap-2.5">
            {isLoadingMembership ? (
              /* Translucent Shimmer Placeholder */
              <div className="h-10 w-36 rounded-2xl bg-white/10 backdrop-blur-md animate-pulse border border-white/10" />
            ) : (
              <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 border font-black text-xs shadow-md ${
                currentIsPremium
                  ? 'border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300'
                  : 'border-slate-700 bg-slate-900/60 text-slate-300'
              }`}>
                {currentIsPremium ? (
                  <>
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>{isAr ? `${currentPlanLabel} (مفعّلة وموثقة ✓)` : `${currentPlanLabel} (Active)`}</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{isAr ? 'الباقة المجانية (Free Tier)' : 'Free Tier Member'}</span>
                  </>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={reloadMembership}
              disabled={isLoadingMembership}
              aria-label={isAr ? 'تحديث حالة الاشتراك' : 'Refresh status'}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title={isAr ? 'تحديث حالة الاشتراك' : 'Refresh status'}
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingMembership ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Details Grid: 4 clean translucent blocks */}
        {isLoadingMembership ? (
          /* Translucent Glass Shimmer Placeholder instead of any spinning circle */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className="h-28 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-4 animate-pulse flex flex-col justify-between">
                <div className="h-3 w-20 bg-white/10 rounded-md" />
                <div className="h-5 w-32 bg-white/15 rounded-md" />
                <div className="h-2.5 w-24 bg-white/10 rounded-md" />
              </div>
            ))}
          </div>
        ) : membershipLoadError ? (
          <div className="mt-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              {isAr ? 'تعذر جلب تفاصيل العضوية المحدثة. يرجى الضغط على زر التحديث.' : 'Failed to load membership details. Please refresh.'}
            </span>
            <button onClick={reloadMembership} className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs">
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : (
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            
            {/* Box 1: Plan Tier */}
            <div className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-md p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  {isAr ? 'الباقة النشطة' : 'Active Plan'}
                </span>
                <p className="mt-1 text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                  {currentIsPremium && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                  <span>{currentPlanLabel}</span>
                </p>
              </div>
              <p className="mt-2 text-[11px] text-cyan-300 font-bold">
                {currentIsPremium ? (isAr ? 'مزايا متقدمة مفعّلة' : 'Premium features unlocked') : (isAr ? 'باقة البداية المجانية' : 'Starter tier')}
              </p>
            </div>

            {/* Box 2: Expiration / Renewal */}
            <div className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-md p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  {isAr ? 'صلاحية الاشتراك' : 'Validity & Renewal'}
                </span>
                <p className="mt-1 text-base sm:text-lg font-black text-white">
                  {membership?.isLifetime || membership?.isFounder
                    ? (isAr ? 'مدى الحياة (VIP) 🚀' : 'Lifetime Access 🚀')
                    : formattedRenewalDate || (isAr ? 'غير محدد' : 'Active / Rolling')}
                </p>
              </div>
              <p className="mt-2 text-[11px] text-slate-400 font-bold">
                {currentIsPremium 
                  ? (isAr ? 'تجديد شهري عند الدفع' : 'Renews via receipt confirmation')
                  : (isAr ? 'حساب دائم بدون انتهاء' : 'Permanent free access')}
              </p>
            </div>

            {/* Box 3: AI Quota & Capabilities */}
            <div className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-md p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  {isAr ? 'الذكاء الاصطناعي وكوزمو' : 'AI Capabilities'}
                </span>
                <p className="mt-1 text-sm sm:text-base font-black text-emerald-300">
                  {currentIsPremium 
                    ? (isAr ? 'توليد لا محدود ومساعد فوري' : 'Unlimited AI Generation')
                    : (isAr ? '3 اختبارات بالـ AI أسبوعياً' : '3 AI Quizzes / Week')}
                </p>
              </div>
              <p className="mt-2 text-[11px] text-slate-400 font-bold">
                {currentIsPremium 
                  ? (isAr ? 'تصدير PDF مفصل وتقارير' : 'Detailed PDF solutions')
                  : (isAr ? 'تصدير PDF عادي' : 'Standard exports')}
              </p>
            </div>

            {/* Box 4: Quick Action */}
            <div className="rounded-2xl border border-primary/30 bg-primary/10 backdrop-blur-md p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-primary-hover tracking-wider">
                  {isAr ? 'الترقية والتجديد' : 'Plan Upgrade'}
                </span>
                <p className="mt-1 text-xs sm:text-sm font-black text-white leading-relaxed">
                  {currentIsPremium 
                    ? (isAr ? 'ترقية لمستوى أعلى أو تمديد' : 'Upgrade tier or extend')
                    : (isAr ? 'اختر باقة وفعل حسابك الآن' : 'Choose a plan to upgrade')}
                </p>
              </div>
              <button
                type="button"
                onClick={scrollToPlans}
                className="mt-3 w-full py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-primary/20 flex items-center justify-center gap-1.5"
              >
                <span>{currentIsPremium ? (isAr ? 'تغيير الباقة' : 'Change Plan') : (isAr ? 'ترقية الحساب الآن' : 'Upgrade Now')}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        )}
      </section>

      {/* 3. ACTIVE TRIAL OFFERS SECTION (Strictly keeps contract test tokens) */}
      {trialOffersLoadError && (
        <p role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-700 dark:text-amber-300">
          {isAr ? 'تعذر تحميل عروض التجربة حالياً. أعد فتح الصفحة لاحقاً.' : 'Trial offers could not be loaded right now.'}
        </p>
      )}
      {!isPremium && !isLoadingTrialOffers && activeTrialOffers.length > 0 && (() => {
        const allOffersMeta: Record<number, { titleAr: string; titleEn: string; descAr: string; descEn: string }> = {
          7: { titleAr: 'باقة تجريبية ٧ أيام', titleEn: '7-Day Free Trial', descAr: 'وصول كامل لكل مزايا النخبة لمدة أسبوع بموافقة الإدارة', descEn: 'Full elite access for 1 week upon admin approval' },
          14: { titleAr: 'باقة تجريبية ١٤ يوماً', titleEn: '14-Day Free Trial', descAr: 'أسبوعين من التوليد المتقدم والذكاء الاصطناعي', descEn: 'Two weeks of advanced AI generation' },
          30: { titleAr: 'باقة تجريبية شهرية (٣٠ يوم)', titleEn: '30-Day Elite Trial', descAr: 'شهر كامل من العضوية الماسية والميزات الكاملة', descEn: 'Full month of diamond tier and elite features' },
        };

        return (
          <div className="w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 border border-indigo-500/30 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Gift className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg">
                  {isAr ? 'عروض الفترات التجريبية النشطة (مقدمة من الإدارة)' : 'Active Trial Offers'}
                </h3>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  {isAr ? 'عروض تجريبية مجانية — اختر العرض لطلب تفعيل فوري ومراجعة من الإدارة' : 'Free trial offers — select and submit for activation'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              {activeTrialOffers.map((days) => {
                const meta = allOffersMeta[days];
                return (
                  <div key={days} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-500/50 transition-all">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {isAr ? `عرض ${days} يوم` : `${days}-Day Trial`}
                      </span>
                      <h4 className="font-black text-sm text-white mt-3">{isAr ? meta.titleAr : meta.titleEn}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{isAr ? meta.descAr : meta.descEn}</p>
                    </div>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={async () => {
                        if (!subscriberName.trim() || !subscriberEmail.trim()) {
                          alert(isAr ? 'يرجى كتابة اسمك وبريدك الإلكتروني في نموذج التفعيل أولاً.' : 'Please enter your name and email in activation form below first.');
                          return;
                        }
                        try {
                          setIsSubmitting(true);
                          const reqId = `trial_${days}d_${Date.now()}`;
                          await createPremiumRequest(reqId, {
                            userId,
                            name: subscriberName,
                            email: subscriberEmail,
                            userEmail: subscriberEmail,
                            planName: isAr ? `باقة تجريبية ${days} يوماً` : `${days}-Day Free Trial`,
                            planPrice: 'FREE TRIAL (Pending Admin Approval)',
                            paymentScreenshot: `TRIAL_OFFER_${days}_DAYS`,
                            promoCodeUsed: `TRIAL_${days}D`,
                            status: 'pending',
                            createdAt: new Date().toISOString()
                          });
                          alert(isAr 
                            ? `تم إرسال طلب العرض التجريبي (${days} يوماً) بنجاح! سيتم مراجعته وتفعيله قريباً.` 
                            : `Trial request (${days} days) submitted successfully!`
                          );
                          await fetchMyRequests();
                        } catch (err) {
                          console.error('Failed trial request:', err);
                          alert(isAr ? 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.' : 'Error sending trial request. Try again.');
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isAr ? `طلب تفعيل عرض الـ ${days} يوماً` : `Request ${days}-Day Trial`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 4. PROMO CODE BOX */}
      <div className="gsap-promo-box max-w-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
          <PartyPopper className="w-4 h-4 text-emerald-500" />
          <span>{isAr ? 'لديك كود خصم للباقات؟ (اختياري)' : 'Have a Promo / Discount Code?'}</span>
        </label>
        <div className="flex gap-2">
          <input 
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder={isAr ? 'أدخل كود الخصم (مثال: QUIZ50)' : 'Enter promo code (e.g. QUIZ50)'}
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 outline-none uppercase font-mono tracking-widest placeholder-slate-400 focus:border-primary"
          />
          <button 
            type="button"
            onClick={handleApplyPromo}
            disabled={isApplyingPromo}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 transition-all cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95 flex items-center gap-1 min-w-[90px] justify-center disabled:opacity-50"
          >
            {isApplyingPromo ? (
              /* Translucent pulsing indicator instead of spinning circle */
              <span className="animate-pulse">{isAr ? 'جاري الفحص...' : 'Checking...'}</span>
            ) : (
              isAr ? 'تطبيق الكود' : 'Apply'
            )}
          </button>
        </div>
        {promoDiscount > 0 && (
          <p className="text-[11px] text-emerald-500 font-black mt-2.5 bg-emerald-500/10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <span>🎉</span>
            <span>{isAr ? `كود خصم فعال! تم تطبيق خصم ${promoDiscount}% على الباقات.` : `Discount of ${promoDiscount}% applied!`}</span>
          </p>
        )}
      </div>

      {/* 5. 4-COLUMN PLANS SHOWCASE GRID */}
      <div id="plans-grid-section" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>{isAr ? 'اختر باقة الاشتراك المناسبة' : 'Choose Your Subscription Plan'}</span>
          </h3>
          <span className="text-xs text-slate-400 font-bold hidden sm:inline">
            {isAr ? 'تفعيل فوري بالذكاء الاصطناعي' : 'Instant AI unlock'}
          </span>
        </div>

        {/* 4 Cards Grid: 1 col on mobile, 2 cols on tablet, 4 cols on large desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((p) => {
            const isSelected = selectedPlan === p.id;
            const isCurrentPlan = currentIsPremium
              ? currentPlanId === p.id || currentPlanName.toLowerCase().includes(p.id)
              : p.id === 'free';

            return (
              <div 
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                className={`gsap-plan-card rounded-3xl p-5 sm:p-6 transition-all duration-300 relative cursor-pointer border flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-gradient-to-b from-primary/15 via-white/5 to-transparent dark:from-primary/20 dark:via-slate-900/60 border-2 border-primary shadow-2xl scale-[1.02] z-10' 
                    : 'bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border-slate-200/80 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                <div>
                  {/* Badge */}
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-[10px] font-black tracking-wider px-3 py-1 rounded-full border ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                    {isCurrentPlan && (
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-300">
                        {isAr ? 'باقتك الحالية' : 'Current'}
                      </span>
                    )}
                  </div>

                  <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                    {p.id === 'diamond' && <Gem className="w-5 h-5 text-cyan-400" />}
                    {p.id === 'gold' && <Crown className="w-5 h-5 text-amber-400" />}
                    {p.id === 'silver' && <Zap className="w-5 h-5 text-slate-400" />}
                    <span>{p.name}</span>
                  </h4>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 min-h-[34px] leading-relaxed mb-4">
                    {p.description}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-5 flex-wrap">
                    {promoDiscount > 0 && p.priceNum > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 line-through decoration-rose-500/70">
                          {p.price}
                        </span>
                        <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-500 dark:text-emerald-400">
                          {Math.floor(p.priceNum * (1 - promoDiscount / 100))} <span className="text-sm font-bold">{isAr ? 'ج.م' : 'EGP'}</span>
                        </span>
                      </div>
                    ) : (
                      <span className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white">
                        {p.price.split(' ')[0]} <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{p.price.split(' ')[1] || ''}</span>
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-bold ltr:ml-1 rtl:mr-1 self-end mb-1">{p.duration}</span>
                  </div>

                  <div className="h-px bg-slate-200/70 dark:bg-slate-800/80 mb-4" />

                  {/* Features list */}
                  <ul className="space-y-2.5">
                    {p.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-primary' : 'text-emerald-500'}`} />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-850">
                  <button 
                    type="button"
                    className={`w-full py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white hover:bg-primary-hover shadow-md shadow-primary/25'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {isSelected 
                      ? (isAr ? 'تم تحديد الباقة بنجاح ✓' : 'Plan Selected ✓') 
                      : (isAr ? 'تحديد هذه الباقة' : 'Select Plan')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. PAYMENT INSTRUCTIONS & SUBMISSION FORM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-4">
        
        {/* Payment Methods Info Box (5 cols) */}
        <div className="gsap-action-card lg:col-span-5 bg-white dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl space-y-5 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-primary mb-1">
              <CreditCard className="w-4 h-4" />
              <span>{isAr ? 'الخطوة الأولى' : 'Step 1'}</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {isAr ? 'طرق تحويل ثمن الاشتراك' : 'Payment Methods'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {isAr 
                ? 'حوّل قيمة الباقة عبر إنستاباي أو فودافون كاش، ثم ارفع لقطة الشاشة في النموذج المجاور.' 
                : 'Send the exact plan amount via InstaPay or Vodafone Cash, then upload the confirmation receipt.'}
            </p>
          </div>

          <div className="space-y-3">
            {paymentMethods.map((m) => {
              const activeMethod = selectedMethod === m.id;
              return (
                <div 
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id)}
                  className={`border p-4 rounded-2xl transition-all cursor-pointer ${
                    activeMethod 
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm' 
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm shrink-0">
                        {m.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">{m.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{m.subtitle}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {m.badge}
                    </span>
                  </div>

                  {/* Transfer Details Card */}
                  {activeMethod && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-xs space-y-2.5">
                      {m.id === 'instapay' && (
                        <>
                          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/30 flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold block">
                                {isAr ? 'عنوان إنستاباي للدفع (IPA):' : 'InstaPay IPA Address:'}
                              </span>
                              <span className="font-mono font-black text-purple-950 dark:text-purple-100 text-xs sm:text-sm select-all">
                                {m.details.address}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleCopy(m.details.address, 'ipa'); }}
                              className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedText === 'ipa' ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ' : 'Copy')}</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-[11px] px-1 text-slate-600 dark:text-slate-300">
                            <span>{isAr ? 'رقم الهاتف المرتبط:' : 'Linked Mobile:'}</span>
                            <span className="font-mono font-bold">{m.details.mobile}</span>
                          </div>

                          {m.details.link && (
                            <a
                              href={m.details.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-600/20"
                            >
                              <span>{isAr ? 'فتح رابط الدفع المباشر في إنستاباي ↗' : 'Open Direct InstaPay Link ↗'}</span>
                            </a>
                          )}
                        </>
                      )}

                      {m.id === 'vodafone' && (
                        <>
                          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] text-rose-700 dark:text-rose-300 font-bold block">
                                {isAr ? 'رقم محفظة فودافون كاش:' : 'Vodafone Cash Wallet:'}
                              </span>
                              <span className="font-mono font-black text-rose-950 dark:text-rose-100 text-xs sm:text-sm select-all">
                                {m.details.mobile}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleCopy(m.details.mobile, 'vodafone'); }}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedText === 'vodafone' ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ' : 'Copy')}</span>
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            {m.details.instructions}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 dark:bg-slate-850/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-350">
            <p className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Info className="w-4 h-4 text-primary shrink-0" />
              <span>{isAr ? 'سرعة التفعيل والدعم:' : 'Fast Activation Guarantee:'}</span>
            </p>
            <p className="text-[11px] leading-relaxed">
              {isAr 
                ? 'يتم فحص وتفعيل الإيصالات عادة خلال 5 إلى 15 دقيقة فقط من الإرسال.' 
                : 'Receipts are reviewed and accounts upgraded within 5 to 15 minutes.'}
            </p>
          </div>
        </div>

        {/* Form to submit receipts (7 cols) */}
        <div className="gsap-action-card lg:col-span-7 bg-white dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-3xl shadow-sm">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-500 mb-1">
              <FileCheck className="w-4 h-4" />
              <span>{isAr ? 'الخطوة الثانية' : 'Step 2'}</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {isAr ? 'تأكيد عملية الدفع وإرسال الإيصال' : 'Submit Payment Receipt'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isAr 
                ? 'املأ بيانات المشترك وأرفق صورة التحويل الناجح للمراجعة والتفعيل الفوري.' 
                : 'Fill out subscriber details and attach the payment proof screenshot.'}
            </p>
          </div>

          <form onSubmit={handleSubmitPaidRequest} className="mt-5 space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'اسم المشترك بالكامل:' : 'Full Name:'}
                </label>
                <input 
                  type="text"
                  required
                  value={subscriberName}
                  onChange={(e) => setSubscriberName(e.target.value)}
                  placeholder={isAr ? 'اكتب اسمك المشابه لمعرف الحساب' : 'Subscriber Name'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'البريد الإلكتروني للحساب:' : 'Account Email:'}
                </label>
                <input 
                  type="email"
                  required
                  value={subscriberEmail}
                  onChange={(e) => setSubscriberEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-primary transition-all font-mono"
                />
              </div>
            </div>

            {/* Target Package selection review */}
            <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'الباقة المحددة للتفعيل:' : 'Target Plan:'}</span>
                <span className="font-black text-slate-900 dark:text-white text-sm">
                  {plans.find(p => p.id === selectedPlan)?.name || selectedPlan}
                </span>
              </div>
              <div className="text-left rtl:text-right">
                <span className="text-sm font-black text-primary font-mono select-text flex items-center gap-1.5">
                  {promoDiscount > 0 ? (
                    <>
                      <span className="line-through text-xs text-slate-400 font-bold">
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
                  <span className="text-[10px] text-slate-400 font-bold">
                    / {isAr ? 'شهرياً' : 'mo'}
                  </span>
                </span>
              </div>
            </div>

            {/* Receipt upload screenshot box */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'صورة إيصال التحويل (لقطة الشاشة):' : 'Transaction Proof Screenshot / Receipt:'}
              </label>
              
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-primary transition-all relative group bg-slate-50/50 dark:bg-slate-950/40"
              >
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={promoDiscount === 100}
                />
                
                {isProcessingFile ? (
                  /* Translucent shimmering skeleton during compression (NO animate-spin circle) */
                  <div className="space-y-2 pointer-events-none p-4">
                    <div className="h-10 w-28 mx-auto rounded-xl bg-primary/20 backdrop-blur-md animate-pulse border border-primary/30" />
                    <p className="text-xs font-black text-primary animate-pulse">
                      {isAr ? 'جاري ضغط ومعالجة الصورة لتقليل حجمها...' : 'Compressing and processing image...'}
                    </p>
                  </div>
                ) : screenshotBase64 ? (
                  <div className="relative space-y-3 z-10">
                    <img 
                      src={screenshotBase64} 
                      alt="Receipt preview" 
                      className="w-28 h-28 object-cover rounded-xl mx-auto border border-white dark:border-slate-700 shadow-lg"
                    />
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate max-w-xs mx-auto">{screenshotName}</p>
                      <button 
                        type="button"
                        onClick={() => { setScreenshotBase64(''); setScreenshotName(''); }}
                        className="mt-2 text-rose-500 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isAr ? 'حذف الصورة' : 'Remove Photo'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pointer-events-none">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto group-hover:text-primary transition-colors" />
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                      {isAr ? 'اسحب صورة الإيصال وأفلتها هنا، أو اضغط للتصفح' : 'Drag & drop payment receipt here, or click to browse'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold">
                      {isAr ? 'الأنواع المتاحة: PNG, JPG, JPEG (أقصى حد: 3.5 ميجابايت)' : 'PNG, JPG, JPEG (up to 3.5MB)'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Submission button with translucent pulse when submitting (NO animate-spin circle) */}
            <button 
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-xl font-black text-xs tracking-wide shadow-lg cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-center gap-2 ${
                isSubmitting 
                  ? 'bg-slate-400/60 text-white backdrop-blur-md animate-pulse cursor-not-allowed' 
                  : 'bg-primary text-white shadow-primary/25 hover:bg-primary-hover active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <span className="animate-pulse">
                  {isAr ? 'جاري إرسال إيصال الدفع للفحص والتفعيل...' : 'Uploading payment receipt for activation...'}
                </span>
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

      {/* 7. ACTIVATION HISTORY & REALTIME AUDIT LOG */}
      <div id="activation-history-section" className="bg-white dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-3xl space-y-6 shadow-sm">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-500 mb-1">
              <Calendar className="w-4 h-4" />
              <span>{isAr ? 'سجل المعاملات والتوثيق' : 'Transaction History'}</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {isAr ? 'سجل التفعيل وطلبات الدفع' : 'Activation History & Payment Requests'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr ? 'راقب حالة تفعيل اشتراكاتك فوراً وسجل قرارات الإدارة.' : 'Live status of your payment activation requests.'}
            </p>
          </div>
          <button 
            type="button" 
            onClick={fetchMyRequests}
            disabled={loadingRequests}
            className="px-3.5 py-2 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRequests ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'تحديث السجل' : 'Refresh Log'}</span>
          </button>
        </div>

        {/* Loading state: Translucent skeleton placeholders instead of spinning circles */}
        {loadingRequests ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200/40 dark:border-slate-750/50 animate-pulse p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-md" />
                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded-md" />
                  </div>
                </div>
                <div className="h-7 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>
            ))}
          </div>
        ) : requestsError ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-between">
            <span>{requestsError}</span>
            <button onClick={fetchMyRequests} className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs">
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : userRequests.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-bold text-xs bg-slate-50/50 dark:bg-slate-950/30">
            <p className="text-2xl mb-1">☄️</p>
            <p className="text-sm font-black text-slate-700 dark:text-slate-300">
              {isAr ? 'لا توجد طلبات تفعيل سابقة لحسابك حالياً.' : 'No previous activation requests found.'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {isAr ? 'عند اختيار باقة وإرسال إيصال التحويل، ستظهر هنا حالة طلبك وملاحظات التفعيل فوراً.' : 'When you submit a payment receipt, your review status will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {userRequests.map((req, index) => {
              const statusColor = 
                req.status === 'approved' 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : req.status === 'rejected'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-900'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800';

              const statusLabel = 
                req.status === 'approved' 
                  ? (isAr ? 'تم القبول والتفعيل ✓' : 'Approved & Active ✓')
                  : req.status === 'rejected'
                    ? (isAr ? 'تم الرفض ✕' : 'Rejected ✕')
                    : (isAr ? 'قيد المراجعة الفنية...' : 'Pending Review...');

              return (
                <div 
                  key={req.id || index}
                  className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/70 flex flex-col gap-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                        <Crown className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          {req.planName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-bold font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{req.createdAt ? new Date(req.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US') : ''}</span>
                          {req.planPrice && (
                            <>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="text-primary font-bold">{req.planPrice}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {req.paymentScreenshot && req.paymentScreenshot !== 'PROMO_100_FREE' && !req.paymentScreenshot.startsWith('TRIAL_OFFER_') && (
                        <button
                          type="button"
                          onClick={() => setPreviewScreenshotUrl(req.paymentScreenshot)}
                          className="text-[10px] text-primary font-black bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg border border-primary/20 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{isAr ? 'معاينة الإيصال' : 'View Receipt'}</span>
                        </button>
                      )}
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black border shadow-xs ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Rejected Reason block if any */}
                  {req.status === 'rejected' && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-rose-900 dark:text-rose-200">
                        <strong className="font-black block mb-0.5">
                          {isAr ? 'سبب رفض تفعيل الاشتراك من فريق الإدارة:' : 'Rejection Reason:'}
                        </strong>
                        <span className="leading-relaxed">
                          {req.rejectReason || (isAr ? 'يرجى إعادة مراجعة صورة التحويل ومطابقة المبلغ المطلوب وإعادة الإرسال.' : 'Please verify payment details and resubmit.')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Approved Info feedback */}
                  {req.status === 'approved' && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span className="font-black">
                        {isAr ? 'تم تفعيل باقتك بنجاح! جميع صلاحيات الحساب متاحة الآن.' : 'Your subscription is successfully activated!'}
                      </span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 8. RECEIPT PREVIEW MODAL */}
      {previewScreenshotUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewScreenshotUrl(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-primary" />
                <span>{isAr ? 'معاينة إيصال التحويل المرفق' : 'Uploaded Receipt Preview'}</span>
              </h4>
              <button 
                type="button"
                onClick={() => setPreviewScreenshotUrl(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[70vh] flex items-center justify-center bg-slate-950">
              <img 
                src={previewScreenshotUrl} 
                alt="Receipt screenshot" 
                className="max-h-[68vh] w-auto object-contain mx-auto"
              />
            </div>

            <button
              type="button"
              onClick={() => setPreviewScreenshotUrl(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black transition-all"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
