// Firebase Cloud Messaging Service Worker
// Runs in background to handle push notifications even when the app is closed.
// Loaded via navigator.serviceWorker.register('/firebase-messaging-sw.js')

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyAY3QqwsYR8kETNhYzhzlQHNMQh2HeATuI',
  authDomain:        'trainer-project-4b620.firebaseapp.com',
  projectId:         'trainer-project-4b620',
  storageBucket:     'trainer-project-4b620.firebasestorage.app',
  messagingSenderId: '297201529100',
  appId:             '1:297201529100:web:a395312127e39dbb2b1929',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const url = payload.data?.url || '/';

  self.registration.showNotification(title || 'TrAIner', {
    body: body || '',
    icon: '/assets/trainer-logo-circle.png',
    data: { url },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
