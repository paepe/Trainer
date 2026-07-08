import { test, expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test';

// Validates the P0 remediation (system-audit-trainer-20260707.md, Area 2):
// every user-scoped api/*.ts endpoint must derive identity from a verified
// Supabase JWT and never trust body-supplied userId/trainerId/fromUserId.
//
// Uses real Supabase auth (password grant) with the documented test accounts
// (TEST-ACCOUNTS.md, universal password) — this is a live check against the
// real GoTrue instance, not a mock, so it catches regressions the same way a
// manual smoke pass would.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY!;
const PASSWORD     = 'TrAIner2026!';

async function loginAs(email: string): Promise<{ token: string; userId: string }> {
  const ctx = await playwrightRequest.newContext();
  const res = await ctx.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    data: { email, password: PASSWORD },
  });
  expect(res.ok(), `login failed for ${email}: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  await ctx.dispose();
  return { token: body.access_token, userId: body.user.id };
}

let client: { token: string; userId: string };
let trainer: { token: string; userId: string };

test.beforeAll(async () => {
  [client, trainer] = await Promise.all([
    loginAs('tiago.moreira@client.test'),
    loginAs('carlos.silva@trainer.test'),
  ]);
});

const USER_SCOPED_ENDPOINTS = [
  'send-notification',
  'create-checkout-session',
  'billing-portal',
  'send-invitation',
  'generate-workout',
  'generate-smart-workout',
];

for (const endpoint of USER_SCOPED_ENDPOINTS) {
  test(`POST /api/${endpoint} rejects requests with no Authorization header`, async ({ request }) => {
    const res = await request.post(`/api/${endpoint}`, { data: {} });
    // Some handlers validate the body before the auth gate (400) or fail
    // earlier on missing local secrets (500 — e.g. Stripe key not configured
    // in this environment) — the one outcome that must NEVER happen is a 2xx.
    expect(res.status(), `${endpoint} must not succeed without auth`).toBeGreaterThanOrEqual(400);
    if (res.status() === 401) {
      expect((await res.json()).error).toBe('Unauthorized');
    }
  });
}

test('POST /api/generate-smart-workout rejects a well-formed body with no auth (401, not 400)', async ({ request }) => {
  const res = await request.post('/api/generate-smart-workout', {
    data: { trainer: { id: 't1' }, client: { id: 'c1' }, today: {}, task: { type: 'daily_insight' } },
  });
  expect(res.status()).toBe(401);
});

test('send-notification: self-notification passes the auth gate (reaches downstream logic, not 401/403)', async ({ request }) => {
  const res = await request.post('/api/send-notification', {
    headers: { Authorization: `Bearer ${client.token}` },
    data: { userId: client.userId, title: 'e2e smoke test', body: 'self-notify' },
  });
  expect(res.status(), await res.text()).not.toBe(401);
  expect(res.status()).not.toBe(403);
});

test('send-notification: cross-user notification to an unrelated recipient is rejected 403', async ({ request }) => {
  const res = await request.post('/api/send-notification', {
    headers: { Authorization: `Bearer ${client.token}` },
    data: { userId: '00000000-0000-0000-0000-000000000000', title: 'x', body: 'y' },
  });
  expect(res.status()).toBe(403);
  expect((await res.json()).error).toBe('No active trainer/client link with recipient');
});

test('generate-smart-workout: caller impersonating a different client is rejected 403', async ({ request }) => {
  const res = await request.post('/api/generate-smart-workout', {
    headers: { Authorization: `Bearer ${client.token}` },
    data: {
      trainer: { id: 'ai-coach' },
      client:  { id: '00000000-0000-0000-0000-000000000000' },
      today:   { readinessScore: 70, safetyStatus: 'clear' },
      task:    { type: 'daily_insight' },
      locale:  'en',
    },
  });
  expect(res.status()).toBe(403);
  expect((await res.json()).error).toBe('Caller is not the client or their linked trainer');
});

test('generate-smart-workout: caller acting as themself as client passes the identity gate', async ({ request }) => {
  const res = await request.post('/api/generate-smart-workout', {
    headers: { Authorization: `Bearer ${client.token}` },
    data: {
      trainer: { id: 'ai-coach' },
      client:  { id: client.userId },
      today:   { readinessScore: 70, safetyStatus: 'clear' },
      task:    { type: 'daily_insight' },
      locale:  'en',
    },
  });
  // Passes the auth gate — any failure past this point is unrelated business
  // logic (incomplete synthetic payload), never the identity check.
  expect(res.status()).not.toBe(401);
  expect(res.status()).not.toBe(403);
});

test('generate-workout: full authenticated generation succeeds end-to-end', async ({ request }) => {
  const res = await request.post('/api/generate-workout', {
    headers: { Authorization: `Bearer ${client.token}` },
    data: { checkin: { energy: 7, minutes: 30, goal: 'strength' }, locale: 'en' },
  });
  expect(res.status(), await res.text()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.exercises)).toBeTruthy();
  expect(body.exercises.length).toBeGreaterThan(0);
});

test('send-invitation: a client caller (non-trainer role) is rejected 403', async ({ request }) => {
  const res = await request.post('/api/send-invitation', {
    headers: { Authorization: `Bearer ${client.token}` },
    data: { invitedEmail: 'nobody@example.com', invitedName: 'Nobody' },
  });
  expect(res.status()).toBe(403);
  expect((await res.json()).error).toBe('Only trainers can send invitations');
});
