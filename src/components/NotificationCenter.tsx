import React from 'react';
import { Bell, CheckCheck, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { pushNotificationsManager, PushNotificationPayload } from '../lib/pushNotifications';

interface AppNotification {
  id: string;
  title: string;
  body?: string | null;
  message?: string | null;
  type?: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationCenterProps {
  userId: string;
  lang: 'ar' | 'en';
}

function fromPush(payload: PushNotificationPayload): AppNotification {
  return {
    id: payload.id,
    title: payload.title,
    body: payload.body,
    type: 'system',
    is_read: false,
    created_at: payload.timestamp instanceof Date ? payload.timestamp.toISOString() : String(payload.timestamp || new Date().toISOString()),
  };
}

export default function NotificationCenter({ userId, lang }: NotificationCenterProps) {
  const isAr = lang === 'ar';
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!userId || userId.startsWith('user-')) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const { data, error: queryError } = await supabase
        .from('notifications')
        .select('id,title,body,type,is_read,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (queryError) throw queryError;
      const databaseItems = (data || []) as AppNotification[];
      const pushItems = pushNotificationsManager.getRecent().map(fromPush);
      const databaseIds = new Set(databaseItems.map((item) => item.id));
      setItems([...pushItems.filter((item) => !databaseIds.has(item.id)), ...databaseItems]);
    } catch (loadError) {
      console.warn('[QuizSpace] notification center load failed', loadError);
      setError(true);
      setItems(pushNotificationsManager.getRecent().map(fromPush));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    void load();
    const listenerId = `notification-center-${userId}`;
    pushNotificationsManager.subscribe(listenerId, (payload) => {
      setItems((previous) => [fromPush(payload), ...previous.filter((item) => item.id !== payload.id)]);
    });
    const channel = userId && !userId.startsWith('user-')
      ? supabase
        .channel(`notification-center-${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
          setItems((previous) => [payload.new as AppNotification, ...previous.filter((item) => item.id !== payload.new.id)]);
        })
        .subscribe()
      : null;
    return () => {
      pushNotificationsManager.unsubscribe(listenerId);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [load, userId]);

  const markAllRead = async () => {
    pushNotificationsManager.markRead(items.filter((item) => item.id.startsWith('push-')).map((item) => item.id));
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    setItems((previous) => previous.map((item) => ({ ...item, is_read: true })));
  };

  const markRead = async (item: AppNotification) => {
    if (item.id.startsWith('push-')) {
      pushNotificationsManager.markRead([item.id]);
      setItems((previous) => previous.filter((current) => current.id !== item.id));
      return;
    }
    await supabase.from('notifications').update({ is_read: true }).eq('id', item.id).eq('user_id', userId);
    setItems((previous) => previous.map((current) => current.id === item.id ? { ...current, is_read: true } : current));
  };

  const unread = items.filter((item) => !item.is_read).length;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-300"><Bell className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-widest">{isAr ? 'مركز التنبيهات' : 'Notification center'}</span></div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{isAr ? 'إشعارات الدفع' : 'Push notifications'} {unread > 0 && <span className="text-violet-500">({unread})</span>}</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" aria-label={isAr ? 'تحديث الإشعارات' : 'Refresh notifications'}><RefreshCw className="h-4 w-4" /></button>
          {unread > 0 && <button type="button" onClick={() => void markAllRead()} className="flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-3 text-xs font-black text-white hover:bg-violet-500"><CheckCheck className="h-4 w-4" />{isAr ? 'قراءة الكل' : 'Mark all read'}</button>}
        </div>
      </div>
      {error && <div className="rounded-2xl border border-amber-300/50 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">{isAr ? 'تعذر تحديث الإشعارات. جرّب مرة أخرى.' : 'Notifications could not be refreshed. Try again.'}</div>}
      <div className="space-y-3">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-violet-600" /></div> : items.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-sm font-bold text-slate-500 dark:border-slate-700">{isAr ? 'لا توجد إشعارات دفع حالياً.' : 'There are no push notifications yet.'}</div> : items.map((item) => <button key={item.id} type="button" onClick={() => void markRead(item)} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-start transition hover:-translate-y-0.5 ${item.is_read ? 'border-slate-200 bg-white/60 opacity-70 dark:border-slate-800 dark:bg-slate-900/50' : 'border-violet-200 bg-violet-50/80 dark:border-violet-800/50 dark:bg-violet-950/20'}`}><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300"><ShieldCheck className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-slate-900 dark:text-white">{item.title}</strong><time className="shrink-0 text-[10px] text-slate-400">{new Date(item.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}</time></span><span className="mt-1 block text-xs leading-6 text-slate-600 dark:text-slate-300">{item.body || item.message || (isAr ? 'إشعار جديد من QuizSpace.' : 'A new QuizSpace notification.')}</span></span></button>)}
      </div>
    </section>
  );
}
