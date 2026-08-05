import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './cleanup-voice-note';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
process.env.SUPABASE_ANON_KEY = 'anon-key';

function mockRes() {
  const res = {
    _status: 200,
    _body: undefined as unknown,
    status(c: number) { res._status = c; return res; },
    json(b: unknown) { res._body = b; return res; },
  };
  return res;
}

function request(body: Record<string, unknown>, authenticated = true) {
  return {
    method: 'POST', body,
    headers: authenticated ? { authorization: 'Bearer test-jwt', 'content-type': 'application/json' } : {},
  } as never;
}

describe('POST /api/cleanup-voice-note', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('rejects anonymous requests before an external AI call', async () => {
    const res = mockRes();
    await handler(request({ transcript: 'hello', purpose: 'onboarding' }, false), res as never);

    expect(res._status).toBe(401);
  });

  it('requires persisted consent for onboarding voice cleanup', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1' }) } as Response;
      if (url.includes('/rest/v1/profile_v2')) return { ok: true, json: async () => ([{ consent: null }]) } as Response;
      throw new Error(`unexpected fetch: ${url}`);
    }));
    const res = mockRes();

    await handler(request({ transcript: 'private onboarding text', purpose: 'onboarding' }), res as never);

    expect(res._status).toBe(403);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url).includes('api.deepseek.com'))).toBe(false);
  });

  it('requires a declared cleanup purpose', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1' }) } as Response;
      throw new Error(`unexpected fetch: ${url}`);
    }));
    const res = mockRes();

    await handler(request({ transcript: 'hello' }), res as never);

    expect(res._status).toBe(400);
  });
});
