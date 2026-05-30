// POST /api/send-notification
// Sends a push notification via Firebase Cloud Messaging v1 API.
// Uses google-auth-library for OAuth2 token.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, title, body, url } = req.body || {};
  if (!userId || !title || !body) {
    return res.status(400).json({ error: 'userId, title, and body are required' });
  }

  try {
    const { JWT } = await import('google-auth-library');

    // Normalize private key: handle actual newlines, literal \n strings, and any JSON formatting
    let rawKey = process.env.FCM_PRIVATE_KEY || '';
    console.log('[send-notification] rawKey first 60:', JSON.stringify(rawKey.substring(0, 60)));
    console.log('[send-notification] rawKey has \\n:', rawKey.includes('\\n'));
    console.log('[send-notification] rawKey has real newlines:', rawKey.includes('\n'));
    rawKey = rawKey.replace(/\\n/g, '\n');          // literal \n → actual newline
    rawKey = rawKey.replace(/^["'\s]+|["'\s]+$/g, ''); // strip quotes/whitespace
    console.log('[send-notification] processed first 60:', JSON.stringify(rawKey.substring(0, 60)));
    console.log('[send-notification] processed length:', rawKey.length);
    // Ensure proper PEM format
    if (!rawKey.includes('-----BEGIN')) {
      rawKey = '-----BEGIN PRIVATE KEY-----\n' + rawKey;
    }
    if (!rawKey.includes('-----END')) {
      rawKey = rawKey + '\n-----END PRIVATE KEY-----\n';
    }

    const client = new JWT({
      email:   process.env.FCM_CLIENT_EMAIL,
      key:     rawKey,
      scopes:  ['https://www.googleapis.com/auth/firebase.messaging'],
    });

    const tokenRes = await client.authorize();
    const accessToken = tokenRes?.access_token;
    if (!accessToken) return res.status(500).json({ error: 'Failed to obtain access token' });

    // Get device tokens
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const anonKey     = process.env.VITE_SUPABASE_ANON_KEY || '';
    const tokensRes = await fetch(
      `${supabaseUrl}/rest/v1/device_tokens?select=token&user_id=eq.${userId}`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
    );
    if (!tokensRes.ok) return res.status(200).json({ sent: 0, failed: 0 });

    const tokens = ((await tokensRes.json()) as { token: string }[]).map((t: any) => t.token);
    if (tokens.length === 0) return res.status(200).json({ sent: 0, failed: 0 });

    // Send push
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${process.env.FCM_PROJECT_ID}/messages:send`;
    let sent = 0, failed = 0;
    for (const token of tokens) {
      try {
        const pushRes = await fetch(fcmUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify({ message: { token, notification: { title, body }, data: { url: url || '/' } } }),
        });
        if (pushRes.ok) sent++; else failed++;
      } catch { failed++; }
    }
    res.status(200).json({ sent, failed });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
}
