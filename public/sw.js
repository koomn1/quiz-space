const CACHE_VERSION = 'v3';
const VIDEO_CACHE = `quiz-space-videos-${CACHE_VERSION}`;
const PROFILE_ASSET_CACHE = `quiz-space-profile-assets-${CACHE_VERSION}`;
const VIDEOS_TO_PRECACHE = [
  '/quiz-space/videos/splash-intro.mp4',
  '/quiz-space/videos/splash-desktop.mp4',
  '/quiz-space/videos/splash-mobile.mp4',
];
const PROFILE_ASSETS_TO_PRECACHE = [
  'clean-assets-replacement/boy-robotics-transparent.webp',
  'clean-assets-replacement/girl-pottery-transparent.webp',
  'clean-assets-replacement/boy-chef-transparent.webp',
  'clean-assets-replacement/girl-dance-transparent.webp',
  'clean-assets-replacement/boy-photography-transparent.webp',
  'clean-assets-replacement/girl-cycling-transparent.webp',
  'clean-assets-replacement/avatar-girl-robotics-v2.webp',
  'clean-assets-replacement/avatar-boy-football-analyst-v2.webp',
  'clean-assets-replacement/avatar-girl-design-artist-v2.webp',
  'clean-assets-replacement/avatar-boy-music-walker-v2.webp',
  'clean-assets-replacement/avatar-girl-astronomy-v2.webp',
  'clean-assets-replacement/avatar-boy-chess-strategist-v3.webp',
  'clean-assets-replacement/avatar-girl-basketball-scientist-v3.webp',
  'clean-assets-replacement/avatar-boy-photo-journalist-v3.webp',
  'clean-assets-replacement/avatar-girl-cyclist-coder-v3.webp',
  'clean-assets-replacement/aurora-glass-transparent.webp',
  'clean-assets-replacement/crystal-luxe-transparent.webp',
  'clean-assets-replacement/cyber-orbit-transparent.webp',
  'clean-assets-replacement/fire-trail-transparent.webp',
  'clean-assets-replacement/galaxy-ring-transparent.webp',
  'clean-assets-replacement/nature-leaf-transparent.webp',
  'clean-assets-replacement/neon-orbit-transparent.webp',
  'clean-assets-replacement/ramadan-green-transparent.webp',
  'clean-assets-replacement/royal-gold-transparent.webp',
  'clean-assets-replacement/school-bus-transparent.webp',
  'clean-assets-replacement/school-stationary-transparent.webp',
  'clean-assets-replacement/star-crown-transparent.webp',
];

async function cacheProfileAssets() {
  const cache = await caches.open(PROFILE_ASSET_CACHE);
  await Promise.all(PROFILE_ASSETS_TO_PRECACHE.map(async (assetPath) => {
    try {
      const assetUrl = new URL(assetPath, self.registration.scope).toString();
      if (!(await cache.match(assetUrl))) {
        await cache.add(assetUrl);
      }
    } catch {
      // Keep the worker installable if one optional asset is unavailable.
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(Promise.all([
    caches.open(VIDEO_CACHE).then((cache) =>
      cache.addAll(VIDEOS_TO_PRECACHE).catch(() => {/* non-fatal */})
    ),
    cacheProfileAssets(),
  ]));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => (
          (key.startsWith('quiz-space-videos-') && key !== VIDEO_CACHE) ||
          (key.startsWith('quiz-space-profile-assets-') && key !== PROFILE_ASSET_CACHE)
        ))
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  const isVideo = requestUrl.pathname.includes('/videos/') && /\.(mp4|webm)$/i.test(requestUrl.pathname);
  const isProfileAsset = requestUrl.pathname.includes('/clean-assets-replacement/') && /\.(webp|png|jpe?g)$/i.test(requestUrl.pathname);
  if (!isVideo && !isProfileAsset) return;

  const cacheName = isProfileAsset ? PROFILE_ASSET_CACHE : VIDEO_CACHE;
  event.respondWith(
    caches.open(cacheName).then(async (cache) => {
      const cached = await cache.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) {
        cache.put(event.request, response.clone()).catch(() => {/* storage quota */});
      }
      return response;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data?.type !== 'PRECACHE_PROFILE_ASSETS') return;
  const completion = cacheProfileAssets().then(() => ({ type: 'PROFILE_ASSETS_CACHED' }));
  if (event.ports?.[0]) {
    event.waitUntil(completion.then((message) => event.ports[0].postMessage(message)));
  } else {
    event.waitUntil(completion);
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
      eventId: data.eventId || null,
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
  const eventId = event.notification.data?.eventId;
  const separator = targetUrl.includes('?') ? '&' : '?';
  const openUrl = eventId ? `${targetUrl}${separator}pushEventId=${encodeURIComponent(eventId)}` : targetUrl;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(openUrl);
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(openUrl);
      }
    })
  );
});
