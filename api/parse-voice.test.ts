import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './parse-voice';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
process.env.SUPABASE_ANON_KEY = 'anon-key';

function mockRes() {
  const res = {
    _status: 200, _body: undefined as unknown,
    status(c: number) { res._status = c; return res; },
    json(b: unknown) { res._body = b; return res; },
  };
  return res;
}

describe('POST /api/parse-voice', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('rejects an anonymous voice parsing request', async () => {
    const res = mockRes();
    await handler({ method: 'POST', headers: {}, body: { transcript: 'I feel good today' } }, res as never);
    expect(res._status).toBe(401);
  });

  it('denies callers without both required check-in entitlements before the provider', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'client-1' }) } as Response;
      if (url.includes('/rest/v1/subscriptions')) return { ok: true, json: async () => ([{ plan_key: 'free', status: 'active' }]) } as Response;
      if (url.includes('/rest/v1/feature_permissions')) return { ok: true, json: async () => ([]) } as Response;
      throw new Error(`unexpected fetch: ${url}`);
    }));
    const res = mockRes();

    await handler({
      method: 'POST', headers: { authorization: 'Bearer test-jwt', 'content-type': 'application/json' },
      body: { transcript: 'I feel good today' },
    }, res as never);

    expect(res._status).toBe(403);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url).includes('api.deepseek.com'))).toBe(false);
  });
});
