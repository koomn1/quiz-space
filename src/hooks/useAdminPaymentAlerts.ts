import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { playNotificationSound } from '../lib/sound';

export interface PaymentAlertInfo {
  id: string;
  name: string;
  email: string;
  planName: string;
  planPrice?: string;
  amount?: number | string;
  paymentMethod?: string;
}

interface UseAdminPaymentAlertsOptions {
  isAdmin: boolean;
  onNavigateToPayments?: () => void;
}

export function useAdminPaymentAlerts({ isAdmin, onNavigateToPayments }: UseAdminPaymentAlertsOptions) {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [latestAlert, setLatestAlert] = useState<PaymentAlertInfo | null>(null);
  const [alerts, setAlerts] = useState<PaymentAlertInfo[]>([]);

  const refreshPendingCount = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [{ count }, { data, error }] = await Promise.all([
        supabase.from('premium_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('premium_requests').select('id, name, email, plan_name, plan_price, amount, payment_method').eq('status', 'pending').order('created_at', { ascending: false }).limit(20),
      ]);
      if (error) throw error;
      const nextAlerts = (data || []).map((record: any) => ({
        id: record.id,
        name: record.name || record.email || 'مشترك كوزميك',
        email: record.email || '',
        planName: record.plan_name || 'الباقة المميزة',
        planPrice: record.plan_price || undefined,
        amount: record.amount ?? undefined,
        paymentMethod: record.payment_method || undefined,
      }));
      setPendingCount(count ?? nextAlerts.length);
      setAlerts(nextAlerts);
      setLatestAlert(nextAlerts[0] || null);
    } catch (err) {
      console.warn('Error refreshing pending payment count:', err);
    }
  }, [isAdmin]);

  const triggerPaymentAlert = useCallback((alert: PaymentAlertInfo) => {
    // 1. Play soft audio chime (respects user interaction and mute settings)
    try {
      playNotificationSound('chime');
    } catch (_) {}

    // 2. Set floating in-app banner alert
    setLatestAlert(alert);
    setAlerts((previous) => [alert, ...previous.filter((item) => item.id !== alert.id)]);

    // 3. Send OS desktop notification if permission granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification('QuizSpace: طلب دفع واشتراك جديد', {
          body: `قام المشترك ${alert.name} بإرسال إيصال لتفعيل ${alert.planName}. اضغط للمراجعة والتفعيل.`,
          icon: '/favicon.ico',
        });
        notif.onclick = () => {
          window.focus();
          if (onNavigateToPayments) {
            onNavigateToPayments();
          }
        };
      } catch (_) {}
    }

    // 4. Update count
    setPendingCount((prev) => prev + 1);
  }, [onNavigateToPayments]);

  const dismissAlert = useCallback(() => {
    setLatestAlert(null);
  }, []);

  const dismissAlertById = useCallback((id: string) => {
    setAlerts((previous) => previous.filter((alert) => alert.id !== id));
    setLatestAlert((current) => current?.id === id ? null : current);
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setPendingCount(0);
      setLatestAlert(null);
      setAlerts([]);
      return;
    }

    // Request desktop notification permission on admin login if pending
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // Initial count
    refreshPendingCount();

    // 1. Realtime Supabase Channel
    const channel = supabase
      .channel('admin-premium-payment-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'premium_requests' },
        (payload) => {
          const newRecord = payload.new as any;
          if (newRecord && (newRecord.status || 'pending') === 'pending') {
            triggerPaymentAlert({
              id: newRecord.id,
              name: newRecord.name || newRecord.email || 'مشترك كوزميك',
              email: newRecord.email || '',
              planName: newRecord.plan_name || newRecord.planName || 'الباقة المميزة',
              planPrice: newRecord.plan_price || newRecord.planPrice,
              amount: newRecord.amount,
              paymentMethod: newRecord.payment_method || newRecord.paymentMethod,
            });
          }
          refreshPendingCount();
        }
      )
      .subscribe();

    // 2. Window event listener (for instant alerts across same-window actions)
    const handleLocalSubmitted = (e: any) => {
      if (e?.detail) {
        triggerPaymentAlert({
          id: e.detail.id,
          name: e.detail.name || e.detail.email || 'مشترك كوزميك',
          email: e.detail.email || '',
          planName: e.detail.planName || 'الباقة المميزة',
          planPrice: e.detail.planPrice,
          amount: e.detail.amount,
          paymentMethod: e.detail.paymentMethod,
        });
        refreshPendingCount();
      }
    };
    window.addEventListener('quizspace-payment-request-submitted', handleLocalSubmitted);

    // 3. Fallback polling every 45s
    const interval = setInterval(refreshPendingCount, 45000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('quizspace-payment-request-submitted', handleLocalSubmitted);
      clearInterval(interval);
    };
  }, [isAdmin, refreshPendingCount, triggerPaymentAlert]);

  return {
    pendingCount,
    latestAlert,
    alerts,
    dismissAlert,
    dismissAlertById,
    refreshPendingCount,
  };
}
