// Fire-and-forget push notification trigger — calls /api/send-notification
export function notify(userId: string, title: string, body: string, url?: string) {
  fetch('/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, title, body, url }),
  }).catch(() => {}); // fire-and-forget — don't block UI
}
