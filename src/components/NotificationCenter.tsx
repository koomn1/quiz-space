import React from 'react';
import { Bell, CheckCheck, Loader2, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { pushNotificationsManager, PushNotificationPayload } from '../lib/pushNotifications';
import SwipeRow from './SwipeRow';

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

interface SwipeNotificationAction {
  id: 'dismiss' | 'mark-read';
  label: string;
  icon: React.ReactNode;
  onSelect?: () => void;
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
      const userIds = [userId];
      try {
        const authRes = await supabase.auth.getUser();
        if (authRes.data.user?.id && !userIds.includes(authRes.data.user.id)) {
          userIds.push(authRes.data.user.id);
        }
      } catch (_) {}

      let query = supabase
        .from('notifications')
        .select('id,title,body,type,is_read,created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (userIds.length === 1) {
        query = query.eq('user_id', userIds[0]);
      } else {
        query = query.in('user_id', userIds);
      }

      const { data, error: queryError } = await query;
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
      window.dispatchEvent(new CustomEvent('quizspace-notifications-updated'));
    });
    const channel = userId && !userId.startsWith('user-')
      ? supabase
        .channel(`notification-center-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          void load();
          window.dispatchEvent(new CustomEvent('quizspace-notifications-updated'));
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
    const userIds = [userId];
    try {
      const authRes = await supabase.auth.getUser();
      if (authRes.data.user?.id && !userIds.includes(authRes.data.user.id)) {
        userIds.push(authRes.data.user.id);
      }
    } catch (_) {}

    if (userIds.length === 1) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userIds[0]).eq('is_read', false);
    } else {
      await supabase.from('notifications').update({ is_read: true }).in('user_id', userIds).eq('is_read', false);
    }
    setItems((previous) => previous.map((item) => ({ ...item, is_read: true })));
    window.dispatchEvent(new CustomEvent('quizspace-notifications-updated'));
  };

  const markRead = async (item: AppNotification) => {
    if (item.id.startsWith('push-')) {
      pushNotificationsManager.markRead([item.id]);
      setItems((previous) => previous.filter((current) => current.id !== item.id));
      window.dispatchEvent(new CustomEvent('quizspace-notifications-updated'));
      return;
    }
    await supabase.from('notifications').update({ is_read: true }).eq('id', item.id);
    setItems((previous) => previous.map((current) => current.id === item.id ? { ...current, is_read: true } : current));
    window.dispatchEvent(new CustomEvent('quizspace-notifications-updated'));
  };

  const dismissNotification = async (item: AppNotification) => {
    if (item.id.startsWith('push-')) {
      pushNotificationsManager.markRead([item.id]);
      setItems((previous) => previous.filter((current) => current.id !== item.id));
      window.dispatchEvent(new CustomEvent('quizspace-notifications-updated'));
      return;
    }
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', item.id);
    if (updateError) {
      console.warn('[QuizSpace] notification dismiss failed', updateError);
    }
    setItems((previous) => previous.filter((current) => current.id !== item.id));
    window.dispatchEvent(new CustomEvent('quizspace-notifications-updated'));
  };

  const unread = items.filter((item) => !item.is_read).length;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[#007472] dark:text-[#2AC3BB]"><Bell className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-widest">{isAr ? 'مركز التنبيهات' : 'Notification center'}</span></div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-[#FCF6EE]">{isAr ? 'إشعارات الدفع' : 'Push notifications'} {unread > 0 && <span className="text-[#007472] dark:text-[#2AC3BB]">({unread})</span>}</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer transition shadow-xs" aria-label={isAr ? 'تحديث الإشعارات' : 'Refresh notifications'}><RefreshCw className="h-4 w-4" /></button>
          {unread > 0 && <button type="button" onClick={() => void markAllRead()} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#007472] hover:bg-[#005e5c] dark:bg-[#2AC3BB] dark:hover:bg-[#22aba3] px-3.5 text-xs font-black text-white dark:text-slate-950 transition cursor-pointer shadow-sm"><CheckCheck className="h-4 w-4" />{isAr ? 'قراءة الكل' : 'Mark all read'}</button>}
        </div>
      </div>
      {error && <div className="rounded-2xl border border-amber-300/50 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">{isAr ? 'تعذر تحديث الإشعارات. جرّب مرة أخرى.' : 'Notifications could not be refreshed. Try again.'}</div>}
      <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-3 shadow-xl dark:border-[#2AC3BB]/20 dark:bg-slate-950/90 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3 px-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#007472] dark:text-[#2AC3BB]">{isAr ? 'اسحب للإجراءات' : 'Swipe for actions'}</p>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{isAr ? 'اسحب الإشعار لإخفائه أو تحديده كمقروء.' : 'Swipe a notification to dismiss it or mark it as read.'}</p>
          </div>
          <ShieldCheck className="h-6 w-6 shrink-0 text-[#007472]/70 dark:text-[#2AC3BB]/70" />
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#007472] dark:text-[#2AC3BB]" /></div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-sm font-bold text-slate-500 dark:border-slate-700">{isAr ? 'لا توجد إشعارات دفع حالياً.' : 'There are no push notifications yet.'}</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const actions: SwipeNotificationAction[] = [
                { id: 'dismiss', label: isAr ? 'إخفاء' : 'Dismiss', icon: <Trash2 className="h-5 w-5" /> },
                ...(!item.is_read ? [{ id: 'mark-read' as const, label: isAr ? 'قراءة' : 'Mark read', icon: <CheckCheck className="h-5 w-5" />, onSelect: () => { void markRead(item); } }] : []),
              ];
              return (
                <SwipeRow
                  key={item.id}
                  actions={actions}
                  onCommit={(action: SwipeNotificationAction) => {
                    if (action.id === 'dismiss') void dismissNotification(item);
                  }}
                  actionColor="#be123c"
                  drawerColor="#007472"
                  height={108}
                  radius={18}
                  actionWidth={82}
                  direction={isAr ? 'right' : 'left'}
                  snapBounce={0.16}
                  resistance={0.55}
                  collapseMs={220}
                  commitAt={0.72}
                  fullSwipe
                  label={isAr ? `إشعار: ${item.title}` : `Notification: ${item.title}`}
                  toggleLabel={isAr ? 'إظهار إجراءات الإشعار' : 'Show notification actions'}
                  style={{ marginBottom: 2 }}
                >
                  <button
                    type="button"
                    onClick={() => void markRead(item)}
                    className={`flex h-full w-full items-start gap-3 rounded-2xl border p-3.5 text-start transition ${item.is_read ? 'border-slate-200 bg-white/95 opacity-80 dark:border-slate-800 dark:bg-slate-900/90' : 'border-[#2AC3BB]/40 bg-teal-50/80 dark:border-[#2AC3BB]/30 dark:bg-[#007472]/20'}`}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#007472]/15 text-[#007472] dark:bg-[#2AC3BB]/20 dark:text-[#2AC3BB]"><ShieldCheck className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <strong className="truncate text-sm font-bold text-slate-900 dark:text-white">{item.title}</strong>
                        <time className="shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">{new Date(item.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}</time>
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{item.body || item.message || (isAr ? 'إشعار جديد من QuizSpace.' : 'A new QuizSpace notification.')}</span>
                    </span>
                  </button>
                </SwipeRow>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
