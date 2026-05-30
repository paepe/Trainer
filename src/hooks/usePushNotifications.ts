import React from 'react';
import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { supabase } from '../supabase';

type PushStatus = 'idle' | 'requesting' | 'denied' | 'registered' | 'error';

interface UsePushNotificationsReturn {
  status:       PushStatus;
  permission:   NotificationPermission;
  request:      () => Promise<boolean>;
  registerToken: (userId: string) => Promise<void>;
}

const FCM_CONFIG = {
  apiKey:            import.meta.env.VITE_FCM_API_KEY            || '',
  authDomain:        import.meta.env.VITE_FCM_AUTH_DOMAIN        || '',
  projectId:         import.meta.env.VITE_FCM_PROJECT_ID         || '',
  storageBucket:     import.meta.env.VITE_FCM_STORAGE_BUCKET     || '',
  messagingSenderId: import.meta.env.VITE_FCM_MESSAGING_SENDER_ID || '',
  appId:             import.meta.env.VITE_FCM_APP_ID             || '',
};

function getOrInitApp() {
  return getApps().length ? getApps()[0] : initializeApp(FCM_CONFIG);
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [status, setStatus]         = React.useState<PushStatus>('idle');
  const [permission, setPermission] = React.useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const request = React.useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') {
      console.warn('[push] Notification API not available');
      setStatus('denied');
      return false;
    }
    setStatus('requesting');
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      console.log('[push] Notification permission granted');
      return true;
    }
    setStatus('denied');
    console.warn('[push] Notification permission denied:', result);
    return false;
  }, []);

  const registerToken = React.useCallback(async (userId: string) => {
    const currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
    if (currentPerm !== 'granted' || typeof navigator === 'undefined') {
      console.warn('[push] Cannot register — permission:', currentPerm);
      return;
    }

    try {
      console.log('[push] Registering service worker...');
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;
      console.log('[push] Service worker ready');

      const app = getOrInitApp();
      const messaging = getMessaging(app);
      const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY || '';
      console.log('[push] Getting FCM token...');

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: reg,
      });

      if (token) {
        console.log('[push] Token obtained, saving to DB...');
        await (supabase.from('device_tokens' as any) as any).upsert(
          { user_id: userId, token, platform: 'web' },
          { onConflict: 'user_id,token' }
        );
        console.log('[push] Token registered successfully');
        setStatus('registered');
      } else {
        console.warn('[push] No token returned from FCM');
        setStatus('error');
      }
    } catch (err) {
      console.error('[push] Registration error:', err);
      setStatus('error');
    }
  }, []);

  return { status, permission, request, registerToken };
}
