import React from 'react';
import { Check, ImagePlus, Loader2, Palette, ShieldCheck } from 'lucide-react';
import { AVATAR_PRESETS, FREE_PROFILE_FRAMES, resolveFrameAsset, uniqueProfileFrames } from '../constants/profileAssets';
import { activateRewardFrame, deactivateRewardFrame, getRewardInventory, getRewardStoreItems, getUserProfileStats, saveUserProfile } from '../lib/db';
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

export default function ProfileCustomizationPage({ userId, userName, userEmail, currentPhoto, lang, onUpdatePhoto, onNavigate }: Props) {
  const isAr = lang === 'ar';
  const [photo, setPhoto] = React.useState(currentPhoto || '');
  const [activeFrame, setActiveFrame] = React.useState('');
  const [ownedFrames, setOwnedFrames] = React.useState<Frame[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [loadingFrames, setLoadingFrames] = React.useState(true);

  React.useEffect(() => setPhoto(currentPhoto || ''), [currentPhoto]);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [stats, inventory, catalog] = await Promise.all([getUserProfileStats(userId), getRewardInventory(userId), getRewardStoreItems()]);
        if (!mounted) return;
        setActiveFrame(stats?.activeFrameId || '');
        const ownedIds = new Set((inventory || []).map((item: any) => item.item_id));
        const ownedCatalog = (catalog || []).filter((item: any) => item.item_type === 'frame' && ownedIds.has(item.id));
        setOwnedFrames(uniqueProfileFrames([...FREE_PROFILE_FRAMES, ...ownedCatalog] as any) as Frame[]);
      } catch (error) {
        console.warn('[ProfileCustomization] frame catalog unavailable', error);
        if (mounted) setOwnedFrames(FREE_PROFILE_FRAMES as Frame[]);
      } finally {
        if (mounted) setLoadingFrames(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  const savePhoto = async (nextPhoto: string) => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      await saveUserProfile(userId, userName, nextPhoto || undefined, userEmail || undefined);
      setPhoto(nextPhoto);
      onUpdatePhoto?.(nextPhoto || null);
      showToast('success', isAr ? 'تم حفظ الصورة.' : 'Profile image saved.');
    } catch (error) {
      console.error('[ProfileCustomization] image save failed', error);
      showToast('error', isAr ? 'تعذر حفظ الصورة.' : 'Could not save the image.');
    } finally { setSaving(false); }
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
      showToast('success', isAr ? 'تم تفعيل الإطار.' : 'Frame activated.');
    } catch (error) {
      console.error('[ProfileCustomization] frame activation failed', error);
      showToast('error', isAr ? 'لا يمكن تفعيل هذا الإطار. تأكد أنه مملوك.' : 'This frame cannot be activated. Make sure you own it.');
    } finally { setSaving(false); }
  };

  return <section dir={isAr ? 'rtl' : 'ltr'} className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
    <header className="mb-6 rounded-[28px] border border-cyan-400/20 bg-slate-950/70 p-6 text-white shadow-xl">
      <div className="flex items-center gap-3"><Palette className="h-6 w-6 text-cyan-300" /><div><h1 className="text-2xl font-black">{isAr ? 'تخصيص الملف الشخصي' : 'Profile Customization'}</h1><p className="mt-1 text-sm text-slate-300">{isAr ? 'تحكم في صورتك وإطارك من مكان واحد.' : 'Control your photo and owned frames from one place.'}</p></div></div>
    </header>
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-[26px] border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-cyan-400/50 bg-slate-100 dark:bg-slate-900">{photo ? <img src={photo} alt={userName} className="h-full w-full object-cover" /> : <span className="text-5xl font-black text-cyan-500">{userName?.[0]?.toUpperCase() || 'U'}</span>}</div>
        <p className="mt-4 text-center text-sm font-black">{userName}</p>
        <button type="button" onClick={() => onNavigate?.('profile')} className="mt-4 min-h-11 w-full rounded-xl border border-slate-300 px-4 text-xs font-black dark:border-slate-700">{isAr ? 'فتح الملف الكامل' : 'Open full profile'}</button>
      </aside>
      <div className="space-y-5">
        <section className="rounded-[26px] border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mb-4 flex items-center gap-2"><ImagePlus className="h-5 w-5 text-cyan-500" /><h2 className="text-lg font-black">{isAr ? 'الصورة أو الأفاتار' : 'Photo or avatar'}</h2></div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{AVATAR_PRESETS.map((avatar) => <button type="button" key={avatar.id} disabled={saving} onClick={() => void savePhoto(avatar.url)} className={`aspect-square overflow-hidden rounded-2xl border-2 ${photo === avatar.url ? 'border-cyan-400' : 'border-transparent'}`}><img src={avatar.url} alt={isAr ? avatar.labelAr : avatar.label} className="h-full w-full object-cover" loading="lazy" /></button>)}</div>
        </section>
        <section className="rounded-[26px] border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-500" /><h2 className="text-lg font-black">{isAr ? 'إطاراتي المملوكة' : 'My owned frames'}</h2></div>
          {loadingFrames ? <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-emerald-500" /></div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{ownedFrames.map((frame) => <button type="button" key={frame.id} disabled={saving} onClick={() => void selectFrame(frame.id)} className={`relative aspect-square rounded-2xl border-2 bg-slate-950/5 p-2 ${activeFrame === frame.id ? 'border-emerald-400' : 'border-slate-200 dark:border-slate-800'}`}><img src={resolveFrameAsset(frame as any)} alt={isAr ? frame.name_ar || frame.name : frame.name || frame.name_ar} className="h-full w-full object-contain" />{activeFrame === frame.id && <Check className="absolute right-2 top-2 h-5 w-5 text-emerald-400" />}</button>)}</div>}
          <button type="button" disabled={saving || !activeFrame} onClick={() => void selectFrame('')} className="mt-4 min-h-10 rounded-xl border border-slate-300 px-4 text-xs font-black disabled:opacity-40 dark:border-slate-700">{isAr ? 'إزالة الإطار' : 'Remove frame'}</button>
          <p className="mt-4 text-xs text-slate-500">{isAr ? 'تظهر هنا الإطارات المجانية والإطارات التي تملكها فقط. التفعيل يتم من خلال تحقق الخادم.' : 'Only free and owned frames appear here. Activation is verified by the server.'}</p>
        </section>
      </div>
    </div>
  </section>;
}
