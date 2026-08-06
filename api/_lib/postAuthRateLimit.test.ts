import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkPostAuthAIRateLimit } from './postAuthRateLimit.js';
import { rejectPostAuthAIBurst } from './postAuthRateLimit.js';

vi.mock('./auth.js', () => ({ authServiceHeaders: () => ({}), authSupabaseUrl: () => 'https://example.test' }));

describe('checkPostAuthAIRateLimit', () => {
  beforeEach(() => { vi.unstubAllEnvs(); vi.stubGlobal('fetch', vi.fn()); });
  it('is a no-op unless deliberately enabled', async () => {
    expect(await checkPostAuthAIRateLimit('actor', 'generate-smart-workout')).toBe('allowed');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('observes a limit in shadow mode without blocking', async () => {
    vi.stubEnv('AI_POSTAUTH_RATE_LIMIT_MODE', 'shadow'); vi.stubEnv('AI_POSTAUTH_RATE_LIMIT_HMAC_SECRET', 'test-secret');
    vi.stubEnv('AI_POSTAUTH_RATE_LIMIT_WINDOW_SECONDS', '60'); vi.stubEnv('AI_POSTAUTH_RATE_LIMIT_MAX_REQUESTS', '10');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ limited: true }] }));
    expect(await checkPostAuthAIRateLimit('actor', 'generate-smart-workout')).toBe('would_limit');
  });
  it('fails closed only after an enabled rollout is misconfigured', async () => {
    vi.stubEnv('AI_POSTAUTH_RATE_LIMIT_MODE', 'enforce');
    expect(await checkPostAuthAIRateLimit('actor', 'generate-smart-workout')).toBe('unavailable');
  });
  it('returns a temporary 429 only in enforced mode', async () => {
    vi.stubEnv('AI_POSTAUTH_RATE_LIMIT_MODE', 'enforce'); vi.stubEnv('AI_POSTAUTH_RATE_LIMIT_HMAC_SECRET', 'test-secret');
    vi.stubEnv('AI_POSTAUTH_RATE_LIMIT_WINDOW_SECONDS', '60'); vi.stubEnv('AI_POSTAUTH_RATE_LIMIT_MAX_REQUESTS', '10');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ limited: true }] }));
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnValue({ json: vi.fn() }) };
    await expect(rejectPostAuthAIBurst('actor', 'generate-smart-workout', res)).resolves.toBe(true);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
  });
});
