// POST /api/send-notification
// Sends a push notification via Firebase Cloud Messaging v1 API.
// Uses google-auth-library for OAuth2 token (lightweight, ~2MB).
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
    // Get OAuth2 access token via google-auth-library
    const { JWT } = await import('google-auth-library');
    const client = new JWT({
      email:        process.env.FCM_CLIENT_EMAIL,
      key:          process.env.FCM_PRIVATE_KEY || '',
      scopes:       ['https://www.googleapis.com/auth/firebase.messaging'],
    });

    const tokenRes = await client.authorize();
    const accessToken = tokenRes?.access_token;
    if (!accessToken) {
      return res.status(500).json({ error: 'Failed to obtain access token' });
    }

    const projectId  = process.env.FCM_PROJECT_ID;
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

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    let sent = 0, failed = 0;

    for (const token of tokens) {
      try {
        const pushRes = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              data: { url: url || '/' },
            },
          }),
        });
        if (pushRes.ok) sent++; else failed++;
      } catch { failed++; }
    }

    res.status(200).json({ sent, failed });
  } catch (err: any) {
    console.error('[send-notification]', err?.message || err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
}
