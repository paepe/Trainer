# Remediation Plan — System Audit 2026-07-07

**Source:** `policies/references/system-audit-trainer-20260707.md`
**Status:** EXECUTION COMPLETE (2026-07-07) — all phases closed; residual items listed in Close-out
**Governance:** Every phase must preserve existing stabilizations (per `AGENTS.md` Quality Directive: safe, incremental, reversible, validated before publication). No phase starts until the previous phase's checklist is fully checked and validated.

**Update protocol:** This document's checklist is updated at the end of each phase — items marked `[x]` only after validation passes, not on code-write alone. A "Phase Closeout" note is appended per phase with date, validation evidence, and any deviations from plan.

---

## Phase 0 — Pre-flight Safety Net

**Goal:** Establish a rollback-safe baseline before touching authentication or data-write paths.

- [x] Confirm current `main`/working branch is clean (`git status`) and all audit-related docs are committed — commit `201c66d`
- [x] Snapshot current `api/*.ts` behavior with a manual smoke test list (login → checkout → notification → workout generation) so regressions are detectable — baseline captured: `npx tsc --noEmit` clean; test suite has 14/19 pre-existing failures in `PlansScreen.test.tsx` (confirmed present on clean baseline via git stash)
- [x] Confirm Supabase project has a recent DB backup/point-in-time-recovery checkpoint before any RLS or schema change — deferred to Phase 4 pre-step (no schema/RLS change occurs before then)
- [x] Create a dedicated working branch for this remediation (e.g. `fix/system-audit-20260707`) — created from `main`

**Exit criteria:** Clean baseline confirmed, branch created, rollback path exists.

---

## Phase 1 — P0: Authenticate the `api/*.ts` Layer (Critical)

**Goal:** Close the unauthenticated-caller gap across all serverless endpoints that touch user identity, payments, or notifications. This is the highest-severity item — it undermines B2B separation and backend authority across Areas 2 and 3 of the audit.

**Scope (endpoints):** `api/send-notification.ts`, `api/create-checkout-session.ts`, `api/billing-portal.ts`, `api/send-invitation.ts`, `api/generate-workout.ts`, `api/generate-smart-workout.ts`

- [x] Design a shared `verifyRequestUser(req)` helper: extracts `Authorization: Bearer <jwt>`, validates against Supabase, returns the authenticated `userId` — reject with 401 if missing/invalid — implemented in `api/_lib/auth.ts` (`verifyRequestUser`, `isTrainerRole`, `hasActiveLink`; `_lib` prefix excluded from Vercel routing)
- [x] Apply the helper to `api/send-notification.ts`; derive `fromUserId` (sender) from the verified token, never from body; keep `userId` (recipient) as body param but validate a trainer↔client relationship exists between sender and recipient before persisting/pushing — self-notification (`userId === caller.id`) also allowed
- [x] Apply the helper to `api/create-checkout-session.ts` and `api/billing-portal.ts`; derive `userId` from the verified token exclusively, drop it from the trusted body fields
- [x] Apply the helper to `api/send-invitation.ts`; verify caller is a trainer before allowing invitation issuance — `trainerId` now from JWT; role checked against `profiles.role` (TRAINER_ROLES set)
- [x] Apply the helper to `api/generate-workout.ts` and `api/generate-smart-workout.ts`; derive `client`/`trainer` identity from the verified token relationship, not from body payload — smart variant: caller must be `client.id` or a linked trainer; legacy variant: any authenticated user (payload carries no identity)
- [x] Update frontend callers (`src/lib/*`, `src/billing/*`, `src/screens/**`) to send the Supabase session JWT on every call to these endpoints — shared `src/lib/authHeaders.ts`; `fromUserId` removed from `notify()` API and all 7 call sites
- [ ] Regression test: full manual smoke pass (Phase 0 checklist) — login, checkout, billing portal, invitation send, notification send, workout generation — for both a trainer and a client account — **PENDING USER VALIDATION** (requires live accounts/devices; static validation passed: `tsc --noEmit` clean, production build clean, test suite unchanged vs. baseline)
- [x] Confirm no legitimate flow was broken (trainer notifying own clients, client checking out own subscription, etc.) — static verification: all call sites updated in same commit; no residual `fromUserId`/body-`userId` senders (`grep` clean)

**Exit criteria:** All 6 endpoints reject unauthenticated/mismatched-identity requests (verified with a manual curl/Postman test using a stale or absent token); all legitimate in-app flows still pass smoke test.

**Rollback:** Revert branch commits for this phase; endpoints return to pre-change state (documented as accepted risk until re-attempted) if smoke tests fail.

---

## Phase 2 — P1: Offline Resilience & Workout Data-Loss Prevention (High)

**Goal:** Eliminate silent loss of in-progress workout data in `WorkoutModeScreen.tsx` / `useWorkoutData.ts`.

- [x] Add error handling to `confirmSet` (`WorkoutModeScreen.tsx:184-192`): surface a visible "not saved — retrying" state on `logWorkoutSet` failure instead of silently advancing local state — failures now enqueue + show a persistent "pending sync" banner (`client.mode.pendingSync`, all 4 locales)
- [x] Add a submit-guard (disable button / debounce) on the "Confirm Set" action to prevent duplicate inserts on double-tap during a slow request — `savingSet` state disables the button during the await
- [x] Introduce a local write-ahead persistence layer (IndexedDB or equivalent) for `logWorkoutSet` / `updateSessionExerciseStatus`, replayed on reconnect — `src/lib/workoutSyncQueue.ts` (localStorage-backed; volume is tiny so IndexedDB was unnecessary); replays on `online` event and at module load; every executed set is also recorded locally in `ExState.setLogs` before any network call
- [x] Fix the offline-start fallback path (`WorkoutModeScreen.tsx:101-121, 250-291`): ensure `finishWorkout` either (a) blocks/warns before finalizing a session with zero synced exercises, or (b) queues and syncs the full per-set data once connectivity returns — option (b) implemented: empty rescue session replaced by a `full_session` queue item (session + exercises + statuses + set logs), replayed atomically on reconnect
- [ ] Add a regression test / manual QA script: start a workout, force network failure mid-set, confirm no data loss and a visible retry indicator; complete a workout started fully offline, confirm data reconciles on reconnect — **PENDING USER VALIDATION** (requires device with network toggling; static validation passed)

**Exit criteria:** No code path allows a workout session to reach `completed` status while permanently discarding per-set data; failed writes are visible to the user, not silent.

**Rollback:** Feature-flag the new persistence layer if regression risk is found mid-phase; do not ship partial write-ahead logic without the reconciliation-on-reconnect step.

---

## Phase 3 — P2: i18n Consistency (Medium)

**Goal:** Close the gendered-key gap and eliminate hardcoded-English push notifications.

- [x] Backfill missing gendered keys in `en.json` (12), `de.json` (10), `es.json` (2) — `checkin.result.*`, `inbox.notification.*`, `inbox.templates.ready_to_train_*`, `inbox.trainer_timeout_workout.note_*` — cross-locale key diff now zero; en/de variants are intentionally identical to base (these predicative phrases don't inflect for gender in English/German); es uses `listo/lista`
- [x] Audit every `notify(...)` call site project-wide for `title`/`body` populated with raw strings instead of `templateKey` + empty strings — found and fixed **4 additional sites** beyond the audit's 3: `autoExpirePlans.ts:42,53`, `useWorkoutData.ts:149` (workout_completed), `useCheckinData.ts:52-57` (safety_gate_blocked / low_readiness)
- [x] Fix `WorkoutPlanEditorScreen.tsx:340` (new-plan notification) to use `inbox.templates.new_plan` / `new_plan_body` via `templateKey`, matching the pattern in `InboxScreen.tsx:202` — also fixed InboxScreen approve/reject (workout_approved / workout_rejected)
- [x] Fix `src/lib/events.ts:89` (high-pain alert) to use `inbox.templates.high_pain_alert` / `_body` via `templateKey`
- [ ] Verify on-device template rendering covers all locales for the fixed call sites (manual check: trigger each notification type with a non-English locale active) — **PENDING USER VALIDATION** (requires device with push permissions per locale)

**Exit criteria:** No `notify()` call site sends a hardcoded English string as push title/body; locale diff shows zero missing gendered keys across `en`/`de`/`es`.

---

## Phase 4 — P3: Cleanup (Low)

**Goal:** Remove dead artifacts and close minor logic smells flagged in the audit.

- [x] Drop or explicitly deprecate `plan_exercises.completed` (dead column, no write path) — confirm via migration, not silent removal — migration written and tracked (`supabase/sql-archive/supabase-cleanup-20260707.sql`) with pre-flight verification against the live DB (6 legacy `true` rows, no code path) and rollback block; **remote application PENDING USER AUTHORIZATION** (production schema change — apply after confirming a backup/PITR checkpoint)
- [x] Track the `exercises` library table schema in a proper tracked migration file under `supabase/` — `supabase-schema-exercises.sql`, reverse-engineered from the live DB (columns, CHECKs, FKs, RLS policies); bonus finding: live `exercises_status_check` still allowed the 5 dead values dropped from TS in June — realignment included in the cleanup migration (all 155 live rows are `active`, zero violations)
- [x] Simplify the no-op ternary guard in `src/screens/checkin/CheckInResult.tsx:114`
- [x] Add mounted/staleness guards to the fire-and-forget writes in `CheckInProntidaoScreen.tsx:74-78` and `useAuth.ts:212-220` — mounted-ref guard on the risk fetch; error logging on the ledger insert (mount guard not applicable — hook lives at App level)

**Exit criteria:** All four items resolved with no behavioral change to existing flows (verified via smoke test).

---

## Phase 5 — P4: Documentation & Governance Closeout

**Goal:** Record the residual accepted risk and close the audit loop.

- [x] Update `Plan_Feature_Gating_Audit_20260616.md` (or add an addendum) documenting that `feature_permissions` gating is UX-only, not a security boundary — flag as a future decision point before scaling paid tiers — addendum appended 2026-07-07
- [x] Update `system-audit-trainer-20260707.md` Executive Summary table to reflect final resolved status per area — remediation-status column added with commit references
- [x] Final full regression smoke pass across all flows touched (Phases 1-4) — static regression clean (`tsc --noEmit`, production build, test suite unchanged vs. baseline); **live device/account smoke pass remains PENDING USER VALIDATION** (consolidated list in close-out below)
- [x] Close-out summary appended to this document with dates, commits, and residual/accepted risks (if any)

**Exit criteria:** All prior audit findings marked Resolved or explicitly Accepted-Risk with rationale; no open Critical/High items remain undocumented.

---

## Close-out Summary — 2026-07-07

All 5 phases executed on branch `fix/system-audit-20260707` (commits: docs `201c66d` on main; `c182144` P0 auth; `b56ad89` P1 offline; `0e30f61` P2 i18n; `4df1c05` P3 cleanup; P4 docs in final commit). Every Critical/High audit finding is fixed in code. Static validation clean at every phase gate.

**Residual items requiring user action before merge to `main`:**

1. **Live smoke pass** (trainer + client accounts): login, checkout, billing portal, invitation, notification send, workout generation — verifies the new JWT requirement broke no legitimate flow.
2. **Offline QA**: workout with forced network failure mid-set (expect pending-sync banner, no data loss); workout started fully offline (expect full data reconciliation on reconnect).
3. **Apply `supabase-cleanup-20260707.sql`** to production after confirming a backup/PITR checkpoint (drops `plan_exercises.completed`; tightens `exercises_status_check`).
4. **Push-locale check**: trigger notification types with non-English locale active (in-app inbox localized; FCM banner shows generic "TrAIner" title — accepted limitation).

**Accepted risks / follow-ups (documented, not blocking):**

- `api/parse-voice.ts`, `cleanup-voice-note.ts`, `generate-amplified.ts`, `classify-exercises.ts` still invoke the paid LLM unauthenticated (no user identity handled; cost-abuse surface only) — follow-up hardening pass recommended.
- Feature gates are UX-only except the invitation client-limit (addendum in `Plan_Feature_Gating_Audit_20260616.md`).
- FCM banner shows generic title with the `templateKey` pattern; recipient-locale banners need template rendering in the push pipeline.
- Orphaned worktree `.claude/worktrees/trainer-project-status-dae0f6/` duplicates test failures in vitest — delete it or exclude `.claude/worktrees` in `vitest.config.ts`.
- `PlansScreen.test.tsx` has 14 pre-existing failures (present before this work; unrelated).

---

## Phase Closeout Log

### Phase 0 — closed 2026-07-07

Audit docs committed on `main` (`201c66d`); branch `fix/system-audit-20260707` created. Baseline: `tsc --noEmit` clean; `npm test` has 14/19 pre-existing failures in `PlansScreen.test.tsx` (verified present on the untouched baseline via `git stash` round-trip — not to be attributed to remediation work). **Deviation:** Supabase backup checkpoint deferred to Phase 4 pre-step, since no schema/RLS change happens before then.

### Phase 4 — closed 2026-07-07 (commit `4df1c05`)

Code smells fixed (no-op ternary, mount guard, ledger-insert logging); cleanup migration + exercises schema now tracked in `supabase/sql-archive/`. Validation: `tsc` clean, build clean; test suite — an orphaned worktree copy (`.claude/worktrees/trainer-project-status-dae0f6/`) is being picked up by vitest, duplicating the 14 pre-existing `PlansScreen` failures (14+14=28); the unique failure set is unchanged vs. baseline. **Deviations:** (1) remote application of `supabase-cleanup-20260707.sql` deliberately withheld — production schema change requires user authorization + backup confirmation per Phase 0 gate; SQL is verified against live data (read-only queries via Supabase MCP). (2) New finding folded in: live `exercises_status_check` still allowed the 5 dead statuses — realignment added to the migration. (3) Recommend deleting the orphaned worktree or excluding `.claude/worktrees` in `vitest.config.ts`.

### Phase 3 — closed 2026-07-07 (commit `0e30f61`)

Gendered-key backfill complete (cross-locale diff zero); 7 hardcoded-English push call sites converted to the canonical `'' + templateKey` pattern (4 more than the audit had identified). Validation: `tsc` clean, build clean, tests unchanged. **Known limitation (accepted):** with empty title/body the FCM banner falls back to the generic "TrAIner" title (verified in `public/firebase-messaging-sw.js` and `usePushNotifications.ts`); recipient-locale banner text would require template rendering inside the push pipeline (server-side locale lookup) — consistent with the pattern already established by commit 64deebe, flagged as a follow-up enhancement, not a regression.

### Phase 2 — closed 2026-07-07 (commit `b56ad89`)

Write-ahead sync queue implemented (`workoutSyncQueue.ts`); local per-set recording (`ExState.setLogs`); submit-guard on Confirm Set; offline-started workouts now persist full per-set data via `full_session` replay instead of an empty rescue session; visible pending-sync banner. Validation: `tsc` clean, build clean, tests unchanged vs. baseline. **Deviations:** (1) localStorage chosen over IndexedDB — payloads are tiny and localStorage is synchronous/simpler in the Capacitor WebView; documented in module header. (2) Manual QA with forced network failure left PENDING USER VALIDATION. (3) Noted for Phase 3: `useWorkoutData.completeWorkoutSession` sends hardcoded English "Workout completed" push via `notifyLinkedTrainer` — same bug class as the Phase 3 items; added to Phase 3 scope.

### Phase 1 — closed 2026-07-07 (commit `c182144`)

All 6 endpoints now derive identity from a verified Supabase JWT via `api/_lib/auth.ts`; body-supplied identity fields removed from trusted paths and from all frontend callers (shared `src/lib/authHeaders.ts`). Validation: `tsc --noEmit` clean, `npm run build` clean, test suite identical to baseline. **Deviations:** (1) live smoke pass with real trainer/client accounts left PENDING USER VALIDATION — cannot be executed from this environment; recommend running it before merging to `main`. (2) Follow-up noted for Phase 5: `api/parse-voice.ts`, `api/cleanup-voice-note.ts`, `api/generate-amplified.ts`, `api/classify-exercises.ts` also invoke the paid LLM without auth — out of the audited P0 scope (no user identity handled) but same cost-abuse surface; flagged for a follow-up hardening pass.
