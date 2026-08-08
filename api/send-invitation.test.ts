import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './send-invitation';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
process.env.SUPABASE_ANON_KEY = 'anon-key';

function mockRes() {
  const res = {
    _status: 200, _body: undefined as unknown,
    status(code: number) { res._status = code; return res; },
    json(body: unknown) { res._body = body; return res; },
  };
  return res;
}

describe('POST /api/send-invitation', () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllEnvs());

  it('rejects an existing TRAINER recipient before creating an invitation or sending e-mail', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'inviter-1', email: 'trainer-a@test' }) } as Response;
      if (url.includes('/rest/v1/profiles?select=role&id=eq.inviter-1')) return { ok: true, json: async () => ([{ role: 'trainer' }]) } as Response;
      if (url.includes('/rest/v1/subscriptions?')) return { ok: true, json: async () => ([]) } as Response;
      if (url.includes('/rest/v1/trainer_clients?select=id&trainer_id=')) return { ok: true, json: async () => ([]) } as Response;
      if (url.includes('/rest/v1/profiles?select=id,role,trainer_clients')) return { ok: true, json: async () => ([{ id: 'trainer-b', role: 'trainer', trainer_clients: [] }]) } as Response;
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = mockRes();

    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer test-jwt' },
      body: { invitedEmail: 'trainer-b@test', invitedName: 'Trainer B' },
    }, res as never);

    expect(res._status).toBe(409);
    expect(res._body).toEqual({ error: 'recipient_not_client' });
    expect(fetchMock.mock.calls.some(([url, options]) => String(url).endsWith('/rest/v1/trainer_invitations') && (options as RequestInit | undefined)?.method === 'POST')).toBe(false);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('api.resend.com'))).toBe(false);
  });
});
