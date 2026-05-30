// Firebase Cloud Messaging — HTTP v1 API with OAuth2
// Uses Node.js crypto module for JWT signing (works in Vercel serverless).

import * as crypto from 'crypto';

const PROJECT_ID    = (globalThis as any).process?.env?.FCM_PROJECT_ID    || '';
const CLIENT_EMAIL  = (globalThis as any).process?.env?.FCM_CLIENT_EMAIL  || '';
const PRIVATE_KEY   = ((globalThis as any).process?.env?.FCM_PRIVATE_KEY  || '').replace(/\\n/g, '\n');

const FCM_V1_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
const TOKEN_URL  = 'https://oauth2.googleapis.com/token';

let cachedToken: { access_token: string; expires_at: number } | null = null;

function getAccessToken(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!CLIENT_EMAIL || !PRIVATE_KEY) return resolve(null);
    if (cachedToken && cachedToken.expires_at > Date.now() + 60_000) return resolve(cachedToken.access_token);

    const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const now     = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
      iss:   CLIENT_EMAIL,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud:   TOKEN_URL,
      exp:   now + 3600,
      iat:   now,
    })).toString('base64url');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    sign.end();
    const signature = sign.sign(PRIVATE_KEY, 'base64url');
    const jwt = `${header}.${payload}.${signature}`;

    fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    })
    .then(res => res.json())
    .then((data: any) => {
      if (data.access_token) {
        cachedToken = { access_token: data.access_token, expires_at: Date.now() + (data.expires_in || 3600) * 1000 };
        resolve(cachedToken.access_token);
      } else {
        resolve(null);
      }
    })
    .catch(() => resolve(null));
  });
}

interface NotificationPayload {
  title: string;
  body:  string;
  url?:  string;
}

export async function sendPushToUser(userId: string, payload: NotificationPayload): Promise<{ sent: number; failed: number }> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { sent: 0, failed: 0 };

  const supabaseUrl = (globalThis as any).process?.env?.VITE_SUPABASE_URL || '';
  const anonKey     = (globalThis as any).process?.env?.VITE_SUPABASE_ANON_KEY || '';

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
