import React from 'react';
import { Eye, EyeOff, Loader2, PlusCircle, Save, Sparkles } from 'lucide-react';
import { adminSaveRewardFrame, adminSetRewardFrameVisibility, getAdminRewardStoreItems, type AdminRewardFrameInput } from '../lib/db';

type CatalogFrame = AdminRewardFrameInput & { isActive: boolean; isFeatured: boolean };

const blankFrame = (): CatalogFrame => ({
  id: '',
  name: '',
  nameAr: '',
  description: '',
  descriptionAr: '',
  pricePoints: 750,
  priceEgp: 0,
  imageUrl: '',
  cssClass: '',
  minPlan: 'free',
  sortOrder: 100,
  isFeatured: false,
  isActive: false,
});

export default function AdminRewardCatalogPanel({ lang }: { lang: 'ar' | 'en' }) {
  const isAr = lang === 'ar';
  const [items, setItems] = React.useState<any[]>([]);
  const [form, setForm] = React.useState<CatalogFrame>(blankFrame);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getAdminRewardStoreItems());
    } catch (error: any) {
      setNotice({ ok: false, text: error?.message || (isAr ? 'تعذر تحميل كتالوج الإطارات.' : 'Unable to load the frame catalog.') });
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  React.useEffect(() => { void load(); }, [load]);

  const update = <K extends keyof CatalogFrame>(key: K, value: CatalogFrame[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const edit = (item: any) => {
    setForm({
      id: item.id || '',
      name: item.name || '',
      nameAr: item.name_ar || '',
      description: item.description || '',
      descriptionAr: item.description_ar || '',
      pricePoints: Number(item.price_points || 0),
      priceEgp: Number(item.price_egp || 0),
      imageUrl: item.image_url || '',
      cssClass: item.css_class || '',
      minPlan: item.min_plan || 'free',
      sortOrder: Number(item.sort_order || 0),
      isFeatured: Boolean(item.is_featured),
      isActive: Boolean(item.is_active),
    });
    setNotice(null);
  };

  const save = async () => {
    if (!form.id || !form.name || !form.nameAr || !form.imageUrl) {
      setNotice({ ok: false, text: isAr ? 'أدخل المعرّف والاسم العربي والإنجليزي ورابط صورة الإطار.' : 'Enter the ID, Arabic and English names, and a frame image URL.' });
      return;
    }
    setBusy('save');
    const result = await adminSaveRewardFrame(form);
    setBusy(null);
    if (!result?.success) {
      setNotice({ ok: false, text: result?.message || (isAr ? 'تعذر حفظ الإطار.' : 'Unable to save the frame.') });
      return;
    }
    setNotice({ ok: true, text: isAr ? 'تم حفظ الإطار وتحديث حالته في المتجر.' : 'Frame saved and storefront visibility updated.' });
    await load();
  };

  const toggle = async (item: any) => {
    const next = !item.is_active;
    setBusy(item.id);
    const result = await adminSetRewardFrameVisibility(item.id, next);
    setBusy(null);
    if (!result?.success) {
      setNotice({ ok: false, text: result?.message || (isAr ? 'تعذر تغيير حالة الإطار.' : 'Unable to change frame visibility.') });
      return;
    }
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_active: next } : entry));
    setNotice({ ok: true, text: next ? (isAr ? 'الإطار ظاهر الآن في المتجر.' : 'Frame is now visible in the store.') : (isAr ? 'تم إخفاء الإطار من المتجر.' : 'Frame hidden from the store.') });
  };

  return (
    <section className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 dark:border-violet-900/50 dark:from-violet-950/20 dark:via-slate-900 dark:to-fuchsia-950/10">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"><Sparkles className="h-5 w-5" /></div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">{isAr ? 'كتالوج إطارات الملف الشخصي' : 'Profile frame catalog'}</h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">{isAr ? 'أضف إطاراً جديداً أو حرّره، ثم قرر متى يظهر في المتجر. العناصر المخفية لا تظهر للمستخدمين ولا يمكن شراؤها.' : 'Create or edit frames, then decide when they appear in the store. Hidden frames cannot be seen or purchased by members.'}</p>
          </div>
        </div>
        <button type="button" onClick={() => { setForm(blankFrame()); setNotice(null); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-violet-700"><PlusCircle className="h-4 w-4" />{isAr ? 'إطار جديد' : 'New frame'}</button>
      </div>

      {notice && <div className={`mb-4 rounded-2xl border px-4 py-3 text-xs font-bold ${notice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'}`}>{notice.text}</div>}

      <div className="grid gap-3 rounded-2xl border border-violet-100 bg-white/75 p-4 dark:border-violet-900/40 dark:bg-slate-950/30 md:grid-cols-2 xl:grid-cols-3">
        <input value={form.id} onChange={(event) => update('id', event.target.value.toLowerCase().replace(/\s+/g, '_'))} placeholder={isAr ? 'معرّف فريد: frame_midnight_orbit' : 'Unique ID: frame_midnight_orbit'} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        <input value={form.nameAr} onChange={(event) => update('nameAr', event.target.value)} placeholder={isAr ? 'اسم الإطار بالعربية' : 'Arabic frame name'} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        <input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder={isAr ? 'اسم الإطار بالإنجليزية' : 'English frame name'} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        <input value={form.imageUrl} onChange={(event) => update('imageUrl', event.target.value)} placeholder={isAr ? 'رابط صورة الإطار الشفافة' : 'Transparent frame image URL'} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white xl:col-span-2" />
        <input type="number" min={0} value={form.pricePoints} onChange={(event) => update('pricePoints', Number(event.target.value))} placeholder={isAr ? 'سعر النقاط' : 'Point price'} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        <input type="number" min={0} step="0.01" value={form.priceEgp} onChange={(event) => update('priceEgp', Number(event.target.value))} placeholder="EGP" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        <select value={form.minPlan} onChange={(event) => update('minPlan', event.target.value as CatalogFrame['minPlan'])} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="free">Free</option><option value="silver">Silver</option><option value="gold">Gold</option><option value="diamond">Diamond</option></select>
        <input type="number" min={0} value={form.sortOrder} onChange={(event) => update('sortOrder', Number(event.target.value))} placeholder={isAr ? 'ترتيب العرض' : 'Display order'} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        <input value={form.cssClass || ''} onChange={(event) => update('cssClass', event.target.value)} placeholder={isAr ? 'CSS class اختياري' : 'Optional CSS class'} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        <input value={form.descriptionAr || ''} onChange={(event) => update('descriptionAr', event.target.value)} placeholder={isAr ? 'وصف عربي قصير' : 'Arabic short description'} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white xl:col-span-2" />
        <input value={form.description || ''} onChange={(event) => update('description', event.target.value)} placeholder={isAr ? 'وصف إنجليزي قصير' : 'English short description'} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><input type="checkbox" checked={form.isFeatured} onChange={(event) => update('isFeatured', event.target.checked)} />{isAr ? 'عرض مميز' : 'Featured offer'}</label>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><input type="checkbox" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} />{isAr ? 'ظاهر في المتجر' : 'Visible in store'}</label>
        <button type="button" disabled={busy === 'save'} onClick={() => void save()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">{busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isAr ? 'حفظ الإطار' : 'Save frame'}</button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? <div className="col-span-full flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div> : items.map((item) => (
          <article key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 p-1"><img src={item.image_url || ''} alt="" className="h-full w-full rounded-full object-cover" onError={(event) => { event.currentTarget.style.opacity = '0'; }} /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-slate-900 dark:text-white">{isAr ? item.name_ar : item.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{item.id} · {Number(item.price_points || 0).toLocaleString()} {isAr ? 'نقطة' : 'pts'}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black ${item.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>{item.is_active ? (isAr ? 'ظاهر' : 'Visible') : (isAr ? 'مخفي' : 'Hidden')}</span></div>
            <div className="flex flex-col gap-1"><button type="button" onClick={() => edit(item)} className="min-h-9 rounded-lg bg-violet-100 px-2 text-[10px] font-black text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">{isAr ? 'تعديل' : 'Edit'}</button><button type="button" disabled={busy === item.id} onClick={() => void toggle(item)} className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg bg-slate-100 px-2 text-[10px] font-black text-slate-700 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200">{busy === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : item.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}{item.is_active ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'إظهار' : 'Show')}</button></div>
          </article>
        ))}
      </div>
    </section>
  );
}
