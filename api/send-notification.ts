// POST /api/send-notification
// 1. Persists notification to notification_log (service role — no RLS)
// 2. Sends FCM push to all device tokens for userId
// Requires: FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY,
//           VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env.

// ── Inlined auth helpers (Vercel's Node.js function builder does not trace
// relative imports outside this file into the deployed bundle — confirmed in
// production; every api/* file must be self-contained, see generate-smart-workout.ts) ──
const TRAINER_ROLES = [
  'trainer', 'studio_trainer', 'studio_admin',
  'internal_trainer', 'technical_coordinator', 'studio_manager',
] as const;

function authSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}
function authServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}
function authAnonKey(): string {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
}
function authServiceHeaders(): Record<string, string> {
  const key = authServiceKey();
  return { apikey: key, Authorization: `Bearer ${key}` };
}

interface AuthedUser { id: string; email: string | null }

async function verifyRequestUser(req: { headers?: Record<string, string | string[] | undefined> }): Promise<AuthedUser | null> {
  const raw = req.headers?.authorization ?? req.headers?.Authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header?.startsWith('Bearer ')) return null;
  const jwt = header.slice('Bearer '.length).trim();
  if (!jwt) return null;

  const url = authSupabaseUrl();
  const key = authAnonKey();
  if (!url || !key) {
    console.error('[auth] SUPABASE_URL / SUPABASE_ANON_KEY not set — cannot verify callers');
    return null;
  }

  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) return null;
    const user = await res.json() as { id?: string; email?: string };
    if (!user?.id) return null;
    return { id: user.id, email: user.email ?? null };
  } catch (err) {
    console.error('[auth] JWT verification failed:', (err as Error)?.message);
    return null;
  }
}

async function isTrainerRole(userId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${authSupabaseUrl()}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(userId)}&limit=1`,
      { headers: authServiceHeaders() },
    );
    if (!res.ok) return false;
    const rows = await res.json() as { role?: string }[];
    const role = rows[0]?.role;
    return !!role && (TRAINER_ROLES as readonly string[]).includes(role);
  } catch {
    return false;
  }
}

async function hasActiveLink(userA: string, userB: string): Promise<boolean> {
  const a = encodeURIComponent(userA);
  const b = encodeURIComponent(userB);
  try {
    const res = await fetch(
      `${authSupabaseUrl()}/rest/v1/trainer_clients?select=id&status=eq.active&or=(and(trainer_id.eq.${a},client_id.eq.${b}),and(trainer_id.eq.${b},client_id.eq.${a}))&limit=1`,
      { headers: authServiceHeaders() },
    );
    if (!res.ok) return false;
    const rows = await res.json() as { id: string }[];
    return rows.length > 0;
  } catch {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const caller = await verifyRequestUser(req);
  if (!caller) return res.status(401).json({ error: 'Unauthorized' });

  const { userId, title, body, url, type, entityType, entityId, expiresAt, templateKey, params } = req.body || {};
  // title/body may be empty when templateKey is set — the recipient renders
  // the localized text from templateKey/params on-device (see notify.ts).
  if (!userId || (!templateKey && (!title || !body))) return res.status(400).json({ error: 'userId and (title+body or templateKey) required' });

  // Sender identity comes from the verified JWT, never from the body.
  // Cross-user sends require an active trainer↔client link with the recipient.
  const fromUserId = caller.id;
  if (userId !== caller.id && !(await hasActiveLink(caller.id, userId))) {
    return res.status(403).json({ error: 'No active trainer/client link with recipient' });
  }

  const supabaseUrl  = process.env.VITE_SUPABASE_URL        || '';
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // ── 1. Persist to notification_log via REST with service role (bypasses RLS) ─
  if (serviceKey) {
    const logRow: Record<string, unknown> = {
      to_user_id:   userId,
      from_user_id: fromUserId   ?? null,
      title,
      body,
      type:         type         ?? null,
      entity_type:  entityType   ?? null,
      entity_id:    entityId     ?? null,
      expires_at:   expiresAt    ?? null,
      template_key: templateKey  ?? null,
      params:       params       ?? null,
    };
    const logRes = await fetch(`${supabaseUrl}/rest/v1/notification_log`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        apikey:          serviceKey,
        Authorization:   `Bearer ${serviceKey}`,
        Prefer:          'return=minimal',
      },
      body: JSON.stringify(logRow),
    });
    if (!logRes.ok) {
      const err = await logRes.text().catch(() => '');
      console.error('[send-notification] notification_log insert failed:', logRes.status, err);
    } else {
      console.log('[send-notification] notification_log insert ok → to:', userId, 'type:', type ?? '—');
    }
  } else {
    console.warn('[send-notification] SUPABASE_SERVICE_ROLE_KEY not set — skipping DB persist');
  }

  try {
    // ── 2. FCM push ────────────────────────────────────────────────────────────
    const { JWT } = await import('google-auth-library');
    const client = new JWT({
      email:  process.env.FCM_CLIENT_EMAIL || '',
      key:    (process.env.FCM_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const auth = await client.authorize();
    const accessToken = auth?.access_token;
    if (!accessToken) return res.status(500).json({ error: 'Auth failed — check FCM credentials' });

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${process.env.FCM_PROJECT_ID}/messages:send`;

    // Get device tokens directly via service role (bypasses RLS; the
    // get_device_tokens RPC is scoped to auth.uid() and not usable server-side
    // for an arbitrary userId — see auth-security-audit-20260608.md item 1).
    if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' });
    const tokensRes = await fetch(`${supabaseUrl}/rest/v1/device_tokens?user_id=eq.${userId}&select=token`, {
      method:  'GET',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!tokensRes.ok) {
      const errText = await tokensRes.text().catch(() => 'unknown');
      console.error('[send-notification] device_tokens fetch failed:', tokensRes.status, errText);
      return res.status(200).json({ sent: 0, failed: 0, error: 'device_tokens fetch failed' });
    }
    const rawTokens = (await tokensRes.json()) as { token: string }[];
    const tokens = rawTokens.map((t: any) => t.token);
    console.log(`[send-notification] user=${userId} tokens=${tokens.length}`);
    if (tokens.length === 0) return res.status(200).json({ sent: 0, failed: 0, error: 'no tokens' });

    let sent = 0, failed = 0;
    for (const token of tokens) {
      try {
        const pushRes = await fetch(fcmUrl, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body:    JSON.stringify({
            message: { token, notification: { title, body }, data: { url: url || '/' } },
          }),
        });
        if (pushRes.ok) { sent++; }
        else {
          failed++;
          console.error('[send-notification] FCM send failed:', pushRes.status, await pushRes.text().catch(() => ''));
        }
      } catch (e: any) { failed++; console.error('[send-notification] FCM error:', e?.message); }
    }
    console.log(`[send-notification] sent=${sent} failed=${failed}`);
    res.status(200).json({ sent, failed });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
}
