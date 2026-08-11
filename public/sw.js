// Squadpitch service worker — handles browser push notifications.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    // Fallback if payload isn't JSON (e.g. plain text)
    data = { title: 'Squadpitch', body: event.data?.text() || '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Squadpitch', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requestedUrl = event.notification.data?.url;
  if (!requestedUrl) return;

  // Notification payloads are server-controlled, but still constrain navigation
  // to this installation's origin. The worker deliberately has no fetch handler
  // and never caches authenticated application responses.
  let url;
  try {
    url = new URL(requestedUrl, self.location.origin);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => new URL(client.url).origin === url.origin);
      if (existing) {
        return existing.navigate(url.href).then((client) => client?.focus());
      }
      return clients.openWindow(url.href);
    })
  );
});
