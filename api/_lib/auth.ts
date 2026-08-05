// Shared auth helpers for api/* handlers — Fase 0 spike of
// docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md.
// Extracted verbatim from api/generate-smart-workout.ts / api/billing-portal.ts
// (identical copies across 7 handlers before this extraction) — no behaviour change.
// If this survives a real Vercel deploy with its code included in the bundle,
// the "Vercel doesn't trace relative imports" comment those handlers carried
// is disproven, and Fases 1-2 of the plan use direct imports instead of codegen.

export const TRAINER_ROLES = [
  'trainer', 'studio_trainer', 'studio_admin',
  'internal_trainer', 'technical_coordinator', 'studio_manager',
] as const;

export function authSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}
export function authServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}
export function authAnonKey(): string {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
}
export function authServiceHeaders(): Record<string, string> {
  const key = authServiceKey();
  return { apikey: key, Authorization: `Bearer ${key}` };
}

export interface AuthedUser { id: string; email: string | null }

/** Accept JSON with an optional charset; never infer an API payload format. */
export function hasJsonContentType(req: { headers?: Record<string, string | string[] | undefined> }): boolean {
  const raw = req.headers?.['content-type'] ?? req.headers?.['Content-Type'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.toLowerCase().startsWith('application/json');
}

export async function verifyRequestUser(req: { headers?: Record<string, string | string[] | undefined> }): Promise<AuthedUser | null> {
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

export async function isTrainerRole(userId: string): Promise<boolean> {
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

export async function hasActiveLink(userA: string, userB: string): Promise<boolean> {
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

/**
 * Consent is read from the persisted profile, never from a client request body.
 * Missing, malformed, or unavailable consent is deliberately treated as denied.
 */
export async function hasPersistedAIAdaptationConsent(userId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${authSupabaseUrl()}/rest/v1/profile_v2?select=consent&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
      { headers: authServiceHeaders() },
    );
    if (!res.ok) return false;
    const rows = await res.json() as { consent?: { allow_ai_adaptation?: unknown } | null }[];
    return rows[0]?.consent?.allow_ai_adaptation === true;
  } catch {
    return false;
  }
}
