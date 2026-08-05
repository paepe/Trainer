import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './send-welcome-message';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
process.env.SUPABASE_ANON_KEY = 'anon-key';
process.env.DEEPSEEK_API_KEY = 'deepseek-key';

function mockRes() {
  const res = {
    _status: 200, _body: undefined as unknown,
    status(c: number) { res._status = c; return res; },
    json(b: unknown) { res._body = b; return res; },
  };
  return res;
}

describe('POST /api/send-welcome-message', () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllEnvs());

  it('rejects an unauthenticated caller before generation', async () => {
    const res = mockRes();
    await handler({ method: 'POST', headers: {}, body: { trainerId: 'trainer-1' } }, res as never);
    expect(res._status).toBe(401);
  });

  it('requires an active link between the authenticated student and trainer', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'student-1' }) } as Response;
      if (url.includes('/rest/v1/trainer_clients')) return { ok: true, json: async () => ([]) } as Response;
      throw new Error(`unexpected fetch: ${url}`);
    }));
    const res = mockRes();

    await handler({
      method: 'POST', headers: { authorization: 'Bearer test-jwt' }, body: { trainerId: 'trainer-1' },
    }, res as never);

    expect(res._status).toBe(403);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url).includes('api.deepseek.com'))).toBe(false);
  });

  it('does not generate another message when a persisted welcome already exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'student-1' }) } as Response;
      if (url.includes('/rest/v1/trainer_clients')) return { ok: true, json: async () => ([{ id: 'link-1' }]) } as Response;
      if (url.includes('/rest/v1/notification_log')) return { ok: true, json: async () => ([{ id: 'message-1' }]) } as Response;
      throw new Error(`unexpected fetch: ${url}`);
    }));
    const res = mockRes();

    await handler({
      method: 'POST', headers: { authorization: 'Bearer test-jwt' }, body: { trainerId: 'trainer-1' },
    }, res as never);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({ ok: true, duplicate: true });
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url).includes('api.deepseek.com'))).toBe(false);
  });

  it('fails closed before generation when the enabled atomic claim is unavailable', async () => {
    vi.stubEnv('AI_OPERATION_IDEMPOTENCY_ENABLED', 'true');
    vi.stubEnv('AI_OPERATION_IDEMPOTENCY_HMAC_SECRET', '');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'student-1' }) } as Response;
      if (url.includes('/rest/v1/trainer_clients')) return { ok: true, json: async () => ([{ id: 'link-1' }]) } as Response;
      if (url.includes('/rest/v1/notification_log')) return { ok: true, json: async () => ([]) } as Response;
      throw new Error(`unexpected fetch: ${url}`);
    }));
    const res = mockRes();

    await handler({
      method: 'POST', headers: { authorization: 'Bearer test-jwt' }, body: { trainerId: 'trainer-1' },
    }, res as never);

    expect(res._status).toBe(503);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url).includes('api.deepseek.com'))).toBe(false);
  });
});
