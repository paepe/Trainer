// POST /api/send-notification
// Sends push via FCM v1 API with OAuth2 (service account).
// Requires: FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY in env.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, title, body, url } = req.body || {};
  if (!userId || !title || !body) return res.status(400).json({ error: 'userId, title, body required' });

  try {
    // OAuth2 access token via service account
    const { JWT } = await import('google-auth-library');
    const client = new JWT({
      email:  process.env.FCM_CLIENT_EMAIL || '',
      key:    (process.env.FCM_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const auth = await client.authorize();
    const accessToken = auth?.access_token;
    if (!accessToken) return res.status(500).json({ error: 'Auth failed — check FCM credentials' });

    // FCM v1 endpoint
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${process.env.FCM_PROJECT_ID}/messages:send`;

    // Get device tokens via SECURITY DEFINER RPC (bypasses RLS safely)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
    const tokensRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_device_tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({ uid: userId }),
    });
    if (!tokensRes.ok) return res.status(200).json({ sent: 0, failed: 0 });
    const tokens = ((await tokensRes.json()) as { token: string }[]).map((t: any) => t.token);
    if (tokens.length === 0) return res.status(200).json({ sent: 0, failed: 0 });

    // Send to each device
    let sent = 0, failed = 0;
    for (const token of tokens) {
      try {
        const pushRes = await fetch(fcmUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            message: { token, notification: { title, body }, data: { url: url || '/' } },
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
