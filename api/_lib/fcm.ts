// Firebase Cloud Messaging — HTTP v1 API with OAuth2
// Uses service account credentials to obtain access token.
// No SDK dependency — just fetch + JWT signing.

declare const process: { env: Record<string, string | undefined> };

const PROJECT_ID    = process.env.FCM_PROJECT_ID    || '';
const CLIENT_EMAIL  = process.env.FCM_CLIENT_EMAIL  || '';
const PRIVATE_KEY   = (process.env.FCM_PRIVATE_KEY  || '').replace(/\\n/g, '\n');

const FCM_V1_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
const TOKEN_URL  = 'https://oauth2.googleapis.com/token';

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (!CLIENT_EMAIL || !PRIVATE_KEY) return null;
  if (cachedToken && cachedToken.expires_at > Date.now() + 60_000) return cachedToken.access_token;

  // Create JWT for service account
  const header  = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now     = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({
    iss:   CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   TOKEN_URL,
    exp:   now + 3600,
    iat:   now,
  }));

  // Import private key and sign JWT
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const enc = new TextEncoder();
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(`${header}.${payload}`));
  const jwt = `${header}.${payload}.${arrayBufferToBase64(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) return null;

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = { access_token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 };
  return cachedToken.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----.*?-----/g, '').replace(/\s/g, '');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

interface NotificationPayload {
  title: string;
  body:  string;
  url?:  string;
}

export async function sendPushToUser(userId: string, payload: NotificationPayload): Promise<{ sent: number; failed: number }> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { sent: 0, failed: 0 };

  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';

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
      const res = await fetch(FCM_V1_URL, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title: payload.title,
              body:  payload.body,
            },
            data: {
              url: payload.url || '/',
            },
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
