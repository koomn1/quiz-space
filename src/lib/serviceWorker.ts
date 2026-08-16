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

export async function precacheQuizSpaceProfileAssets(registration: ServiceWorkerRegistration): Promise<boolean> {
  let worker = registration.active || registration.waiting;
  if (!worker && registration.installing) {
    await new Promise<void>((resolve) => {
      const installing = registration.installing;
      if (!installing) {
        resolve();
        return;
      }
      const finish = () => {
        if (installing.state === 'activated' || installing.state === 'redundant') {
          installing.removeEventListener('statechange', finish);
          resolve();
        }
      };
      installing.addEventListener('statechange', finish);
      window.setTimeout(() => {
        installing.removeEventListener('statechange', finish);
        resolve();
      }, 30_000);
    });
    worker = registration.active || registration.waiting;
  }
  if (!worker) return false;

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => resolve(false), 30_000);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeout);
      resolve(event.data?.type === 'PROFILE_ASSETS_CACHED');
    };
    worker.postMessage({ type: 'PRECACHE_PROFILE_ASSETS' }, [channel.port2]);
  });
}
