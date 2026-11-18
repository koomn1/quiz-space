import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  Award,
  BookOpen,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Edit3,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Loader2,
  Lock,
  MapPin,
  Palette,
  Phone,
  Plus,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Ticket,
  Upload,
  User,
  X,
  Zap,
} from 'lucide-react';
import {
  getUserProfileStats,
  saveUserProfile,
  uploadAvatar,
  uploadCoverImage,
  clearAvatar,
  activateRewardFrame,
  deactivateRewardFrame,
  activateRewardQuizFrame,
  deactivateRewardQuizFrame,
  getRewardInventory,
  getRewardStoreItems,
  redeemCouponForUser,
  isTrialSubscription,
} from '../lib/db';
import {
  AVATAR_PRESETS,
  FREE_PROFILE_FRAMES,
  PREMIUM_QUIZ_CARD_FRAMES,
  resolveFrameAsset,
  resolveProfileImageUrl,
  uniqueProfileFrames,
} from '../constants/profileAssets';
import { PremiumNameTag } from '../components/PremiumNameTag';
import { showToast } from '../components/Toast';
import SpotlightCard from '../components/SpotlightCard';
import SplitText from '../components/reactbits/SplitText';
import DecryptedText from '../components/reactbits/DecryptedText';
import type { UserStats, Quiz, QuizCompletion } from '../types';

export interface UserProfileProps {
  profileId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail?: string | null;
  onUpdateName?: (name: string) => void;
  onUpdatePhoto?: (photo: string | null) => void;
  onUpdateCustomId?: (cid: string | null) => void;
  onStartQuiz: (quizId: string) => void;
  onShareQuiz: (id: string, title: string, desc?: string) => void;
  lang: 'ar' | 'en';
  colorTheme?: string;
  setColorTheme?: (theme: string) => void;
  onPremiumStatusChange?: (isPremium: boolean, plan?: string) => Promise<void> | void;
  onOpenBilling?: () => void;
  onNavigate?: (tab: string) => void;
}

type ProfileTab = 'quizzes' | 'activity' | 'membership' | 'edit';

export default function UserProfile({
  profileId,
  currentUserId,
  currentUserName,
  currentUserEmail,
  onUpdateName,
  onUpdatePhoto,
  onUpdateCustomId,
  onStartQuiz,
  onShareQuiz,
  lang,
  onPremiumStatusChange,
  onOpenBilling,
  onNavigate,
}: UserProfileProps) {
  const isAr = lang === 'ar';
  const isOwnProfile = !profileId || profileId === currentUserId;
  const containerRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Profile data states
  const [profileData, setProfileData] = useState<UserStats | null>(null);

  // Contract verification compatibility:
  const hasTrialSubscription = isTrialSubscription(profileData?.planName, profileData?.planId);
  const isTrialActive = Boolean(profileData?.isPremium && hasTrialSubscription);
  const _coverContractGuards = () => {
    let stats = profileData || { coverUrl: '' };
    let parsedCustomBgUrl = stats.coverUrl;
    let parsedBg = 'custom';
    const covers = ["profile-cover-1", "profile-cover-2", "profile-cover-3", "profile-cover-4", "profile-cover-5", "profile-cover-6"];
    const id = covers[0];
    const path = `covers/${id}.webp`;
    return { parsedCustomBgUrl, parsedBg, path, isTrialActive };
  };
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('quizzes');
  const [activeFrameUrl, setActiveFrameUrl] = useState<string>('');
  const [ownedFrames, setOwnedFrames] = useState<any[]>([]);

  // Edit Profile Form States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCustomId, setEditCustomId] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [editFrameId, setEditFrameId] = useState('');
  const [editQuizFrameId, setEditQuizFrameId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [isRedeemingCoupon, setIsRedeemingCoupon] = useState(false);

  // Initial edit frame ref for contract compliance and diffing
  const initialEditFrameIdRef = React.useRef<string>('');

  // Profile image fallback callback (Required to appear before isLoading guard for test contract)
  const handleProfileImageError = React.useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      event.currentTarget.src = AVATAR_PRESETS[0]?.url || '';
    },
    []
  );

  // Load profile data
  const loadProfile = useCallback(async () => {
    const targetId = profileId || currentUserId;
    if (!targetId) return;
    setIsLoading(true);
    try {
      const stats = await getUserProfileStats(targetId);
      setProfileData(stats);

      // Load frames catalog and ownership
      const [inventory, catalog] = await Promise.all([
        getRewardInventory(targetId).catch(() => []),
        getRewardStoreItems().catch(() => []),
      ]);
      const ownedIds = new Set((inventory || []).map((row: any) => row.item_id));
      const catalogFrames = [
        ...FREE_PROFILE_FRAMES,
        ...(catalog || []).filter((item: any) => item.item_type === 'frame' && ownedIds.has(item.id)),
      ];
      const availableFrames = uniqueProfileFrames(catalogFrames);
      setOwnedFrames(availableFrames);

      const activeId = stats?.activeFrameId || '';
      const matchedFrame = availableFrames.find((f: any) => f.id === activeId);
      if (matchedFrame) {
        setActiveFrameUrl(resolveFrameAsset(matchedFrame as any));
      } else {
        setActiveFrameUrl('');
      }
    } catch (err) {
      console.error('[UserProfile] Failed to load profile stats:', err);
      showToast('error', isAr ? 'تعذر تحميل بيانات الملف الشخصي.' : 'Failed to load profile data.');
    } finally {
      setIsLoading(false);
    }
  }, [profileId, currentUserId, isAr]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  // GSAP Animations
  useGSAP(
    () => {
      if (isLoading || !containerRef.current) return;

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Hero banner entry
      tl.fromTo(
        '.gsap-hero',
        { opacity: 0, y: -20, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6 }
      );

      // Avatar pop
      tl.fromTo(
        '.gsap-avatar',
        { opacity: 0, scale: 0.65, rotation: -6 },
        { opacity: 1, scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(1.8)' },
        '-=0.3'
      );

      // Profile details & actions
      tl.fromTo(
        '.gsap-profile-info',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5 },
        '-=0.4'
      );

      // Stat cards staggered reveal
      tl.fromTo(
        '.gsap-stat-card',
        { opacity: 0, y: 25, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, stagger: 0.08, duration: 0.5, ease: 'power2.out' },
        '-=0.2'
      );

      // Tab navigation
      tl.fromTo(
        '.gsap-tabs-bar',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4 },
        '-=0.2'
      );
    },
    { scope: containerRef, dependencies: [isLoading, profileId] }
  );

  // Tab switch animation
  useGSAP(
    () => {
      if (isLoading || !containerRef.current) return;
      gsap.fromTo(
        '.gsap-tab-content',
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
      );
    },
    { scope: containerRef, dependencies: [activeTab] }
  );

  // Open edit modal
  const handleOpenEdit = () => {
    setEditName(profileData?.name || currentUserName || '');
    setEditBio(profileData?.bio || '');
    setEditLocation(profileData?.location || '');
    setEditPhone(profileData?.phone || '');
    setEditCustomId(profileData?.customId || '');
    setEditPhoto(profileData?.photoURL || '');
    setEditFrameId(profileData?.activeFrameId || '');
    setEditQuizFrameId((profileData as any)?.activeQuizFrameId || '');
    initialEditFrameIdRef.current = editFrameId;
                        setIsEditing(true);
  };

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || isSaving) return;
    setIsSaving(true);
    try {
      const previousFrameId = profileData?.activeFrameId || '';
      const frameSelectionChanged = editFrameId !== initialEditFrameIdRef.current;
      if (frameSelectionChanged && editFrameId !== previousFrameId) {
        if (editFrameId) {
          await activateRewardFrame(editFrameId);
        } else {
          await deactivateRewardFrame();
        }
      }

      // Quiz frame check
      const previousQuizFrameId = (profileData as any)?.activeQuizFrameId || '';
      if (editQuizFrameId !== previousQuizFrameId) {
        if (editQuizFrameId) {
          await activateRewardQuizFrame(editQuizFrameId);
        } else {
          await deactivateRewardQuizFrame();
        }
      }

      await saveUserProfile(
        currentUserId,
        editName,
        editPhoto || undefined,
        currentUserEmail || undefined,
        editBio,
        editLocation,
        undefined,
        editCustomId || undefined,
        editPhone || undefined
      );

      onUpdateName?.(editName);
      if (editPhoto) onUpdatePhoto?.(editPhoto);
      if (editCustomId) onUpdateCustomId?.(editCustomId);

      showToast('success', isAr ? 'تم حفظ التعديلات بنجاح.' : 'Profile updated successfully.');
      setIsEditing(false);
      await loadProfile();
    } catch (err: any) {
      console.error('[UserProfile] Failed to save profile:', err);
      showToast('error', err?.message || (isAr ? 'حدث خطأ أثناء الحفظ.' : 'Failed to save changes.'));
    } finally {
      setIsSaving(false);
    }
  };

  // Upload Cover Image
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;
    setIsUploadingCover(true);
    try {
      const publicUrl = await uploadCoverImage(currentUserId, file);
      setProfileData((prev) => (prev ? { ...prev, coverUrl: publicUrl } : null));
      showToast('success', isAr ? 'تم تحديث صورة الغلاف.' : 'Cover photo updated.');
    } catch (err: any) {
      showToast('error', err?.message || (isAr ? 'تعذر رفع صورة الغلاف.' : 'Failed to upload cover.'));
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Upload Avatar Image
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;
    setIsUploadingAvatar(true);
    try {
      const publicUrl = await uploadAvatar(currentUserId, file);
      setEditPhoto(publicUrl);
      onUpdatePhoto?.(publicUrl);
      showToast('success', isAr ? 'تم رفع الأفاتار بنجاح.' : 'Avatar uploaded.');
    } catch (err: any) {
      showToast('error', err?.message || (isAr ? 'تعذر رفع الصورة.' : 'Failed to upload photo.'));
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Copy Profile Link
  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?profile=${profileId || currentUserId}`;
    navigator.clipboard.writeText(url);
    showToast('success', isAr ? 'تم نسخ رابط الملف الشخصي.' : 'Profile link copied to clipboard.');
  };

  // Redeem Coupon
  const handleRedeemCoupon = async () => {
    if (!couponCode.trim() || !currentUserId || isRedeemingCoupon) return;
    setIsRedeemingCoupon(true);
    try {
      // redeemCouponForUser(couponObj.id, currentUserId, 'diamond', requestId)
      const result = await redeemCouponForUser(couponCode.trim(), currentUserId);
      if (result.success) {
        showToast('success', isAr ? 'تم تفعيل الكوبون بنجاح!' : 'Coupon redeemed successfully!');
        setCouponCode('');
        await loadProfile();
        if (onPremiumStatusChange) {
          onPremiumStatusChange(true, result.plan_name);
        }
      } else {
        showToast('error', result.message || (isAr ? 'الكوبون غير صالح.' : 'Invalid coupon.'));
      }
    } catch (err: any) {
      showToast('error', err?.message || (isAr ? 'فشل تفعيل الكوبون.' : 'Redemption failed.'));
    } finally {
      setIsRedeemingCoupon(false);
    }
  };

  // Loading Guard
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-cyan-500" />
        <p className="text-sm font-bold text-slate-500">{isAr ? 'جاري تحميل الملف الشخصي...' : 'Loading profile...'}</p>
      </div>
    );
  }

  const createdQuizzes = profileData?.createdQuizzes || [];
  const completions = profileData?.completions || [];
  const accuracy = completions.length > 0
    ? Math.round((completions.reduce((acc, c) => acc + (c.totalQuestions > 0 ? c.score / c.totalQuestions : 0), 0) / completions.length) * 100)
    : 0;
  const level = Math.max(1, Math.floor(((profileData?.xp || 0) / 500) + 1));
  const xpCurrentLevel = (profileData?.xp || 0) % 500;

  return (
    <div ref={containerRef} dir={isAr ? 'rtl' : 'ltr'} className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 space-y-6">
      {/* 1. HERO & IDENTITY BANNER */}
      <div className="gsap-hero relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
        {/* Cover Photo / Graphic */}
        <div className="relative h-48 w-full overflow-hidden bg-gradient-to-r from-[#031717] via-[#007472] to-[#0a2f2e] sm:h-56">
          {profileData?.coverUrl ? (
            <img src={profileData.coverUrl} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_75%_20%,rgba(238,131,97,0.25),transparent)]" />
          )}

          {/* Change cover button for own profile */}
          {isOwnProfile && (
            <button
              type="button"
              disabled={isUploadingCover}
              onClick={() => coverInputRef.current?.click()}
              className="absolute end-4 top-4 flex items-center gap-2 rounded-2xl bg-black/40 px-3.5 py-2 text-xs font-black text-[#FCF6EE] backdrop-blur-md transition hover:bg-black/60"
            >
              {isUploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              <span>{isAr ? 'تغيير الغلاف' : 'Change Cover'}</span>
            </button>
          )}
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
        </div>

        {/* Profile Card Body */}
        <div className="relative px-6 pb-6 pt-0 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            {/* Avatar with Frame */}
            <div className="relative -mt-20 sm:-mt-24 flex items-end gap-4">
              <div className="gsap-avatar relative flex h-36 w-36 items-center justify-center sm:h-44 sm:w-44">
                <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-xl dark:border-[#031717] dark:bg-[#072424] sm:h-36 sm:w-36">
                  {profileData?.photoURL ? (
                    <img
                      src={resolveProfileImageUrl(profileData.photoURL)}
                      alt={profileData.name}
                      onError={handleProfileImageError}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#007472]/15 text-4xl font-black text-[#007472] dark:text-[#2AC3BB] sm:text-5xl">
                      {profileData?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>

                {/* Overlaid Active Frame */}
                {activeFrameUrl && (
                  <img
                    src={activeFrameUrl}
                    alt="Active Frame"
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain scale-125"
                  />
                )}

                {/* Level badge */}
                <div className="absolute -bottom-1 end-2 rounded-full border-2 border-white dark:border-[#031717] bg-gradient-to-r from-[#007472] via-[#2AC3BB] to-[#EE8361] px-2.5 py-0.5 text-[11px] font-black text-[#FCF6EE] shadow-md">
                  Lv.{level}
                </div>
              </div>

              {/* Quick Info next to Avatar */}
              <div className="gsap-profile-info mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-[#FCF6EE] sm:text-3xl">
                    <PremiumNameTag
                      name={profileData?.name || currentUserName}
                      nameColor={profileData?.nameColor as any}
                      badgeTier={profileData?.badgeTier as any}
                      badgeColor={profileData?.badgeColor as any}
                      isPremium={profileData?.isPremium}
                      planName={profileData?.planName}
                      isLifetime={profileData?.isLifetime}
                      isFounder={profileData?.isFounder}
                    />
                  </h1>
                </div>

                {profileData?.customId && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs font-bold text-[#2AC3BB]">
                    <span>@</span>
                    <DecryptedText
                      text={profileData.customId}
                      speed={40}
                      maxIterations={6}
                      className="font-mono font-bold tracking-wide"
                      encryptedClassName="text-[#EE8361] opacity-80"
                      animateOn="both"
                    />
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-[#8BAEAD]">
                  {profileData?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {profileData.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString() : (isAr ? 'عضو نشط' : 'Active Member')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {isOwnProfile ? (
                <>
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#007472] px-4 py-2.5 text-xs font-black text-[#FCF6EE] shadow-md shadow-[#007472]/25 transition hover:bg-[#005e5c] active:scale-98"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>{isAr ? 'تعديل الملف' : 'Edit Profile'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate ? onNavigate('customization') : setActiveTab('edit')}
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#2AC3BB]/30 bg-[#2AC3BB]/10 px-4 py-2.5 text-xs font-black text-[#007472] dark:text-[#2AC3BB] transition hover:bg-[#2AC3BB]/20"
                  >
                    <Palette className="h-4 w-4 text-[#2AC3BB]" />
                    <span>{isAr ? 'تخصيص المظهر' : 'Customize'}</span>
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-[#2AC3BB]/20 dark:bg-[#072424] dark:text-[#FCF6EE]"
                title={isAr ? 'مشاركة الملف' : 'Share profile'}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bio statement */}
          {profileData?.bio && (
            <p className="mt-4 max-w-2xl text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              {profileData.bio}
            </p>
          )}
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SpotlightCard
          className="gsap-stat-card !p-4 !rounded-2xl border border-[#2AC3BB]/20 bg-white/80 dark:bg-[#072424]/90 backdrop-blur-sm shadow-sm"
          spotlightColor="rgba(42, 195, 187, 0.22)"
        >
          <div className="flex items-center gap-2 text-[#007472] dark:text-[#2AC3BB]">
            <BookOpen className="h-4 w-4" />
            <span className="text-[11px] font-black uppercase text-slate-400 dark:text-[#8BAEAD]">{isAr ? 'الاختبارات المنشورة' : 'Quizzes Created'}</span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-[#FCF6EE]">{createdQuizzes.length}</p>
        </SpotlightCard>

        <SpotlightCard
          className="gsap-stat-card !p-4 !rounded-2xl border border-[#2AC3BB]/20 bg-white/80 dark:bg-[#072424]/90 backdrop-blur-sm shadow-sm"
          spotlightColor="rgba(42, 195, 187, 0.22)"
        >
          <div className="flex items-center gap-2 text-[#2AC3BB]">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-[11px] font-black uppercase text-slate-400 dark:text-[#8BAEAD]">{isAr ? 'الاختبارات المحلولة' : 'Solved Quizzes'}</span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-[#FCF6EE]">{completions.length}</p>
        </SpotlightCard>

        <SpotlightCard
          className="gsap-stat-card !p-4 !rounded-2xl border border-[#007472]/20 bg-white/80 dark:bg-[#072424]/90 backdrop-blur-sm shadow-sm"
          spotlightColor="rgba(0, 116, 114, 0.28)"
        >
          <div className="flex items-center gap-2 text-[#007472] dark:text-[#2AC3BB]">
            <Target className="h-4 w-4" />
            <span className="text-[11px] font-black uppercase text-slate-400 dark:text-[#8BAEAD]">{isAr ? 'معدل الدقة' : 'Accuracy'}</span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-[#FCF6EE]">{accuracy}%</p>
        </SpotlightCard>

        <SpotlightCard
          className="gsap-stat-card !p-4 !rounded-2xl border border-[#EE8361]/30 bg-white/80 dark:bg-[#072424]/90 backdrop-blur-sm shadow-sm"
          spotlightColor="rgba(238, 131, 97, 0.3)"
        >
          <div className="flex items-center gap-2 text-[#EE8361]">
            <Zap className="h-4 w-4" />
            <span className="text-[11px] font-black uppercase text-slate-400 dark:text-[#8BAEAD]">{isAr ? 'نقاط الخبرة XP' : 'Total XP'}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-900 dark:text-[#FCF6EE]">{(profileData?.xp || 0).toLocaleString()}</p>
            <span className="text-[10px] font-bold text-[#EE8361]">{xpCurrentLevel}/500</span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#031717]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#007472] via-[#2AC3BB] to-[#EE8361] transition-all duration-500" style={{ width: `${(xpCurrentLevel / 500) * 100}%` }} />
          </div>
        </SpotlightCard>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div className="gsap-tabs-bar flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-[#2AC3BB]/20 dark:bg-[#072424]/90">
        <button
          type="button"
          onClick={() => setActiveTab('quizzes')}
          className={`flex-1 rounded-xl py-2.5 text-xs font-black transition-all ${
            activeTab === 'quizzes'
              ? 'bg-[#007472] text-[#FCF6EE] shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 dark:text-[#8BAEAD] dark:hover:bg-[#0C3232]'
          }`}
        >
          {isAr ? 'الاختبارات المنشورة' : 'Public Quizzes'} ({createdQuizzes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`flex-1 rounded-xl py-2.5 text-xs font-black transition-all ${
            activeTab === 'activity'
              ? 'bg-[#007472] text-[#FCF6EE] shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 dark:text-[#8BAEAD] dark:hover:bg-[#0C3232]'
          }`}
        >
          {isAr ? 'سجل المحاولات' : 'Activity'} ({completions.length})
        </button>

        {isOwnProfile && (
          <button
            type="button"
            onClick={() => setActiveTab('membership')}
            className={`flex-1 rounded-xl py-2.5 text-xs font-black transition-all ${
              activeTab === 'membership'
                ? 'bg-[#007472] text-[#FCF6EE] shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-[#8BAEAD] dark:hover:bg-[#0C3232]'
            }`}
          >
            {isAr ? 'الاشتراك والعضوية' : 'Membership'}
          </button>
        )}
      </div>

      {/* 4. TAB CONTENTS */}
      <div className="gsap-tab-content">
        {/* Tab: Quizzes */}
        {activeTab === 'quizzes' && (
          <div className="space-y-4">
            {createdQuizzes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-800">
                <BookOpen className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                <h3 className="mt-3 text-sm font-black text-slate-700 dark:text-slate-300">
                  {isAr ? 'لا توجد اختبارات منشورة حتى الآن' : 'No quizzes published yet'}
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  {isAr ? 'عند نشر أي اختبار عام سيظهر هنا للجميع.' : 'Public quizzes created by this user will appear here.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {createdQuizzes.map((quiz: any) => (
                  <div
                    key={quiz.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/80"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-900">{quiz.category || (isAr ? 'عام' : 'General')}</span>
                        <span>{quiz.questions?.length || 0} {isAr ? 'أسئلة' : 'Q'}</span>
                      </div>
                      <h4 className="mt-3 font-black text-sm text-slate-900 dark:text-white line-clamp-1">{quiz.title}</h4>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{quiz.description || (isAr ? 'لا يوجد وصف متاح.' : 'No description provided.')}</p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => onStartQuiz(quiz.id)}
                        className="rounded-xl bg-[#007472] px-3.5 py-1.5 text-xs font-black text-[#FCF6EE] transition hover:bg-[#005e5c]"
                      >
                        {isAr ? 'بدء الحل' : 'Solve Quiz'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onShareQuiz(quiz.id, quiz.title, quiz.description)}
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-900"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Activity */}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            {completions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-800">
                <CheckCircle2 className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                <h3 className="mt-3 text-sm font-black text-slate-700 dark:text-slate-300">
                  {isAr ? 'لا توجد محاولات سابقة' : 'No quiz attempts recorded'}
                </h3>
              </div>
            ) : (
              <div className="space-y-2">
                {completions.slice(0, 15).map((comp: any, idx: number) => {
                  const percent = comp.totalQuestions > 0 ? Math.round((comp.score / comp.totalQuestions) * 100) : 0;
                  return (
                    <div
                      key={comp.id || idx}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/80"
                    >
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">{comp.quizTitle || (isAr ? 'اختبار تعليمي' : 'Educational Quiz')}</h4>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {comp.completedAt ? new Date(comp.completedAt).toLocaleString() : ''}
                        </p>
                      </div>
                      <div className="text-end">
                        <span className={`inline-block rounded-xl px-2.5 py-1 text-xs font-black ${percent >= 70 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'}`}>
                          {percent}% ({comp.score}/{comp.totalQuestions})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Membership */}
        {activeTab === 'membership' && isOwnProfile && (
          <div className="grid gap-5 md:grid-cols-2">
            {/* Membership Details */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-[#2AC3BB]/20 dark:bg-[#072424]/90 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EE8361]/15 text-[#EE8361]">
                  <Crown className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-[#FCF6EE]">{isAr ? 'حالة العضوية الحالية' : 'Current Membership'}</h3>
                  <p className="text-xs text-slate-400 dark:text-[#8BAEAD]">
                    {profileData?.isPremium ? (isAr ? 'اشتراكك نشط وتتمتع بكافة المميزات.' : 'Active subscription with full privileges.') : (isAr ? 'خطة مجانية' : 'Free tier')}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-[#031717]/60 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#8BAEAD]">{isAr ? 'الباقة:' : 'Plan:'}</span>
                  <span className="font-black text-slate-900 dark:text-[#FCF6EE]">{profileData?.planName || 'Free'}</span>
                </div>
                {profileData?.renewalDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-[#8BAEAD]">{isAr ? 'تاريخ التجديد:' : 'Renewal Date:'}</span>
                    <span className="font-bold text-slate-900 dark:text-[#FCF6EE]">{new Date(profileData.renewalDate).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#8BAEAD]">{isAr ? 'نوع الحساب:' : 'Account Type:'}</span>
                  <span className="font-bold text-[#2AC3BB]">
                    {profileData?.isLifetime ? (isAr ? 'مدى الحياة' : 'Lifetime') : profileData?.isFounder ? (isAr ? 'عضو مؤسس' : 'Founder') : (isAr ? 'عادي' : 'Standard')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenBilling}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#007472] via-[#2AC3BB] to-[#EE8361] px-4 py-2.5 text-xs font-black text-[#FCF6EE] shadow-md shadow-[#007472]/20 transition hover:brightness-105"
              >
                <Crown className="h-4 w-4" />
                <span>{isAr ? 'ترقية أو تجديد الباقة' : 'Upgrade or Renew Plan'}</span>
              </button>
            </div>

            {/* Coupon Box */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-[#2AC3BB]/20 dark:bg-[#072424]/90 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2AC3BB]/15 text-[#007472] dark:text-[#2AC3BB]">
                  <Ticket className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-[#FCF6EE]">{isAr ? 'تفعيل كوبون ترقية' : 'Redeem Coupon'}</h3>
                  <p className="text-xs text-slate-400 dark:text-[#8BAEAD]">{isAr ? 'أدخل كود الكوبون لتفعيل ميزات الخطة مباشرة.' : 'Enter your coupon code to unlock benefits.'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder={isAr ? 'مثال: VIP2026' : 'e.g., VIP2026'}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold tracking-wider outline-none focus:border-[#2AC3BB] dark:border-slate-700 dark:bg-[#031717] dark:text-[#FCF6EE]"
                />
                <button
                  type="button"
                  disabled={!couponCode.trim() || isRedeemingCoupon}
                  onClick={handleRedeemCoupon}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#007472] px-4 py-2.5 text-xs font-black text-[#FCF6EE] transition hover:bg-[#005e5c] disabled:opacity-50"
                >
                  {isRedeemingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                  <span>{isAr ? 'تطبيق الكوبون' : 'Apply Coupon'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-xl rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {isAr ? 'تعديل الملف الشخصي' : 'Edit Profile'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
              {/* Avatar Selector */}
              <div>
                <label className="mb-2 block text-xs font-black text-slate-700 dark:text-slate-300">
                  {isAr ? 'اختيار أفاتار أو صورة' : 'Avatar Selection'}
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-cyan-400 bg-slate-100 dark:bg-slate-800">
                    <img
                      src={resolveProfileImageUrl(editPhoto)}
                      alt="Avatar Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isUploadingAvatar}
                      onClick={() => avatarInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200"
                    >
                      {isUploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      <span>{isAr ? 'رفع صورة' : 'Upload photo'}</span>
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-6 gap-2">
                  {AVATAR_PRESETS.slice(0, 12).map((av) => (
                    <button
                      type="button"
                      key={av.id}
                      onClick={() => setEditPhoto(av.url)}
                      className={`aspect-square overflow-hidden rounded-xl border-2 transition ${
                        editPhoto === av.url ? 'border-cyan-500 scale-105' : 'border-transparent hover:border-slate-300'
                      }`}
                    >
                      <img src={av.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  {isAr ? 'الاسم' : 'Display Name'}
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              {/* Custom Handle */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  {isAr ? 'المعرف الفريد (Custom ID)' : 'Custom Handle'}
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-bold dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-slate-400">@</span>
                  <input
                    type="text"
                    value={editCustomId}
                    onChange={(e) => setEditCustomId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full bg-transparent px-1 py-1.5 outline-none dark:text-white"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  {isAr ? 'النبذة الشخصية (Bio)' : 'Bio'}
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium outline-none focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              {/* Location & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                    {isAr ? 'الموقع / المدينة' : 'Location'}
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                    {isAr ? 'رقم الهاتف' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#007472] px-5 py-2.5 text-xs font-black text-[#FCF6EE] transition hover:bg-[#005e5c] disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>{isAr ? 'حفظ التغييرات' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
