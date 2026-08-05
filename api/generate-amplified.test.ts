import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { minimizeAmplifiedProfile } from './generate-amplified';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
process.env.SUPABASE_ANON_KEY = 'anon-key';
process.env.DEEPSEEK_API_KEY = 'deepseek-key';

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

describe('POST /api/generate-amplified', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('rejects an unauthenticated request before invoking an external provider', async () => {
    const res = mockRes();
    await handler(request({}, false), res as never);

    expect(res._status).toBe(401);
  });

  it('requires consent persisted in profile_v2 rather than accepting consent from the body', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1' }) } as Response;
      if (url.includes('/rest/v1/profile_v2')) return { ok: true, json: async () => ([{ consent: { allow_ai_adaptation: false } }]) } as Response;
      throw new Error(`unexpected fetch: ${url}`);
    }));
    const res = mockRes();

    await handler(request({ consent: { allow_ai_adaptation: true } }), res as never);

    expect(res._status).toBe(403);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url).includes('api.deepseek.com'))).toBe(false);
  });

  it('sends only the minimized operational profile after verified consent', async () => {
    let providerBody: unknown;
    let profileReads = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1' }) } as Response;
      if (url.includes('/rest/v1/profile_v2')) {
        profileReads += 1;
        if (profileReads === 1) return { ok: true, json: async () => ([{ consent: { allow_ai_adaptation: true } }]) } as Response;
        return {
          ok: true,
          json: async () => ([{
            objectives: { primary_goal: 'strength_gain', secondary_goals: ['mobility'], voice_note: 'Stored private voice' },
            declared_health: { has_condition: true, categories: ['cardiovascular'], free_text: 'Stored clinical detail', voice_note: 'Stored private dictation' },
            sensitive_factors: { regular_medications: 'Stored medication' },
            body_rhythm: { enabled: true, cycle_current_day: 12 },
          }]),
        } as Response;
      }
      if (url.includes('api.deepseek.com')) {
        providerBody = JSON.parse(init?.body as string);
        return { ok: true, json: async () => ({ choices: [{ message: { content: '{"narrative":"ok","training_profile":{}}' } }] }) } as Response;
      }
      throw new Error(`unexpected fetch: ${url}`);
    }));
    const res = mockRes();

    await handler(request({
      objectives: { primary_goal: 'injected goal', voice_note: 'Injected private voice' },
      declared_health: { free_text: 'Injected clinical detail' },
    }), res as never);

    expect(res._status).toBe(200);
    const userMessage = (providerBody as { messages: { content: string }[] }).messages[1]?.content;
    expect(userMessage).toContain('strength_gain');
    expect(userMessage).toContain('cardiovascular');
    expect(userMessage).not.toContain('Stored clinical detail');
    expect(userMessage).not.toContain('Stored private dictation');
    expect(userMessage).not.toContain('Stored medication');
    expect(userMessage).not.toContain('cycle_current_day');
    expect(userMessage).not.toContain('injected goal');
    expect(userMessage).not.toContain('Injected private voice');
  });
});

describe('minimizeAmplifiedProfile', () => {
  it('never retains free text or sensitive raw fields', () => {
    const minimized = minimizeAmplifiedProfile({
      objectives: { primary_goal: 'mobility', voice_note: 'raw voice' },
      declared_health: { has_condition: true, free_text: 'clinical text' },
      sensitive_factors: { regular_medications: 'medication' },
      body_rhythm: { cycle_current_day: 12 },
    });

    expect(JSON.stringify(minimized)).not.toContain('raw voice');
    expect(JSON.stringify(minimized)).not.toContain('clinical text');
    expect(JSON.stringify(minimized)).not.toContain('medication');
    expect(JSON.stringify(minimized)).not.toContain('cycle_current_day');
  });
});
