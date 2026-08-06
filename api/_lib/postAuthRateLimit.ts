// Post-auth AI limiter foundation. It is intentionally inert until Product,
// Privacy and Engineering approve a measured ruleset. It never stores a raw
// actor id: the RPC receives a server-side HMAC only.
import { createHmac } from 'node:crypto';
import { authServiceHeaders, authSupabaseUrl } from './auth.js';
import type { AIEndpoint } from './aiTelemetry.js';

export type PostAuthRateLimitMode = 'off' | 'shadow' | 'enforce';
export type PostAuthRateLimitResult = 'allowed' | 'would_limit' | 'limited' | 'unavailable';

function mode(): PostAuthRateLimitMode {
  const value = process.env.AI_POSTAUTH_RATE_LIMIT_MODE;
  return value === 'shadow' || value === 'enforce' ? value : 'off';
}

function actorHash(actorId: string): string | null {
  const secret = process.env.AI_POSTAUTH_RATE_LIMIT_HMAC_SECRET;
  return secret ? createHmac('sha256', secret).update(actorId).digest('hex') : null;
}

/**
 * Atomically consumes an approved actor+endpoint bucket. Missing config fails
 * closed only once a limiter has been deliberately enabled; mode=off is a
 * no-op so rollout cannot accidentally alter production behavior.
 */
export async function checkPostAuthAIRateLimit(actorId: string, endpoint: AIEndpoint): Promise<PostAuthRateLimitResult> {
  const currentMode = mode();
  if (currentMode === 'off') return 'allowed';
  const hash = actorHash(actorId);
  const windowSeconds = Number(process.env.AI_POSTAUTH_RATE_LIMIT_WINDOW_SECONDS);
  const maxRequests = Number(process.env.AI_POSTAUTH_RATE_LIMIT_MAX_REQUESTS);
  if (!hash || !Number.isInteger(windowSeconds) || !Number.isInteger(maxRequests) || windowSeconds < 10 || maxRequests < 1) {
    return 'unavailable';
  }
  try {
    const response = await fetch(`${authSupabaseUrl()}/rest/v1/rpc/consume_ai_rate_limit_bucket`, {
      method: 'POST', headers: { ...authServiceHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_actor_hash: hash, p_endpoint: endpoint, p_window_seconds: windowSeconds, p_max_requests: maxRequests }),
    });
    if (!response.ok) return 'unavailable';
    const rows = await response.json() as { limited?: boolean }[];
    if (!rows[0]?.limited) return 'allowed';
    return currentMode === 'shadow' ? 'would_limit' : 'limited';
  } catch { return 'unavailable'; }
}
