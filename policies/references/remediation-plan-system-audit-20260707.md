# Remediation Plan — System Audit 2026-07-07

**Source:** `policies/references/system-audit-trainer-20260707.md`
**Status:** DRAFT — awaiting authorization to execute Phase 1
**Governance:** Every phase must preserve existing stabilizations (per `AGENTS.md` Quality Directive: safe, incremental, reversible, validated before publication). No phase starts until the previous phase's checklist is fully checked and validated.

**Update protocol:** This document's checklist is updated at the end of each phase — items marked `[x]` only after validation passes, not on code-write alone. A "Phase Closeout" note is appended per phase with date, validation evidence, and any deviations from plan.

---

## Phase 0 — Pre-flight Safety Net

**Goal:** Establish a rollback-safe baseline before touching authentication or data-write paths.

- [ ] Confirm current `main`/working branch is clean (`git status`) and all audit-related docs are committed
- [ ] Snapshot current `api/*.ts` behavior with a manual smoke test list (login → checkout → notification → workout generation) so regressions are detectable
- [ ] Confirm Supabase project has a recent DB backup/point-in-time-recovery checkpoint before any RLS or schema change
- [ ] Create a dedicated working branch for this remediation (e.g. `fix/system-audit-20260707`)

**Exit criteria:** Clean baseline confirmed, branch created, rollback path exists.

---

## Phase 1 — P0: Authenticate the `api/*.ts` Layer (Critical)

**Goal:** Close the unauthenticated-caller gap across all serverless endpoints that touch user identity, payments, or notifications. This is the highest-severity item — it undermines B2B separation and backend authority across Areas 2 and 3 of the audit.

**Scope (endpoints):** `api/send-notification.ts`, `api/create-checkout-session.ts`, `api/billing-portal.ts`, `api/send-invitation.ts`, `api/generate-workout.ts`, `api/generate-smart-workout.ts`

- [ ] Design a shared `verifyRequestUser(req)` helper: extracts `Authorization: Bearer <jwt>`, validates against Supabase, returns the authenticated `userId` — reject with 401 if missing/invalid
- [ ] Apply the helper to `api/send-notification.ts`; derive `fromUserId` (sender) from the verified token, never from body; keep `userId` (recipient) as body param but validate a trainer↔client relationship exists between sender and recipient before persisting/pushing
- [ ] Apply the helper to `api/create-checkout-session.ts` and `api/billing-portal.ts`; derive `userId` from the verified token exclusively, drop it from the trusted body fields
- [ ] Apply the helper to `api/send-invitation.ts`; verify caller is a trainer before allowing invitation issuance
- [ ] Apply the helper to `api/generate-workout.ts` and `api/generate-smart-workout.ts`; derive `client`/`trainer` identity from the verified token relationship, not from body payload
- [ ] Update frontend callers (`src/lib/*`, `src/billing/*`, `src/screens/**`) to send the Supabase session JWT on every call to these endpoints
- [ ] Regression test: full manual smoke pass (Phase 0 checklist) — login, checkout, billing portal, invitation send, notification send, workout generation — for both a trainer and a client account
- [ ] Confirm no legitimate flow was broken (trainer notifying own clients, client checking out own subscription, etc.)

**Exit criteria:** All 6 endpoints reject unauthenticated/mismatched-identity requests (verified with a manual curl/Postman test using a stale or absent token); all legitimate in-app flows still pass smoke test.

**Rollback:** Revert branch commits for this phase; endpoints return to pre-change state (documented as accepted risk until re-attempted) if smoke tests fail.

---

## Phase 2 — P1: Offline Resilience & Workout Data-Loss Prevention (High)

**Goal:** Eliminate silent loss of in-progress workout data in `WorkoutModeScreen.tsx` / `useWorkoutData.ts`.

- [ ] Add error handling to `confirmSet` (`WorkoutModeScreen.tsx:184-192`): surface a visible "not saved — retrying" state on `logWorkoutSet` failure instead of silently advancing local state
- [ ] Add a submit-guard (disable button / debounce) on the "Confirm Set" action to prevent duplicate inserts on double-tap during a slow request
- [ ] Introduce a local write-ahead persistence layer (IndexedDB or equivalent) for `logWorkoutSet` / `updateSessionExerciseStatus`, replayed on reconnect
- [ ] Fix the offline-start fallback path (`WorkoutModeScreen.tsx:101-121, 250-291`): ensure `finishWorkout` either (a) blocks/warns before finalizing a session with zero synced exercises, or (b) queues and syncs the full per-set data once connectivity returns — no session should reach `completed` status with silently empty exercise data
- [ ] Add a regression test / manual QA script: start a workout, force network failure mid-set, confirm no data loss and a visible retry indicator; complete a workout started fully offline, confirm data reconciles on reconnect

**Exit criteria:** No code path allows a workout session to reach `completed` status while permanently discarding per-set data; failed writes are visible to the user, not silent.

**Rollback:** Feature-flag the new persistence layer if regression risk is found mid-phase; do not ship partial write-ahead logic without the reconciliation-on-reconnect step.

---

## Phase 3 — P2: i18n Consistency (Medium)

**Goal:** Close the gendered-key gap and eliminate hardcoded-English push notifications.

- [ ] Backfill missing gendered keys in `en.json` (12), `de.json` (10), `es.json` (2) — `checkin.result.*`, `inbox.notification.*`, `inbox.templates.ready_to_train_*`, `inbox.trainer_timeout_workout.note_*`
- [ ] Audit every `notify(...)` call site project-wide for `title`/`body` populated with raw strings instead of `templateKey` + empty strings
- [ ] Fix `WorkoutPlanEditorScreen.tsx:340` (new-plan notification) to use `inbox.templates.new_plan` / `new_plan_body` via `templateKey`, matching the pattern in `InboxScreen.tsx:202`
- [ ] Fix `src/lib/events.ts:89` (high-pain alert) to use `inbox.templates.high_pain_alert` / `_body` via `templateKey`
- [ ] Verify on-device template rendering covers all locales for the fixed call sites (manual check: trigger each notification type with a non-English locale active)

**Exit criteria:** No `notify()` call site sends a hardcoded English string as push title/body; locale diff shows zero missing gendered keys across `en`/`de`/`es`.

---

## Phase 4 — P3: Cleanup (Low)

**Goal:** Remove dead artifacts and close minor logic smells flagged in the audit.

- [ ] Drop or explicitly deprecate `plan_exercises.completed` (dead column, no write path) — confirm via migration, not silent removal
- [ ] Track the `exercises` library table schema in a proper tracked migration file under `supabase/`
- [ ] Simplify the no-op ternary guard in `src/screens/checkin/CheckInResult.tsx:114`
- [ ] Add mounted/staleness guards to the fire-and-forget writes in `CheckInProntidaoScreen.tsx:74-78` and `useAuth.ts:212-220`

**Exit criteria:** All four items resolved with no behavioral change to existing flows (verified via smoke test).

---

## Phase 5 — P4: Documentation & Governance Closeout

**Goal:** Record the residual accepted risk and close the audit loop.

- [ ] Update `Plan_Feature_Gating_Audit_20260616.md` (or add an addendum) documenting that `feature_permissions` gating is UX-only, not a security boundary — flag as a future decision point before scaling paid tiers
- [ ] Update `system-audit-trainer-20260707.md` Executive Summary table to reflect final resolved status per area
- [ ] Final full regression smoke pass across all flows touched (Phases 1-4)
- [ ] Close-out summary appended to this document with dates, commits, and residual/accepted risks (if any)

**Exit criteria:** All prior audit findings marked Resolved or explicitly Accepted-Risk with rationale; no open Critical/High items remain undocumented.

---

## Phase Closeout Log

*(Appended at the end of each phase — not yet started.)*
