// Firebase Cloud Messaging — HTTP v1 API (no SDK dependency)
// Used by Vercel Edge Functions. Requires FCM_SERVER_KEY env var.

declare const process: { env: Record<string, string | undefined> };

const FCM_URL = 'https://fcm.googleapis.com/fcm/send';
const SERVER_KEY = process.env.FCM_SERVER_KEY || '';

interface NotificationPayload {
  title: string;
  body:  string;
  url?:  string;
}

export async function sendPushToUser(userId: string, payload: NotificationPayload): Promise<{ sent: number; failed: number }> {
  if (!SERVER_KEY) return { sent: 0, failed: 0 };

  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';

  // Query device tokens for this user
  const tokensRes = await fetch(
    `${supabaseUrl}/rest/v1/device_tokens?select=token&user_id=eq.${userId}`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
  );

  if (!tokensRes.ok) return { sent: 0, failed: 0 };
  const tokens = (await tokensRes.json() as { token: string }[]).map(t => t.token);
  if (tokens.length === 0) return { sent: 0, failed: 0 };

  let sent = 0, failed = 0;

  for (const token of tokens) {
    try {
      const res = await fetch(FCM_URL, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `key=${SERVER_KEY}`,
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title: payload.title,
            body:  payload.body,
            sound: 'default',
          },
          data: {
            url: payload.url || '/',
          },
        }),
      });
      if (res.ok) sent++; else failed++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}
