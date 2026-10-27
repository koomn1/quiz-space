import React, { useState, useEffect, useCallback } from 'react';
import { Award, Bell, BookOpenCheck, CheckCheck, GraduationCap, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getNotificationGroup, matchesNotificationFilter, NotificationGroup } from '../lib/notificationPresentation';
import { claimDailyEngagementReward, getDailyBrainChallenge, getLearningStreakStatus, getMotivationStatus } from '../lib/db';
import { hasUsedLuckySpinToday } from '../lib/motivationData';
import { pushNotificationsManager, PushNotificationPayload } from '../lib/pushNotifications';


function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type Notification = {
  id: string;
  title: string;
  body?: string | null;
  message?: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
};

export function NotificationDropdown({ userId, lang = 'ar' }: { userId: string; lang?: 'ar' | 'en' }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dailyNotifications, setDailyNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<NotificationGroup>('all');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const isAr = lang === 'ar';

  const toAppNotification = (payload: PushNotificationPayload): Notification => ({
    id: payload.id,
    title: payload.title,
    body: payload.body,
    type: 'system',
    is_read: false,
    created_at: payload.timestamp instanceof Date
      ? payload.timestamp.toISOString()
      : String(payload.timestamp || new Date().toISOString()),
  });

  const loadNotifications = useCallback(async () => {
    if (!userId || userId.startsWith('user-')) return;
    try {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const [notificationResult, motivation, brain, streak] = await Promise.all([
        supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        getMotivationStatus().catch(() => null),
        getDailyBrainChallenge().catch(() => null),
        getLearningStreakStatus().catch(() => null),
      ]);
      if (!notificationResult.error && notificationResult.data) {
        const databaseNotifications = notificationResult.data as Notification[];
        const pushNotifications = pushNotificationsManager.getRecent().map(toAppNotification);
        const databaseIds = new Set(databaseNotifications.map((notification) => notification.id));
        setNotifications([
          ...pushNotifications.filter((notification) => !databaseIds.has(notification.id)),
          ...databaseNotifications,
        ]);
      }

      const dismissedKey = `quizspace_daily_notifications:${userId}:${today}`;
      const dismissed = new Set(parseJsonArray(localStorage.getItem(dismissedKey)));
      const daily: Notification[] = [];
      if (!hasUsedLuckySpinToday(motivation)) daily.push({ id: `daily-lucky-${today}`, title: isAr ? 'عجلة الحظ متاحة اليوم' : 'Lucky wheel is ready today', body: isAr ? 'لديك دورة مجانية اليوم. افتح العجلة وجرب حظك.' : 'Your free daily spin is ready. Open the wheel and try your luck.', type: 'daily_reward', is_read: false, created_at: new Date().toISOString() });
      if (Number(brain?.attempts_remaining ?? 1) > 0) daily.push({ id: `daily-brain-${today}`, title: isAr ? 'السؤال اليومي جاهز' : 'Daily question is ready', body: isAr ? 'أجب عن سؤال اليوم واحصل على مكافأتك.' : 'Answer today’s question and earn your reward.', type: 'daily_learning', is_read: false, created_at: new Date().toISOString() });
      if (streak && !streak.checkedInToday) daily.push({ id: `daily-streak-${today}`, title: isAr ? 'سجّل حضورك اليومي' : 'Keep your daily streak', body: isAr ? 'سجّل دخولك اليوم للحفاظ على سلسلة التعلم.' : 'Check in today to keep your learning streak alive.', type: 'daily_learning', is_read: false, created_at: new Date().toISOString() });
      const visibleDaily = daily.filter((notification) => !dismissed.has(notification.id));
      setDailyNotifications(visibleDaily);
      if (visibleDaily.length > 0) {
        void claimDailyEngagementReward('notifications_opened').catch(() => undefined);
      }
    } catch (err) {
      console.warn('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, isAr]);

  useEffect(() => {
    loadNotifications();

    if (!userId || userId.startsWith('user-')) return;

    // Realtime subscription
    const channel = supabase
      .channel(`public:notifications:user_id=eq.${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadNotifications]);

  useEffect(() => {
    const listenerId = `notification-dropdown-${userId}`;
    pushNotificationsManager.subscribe(listenerId, (payload) => {
      setNotifications((previous) => [
        toAppNotification(payload),
        ...previous.filter((notification) => notification.id !== payload.id),
      ]);
    });
    return () => pushNotificationsManager.unsubscribe(listenerId);
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dismissDailyNotifications = (ids: string[]) => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `quizspace_daily_notifications:${userId}:${today}`;
    const existing = new Set(parseJsonArray(localStorage.getItem(key)));
    ids.forEach((id) => existing.add(id));
    localStorage.setItem(key, JSON.stringify([...existing]));
    setDailyNotifications((previous) => previous.filter((notification) => !ids.includes(notification.id)));
  };

  const markAllAsRead = async () => {
    dismissDailyNotifications(dailyNotifications.map((notification) => notification.id));
    pushNotificationsManager.markRead(notifications.filter((notification) => notification.id.startsWith('push-')).map((notification) => notification.id));
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.warn('Error marking notifications as read:', err);
    }
  };

  // Daily activities are shown inside the dropdown, but they are not inbox
  // notifications. Keeping them out of this count prevents the bell badge
  // from showing a misleading number when there are no real notifications.
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const allNotifications = [...dailyNotifications, ...notifications];
  const filteredNotifications = allNotifications.filter((notification) => matchesNotificationFilter(notification.type, filter));

  const markNotificationAsRead = async (notificationId: string) => {
    const daily = dailyNotifications.find((notification) => notification.id === notificationId);
    if (daily) {
      dismissDailyNotifications([notificationId]);
      void claimDailyEngagementReward('daily_notification_action').catch(() => undefined);
      return;
    }
    if (notificationId.startsWith('push-')) {
      pushNotificationsManager.markRead([notificationId]);
      setNotifications((previous) => previous.filter((notification) => notification.id !== notificationId));
      return;
    }
    const current = notifications.find((notification) => notification.id === notificationId);
    if (!current || current.is_read) return;
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId).eq('user_id', userId);
      if (error) throw error;
      setNotifications((previous) => previous.map((notification) => notification.id === notificationId ? { ...notification, is_read: true } : notification));
    } catch (error) {
      console.warn('Error marking notification as read:', error);
    }
  };

  const getGroupIcon = (type: string) => {
    const group = getNotificationGroup(type);
    if (group === 'rewards') return <Award className="h-4 w-4 text-amber-500" />;
    if (group === 'learning') return <GraduationCap className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />;
    return <ShieldCheck className="h-4 w-4 text-primary dark:text-violet-400" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) {
            setFilter('all');
            void loadNotifications();
          }
        }}
        aria-label={isAr ? 'فتح مركز الإشعارات' : 'Open notification centre'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/70 dark:border-slate-700/60 dark:bg-slate-900/50 backdrop-blur-md p-2.5 text-slate-700 shadow-xs transition-all hover:bg-white/95 dark:hover:bg-slate-850 dark:text-slate-200 hover:border-primary/40 active:scale-95"
        title={isAr ? 'الإشعارات' : 'Notifications'}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-md animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div role="dialog" aria-label={isAr ? 'مركز الإشعارات' : 'Notification centre'} className={`uipro-glass-surface fixed inset-x-2 top-20 z-[150] max-h-[calc(100dvh-6rem)] w-auto max-w-none overflow-hidden rounded-3xl border border-white/60 dark:border-white/10 p-3 shadow-2xl backdrop-blur-2xl sm:absolute sm:inset-x-auto sm:top-full sm:mt-3 sm:max-h-[min(42rem,calc(100dvh-7rem))] sm:w-[min(22rem,calc(100vw-2rem))] sm:p-4 ${isAr ? 'sm:left-0 sm:right-auto' : 'sm:right-0 sm:left-auto'} animate-in fade-in zoom-in-95 duration-200`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {isAr ? 'الإشعارات' : 'Notifications'}
              </h3>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-xs font-bold text-primary hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary/20"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {isAr ? 'تحديد الكل مقروء' : 'Mark all read'}
              </button>
            )}
          </div>

          {dailyNotifications.length > 0 && (
            <div className="mt-3 rounded-2xl border border-violet-200/70 bg-gradient-to-br from-primary via-violet-600 to-cyan-600 p-3 text-white shadow-lg shadow-violet-500/20">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15"><Sparkles className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-100">{isAr ? 'تحديثات اليوم' : 'Today’s updates'}</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-white/90">{isAr ? 'أنشطة جديدة جاهزة لك اليوم. اختر نشاطًا وابدأ مباشرة.' : 'Fresh activities are ready for you today. Pick one and start now.'}</p>
                </div>
              </div>
            </div>
          )}
          <div className="mt-3 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label={isAr ? 'تصفية الإشعارات' : 'Filter notifications'}>
            {([
              ['all', isAr ? 'الكل' : 'All', Bell],
              ['rewards', isAr ? 'الجوائز' : 'Rewards', Award],
              ['learning', isAr ? 'التعلم' : 'Learning', BookOpenCheck],
              ['system', isAr ? 'النظام' : 'System', ShieldCheck],
            ] as const).map(([id, label, Icon]) => <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)} className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[11px] font-black transition-colors ${filter === id ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
          </div>

          <div className="mt-3 max-h-[calc(100dvh-19rem)] min-h-0 overflow-y-auto overscroll-contain space-y-2.5 pr-1 [scrollbar-width:thin] sm:max-h-80">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-xs font-bold text-slate-400">
                {isAr ? 'لا توجد إشعارات في هذا القسم حالياً.' : 'No notifications in this section yet.'}
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <button
                  type="button"
                  key={notif.id}
                  onClick={() => void markNotificationAsRead(notif.id)}
                  className={`flex flex-col gap-1 rounded-2xl p-3 text-start transition hover:-translate-y-0.5 hover:shadow-sm ${
                    notif.id.startsWith('daily-')
                      ? 'border border-violet-200 bg-gradient-to-br from-violet-50 to-cyan-50 shadow-sm dark:border-violet-800/50 dark:from-violet-950/40 dark:to-cyan-950/20'
                      : notif.is_read
                        ? 'bg-slate-50 dark:bg-slate-800/40 opacity-75'
                        : 'border border-violet-100 bg-violet-50/70 hover:border-violet-300 dark:border-violet-900/40 dark:bg-violet-950/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-xs font-black text-slate-900 dark:text-white">{getGroupIcon(notif.type)}<span className="truncate">{notif.title}</span>{notif.id.startsWith('daily-') && <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-black text-white">{isAr ? 'اليوم' : 'TODAY'}</span>}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {notif.body || notif.message || (isAr ? 'لا توجد تفاصيل إضافية.' : 'No additional details.')}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
