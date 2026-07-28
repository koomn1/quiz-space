// Push notifications are disabled in serverless/GitHub Pages mode
// (no backend to handle VAPID keys and subscription syncing)

export async function registerPushNotifications(userId: string) {
  if (typeof window === 'undefined') return;
  console.log('Push notifications are not available in serverless mode.');
}
