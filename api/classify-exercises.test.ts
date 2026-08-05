import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './classify-exercises';

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

describe('POST /api/classify-exercises', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('rejects anonymous callers before validating or sending a batch', async () => {
    const res = mockRes();
    await handler({ method: 'POST', headers: {}, body: {} }, res);
    expect(res._status).toBe(401);
  });

  it('requires a trainer role before invoking the provider', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'client-1' }) } as Response;
      if (url.includes('/rest/v1/profiles')) return { ok: true, json: async () => ([{ role: 'client' }]) } as Response;
      throw new Error(`unexpected fetch: ${url}`);
    }));
    const res = mockRes();

    await handler({
      method: 'POST', headers: { authorization: 'Bearer test-jwt' },
      body: { exercises: [{ id: 'exercise-1', name: 'Squat', muscle_group: 'Legs' }] },
    }, res);

    expect(res._status).toBe(403);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url).includes('api.deepseek.com'))).toBe(false);
  });

  it('rejects unbounded exercise fields before the provider', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'trainer-1' }) } as Response;
      if (url.includes('/rest/v1/profiles')) return { ok: true, json: async () => ([{ role: 'trainer' }]) } as Response;
      throw new Error(`unexpected fetch: ${url}`);
    }));
    const res = mockRes();

    await handler({
      method: 'POST', headers: { authorization: 'Bearer test-jwt' },
      body: { exercises: [{ id: 'exercise-1', name: 'x'.repeat(201), muscle_group: 'Legs' }] },
    }, res);

    expect(res._status).toBe(400);
  });
});
