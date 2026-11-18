import * as React from 'react';
import { Check, Coins, Crown, Loader2, Lock, Sparkles, Store, WalletCards, X } from 'lucide-react';
import { showToast } from '../components/Toast';
import OverlayPortal from '../components/OverlayPortal';
import { profileAssetUrl, uniqueProfileFrames } from '../constants/profileAssets';
import {
  activateRewardFrame,
  createRewardPointsOrder,
  getRewardInventory,
  getRewardPaymentSettings,
  getRewardStoreItems,
  purchaseRewardItem,
} from '../lib/db';
import { getStoreBundleBenefitLabel, getStorePaymentMode, isStoreItemActionAvailable } from '../lib/storePricing';

export type StoreRewards = { points: number; coins: number; dailyStreak: number };

type StoreItem = {
  id: string;
  item_type: 'frame' | 'points_bundle' | 'cosmetic';
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price_points: number;
  price_coins?: number;
  price_egp: number;
  reward_points: number;
  reward_coins?: number;
  css_class?: string | null;
  min_plan: string;
  sort_order: number;
  image_url?: string | null;
  is_featured?: boolean;
  discount_percent?: number;
  badge_text?: string | null;
  subscriber_free?: boolean;
};

const storeImageUrl = (name: string) => `${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/images/${name}`;
const fallbackStoreImage = (item: Pick<StoreItem, 'item_type'>) => item.item_type === 'points_bundle'
  ? storeImageUrl('mystery_box.webp')
  : item.item_type === 'cosmetic'
    ? storeImageUrl('weekly_achievement.webp')
    : storeImageUrl('animated-frames/frame-aurora.gif');
function getStoreItemImage(item: Pick<StoreItem, 'id' | 'item_type' | 'image_url'>): string {
  const id = item.id.toLowerCase();
  if (item.item_type === 'frame') {
    if (id.includes('fire') || id.includes('dragon')) return storeImageUrl('animated-frames/frame-fire.gif');
    if (id.includes('diamond') || id.includes('galaxy') || id.includes('halo')) return storeImageUrl('animated-frames/frame-galaxy.gif');
    if (id.includes('royal') || id.includes('gold')) return storeImageUrl('animated-frames/frame-royal-gold.gif');
    if (id.includes('school') || id.includes('bus')) return storeImageUrl('animated-frames/frame-school-bus.gif');
    if (id.includes('neon') || id.includes('cyber') || id.includes('matrix')) return storeImageUrl('animated-frames/frame-neon-orbit.gif');
    if (id.includes('crystal')) return storeImageUrl('animated-frames/frame-crystal-luxe.gif');
    if (id.includes('star') || id.includes('crown')) return storeImageUrl('animated-frames/frame-star-crown.gif');
    if (id.includes('waves')) return profileAssetUrl('clean-assets-replacement/frame-waves-quizspace-transparent.svg');
    if (id.includes('sun')) return profileAssetUrl('clean-assets-replacement/frame-sun-quizspace-transparent.svg');
    return storeImageUrl('animated-frames/frame-aurora.gif');
  }
  if (item.image_url) return profileAssetUrl(item.image_url);
  if (item.item_type === 'points_bundle') return storeImageUrl(id.includes('diamond') ? 'pass-diamond.webp' : id.includes('gold') ? 'pass-gold.webp' : 'mystery_box.webp');
  return storeImageUrl(id.includes('brain') ? 'brain_challenge.webp' : 'weekly_achievement.webp');
}

const labels = {
  ar: { store: 'متجر النقاط', points: 'نقطة', coins: 'عملة', frames: 'إطارات الصورة', bundles: 'باقات النقاط', owned: 'مملوك', buy: 'شراء بالنقاط', diamond: 'متاح للماسي فقط', paymentTitle: 'إتمام شراء النقاط', paymentHint: 'حوّل المبلغ ثم أرسل رقم العملية أو صورة الإيصال للمراجعة.', vodafone: 'Vodafone Cash', instapay: 'InstaPay', reference: 'رقم العملية', receipt: 'صورة الإيصال', sendOrder: 'إرسال الطلب', sending: 'جاري الإرسال...', cancel: 'إلغاء', orderSent: 'تم إرسال طلبك للمراجعة. ستضاف النقاط بعد التأكيد.', purchased: 'تمت الإضافة إلى مخزونك.', notEnough: 'رصيد النقاط غير كافٍ.' },
  en: { store: 'Points Store', points: 'points', coins: 'coins', frames: 'Profile frames', bundles: 'Points bundles', owned: 'Owned', buy: 'Buy with points', diamond: 'Diamond members only', paymentTitle: 'Buy points', paymentHint: 'Transfer the amount, then send the transaction reference or receipt for review.', vodafone: 'Vodafone Cash', instapay: 'InstaPay', reference: 'Transaction reference', receipt: 'Receipt image', sendOrder: 'Send order', sending: 'Sending...', cancel: 'Cancel', orderSent: 'Your order was sent for review. Points will be added after confirmation.', purchased: 'Added to your inventory.', notEnough: 'Not enough points.' },
} as const;
function RewardPill({ rewards, lang }: { rewards: StoreRewards; lang: 'ar' | 'en' }) { const t = labels[lang]; return <div className="flex flex-wrap items-center gap-2"><div className="flex min-h-10 items-center gap-1.5 rounded-2xl border border-amber-200/80 bg-white/90 px-3 py-2 text-xs font-black text-amber-800 shadow-sm dark:border-amber-900/60 dark:bg-slate-950/45 dark:text-amber-200"><Sparkles className="h-4 w-4" /> {rewards.points.toLocaleString()} {t.points}</div>{rewards.coins > 0 && <div className="flex min-h-10 items-center gap-1.5 rounded-2xl border border-sky-200/80 bg-white/90 px-3 py-2 text-xs font-black text-sky-800 shadow-sm dark:border-sky-900/60 dark:bg-slate-950/45 dark:text-sky-200"><Coins className="h-4 w-4" /> {rewards.coins.toLocaleString()} {t.coins}</div>}</div>; }

export function IndependentStore({ userId, isPremium, planName, rewards, onRewardsChanged, lang }: { userId: string; isPremium?: boolean; planName?: string; rewards: StoreRewards; onRewardsChanged: () => void; lang: 'ar' | 'en' }) {
  const t = labels[lang];
  const [items, setItems] = React.useState<StoreItem[]>([]);
  const [inventory, setInventory] = React.useState<any[]>([]);
  const [activeFrameId, setActiveFrameId] = React.useState(() => localStorage.getItem('quizspace_active_frame') || '');
  const [settings, setSettings] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [paymentItem, setPaymentItem] = React.useState<StoreItem | null>(null);
  const [detailsItem, setDetailsItem] = React.useState<StoreItem | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<'vodafone_cash' | 'instapay'>('vodafone_cash');
  const [reference, setReference] = React.useState('');
  const [receipt, setReceipt] = React.useState('');
  const load = React.useCallback(async () => { setLoading(true); try { const [storeItems, owned, paymentSettings] = await Promise.all([getRewardStoreItems(), getRewardInventory(userId), getRewardPaymentSettings()]); setItems(storeItems as StoreItem[]); setInventory(owned); setSettings(paymentSettings); } catch (error: any) { showToast('error', error?.message || 'Store unavailable'); } finally { setLoading(false); } }, [userId]);
  React.useEffect(() => { load(); }, [load]);
  const owned = (itemId: string) => inventory.some((item) => item.item_id === itemId);
  const useFrame = async (item: StoreItem) => {
    if (busy || activeFrameId === item.id) return;
    setBusy(item.id);
    try {
      const response = await activateRewardFrame(item.id);
      if (!response?.success) throw new Error(response?.message || 'Frame activation failed');
      setActiveFrameId(item.id);
      localStorage.setItem('quizspace_active_frame', item.id);
      window.dispatchEvent(new CustomEvent('quizspace-frame-updated'));
      showToast('success', lang === 'ar' ? 'تم تفعيل الإطار على ملفك الشخصي.' : 'Frame activated on your profile.');
    } catch (error: any) {
      showToast('error', error?.message || (lang === 'ar' ? 'تعذر تفعيل الإطار.' : 'The frame could not be activated.'));
    } finally {
      setBusy(null);
    }
  };
  const buyFrame = async (item: StoreItem) => {
    if (busy) return;
    const subscriberFree = Boolean(item.subscriber_free && isPremium);
    const priceCoins = item.price_coins || 0;
    if (subscriberFree) {
      // The server is authoritative; subscribers do not need a points balance.
    } else if (priceCoins > 0) {
      if (priceCoins > rewards.coins) { showToast('error', lang === 'ar' ? 'رصيد العملات غير كافٍ.' : 'Not enough coins.'); return; }
    } else if (item.price_points > rewards.points) {
      showToast('error', t.notEnough); return;
    }
    setBusy(item.id);
    const response = await purchaseRewardItem(item.id);
    setBusy(null);
    if (response?.success) {
      showToast('success', t.purchased);
      if (item.item_type === 'frame') {
        const activation = await activateRewardFrame(item.id);
        if (activation?.success) {
          setActiveFrameId(item.id);
          localStorage.setItem('quizspace_active_frame', item.id);
          window.dispatchEvent(new CustomEvent('quizspace-frame-updated'));
        }
      } else if (item.id.startsWith('pass_')) {
        showToast('success', lang === 'ar' ? 'تم تفعيل العضوية الجديدة بنجاح! يرجى تحديث الصفحة.' : 'Membership activated successfully! Please refresh.');
      }
      await load();
      onRewardsChanged();
    } else if (response?.already_owned) showToast('info', t.owned);
    else showToast('error', response?.message || 'Purchase failed');
  };
  const sendOrder = async () => { if (!paymentItem || busy) return; setBusy(paymentItem.id); const response = await createRewardPointsOrder(paymentItem.id, paymentMethod, reference, receipt); setBusy(null); if (response?.success) { setPaymentItem(null); setReference(''); setReceipt(''); showToast('success', t.orderSent); } else showToast('error', response?.message || 'Could not create order'); };
  const handleStoreAction = async (item: StoreItem) => {
    const payment = getStorePaymentMode(item);
    if (item.item_type === 'points_bundle') {
      if (payment.mode === 'cash') setPaymentItem(item);
      else showToast('info', lang === 'ar' ? 'هذا العرض يحتاج طلب شراء نقدي من خلال المتجر.' : 'This bundle requires a cash purchase order from the store.');
      return;
    }
    if (payment.mode === 'cash') {
      showToast('info', lang === 'ar' ? 'الدفع النقدي لهذا النوع سيتم توفيره قريباً.' : 'Cash checkout for this item is coming soon.');
      return;
    }
    await buyFrame(item);
  };
  const uploadReceipt = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => setReceipt(String(reader.result || '')); reader.readAsDataURL(file); };
  const offers = items.filter((item: any) => item.is_featured);
  const frames = uniqueProfileFrames(items.filter((item) => item.item_type === 'frame' && !item.is_featured));
  const bundles = items.filter((item) => item.item_type === 'points_bundle' && !item.is_featured);
  const cosmetics = items.filter((item) => item.item_type === 'cosmetic' && !item.is_featured);
  const planRank = (planName || '').toLowerCase().includes('diamond') || (planName || '').includes('الماس') ? 4 : (isPremium ? 2 : 1);
  const rankFor = (plan: string) => plan === 'diamond' ? 4 : plan === 'gold' ? 3 : plan === 'silver' ? 2 : 1;
  const renderCard = (item: StoreItem) => {
    const locked = planRank < rankFor(item.min_plan);
    const isOwned = owned(item.id);
    const payment = getStorePaymentMode(item);
    const subscriberFree = Boolean(item.subscriber_free && isPremium);
    const isActionAvailable = isStoreItemActionAvailable({ isOwned, isLocked: locked, paymentMode: payment.mode });
    const itemImageUrl = getStoreItemImage(item);

    return (
      <div key={item.id} data-testid="store-item-card" className="group flex flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/85 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-violet-300 hover:shadow-[0_20px_42px_rgba(124,58,237,0.14)] dark:border-white/10 dark:bg-slate-900/70 dark:hover:border-violet-500/40">
        <div className={`relative mb-4 flex h-32 items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br ${item.css_class === 'frame-fire' ? 'from-orange-500 to-rose-600' : item.css_class === 'frame-crystal-luxe' ? 'from-cyan-400 to-indigo-600' : item.css_class === 'frame-star-crown' ? 'from-amber-400 to-yellow-600' : item.css_class === 'frame-diamond-comet' || item.css_class === 'frame-diamond-crown' ? 'from-sky-400 to-violet-700' : 'from-violet-500 to-fuchsia-600'} shadow-inner`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.42),transparent_35%)] opacity-80 transition duration-500 group-hover:scale-125" />
          <div className="relative z-10 h-16 w-16 rounded-full border-4 border-white/90 bg-slate-900/35 shadow-[0_0_0_5px_rgba(255,255,255,.22)] flex items-center justify-center overflow-hidden">
            <Sparkles className="absolute h-6 w-6 text-white/50" />
            {itemImageUrl && (
              <img src={itemImageUrl} alt="" onError={(event) => {
                const image = event.currentTarget;
                if (image.dataset.fallbackApplied === 'true') return;
                image.dataset.fallbackApplied = 'true';
                image.src = fallbackStoreImage(item);
              }} className="absolute inset-0 h-full w-full object-cover scale-110" />
            )}
          </div>
          {locked && <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/55 text-white"><Lock className="h-6 w-6" /></div>}
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] font-black tracking-tight text-slate-950 dark:text-white">{lang === 'ar' ? item.name_ar : item.name}</h3>
          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{lang === 'ar' ? item.description_ar : item.description}</p>
        </div>
        <button type="button" onClick={() => setDetailsItem(item)} className="mt-4 inline-flex min-h-9 items-center justify-center rounded-xl border border-violet-200/80 bg-violet-50/70 px-3 text-[10px] font-black text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50">
          {lang === 'ar' ? 'عرض المميزات والتفاصيل' : 'View features & details'}
        </button>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200/80 pt-4 dark:border-white/10">
          <span className="text-xs font-black">
            {locked ? (
              <span className="text-amber-600 dark:text-amber-400">{t.diamond}</span>
            ) : isOwned ? (
              <span className="text-emerald-600 dark:text-emerald-400">{t.owned}</span>
            ) : subscriberFree ? (
              <span className="text-emerald-600 dark:text-emerald-400">{lang === 'ar' ? 'مجاني للمشتركين' : 'Free for subscribers'}</span>
            ) : payment.mode === 'coins' ? (
              <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                <Coins className="h-3 w-3" />
                {payment.amount.toLocaleString()}
              </span>
            ) : payment.mode === 'points' ? (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Sparkles className="h-3 w-3" />
                {payment.amount.toLocaleString()}
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'غير متاح' : 'Unavailable'}</span>
            )}
          </span>
          <button type="button" disabled={!isActionAvailable || busy === item.id} onClick={() => isOwned ? useFrame(item) : buyFrame(item)} className="min-h-10 rounded-xl bg-violet-700 px-3.5 py-2 text-[11px] font-black text-white shadow-sm shadow-violet-700/20 transition hover:-translate-y-0.5 hover:bg-violet-800 dark:bg-violet-500 dark:hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45">
            {busy === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isOwned ? (activeFrameId === item.id ? (lang === 'ar' ? 'مفعل' : 'Active') : (lang === 'ar' ? 'استخدام' : 'Use')) : subscriberFree ? (lang === 'ar' ? 'احصل عليه مجانًا' : 'Get free') : payment.mode === 'cash' ? (lang === 'ar' ? 'شراء بالمال' : 'Buy') : payment.mode === 'unavailable' ? (lang === 'ar' ? 'غير متاح' : 'Unavailable') : t.buy}
          </button>
        </div>
      </div>
    );
  };
  return <div className="space-y-8">
    <div className="relative flex flex-col gap-5 overflow-hidden rounded-[28px] border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-[0_14px_38px_rgba(245,158,11,0.10)] dark:border-amber-900/50 dark:from-amber-950/35 dark:via-slate-900 dark:to-orange-950/20 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="absolute -end-8 -top-12 h-32 w-32 rounded-full bg-amber-400/15 blur-3xl" /><div className="relative"><div className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-white"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600"><Store className="h-5 w-5" /></span>{t.store}</div><p className="mt-2 max-w-xl text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'اجمع النقاط من الألعاب ثم استبدلها بإطاراتك المفضلة.' : 'Collect points from games and exchange them for your favorite frames.'}</p></div><div className="relative"><RewardPill rewards={rewards} lang={lang} /></div></div>
    {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-violet-600" /></div> : <div className="space-y-10">
      {offers.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-rose-500" />
            {lang === 'ar' ? ' عروض وتخفيضات حصرية' : ' Exclusive Flash Offers'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((item: any) => {
              const offerImage = getStoreItemImage(item);
              return <div key={item.id} data-testid="store-item-card" className="relative flex flex-col rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-5 shadow-md dark:border-rose-900/50 dark:from-rose-950/30 dark:via-slate-900 dark:to-amber-950/20">
                {offerImage && <div className="relative mb-4 flex h-28 items-center justify-center overflow-hidden rounded-2xl bg-white/70 p-3 dark:bg-slate-950/30"><Sparkles className="absolute h-8 w-8 text-rose-300" /><img src={offerImage} alt="" loading="lazy" className="relative h-full w-full object-contain" onError={(event) => { event.currentTarget.style.opacity = '0'; }} /></div>}
                {item.badge_text && (
                  <span className="absolute top-4 start-4 rounded-full bg-rose-600 px-3 py-1 text-[10px] font-black text-white shadow-sm">
                    {item.badge_text}
                  </span>
                )}
                <div className="mt-4 flex-1">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">{lang === 'ar' ? item.name_ar : item.name}</h3>
                  <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{lang === 'ar' ? item.description_ar : item.description}</p>
                </div>
                <div className="mt-6 flex items-center justify-between gap-2 border-t border-rose-100 pt-4 dark:border-rose-900/30">
                  <div>
                    {item.price_egp > 0 ? (
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400">{item.price_egp} EGP</span>
                    ) : (
                      <span className="text-xs font-black text-amber-600 dark:text-amber-300">{item.price_points.toLocaleString()} {t.points}</span>
                    )}
                  </div>
                  <button type="button" onClick={() => void handleStoreAction(item)} className="rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-4 py-2 text-xs font-black text-white shadow-md transition hover:opacity-90 active:scale-[0.98]">
                    {item.price_egp > 0 ? (lang === 'ar' ? 'اطلب العرض' : 'Claim Offer') : t.buy}
                  </button>
                </div>
              </div>;
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <Crown className="h-5 w-5 text-amber-500" />
          {t.frames}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frames.map(renderCard)}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <WalletCards className="h-5 w-5 text-emerald-500" />
          {t.bundles}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bundles.map((item) => {
            const payment = getStorePaymentMode(item);
            const isPurchasable = payment.mode === 'cash';
            const bundleImage = getStoreItemImage(item);
            const paymentLabel = payment.mode === 'cash'
              ? `${payment.amount.toLocaleString()} EGP · ${lang === 'ar' ? 'اطلب الآن' : 'Order now'}`
              : payment.mode === 'coins'
                ? `${payment.amount.toLocaleString()} ${t.coins} · ${t.buy}`
                : payment.mode === 'points'
                  ? `${payment.amount.toLocaleString()} ${t.points} · ${t.buy}`
                  : (lang === 'ar' ? 'غير متاح' : 'Unavailable');
            return <div key={item.id} data-testid="store-item-card" className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900/50 dark:bg-slate-900">
              <div className="relative flex h-20 items-center justify-center overflow-hidden rounded-2xl bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"><Sparkles className="absolute h-6 w-6 opacity-70" />{bundleImage && <img src={bundleImage} alt="" loading="lazy" className="relative h-full w-full object-contain" onError={(event) => { event.currentTarget.style.opacity = '0'; }} />}</div>
              <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white">{lang === 'ar' ? item.name_ar : item.name}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{getStoreBundleBenefitLabel(item, lang)}</p>
              <button type="button" disabled={!isPurchasable || busy === item.id} onClick={() => void handleStoreAction(item)} className="mt-5 w-full rounded-2xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45">
                {paymentLabel}
              </button>
            </div>;
          })}
        </div>
      </section>

      {cosmetics.length > 0 && <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white"><Sparkles className="h-5 w-5 text-fuchsia-500" />{lang === 'ar' ? 'الكوزمتكس والإضافات' : 'Cosmetics & extras'}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cosmetics.map((item) => {
          const payment = getStorePaymentMode(item);
          const itemImage = getStoreItemImage(item);
          const locked = planRank < rankFor(item.min_plan);
          const isOwned = owned(item.id);
          const usable = !locked && (payment.mode === 'points' || payment.mode === 'coins' || isOwned);
          return <article key={item.id} data-testid="store-item-card" className="flex min-h-48 flex-col rounded-3xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-rose-50 p-5 shadow-sm dark:border-fuchsia-900/50 dark:from-fuchsia-950/20 dark:via-slate-900 dark:to-rose-950/20">
            <div className="flex items-start gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/80 p-2 shadow-sm dark:bg-slate-950/40">{itemImage ? <img src={itemImage} alt="" loading="lazy" className="h-full w-full object-contain" onError={(event) => { event.currentTarget.style.opacity = '0'; }} /> : <Sparkles className="h-7 w-7 text-fuchsia-500" />}</div><div className="min-w-0 flex-1"><h3 className="text-base font-black text-slate-900 dark:text-white">{lang === 'ar' ? item.name_ar : item.name}</h3><p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{lang === 'ar' ? item.description_ar : item.description}</p></div></div>
            <div className="mt-auto flex items-center justify-between gap-3 pt-5"><span className="text-xs font-black text-fuchsia-700 dark:text-fuchsia-300">{locked ? t.diamond : isOwned ? t.owned : payment.mode === 'coins' ? `${payment.amount.toLocaleString()} ${t.coins}` : payment.mode === 'points' ? `${payment.amount.toLocaleString()} ${t.points}` : (lang === 'ar' ? 'غير متاح' : 'Unavailable')}</span><button type="button" disabled={!usable || busy === item.id} onClick={() => void handleStoreAction(item)} className="rounded-xl bg-fuchsia-600 px-4 py-2 text-xs font-black text-white transition hover:bg-fuchsia-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45">{busy === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isOwned ? (lang === 'ar' ? 'مملوك' : 'Owned') : (lang === 'ar' ? 'شراء' : 'Buy')}</button></div>
          </article>;
        })}</div>
      </section>}
    </div>}
    {detailsItem && <OverlayPortal><div className="fixed inset-0 z-[115] flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/65 p-4 backdrop-blur-md" onClick={() => setDetailsItem(null)}><div className="my-auto w-full max-w-xl overflow-hidden rounded-[30px] border border-white/20 bg-white shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}><div className="relative h-44 overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-600"><div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,.38),transparent_34%)]" /><button type="button" onClick={() => setDetailsItem(null)} className="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950/25 text-white backdrop-blur transition hover:bg-slate-950/45" aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}><X className="h-5 w-5" /></button><div className="absolute inset-0 flex items-center justify-center"><div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] border-4 border-white/80 bg-slate-950/25 shadow-[0_0_0_8px_rgba(255,255,255,.14)]"><img src={getStoreItemImage(detailsItem)} alt="" className="h-full w-full object-contain" /></div></div></div><div className="p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">{detailsItem.item_type === 'frame' ? (lang === 'ar' ? 'إطار ملف شخصي' : 'Profile frame') : detailsItem.item_type === 'points_bundle' ? (lang === 'ar' ? 'باقة نقاط' : 'Points bundle') : (lang === 'ar' ? 'إضافة مميزة' : 'Premium extra')}</p><h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{lang === 'ar' ? detailsItem.name_ar : detailsItem.name}</h3><p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{lang === 'ar' ? detailsItem.description_ar : detailsItem.description}</p></div><span className="shrink-0 rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-black text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">{detailsItem.min_plan === 'diamond' ? t.diamond : detailsItem.is_featured ? (lang === 'ar' ? 'مميز' : 'Featured') : (lang === 'ar' ? 'متاح الآن' : 'Available')}</span></div><div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3"><div className="rounded-2xl border border-violet-200/80 bg-violet-50/70 p-3 dark:border-violet-900/50 dark:bg-violet-950/25"><p className="text-[10px] font-bold text-violet-600 dark:text-violet-300">{lang === 'ar' ? 'المظهر' : 'Experience'}</p><p className="mt-1 text-xs font-black text-slate-800 dark:text-white">{detailsItem.item_type === 'frame' ? (lang === 'ar' ? 'يظهر على ملفك' : 'Shown on your profile') : (lang === 'ar' ? 'مكافأة فورية' : 'Instant reward')}</p></div><div className="rounded-2xl border border-sky-200/80 bg-sky-50/70 p-3 dark:border-sky-900/50 dark:bg-sky-950/25"><p className="text-[10px] font-bold text-sky-600 dark:text-sky-300">{lang === 'ar' ? 'السعر' : 'Price'}</p><p className="mt-1 text-xs font-black text-slate-800 dark:text-white">{getStorePaymentMode(detailsItem).mode === 'cash' ? `${getStorePaymentMode(detailsItem).amount.toLocaleString()} EGP` : `${getStorePaymentMode(detailsItem).amount.toLocaleString()} ${getStorePaymentMode(detailsItem).mode === 'coins' ? t.coins : t.points}`}</p></div><div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/25"><p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-300">{lang === 'ar' ? 'الحالة' : 'Status'}</p><p className="mt-1 text-xs font-black text-slate-800 dark:text-white">{owned(detailsItem.id) ? t.owned : (lang === 'ar' ? 'غير مملوك' : 'Not owned')}</p></div></div><div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/45"><p className="mb-2 text-xs font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'مميزات العنصر' : 'Item benefits'}</p><ul className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:grid-cols-2"><li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{lang === 'ar' ? 'تصميم مميز داخل ملفك' : 'Distinctive profile styling'}</li><li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{lang === 'ar' ? 'يُضاف إلى مخزونك فوراً' : 'Added to your inventory'}</li><li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{lang === 'ar' ? 'تجربة آمنة وسهلة' : 'Simple and secure experience'}</li><li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{lang === 'ar' ? 'يمكن استخدامه لاحقاً' : 'Reusable whenever you want'}</li></ul></div><button type="button" disabled={busy === detailsItem.id} onClick={() => void handleStoreAction(detailsItem)} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5 disabled:opacity-60">{busy === detailsItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}{owned(detailsItem.id) ? (lang === 'ar' ? 'استخدام العنصر' : 'Use item') : (lang === 'ar' ? 'شراء الآن' : 'Buy now')}</button></div></div></div></OverlayPortal>}
    {paymentItem && <OverlayPortal><div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setPaymentItem(null)}><div className="my-auto max-h-[min(720px,90dvh)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-black text-slate-900 dark:text-white">{t.paymentTitle}</h3><p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{t.paymentHint}</p></div><button type="button" onClick={() => setPaymentItem(null)}><X className="h-5 w-5 text-slate-500" /></button></div><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setPaymentMethod('vodafone_cash')} className={`rounded-2xl border px-3 py-3 text-xs font-black ${paymentMethod === 'vodafone_cash' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}>{t.vodafone}<span className="mt-1 block text-[10px] font-bold">{settings?.vodafone_number || '—'}</span></button><button type="button" onClick={() => setPaymentMethod('instapay')} className={`rounded-2xl border px-3 py-3 text-xs font-black ${paymentMethod === 'instapay' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}>{t.instapay}<span className="mt-1 block text-[10px] font-bold">{settings?.instapay_handle || '—'}</span></button></div><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder={t.reference} className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /><label className="mt-3 block cursor-pointer rounded-2xl border border-dashed border-slate-300 p-4 text-center text-xs font-bold text-slate-500 dark:border-slate-700">{receipt ? t.receipt + ' ' : t.receipt}<input type="file" accept="image/*" className="hidden" onChange={(event) => uploadReceipt(event.target.files?.[0])} /></label><button type="button" onClick={sendOrder} disabled={busy === paymentItem.id} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60">{busy === paymentItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <WalletCards className="h-4 w-4" />}{busy === paymentItem.id ? t.sending : t.sendOrder}</button><button type="button" onClick={() => setPaymentItem(null)} className="mt-2 w-full rounded-2xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">{t.cancel}</button></div></div></OverlayPortal>}
  </div>;
}
