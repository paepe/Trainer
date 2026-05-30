// POST /api/send-notification
// Sends a push notification via Firebase Cloud Messaging v1 API.
// Body: { userId: string, title: string, body: string, url?: string }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, title, body, url } = req.body || {};
  if (!userId || !title || !body) {
    return res.status(400).json({ error: 'userId, title, and body are required' });
  }

  try {
    // Lazy-require firebase-admin (avoids import crash if module missing)
    let admin: any;
    try { admin = require('firebase-admin'); } catch { 
      try { admin = require('firebase-admin'); } catch {
        return res.status(500).json({ error: 'firebase-admin not available' });
      }
    }

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId:   process.env.FCM_PROJECT_ID,
          clientEmail: process.env.FCM_CLIENT_EMAIL,
          privateKey:  (process.env.FCM_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
      });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const anonKey     = process.env.VITE_SUPABASE_ANON_KEY || '';

    // Get device tokens
    const tokensRes = await fetch(
      `${supabaseUrl}/rest/v1/device_tokens?select=token&user_id=eq.${userId}`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
    );

    if (!tokensRes.ok) return res.status(200).json({ sent: 0, failed: 0 });
    const tokens = ((await tokensRes.json()) as { token: string }[]).map((t: any) => t.token);
    if (tokens.length === 0) return res.status(200).json({ sent: 0, failed: 0 });

    const messaging = admin.apps[0].messaging();
    let sent = 0, failed = 0;

    for (const token of tokens) {
      try {
        await messaging.send({
          token,
          notification: { title, body },
          webpush: { fcmOptions: { link: url || '/' } },
        });
        sent++;
      } catch { failed++; }
    }

    res.status(200).json({ sent, failed });
  } catch (err: any) {
    console.error('[send-notification]', err?.message || err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
}
