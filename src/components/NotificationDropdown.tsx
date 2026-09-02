import React, { useState, useEffect, useCallback } from 'react';
import { Award, Bell, BookOpenCheck, CheckCheck, GraduationCap, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getNotificationGroup, matchesNotificationFilter, NotificationGroup } from '../lib/notificationPresentation';
import { getDailyBrainChallenge, getLearningStreakStatus, getMotivationStatus } from '../lib/db';
import { hasUsedLuckySpinToday } from '../lib/motivationData';

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
      if (!notificationResult.error && notificationResult.data) setNotifications(notificationResult.data);

      const dismissedKey = `quizspace_daily_notifications:${userId}:${today}`;
      const dismissed = new Set(JSON.parse(localStorage.getItem(dismissedKey) || '[]') as string[]);
      const daily: Notification[] = [];
      if (!hasUsedLuckySpinToday(motivation)) daily.push({ id: `daily-lucky-${today}`, title: isAr ? 'عجلة الحظ متاحة اليوم' : 'Lucky wheel is ready today', body: isAr ? 'لديك دورة مجانية اليوم. افتح العجلة وجرب حظك.' : 'Your free daily spin is ready. Open the wheel and try your luck.', type: 'daily_reward', is_read: false, created_at: new Date().toISOString() });
      if (Number(brain?.attempts_remaining ?? 1) > 0) daily.push({ id: `daily-brain-${today}`, title: isAr ? 'السؤال اليومي جاهز' : 'Daily question is ready', body: isAr ? 'أجب عن سؤال اليوم واحصل على مكافأتك.' : 'Answer today’s question and earn your reward.', type: 'daily_learning', is_read: false, created_at: new Date().toISOString() });
      if (streak && !streak.checkedInToday) daily.push({ id: `daily-streak-${today}`, title: isAr ? 'سجّل حضورك اليومي' : 'Keep your daily streak', body: isAr ? 'سجّل دخولك اليوم للحفاظ على سلسلة التعلم.' : 'Check in today to keep your learning streak alive.', type: 'daily_learning', is_read: false, created_at: new Date().toISOString() });
      setDailyNotifications(daily.filter((notification) => !dismissed.has(notification.id)));
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
    const existing = new Set(JSON.parse(localStorage.getItem(key) || '[]') as string[]);
    ids.forEach((id) => existing.add(id));
    localStorage.setItem(key, JSON.stringify([...existing]));
    setDailyNotifications((previous) => previous.filter((notification) => !ids.includes(notification.id)));
  };

  const markAllAsRead = async () => {
    dismissDailyNotifications(dailyNotifications.map((notification) => notification.id));
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

  const unreadCount = notifications.filter((n) => !n.is_read).length + dailyNotifications.length;
  const allNotifications = [...dailyNotifications, ...notifications];
  const filteredNotifications = allNotifications.filter((notification) => matchesNotificationFilter(notification.type, filter));

  const markNotificationAsRead = async (notificationId: string) => {
    const daily = dailyNotifications.find((notification) => notification.id === notificationId);
    if (daily) {
      dismissDailyNotifications([notificationId]);
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
    return <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        aria-label={isAr ? 'فتح مركز الإشعارات' : 'Open notification centre'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 p-2.5 text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
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
        <div role="dialog" aria-label={isAr ? 'مركز الإشعارات' : 'Notification centre'} className={`absolute ${isAr ? 'left-0 sm:left-auto sm:right-0' : 'right-0 sm:right-auto sm:left-0'} mt-3 w-[min(24rem,calc(100vw-1.5rem))] rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 z-[150] animate-in fade-in zoom-in-95 duration-200`}>
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
                className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-xs font-bold text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/30"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {isAr ? 'تحديد الكل مقروء' : 'Mark all read'}
              </button>
            )}
          </div>

          <div className="mt-3 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label={isAr ? 'تصفية الإشعارات' : 'Filter notifications'}>
            {([
              ['all', isAr ? 'الكل' : 'All', Bell],
              ['rewards', isAr ? 'الجوائز' : 'Rewards', Award],
              ['learning', isAr ? 'التعلم' : 'Learning', BookOpenCheck],
              ['system', isAr ? 'النظام' : 'System', ShieldCheck],
            ] as const).map(([id, label, Icon]) => <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)} className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[11px] font-black transition-colors ${filter === id ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
          </div>

          <div className="mt-3 max-h-80 overflow-y-auto space-y-2.5 pr-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
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
                  className={`flex flex-col gap-1 rounded-2xl p-3 text-start transition ${
                    notif.is_read
                      ? 'bg-slate-50 dark:bg-slate-800/40 opacity-75'
                      : 'border border-violet-100 bg-violet-50/70 hover:border-violet-300 dark:border-violet-900/40 dark:bg-violet-950/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-xs font-black text-slate-900 dark:text-white">{getGroupIcon(notif.type)}<span className="truncate">{notif.title}</span></span>
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
