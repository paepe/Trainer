import { afterEach, describe, expect, it, vi } from 'vitest';
import { claimAIOperation, claimAIRequest } from './aiOperationIdempotency';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('AI operation idempotency claims', () => {
  it('remains inactive until explicitly enabled', async () => {
    vi.stubEnv('AI_OPERATION_IDEMPOTENCY_ENABLED', 'false');
    const result = await claimAIOperation('trainer_welcome_message', ['student-1', 'trainer-1']);

    expect(result).toEqual({ state: 'disabled' });
  });

  it('fails closed when enabled without its HMAC secret', async () => {
    vi.stubEnv('AI_OPERATION_IDEMPOTENCY_ENABLED', 'true');
    vi.stubEnv('AI_OPERATION_IDEMPOTENCY_HMAC_SECRET', '');
    const result = await claimAIOperation('trainer_welcome_message', ['student-1', 'trainer-1']);

    expect(result).toEqual({ state: 'unavailable' });
  });

  it('uses a non-reversible HMAC key for the database claim', async () => {
    vi.stubEnv('AI_OPERATION_IDEMPOTENCY_ENABLED', 'true');
    vi.stubEnv('AI_OPERATION_IDEMPOTENCY_HMAC_SECRET', 'test-secret');
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ([{ claimed: true }]),
    }) as Response));

    const result = await claimAIOperation('trainer_welcome_message', ['student-1', 'trainer-1']);

    expect(result.state).toBe('claimed');
    expect(result.key).toMatch(/^[a-f0-9]{64}$/);
    expect(result.key).not.toContain('student-1');
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.body as string);
    expect(body.p_operation_key).toBe(result.key);
  });

  it('returns the short-lived cached response for a completed request retry', async () => {
    vi.stubEnv('AI_OPERATION_IDEMPOTENCY_ENABLED', 'true');
    vi.stubEnv('AI_OPERATION_IDEMPOTENCY_HMAC_SECRET', 'test-secret');
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ([{ claimed: false, status: 'completed', response_payload: { workout: { title: 'cached' } } }]),
    }) as Response));

    const result = await claimAIRequest('smart_workout_generation', 'client-1', '2f69a077-8b24-4d8f-bd9c-1fcf73ff7ea1');

    expect(result).toMatchObject({ state: 'completed', response: { workout: { title: 'cached' } } });
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toContain('claim_ai_request');
  });
});
