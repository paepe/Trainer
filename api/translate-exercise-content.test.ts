// Cache-hit items must never reach DeepSeek — that's the whole point of the
// shared cache (docs/SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md, Open Finding).
// Each item is translated with its own isolated DeepSeek call, not batched —
// batching was measured live to make the model misjudge a short,
// lexically-similar item (Portuguese vs. Spanish) as already translated when
// other items in the same request genuinely were. These tests exercise the
// real handler against a mocked fetch, distinguishing calls by URL, so both
// the cache-skip and the one-call-per-item behaviour are asserted against the
// real code path, not reasoned about.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler, { MAX_TRANSLATION_REQUEST_CHARS } from './translate-exercise-content';

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
  return { method: 'POST', headers: { authorization: 'Bearer test-jwt', 'content-type': 'application/json' }, body } as never;
}

// Mock DeepSeek: echoes a per-text translation keyed off the outgoing user
// message, so a test can tell exactly which item each call was for.
function deepSeekEcho(translations: Record<string, string>) {
  return async (url: string, init?: RequestInit) => {
    const text = JSON.parse((init!.body as string)).messages[1].content as string;
    return { ok: true, json: async () => ({ choices: [{ message: { content: translations[text] ?? text } }] }) } as Response;
  };
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
        return deepSeekEcho({ 'Corrida Leve': 'Light Run' })(url, init);
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
    // Only the cache miss went to the model — not the already-cached phrase —
    // and as its own plain-text message, not a batched array.
    const requestBody = JSON.parse((deepseekCalls[0]![1] as RequestInit).body as string);
    expect(requestBody.messages[1].content).toBe('Corrida Leve');
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
  });

  it('calls DeepSeek once per distinct miss, each in its own isolated request', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1' }) } as Response;
      if (url.includes('exercise_content_translations')) return { ok: true, json: async () => ([]) } as Response;
      if (url.includes('api.deepseek.com')) {
        // Distinct per-item translations — proves each call is independent,
        // not one batched call the model could answer inconsistently for.
        return deepSeekEcho({
          'Remada Curvada': 'Remo Curvado',
          'Agachamento Livre': 'Sentadilla Libre',
        })(url, init);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const res = mockRes();
    await handler(
      mockReq({ items: [{ text: 'Remada Curvada' }, { text: 'Agachamento Livre' }], targetLocale: 'es' }),
      res as never,
    );

    expect(res._body).toEqual({
      translations: { 'Remada Curvada': 'Remo Curvado', 'Agachamento Livre': 'Sentadilla Libre' },
    });
    const deepseekCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls
      .filter(([url]) => String(url).includes('api.deepseek.com'));
    expect(deepseekCalls).toHaveLength(2);
  });

  it('rejects an unsupported target locale', async () => {
    const res = mockRes();
    await handler(mockReq({ items: [{ text: 'x' }], targetLocale: 'fr' }), res as never);
    expect(res._status).toBe(400);
  });

  it('rejects a non-array items payload before any provider call', async () => {
    const res = mockRes();
    await handler(mockReq({ items: 'not-an-array', targetLocale: 'en' }), res as never);

    expect(res._status).toBe(400);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url).includes('api.deepseek.com'))).toBe(false);
  });

  it('rejects an oversized items payload instead of silently truncating it', async () => {
    const res = mockRes();
    await handler(
      mockReq({ items: Array.from({ length: 301 }, (_, index) => ({ text: `Exercise ${index}` })), targetLocale: 'en' }),
      res as never,
    );

    expect(res._status).toBe(413);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url).includes('api.deepseek.com'))).toBe(false);
  });

  it('rejects an oversized body before consulting the cache or provider', async () => {
    const res = mockRes();
    await handler(
      mockReq({ targetLocale: 'en', padding: 'x'.repeat(MAX_TRANSLATION_REQUEST_CHARS) }),
      res as never,
    );

    expect(res._status).toBe(413);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) =>
      String(url).includes('exercise_content_translations') || String(url).includes('api.deepseek.com'),
    )).toBe(false);
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

  it('short-circuits with no DeepSeek call when sourceLocale equals targetLocale', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1' }) } as Response;
      if (url.includes('exercise_content_translations')) return { ok: true, json: async () => ([]) } as Response;
      throw new Error(`unexpected fetch: ${url}`);
    });

    const res = mockRes();
    await handler(
      mockReq({ items: [{ text: 'Bird-Dog' }], sourceLocale: 'en', targetLocale: 'en' }),
      res as never,
    );

    expect(res._body).toEqual({ translations: { 'Bird-Dog': 'Bird-Dog' } });
    const deepseekCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls
      .filter(([url]) => String(url).includes('api.deepseek.com'));
    expect(deepseekCalls).toHaveLength(0);
  });

  it('declares the caller-supplied sourceLocale in the DeepSeek prompt, not a hardcoded Portuguese assumption', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1' }) } as Response;
      if (url.includes('exercise_content_translations') && (!init || !init.method || init.method === 'GET')) {
        return { ok: true, json: async () => ([]) } as Response;
      }
      if (url.includes('exercise_content_translations') && init?.method === 'POST') {
        return { ok: true, json: async () => ([]) } as Response;
      }
      if (url.includes('api.deepseek.com')) {
        return deepSeekEcho({ 'Bird-Dog': 'Pássaro-Cachorro' })(url, init);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const res = mockRes();
    await handler(
      mockReq({ items: [{ text: 'Bird-Dog' }], sourceLocale: 'en', targetLocale: 'pt' }),
      res as never,
    );

    const deepseekCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls
      .filter(([url]) => String(url).includes('api.deepseek.com'));
    const systemPrompt = JSON.parse((deepseekCalls[0]![1] as RequestInit).body as string).messages[0].content as string;
    expect(systemPrompt).toContain('in English');
    expect(systemPrompt).toContain('from English into Portuguese (Brazil)');
  });

  it('writes the cache row on the corrected 3-column conflict target, including source_locale', async () => {
    let capturedOnConflictParam: string | null = null;
    let capturedBody: unknown = null;
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1' }) } as Response;
      if (url.includes('exercise_content_translations') && (!init || !init.method || init.method === 'GET')) {
        return { ok: true, json: async () => ([]) } as Response;
      }
      if (url.includes('exercise_content_translations') && init?.method === 'POST') {
        capturedOnConflictParam = new URL(url).searchParams.get('on_conflict');
        capturedBody = JSON.parse(init.body as string);
        return { ok: true, json: async () => ([]) } as Response;
      }
      if (url.includes('api.deepseek.com')) return deepSeekEcho({ 'Bird-Dog': 'Cão-Pássaro' })(url, init);
      throw new Error(`unexpected fetch: ${url}`);
    });

    const res = mockRes();
    await handler(
      mockReq({ items: [{ text: 'Bird-Dog' }], sourceLocale: 'en', targetLocale: 'pt' }),
      res as never,
    );

    expect(capturedOnConflictParam).toBe('source_text,source_locale,target_locale');
    expect(capturedBody).toEqual([
      { source_text: 'Bird-Dog', source_locale: 'en', target_locale: 'pt', translated_text: 'Cão-Pássaro' },
    ]);
  });

  it('defaults sourceLocale to pt when the caller omits it, preserving trainer-typed-content behaviour', async () => {
    let capturedQuery = '';
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1' }) } as Response;
      if (url.includes('exercise_content_translations') && (!init || !init.method || init.method === 'GET')) {
        capturedQuery = url;
        return { ok: true, json: async () => ([]) } as Response;
      }
      if (url.includes('exercise_content_translations') && init?.method === 'POST') {
        return { ok: true, json: async () => ([]) } as Response;
      }
      if (url.includes('api.deepseek.com')) return deepSeekEcho({ 'Corrida Leve': 'Light Run' })(url, init);
      throw new Error(`unexpected fetch: ${url}`);
    });

    const res = mockRes();
    await handler(mockReq({ items: [{ text: 'Corrida Leve' }], targetLocale: 'en' }), res as never);

    expect(capturedQuery).toContain('source_locale=eq.pt');
  });

  it('a failure translating one item does not block the others', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1' }) } as Response;
      if (url.includes('exercise_content_translations')) return { ok: true, json: async () => ([]) } as Response;
      if (url.includes('api.deepseek.com')) {
        const text = JSON.parse((init!.body as string)).messages[1].content as string;
        if (text === 'Corrida Leve') return { ok: false, status: 500, json: async () => ({}) } as Response;
        return deepSeekEcho({ 'Agachamento Livre': 'Sentadilla Libre' })(url, init);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const res = mockRes();
    await handler(
      mockReq({ items: [{ text: 'Corrida Leve' }, { text: 'Agachamento Livre' }], targetLocale: 'es' }),
      res as never,
    );

    expect(res._body).toEqual({
      translations: { 'Corrida Leve': 'Corrida Leve', 'Agachamento Livre': 'Sentadilla Libre' },
    });
  });

  it('caps concurrent provider calls during a large cache miss', async () => {
    let active = 0;
    let maxActive = 0;
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1' }) } as Response;
      if (url.includes('exercise_content_translations')) return { ok: true, json: async () => ([]) } as Response;
      if (url.includes('api.deepseek.com')) {
        active += 1;
        maxActive = Math.max(maxActive, active);
        const text = JSON.parse((init!.body as string)).messages[1].content as string;
        await new Promise(resolve => setTimeout(resolve, 5));
        active -= 1;
        return { ok: true, json: async () => ({ choices: [{ message: { content: `${text} translated` } }] }) } as Response;
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const res = mockRes();
    await handler(
      mockReq({
        items: Array.from({ length: 20 }, (_, index) => ({ text: `Exercise ${index}` })),
        targetLocale: 'en',
      }),
      res as never,
    );

    expect(res._status).toBe(200);
    expect(maxActive).toBeLessThanOrEqual(8);
  });
});
