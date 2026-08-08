const VIDEO_CACHE = 'quiz-space-videos-v2';
const VIDEOS_TO_PRECACHE = [
  '/quiz-space/videos/splash-intro.mp4',
  '/quiz-space/videos/splash-desktop.mp4',
  '/quiz-space/videos/splash-mobile.mp4',
];

// Cache videos on install so they are available immediately on first use
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VIDEO_CACHE).then((cache) =>
      cache.addAll(VIDEOS_TO_PRECACHE).catch(() => {/* non-fatal */})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Remove old video caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k.startsWith('quiz-space-videos-') && k !== VIDEO_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for video files so they never re-download unnecessarily
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (url.includes('/videos/') && (url.endsWith('.mp4') || url.endsWith('.webm'))) {
    event.respondWith(
      caches.open(VIDEO_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone()).catch(() => {/* storage quota */});
        }
        return response;
      })
    );
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: '👾 كويز جديد مطلوب في فصلك!', body: event.data.text() };
    }
  }

  const title = data.title || '👾 كويز جديد مطلوب في فصلك!';
  const options = {
    body: data.body || 'قام المعلم بنشر كويز جديد. اضغط هنا للدخول والحل فوراً قبل انتهاء الوقت.',
    icon: data.icon || '/assets/logo.png',
    badge: data.badge || '/assets/logo.png',
    dir: data.dir || 'rtl',
    lang: data.lang || 'ar',
    requireInteraction: Boolean(data.requireInteraction),
    data: {
      url: data.url || '/quiz-space/#/classrooms',
    },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/quiz-space/#/classrooms';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
