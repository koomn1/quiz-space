import React from 'react';
import { Check, ImagePlus, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { createVerificationBadge, deleteVerificationBadge, getVerificationBadges, uploadVerificationBadgeImage } from '../lib/db';
import { VerificationBadge } from './VerificationBadge';
import type { VerificationBadgeData } from './VerificationBadge';
import { showToast } from './Toast';

export default function AdminVerificationBadgesPanel({ lang, adminId }: { lang: 'ar' | 'en'; adminId?: string }) {
  const isAr = lang === 'ar';
  const [badges, setBadges] = React.useState<VerificationBadgeData[]>([]);
  const [name, setName] = React.useState('');
  const [nameAr, setNameAr] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [descriptionAr, setDescriptionAr] = React.useState('');
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imageUrl, setImageUrl] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => { void getVerificationBadges(true).then(setBadges).catch(() => setBadges([])); }, []);
  React.useEffect(load, [load]);

  const addBadge = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !nameAr.trim() || (!imageFile && !imageUrl.trim())) return;
    setBusy(true);
    try {
      const uploadedUrl = imageFile && adminId ? await uploadVerificationBadgeImage(adminId, imageFile) : null;
      const badge = await createVerificationBadge({ name, nameAr, imageUrl: uploadedUrl || imageUrl.trim(), description, descriptionAr });
      setBadges((current) => [...current, badge]);
      setName(''); setNameAr(''); setDescription(''); setDescriptionAr(''); setImageFile(null); setImageUrl('');
      showToast('success', isAr ? 'تمت إضافة علامة التوثيق.' : 'Verification badge added.');
    } catch (error: any) {
      showToast('error', error?.message || (isAr ? 'تعذر إضافة العلامة.' : 'Could not add badge.'));
    } finally { setBusy(false); }
  };

  const removeBadge = async (id: string) => {
    if (!window.confirm(isAr ? 'حذف علامة التوثيق؟' : 'Delete this verification badge?')) return;
    try { await deleteVerificationBadge(id); setBadges((current) => current.filter((badge) => badge.id !== id)); } catch (error: any) { showToast('error', error?.message || 'Delete failed'); }
  };

  return (
    <section className="space-y-6 rounded-3xl border border-sky-200/80 bg-gradient-to-br from-sky-50/80 via-white to-violet-50/60 p-5 dark:border-sky-900/50 dark:from-slate-950 dark:via-slate-950/90 dark:to-sky-950/20 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-sky-500/15 p-3 text-sky-600 dark:text-sky-300"><ShieldCheck className="h-6 w-6" /></div>
        <div><h3 className="text-lg font-black text-slate-900 dark:text-white">{isAr ? 'علامات التوثيق' : 'Verification Badges'}</h3><p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">{isAr ? 'أضف علامات PNG/GIF ليختار منها المستخدمون ما يظهر بجوار أسمائهم.' : 'Add PNG/GIF marks that users can choose to display beside their names.'}</p></div>
      </div>
      <form onSubmit={addBadge} className="grid gap-3 rounded-2xl border border-slate-200/90 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder={isAr ? 'اسم العلامة بالإنجليزية' : 'Badge name'} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} required placeholder={isAr ? 'اسم العلامة بالعربية' : 'Arabic badge name'} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isAr ? 'الوصف بالإنجليزية (اختياري)' : 'English description (optional)'} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <input value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} placeholder={isAr ? 'الوصف بالعربية (اختياري)' : 'Arabic description (optional)'} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-sky-300 bg-sky-50/70 px-3 py-2.5 text-xs font-black text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300"><ImagePlus className="h-4 w-4" /><span>{imageFile?.name || (isAr ? 'رفع صورة العلامة' : 'Upload badge image')}</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} /></label>
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder={isAr ? 'أو ضع رابط الصورة' : 'Or paste image URL'} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <button disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-black text-white transition hover:bg-sky-500 disabled:cursor-wait disabled:opacity-60 sm:col-span-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{isAr ? 'إضافة علامة التوثيق' : 'Add verification badge'}</button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge) => <article key={badge.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><VerificationBadge badge={badge} size="md" lang={lang} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-slate-900 dark:text-white">{isAr ? badge.nameAr : badge.name}</p><p className="truncate text-[10px] text-slate-500">{badge.descriptionAr || badge.description}</p></div><button type="button" onClick={() => void removeBadge(badge.id)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30" aria-label={isAr ? 'حذف العلامة' : 'Delete badge'}><Trash2 className="h-4 w-4" /></button></article>)}
      </div>
    </section>
  );
}
