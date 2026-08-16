export async function registerQuizSpaceServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const baseUrl = ((import.meta as any).env?.BASE_URL || '/').replace(/\/?$/, '/');
    return await navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl });
  } catch (error) {
    console.warn('Service worker registration failed:', error);
    return null;
  }
}
