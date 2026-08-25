import * as React from 'react';
import { Coins, Eye, EyeOff, Loader2, PackageOpen, PlusCircle, Save, Sparkles } from 'lucide-react';
import { resolveFrameAsset } from '../constants/profileAssets';
import { adminSaveRewardFrame, adminSetRewardFrameVisibility, getAdminRewardStoreItems, type AdminRewardFrameInput } from '../lib/db';

type CatalogFrame = AdminRewardFrameInput & { isActive: boolean; isFeatured: boolean };
type CatalogFilter = 'all' | 'frame' | 'points_bundle' | 'cosmetic';

type CatalogItem = {
  id: string;
  item_type: 'frame' | 'points_bundle' | 'cosmetic';
  name?: string | null;
  name_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  price_points?: number | null;
  price_egp?: number | string | null;
  reward_points?: number | null;
  image_url?: string | null;
  css_class?: string | null;
  min_plan?: string | null;
  sort_order?: number | null;
  is_active?: boolean;
  is_featured?: boolean;
};

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

const typeLabel = (itemType: CatalogItem['item_type'], isAr: boolean) => {
  if (itemType === 'frame') return isAr ? 'إطار' : 'Frame';
  if (itemType === 'points_bundle') return isAr ? 'باقة / عرض' : 'Bundle / offer';
  return isAr ? 'كوزمتك' : 'Cosmetic';
};

const itemPrice = (item: CatalogItem, isAr: boolean) => {
  const egp = Number(item.price_egp) || 0;
  const points = Number(item.price_points) || 0;
  if (egp > 0) return `${egp.toLocaleString()} EGP`;
  if (points > 0) return `${points.toLocaleString()} ${isAr ? 'نقطة' : 'pts'}`;
  return isAr ? 'مجاني / ضمن العضوية' : 'Free / membership included';
};

const itemImage = (item: CatalogItem) => {
  if (item.item_type === 'frame') return resolveFrameAsset(item);
  return String(item.image_url || '').trim();
};

export default function AdminRewardCatalogPanel({ lang }: { lang: 'ar' | 'en' }) {
  const isAr = lang === 'ar';
  const [items, setItems] = React.useState<CatalogItem[]>([]);
  const [form, setForm] = React.useState<CatalogFrame>(blankFrame);
  const [filter, setFilter] = React.useState<CatalogFilter>('all');
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setItems((await getAdminRewardStoreItems()) as CatalogItem[]);
    } catch (error: any) {
      setNotice({ ok: false, text: error?.message || (isAr ? 'تعذر تحميل كتالوج المتجر.' : 'Unable to load the store catalog.') });
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  React.useEffect(() => { void load(); }, [load]);

  const update = <K extends keyof CatalogFrame>(key: K, value: CatalogFrame[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const edit = (item: CatalogItem) => {
    if (item.item_type !== 'frame') return;
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
      minPlan: (item.min_plan || 'free') as CatalogFrame['minPlan'],
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

  const toggle = async (item: CatalogItem) => {
    const next = !item.is_active;
    setBusy(item.id);
    const result = await adminSetRewardFrameVisibility(item.id, next);
    setBusy(null);
    if (!result?.success) {
      setNotice({ ok: false, text: result?.message || (isAr ? 'تعذر تغيير حالة العنصر.' : 'Unable to change item visibility.') });
      return;
    }
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_active: next } : entry));
    setNotice({ ok: true, text: next ? (isAr ? 'العنصر ظاهر الآن في المتجر.' : 'Item is now visible in the store.') : (isAr ? 'تم إخفاء العنصر من المتجر.' : 'Item hidden from the store.') });
  };

  const counts = {
    all: items.length,
    frame: items.filter((item) => item.item_type === 'frame').length,
    points_bundle: items.filter((item) => item.item_type === 'points_bundle').length,
    cosmetic: items.filter((item) => item.item_type === 'cosmetic').length,
  };
  const visibleItems = filter === 'all' ? items : items.filter((item) => item.item_type === filter);

  return (
    <section className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 dark:border-violet-900/50 dark:from-violet-950/20 dark:via-slate-900 dark:to-fuchsia-950/10">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"><Sparkles className="h-5 w-5" /></div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">{isAr ? 'كتالوج متجر المكافآت' : 'Reward store catalog'}</h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">{isAr ? 'اعرض كل ما يظهر في المتجر من إطارات وباقات وكوزمتكس. يمكنك تعديل الإطارات وتغيير ظهور أي عنصر بأمان.' : 'See every frame, bundle, and cosmetic shown in the store. Frames are editable and every item can be shown or hidden safely.'}</p>
          </div>
        </div>
        <button type="button" onClick={() => { setForm(blankFrame()); setNotice(null); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.98]"><PlusCircle className="h-4 w-4" />{isAr ? 'إطار جديد' : 'New frame'}</button>
      </div>

      {notice && <div className={`mb-4 rounded-2xl border px-4 py-3 text-xs font-bold ${notice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'}`}>{notice.text}</div>}

      <div className="mb-5 grid gap-2 sm:grid-cols-4">
        {([['all', isAr ? 'كل المتجر' : 'All items', 'from-violet-600 to-indigo-600'], ['frame', isAr ? 'الإطارات' : 'Frames', 'from-cyan-600 to-blue-600'], ['points_bundle', isAr ? 'الباقات والعروض' : 'Bundles & offers', 'from-amber-500 to-orange-600'], ['cosmetic', isAr ? 'الكوزمتكس' : 'Cosmetics', 'from-fuchsia-600 to-rose-600']] as const).map(([key, label, gradient]) => (
          <button key={key} type="button" onClick={() => setFilter(key)} className={`flex min-h-16 items-center justify-between rounded-2xl border px-4 text-start transition active:scale-[0.98] ${filter === key ? `border-transparent bg-gradient-to-r ${gradient} text-white shadow-md` : 'border-violet-100 bg-white/75 text-slate-700 hover:border-violet-300 dark:border-violet-900/40 dark:bg-slate-950/30 dark:text-slate-200'}`}>
            <span className="text-xs font-black">{label}</span><strong className="text-xl font-black">{counts[key]}</strong>
          </button>
        ))}
      </div>

      <div className="mb-5 grid gap-3 rounded-2xl border border-violet-100 bg-white/75 p-4 dark:border-violet-900/40 dark:bg-slate-950/30 md:grid-cols-2 xl:grid-cols-3">
        <div className="flex items-center gap-2 text-xs font-black text-violet-700 dark:text-violet-300 xl:col-span-3"><PackageOpen className="h-4 w-4" />{isAr ? 'تحرير إطارات الملف الشخصي' : 'Edit profile frames'}</div>
        <input value={form.id} onChange={(event) => update('id', event.target.value.toLowerCase().replace(/\s+/g, '_'))} placeholder={isAr ? 'معرّف فريد: frame_stone_royal' : 'Unique ID: frame_stone_royal'} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? <div className="col-span-full flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div> : visibleItems.length === 0 ? <div className="col-span-full rounded-2xl border border-dashed border-violet-200 p-8 text-center text-xs font-bold text-slate-500 dark:border-violet-900/50 dark:text-slate-400">{isAr ? 'لا توجد عناصر في هذا التصنيف.' : 'No items in this category.'}</div> : visibleItems.map((item) => {
          const image = itemImage(item);
          return <article key={item.id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-600 to-slate-900 p-1">
              {image ? <img src={image} alt="" loading="lazy" className="h-full w-full rounded-xl object-contain" onError={(event) => { event.currentTarget.style.opacity = '0'; }} /> : <PackageOpen className="m-auto h-7 w-7 text-white/70" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5"><span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-black text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">{typeLabel(item.item_type, isAr)}</span>{item.is_featured && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{isAr ? 'مميز' : 'Featured'}</span>}</div>
              <p className="mt-1 truncate text-xs font-black text-slate-900 dark:text-white">{isAr ? item.name_ar || item.name : item.name || item.name_ar}</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">{item.id} · {itemPrice(item, isAr)}{Number(item.reward_points) > 0 ? ` · +${Number(item.reward_points).toLocaleString()} ${isAr ? 'نقطة' : 'pts'}` : ''}</p>
              <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black ${item.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>{item.is_active ? (isAr ? 'ظاهر' : 'Visible') : (isAr ? 'مخفي' : 'Hidden')}</span>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              {item.item_type === 'frame' && <button type="button" onClick={() => edit(item)} className="min-h-9 rounded-lg bg-violet-100 px-2 text-[10px] font-black text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">{isAr ? 'تعديل' : 'Edit'}</button>}
              <button type="button" disabled={busy === item.id} onClick={() => void toggle(item)} className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg bg-slate-100 px-2 text-[10px] font-black text-slate-700 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200">{busy === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : item.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}{item.is_active ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'إظهار' : 'Show')}</button>
            </div>
          </article>;
        })}
      </div>
    </section>
  );
}
