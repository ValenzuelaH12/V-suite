/**
 * SCRIPT PARA ENVIAR NOTIFICACIONES PUSH DESDE EL SERVIDOR (NODE.JS)
 * 
 * Requisitos: npm install web-push
 */
const webpush = require('web-push');

// 1. Configurar tus llaves VAPID
const publicVapidKey = 'BL9KSv9l2_Zf9Of0xfdUQY9t5UiBX22Vc8cRDXV24hlK-dZOCJHf0t3al4oe8rDoFNp8kW3FccOqRKRjblw4I-k';
const privateVapidKey = 'PMiFIDdPTJco42NMOqgehK-R7iDrAKPm_CT-EF0-FKk';

webpush.setVapidDetails(
  'mailto:soporte@vsuite.com',
  publicVapidKey,
  privateVapidKey
);

// 2. Aquí va el objeto de suscripción que copiaste de la App (V-Push Token)
const pushSubscription = {
  endpoint: 'TU_ENDPOINT_AQUI',
  keys: {
    auth: 'TU_AUTH_KEY_AQUI',
    p256dh: 'TU_P256DH_KEY_AQUI'
  }
};

// 3. Contenido de la notificación
const payload = JSON.stringify({
  title: '🚀 ALERTA DE SISTEMA V-NEXUS',
  body: 'Incidencia crítica en Habitación 101. ¡Atención inmediata!',
  icon: '/pwa-192x192.png',
  data: { url: '/incidencias' }
});

// 4. Enviar notificación
webpush.sendNotification(pushSubscription, payload)
  .then(result => console.log('✅ Notificación enviada con éxito:', result.statusCode))
  .catch(error => console.error('❌ Error enviando notificación:', error));
