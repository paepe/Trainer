// Shared request-authentication helpers for api/* handlers.
// Files under api/_lib are NOT routed as endpoints by Vercel (underscore prefix).
//
// Identity rule: userId is ALWAYS derived from the verified Supabase JWT in the
// Authorization header — never trusted from the request body.
// See: policies/references/system-audit-trainer-20260707.md (Area 2, P0).

const TRAINER_ROLES = [
  'trainer', 'studio_trainer', 'studio_admin',
  'internal_trainer', 'technical_coordinator', 'studio_manager',
] as const;

function supabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}

function serviceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

function serviceHeaders(): Record<string, string> {
  const key = serviceKey();
  return { apikey: key, Authorization: `Bearer ${key}` };
}

export interface AuthedUser {
  id:    string;
  email: string | null;
}

/**
 * Validates the Supabase JWT from the Authorization header against GoTrue.
 * Returns the authenticated user, or null when the header is missing/invalid.
 * Handlers must respond 401 on null — no fallback to body-supplied identity.
 */
export async function verifyRequestUser(req: { headers?: Record<string, string | string[] | undefined> }): Promise<AuthedUser | null> {
  const raw = req.headers?.authorization ?? req.headers?.Authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header?.startsWith('Bearer ')) return null;
  const jwt = header.slice('Bearer '.length).trim();
  if (!jwt) return null;

  const url = supabaseUrl();
  const key = serviceKey();
  if (!url || !key) {
    console.error('[auth] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — cannot verify callers');
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

/** True when the profile role of userId is one of the trainer-side roles. */
export async function isTrainerRole(userId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${supabaseUrl()}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(userId)}&limit=1`,
      { headers: serviceHeaders() },
    );
    if (!res.ok) return false;
    const rows = await res.json() as { role?: string }[];
    const role = rows[0]?.role;
    return !!role && (TRAINER_ROLES as readonly string[]).includes(role);
  } catch {
    return false;
  }
}

/**
 * True when an active trainer↔client link exists between the two users,
 * in either direction. Used to authorize cross-user actions (notifications,
 * workout generation on behalf of a client).
 */
export async function hasActiveLink(userA: string, userB: string): Promise<boolean> {
  const a = encodeURIComponent(userA);
  const b = encodeURIComponent(userB);
  try {
    const res = await fetch(
      `${supabaseUrl()}/rest/v1/trainer_clients?select=id&status=eq.active&or=(and(trainer_id.eq.${a},client_id.eq.${b}),and(trainer_id.eq.${b},client_id.eq.${a}))&limit=1`,
      { headers: serviceHeaders() },
    );
    if (!res.ok) return false;
    const rows = await res.json() as { id: string }[];
    return rows.length > 0;
  } catch {
    return false;
  }
}
