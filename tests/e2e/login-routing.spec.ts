import { test, expect, type Page } from '@playwright/test';

// Guards the post-login routing decision, which is only reachable through a real
// interactive sign-in. The other e2e specs inject a session into localStorage and
// therefore boot via getSession() — a different code path that never exhibited
// this bug: onAuthStateChange fires while `loading` is already false, so the
// profile could land in state before the subscription query returned, and
// App.tsx decided navigation against a null subscription. Every existing user,
// on any paid plan, was sent to plan selection on login (reported 2026-07-31 for
// carlos.silva, an active `pro`).
//
// PREREQUISITE — serve the app with:  npm run dev:local

const APP_URL  = process.env.E2E_APP_URL ?? 'http://localhost:5173';
const PASSWORD = 'TrAIner2026!';

// plans.headingNoRec across the supported locales — the exact heading the
// misrouted users were landing on ("Escolha o plano ideal.").
const PLANS_HEADING = /Escolha o plano ideal|Pick the plan that fits|Wähle den passenden Plan|Elige el plan/i;

/**
 * The failure is a race, not a certainty: the redirect fires inside the callback
 * of the pending-invitation RPC, so it only misroutes when that call returns
 * BEFORE the subscription query. Locally the subscription usually wins and the
 * bug hides; in production it did not. Delaying the subscription request makes
 * the losing order deterministic, so this spec actually exercises the defect
 * instead of passing by luck.
 */
async function delaySubscriptionLookup(page: Page, ms = 1500) {
  await page.route('**/rest/v1/subscriptions*', async route => {
    await new Promise(r => setTimeout(r, ms));
    await route.continue();
  });
}

async function signIn(page: Page, email: string) {
  await page.goto(APP_URL);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
}

test('an active paid trainer lands on their client list, never on plan selection', async ({ page }) => {
  // carlos.silva is on `pro`, active — he has already chosen a plan.
  await delaySubscriptionLookup(page);
  await signIn(page, 'carlos.silva@trainer.test');

  // The client list is the trainer landing screen (pt locale for this account).
  await expect(page.getByText(/Meus Clientes|My Clients|Meine Kunden/)).toBeVisible({ timeout: 30_000 });
  // The plan picker must never appear — not even in passing.
  await expect(page.getByText(PLANS_HEADING)).toHaveCount(0);
});

test('an active paid client lands in the app, never on plan selection', async ({ page }) => {
  // tiago.moreira is on a paid client plan.
  await delaySubscriptionLookup(page);
  await signIn(page, 'tiago.moreira@client.test');

  // Sign-in must have completed — otherwise the assertion below would pass
  // simply because we never left the login form.
  await expect(page.getByPlaceholder('Password')).toHaveCount(0, { timeout: 30_000 });
  // Clients land on check-in (or the profile wizard) — either way, not the picker.
  await expect(page.getByText(PLANS_HEADING)).toHaveCount(0);
});
