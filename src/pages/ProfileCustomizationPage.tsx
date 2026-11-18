import React from 'react';
import { Check, ImagePlus, Palette, ShieldCheck } from 'lucide-react';
import { AVATAR_PRESETS, FREE_PROFILE_FRAMES, resolveFrameAsset } from '../constants/profileAssets';
import { activateRewardFrame, deactivateRewardFrame, saveUserProfile } from '../lib/db';
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

export default function ProfileCustomizationPage({ userId, userName, userEmail, currentPhoto, lang, onUpdatePhoto, onNavigate }: Props) {
  const isAr = lang === 'ar';
  const [photo, setPhoto] = React.useState(currentPhoto || '');
  const [activeFrame, setActiveFrame] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setPhoto(currentPhoto || ''), [currentPhoto]);

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
    if (saving) return;
    setSaving(true);
    try {
      const result = frameId ? { success: true } : await deactivateRewardFrame();
      if (frameId) await activateRewardFrame(frameId);
      if (!result?.success) throw new Error(result?.message || 'Frame activation failed');
      await saveUserProfile(userId, userName, photo || undefined, userEmail || undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, frameId || undefined);
      setActiveFrame(frameId);
      localStorage.setItem('quizspace_active_frame', frameId);
      window.dispatchEvent(new CustomEvent('quizspace-frame-updated'));
      showToast('success', isAr ? 'تم تفعيل الإطار.' : 'Frame activated.');
    } catch (error) {
      console.error('[ProfileCustomization] frame activation failed', error);
      showToast('error', isAr ? 'لا يمكن تفعيل هذا الإطار.' : 'This frame cannot be activated.');
    } finally { setSaving(false); }
  };

  return <section dir={isAr ? 'rtl' : 'ltr'} className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
    <header className="mb-6 rounded-[28px] border border-cyan-400/20 bg-slate-950/70 p-6 text-white shadow-xl">
      <div className="flex items-center gap-3"><Palette className="h-6 w-6 text-cyan-300" /><div><h1 className="text-2xl font-black">{isAr ? 'تخصيص الملف الشخصي' : 'Profile Customization'}</h1><p className="mt-1 text-sm text-slate-300">{isAr ? 'تحكم في صورتك وإطارك بدون نظام مكافآت قديم.' : 'Control your photo and frame without the legacy rewards hub.'}</p></div></div>
    </header>
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-[26px] border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-cyan-400/50 bg-slate-100 dark:bg-slate-900">
          {photo ? <img src={photo} alt={userName} className="h-full w-full object-cover" /> : <span className="text-5xl font-black text-cyan-500">{userName?.[0]?.toUpperCase() || 'U'}</span>}
        </div>
        <p className="mt-4 text-center text-sm font-black">{userName}</p>
        <button type="button" onClick={() => onNavigate?.('profile')} className="mt-4 min-h-11 w-full rounded-xl border border-slate-300 px-4 text-xs font-black dark:border-slate-700">{isAr ? 'فتح الملف الكامل' : 'Open full profile'}</button>
      </aside>
      <div className="space-y-5">
        <section className="rounded-[26px] border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mb-4 flex items-center gap-2"><ImagePlus className="h-5 w-5 text-cyan-500" /><h2 className="text-lg font-black">{isAr ? 'الصورة أو الأفاتار' : 'Photo or avatar'}</h2></div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{AVATAR_PRESETS.slice(0, 24).map((avatar) => <button type="button" key={avatar.id} onClick={() => void savePhoto(avatar.url)} className={`aspect-square overflow-hidden rounded-2xl border-2 ${photo === avatar.url ? 'border-cyan-400' : 'border-transparent'}`}><img src={avatar.url} alt={isAr ? avatar.labelAr : avatar.label} className="h-full w-full object-cover" loading="lazy" /></button>)}</div>
        </section>
        <section className="rounded-[26px] border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-500" /><h2 className="text-lg font-black">{isAr ? 'إطار الملف الشخصي' : 'Profile frame'}</h2></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{FREE_PROFILE_FRAMES.map((frame) => <button type="button" key={frame.id} onClick={() => void selectFrame(frame.id)} className={`relative aspect-square rounded-2xl border-2 bg-slate-950/5 p-2 ${activeFrame === frame.id ? 'border-emerald-400' : 'border-slate-200 dark:border-slate-800'}`}><img src={resolveFrameAsset(frame)} alt={isAr ? frame.name_ar : frame.name} className="h-full w-full object-contain" />{activeFrame === frame.id && <Check className="absolute right-2 top-2 h-5 w-5 text-emerald-400" />}</button>)}</div>
          <p className="mt-4 text-xs text-slate-500">{isAr ? 'الإطارات المجانية الحالية محفوظة، ولا يتم تفعيل إطار غير مملوك.' : 'The current free frames are preserved; unowned frames cannot be activated.'}</p>
        </section>
      </div>
    </div>
  </section>;
}
