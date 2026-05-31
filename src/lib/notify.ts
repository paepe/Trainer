// Fire-and-forget push notification trigger — calls /api/send-notification.
// Uses absolute URL when running inside Capacitor (native iOS/Android),
// relative URL on web (Vercel handles routing).
const isNative =
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
const API_BASE = isNative ? (import.meta.env.VITE_API_URL ?? '') : '';

export function notify(userId: string, title: string, body: string, url?: string) {
  console.log('[notify] sending push to', userId, title);
  fetch(`${API_BASE}/api/send-notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, title, body, url }),
  })
    .then(r => r.json())
    .then(data => console.log('[notify] push response:', data))
    .catch((err) => {
      console.warn('[notify] push failed:', err);
    });
}
