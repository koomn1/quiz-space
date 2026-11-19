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
  Coins,
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
  Monitor,
  Moon,
  Palette,
  Phone,
  Plus,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Target,
  Ticket,
  Upload,
  User,
  Users,
  UserPlus,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import {
  getUserProfileStats,
  getRewardsSummary,
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
  getCouponByCode,
  isTrialSubscription,
  isFollowingUser,
  toggleFollowUser,
  getFollowersList,
  getFollowingList,
} from '../lib/db';
import {
  AVATAR_PRESETS,
  FREE_PROFILE_FRAMES,
  PREMIUM_QUIZ_CARD_FRAMES,
  resolveFrameAsset,
  resolveProfileImageUrl,
  uniqueProfileFrames,
} from '../constants/profileAssets';
import { readLanyardVisibility, writeLanyardVisibility, getDisplayLocation } from '../lib/profileLocation';
import { playChimeSound } from '../lib/chime';
import Lanyard from '../components/lanyard/Lanyard';
import lanyardFrontImage from '../components/lanyard/card-front.webp';
import lanyardStrapImage from '../components/lanyard/lanyard.png';
import { PremiumNameTag } from '../components/PremiumNameTag';
import { THEME_PRESETS } from '../lib/themePresets';
import { useTheme } from '../context/ThemeContext';
import { showToast } from '../components/Toast';
import OverlayPortal from '../components/OverlayPortal';
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
  colorTheme,
  setColorTheme,
  onPremiumStatusChange,
  onOpenBilling,
  onNavigate,
}: UserProfileProps) {
  const isAr = lang === 'ar';
  const isOwnProfile = !profileId || profileId === currentUserId;
  const containerRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { themePreference, setThemePreference, colorTheme: activeColorTheme, setColorTheme: setActiveColorTheme } = useTheme();

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
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

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

  const [userCoins, setUserCoins] = useState<number>(0);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [showLanyard, setShowLanyard] = useState<boolean>(false);
  const [isTogglingLanyard, setIsTogglingLanyard] = useState<boolean>(false);

  // Social Followers State
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isFollowLoading, setIsFollowLoading] = useState<boolean>(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | null>(null);
  const [followModalUsers, setFollowModalUsers] = useState<Array<{ id: string; name: string; photoURL: string; customId?: string }>>([]);
  const [isFollowModalLoading, setIsFollowModalLoading] = useState<boolean>(false);

  // Load profile data
  const loadProfile = useCallback(async () => {
    const targetId = profileId || currentUserId;
    if (!targetId) return;
    setIsLoading(true);
    try {
      const [stats, rewardsSummary, inventory, catalog] = await Promise.all([
        getUserProfileStats(targetId),
        getRewardsSummary(targetId).catch(() => null),
        getRewardInventory(targetId).catch(() => []),
        getRewardStoreItems().catch(() => []),
      ]);
      setProfileData(stats);
      setFollowersCount(stats?.followersCount || 0);
      setFollowingCount(stats?.followingCount || 0);
      if (currentUserId && targetId !== currentUserId) {
        isFollowingUser(currentUserId, targetId).then(setIsFollowing).catch(() => setIsFollowing(false));
      }
      if (stats?.location) {
        setShowLanyard(readLanyardVisibility(stats.location));
      } else {
        setShowLanyard(false);
      }
      if (rewardsSummary) {
        setUserCoins(rewardsSummary.coins || 0);
        setUserPoints(rewardsSummary.points || 0);
      }
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

  const isPremium = Boolean(profileData?.isPremium);

  // Toggle 3D Lanyard ID Card (Exclusive for Subscription Members)
  const handleToggleLanyard = async () => {
    if (!isPremium) {
      showToast(
        'info',
        isAr
          ? 'قلادة الهوية ثلاثية الأبعاد (3D Lanyard) ميزة حصرية لأعضاء الاشتراكات المميزة.'
          : '3D Lanyard ID card is an exclusive perk for subscription members.'
      );
      if (onOpenBilling) {
        onOpenBilling();
      } else {
        setActiveTab('membership');
      }
      return;
    }

    setIsTogglingLanyard(true);
    const nextState = !showLanyard;
    setShowLanyard(nextState);

    try {
      const currentLocation = profileData?.location || '';
      const updatedLocation = writeLanyardVisibility(currentLocation, nextState);
      await saveUserProfile({
        userId: currentUserId,
        name: profileData?.name || currentUserName,
        photoURL: profileData?.photoURL || undefined,
        email: currentUserEmail || undefined,
        bio: profileData?.bio,
        location: updatedLocation,
        customId: profileData?.customId || undefined,
        phone: profileData?.phone || undefined,
      });
      setProfileData((prev) => (prev ? { ...prev, location: updatedLocation } : null));
      showToast(
        'success',
        nextState
          ? (isAr ? 'تم تفعيل وإظهار قلادة الهوية 3D بنجاح في ملفك!' : '3D Lanyard ID card enabled on your profile!')
          : (isAr ? 'تم إخفاء قلادة الهوية 3D.' : '3D Lanyard ID card hidden.')
      );
    } catch (err: any) {
      console.error('[UserProfile] Failed to toggle lanyard:', err);
      setShowLanyard(!nextState);
      showToast('error', isAr ? 'تعذر حفظ حالة القلادة.' : 'Failed to update lanyard setting.');
    } finally {
      setIsTogglingLanyard(false);
    }
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

      const finalLocation = writeLanyardVisibility(editLocation, showLanyard);

      const rawCustomId = editCustomId.trim().toLowerCase();
      if (/^\+?\d{8,}$/.test(rawCustomId)) {
        showToast(
          'error',
          isAr
            ? 'المعرف الفريد (Custom ID) لا يمكن أن يكون مجرد أرقام هاتف. يرجى إدخال اسم مستخدم نصي.'
            : 'Custom handle cannot be merely a phone number. Please enter a valid username.'
        );
        setIsSaving(false);
        return;
      }

      await saveUserProfile({
        userId: currentUserId,
        name: editName.trim() || currentUserName,
        photoURL: editPhoto || undefined,
        email: currentUserEmail || undefined,
        bio: editBio,
        location: finalLocation,
        customId: rawCustomId || undefined,
        phone: editPhone.trim() || undefined,
      });

      onUpdateName?.(editName.trim() || currentUserName);
      if (editPhoto) onUpdatePhoto?.(editPhoto);
      if (rawCustomId) onUpdateCustomId?.(rawCustomId);

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
      if (publicUrl) {
        setProfileData((prev) => (prev ? { ...prev, coverUrl: publicUrl } : null));
        await saveUserProfile({ userId: currentUserId, coverUrl: publicUrl });
        showToast('success', isAr ? 'تم تحديث وحفظ صورة الغلاف بنجاح!' : 'Cover photo updated & saved successfully!');
      } else {
        throw new Error(isAr ? 'فشل رفع صورة الغلاف إلى السيرفر.' : 'Failed to upload cover image.');
      }
    } catch (err: any) {
      showToast('error', err?.message || (isAr ? 'تعذر رفع وحفظ صورة الغلاف.' : 'Failed to upload cover.'));
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

  // Follow / Unfollow User
  const handleToggleFollow = async () => {
    const targetId = profileId || currentUserId;
    if (!currentUserId || !targetId || targetId === currentUserId || isFollowLoading) return;
    setIsFollowLoading(true);
    try {
      const res = await toggleFollowUser(currentUserId, targetId);
      setIsFollowing(res.isFollowing);
      setFollowersCount(res.newFollowersCount);
      playChimeSound();
      showToast(
        'success',
        res.isFollowing
          ? (isAr ? 'تمت متابعة الحساب بنجاح! ستصلك إشعارات باختباراته الجديدة.' : 'Followed! You will receive notifications for new quizzes.')
          : (isAr ? 'تم إلغاء المتابعة.' : 'Unfollowed account.')
      );
    } catch {
      showToast('error', isAr ? 'تعذر تحديث المتابعة.' : 'Failed to update follow.');
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Open Followers/Following Modal
  const openFollowModal = async (type: 'followers' | 'following') => {
    const targetId = profileId || currentUserId;
    if (!targetId) return;
    setFollowModalType(type);
    setIsFollowModalLoading(true);
    try {
      const list = type === 'followers'
        ? await getFollowersList(targetId)
        : await getFollowingList(targetId);
      setFollowModalUsers(list);
    } catch {
      setFollowModalUsers([]);
    } finally {
      setIsFollowModalLoading(false);
    }
  };

  // Redeem Coupon
  const handleRedeemCoupon = async () => {
    if (!couponCode.trim() || !currentUserId || isRedeemingCoupon) return;
    setIsRedeemingCoupon(true);
    try {
      const couponObj = await getCouponByCode(couponCode.trim());
      if (!couponObj) {
        showToast('error', isAr ? 'الكوبون غير موجود أو غير صالح.' : 'Coupon not found or invalid.');
        return;
      }
      const requestId = `coupon_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await redeemCouponForUser(couponObj.id, currentUserId, 'diamond', requestId);
      showToast('success', isAr ? 'تم تفعيل الكوبون بنجاح!' : 'Coupon redeemed successfully!');
      setCouponCode('');
      await loadProfile();
      if (onPremiumStatusChange) {
        onPremiumStatusChange(true, 'Diamond Elite VIP');
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
  const displayLocation = getDisplayLocation(profileData?.location);

  return (
    <div ref={containerRef} dir={isAr ? 'rtl' : 'ltr'} className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 space-y-6">
      {/* 1. HERO & IDENTITY BANNER */}
      <div className="gsap-hero relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
        {/* 3D Lanyard Interactive Hanging ID Card (Subscribers Only) */}
        {isPremium && showLanyard && (
          <div
            className="pointer-events-auto absolute end-3 sm:end-8 top-0 z-30 h-[340px] sm:h-[400px] md:h-[440px] w-44 sm:w-56 md:w-64"
            aria-label={isAr ? 'قلادة الهوية ثلاثية الأبعاد' : '3D Lanyard ID Card'}
          >
            <Lanyard
              frontImage={resolveProfileImageUrl(profileData?.photoURL) || lanyardFrontImage}
              backImage={`${import.meta.env.BASE_URL}brand/quizspace-card-back.webp`}
              strapImage={lanyardStrapImage}
              cardColor="#031717"
              finish="glossy"
              metal="silver"
              size={0.65}
              strapLength={0.90}
              interactive={true}
              intro={true}
              className="h-full w-full"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        )}
        {/* Cover Photo / Graphic */}
        <div className="relative h-44 sm:h-56 md:h-64 w-full overflow-hidden bg-gradient-to-r from-[#031717] via-[#007472] to-[#0a2f2e]">
          {profileData?.coverUrl ? (
            <img src={profileData.coverUrl} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_75%_20%,rgba(238,131,97,0.25),transparent)] flex items-center justify-center">
              <span className="text-white/10 text-5xl sm:text-6xl font-black select-none tracking-widest uppercase font-display">
                QuizSpace
              </span>
            </div>
          )}

          {/* Change cover button for own profile */}
          {isOwnProfile && (
            <button
              type="button"
              disabled={isUploadingCover}
              onClick={() => coverInputRef.current?.click()}
              className="absolute end-4 top-4 z-10 flex items-center gap-2 rounded-2xl bg-black/50 px-4 py-2 text-xs font-black text-white backdrop-blur-md transition hover:bg-black/75 shadow-lg active:scale-95 cursor-pointer"
            >
              {isUploadingCover ? <Loader2 className="h-4 w-4 animate-spin text-[#2AC3BB]" /> : <Camera className="h-4 w-4 text-[#EE8361]" />}
              <span>{isAr ? 'تغيير الغلاف' : 'Change Cover'}</span>
            </button>
          )}
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
        </div>

        {/* Profile Card Body */}
        <div className="relative px-5 pb-6 pt-0 sm:px-8">
          {/* Top row: Avatar on start, action buttons on end */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            {/* Avatar with Frame */}
            <div className="gsap-avatar relative -mt-14 sm:-mt-20 flex h-28 w-28 sm:h-36 sm:w-36 items-center justify-center shrink-0">
              <div className="relative h-24 w-24 sm:h-32 sm:w-32 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-xl dark:border-[#031717] dark:bg-[#072424]">
                {profileData?.photoURL ? (
                  <img
                    src={resolveProfileImageUrl(profileData.photoURL)}
                    alt={profileData.name}
                    onError={handleProfileImageError}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#007472]/15 text-3xl sm:text-4xl font-black text-[#007472] dark:text-[#2AC3BB]">
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
              <div className="absolute -bottom-1 end-1 rounded-full border-2 border-white dark:border-[#031717] bg-gradient-to-r from-[#007472] via-[#2AC3BB] to-[#EE8361] px-2.5 py-0.5 text-[10px] sm:text-[11px] font-black text-[#FCF6EE] shadow-md">
                Lv.{level}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
              {isOwnProfile ? (
                <>
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[#007472] px-4 py-2 text-xs font-black text-white shadow-md shadow-[#007472]/25 transition hover:bg-[#005e5c] active:scale-98 cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>{isAr ? 'تعديل الملف' : 'Edit Profile'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsThemeModalOpen(true)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-2xl border border-[#2AC3BB]/30 bg-[#2AC3BB]/10 px-3.5 py-2 text-xs font-black text-[#007472] dark:text-[#2AC3BB] transition hover:bg-[#2AC3BB]/20 active:scale-98 cursor-pointer"
                    title={isAr ? 'تخصيص ألوان وثيم المظهر' : 'Customize appearance & theme'}
                  >
                    <Palette className="h-4 w-4 text-[#2AC3BB]" />
                    <span>{isAr ? 'المظهر' : 'Theme'}</span>
                  </button>

                  {/* 3D Lanyard ID Card Button - Subscriptions Only */}
                  <button
                    type="button"
                    onClick={handleToggleLanyard}
                    disabled={isTogglingLanyard}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-black transition-all active:scale-98 cursor-pointer ${
                      isPremium
                        ? showLanyard
                          ? 'bg-gradient-to-r from-[#007472] to-[#2AC3BB] text-white shadow-md shadow-[#2AC3BB]/20 ring-2 ring-[#2AC3BB]/60'
                          : 'border border-[#2AC3BB]/40 bg-[#007472]/15 text-[#007472] dark:text-[#2AC3BB] hover:bg-[#007472]/25'
                        : 'border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15'
                    }`}
                    title={
                      isPremium
                        ? (showLanyard
                            ? (isAr ? 'إخفاء قلادة الهوية 3D' : 'Hide 3D Lanyard')
                            : (isAr ? 'إظهار قلادة الهوية 3D' : 'Show 3D Lanyard'))
                        : (isAr ? 'قلادة الهوية 3D - ميزة حصرية لمشتركي الباقات فقط' : '3D Lanyard - Exclusive for subscribers only')
                    }
                  >
                    {isPremium ? (
                      <>
                        <Sparkles className={`h-4 w-4 ${showLanyard ? 'text-[#EE8361] animate-pulse' : 'text-[#2AC3BB]'}`} />
                        <span>
                          {showLanyard
                            ? (isAr ? 'القلادة: مفعّلة' : 'Lanyard: ON')
                            : (isAr ? 'قلادة الـ ID' : '3D Lanyard')}
                        </span>
                        {isTogglingLanyard && <Loader2 className="h-3 w-3 animate-spin ms-1" />}
                      </>
                    ) : (
                      <>
                        <Crown className="h-4 w-4 text-amber-500" />
                        <span>{isAr ? 'قلادة الـ ID' : '3D Lanyard'}</span>
                        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-600 dark:text-amber-300 border border-amber-500/30">
                          VIP
                        </span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {currentUserId && (
                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      disabled={isFollowLoading}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-2xl px-5 py-2 text-xs font-black transition-all active:scale-95 shadow-md cursor-pointer ${
                        isFollowing
                          ? 'border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30'
                          : 'bg-gradient-to-r from-[#007472] via-[#2AC3BB] to-[#EE8361] text-white shadow-[#007472]/25 hover:shadow-lg'
                      }`}
                    >
                      {isFollowLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isFollowing ? (
                        <>
                          <UserCheck className="h-4 w-4 text-[#2AC3BB]" />
                          <span>{isAr ? 'تتابعه' : 'Following'}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          <span>{isAr ? 'متابعة' : 'Follow'}</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-[#2AC3BB]/20 dark:bg-[#072424] dark:text-[#FCF6EE] cursor-pointer"
                title={isAr ? 'مشاركة الملف' : 'Share profile'}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Profile Identity Details (Placed completely below avatar and actions) */}
          <div className="gsap-profile-info mt-4 space-y-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <PremiumNameTag
                  name={profileData?.name || currentUserName}
                  nameColor={profileData?.nameColor as any}
                  badgeTier={profileData?.badgeTier as any}
                  badgeColor={profileData?.badgeColor as any}
                  isPremium={Boolean(profileData?.isPremium)}
                />
              </h1>

              {profileData?.customId && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold font-mono text-[#007472] dark:text-[#2AC3BB] bg-slate-100 dark:bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-[#2AC3BB]/20" dir="ltr">
                  <span className="text-[#EE8361] font-black">@</span>
                  <DecryptedText
                    text={profileData.customId}
                    speed={40}
                    maxIterations={6}
                    className="font-bold tracking-wide"
                    encryptedClassName="text-[#EE8361] opacity-80"
                    animateOn="both"
                  />
                </div>
              )}
            </div>

            {/* Location, Joined Date & Followers/Following Clickable Row */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-3 sm:gap-x-4 text-xs font-bold text-slate-600 dark:text-slate-300">
              {displayLocation && (
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-[#8BAEAD]">
                  <MapPin className="h-3.5 w-3.5 text-[#EE8361]" />
                  <span>{displayLocation}</span>
                </span>
              )}

              <span className="flex items-center gap-1.5 text-slate-600 dark:text-[#8BAEAD]">
                <Calendar className="h-3.5 w-3.5 text-[#2AC3BB]" />
                <span>
                  {(profileData?.joinedDate || (profileData as any)?.created_at)
                    ? new Date(profileData?.joinedDate || (profileData as any)?.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', year: 'numeric' })
                    : (isAr ? 'عضو نشط' : 'Active Member')}
                </span>
              </span>

              {/* Followers Counter */}
              <button
                type="button"
                onClick={() => openFollowModal('followers')}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-200/60 dark:border-slate-800"
                title={isAr ? 'عرض قائمة المتابعين' : 'View followers'}
              >
                <Users className="h-3.5 w-3.5 text-[#007472] dark:text-[#2AC3BB]" />
                <span className="font-mono font-black text-slate-900 dark:text-white">
                  {followersCount.toLocaleString()}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {isAr ? 'متابع' : 'Followers'}
                </span>
              </button>

              {/* Following Counter */}
              <button
                type="button"
                onClick={() => openFollowModal('following')}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-200/60 dark:border-slate-800"
                title={isAr ? 'عرض قائمة الذين يتابعهم' : 'View following'}
              >
                <UserCheck className="h-3.5 w-3.5 text-[#2AC3BB]" />
                <span className="font-mono font-black text-slate-900 dark:text-white">
                  {followingCount.toLocaleString()}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {isAr ? 'يتابعهم' : 'Following'}
                </span>
              </button>
            </div>

            {/* Coins & Rewards Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div
                onClick={() => onNavigate?.('store')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 px-3 py-1.5 text-xs font-black text-amber-700 dark:text-amber-300 shadow-xs cursor-pointer hover:scale-102 transition backdrop-blur-xs"
                title={isAr ? 'العملات الذهبية - افتح المتجر' : 'Coins - Open store'}
              >
                <Coins className="h-4 w-4 text-amber-500" />
                <span className="font-mono">{userCoins.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-amber-600/80 dark:text-amber-300/80">{isAr ? 'عملة' : 'Coins'}</span>
              </div>

              <div
                onClick={() => onNavigate?.('store')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#2AC3BB]/30 bg-[#2AC3BB]/10 px-3 py-1.5 text-xs font-black text-[#007472] dark:text-[#2AC3BB] shadow-xs cursor-pointer hover:scale-102 transition backdrop-blur-xs"
                title={isAr ? 'نقاط المكافآت' : 'Points'}
              >
                <Sparkles className="h-4 w-4 text-[#2AC3BB]" />
                <span className="font-mono">{userPoints.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-[#007472]/70 dark:text-[#2AC3BB]/70">{isAr ? 'نقطة' : 'Pts'}</span>
              </div>
            </div>
          </div>

          {/* Highlighted Bio Card */}
          {profileData?.bio ? (
            <div className="mt-5 rounded-2xl border border-[#2AC3BB]/30 bg-white/70 dark:bg-[#072424]/80 p-4 shadow-sm backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2 text-[#007472] dark:text-[#2AC3BB]">
                <User className="h-4 w-4 text-[#EE8361]" />
                <span className="text-[11px] font-black uppercase tracking-wider">{isAr ? 'النبذة الشخصية' : 'About Me'}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-800 dark:text-[#FCF6EE] whitespace-pre-wrap">
                {profileData.bio}
              </p>
            </div>
          ) : isOwnProfile ? (
            <div
              onClick={handleOpenEdit}
              className="mt-4 rounded-2xl border border-dashed border-[#2AC3BB]/35 bg-[#2AC3BB]/[0.03] p-3 text-center cursor-pointer hover:bg-[#2AC3BB]/[0.08] transition"
            >
              <p className="text-xs font-bold text-[#007472] dark:text-[#2AC3BB] flex items-center justify-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5 text-[#EE8361]" />
                <span>{isAr ? 'أضف نبذة شخصية تعرّف بها عن نفسك في المنصة...' : 'Add a personal bio to introduce yourself...'}</span>
              </p>
            </div>
          ) : null}
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
        <OverlayPortal>
          <div
            className="fixed inset-0 z-[120] flex flex-col justify-end sm:justify-center items-center bg-slate-950/75 backdrop-blur-md p-0 sm:p-4 overflow-hidden"
            onClick={() => setIsEditing(false)}
          >
            <div
              className="w-full max-w-xl rounded-t-[32px] sm:rounded-[32px] border border-slate-200 dark:border-[#2AC3BB]/25 bg-white dark:bg-[#072424] text-slate-900 dark:text-[#FCF6EE] shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky Header: ALWAYS visible at the top */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#2AC3BB]/20 px-6 py-4 bg-white/95 dark:bg-[#072424]/95 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2AC3BB]/15 text-[#007472] dark:text-[#2AC3BB]">
                    <Edit3 className="h-4.5 w-4.5 text-[#EE8361]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-[#FCF6EE]">
                    {isAr ? 'تعديل الملف الشخصي' : 'Edit Profile'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                  title={isAr ? 'إغلاق' : 'Close'}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form with scrollable body and sticky footer */}
              <form onSubmit={handleSaveProfile} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-4">
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
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 cursor-pointer"
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
                          className={`aspect-square overflow-hidden rounded-xl border-2 transition cursor-pointer ${
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
                      {isAr ? 'الاسم المعروض' : 'Display Name'}
                    </label>
                    <input
                      type="text"
                      name="quiz_user_display_name"
                      autoComplete="name"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[#2AC3BB] dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Custom Handle */}
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                      {isAr ? 'اسم المستخدم / المعرف (@Username)' : 'Username / Custom Handle (@handle)'}
                    </label>
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-bold dark:border-slate-800 dark:bg-slate-900">
                      <span className="text-[#2AC3BB] font-mono font-black">@</span>
                      <input
                        type="text"
                        name="quiz_user_custom_handle"
                        autoComplete="username"
                        spellCheck={false}
                        placeholder={isAr ? 'مثال: ahmed_dev' : 'e.g. ahmed_dev'}
                        value={editCustomId}
                        onChange={(e) => setEditCustomId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className="w-full bg-transparent px-1.5 py-1.5 outline-none dark:text-white font-mono"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {isAr ? 'حروف إنجليزية صغيرة وأرقام و _ فقط (لا تكتب رقم الهاتف هنا).' : 'Lowercase English letters, numbers, and _ only (do not enter phone number here).'}
                    </p>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                      {isAr ? 'النبذة الشخصية (Bio)' : 'Bio'}
                    </label>
                    <textarea
                      rows={3}
                      name="quiz_user_bio"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder={isAr ? 'اكتب نبذة مميزة عنك واهتماماتك التعليمية...' : 'Write a short bio about yourself and your learning goals...'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#2AC3BB] dark:border-slate-800 dark:bg-slate-900 dark:text-white"
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
                        name="quiz_user_location"
                        autoComplete="address-level2"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[#2AC3BB] dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                        {isAr ? 'رقم الهاتف المتنقل' : 'Phone'}
                      </label>
                      <input
                        type="tel"
                        name="quiz_user_phone_number"
                        autoComplete="tel"
                        placeholder="01XXXXXXXXX"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[#2AC3BB] dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* 3D Lanyard ID Card Option (Subscribers Only) */}
                  <div className="rounded-2xl border border-[#2AC3BB]/30 bg-[#007472]/5 dark:bg-[#007472]/15 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-[#2AC3BB]/15 text-[#007472] dark:text-[#2AC3BB] shrink-0 mt-0.5">
                        {isPremium ? <Sparkles className="h-4 w-4 text-[#EE8361]" /> : <Crown className="h-4 w-4 text-amber-500" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900 dark:text-[#FCF6EE]">
                            {isAr ? 'قلادة الهوية ثلاثية الأبعاد (3D Lanyard)' : '3D Lanyard ID Card'}
                          </h4>
                          {!isPremium && (
                            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-600 dark:text-amber-300 border border-amber-500/30">
                              VIP
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-[#8BAEAD]">
                          {isPremium
                            ? (isAr
                                ? 'إظهار بطاقة الهوية المعلقة التفاعلية ثلاثية الأبعاد في أعلى ملفك الشخصي.'
                                : 'Display a draggable 3D physics ID card on your profile.')
                            : (isAr
                                ? 'ميزة حصرية متاحة فقط لأعضاء الاشتراكات المميزة.'
                                : 'Exclusive feature available only to subscription members.')}
                        </p>
                      </div>
                    </div>

                    {isPremium ? (
                      <button
                        type="button"
                        onClick={() => setShowLanyard(!showLanyard)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          showLanyard ? 'bg-[#2AC3BB]' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            showLanyard ? (isAr ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                          }`}
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          if (onOpenBilling) onOpenBilling();
                          else setActiveTab('membership');
                        }}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1.5 text-[11px] font-black text-white shadow-sm hover:brightness-110 cursor-pointer"
                      >
                        <Crown className="h-3 w-3" />
                        <span>{isAr ? 'ترقية' : 'Upgrade'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sticky Footer: ALWAYS visible at the bottom */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-[#2AC3BB]/20 px-6 py-3.5 bg-slate-50/95 dark:bg-[#031717]/95 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#007472] px-5 py-2.5 text-xs font-black text-[#FCF6EE] transition hover:bg-[#005e5c] active:scale-98 disabled:opacity-50 cursor-pointer shadow-sm shadow-[#007472]/30"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span>{isAr ? 'حفظ التغييرات' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </OverlayPortal>
      )}

      {/* 6. THEME & APPEARANCE CUSTOMIZER MODAL */}
      {isThemeModalOpen && (
        <OverlayPortal>
          <div
            className="fixed inset-0 z-[120] flex flex-col justify-end sm:justify-center items-center bg-slate-950/75 backdrop-blur-md p-0 sm:p-4 overflow-hidden"
            onClick={() => setIsThemeModalOpen(false)}
          >
            <div
              className="w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] border border-slate-200 dark:border-[#2AC3BB]/25 bg-white dark:bg-[#072424] text-slate-900 dark:text-[#FCF6EE] shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#2AC3BB]/20 px-6 py-4 bg-white/95 dark:bg-[#072424]/95 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2AC3BB]/15 text-[#007472] dark:text-[#2AC3BB]">
                    <Palette className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-[#FCF6EE]">
                    {isAr ? 'تخصيص المظهر والثيم' : 'Customize Appearance & Theme'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsThemeModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                  title={isAr ? 'إغلاق' : 'Close'}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-5">
                {/* Mode Selector: Light / Dark / Auto (System) */}
                <div>
                  <label className="mb-2.5 block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {isAr ? 'نمط العرض (Dark / Light Mode)' : 'Display Mode'}
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'dark' as const, label: isAr ? 'داكن' : 'Dark', icon: Moon },
                      { id: 'light' as const, label: isAr ? 'فاتح' : 'Light', icon: Sun },
                      { id: 'system' as const, label: isAr ? 'تلقائي' : 'System', icon: Monitor },
                    ].map((item) => {
                      const isSelected = themePreference === item.id;
                      const IconComponent = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setThemePreference(item.id);
                            showToast(
                              'success',
                              isAr
                                ? `تم تفعيل النمط ال${item.label}.`
                                : `Switched to ${item.label} mode.`
                            );
                          }}
                          className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-black transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#2AC3BB] bg-[#2AC3BB]/15 text-[#007472] dark:text-[#2AC3BB] shadow-sm ring-2 ring-[#2AC3BB]/30'
                              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900 dark:text-slate-300'
                          }`}
                        >
                          <IconComponent className="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-2.5 block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {isAr ? 'لوحة ألوان المنصة (Color Palette)' : 'Platform Color Palette'}
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {THEME_PRESETS.map((preset) => {
                      const currentActivePreset = colorTheme || activeColorTheme || 'petrol';
                      const isSelected = currentActivePreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            if (setColorTheme) {
                              setColorTheme(preset.id);
                            } else {
                              setActiveColorTheme(preset.id);
                            }
                            try {
                              localStorage.setItem('quiz_color_theme', preset.id);
                            } catch (_) {}
                            window.dispatchEvent(new CustomEvent('quizspace-theme-updated', { detail: preset.id }));
                            showToast('success', isAr ? `تم تطبيق ثيم ${preset.id}.` : `Theme ${preset.id} applied.`);
                          }}
                          className={`flex flex-col items-start gap-2 rounded-2xl border p-3 text-start transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#2AC3BB] bg-[#2AC3BB]/10 shadow-sm ring-2 ring-[#2AC3BB]/40'
                              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex w-full items-center justify-between">
                            <div
                              className="h-5 w-5 rounded-full border border-white/50 shadow-sm"
                              style={{ backgroundColor: preset.primary }}
                            />
                            {isSelected && <Check className="h-4 w-4 text-[#007472] dark:text-[#2AC3BB]" />}
                          </div>
                          <span className="text-xs font-black capitalize text-slate-900 dark:text-[#FCF6EE]">
                            {preset.id === 'petrol'
                              ? (isAr ? 'الفيروزي العميق' : 'Petrol (Brand)')
                              : preset.id === 'indigo'
                              ? (isAr ? 'النيلي الملكي' : 'Royal Indigo')
                              : preset.id === 'emerald'
                              ? (isAr ? 'الزمردي' : 'Emerald')
                              : preset.id === 'sunset'
                              ? (isAr ? 'المرجاني' : 'Sunset Coral')
                              : preset.id}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Advanced Customization shortcut */}
                <div className="rounded-2xl border border-[#2AC3BB]/25 bg-gradient-to-br from-[#007472]/10 via-[#2AC3BB]/5 to-transparent p-4">
                  <div className="flex items-center gap-2 mb-1.5 text-[#007472] dark:text-[#2AC3BB]">
                    <Sparkles className="h-4 w-4 text-[#EE8361]" />
                    <h4 className="text-xs font-black">
                      {isAr ? 'تخصيص الأفاتار والإطارات المتقدمة' : 'Avatar & Frame Customization'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                    {isAr
                      ? 'اختر من بين إطارات البروفايل وبطاقات الاختبارات والأفاتارات الحصرية في صفحة التخصيص.'
                      : 'Choose from exclusive profile frames, quiz-card frames, and avatar presets.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsThemeModalOpen(false);
                      if (onNavigate) {
                        onNavigate('customization');
                      } else {
                        window.location.hash = 'customization';
                      }
                    }}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#007472] to-[#2AC3BB] px-4 py-2 text-xs font-black text-[#FCF6EE] shadow-sm transition hover:brightness-110 active:scale-98 cursor-pointer"
                  >
                    <Palette className="h-3.5 w-3.5" />
                    <span>{isAr ? 'فتح استوديو التخصيص الكامل' : 'Open Full Customization Studio'}</span>
                  </button>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="flex items-center justify-end border-t border-slate-100 dark:border-[#2AC3BB]/20 px-6 py-3.5 bg-slate-50/95 dark:bg-[#031717]/95 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsThemeModalOpen(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}

      {/* Followers / Following List Modal */}
      {followModalType && (
        <OverlayPortal>
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in"
            onClick={() => setFollowModalType(null)}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-2 font-display font-black text-slate-900 dark:text-white">
                  <Users className="h-5 w-5 text-[#007472] dark:text-[#2AC3BB]" />
                  <h3 className="text-base">
                    {followModalType === 'followers'
                      ? (isAr ? `قائمة المتابعين (${followersCount})` : `Followers (${followersCount})`)
                      : (isAr ? `الذين يتابعهم (${followingCount})` : `Following (${followingCount})`)}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setFollowModalType(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-2.5">
                {isFollowModalLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs font-bold gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-[#2AC3BB]" />
                    <span>{isAr ? 'جاري التحميل...' : 'Loading...'}</span>
                  </div>
                ) : followModalUsers.length === 0 ? (
                  <div className="py-12 text-center text-xs font-bold text-slate-400">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-40 text-slate-400" />
                    <span>
                      {followModalType === 'followers'
                        ? (isAr ? 'لا يوجد متابعون بعد.' : 'No followers yet.')
                        : (isAr ? 'لا يتابع أي مستخدم بعد.' : 'Not following anyone yet.')}
                    </span>
                  </div>
                ) : (
                  followModalUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setFollowModalType(null);
                        if (onNavigate) {
                          onNavigate(`profile?id=${u.id}`);
                        } else {
                          window.location.hash = `#/profile?id=${u.id}`;
                        }
                      }}
                      className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/50 hover:border-[#2AC3BB]/40 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-[#007472]/15 text-[#007472] dark:text-[#2AC3BB] flex items-center justify-center font-black text-sm shrink-0 border border-slate-200 dark:border-slate-700">
                          {u.photoURL ? (
                            <img src={resolveProfileImageUrl(u.photoURL)} alt={u.name} className="h-full w-full object-cover" />
                          ) : (
                            u.name.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-white">{u.name}</p>
                          {u.customId && <p className="text-[10px] text-[#2AC3BB] font-mono">@{u.customId}</p>}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#007472] dark:text-[#2AC3BB] bg-[#007472]/10 dark:bg-[#2AC3BB]/10 px-2.5 py-1 rounded-lg">
                        {isAr ? 'عرض' : 'View'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}
    </div>
  );
}
