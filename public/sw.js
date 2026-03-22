const CACHE_NAME = 'v-suite-v1';

// Al instalar, podemos cachear recursos básicos (opcional para PWA completa)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Manejar notificaciones push (si se integran con un servidor de Push)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Alerta V-Suite';
  const options = {
    body: data.body || 'Nueva actualización disponible.',
    icon: '/pwa-192x192.png',
    badge: '/favicon.svg',
    data: data.url || '/',
    tag: data.tag || 'vsuite-notification',
    requireInteraction: data.urgent || false
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Manejar el clic en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si ya hay una pestaña abierta, enfocarla y navegar
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no hay pestaña abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
