/* Service worker de la web: solo Web Push (ADR-08). No cachea nada ni intercepta pedidos.
 * Archivo estático (Vite lo copia tal cual a dist/): nginx lo sirve con no-cache para que un deploy lo actualice.
 * Payload del push: { title, body, data: { notificationId, reason, serverId, channelId, threadId, messageId } }. */

const windows = () => self.clients.matchAll({ type: 'window', includeUncontrolled: true });

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Push sin JSON: se muestra igual con el título por defecto
  }
  event.waitUntil(
    windows().then((clients) => {
      // Con una ventana de la app con foco no se muestra: la bandeja ya avisa. Solo `focused`: una pestaña
      // "visible" puede estar detrás de otra aplicación
      if (clients.some((c) => c.focused)) return;
      return self.registration.showNotification(payload.title || 'Discordia', {
        body: payload.body || '',
        icon: '/favicon.svg',
        // Un aviso por notificación: si el mismo llega dos veces, reemplaza al anterior
        tag: payload.data && payload.data.notificationId,
        data: payload.data || null,
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data;
  event.waitUntil(
    windows().then((clients) => {
      const client = clients[0];
      if (client) {
        // La app navega al recibir el mensaje (features/notifications/usePushNavigation)
        client.postMessage({ type: 'push-open', data });
        return client.focus();
      }
      return self.clients.openWindow(data ? '/?push=' + encodeURIComponent(JSON.stringify(data)) : '/');
    })
  );
});
