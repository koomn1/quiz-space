import { savePushSubscription } from './db';
import { registerQuizSpaceServiceWorker } from './serviceWorker';

export async function registerPushNotifications(userId: string): Promise<'granted' | 'denied' | 'default'> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return 'default';
  }

  try {
    const registration = await registerQuizSpaceServiceWorker();
    if (!registration) return 'default';

    // Android Capacitor WebView may not expose the browser Notification
    // constructor. Use the guarded window property only after the feature
    // detection above; never reference the global name directly.
    let permission = window.Notification?.permission || 'default';

    if (permission === 'default' && window.Notification) {
      permission = await window.Notification.requestPermission();
    }

    if (permission === 'granted') {
      try {
        const vapidKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || localStorage.getItem('quiz_vapid_public_key') || '';
        if (!vapidKey) {
          console.warn('Push permission granted, but VAPID public key is not configured.');
          localStorage.setItem('push_permission', permission);
          return permission;
        }
        const keyArray = urlBase64ToUint8Array(vapidKey);
        const existingSubscription = await registration.pushManager.getSubscription();
        const subscription = existingSubscription || await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyArray as any,
        });

        const subJson = subscription.toJSON();
        if (subJson) {
          localStorage.setItem(`push_sub_${userId}`, JSON.stringify(subJson));
          await savePushSubscription(userId, subJson);
        }
      } catch (subError) {
        console.warn('Push subscription failed:', subError);
      }
    }

    localStorage.setItem('push_permission', permission);
    return permission;
  } catch (err) {
    console.warn('Push registration failed:', err);
    return 'default';
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}
