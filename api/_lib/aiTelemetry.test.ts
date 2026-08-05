import { afterEach, describe, expect, it, vi } from 'vitest';
import { emitAIUsageEvent } from './aiTelemetry.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AI usage telemetry', () => {
  it('does nothing unless telemetry is explicitly enabled', async () => {
    delete process.env.AI_USAGE_TELEMETRY_ENABLED;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await emitAIUsageEvent({
      actorId: 'sensitive-user-id', endpoint: 'parse-voice', outcome: 'rejected', httpStatus: 403,
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('writes only the minimized event contract', async () => {
    process.env.AI_USAGE_TELEMETRY_ENABLED = 'true';
    process.env.AI_USAGE_TELEMETRY_HMAC_SECRET = 'test-hmac-secret';
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await emitAIUsageEvent({
      actorId: 'sensitive-user-id',
      endpoint: 'parse-voice',
      outcome: 'rejected',
      httpStatus: 403,
      rejectionCode: 'entitlement_denied',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.supabase.co/rest/v1/ai_usage_events');
    const payload = JSON.parse(String(init.body));
    expect(payload).toMatchObject({
      endpoint: 'parse-voice',
      outcome: 'rejected',
      http_status: 403,
      rejection_code: 'entitlement_denied',
      cost_method: 'unavailable',
    });
    expect(payload.actor_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.actor_hash).not.toBe('sensitive-user-id');
    expect(payload.request_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(payload)).not.toContain('sensitive-user-id');
  });

  it('contains telemetry write failures without retrying the request', async () => {
    process.env.AI_USAGE_TELEMETRY_ENABLED = 'true';
    process.env.AI_USAGE_TELEMETRY_HMAC_SECRET = 'test-hmac-secret';
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    const fetchMock = vi.fn(async () => { throw new Error('collector offline'); });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(emitAIUsageEvent({
      actorId: 'user-1', endpoint: 'generate-workout', outcome: 'succeeded', httpStatus: 200,
    })).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
