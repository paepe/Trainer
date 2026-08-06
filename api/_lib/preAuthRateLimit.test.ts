import { beforeEach, describe, expect, it, vi } from 'vitest';

const { checkRateLimit } = vi.hoisted(() => ({ checkRateLimit: vi.fn() }));
vi.mock('@vercel/firewall', () => ({ checkRateLimit }));

import { rejectUnauthenticatedAIBurst } from './preAuthRateLimit';

function mockRes() {
  const res = {
    _status: 200,
    _body: undefined as unknown,
    _headers: {} as Record<string, string>,
    setHeader(name: string, value: string) { res._headers[name] = value; },
    status(code: number) { res._status = code; return res; },
    json(body: unknown) { res._body = body; return res; },
  };
  return res;
}

describe('rejectUnauthenticatedAIBurst', () => {
  const originalEnvironment = process.env.VERCEL_ENV;

  beforeEach(() => {
    process.env.VERCEL_ENV = 'production';
    checkRateLimit.mockReset();
  });

  it('returns 429 with Retry-After when the shared WAF bucket is exceeded', async () => {
    checkRateLimit.mockResolvedValue({ rateLimited: true });
    const res = mockRes();

    expect(await rejectUnauthenticatedAIBurst({ headers: { host: 'trainer-lake.vercel.app' } }, res)).toBe(true);
    expect(res._status).toBe(429);
    expect(res._headers['Retry-After']).toBe('60');
  });

  it('fails closed in production when the required WAF rule is absent', async () => {
    checkRateLimit.mockResolvedValue({ rateLimited: false, error: 'not-found' });
    const res = mockRes();

    expect(await rejectUnauthenticatedAIBurst({ headers: {} }, res)).toBe(true);
    expect(res._status).toBe(503);
  });

  it('does not invoke the shared network bucket outside production', async () => {
    process.env.VERCEL_ENV = 'preview';
    const res = mockRes();

    expect(await rejectUnauthenticatedAIBurst({ headers: {} }, res)).toBe(false);
    expect(checkRateLimit).not.toHaveBeenCalled();
    process.env.VERCEL_ENV = originalEnvironment;
  });
});
