/**
 * EvacRoute 2.0 - Service Worker for Push Notifications and Offline Resilience
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'EVACROUTE – EMERGENCY ALERT', message: event.data.text() };
    }
  }

  const title = data.title || 'EVACROUTE – EMERGENCY ALERT';
  const options = {
    body:
      data.message ||
      'An emergency incident has been detected. Open EvacRoute immediately for your safest evacuation route.',
    icon: '/logo192.png',
    badge: '/favicon.ico',
    tag: data.emergencyId || 'evacroute-emergency',
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    data: {
      url: data.url || '/?emergency=active&tab=emergency-map',
      emergencyId: data.emergencyId,
      timestamp: data.timestamp || Date.now(),
    },
    actions: [
      { action: 'open_route', title: 'Open Safest Route' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl =
    (event.notification.data && event.notification.data.url) ||
    '/?emergency=active&tab=emergency-map';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing open client if available
        for (const client of windowClients) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
