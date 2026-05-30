// POST /api/send-notification
// Sends a push notification via Firebase Cloud Messaging.
// Requires FCM_SERVER_KEY env var (Cloud Messaging → Server key).
// Body: { userId: string, title: string, body: string, url?: string }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, title, body, url } = req.body || {};
  if (!userId || !title || !body) {
    return res.status(400).json({ error: 'userId, title, and body are required' });
  }

  const serverKey = process.env.FCM_SERVER_KEY || process.env.FCM_PRIVATE_KEY || '';
  if (!serverKey) return res.status(500).json({ error: 'FCM_SERVER_KEY not configured' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const anonKey     = process.env.VITE_SUPABASE_ANON_KEY || '';

  try {
    const tokensRes = await fetch(
      `${supabaseUrl}/rest/v1/device_tokens?select=token&user_id=eq.${userId}`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
    );
    if (!tokensRes.ok) return res.status(200).json({ sent: 0, failed: 0 });
    const tokens = ((await tokensRes.json()) as { token: string }[]).map((t: any) => t.token);
    if (tokens.length === 0) return res.status(200).json({ sent: 0, failed: 0 });

    let sent = 0, failed = 0;
    for (const token of tokens) {
      try {
        const pushRes = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `key=${serverKey}` },
          body: JSON.stringify({
            to: token,
            notification: { title, body },
            data: { url: url || '/' },
          }),
        });
        if (pushRes.ok) sent++; else failed++;
      } catch { failed++; }
    }
    res.status(200).json({ sent, failed });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
}
