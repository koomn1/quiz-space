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
    data: {
      url: data.url || '/#/classrooms',
    },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/#/classrooms';

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
