import React from 'react';
import { supabase } from '../supabase';

interface UsePushNotificationsReturn {
  permission:   NotificationPermission;
  request:      () => Promise<boolean>;
  registerToken: (userId: string) => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = React.useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const request = React.useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, []);

  const registerToken = React.useCallback(async (userId: string) => {
    if (permission !== 'granted' || typeof navigator === 'undefined') return;

    try {
      // Register service worker for FCM
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;

      // Dynamically import Firebase Messaging
      const { initializeApp } = await import('firebase/app');
      const { getMessaging, getToken } = await import('firebase/messaging');

      const app = initializeApp({
        apiKey:            import.meta.env.VITE_FCM_API_KEY            || '',
        authDomain:        import.meta.env.VITE_FCM_AUTH_DOMAIN        || '',
        projectId:         import.meta.env.VITE_FCM_PROJECT_ID         || '',
        storageBucket:     import.meta.env.VITE_FCM_STORAGE_BUCKET     || '',
        messagingSenderId: import.meta.env.VITE_FCM_MESSAGING_SENDER_ID || '',
        appId:             import.meta.env.VITE_FCM_APP_ID             || '',
      });

      const messaging = getMessaging(app);
      const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY || '';

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        await (supabase.from('device_tokens' as any) as any).upsert(
          { user_id: userId, token, platform: 'web' },
          { onConflict: 'user_id,token' }
        );
      }
    } catch (err) {
      console.warn('[usePushNotifications]', err);
    }
  }, [permission]);

  return { permission, request, registerToken };
}
