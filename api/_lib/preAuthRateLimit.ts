import { checkRateLimit } from '@vercel/firewall';

const PREAUTH_AI_RATE_LIMIT_ID = 'ai-preauth-burst';
const PREAUTH_AI_RETRY_AFTER_SECONDS = 60;

type RequestWithHeaders = { headers?: Record<string, string | string[] | undefined> };
type RateLimitResponse = {
  setHeader?(name: string, value: string): void;
  status(code: number): RateLimitResponse;
  json(body: unknown): unknown;
};

/**
 * Applies the Vercel-managed IP bucket only after authentication has failed.
 * No IP or network signal enters TrAIner storage, telemetry, logs, or account
 * decisions. In production, a missing/broken WAF rule fails closed for the
 * unauthenticated request so protection cannot silently disappear.
 */
export async function rejectUnauthenticatedAIBurst(
  req: RequestWithHeaders,
  res: RateLimitResponse,
): Promise<boolean> {
  if (process.env.VERCEL_ENV !== 'production') return false;

  try {
    const headers = Object.fromEntries(
      Object.entries(req.headers ?? {}).filter((entry): entry is [string, string | string[]] => entry[1] !== undefined),
    );
    const result = await checkRateLimit(PREAUTH_AI_RATE_LIMIT_ID, { headers });
    if (result.rateLimited) {
      res.setHeader?.('Retry-After', String(PREAUTH_AI_RETRY_AFTER_SECONDS));
      res.status(429).json({ error: 'Too many requests. Please retry shortly.' });
      return true;
    }
    if (result.error === 'not-found') {
      console.error('[ai-preauth-rate-limit] required WAF rule is not configured');
      res.status(503).json({ error: 'AI protection is temporarily unavailable' });
      return true;
    }
    return false;
  } catch {
    console.error('[ai-preauth-rate-limit] WAF check failed');
    res.status(503).json({ error: 'AI protection is temporarily unavailable' });
    return true;
  }
}
