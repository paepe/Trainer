import { test, expect, request as playwrightRequest, type Page } from '@playwright/test';

// Live UI regression pass over the trainer workout-plan editor, covering the
// time-fit work (2026-07-30): the AI must fill the client's available window,
// and the trainer must be warned when a plan under- or over-runs it.
//
// Auth reuses the same password-grant helper as api-auth-gate.spec.ts — the
// documented test accounts (TEST-ACCOUNTS.md) against the real GoTrue instance.
// The session is injected into localStorage so the app boots already signed in.
//
// PREREQUISITE — serve the app with:  npm run dev:local
// .env.local sets VITE_API_URL to the deployed origin and resolveWorkoutApiBase()
// gives it precedence, so a plain `npm run dev` sends "Ask AI" to PRODUCTION
// instead of the local api-server — the AI assertions here would then be testing
// whatever is deployed, not the working tree. `dev:local` clears that variable.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY!;
const PASSWORD     = 'TrAIner2026!';
const APP_URL      = process.env.E2E_APP_URL ?? 'http://localhost:5173';

// supabase-js v2 default storage key: sb-<project-ref>-auth-token
const PROJECT_REF  = new URL(SUPABASE_URL).hostname.split('.')[0]!;
const STORAGE_KEY  = `sb-${PROJECT_REF}-auth-token`;

async function sessionFor(email: string): Promise<unknown> {
  const ctx = await playwrightRequest.newContext();
  const res = await ctx.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    data: { email, password: PASSWORD },
  });
  expect(res.ok(), `login failed for ${email}: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  await ctx.dispose();
  return { ...body, expires_at: Math.floor(Date.now() / 1000) + body.expires_in };
}

let trainerSession: unknown;

test.beforeAll(async () => {
  trainerSession = await sessionFor('carlos.silva@trainer.test');
});

/** Boots the app already authenticated as the trainer, on the client list. */
async function openTrainerApp(page: Page) {
  await page.addInitScript(
    ([key, session]) => window.localStorage.setItem(key as string, JSON.stringify(session)),
    [STORAGE_KEY, trainerSession] as const,
  );
  await page.goto(APP_URL);
  await expect(page.getByText('Meus Clientes')).toBeVisible({ timeout: 20_000 });
}

/** Client list -> first client -> plan editor.
 *  carlos.silva has language=pt persisted in `preferences`, and App.tsx applies
 *  that over the device locale — so the UI here is Portuguese by design. Using
 *  the PT strings keeps the test honest (and covers the pt.json copy too). */
async function openPlanEditor(page: Page, clientFirstName = 'Tiago') {
  // Only the "Ver →" button opens the client; the row itself is not clickable.
  const row = page.locator('div').filter({ hasText: new RegExp(`^${clientFirstName}`) })
    .locator('button', { hasText: 'Ver' }).first();
  await row.click();
  await page.getByRole('button', { name: /Criar Plano para/i }).click();
  await expect(page.getByRole('button', { name: /Perguntar à IA/i })).toBeVisible();
}

async function addManualExercise(page: Page, name: string) {
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await page.getByPlaceholder('Nome do exercício').fill(name);
  await page.getByRole('button', { name: 'Adicionar exercício' }).click();
}

test('reps/duration switch is labelled once — no duplicated column header', async ({ page }) => {
  await openTrainerApp(page);
  await openPlanEditor(page);

  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(page.getByText('Reps', { exact: true })).toHaveCount(1);

  await page.getByText('Duração', { exact: true }).click();
  await expect(page.getByText('Duração', { exact: true })).toHaveCount(1);
});

test('a duration exercise with no hold time is refused instead of saving 0', async ({ page }) => {
  await openTrainerApp(page);
  await openPlanEditor(page);

  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await page.getByText('Duração', { exact: true }).click();
  await page.getByPlaceholder('Nome do exercício').fill('Plank');
  await page.getByPlaceholder('Duração (s)').fill('');
  await page.getByRole('button', { name: 'Adicionar exercício' }).click();

  await expect(page.getByText('Defina o tempo de sustentação em segundos.')).toBeVisible();
  await expect(page.getByText('Exercícios (0)')).toBeVisible();
});

test('underfill banner appears on a thin manual plan and clears once the AI fills the window', async ({ page }) => {
  await openTrainerApp(page);
  // Andre Lima is the client whose latest check-in carries available_minutes —
  // without it the editor has no window to measure the plan against.
  await openPlanEditor(page, 'Andre');

  // Read the client's stated availability straight from the context card.
  const availableText = await page.getByText(/\d+min/).first().innerText();
  const availableMin  = parseInt(availableText.match(/(\d+)min/)![1]!, 10);
  test.skip(availableMin < 20, 'client has too small a window for a meaningful underfill check');

  await addManualExercise(page, 'Barbell Back Squat'); // ~5 min of a much larger window

  const underfill = page.getByText(/considere adicionar mais exerc/i);
  await expect(underfill).toBeVisible();

  // Ask the AI to complete the session — this is the regression: before the
  // time-model unification the generated plan still tripped the same banner.
  await page.getByRole('button', { name: /Perguntar à IA/i }).click();
  await expect(page.getByRole('button', { name: /Gerando/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Perguntar à IA/i })).toBeVisible({ timeout: 60_000 });

  await expect(page.getByText(/Algo deu errado/i)).toHaveCount(0);
  await expect(underfill).toHaveCount(0);
  await expect(page.getByText(/pode levar mais que/i)).toHaveCount(0);
});

/** Adds an exercise with an explicit set count (default draft is 3 sets). */
async function addExerciseWithSets(page: Page, name: string, sets: number) {
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await page.getByPlaceholder('Nome do exercício').fill(name);
  // First stepper in the form is Séries; the second is Reps.
  for (let i = 3; i < sets; i++) {
    await page.getByRole('button', { name: '+', exact: true }).first().click();
  }
  await page.getByRole('button', { name: 'Adicionar exercício' }).click();
}

// The manual/AI handshake, in both directions: what the trainer builds sets the
// AI's budget, and what the AI returns is measured back against the same window.
test('manual plan sets the AI budget: 3 exercises x 20 min leave a 25-min budget in a 45-min window', async ({ page }) => {
  await openTrainerApp(page);
  await openPlanEditor(page, 'Andre');

  const availableMin = parseInt((await page.getByText(/\d+min/).first().innerText()).match(/(\d+)min/)![1]!, 10);
  expect(availableMin, 'fixture expects Andre to have a 45-min check-in').toBe(45);

  // 3 exercises x 4 sets x (40s active + 60s rest) = 1200s = exactly 20 min.
  for (const name of ['Bench Press', 'Barbell Row', 'Back Squat']) {
    await addExerciseWithSets(page, name, 4);
  }

  // The editor must read the manual plan as 20 of the 45 available minutes.
  await expect(page.getByText(/~20 dos 45 min/)).toBeVisible();

  let payload: Record<string, unknown> | null = null;
  page.on('request', r => {
    if (r.url().includes('/api/generate-workout')) payload = r.postDataJSON();
  });

  await page.getByRole('button', { name: /Perguntar à IA/i }).click();
  await expect(page.getByRole('button', { name: /Perguntar à IA/i })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Algo deu errado/i)).toHaveCount(0);

  // The manual side bounded the AI: full window travels as context, the unused
  // remainder as the budget for this batch — 45 - 20 = 25.
  expect(payload, 'the AI call must have been made').not.toBeNull();
  const sent = payload as unknown as { remaining_minutes: number; checkin: { minutes: number }; existing_exercises: unknown[] };
  expect(sent.remaining_minutes).toBe(25);
  expect(sent.checkin.minutes).toBe(45);
  expect(sent.existing_exercises).toHaveLength(3);

  // ...and the combined plan lands inside the window: neither banner is shown.
  await expect(page.getByText(/considere adicionar mais exerc/i)).toHaveCount(0);
  await expect(page.getByText(/pode levar mais que/i)).toHaveCount(0);
});

test('the AI result bounds the trainer back: extra manual exercises then raise the overrun warning', async ({ page }) => {
  await openTrainerApp(page);
  await openPlanEditor(page, 'Andre');

  await addExerciseWithSets(page, 'Bench Press', 4); // 6.7 min of 45
  await page.getByRole('button', { name: /Perguntar à IA/i }).click();
  await expect(page.getByRole('button', { name: /Perguntar à IA/i })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Algo deu errado/i)).toHaveCount(0);
  // NB: how completely the AI fills its budget varies run to run (measured
  // 86-108%), so this test does not assert on the underfill banner here — the
  // point is the opposite direction, below.

  // Window is now essentially full — piling on manual work must warn the trainer.
  for (let i = 0; i < 4; i++) await addManualExercise(page, `Extra ${i + 1}`);
  await expect(page.getByText(/pode levar mais que/i)).toBeVisible();
});

test('a plan that already fills the window does not spend an AI call', async ({ page }) => {
  await openTrainerApp(page);
  await openPlanEditor(page, 'Andre');

  const availableText = await page.getByText(/\d+min/).first().innerText();
  const availableMin  = parseInt(availableText.match(/(\d+)min/)![1]!, 10);

  // Each default exercise is 3 x (40s + 60s) = 5 min; fill past the window.
  const needed = Math.ceil(availableMin / 5) + 1;
  for (let i = 0; i < needed; i++) await addManualExercise(page, `Filler ${i + 1}`);

  let generationCalled = false;
  page.on('request', r => { if (r.url().includes('/api/generate-workout')) generationCalled = true; });

  await page.getByRole('button', { name: /Perguntar à IA/i }).click();

  await expect(page.getByText(/já preenche o tempo dispon/i)).toBeVisible();
  expect(generationCalled, 'no LLM call should be made when there is no time left').toBe(false);
});
