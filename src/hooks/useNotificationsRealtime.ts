import { useEffect, useState } from 'react';
import { getUserNotificationPreferences } from '../lib/db';
import { playNotificationSound } from '../lib/sound';
import { pushNotificationsManager, type PushNotificationPayload } from '../lib/pushNotifications';
import { supabase } from '../lib/supabaseClient';
import { useVisibilityPolling } from './useVisibilityPolling';
import { isGuestIdentity } from '../lib/guestIdentity';

export function useNotificationsRealtime({
  userId,
  userName,
  lang,
}: {
  userId: string;
  userName: string;
  lang: 'ar' | 'en';
}) {
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [activePush, setActivePush] = useState<PushNotificationPayload | null>(null);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(() => {
    const permission = pushNotificationsManager.getPermissionStatus();
    return permission !== 'granted' && localStorage.getItem('quiz_push_banner_dismissed') !== 'true';
  });
  const [showQuotaWarning, setShowQuotaWarning] = useState(() => localStorage.getItem('firebase_quota_exceeded') === 'true');

  useVisibilityPolling(() => {
    if (localStorage.getItem('firebase_quota_exceeded') === 'true') setShowQuotaWarning(true);
  }, 3000);

  useEffect(() => {
    if (!userId || userId.startsWith('user-guest')) return;
    const permission = typeof window !== 'undefined' && window.Notification ? window.Notification.permission : 'default';
    const dismissed = localStorage.getItem('quiz_push_banner_dismissed') === 'true';
    setShowPushBanner(permission !== 'granted' && !dismissed);
  }, [userId]);

  useEffect(() => {
    if (!userId || userId.startsWith('user-guest')) setShowPushBanner(false);
  }, [userId]);

  useEffect(() => {
    let active = true;
    if (!userId || userId.startsWith('user-')) {
      setPushNotificationsEnabled(false);
      return () => { active = false; };
    }

    void getUserNotificationPreferences(userId).then((preferences) => {
      if (active) setPushNotificationsEnabled(preferences.pushEnabled);
    });

    const handlePreferenceChange = (event: Event) => {
      const detail = (event as CustomEvent<{ pushEnabled?: boolean }>).detail;
      if (typeof detail?.pushEnabled === 'boolean') setPushNotificationsEnabled(detail.pushEnabled);
    };
    window.addEventListener('quizspace:notification-preferences-updated', handlePreferenceChange);
    return () => {
      active = false;
      window.removeEventListener('quizspace:notification-preferences-updated', handlePreferenceChange);
    };
  }, [userId]);

  useEffect(() => {
    const handleNotification = (payload: PushNotificationPayload) => {
      setActivePush(payload);
      window.setTimeout(() => setActivePush((current) => current?.id === payload.id ? null : current), 7000);
    };
    pushNotificationsManager.subscribe('app-root', handleNotification);

    if (localStorage.getItem('firebase_quota_exceeded') === 'true') {
      return () => pushNotificationsManager.unsubscribe('app-root');
    }

    const sessionBootTime = new Date().toISOString();
    const channel = supabase
      .channel('notifications-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const data = payload.new as any;
        if (data.created_at && data.created_at < sessionBootTime) return;
        if (data.sender_name && data.sender_name === userName) return;
        if (!pushNotificationsEnabled) return;
        pushNotificationsManager.trigger({
          title: data.title || (lang === 'ar' ? 'تنبيه جديد 🪐' : 'New Buzz 🪐'),
          body: data.body || '',
          icon: 'bell',
        });
        try { playNotificationSound('chime'); } catch (_) {}
      })
      .subscribe();

    return () => {
      pushNotificationsManager.unsubscribe('app-root');
      void supabase.removeChannel(channel);
    };
  }, [userName, lang, pushNotificationsEnabled]);

  useEffect(() => {
    // Guest identities are local-only labels, not Supabase auth.uid values.
    // Querying direct_messages with one causes a predictable 401.
    if (isGuestIdentity(userId) || localStorage.getItem('firebase_quota_exceeded') === 'true') {
      setUnreadMessagesCount(0);
      return;
    }

    const sessionBootTime = new Date().toISOString();
    void supabase.from('direct_messages').select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId).eq('is_read', false)
      .then(({ count }) => setUnreadMessagesCount(count || 0));

    const channel = supabase
      .channel(`direct-messages-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${userId}` }, (payload) => {
        const message = payload.new as any;
        if (!message.is_read) setUnreadMessagesCount((current) => current + 1);
        const isNew = message.created_at && new Date(message.created_at).getTime() > new Date(sessionBootTime).getTime();
        if (!isNew || !pushNotificationsEnabled) return;

        const senderName = message.sender_name || (lang === 'ar' ? 'مستخدم' : 'Scholar');
        const text = message.text || '';
        if (typeof window !== 'undefined' && window.Notification?.permission === 'granted') {
          try {
            new window.Notification(lang === 'ar' ? `رسالة جديدة من ${senderName} 💬` : `New message from ${senderName} 💬`, {
              body: text.length > 70 ? `${text.substring(0, 70)}...` : text,
              icon: `${import.meta.env.BASE_URL || '/'}brand/quizspace-icon-192.webp`,
            });
          } catch (error) { console.warn('Native notification instantiation error:', error); }
        }
        pushNotificationsManager.trigger({
          title: lang === 'ar' ? `رسالة جديدة من ${senderName} 💬` : `New message from ${senderName} 💬`,
          body: text,
          icon: 'message',
        });
        try { playNotificationSound('chime'); } catch (_) {}
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [userId, lang, pushNotificationsEnabled]);

  return {
    unreadMessagesCount,
    activePush,
    setActivePush,
    pushNotificationsEnabled,
    showPushBanner,
    setShowPushBanner,
    showQuotaWarning,
    setShowQuotaWarning,
  };
}
