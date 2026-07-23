import CosmicLoader from "../components/CosmicLoader";
import React from "react";
import { Quiz, QuizCompletion, UserStats } from "../types";
import {
  Award,
  Globe,
  Calendar,
  Link as LinkIcon,
  BadgeCheck,
  CheckCircle2,
  UserPlus,
  FileText,
  Pin,
  BookOpen,
  Crown,
  Gem,
  Activity,
  Edit2,
  Save,
  X,
  Sparkles,
  Trophy,
  Heart,
  ArrowLeft,
  Trash2,
  Milestone,
  ShieldCheck,
  Star,
  Settings,
  User as UserIcon,
} from "lucide-react";
import { getUserProfileStats, saveUserProfile, getCouponByCode, uploadAvatar } from "../lib/db";
import { getApiUrl } from "../lib/origin";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { GsapCoverBackground } from "../components/GsapCoverBackground";
import { SocialSupportLinks } from "../components/SocialSupportLinks";
import { LiquidGlassSwitch } from "../components/LiquidGlassSwitch";

interface UserProfileProps {
  profileId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail?: string | null;
  onUpdateName: (name: string) => void;
  onUpdatePhoto?: (photo: string) => void;
  onUpdateCustomId?: (customId: string) => void;
  onStartQuiz: (quizId: string) => void;
  onShareQuiz: (
    quizId: string,
    quizTitle: string,
    quizDescription?: string,
  ) => void;
  lang?: "ar" | "en";
  colorTheme?: string;
  setColorTheme?: (theme: string) => void;
  onPremiumStatusChange?: (isPremium: boolean, planName?: string) => void;
}

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
  lang = "ar",
  colorTheme = "indigo",
  setColorTheme,
  onPremiumStatusChange = () => {},
}: UserProfileProps) {
  const isAr = lang === "ar";
  const isOwnProfile = profileId === currentUserId;

  const { user: authUser } = useAuth();
  const [profileData, setProfileData] = React.useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Real followers/following statistics backed by Postgres
  const [followersCount, setFollowersCount] = React.useState(0);
  const [followingCount, setFollowingCount] = React.useState(0);
  const [isFollowing, setIsFollowing] = React.useState(false);

  // Edit Profile States
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(currentUserName);
  const [editBio, setEditBio] = React.useState("");
  const [editPhotoURL, setEditPhotoURL] = React.useState("");
  const [editRole, setEditRole] = React.useState("");
  const [editCountry, setEditCountry] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  // Custom User ID & Suggester States
  const [editCustomId, setEditCustomId] = React.useState("");
  const [customIdError, setCustomIdError] = React.useState("");
  const [customIdSuggestions, setCustomIdSuggestions] = React.useState<
    string[]
  >([]);
  const [isVerifyingCustomId, setIsVerifyingCustomId] = React.useState(false);

  // Promo Code State
  const [promoCodeInput, setPromoCodeInput] = React.useState("");
  const [isRedeemingPromo, setIsRedeemingPromo] = React.useState(false);

  // Custom Badge & Social States
  const [badgeSymbol, setBadgeSymbol] = React.useState("🛡️");
  const [badgeColor, setBadgeColor] = React.useState("#3b82f6");
  const [githubUrl, setGithubUrl] = React.useState("");
  const [instagramUrl, setInstagramUrl] = React.useState("");
  const [linkedinUrl, setLinkedinUrl] = React.useState("");
  const [facebookUrl, setFacebookUrl] = React.useState("");

  // Premium Animated Cover states
  const [chosenBg, setChosenBg] = React.useState("cosmic");
  const [bgSettings, setBgSettings] = React.useState<any>({
    speed: 1.0,
    brightness: 100,
    glow: 1.0,
    density: 1.0,
    waveHeight: 1.0,
    theme: "default",
    blur: 5,
  });
  const [coverText, setCoverText] = React.useState("");

  // Verified Badge (the customizable checkmark)
  const [verifiedIcon, setVerifiedIcon] = React.useState("BadgeCheck");
  const [verifiedColor, setVerifiedColor] = React.useState("#3b82f6");
  const [verifiedShow, setVerifiedShow] = React.useState(true);

  const renderVerifiedIcon = (
    iconName: string,
    color: string,
    sizeClass: string = "w-6 h-6",
  ) => {
    const props = {
      className: `${sizeClass} drop-shadow-sm transition-transform hover:scale-110 duration-200 shrink-0`,
      style: { color },
    };
    switch (iconName) {
      case "CheckCircle2":
        return <CheckCircle2 {...props} />;
      case "ShieldCheck":
        return <ShieldCheck {...props} />;
      case "Award":
        return <Award {...props} />;
      case "Crown":
        return <Crown {...props} />;
      case "Gem":
        return <Gem {...props} />;
      case "Star":
        return <Star {...props} />;
      case "BadgeCheck":
      default:
        return <BadgeCheck {...props} />;
    }
  };

  const [activeTab, setActiveTab] = React.useState<
    "overview" | "quizzes" | "achievements"
  >("overview");

  // Trigger follow / followers queries
  const fetchFollowStats = async () => {
    if (!profileId) return;
    try {
      const { data: followersData } = await supabase.from('follows').select('*').eq('following_id', profileId);
      const { data: followingData } = await supabase.from('follows').select('*').eq('follower_id', profileId);
      
      setFollowersCount(followersData?.length || 0);
      setFollowingCount(followingData?.length || 0);
      
      if (currentUserId) {
        setIsFollowing(followersData?.some(f => f.follower_id === currentUserId) || false);
      }
    } catch (err) {
      console.error("Error fetching follow stats:", err);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUserId || currentUserId === profileId) return;
    try {
      const { data: existing } = await supabase.from('follows').select('*').eq('follower_id', currentUserId).eq('following_id', profileId).single();
      if (existing) {
        await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', profileId);
        setIsFollowing(false);
      } else {
        await supabase.from('follows').insert({ follower_id: currentUserId, following_id: profileId, created_at: new Date().toISOString() });
        setIsFollowing(true);
      }
      fetchFollowStats();
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  const handleCheckCustomId = async (id: string) => {
    if (!id.trim()) {
      setCustomIdError("");
      setCustomIdSuggestions([]);
      return;
    }
    const clean = id.trim().toLowerCase().replace(/^@/, "");
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setCustomIdError(
        isAr
          ? "يجب أن يحتوي المعرف على أحرف وأرقام إنجليزية وشرطة سفلية (_) فقط."
          : "ID must contain only alphanumeric characters and underscores (_).",
      );
      setCustomIdSuggestions([]);
      return;
    }

    setIsVerifyingCustomId(true);
    try {
      const { data: existingUser } = await supabase.from('users').select('uid').eq('custom_id', clean).maybeSingle();
      if (existingUser && existingUser.uid !== profileId) {
        setCustomIdError(
          isAr
            ? "عذراً، هذا المعرّف مأخوذ بالفعل!"
            : "Sorry, this ID is taken!",
        );
        setCustomIdSuggestions([`${clean}_1`, `${clean}2026`, `${clean}_pro`]);
      } else {
        setCustomIdError("");
        setCustomIdSuggestions([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifyingCustomId(false);
    }
  };

  React.useEffect(() => {
    fetchFollowStats();
  }, [profileId, currentUserId]);

  React.useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      try {
        const stats = await getUserProfileStats(profileId);
        setProfileData(stats);
        if (stats) {
          if (stats.name) setEditName(stats.name);
          if (stats.bio) setEditBio(stats.bio);
          if (stats.photoURL) setEditPhotoURL(stats.photoURL);
          if (stats.customId) setEditCustomId(stats.customId);

          if (stats.badgeSymbol) setBadgeSymbol(stats.badgeSymbol);
          if (stats.badgeColor) setBadgeColor(stats.badgeColor);

          // Parse serialized location info column for custom backdrops, slogs & social urls
          const locStr = stats.location || "";
          let parsedBg = "cosmic";
          let parsedCoverText = "";
          let parsedGithub = "";
          let parsedInstagram = "";
          let parsedLinkedin = "";
          let parsedFacebook = "";
          let parsedRole = "";
          let parsedCountry = "";

          let parsedVerifiedIcon = "BadgeCheck";
          let parsedVerifiedColor = "#3b82f6";
          let parsedVerifiedShow = stats.isPremium || false;

          if (locStr.includes("||verifiedIcon:")) {
            const iconPart = locStr.split("||verifiedIcon:")[1] || "";
            parsedVerifiedIcon = iconPart.split("||")[0] || "BadgeCheck";
          }
          if (locStr.includes("||verifiedColor:")) {
            const colorPart = locStr.split("||verifiedColor:")[1] || "";
            const rawCol = colorPart.split("||")[0] || "#3b82f6";
            try {
              parsedVerifiedColor = decodeURIComponent(rawCol);
            } catch (e) {
              parsedVerifiedColor = rawCol;
            }
          }
          if (locStr.includes("||verifiedShow:")) {
            const showPart = locStr.split("||verifiedShow:")[1] || "";
            parsedVerifiedShow = showPart.split("||")[0] === "true";
          } else if (stats.isPremium) {
            parsedVerifiedShow = true;
          }

          if (locStr.includes("||bg:")) {
            const afterBg = locStr.split("||bg:")[1] || "";
            const bgChunks = afterBg.split("||");
            parsedBg = bgChunks[0] || "cosmic";
            bgChunks.forEach((chunk: string) => {
              if (chunk.startsWith("coverText:"))
                parsedCoverText = chunk.substring(10);
              if (chunk.startsWith("github:"))
                parsedGithub = chunk.substring(7);
              if (chunk.startsWith("instagram:"))
                parsedInstagram = chunk.substring(10);
              if (chunk.startsWith("linkedin:"))
                parsedLinkedin = chunk.substring(9);
              if (chunk.startsWith("facebook:"))
                parsedFacebook = chunk.substring(9);
              if (chunk.startsWith("role:")) parsedRole = chunk.substring(5);
              if (chunk.startsWith("country:"))
                parsedCountry = chunk.substring(8);
            });
          } else {
            // backward compatibility
            const parts = locStr.split("||");
            parts.forEach((p: string) => {
              if (p.startsWith("github:")) parsedGithub = p.substring(7);
              if (p.startsWith("instagram:")) parsedInstagram = p.substring(10);
              if (p.startsWith("linkedin:")) parsedLinkedin = p.substring(9);
              if (p.startsWith("facebook:")) parsedFacebook = p.substring(9);
              if (p.startsWith("role:")) parsedRole = p.substring(5);
              if (p.startsWith("country:")) parsedCountry = p.substring(8);
            });
          }

          let parsedBgSpeed = 1.0;
          let parsedBgBrightness = 100;
          let parsedBgGlow = 1.0;
          let parsedBgDensity = 1.0;
          let parsedBgWaveHeight = 1.0;
          let parsedBgTheme: "default" | "warm" | "cool" | "neon" = "default";
          let parsedBgBlur = 5;

          if (locStr.includes("||bgSpeed:")) {
            const val = locStr.split("||bgSpeed:")[1]?.split("||")[0];
            if (val) parsedBgSpeed = parseFloat(val);
          }
          if (locStr.includes("||bgBrightness:")) {
            const val = locStr.split("||bgBrightness:")[1]?.split("||")[0];
            if (val) parsedBgBrightness = parseInt(val);
          }
          if (locStr.includes("||bgGlow:")) {
            const val = locStr.split("||bgGlow:")[1]?.split("||")[0];
            if (val) parsedBgGlow = parseFloat(val);
          }
          if (locStr.includes("||bgDensity:")) {
            const val = locStr.split("||bgDensity:")[1]?.split("||")[0];
            if (val) parsedBgDensity = parseFloat(val);
          }
          if (locStr.includes("||bgWaveHeight:")) {
            const val = locStr.split("||bgWaveHeight:")[1]?.split("||")[0];
            if (val) parsedBgWaveHeight = parseFloat(val);
          }
          if (locStr.includes("||bgTheme:")) {
            const val = locStr.split("||bgTheme:")[1]?.split("||")[0];
            if (val) parsedBgTheme = val as any;
          }
          if (locStr.includes("||bgBlur:")) {
            const val = locStr.split("||bgBlur:")[1]?.split("||")[0];
            if (val) parsedBgBlur = parseInt(val);
          }

          setChosenBg(parsedBg);
          setBgSettings({
            speed: parsedBgSpeed,
            brightness: parsedBgBrightness,
            glow: parsedBgGlow,
            density: parsedBgDensity,
            waveHeight: parsedBgWaveHeight,
            theme: parsedBgTheme,
            blur: parsedBgBlur,
          });
          setCoverText(parsedCoverText);
          setGithubUrl(parsedGithub);
          setInstagramUrl(parsedInstagram);
          setLinkedinUrl(parsedLinkedin);
          setFacebookUrl(parsedFacebook);
          setEditRole(parsedRole);
          setEditCountry(parsedCountry);
          setVerifiedIcon(parsedVerifiedIcon);
          setVerifiedColor(parsedVerifiedColor);
          setVerifiedShow(parsedVerifiedShow);
        }
      } catch (err) {
        console.error("Error fetching profile", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, [profileId]);

  const handleSaveProfile = async () => {
    if (editCustomId.trim()) {
      const cleanCustomId = editCustomId.trim().toLowerCase().replace(/^@/, "");
      if (!/^[a-zA-Z0-9_]+$/.test(cleanCustomId)) {
        alert(
          isAr
            ? "عذراً، يجب أن يحتوي المعرّف المخصص على أحرف وأرقام إنجليزية وشرطة سفلية (_) فقط."
            : "Custom ID must contain only alphanumeric characters and underscores (_).",
        );
        return;
      }

      // Check if taken
      try {
        const { data: existingUser } = await supabase.from('users').select('uid').eq('custom_id', cleanCustomId).maybeSingle();
        if (existingUser && existingUser.uid !== profileId) {
          alert(
            isAr
              ? "معرّف الحساب المخصص مأخوذ بالفعل من قِبل مستخدم آخر!"
              : "This Custom ID is already taken by another user!",
          );
          setCustomIdSuggestions([`${cleanCustomId}_1`, `${cleanCustomId}2026`, `${cleanCustomId}_pro`]);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    setIsSaving(true);
    try {
      const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
      if (currentAuthUser) {
        try {
          const safePhotoURL =
            editPhotoURL && editPhotoURL.length <= 2_000_000 // Supabase stores this in user_metadata (jsonb), no hard 2048-char limit like Firebase, but still cap absurdly large payloads
              ? editPhotoURL
              : (currentAuthUser.user_metadata?.avatar_url as string) || "";

          const { error: authError } = await supabase.auth.updateUser({
            data: { name: editName, avatar_url: safePhotoURL || null },
          });
          if (authError) throw authError;
        } catch (authError) {
          console.warn(
            "Could not update Supabase Auth profile attributes (photo URL too long or invalid), but continuing with DB save:",
            authError,
          );
          try {
            await supabase.auth.updateUser({ data: { name: editName } });
          } catch (displayNameError) {
            console.error(
              "Failed to update displayName on auth user:",
              displayNameError,
            );
          }
        }
      }

      // Serialize background, custom cover slogan, custom social urls and verification badge customization back into location field
      const serializedLocation = `||bg:${chosenBg}||coverText:${coverText.trim()}||github:${githubUrl.trim()}||instagram:${instagramUrl.trim()}||linkedin:${linkedinUrl.trim()}||facebook:${facebookUrl.trim()}||role:${editRole.trim()}||country:${editCountry.trim()}||verifiedIcon:${verifiedIcon}||verifiedColor:${encodeURIComponent(verifiedColor)}||verifiedShow:${verifiedShow}||bgSpeed:${bgSettings.speed}||bgBrightness:${bgSettings.brightness}||bgGlow:${bgSettings.glow}||bgDensity:${bgSettings.density}||bgWaveHeight:${bgSettings.waveHeight}||bgTheme:${bgSettings.theme}||bgBlur:${bgSettings.blur}`;

      await saveUserProfile(
        profileId,
        editName,
        editPhotoURL || undefined,
        currentUserEmail || undefined,
        editBio || undefined,
        serializedLocation,
        badgeSymbol,
        badgeColor,
        editCustomId || undefined,
      );

      onUpdateName(editName);
      if (onUpdatePhoto) {
        onUpdatePhoto(editPhotoURL);
      }
      if (onUpdateCustomId) {
        onUpdateCustomId(editCustomId);
      }
      setIsEditing(false);

      setProfileData((prev) =>
        prev
          ? ({
              ...prev,
              name: editName,
              bio: editBio,
              photoURL: editPhotoURL,
              badgeSymbol,
              badgeColor,
              customId: editCustomId,
              location: serializedLocation,
            } as any)
          : null,
      );
      alert(
        isAr
          ? "تم حفظ ملفك الشخصي ومعرّفك المخصص بنجاح!"
          : "Profile and Custom ID saved successfully!",
      );
    } catch (e) {
      console.error(e);
      alert(
        isAr
          ? "حدث خطأ أثناء حفظ التعديلات."
          : "Error saving profile modifications.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRedeemPromo = async () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      alert(
        isAr
          ? "يرجى كتابة كود الخصم أولاً."
          : "Please enter a promocode first.",
      );
      return;
    }

    setIsRedeemingPromo(true);
    try {
      // 1. Dynamic Check Coupon
      let discountPercent = 0;
      let couponValid = false;
      let couponObj: any = null;

      if (code === "QUIZ50" || code === "SUPER50" || code === "GEMINI55") {
        discountPercent = 50;
        couponValid = true;
      } else if (code === "FREE100" || code === "ADMAN100") {
        discountPercent = 100;
        couponValid = true;
      } else {
        const couponData = await getCouponByCode(code);
        if (couponData) {
          couponObj = couponData;
          const isActive = couponObj.is_active !== undefined ? couponObj.is_active : couponObj.isActive;
          if (isActive) {
            // validate expiration
            const expiryDate = couponObj.expiry_date || couponObj.expiryDate;
            if (expiryDate) {
              const expDate = new Date(expiryDate);
              const now = new Date();
              if (expDate < now) {
                alert(
                  isAr
                    ? "عذراً، كود الخصم هذا منتهي الصلاحية."
                    : "Sorry, this promocode has expired.",
                );
                setIsRedeemingPromo(false);
                return;
              }
            }
            // validate maxUses
            const maxUses = couponObj.max_uses || couponObj.maxUses;
            const usedCount = couponObj.used_count || couponObj.usedCount;
            if (
              maxUses &&
              usedCount !== undefined &&
              usedCount >= maxUses
            ) {
              alert(
                isAr
                  ? "عذراً، استنفد هذا الكود الحد الأقصى للاستخدام."
                  : "Sorry, this coupon has reached its maximum uses.",
              );
              setIsRedeemingPromo(false);
              return;
            }
            discountPercent = couponObj.discount_percent || couponObj.discountPercent;
            couponValid = true;
          }
        }
      }

      if (!couponValid) {
        alert(
          isAr
            ? "عذراً، كود الخصم هذا غير صالح أو انتهت صلاحيته."
            : "Invalid or expired discount code.",
        );
        setIsRedeemingPromo(false);
        return;
      }

      // 2. If discount is 100%, trigger instant automatic activation!
      if (discountPercent === 100) {
        const requestId =
          "req-auto-" + Math.random().toString(36).substring(2, 11);
        
        const { error: userErr } = await supabase.from('users').update({
          is_premium: true,
          plan_name: 'Diamond'
        }).eq('uid', currentUserId);

        const { error: reqErr } = await supabase.from('premium_requests').insert({
          id: requestId,
          user_id: currentUserId,
          user_name: profileData?.name || currentUserName || "User",
          user_email: currentUserEmail || "",
          plan: "diamond",
          amount: 0,
          payment_method: "VIP_PROMO_CODE",
          promo_code: code,
          receipt_url: "vip-auto-approved",
          status: "approved",
          created_at: new Date().toISOString()
        });

        if (!userErr && !reqErr) {
          alert(
            isAr
              ? `تهانينا! 🎉 تم تطبيق الخصم الحصري بنسبة 100% بنجاح وتفعيل الباقة الذهبية لحسابك مباشرة دون الحاجة لمراجعة المشرف!`
              : `Congratulations! 🎉 100% discount applied. Educator Gold active directly without admin review!`,
          );
          // Notify parent of updated status immediately
          onPremiumStatusChange(true, "Educator Gold (300 EGP)");
          // Reload profile statistics
          const stats = await getUserProfileStats(profileId);
          setProfileData(stats);
          setPromoCodeInput("");
        } else {
          alert(
            isAr
              ? "عذراً، حدث خطأ أثناء تفعيل الحساب التلقائي."
              : "Error performing automatic upgrade.",
          );
        }
      } else {
        // Less than 100%, notify how they can use it on billing tab
        alert(
          isAr
            ? `كود الخصم المكتوب صالح ويوفر لك خصم %${discountPercent}. يرجى استخدامه عند الترقية والدفع من تبويب "باقات الاشتراك" لتطبيق الخفض على السعر.`
            : `This code is valid and provides a ${discountPercent}% discount! Please apply it in the "Subscription Plans" tab upon checkout.`,
        );
      }
    } catch (err) {
      console.error(err);
      alert(
        isAr ? "حدث خطأ أثناء فحص الكود." : "Error validating discount code.",
      );
    } finally {
      setIsRedeemingPromo(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <CosmicLoader message={isAr ? "جاري تحميل الملف الشخصي..." : "Loading profile..."} />
      </div>
    );
  }

  const displayBio =
    profileData?.bio ||
    (isAr
      ? "معلم ومهتم بتقنيات التعليم الحديثة ونشر المعرفة."
      : "Educator & EdTech enthusiast spreading knowledge.");
  const displayPhotoURL = profileData?.photoURL || authUser?.photoURL;
  const role = editRole || (isAr ? "طالب" : "Student");
  const country = editCountry || (isAr ? "مصر" : "Egypt");
  const joinDate = new Date(
    profileData?.joinedDate || new Date(),
  ).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
  });
  const isPremium = profileData?.planName && profileData.planName !== "Free";
  const planName = profileData?.planName || "Free";

  // 100% Genuine Dynamic Statistics Calculation
  const completionsCount = profileData?.completions?.length || 0;
  const quizzesCreatedCount = profileData?.createdQuizzes?.length || 0;

  // Gamification & Badges
  const level = Math.max(1, Math.floor(completionsCount / 2) + 1);
  let spaceBadgeName = isAr ? "رائد فضاء مبتدئ" : "Space Cadet";
  let spaceBadgeIcon = "🚀";

  if (completionsCount >= 50) {
    spaceBadgeName = isAr ? "عبقري الثقب الأسود" : "Black Hole Genius";
    spaceBadgeIcon = "🌌";
  } else if (completionsCount >= 20) {
    spaceBadgeName = isAr ? "كابتن المجرة" : "Galaxy Captain";
    spaceBadgeIcon = "🛸";
  } else if (completionsCount >= 5) {
    spaceBadgeName = isAr ? "ملاح النجوم" : "Star Navigator";
    spaceBadgeIcon = "⭐";
  }

  const xpForNextLevel = 2; // Simple math for now: 2 completions per level
  const currentLevelProgress = ((completionsCount % 2) / 2) * 100;

  const totalKnowledgePoints = (profileData?.completions || []).reduce(
    (sum, c) => sum + c.score * 150,
    0,
  );
  const hasPerfectScore = (profileData?.completions || []).some(
    (c) => c.score === c.totalQuestions && c.totalQuestions > 0,
  );

  // Real-time Dynamic Live Achievements Engine (Updates when conditions are crossed)
  const achievements = [
    {
      id: "step_one",
      titleAr: "الخطوة الأولى الكونية",
      titleEn: "Cosmo First Step",
      descAr: "اتخطى الاختبار الأول وافتح بوابات المعرفة.",
      descEn: "Cross the first educational test successfully.",
      unlocked: completionsCount >= 1,
      progress: completionsCount >= 1 ? "1 / 1" : "0 / 1",
      percentage: completionsCount >= 1 ? 100 : 0,
      icon: "🎓",
      accentColor: "border-blue-500 text-blue-500 bg-blue-500/10",
    },
    {
      id: "knowledge_gatherer",
      titleAr: "جامع النقاط الكوني",
      titleEn: "Cosmo Gatherer",
      descAr: "اجمع 500 نقطة فما فوق من إتقان الاختبارات العلمية.",
      descEn: "Amass 500 Knowledge Points through quiz scores.",
      unlocked: totalKnowledgePoints >= 500,
      progress: `${Math.min(totalKnowledgePoints, 500)} / 500`,
      percentage: Math.min(Math.round((totalKnowledgePoints / 500) * 100), 100),
      icon: "⚡",
      accentColor: "border-amber-500 text-amber-500 bg-amber-500/10",
    },
    {
      id: "active_scholar",
      titleAr: "المكتشف الدائم",
      titleEn: "Persistent Scholar",
      descAr: "قم بإنهاء 5 اختبارات علمية مميزة بالكامل.",
      descEn: "Complete 5 educational quizzes completely.",
      unlocked: completionsCount >= 5,
      progress: `${Math.min(completionsCount, 5)} / 5`,
      percentage: Math.min(Math.round((completionsCount / 5) * 100), 100),
      icon: "🔥",
      accentColor: "border-orange-500 text-orange-500 bg-orange-500/10",
    },
    {
      id: "perfectionist",
      titleAr: "قناص الدقة الفائقة",
      titleEn: "Ultimate Perfectionist",
      descAr: "احصل على نتيجة كاملة بنسبة %100 في أي اختبار.",
      descEn: "Attain a flawless 100% score on any solved quiz.",
      unlocked: hasPerfectScore,
      progress: hasPerfectScore ? "1 / 1" : "0 / 1",
      percentage: hasPerfectScore ? 100 : 0,
      icon: "⭐",
      accentColor: "border-emerald-500 text-emerald-500 bg-emerald-500/10",
    },
    {
      id: "creator_architect",
      titleAr: "صانع المحتوى المبدع",
      titleEn: "Enlightened Architect",
      descAr: "انشر أول اختبار تفاعلي في المجتمع لمساعدة بقية الطلاب.",
      descEn: "Publish your first interactive study quiz.",
      unlocked: quizzesCreatedCount >= 1,
      progress: quizzesCreatedCount >= 1 ? "1 / 1" : "0 / 1",
      percentage: quizzesCreatedCount >= 1 ? 100 : 0,
      icon: "👑",
      accentColor: "border-purple-500 text-purple-500 bg-purple-500/10",
    },
    {
      id: "points_guru",
      titleAr: "حكيم المعرفة المطلق",
      titleEn: "Academic Guru",
      descAr: "احصد أكثر من 2000 نقطة كوزمو علمية مخصصة.",
      descEn: "Accumulate more than 2,000 knowledge points.",
      unlocked: totalKnowledgePoints >= 2000,
      progress: `${Math.min(totalKnowledgePoints, 2000)} / 2000`,
      percentage: Math.min(
        Math.round((totalKnowledgePoints / 2000) * 100),
        100,
      ),
      icon: "🏆",
      accentColor: "border-rose-500 text-rose-500 bg-rose-500/10",
    },
  ];

  const availableBadges = [
    { icon: "🛡️", label: isAr ? "حامي المعرفة" : "Knowledge Shield" },
    { icon: "🚀", label: isAr ? "مستكشف الفضاء" : "Cosmo Rocket" },
    { icon: "🎓", label: isAr ? "باحث أكاديمي" : "Scholar" },
    { icon: "🔥", label: isAr ? "صاحب الشغف" : "Passion Fire" },
    { icon: "🏆", label: isAr ? "البطل الكوني" : "Champion" },
    { icon: "💎", label: isAr ? "العضو النادر" : "Rare Gem" },
    { icon: "👑", label: isAr ? "الملك الكوني" : "Cosmo King" },
    { icon: "✅", label: isAr ? "توثيق قياسي" : "Standard Verified" },
    { icon: "☑️", label: isAr ? "توثيق احترافي" : "Pro Verified" },
    { icon: "✔️", label: isAr ? "توثيق أساسي" : "Basic Verified" },
    { icon: "🌟", label: isAr ? "نجم التوثيق" : "Star Verified" },
    {
      icon: "🏅",
      label: isAr ? "شارة التوثيق الماسية" : "Diamond VerifiedBadge",
    },
    { icon: "🥇", label: isAr ? "توثيق ذهبي" : "Gold Verified" },
    { icon: "⭐", label: isAr ? "توثيق مميز" : "Featured Verified" },
    { icon: "❇️", label: isAr ? "توثيق أخضر" : "Green Verified" },
  ];

  const badgeColors = [
    { value: "#3b82f6", label: isAr ? "أزرق فضائي" : "Space Blue" },
    { value: "#8b5cf6", label: isAr ? "بنفسجي السديم" : "Nebula Purple" },
    { value: "#10b981", label: isAr ? "أخضر زمردي" : "Emerald Green" },
    { value: "#f59e0b", label: isAr ? "ذهبي ناصع" : "Solar Gold" },
    { value: "#ef4444", label: isAr ? "قرمزي كوني" : "Cosmo Crimson" },
    { value: "#ec4899", label: isAr ? "وردي فضائي" : "Space Pink" },
  ];

  const displayLocation = profileData?.location || "";
  let displayVerifiedIcon = "BadgeCheck";
  let displayVerifiedColor = "#3b82f6";
  let displayVerifiedShow = profileData?.isPremium || false;

  if (displayLocation.includes("||verifiedIcon:")) {
    const iconPart = displayLocation.split("||verifiedIcon:")[1] || "";
    displayVerifiedIcon = iconPart.split("||")[0] || "BadgeCheck";
  }
  if (displayLocation.includes("||verifiedColor:")) {
    const colorPart = displayLocation.split("||verifiedColor:")[1] || "";
    const rawCol = colorPart.split("||")[0] || "#3b82f6";
    try {
      displayVerifiedColor = decodeURIComponent(rawCol);
    } catch (e) {
      displayVerifiedColor = rawCol;
    }
  }
  if (displayLocation.includes("||verifiedShow:")) {
    const showPart = displayLocation.split("||verifiedShow:")[1] || "";
    displayVerifiedShow = showPart.split("||")[0] === "true";
  } else if (profileData?.isPremium) {
    displayVerifiedShow = true;
  } else {
    // If customized icon or customized color is present, let's show it by default
    if (displayLocation.includes("||verifiedIcon:")) {
      displayVerifiedShow = true;
    }
  }

  return (
    <div
      className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12 text-slate-800 dark:text-slate-100"
      style={{ direction: isAr ? "rtl" : "ltr" }}
    >
      {/* 1. Profile Banner Header */}
      <section className="relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="h-44 md:h-56 relative rounded-t-3xl overflow-hidden">
          <GsapCoverBackground mode={chosenBg || "cosmic"} />

          {/* If premium cover text exists, display it beautifully! */}
          {isPremium && coverText && (
            <div className="absolute inset-0 flex items-center justify-center p-4 z-10 pointer-events-none">
              <div className="bg-white/15 dark:bg-black/35 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/25 dark:border-white/10 text-center max-w-lg shadow-xl animate-fade-in translate-y-2">
                <p className="text-white text-xs md:text-sm font-black tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                  {coverText}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 md:px-10 md:pb-8 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16 md:-mt-20">
            {/* Profile Picture & Badges */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 md:gap-6 text-center sm:text-right">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-white dark:border-slate-900 overflow-hidden shadow-lg bg-slate-100 dark:bg-slate-800 shrink-0 relative flex items-center justify-center">
                {displayPhotoURL ? (
                  <img
                    src={displayPhotoURL}
                    alt="Profile"
                    className="w-[100%] h-[100%] object-cover rounded-full"
                  />
                ) : (
                  <span className="text-4xl font-black text-primary uppercase">
                    {(profileData?.name || currentUserName).charAt(0)}
                  </span>
                )}
                {isPremium && (
                  <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-amber-400 border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-lg">
                    {planName.toLowerCase().includes("diamond") ? (
                      <Gem className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Crown className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                )}
              </div>

              <div
                className="mb-2 w-full text-right"
                style={{ textAlign: isAr ? "right" : "left" }}
              >
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-2xl md:text-3xl font-black font-display text-slate-900 dark:text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)] flex items-center gap-1.5">
                    {profileData?.name || currentUserName}
                    {/* Render customized/customizable verification badge */}
                    {displayVerifiedShow && (
                      <div className="flex items-center gap-0.5 shrink-0 bg-white/55 dark:bg-slate-900/55 rounded-full px-1.5 py-1 backdrop-blur-sm border border-slate-200/40 dark:border-slate-800/40">
                        <span
                          title={isAr ? "توثيق الحساب" : "Account Verified"}
                        >
                          {renderVerifiedIcon(
                            displayVerifiedIcon,
                            displayVerifiedColor,
                            "w-6 h-6",
                          )}
                        </span>

                        {/* Additional premium verification badges based on plan */}
                        {isPremium &&
                          (planName.toLowerCase().includes("pro") ||
                            planName.toLowerCase().includes("premium") ||
                            planName.toLowerCase().includes("diamond") ||
                            planName.toLowerCase().includes("founder")) && (
                            <span
                              title={isAr ? "توثيق المبدعين" : "Pro Verified"}
                            >
                              <BadgeCheck className="w-6 h-6 text-emerald-500 drop-shadow-sm" />
                            </span>
                          )}
                      </div>
                    )}
                  </h1>

                  {/* Render Custom Configured Badge */}
                  {isPremium && (
                    <span
                      className="px-2.5 py-1 text-[10px] font-black rounded-lg text-white flex items-center gap-1 hover:scale-105 transition-transform"
                      style={{
                        backgroundColor: profileData?.badgeColor || badgeColor,
                      }}
                    >
                      <span>{profileData?.badgeSymbol || badgeSymbol}</span>
                      <span>
                        {isAr ? "شارة توثيق مخصصة" : "Custom Verified"}
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1.5 justify-center sm:justify-start">
                  <span className="text-xs font-black text-primary dark:text-violet-400 font-mono">
                    @
                    {profileData?.customId ||
                      `user_${profileId.substring(0, 8)}`}
                  </span>
                  <button
                    onClick={() => {
                      const username =
                        profileData?.customId ||
                        `user_${profileId.substring(0, 8)}`;
                      navigator.clipboard.writeText(username);
                      alert(
                        isAr
                          ? "تم نسخ اسم المستخدم بنجاح!"
                          : "Username copied successfully!",
                      );
                    }}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary hover:border-primary-light transition-all cursor-pointer font-extrabold select-none hover:scale-105 active:scale-95"
                    title={isAr ? "نسخ اسم المستخدم" : "Copy Username"}
                    id="copy-username-btn"
                  >
                    <svg
                      className="w-3 h-3 text-slate-400 dark:text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span>{isAr ? "نسخ" : "Copy"}</span>
                  </button>
                </div>

                {/* Followers & Following Counters */}
                <div className="flex items-center justify-center sm:justify-start gap-4 mt-2.5 text-xs font-bold text-slate-600 dark:text-slate-350 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/40 py-1.5 px-3 rounded-xl w-fit max-w-full">
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {followersCount}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 font-medium">
                      {isAr ? "متابع" : "followers"}
                    </span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0"></div>
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {followingCount}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 font-medium">
                      {isAr ? "يتابع" : "following"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center sm:justify-end gap-3 w-full md:w-auto">
              {isOwnProfile ? (
                <>
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-full font-bold text-xs bg-primary text-white shadow hover:bg-primary/95 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        {isAr ? "حفظ التعديلات" : "Save Changes"}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-5 py-2.5 rounded-full font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        {isAr ? "إلغاء" : "Cancel"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-5 py-2.5 rounded-full font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-primary" />
                      {isAr ? "تعديل الملف الشامل" : "Comprehensive Edit"}
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={handleToggleFollow}
                  className={`px-5 py-2.5 rounded-full font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                    isFollowing
                      ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                      : "bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90"
                  }`}
                >
                  {isFollowing ? (
                    isAr ? (
                      "مُتابع"
                    ) : (
                      "Following"
                    )
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      {isAr ? "متابعة" : "Follow"}
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  const url =
                    window.location.origin + "/#/profile/" + profileId;
                  navigator.clipboard.writeText(url);
                  alert(
                    isAr
                      ? "تم نسخ رابط ملفك الشخصي بنجاح!"
                      : "Profile Link copied!",
                  );
                }}
                className="px-5 py-2.5 rounded-full font-bold text-xs bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/35 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] shadow-sm animate-pulse-subtle"
              >
                <LinkIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {isAr ? "مشاركة الحساب" : "Share Account"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Comprehensive Editing Area when triggered */}
      {isEditing && (
        <section className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-[2rem] p-6 sm:p-8 space-y-8 animate-fade-in shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-slate-800/50 pb-4">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-800 dark:text-white">
                {isAr ? "إعدادات الحساب الشاملة" : "Comprehensive Settings"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {isAr
                  ? "قم بتهيئة مظهر وتفاصيل حسابك الشخصي وسمة التطبيق"
                  : "Configure your profile details and application theme"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Input Details */}
            <div className="space-y-6">
              {/* Profile Card Styling */}
              <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/60 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">
                    {isAr ? "المعلومات الأساسية" : "Basic Info"}
                  </h4>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 block mb-1.5">
                    {isAr ? "الاسم التعريفي" : "Display Name"}
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                    placeholder={
                      isAr ? "اكتب اسمك هنا..." : "Enter your name..."
                    }
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1.5">
                    {isAr ? "النبذة الذاتية" : "Biography"}
                  </label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-primary transition-all leading-relaxed font-medium"
                    placeholder={
                      isAr
                        ? "اكتب نبذة شخصية عنك وعن اهتماماتك العلمية..."
                        : "Tell us about yourself..."
                    }
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/60 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">
                    {isAr ? "التفاصيل الإضافية" : "Additional Details"}
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1.5">
                      {isAr ? "الدور/الوظيفة" : "Role"}
                    </label>
                    <input
                      type="text"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                      placeholder={
                        isAr ? "طالب، معلم..." : "Student, Teacher..."
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1.5">
                      {isAr ? "البلد" : "Country"}
                    </label>
                    <input
                      type="text"
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                      placeholder={isAr ? "بلدك..." : "Your country..."}
                    />
                  </div>
                </div>

                {/* Upload from Device (File Input) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 block">
                    {isAr
                      ? "تحميل صورة شخصية من جهازك"
                      : "Upload Profile Picture"}
                  </label>
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      {editPhotoURL ? (
                        <img
                          src={editPhotoURL}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-slate-400">
                          ?
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex gap-2">
                        <input
                          type="file"
                          id="local-avatar-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                alert(
                                  isAr
                                    ? "عذراً، الحد الأقصى لحجم الصورة هو 2 ميغابايت."
                                    : "Sorry, the maximum file size is 2MB.",
                                );
                                return;
                              }
                              const uploadedUrl = await uploadAvatar(profileId, file);
                              if (uploadedUrl) {
                                setEditPhotoURL(uploadedUrl);
                              } else {
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  if (evt.target?.result) {
                                    setEditPhotoURL(evt.target.result as string);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }}
                        />
                        <label
                          htmlFor="local-avatar-upload"
                          className="px-3 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-[11px] font-black cursor-pointer transition-colors shadow-sm"
                        >
                          {isAr ? "اختر ملف صورة 📁" : "Choose File 📁"}
                        </label>
                        {editPhotoURL && (
                          <button
                            type="button"
                            onClick={() => setEditPhotoURL("")}
                            className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[11px] font-black transition-colors"
                          >
                            {isAr ? "إزالة" : "Remove"}
                          </button>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500">
                        {isAr
                          ? "صيغ مدعومة: JPG, PNG, WebP (الحد الأقصى: 2 ميغابايت)."
                          : "Supported: JPG, PNG, WebP (Max 2MB)."}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1.5">
                    {isAr
                      ? "أو أدخل رابط صورة شخصية"
                      : "Or enter Profile Picture URL"}
                  </label>
                  <input
                    type="text"
                    value={editPhotoURL}
                    onChange={(e) => setEditPhotoURL(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-primary font-mono text-left transition-all"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Custom User ID (Identifier used by Admin to activate plan manual) */}
              <div>
                <label className="text-xs font-black text-slate-500 block mb-1">
                  {isAr
                    ? "معرّف الحساب المخصص (الذي يفعل به الآدمن الباقات):"
                    : "Custom User ID (Used by Admin to activate plans):"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold font-mono">
                    @
                  </span>
                  <input
                    type="text"
                    value={editCustomId}
                    onChange={(e) => {
                      const val = e.target.value
                        .trim()
                        .toLowerCase()
                        .replace(/^@/, "");
                      setEditCustomId(val);
                      handleCheckCustomId(val);
                    }}
                    className={`w-full bg-white dark:bg-slate-950 border rounded-xl p-2.5 pl-6 text-xs outline-none focus:ring-2 focus:ring-primary font-mono ${
                      customIdError
                        ? "border-red-500 ring-red-200"
                        : "border-slate-200 dark:border-slate-850"
                    }`}
                    placeholder="e.g. ahmed_teacher"
                  />
                </div>
                {isVerifyingCustomId && (
                  <p className="text-[10px] text-primary/85 mt-1 animate-pulse">
                    {isAr
                      ? "جاري التحقق من التوفر..."
                      : "Verifying availability..."}
                  </p>
                )}
                {customIdError && (
                  <p className="text-[10px] text-red-500 font-bold mt-1">
                    {customIdError}
                  </p>
                )}

                {customIdSuggestions.length > 0 && (
                  <div className="mt-2 space-y-1 bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-xl">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold">
                      {isAr
                        ? "اقتراحات معرّفات متاحة:"
                        : "Suggested available IDs:"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {customIdSuggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setEditCustomId(sug);
                            setCustomIdError("");
                            setCustomIdSuggestions([]);
                          }}
                          className="px-2.5 py-1 text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary rounded-lg font-black border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        >
                          @{sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Social Links Configuration */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {isAr
                  ? "روابط شبكات التواصل و الدعم (سيتم إضافتها وتنشيطها فور كتابتها)"
                  : "Configure Support & Social Links (will only show when filled)"}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1">
                    GitHub URL
                  </label>
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-primary font-mono"
                    placeholder="github.com/username"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1">
                    Instagram URL
                  </label>
                  <input
                    type="text"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-primary font-mono"
                    placeholder="instagram.com/username"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1">
                    LinkedIn URL
                  </label>
                  <input
                    type="text"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-primary font-mono"
                    placeholder="linkedin.com/in/username"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1">
                    Facebook URL
                  </label>
                  <input
                    type="text"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-primary font-mono"
                    placeholder="facebook.com/username"
                  />
                </div>
              </div>
            </div>

            {/* GSAP Cover Background Selection */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-6">
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {isAr ? "خلفية الغلاف المتحركة" : "Animated Cover Background"}
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setChosenBg("cosmic")}
                  className={`p-4 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                    chosenBg === "cosmic" || !chosenBg
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-primary/50"
                  }`}
                >
                  <div className="text-2xl mb-2">🌌</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {isAr ? "الفضاء الكوني" : "Cosmic Space"}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setChosenBg("waves")}
                  className={`p-4 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                    chosenBg === "waves"
                      ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-indigo-500/50"
                  }`}
                >
                  <div className="text-2xl mb-2">🌊</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {isAr ? "الأمواج النيون" : "Neon Waves"}
                  </div>
                </button>
              </div>

              {/* Cover Slogan block */}
              <div className="bg-slate-900/10 dark:bg-slate-950/20 p-5 rounded-3xl border border-slate-200 dark:border-slate-850 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 text-primary animate-pulse">✨</span>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    {isAr
                      ? "عبارة الغلاف المكتوبة (Slogan) ✍️"
                      : "Cover Slogan Text ✍️"}
                  </h4>
                </div>
                <input
                  type="text"
                  value={coverText}
                  onChange={(e) => setCoverText(e.target.value)}
                  maxLength={100}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-3.5 text-xs outline-none focus:ring-2 focus:ring-primary font-bold"
                  placeholder={
                    isAr
                      ? "مثال: أهلاً بكم في صفي التعليمي الرقمي! 🚀"
                      : "e.g. Welcome to my elite digital learning space! 🚀"
                  }
                />
              </div>
            </div>
          </div>
          {/* Quick Buttons */}
          <div className="flex gap-2 justify-end border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-hover transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-primary/10"
            >
              {isSaving
                ? isAr
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isAr
                  ? "حفظ إعدادات الملف الشامل"
                  : "Save Profile Config"}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-6 py-2.5 bg-slate-200 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-300 transition-colors cursor-pointer"
            >
              {isAr ? "تراجع" : "Discard"}
            </button>
          </div>
        </section>
      )}

      {/* Main Layout Divided columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (Bio box, Stats list & Dynamic Social Links) */}
        <div className="lg:col-span-4 space-y-8">
          {/* About Me & Bio Section */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
              <span className="text-primary">•</span>
              {isAr ? "نبذة شخصية" : "About Me"}
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 font-medium">
              {displayBio}
            </p>

            <div className="space-y-4 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <div className="flex items-center gap-3 text-xs font-bold text-slate-650 dark:text-slate-300">
                <Award className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{role}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-650 dark:text-slate-300">
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{country}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-650 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  {isAr ? `انضم في ${joinDate}` : `Joined ${joinDate}`}
                </span>
              </div>
            </div>
          </section>

          {/* Dynamic Social Contact Links Section (Hidden if empty or shown individually) */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 text-center">
              {isAr
                ? "شبكة الدعم والروابط الاجتماعية"
                : "Support & Social Networks"}
            </h3>

            {/* Social icons are individual and auto-render/hide beautifully */}
            <SocialSupportLinks
              github={githubUrl}
              instagram={instagramUrl}
              linkedin={linkedinUrl}
              facebook={facebookUrl}
              isAr={isAr}
            />
          </section>

          {/* Redeem Promocode Box (Allowed only for own profile) */}
          {isOwnProfile && (
            <section className="bg-gradient-to-br from-violet-500/5 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <h3 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-4 border-b border-primary/10 pb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                {isAr ? "استرداد كود الخصم (Promo Code)" : "Redeem Promo Code"}
              </h3>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-4 leading-relaxed">
                {isAr
                  ? "إذا كان لديك كود خصم بنسبة 100%، سيتم تفعيل الباقة مباشرة في حسابك فوريّاً دون الحاجة لمراجعة المشرف!"
                  : "If you have a 100% discount code, your premium subscription will activate instantly for free."}
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-primary uppercase text-center tracking-widest placeholder-slate-400"
                  placeholder="e.g. FREE100"
                  disabled={isRedeemingPromo}
                />

                <button
                  onClick={handleRedeemPromo}
                  disabled={isRedeemingPromo}
                  className="px-4 py-2 bg-primary text-white font-extrabold text-xs rounded-xl hover:bg-primary-hover active:scale-95 transition-all cursor-pointer select-none shadow-md shadow-primary/15 disabled:opacity-50 flex items-center justify-center min-w-[70px]"
                >
                  {isRedeemingPromo ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : isAr ? (
                    "تفعيل"
                  ) : (
                    "Redeem"
                  )}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Right Column (Overview, Quizzes, Achievements Tabs) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Navigation Profile Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 p-1 gap-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                activeTab === "overview"
                  ? "bg-primary text-white shadow-md shadow-primary/10"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`}
            >
              {isAr ? "الإحصاءات والنشاط" : "Stats & Activity"}
            </button>
            <button
              onClick={() => setActiveTab("quizzes")}
              className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                activeTab === "quizzes"
                  ? "bg-primary text-white shadow-md shadow-primary/10"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`}
            >
              {isAr ? "اختباراته المميزة" : "Featured Quizzes"}
            </button>
            <button
              onClick={() => setActiveTab("achievements")}
              className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                activeTab === "achievements"
                  ? "bg-primary text-white shadow-md shadow-primary/10"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`}
            >
              {isAr ? "لوحة شارات التوثيق" : "Verification Badges"}
            </button>
          </div>

          {activeTab === "overview" && (
            <div className="space-y-8 animate-fade-in">
              {/* Space Gamification Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 md:p-8 border border-indigo-500/30 shadow-2xl overflow-hidden relative">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                  <div className="w-24 h-24 bg-slate-800/80 rounded-2xl border border-indigo-500/40 flex items-center justify-center text-5xl shadow-inner backdrop-blur-sm">
                    {spaceBadgeIcon}
                  </div>
                  <div className="flex-1 text-center md:text-start">
                    <div className="inline-block px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-xs font-bold tracking-widest uppercase mb-2">
                      {isAr ? `المستوى ${level}` : `Level ${level}`}
                    </div>
                    <h3 className="text-2xl font-black text-white mb-1 font-display">
                      {spaceBadgeName}
                    </h3>
                    <p className="text-indigo-200/70 text-sm font-medium">
                      {isAr
                        ? "أكمل المزيد من الاختبارات للوصول للمستوى التالي"
                        : "Complete more quizzes to reach the next level"}
                    </p>

                    <div className="mt-4 bg-slate-950/50 rounded-full h-3 w-full border border-white/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full relative"
                        style={{ width: `${currentLevelProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:flex flex-col items-center justify-center px-6 py-4 bg-slate-950/40 rounded-2xl border border-white/5">
                    <span className="text-3xl font-black text-white">
                      {completionsCount}
                    </span>
                    <span className="text-xs text-indigo-300/70 uppercase tracking-widest font-bold mt-1">
                      {isAr ? "الاختبارات" : "Quizzes"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm text-center">
                  <div className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {isAr ? "الاختبارات المحلولة" : "Solved Quizzes"}
                  </div>
                  <div className="text-3xl font-black text-slate-800 dark:text-white mt-1.5 font-display">
                    {completionsCount}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm text-center">
                  <div className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {isAr ? "النقاط الأكاديمية" : "Knowledge Points"}
                  </div>
                  <div className="text-3xl font-black text-primary mt-1.5 font-display">
                    {totalKnowledgePoints} XP
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm text-center">
                  <div className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {isAr ? "اختبارات منشورة" : "Quizzes Created"}
                  </div>
                  <div className="text-3xl font-black text-indigo-500 mt-1.5 font-display">
                    {quizzesCreatedCount}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <section>
                <h3 className="text-lg font-black font-display text-slate-850 dark:text-white mb-6">
                  {isAr
                    ? "النشاط التفاعلي الأخير"
                    : "Interactive Activity logs"}
                </h3>

                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                  {profileData?.completions &&
                  profileData.completions.length > 0 ? (
                    profileData.completions
                      .slice(0, 5)
                      .map((comp: any, idx: number) => (
                        <div
                          key={idx}
                          className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group select-none"
                        >
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-950 bg-primary/20 text-primary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 font-bold">
                            {idx + 1}
                          </div>
                          <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2rem)] p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/40 duration-200">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] text-primary font-black uppercase">
                                {isAr ? "درجة كاملة!" : "Solved"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {comp.createdAt
                                  ? comp.createdAt.split("T")[0]
                                  : ""}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-slate-800 dark:text-white text-xs truncate">
                              {comp.quizTitle}
                            </h4>
                            <p className="text-[10px] text-slate-500 mt-1 font-bold">
                              {isAr ? "الدرجة المحققة:" : "Achieved Score:"}{" "}
                              <strong className="text-slate-800 dark:text-white">
                                {comp.score} / {comp.totalQuestions}
                              </strong>
                            </p>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="relative flex items-center select-none">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-950 bg-slate-200 dark:bg-slate-800 text-slate-400 shrink-0 z-10">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-3.5rem)] p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm ml-3">
                        <p className="text-xs text-slate-500 font-bold">
                          {isAr
                            ? "لا يوجد حلول مسجلة على هذا الحساب حالياً."
                            : "No quizzes solved yet."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === "quizzes" && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-black font-display text-slate-800 dark:text-white mb-2">
                {isAr
                  ? "بنك الاختبارات المنشورة بواسطة هذا العضو"
                  : "Educational quizzes published by this member"}
              </h3>

              {profileData?.createdQuizzes &&
              profileData.createdQuizzes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profileData.createdQuizzes.map((quiz, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group"
                    >
                      <div>
                        <h4 className="text-sm font-black text-slate-850 dark:text-white truncate mb-1.5">
                          {quiz.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-450 line-clamp-2 min-h-[32px]">
                          {quiz.description ||
                            (isAr
                              ? "لا يوجد وصف متاح."
                              : "No description provided.")}
                        </p>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-4">
                        <div className="text-[10px] text-slate-400 font-black flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>
                            {quiz.questions?.length || 0}{" "}
                            {isAr ? "سؤال" : "Questions"}
                          </span>
                        </div>
                        <button
                          onClick={() => onStartQuiz(quiz.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[10px] font-black transition-all hover:scale-102 cursor-pointer shadow-sm shadow-primary/10"
                        >
                          {isAr ? "بدء الحل فورا" : "Solve Now"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-10 rounded-2xl text-center">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="font-bold text-sm text-slate-705 dark:text-slate-200 mb-1">
                    {isAr ? "لم ينشر أي اختبارات" : "No Public Quizzes"}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {isAr
                      ? "هذا المستخدم لم يقم بصياغة أو نشر أي اختبارات علمية مميزة حتى اللحظة."
                      : "This user has not authored or published any educational quizzes yet."}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "achievements" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-lg font-black font-display text-slate-800 dark:text-white mb-1">
                  {isAr
                    ? "لوحة شارات التوثيق المكتسبة"
                    : "Earned Verification Badges"}
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 font-bold">
                  {isAr
                    ? "هذه الشارات توثق إنجازاتك و تتحدث تلقائياً وبشكل حي."
                    : "These badges verify your achievements and update in real-time."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className={`border rounded-2xl p-4 flex gap-4 transition-all relative overflow-hidden ${
                      ach.unlocked
                        ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
                        : "bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-850/50 opacity-60"
                    }`}
                  >
                    {/* Badge Icon */}
                    <div
                      className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 text-2xl font-black ${ach.accentColor}`}
                    >
                      {ach.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-extrabold text-slate-800 dark:text-white text-xs truncate">
                          {isAr ? ach.titleAr : ach.titleEn}
                        </h4>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black shrink-0 ${
                            ach.unlocked
                              ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-450"
                              : "bg-slate-150 text-slate-400 dark:bg-slate-800"
                          }`}
                        >
                          {ach.unlocked
                            ? isAr
                              ? "مُكتسب"
                              : "Unlocked"
                            : isAr
                              ? "مُقفل"
                              : "Locked"}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1 font-bold leading-normal">
                        {isAr ? ach.descAr : ach.descEn}
                      </p>

                      {/* Achievement Real Progress Tracker */}
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between items-center text-[9px] text-slate-550 dark:text-slate-450 font-bold font-mono">
                          <span>{isAr ? "مستوى التقدم:" : "Progress:"}</span>
                          <span>{ach.progress}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all duration-500 rounded-full"
                            style={{ width: `${ach.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
