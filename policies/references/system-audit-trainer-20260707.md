# System Audit — TrAIner Project

**Date:** 2026-07-07
**Scope:** Full-system audit for logical inconsistencies, broken flow paths, and deviations from `AGENTS.md` governance (B2B separation, backend authority, offline resilience, AI validation, i18n integrity, data-model integrity).
**Prior audit referenced:** `STATUS_AUDIT.md` (2026-06-06) — re-verified below, findings resolved.
**Method:** Static analysis of `src/`, `api/`, `supabase/sql-archive/`, `policies/references/`, plus `git log` diffing against recently-fixed bug classes to find unfixed siblings. No runtime testing performed — this is a code-level audit, not a QA pass.

---

## Executive Summary

| # | Area | Status | Most severe finding |
|---|---|---|---|
| 1 | Status enum / DB↔TS consistency | ✅ Resolved (was ❌ in June audit) | 1 dead column remaining (`plan_exercises.completed`) — cosmetic |
| 2 | Trainer/client B2B data separation | ❌ **Critical gap** | `api/*.ts` endpoints accept `userId` from request body with **zero caller authentication** |
| 3 | AI generation backend authority | ⚠️ Same root cause as #2 | Prompts/keys are correctly server-side, but the server doesn't verify who's calling |
| 4 | Offline resilience / workout crash safety | ❌ **High risk** | Offline-started workouts silently lose all per-set data on completion |
| 5 | i18n completeness | ⚠️ Medium | Gendered-key rollout incomplete; 3 unfixed instances of a bug class already fixed once |
| 6 | Race conditions / logic flow | ✅ Low risk | No unfixed instance of the two most recently patched bug classes found |
| 7 | Monetization / feature gating | ✅ Mostly resolved | Gating now exists but is enforced client-side only (UX gate, not authoritative) |

**Systemic root cause across areas 2, 3, and part of 7:** the `api/` layer (Vercel serverless functions) universally trusts caller-supplied identity (`userId`, `trainer`, `client` in the request body) with no session/JWT verification before using the Supabase **service-role key** — which bypasses RLS entirely. This is the single highest-priority remediation item in this audit.

---

## 1. Status Enum / DB↔TS Consistency

**Verdict: Resolved since the 2026-06-06 audit.**

- `supabase/sql-archive/supabase-status-cleanup.sql` (applied per commit `5331022`) dropped the dead `workout_plans` values and realigned the CHECK constraint to `('sent','active','completed','cancelled','postponed')`, matching `src/types/workout.ts:49`.
- `paused` dropped from `workout_sessions` CHECK; `substituted` dropped from `workout_session_exercises` CHECK — both now match current TS types (`src/types/workout.ts:71-72`).
- `trainer_alerts` and `operational_tasks` now have CHECK constraints (previously unenforced at the DB layer). `TaskStatus` (`workout.ts:156`) narrowed to `'pending' | 'completed'`, matching.

**Remaining items (Low severity, cosmetic):**

- `[Low]` `supabase/sql-archive/supabase-migration-v2.sql:146` — `plan_exercises.completed` boolean column has no write path anywhere in `src/` (execution tracking fully lives in `workout_session_exercises.status`). Dead column; should be dropped or explicitly documented as deprecated.
- `[Low]` `exercises` library table — `src/types/workout.ts:227` declares `'draft' | 'active' | 'restricted' | 'blocked'`, but no `CREATE TABLE exercises` exists in `supabase/sql-archive/*.sql`. DB-side enforcement cannot be verified from the repo (table was presumably created outside tracked migrations).

---

## 2. Trainer/Client Data Separation (B2B Boundary)

**Verdict: Critical gap — systemic, not isolated.**

Every `api/*.ts` Vercel function that touches user-scoped data reads `userId` (or `trainer`/`client`) straight from `req.body` and never checks it against an authenticated session. Several of these then use the Supabase **service-role key**, which bypasses RLS entirely — meaning the API layer, not just individual queries, is the actual authority boundary, and that boundary is open.

| Severity | Location | Issue |
|---|---|---|
| **Critical** | `api/send-notification.ts:9-49` | No auth check. Persists `notification_log` rows and sends FCM pushes using the service-role key, keyed on an unverified `userId`/`fromUserId` from the request body. Any external caller can impersonate a trainer notifying an arbitrary client, or vice versa. |
| **High** | `api/create-checkout-session.ts:15` | `userId` from body, no ownership check, used to create a Stripe Checkout session. |
| **High** | `api/billing-portal.ts:15` | Same pattern — `userId` from body opens a Stripe Billing Portal session for arbitrary users. |
| **High** | `api/send-invitation.ts:17`, `api/generate-workout.ts`, `api/generate-smart-workout.ts:547` | Same unauthenticated-body pattern; `generate-smart-workout.ts` additionally accepts arbitrary `trainer`/`client` payloads for AI generation — enables both cross-tenant data exposure risk and unmetered cost abuse against the LLM key. |
| Low | `src/screens/client/*.tsx` (`HistoryScreen.tsx:56`, `PostWorkoutSummaryScreen.tsx`, `StartWorkoutScreen.tsx`) | Client-side Supabase queries are correctly scoped with `.eq('user_id', …)` and backstopped by RLS. **No gap found here** — the exposure is entirely at the `api/` layer. |

**Why this violates AGENTS.md:** "B2B trainer/client separation must be preserved in ALL data access patterns" and "Backend is the sole authority for: AI workout generation, health data, auth, payments." The backend code is architecturally in the right place (frontend never calls Stripe/LLM/FCM directly) — but it performs no authorization, so "backend is the authority" is true in *code location* only, not in *access control*.

**Recommended remediation:** require a verified Supabase session JWT (`Authorization: Bearer`) on every `api/*.ts` handler that touches user data, and derive `userId` server-side from the verified token — never trust it from the body. For trainer→client actions, additionally verify a `trainer_id`/`client_id` relationship row exists before allowing the write.

---

## 3. AI Workout Generation — Backend Authority

**Verdict: Correct placement, same auth gap as Area 2.**

- `[Low — no leakage]` System prompts (`api/generate-workout.ts:1-27`), model name (`deepseek-chat`, `api/generate-smart-workout.ts:596`), and API keys (`OPENAI_API_KEY`/`DEEPSEEK_API_KEY`) are confirmed server-side only. No matches under `src/` for API keys, system prompts, or model identifiers. `src/lib/workoutGeneration.ts` only calls the internal `/api/generate-workout` and `/api/generate-smart-workout` routes.
- `[Critical — duplicate of Area 2]` Both generation endpoints inherit the unauthenticated-caller gap above. "AI-generated workout recommendations must be validated before presentation" is a separate concern (output validation) — no evidence found either way that generated plans undergo a structural/safety validation pass before being written to `workout_plans`; this should be confirmed explicitly against `api/generate-workout.ts`'s response-handling path in a follow-up review.

---

## 4. Offline Resilience / Workout Session Crash Safety

**Verdict: High risk — violates the "structural, not optional" offline-resilience rule.**

| Severity | Location | Issue |
|---|---|---|
| **High** | `src/hooks/useWorkoutData.ts` | No local-first persistence layer exists anywhere (no `localStorage`/IndexedDB queue). Every write (`startWorkoutSession`, `logWorkoutSet`, `updateSessionExerciseStatus`, `completeWorkoutSession`) is a direct, unqueued Supabase network call. |
| **High** | `src/screens/client/WorkoutModeScreen.tsx:184-192` (`confirmSet`) | The `logWorkoutSet` result is awaited but its error is never checked. Local state (`setsLogged`, rest timer) advances regardless of write success. A failed/slow network call silently loses the set with no retry and no user-visible error. The confirm button also has no disabled/loading guard, so a double-tap during a slow request can fire duplicate inserts. |
| **Medium** | `src/screens/client/WorkoutModeScreen.tsx:101-121, 250-291` | If `startWorkoutSession` fails at workout start (offline), the screen falls back to a local `offline-*` session id that never syncs per-set data. On `finishWorkout`, if no real session id was ever established, a "rescue" session is created with `exercises: []` — persisting only aggregate duration/counts, never the actual reps/load/RPE per set. **A workout completed while offline from the start shows as "completed" in history but permanently loses all individual set data.** |

**Why this matters:** AGENTS.md explicitly flags "a crash mid-workout is an architectural failure" and "offline resilience is a structural requirement, not a feature." The current implementation degrades silently rather than failing loudly or queuing for retry — worse than a crash, because data loss is invisible to the user.

**Recommended remediation:** introduce a local write-ahead log (IndexedDB) for `logWorkoutSet`/`updateSessionExerciseStatus` that replays on reconnect; surface a visible "not saved — retrying" state instead of silently accepting the local UI transition.

---

## 5. i18n Completeness

**Verdict: Medium — incomplete rollout of a recent fix, plus repeats of a fixed bug class.**

- `[Medium]` The gender-variant key rollout from commit `64deebe` is incomplete: `en.json` is missing 12 keys (`checkin.result.freeBlockedTitle_female/_male`, `checkin.result.notifyTrainerReady_female/_male`, `checkin.result.readyPushTitle_female/_male`, `inbox.notification.readyToTrainTitle_female/_male`, `inbox.templates.ready_to_train_female/_male`, `inbox.trainer_timeout_workout.note_female/_male`); `de.json` missing 10 of the same set; `es.json` missing 2. Base keys exist as i18next fallback so text isn't blank, but **German** (grammatically gendered) silently falls back to generic phrasing, undermining the fix's intent.
- `[Medium]` `src/screens/shared/InboxScreen.tsx:232-233,236-237` — hardcoded English push-notification title/body ("Workout approved", "Workout request returned", etc.) sent verbatim to FCM via `api/send-notification.ts:91`. Template rendering only happens in-app on the recipient device; the actual **push banner** always shows English regardless of recipient locale. Non-English trainers/clients get English push banners for workout approval/rejection.
- `[Medium]` Same bug class, unfixed, at `src/screens/trainer/WorkoutPlanEditorScreen.tsx:340` ("New workout plan" / plan-sent body) and `src/lib/events.ts:89` ("High pain — ${bodyRegion}" alert). Both have proper localized templates already defined (`inbox.templates.new_plan`/`new_plan_body`, `inbox.templates.high_pain_alert`/`_body`) but pass raw English strings instead of empty strings + `templateKey` — the correct pattern already used at `InboxScreen.tsx:202` and `TrainerClientDetailScreen.tsx:481`. This is the same class of bug fixed once in `InboxScreen.tsx:275-276`, left unfixed in 3 other call sites.

**Recommended remediation:** treat "push notification always renders in English" as one bug, not three — audit every `notify(...)` call site for `title`/`body` populated with raw strings instead of `templateKey`, and fix as a batch.

---

## 6. Race Conditions / Logic Flow

**Verdict: Low risk — no unfixed instance of the two most recently patched bug classes found.**

- `[Low]` `src/screens/checkin/CheckInResult.tsx:114` — `setRequestState(prev => prev === 'pending' ? 'pending' : 'pending')` is a no-op ternary (both branches return `'pending'`), functionally identical to the direct assignment it replaced. Not a regression, but dead/misleading logic that reads as a guard and isn't one — should be simplified.
- `[Low]` `src/screens/checkin/CheckInProntidaoScreen.tsx:74-78` and `src/hooks/useAuth.ts:212-220` — fire-and-forget `setState`/insert after an unguarded `await` with no mounted/staleness check. Same *shape* as the fixed InboxScreen duplicate-notification race, but lower consequence (a risk badge or ledger insert, not a duplicate user-facing notification).
- `[Low]` Checked for the `App.tsx` "hooks after early return" pattern (React error #310, fixed in `dbd6a70`) across `ProfileWizardScreen.tsx`, `Step02BasicData.tsx`, `StartWorkoutScreen.tsx`, `PerformanceDashboardScreen.tsx`, `TrainerClientDetailScreen.tsx` — **no unfixed instance found**; the one apparent match (`TrainerClientDetailScreen.tsx:270`) is inside a non-component helper function, not a hook violation.

---

## 7. Monetization / Feature Gating

**Verdict: Mostly resolved; residual gap is architectural (UX-only enforcement).**

- `[Low]` `Plan_Feature_Gating_Audit_20260616.md`'s core findings (`ai_fitness` granting nothing, zero code gates for trainer tiers) are superseded by `src/types/feature-permissions.ts` / `src/hooks/useFeatureAccess.ts`, a DB-backed `feature_permissions` gate. Verified wired up: `TrainerDashboardScreen.tsx:85,291-294` enforces the trial student cap; `CoachDNAScreen.tsx:49-50` enforces `coach_dna` access.
- `[Low]` Gates are enforced **client-side only** via the `useFeatureAccess` React hook — no server-side/RLS enforcement of `feature_permissions` was found. A modified client could bypass `.allowed` checks. Not elevated to Medium/High because no monetary-transaction bypass exists (billing itself routes through Stripe via `api/create-checkout-session.ts`, subject to the Area 2 auth gap separately) — but it means feature gates are a UX convenience, not a security boundary, and should be described that way internally.

---

## Prioritized Remediation Plan

| Priority | Item | Areas |
|---|---|---|
| **P0** | Add JWT/session verification to every `api/*.ts` handler that reads `userId`/`trainer`/`client` from the request body; derive identity server-side, never trust the body. Add trainer↔client relationship checks for cross-role writes. | 2, 3 |
| **P1** | Fix silent data loss in `WorkoutModeScreen.tsx`: check `logWorkoutSet` errors, guard against double-submit, and ensure offline-started sessions eventually sync per-set data (or block completion until synced). | 4 |
| **P2** | Batch-fix all `notify(...)` call sites passing raw English `title`/`body` instead of `templateKey` + empty strings (`WorkoutPlanEditorScreen.tsx:340`, `events.ts:89`), and backfill the missing gendered i18n keys across `en`/`de`/`es`. | 5 |
| **P3** | Drop `plan_exercises.completed` (dead column) and track `exercises` library table schema in a tracked migration file. | 1 |
| **P3** | Simplify the no-op ternary guard in `CheckInResult.tsx:114`; add mounted/staleness guards to `CheckInProntidaoScreen.tsx` and `useAuth.ts` fire-and-forget writes. | 6 |
| **P4** | Document `feature_permissions` gating as UX-only in `Plan_Feature_Gating_Audit` follow-up; evaluate whether server-side enforcement is warranted before scaling paid tiers. | 7 |

---

*Audit performed via static code analysis and cross-referenced against `AGENTS.md` governance rules and prior audit documents in `policies/references/`. No destructive or write actions were taken. Findings in Areas 2–4 involve unauthenticated access to payment and notification endpoints and should be treated as the immediate priority.*
