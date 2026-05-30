// Firebase Cloud Messaging — uses firebase-admin SDK
// Perfect for Vercel serverless — no manual JWT, no crypto hacks.

const admin = require('firebase-admin');

let app: any = null;
if (admin.apps.length === 0) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      privateKey:  (process.env.FCM_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
} else {
  app = admin.apps[0];
}

async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!process.env.FCM_PRIVATE_KEY) return { sent: 0, failed: 0 };

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const anonKey     = process.env.VITE_SUPABASE_ANON_KEY || '';

  // Get device tokens
  const tokensRes = await fetch(
    `${supabaseUrl}/rest/v1/device_tokens?select=token&user_id=eq.${userId}`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
  );

  if (!tokensRes.ok) return { sent: 0, failed: 0 };
  const tokens = ((await tokensRes.json()) as { token: string }[]).map((t: any) => t.token);
  if (tokens.length === 0) return { sent: 0, failed: 0 };

  let sent = 0, failed = 0;

  for (const token of tokens) {
    try {
      await app.messaging().send({
        token,
        notification: { title: payload.title, body: payload.body },
        webpush: { fcmOptions: { link: payload.url || '/' } },
      });
      sent++;
    } catch { failed++; }
  }

  return { sent, failed };
}

export { sendPushToUser };
