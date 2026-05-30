// Firebase Cloud Messaging configuration
// Replace with your Firebase project config from https://console.firebase.google.com
export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FCM_API_KEY            || '',
  authDomain:        import.meta.env.VITE_FCM_AUTH_DOMAIN        || '',
  projectId:         import.meta.env.VITE_FCM_PROJECT_ID         || '',
  storageBucket:     import.meta.env.VITE_FCM_STORAGE_BUCKET     || '',
  messagingSenderId: import.meta.env.VITE_FCM_MESSAGING_SENDER_ID || '',
  appId:             import.meta.env.VITE_FCM_APP_ID             || '',
};

// VAPID key for web push — generated in Firebase Console → Cloud Messaging → Web Push certificates
export const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY || '';
