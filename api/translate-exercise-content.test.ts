// Cache-hit items must never reach DeepSeek — that's the whole point of the
// shared cache (docs/SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md, Open Finding).
// These tests exercise the real handler against a mocked fetch, distinguishing
// calls by URL: Supabase auth, the translation cache table (read + write), and
// DeepSeek — so cache-skip behaviour is asserted against the real code path,
// not reasoned about.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from './translate-exercise-content';

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
    end() {},
    setHeader() {},
  };
  return res;
}

function mockReq(body: unknown) {
  return { method: 'POST', headers: { authorization: 'Bearer test-jwt' }, body } as never;
}

describe('POST /api/translate-exercise-content', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/auth/v1/user')) {
        return { ok: true, json: async () => ({ id: 'user-1' }) } as Response;
      }
      if (url.includes('exercise_content_translations') && (!init || init.method === undefined || init.method === 'GET')) {
        // Cache read: "Agachamento Livre" is already cached for 'en'; "Corrida Leve" is not.
        return {
          ok: true,
          json: async () => ([
            { source_text: 'Agachamento Livre', target_locale: 'en', translated_text: 'Free Squat' },
          ]),
        } as Response;
      }
      if (url.includes('exercise_content_translations') && init?.method === 'POST') {
        return { ok: true, json: async () => ([]) } as Response;
      }
      if (url.includes('api.deepseek.com')) {
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify(['Light Run']) } }],
          }),
        } as Response;
      }
      throw new Error(`unexpected fetch: ${url}`);
    }));
  });

  it('skips DeepSeek entirely for a cache hit, and translates only the miss', async () => {
    const res = mockRes();
    await handler(
      mockReq({ items: [{ text: 'Agachamento Livre' }, { text: 'Corrida Leve' }], targetLocale: 'en' }),
      res as never,
    );

    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      translations: { 'Agachamento Livre': 'Free Squat', 'Corrida Leve': 'Light Run' },
    });

    const deepseekCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls
      .filter(([url]) => String(url).includes('api.deepseek.com'));
    expect(deepseekCalls).toHaveLength(1);
    // Only the cache miss went to the model — not the already-cached phrase.
    const requestBody = JSON.parse((deepseekCalls[0]![1] as RequestInit).body as string);
    expect(JSON.parse(requestBody.messages[1].content)).toEqual(['Corrida Leve']);
  });

  it('deduplicates repeated text within one request', async () => {
    const res = mockRes();
    await handler(
      mockReq({ items: [{ text: 'Corrida Leve' }, { text: 'Corrida Leve' }], targetLocale: 'en' }),
      res as never,
    );

    const deepseekCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls
      .filter(([url]) => String(url).includes('api.deepseek.com'));
    expect(deepseekCalls).toHaveLength(1);
    const requestBody = JSON.parse((deepseekCalls[0]![1] as RequestInit).body as string);
    expect(JSON.parse(requestBody.messages[1].content)).toEqual(['Corrida Leve']);
  });

  it('rejects an unsupported target locale', async () => {
    const res = mockRes();
    await handler(mockReq({ items: [{ text: 'x' }], targetLocale: 'fr' }), res as never);
    expect(res._status).toBe(400);
  });

  it('rejects a request with no Authorization header', async () => {
    const res = mockRes();
    await handler(
      { method: 'POST', headers: {}, body: { items: [{ text: 'x' }], targetLocale: 'en' } } as never,
      res as never,
    );
    expect(res._status).toBe(401);
  });

  it('falls back to the source text when DeepSeek fails, instead of blocking the response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1' }) } as Response;
      if (url.includes('exercise_content_translations')) return { ok: true, json: async () => ([]) } as Response;
      if (url.includes('api.deepseek.com')) return { ok: false, status: 500, json: async () => ({}) } as Response;
      throw new Error(`unexpected fetch: ${url}`);
    });

    const res = mockRes();
    await handler(mockReq({ items: [{ text: 'Corrida Leve' }], targetLocale: 'en' }), res as never);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({ translations: { 'Corrida Leve': 'Corrida Leve' } });
  });
});
