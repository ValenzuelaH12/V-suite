const CACHE_NAME = 'v-suite-v1';

// Al instalar, podemos cachear recursos básicos (opcional para PWA completa)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Manejar mensajes del hilo principal (para notificaciones locales desde el contexto)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Manejar notificaciones push
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Alerta V-Suite', body: event.data.text() };
  }

  const title = data.title || 'Alerta V-Suite';
  const options = {
    body: data.body || 'Nueva actualización disponible.',
    icon: '/pwa-192x192.png',
    badge: '/favicon.svg',
    data: data.url || '/',
    tag: data.tag || 'vsuite-notification',
    vibrate: [200, 100, 200],
    requireInteraction: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Manejar el clic en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
