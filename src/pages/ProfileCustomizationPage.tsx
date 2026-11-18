import React from 'react';
import { Check, ImagePlus, LayoutTemplate, Loader2, Palette, ShieldCheck, ShoppingBag, Sparkles, User, X } from 'lucide-react';
import { AVATAR_PRESETS, FREE_PROFILE_FRAMES, PREMIUM_QUIZ_CARD_FRAMES, resolveFrameAsset, uniqueProfileFrames, type QuizCardFrameOption } from '../constants/profileAssets';
import {
  activateRewardFrame,
  activateRewardQuizFrame,
  deactivateRewardFrame,
  deactivateRewardQuizFrame,
  getRewardInventory,
  getRewardStoreItems,
  getUserProfileStats,
  saveUserProfile,
} from '../lib/db';
import { showToast } from '../components/Toast';

interface Props {
  userId: string;
  userName: string;
  userEmail?: string | null;
  currentPhoto?: string | null;
  lang: 'ar' | 'en';
  onUpdatePhoto?: (photo: string | null) => void;
  onNavigate?: (tab: string) => void;
}

type Frame = { id: string; name?: string; name_ar?: string; image_url?: string; imageUrl?: string };

export default function ProfileCustomizationPage({
  userId,
  userName,
  userEmail,
  currentPhoto,
  lang,
  onUpdatePhoto,
  onNavigate,
}: Props) {
  const isAr = lang === 'ar';
  const [photo, setPhoto] = React.useState(currentPhoto || '');
  const [activeFrame, setActiveFrame] = React.useState('');
  const [activeQuizFrame, setActiveQuizFrame] = React.useState('');
  const [ownedFrames, setOwnedFrames] = React.useState<Frame[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [loadingFrames, setLoadingFrames] = React.useState(true);
  const [avatarCategory, setAvatarCategory] = React.useState<'all' | 'vector' | 'presets'>('all');

  React.useEffect(() => {
    setPhoto(currentPhoto || '');
  }, [currentPhoto]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [stats, inventory, catalog] = await Promise.all([
          getUserProfileStats(userId),
          getRewardInventory(userId),
          getRewardStoreItems(),
        ]);
        if (!mounted) return;
        setActiveFrame(stats?.activeFrameId || '');
        setActiveQuizFrame((stats as any)?.activeQuizFrameId || '');
        const ownedIds = new Set((inventory || []).map((item: any) => item.item_id));
        const ownedCatalog = (catalog || []).filter(
          (item: any) => item.item_type === 'frame' && ownedIds.has(item.id)
        );
        setOwnedFrames(uniqueProfileFrames([...FREE_PROFILE_FRAMES, ...ownedCatalog] as any) as Frame[]);
      } catch (error) {
        console.warn('[ProfileCustomization] frame catalog unavailable', error);
        if (mounted) setOwnedFrames(FREE_PROFILE_FRAMES as Frame[]);
      } finally {
        if (mounted) setLoadingFrames(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const savePhoto = async (nextPhoto: string) => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      await saveUserProfile(userId, userName, nextPhoto || undefined, userEmail || undefined);
      setPhoto(nextPhoto);
      onUpdatePhoto?.(nextPhoto || null);
      showToast('success', isAr ? 'تم حفظ الأفاتار بنجاح.' : 'Profile avatar saved.');
    } catch (error) {
      console.error('[ProfileCustomization] image save failed', error);
      showToast('error', isAr ? 'تعذر حفظ الأفاتار.' : 'Could not save avatar.');
    } finally {
      setSaving(false);
    }
  };

  const selectFrame = async (frameId: string) => {
    if (saving || frameId === activeFrame) return;
    setSaving(true);
    try {
      const result = frameId ? await activateRewardFrame(frameId) : await deactivateRewardFrame();
      if (!result?.success) throw new Error(result?.message || 'Frame activation failed');
      setActiveFrame(frameId);
      localStorage.setItem('quizspace_active_frame', frameId);
      window.dispatchEvent(new CustomEvent('quizspace-frame-updated'));
      showToast('success', frameId ? (isAr ? 'تم تفعيل إطار الملف الشخصي.' : 'Profile frame activated.') : (isAr ? 'تمت إزالة الإطار.' : 'Frame removed.'));
    } catch (error) {
      console.error('[ProfileCustomization] frame activation failed', error);
      showToast('error', isAr ? 'لا يمكن تفعيل هذا الإطار. تأكد أنه مملوك.' : 'This frame cannot be activated. Make sure you own it.');
    } finally {
      setSaving(false);
    }
  };

  const selectQuizFrame = async (frameId: string) => {
    if (saving || frameId === activeQuizFrame) return;
    setSaving(true);
    try {
      const result = frameId ? await activateRewardQuizFrame(frameId) : await deactivateRewardQuizFrame();
      if (!result?.success) throw new Error(result?.message || 'Quiz frame activation failed');
      setActiveQuizFrame(frameId);
      showToast('success', frameId ? (isAr ? 'تم تفعيل إطار بطاقات الاختبار.' : 'Quiz-card frame activated.') : (isAr ? 'تمت إزالة إطار الاختبار.' : 'Quiz frame removed.'));
    } catch (error) {
      console.error('[ProfileCustomization] quiz frame activation failed', error);
      showToast('error', isAr ? 'تعذر تفعيل إطار الاختبار. قد يتطلب عضوية مميزة.' : 'Could not activate quiz frame. Premium membership may be required.');
    } finally {
      setSaving(false);
    }
  };

  const activeFrameObj = ownedFrames.find((f) => f.id === activeFrame);
  const activeQuizFrameObj = PREMIUM_QUIZ_CARD_FRAMES.find((f) => f.id === activeQuizFrame);

  const displayedAvatars = React.useMemo(() => {
    if (avatarCategory === 'vector') return AVATAR_PRESETS.filter((a) => a.id.startsWith('svg-'));
    if (avatarCategory === 'presets') return AVATAR_PRESETS.filter((a) => !a.id.startsWith('svg-'));
    return AVATAR_PRESETS;
  }, [avatarCategory]);

  return (
    <section dir={isAr ? 'rtl' : 'ltr'} className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      {/* Header */}
      <header className="mb-6 rounded-[28px] border border-[#2AC3BB]/25 bg-gradient-to-r from-[#031717] via-[#007472] to-[#0a2f2e] p-6 text-[#FCF6EE] shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2AC3BB]/20 text-[#2AC3BB]">
              <Palette className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#FCF6EE]">{isAr ? 'تخصيص الملف الشخصي' : 'Profile Customization'}</h1>
              <p className="mt-1 text-sm text-[#FCF6EE]/80">
                {isAr ? 'اختر صورتك وإطار حسابك وإطار بطاقات الاختبار من مكان واحد.' : 'Manage your photo, profile frame, and quiz-card style in one place.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('store')}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#EE8361] px-5 py-2.5 text-xs font-black text-[#FCF6EE] shadow-md shadow-[#EE8361]/25 transition hover:brightness-110 active:scale-98"
          >
            <ShoppingBag className="h-4 w-4" />
            {isAr ? 'زيارة المتجر' : 'Visit Store'}
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left Sidebar: Live Preview */}
        <aside className="space-y-4">
          <div className="rounded-[26px] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-400">
              {isAr ? 'المعاينة المباشرة' : 'Live Preview'}
            </h3>
            {/* Circular Avatar + Frame Overlay */}
            <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
              <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 shadow-inner dark:border-slate-800 dark:bg-slate-900">
                {photo ? (
                  <img src={photo} alt={userName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-cyan-500/10 text-4xl font-black text-cyan-500">
                    {userName?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              {/* Frame overlay */}
              {activeFrameObj && activeFrameObj.image_url && (
                <img
                  src={resolveFrameAsset(activeFrameObj as any)}
                  alt="Active frame"
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain scale-125"
                />
              )}
            </div>

            <p className="mt-4 text-center text-base font-black text-slate-900 dark:text-white">{userName}</p>
            <div className="mt-1 flex justify-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-0.5 text-[11px] font-bold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                {activeFrameObj ? (isAr ? activeFrameObj.name_ar || activeFrameObj.name : activeFrameObj.name || activeFrameObj.name_ar) : (isAr ? 'بدون إطار' : 'No frame')}
              </span>
            </div>

            {/* Quiz Card Preview */}
            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800/80">
              <h4 className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
                {isAr ? 'معاينة بطاقة الاختبار' : 'Quiz-card preview'}
              </h4>
              <div
                className={`rounded-2xl border p-3 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 transition-all ${
                  activeQuizFrameObj ? `${activeQuizFrameObj.previewClass} border-cyan-400/60 shadow-md` : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-200">{isAr ? 'نموذج اختبار تجريبي' : 'Sample Quiz Title'}</span>
                  <span className="text-[10px] text-slate-400">10 {isAr ? 'أسئلة' : 'Q'}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {activeQuizFrameObj ? (isAr ? activeQuizFrameObj.nameAr : activeQuizFrameObj.name) : (isAr ? 'إطار عادي' : 'Default frame')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate?.('profile')}
              className="mt-5 min-h-11 w-full rounded-xl border border-slate-300 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              {isAr ? 'فتح الملف الكامل' : 'Open full profile'}
            </button>
          </div>
        </aside>

        {/* Right Area: 3 Dedicated Sections */}
        <div className="space-y-6">
          {/* Section 1: Avatar */}
          <section className="rounded-[26px] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ImagePlus className="h-5 w-5 text-cyan-500" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white">{isAr ? 'الأفاتار الشخصي' : 'Profile Avatar'}</h2>
              </div>
              {/* Category Filter */}
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setAvatarCategory('all')}
                  className={`rounded-lg px-2.5 py-1 transition ${avatarCategory === 'all' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500'}`}
                >
                  {isAr ? 'الكل' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarCategory('vector')}
                  className={`rounded-lg px-2.5 py-1 transition ${avatarCategory === 'vector' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500'}`}
                >
                  {isAr ? 'فيكتور SVG' : 'Vector SVG'}
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarCategory('presets')}
                  className={`rounded-lg px-2.5 py-1 transition ${avatarCategory === 'presets' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500'}`}
                >
                  {isAr ? 'الطلاب' : 'Presets'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 md:grid-cols-8">
              {displayedAvatars.map((avatar) => {
                const isSelected = photo === avatar.url;
                return (
                  <button
                    type="button"
                    key={avatar.id}
                    disabled={saving}
                    onClick={() => void savePhoto(avatar.url)}
                    className={`group relative aspect-square overflow-hidden rounded-2xl border-2 transition-all hover:scale-105 active:scale-95 motion-reduce:transform-none ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-500/10 shadow-md ring-2 ring-cyan-400/30'
                        : 'border-slate-200 bg-slate-50 hover:border-cyan-300 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt={isAr ? avatar.labelAr : avatar.label}
                      className="h-full w-full object-cover p-1"
                      loading="lazy"
                    />
                    {isSelected && (
                      <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-white">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 2: Profile Frame */}
          <section className="rounded-[26px] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white">{isAr ? 'إطار الملف الشخصي' : 'Profile Frame'}</h2>
              </div>
              {activeFrame && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void selectFrame('')}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                >
                  <X className="h-3.5 w-3.5" />
                  {isAr ? 'إزالة الإطار' : 'Remove frame'}
                </button>
              )}
            </div>

            {loadingFrames ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
              </div>
            ) : ownedFrames.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {isAr ? 'لا توجد إطارات متاحة حالياً.' : 'No frames available yet.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {ownedFrames.map((frame) => {
                  const isSelected = activeFrame === frame.id;
                  const frameName = isAr ? frame.name_ar || frame.name : frame.name || frame.name_ar;
                  return (
                    <button
                      type="button"
                      key={frame.id}
                      disabled={saving}
                      onClick={() => void selectFrame(frame.id)}
                      className={`relative flex flex-col items-center rounded-2xl border-2 p-3 transition-all hover:scale-[1.02] active:scale-95 motion-reduce:transform-none ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-2 ring-emerald-400/30'
                          : 'border-slate-200 bg-slate-50 hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      <div className="relative aspect-square w-full p-2">
                        <img
                          src={resolveFrameAsset(frame as any)}
                          alt={frameName || 'Frame'}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                        {isSelected && (
                          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <span className="mt-1 line-clamp-1 text-center text-xs font-black text-slate-700 dark:text-slate-200">
                        {frameName}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              {isAr ? 'تظهر هنا الإطارات المجانية والمملوكة فقط. التفعيل محمي ويتم التحقق منه من الخادم مباشرة.' : 'Only free and owned frames appear here. Activation is verified directly by the server.'}
            </p>
          </section>

          {/* Section 3: Quiz Card Frame */}
          <section className="rounded-[26px] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-[#007472] dark:text-[#2AC3BB]" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white">{isAr ? 'إطار بطاقات الاختبار' : 'Quiz-card Frame'}</h2>
              </div>
              {activeQuizFrame && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void selectQuizFrame('')}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                >
                  <X className="h-3.5 w-3.5" />
                  {isAr ? 'إزالة إطار الاختبار' : 'Remove quiz frame'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {PREMIUM_QUIZ_CARD_FRAMES.map((qFrame) => {
                const isSelected = activeQuizFrame === qFrame.id;
                const name = isAr ? qFrame.nameAr : qFrame.name;
                return (
                  <button
                    type="button"
                    key={qFrame.id}
                    disabled={saving}
                    onClick={() => void selectQuizFrame(qFrame.id)}
                    className={`relative flex flex-col items-center rounded-2xl border-2 p-3 transition-all hover:scale-[1.02] active:scale-95 motion-reduce:transform-none ${
                      isSelected
                        ? 'border-[#007472] dark:border-[#2AC3BB] bg-[#007472]/10 dark:bg-[#2AC3BB]/10 shadow-md ring-2 ring-[#2AC3BB]/30'
                        : 'border-slate-200 bg-slate-50 hover:border-[#007472]/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-[#2AC3BB]/40'
                    }`}
                  >
                    <div className={`aspect-video w-full rounded-xl border p-2 flex items-center justify-center text-[10px] font-bold ${qFrame.previewClass}`}>
                      {name}
                    </div>
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#007472] text-white shadow-sm">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </span>
                    )}
                    <span className="mt-2 line-clamp-1 text-center text-xs font-black text-slate-700 dark:text-slate-200">
                      {name}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              {isAr ? 'إطارات بطاقات الاختبارات تميز مظهر اختباراتك في التصفح والملف الشخصي وتخضع للتحقق من جهة الخادم.' : 'Quiz-card frames distinguish your quizzes in discovery and profiles, subject to server verification.'}
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
