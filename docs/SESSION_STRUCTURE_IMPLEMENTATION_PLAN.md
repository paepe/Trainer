# Implementation Plan — Session Structure & Coach DNA Activation

**Version:** 1.0
**Date:** 2026-07-31
**References:** `src/coach-dna/constants.ts` (STRUCTURE_BLOCKS) · `api/generate-workout.ts` · `api/generate-smart-workout.ts` · `policies/references/PROFILE.md`
**Total estimate:** ~14h
**Origin:** Trainer report (Kamil, 2026-07-30) — "the AI is only generating single exercises, not a complete workout with the given frame (warm-up, technique… cool-down)"

---

## Context

The 2026-07-31 fix (`5b374c5`) made `generate-workout` return a complete session, but introduced an **ad-hoc taxonomy** (`warmup | main | cooldown`) parallel to a richer one the product already owns.

Audit findings:

| # | Finding | Evidence |
|---|---------|----------|
| 1 | Coach DNA already models session structure with 6 blocks, trainer-ordered | `STRUCTURE_BLOCKS` — mobility, warmup, technique, strength, conditioning, cooldown |
| 2 | Both trainers already configured theirs; Kamil's includes `technique` | `coach_dna.structure.order` — saved 2026-07-30, the day he reported |
| 3 | No AI endpoint reads `coach_dna` | `grep -c coach_dna api/generate-workout.ts` → 0 |
| 4 | ~~Client screen fetches Coach DNA and discards the result~~ **NOT REPRODUCIBLE — refuted 2026-07-31** | See below |
| 5 | `TrainerContext.sessionOrder` exists and is printed to the prompt, ~~but nobody populates it~~ — **second clause refuted, see #4** | `api/generate-smart-workout.ts:118,526` |
| 6 | Session phase is dropped on both paths | trainer editor mapping; `workoutGeneration.ts:193` flattens phases |
| 7 | No `phase` column on `plan_exercises` / `workout_session_exercises` | `information_schema` query — empty |
| 8 | Context card shows available time only when it comes from the check-in | `WorkoutPlanEditorScreen.tsx:500` |

**Net effect:** Coach DNA is sold on Pro and Elite and currently influences nothing in generation.

### Finding #4 — refuted 2026-07-31 (kept for the record)

The claim was that `StartWorkoutScreen` fetched the `coach_dna` row and threw it away, and that
consequently nothing populated `TrainerContext.sessionOrder`. Both are false. Verified in the file:

- `StartWorkoutScreen.tsx:550` assigns the fetched row to `coachDNA`
- `StartWorkoutScreen.tsx:551` passes it to `resolveTrainerContext(coachDNA, prefs)`
- `buildAIContext.ts:244` forwards a non-null row to `buildTrainerContext`
- `buildAIContext.ts:35` maps `sessionOrder: row.structure?.order ?? []` — as do all five other fields
  the Phase 2 checklist asked for

`git blame` puts this wiring at **2026-05-31** (`dc6e1263`, the field mapping) and **2026-06-09**
(`5ee669a1`, the `resolveTrainerContext` call) — months before this workstream. It was never missing.

**How the wrong finding was produced:** a case-sensitive grep for `coachDna` / `dna\b`, which never
matches the real identifier `coachDNA`, published without opening the file.

**Consequence for this plan:** the audit table is evidence to re-verify, not settled fact. Every
remaining finding should be confirmed against the file before work is scoped on it.

---

## Premises

- Taxonomy is aligned **before** any UI is designed — no second competing vocabulary.
- Coach DNA is the source of truth for session structure; the AI consumes the trainer's declared order.
- Each phase is independently deployable and reversible.
- `main` is retired as a phase value; the fitting logic must be re-mapped, not merely renamed.
- Warm-up, mobility, technique and cool-down are prescriptive — never trimmed or padded to fit time.
- No phase closes without `tsc --noEmit` clean, lint clean, and the existing e2e contract suite green.
- Production deploys from `main` on push — every phase requires explicit authorization before push.
- Existing stabilizations are preserved: time-budget band (90–110%), token cap, phase-aware fitting, login routing.

---

## Execution Governance

Derived from `EXECUTIVE_TECHNOLOGY_DIRECTIVE.md`, as applied by the project lead.

**§8.1 (feature branches / Pull Request) is ruled non-mandatory for this project** by the project lead (2026-07-31). Direct commits to `main` are the accepted flow, gated by explicit per-push authorization under §9.4. Work still happens on a phase branch for isolation and reversibility (§4.9); the branch is merged locally rather than through a PR.

| Rule | Directive | Requirement for every phase here |
|------|-----------|----------------------------------|
| Branch isolation | §4.9 | One named branch per phase for isolation and clean reversal; PR not required. |
| Minimum quality | §8.2 | `lint`, `test`, `build` green on the impacted scope before any publication. |
| Traceable promotion | §8.3 | Record source branch, commit SHA, deployment URL, target environment, date/time. |
| Staging before production | §9.2 | Canonical validation happens in a non-production environment. Post-production smoke is a **distinct** step and never a substitute. |
| Production authorization | §9.4 | Explicit authorization from the project lead before each promotion, stating probable cause, impact, scope, reversibility and post-validation criteria. |
| Rollback by design | §4.9 | Each phase isolatable, reversible, with the reversal path written down before promotion. |
| One capability, one contract | §4.5 | Phase 0 exists precisely to remove a duplicated contract for session structure. |
| AI schema versioning | §6.3 | Prompt and response-schema changes are versioned together; parsing keeps explicit fallback defaults. |

### Post-deploy verification timing

Vercel reporting a deployment as `Ready` does not mean the new frontend bundle is already being served. On the phases 0–1 promotion (2026-07-31) the API assertions passed immediately while the UI check failed on the first run and passed on retry moments later.

Therefore, when verifying after a promotion:

- API-level assertions can run as soon as the deployment reports `Ready`
- UI assertions need a short settle period, or a retry, before a failure is treated as real
- a first-run UI failure right after deploy is re-run before it is reported as a defect

### Promotion Record

| Phase | Branch | Commit SHA | Staging validated | Authorized by | Deployment URL | Date |
|-------|--------|-----------|-------------------|---------------|----------------|------|
| 0 + 1 | `feat/session-structure-phase-0` → `main` | `7b74017` (merge) | No — promoted directly per project lead | Project lead | https://trainer-ntrezrarz-paulo-eduardo-peress-projects.vercel.app | 2026-07-31 |
| 2 | `feat/session-structure-phase-2` → `main` | `d26bece` (merge) | No — validated on `dev:local` against real `coach_dna` data, script-based | Project lead | https://trainer-ia3rb6zb3-paulo-eduardo-peress-projects.vercel.app | 2026-08-01 |
| 2 addendum (CORS fix) | `main` (direct) | `87e4c92` | No — verified live in a real browser session, see addendum | Project lead | https://trainer-bhuo0v98m-paulo-eduardo-peress-projects.vercel.app | 2026-08-01 |
| 2 addendum (`coach_dna` RLS) | — (DB policy, no branch) | n/a — applied via migration tool, no staging exists for this project | No — see addendum | Project lead | applied directly to `xbfszzdyskwdctlqzztl` | 2026-08-01 |
| 3 (`phase` columns) | — (DB migration, no branch) | n/a — applied via migration tool, no staging exists for this project | No — see closing notes | Project lead | applied directly to `xbfszzdyskwdctlqzztl` | 2026-08-01 |
| 3 (code: persistence + grouped rendering) | `main` (direct) | _pending — awaiting authorization_ | No — verified live with real trainer + client accounts, see closing notes | _pending_ | _pending_ | 2026-08-01 |

---

## Phase 0 — Taxonomy Alignment & Coach DNA in the Prompt

**Effort:** ~4h · **Risk:** Medium (touches live generation) · **Depends on:** nothing · **Migration:** no

Replaces the ad-hoc taxonomy with `STRUCTURE_BLOCKS` and feeds the trainer's declared order into `generate-workout`. Answers Kamil's `technique` request and makes Coach DNA functional.

### Checklist

- [x] Extract the block keys as a shared contract value (duplicated into `api/*` per the self-contained rule)
- [x] `generate-workout`: accept `session_order: string[]` in the request body
- [x] `generate-workout`: prompt requires the declared block sequence; fall back to a sane default when the trainer has no Coach DNA
- [x] `generate-workout`: `phase` enum in the output contract changes to the 6 block keys
- [x] Re-map `isAdjustable` — working blocks (`strength`, `conditioning`) absorb trimming/padding; `mobility`, `warmup`, `technique`, `cooldown` are protected
- [x] Complement mode returns working blocks only (replaces the current "main only" rule)
- [x] `WorkoutPlanEditorScreen`: send the trainer's `coach_dna.structure.order` with the request
- [x] Align `ADJUSTABLE_PHASES` in `generate-smart-workout` with the same taxonomy
- [x] Version the AI response schema alongside the prompt change (§6.3); keep parsing tolerant of the previous `phase` values so in-flight responses degrade instead of failing

### Acceptance

- [x] Live probe: generated session follows the trainer's declared order, `technique` present when declared
- [x] Time band still 90–110% across 3 runs on both endpoints
- [x] Trainer without Coach DNA still receives a coherent session (default order)
- [x] `ai-time-budget.spec.ts` updated for the new taxonomy and green

---

## Phase 1 — Context Card Accuracy

**Effort:** ~1h · **Risk:** Low · **Depends on:** nothing · **Migration:** no

The card must display the same value that governs the time banner, including its provenance.

### Checklist

- [x] Render the resolved `availableMinutes` (check-in → profile → none), not `latestCheckin.minutes`
- [x] Move the time chip out of the `latestCheckin ?` branch so it shows without a check-in
- [x] Label the source (today's check-in vs. profile default) — new i18n keys in `en`/`pt`/`de`/`es`
- [x] Keep the "no check-in" notice for the remaining context fields

### Acceptance

- [x] Client with check-in minutes → shows check-in value
- [x] Client with null check-in minutes but profile availability → shows profile value, marked as such
- [x] Client with neither → no time chip, banner correctly absent
- [x] Displayed value always equals the value used by the banner

---

## Phase 2 — Honour the Declared Session Structure on the Client Path

**Effort:** ~1.5h (revised down from ~3h) · **Risk:** Low · **Depends on:** Phase 0 taxonomy · **Migration:** no

**Scope revised 2026-07-31**, after finding #4 was refuted (above). The wiring the original phase
proposed to build already existed. What was actually missing is that the declared order reached the
model as *description* rather than as *instruction*: `generate-smart-workout` printed one line inside
the Coach DNA dump (`Session order: a → b → c`) with nothing telling the model to follow it, while
the trainer endpoint received a binding `SESSION STRUCTURE` block in Phase 0
(`generate-workout.ts:450`) plus `sanitizeSessionOrder` (`:211`). This phase brings the client path
to parity.

### Checklist

- [x] `StartWorkoutScreen`: consume the fetched `coach_dna` row instead of discarding it — **already
      true since 2026-06-09; predates this workstream, no change required** (`StartWorkoutScreen.tsx:550-551`)
- [x] Populate `TrainerContext` — `sessionOrder`, `intensityCurve`, `preferredFormats`,
      `favoriteExercises`, `avoidExercises`, `focus` — **already true since 2026-05-31; predates this
      workstream, no change required** (`buildAIContext.ts:12-41`)
- [x] Preserve the `ai-coach` autonomous path when the client has no linked trainer — **already true;
      `resolveTrainerContext` falls back to `DEFAULT_AI_TRAINER` and `buildUserPrompt` branches on
      `trainer.id === 'ai-coach'`**
- [x] Confirm the prompt renders the values — it did, but only descriptively; converted into a
      binding `## SESSION STRUCTURE` section stating the sequence must be followed
- [x] Port `sanitizeSessionOrder` into `generate-smart-workout` (duplicated per the self-contained
      `api/*` rule), with `DEFAULT_SESSION_ORDER` when the trainer declared nothing
- [x] Teach the block vocabulary in the system prompt, mirroring `generate-workout`
- [x] Fix `DEFAULT_AI_TRAINER.sessionOrder` — Phase 0 regression, see below

### Acceptance

- [x] Client linked to a trainer receives a session following that trainer's declared order — 8/8
      exact match on live runs against Carlos Silva's real `coach_dna`
- [x] Client with no trainer keeps the current autonomous behaviour — autonomous control returns the
      default 4-block sequence
- [x] Time band unchanged — 91–107% across 8 runs, inside the 90–110% band
- [x] `avoidExercises` respected in generated output — 0 exact-name violations across 3 runs

### Phase 0 regression, found in Phase 2

`DEFAULT_AI_TRAINER.sessionOrder` (`buildAIContext.ts:234`) still read `['warmup', 'main', 'cooldown']`.

**How it entered:** Phase 0 changed the `phase` enum at `generate-smart-workout.ts:443` to the six
canonical blocks and retired `main`, without checking which other code supplied `phase` values. This
constant was one of them and was not updated.

**Why it was latent, not live:** `buildUserPrompt` skips the whole trainer section when
`trainer.id === 'ai-coach'`, and `DEFAULT_AI_TRAINER.id` *is* `'ai-coach'` — so the stale value was
never printed into a prompt. Phase 2 makes it load-bearing, because the new `SESSION STRUCTURE`
section is emitted on the autonomous path too. Left unfixed, sanitisation would have dropped the
retired `main` and handed the autonomous client `warmup → cooldown` — a session containing no
working block at all. Confirmed by mutation M3.

Now sourced from `DEFAULT_SESSION_ORDER` in `src/lib/sessionStructure.ts`, so the constant and the
agreed default cannot drift apart again.

### Phase 2 closing notes (2026-07-31)

- **The plan's premise did not survive contact with the code.** See the finding #4 box above. Three
  of the four original checklist items required no work; the phase was rescoped to the real gap
  before any code was written, and the project lead approved the revised scope.
- **The defect is weaker than "the order is ignored" — measured, not assumed.** A baseline probe on
  the pre-change code (stashed, server restarted, same trainer and client) followed the declared
  order in **9 of 11** runs. The two failures were the same `warmup`/`mobility` swap. So the model
  was already inferring structure from the descriptive line and the phase enum; it simply had no
  obligation to. Post-change: **8 of 8** exact. At these sample sizes the difference is suggestive,
  **not statistically conclusive** — the durable argument is that the requirement is now stated
  rather than inferred, which is what §6.3 asks for.
- **Coverage:** 8 unit tests on the prompt contract. Mutation-verified individually — removing the
  binding section fails 6, un-sanitising the descriptive line fails 2, reverting
  `DEFAULT_AI_TRAINER` fails 2, removing the system-prompt vocabulary fails 1.
- **`buildPrompt` is now exported** from `generate-smart-workout.ts` as a test seam. The contract is
  a property of the prompt, so it is asserted directly instead of being inferred from a live
  generation that can pass by luck.
- **Observation, out of scope:** the endpoint returns 500 when the model emits truncated JSON (seen
  once on baseline, once post-change). Pre-existing, unrelated to this phase, and a candidate for the
  resilient-parsing work §6.3 asks for.
- **Observation, out of scope:** `avoidExercises` is matched literally by the model. With `Deadlift`
  avoided it still prescribed `Romanian Deadlift`. Defensible, but a trainer probably means the
  movement pattern. Pre-existing behaviour, unchanged here.
- **Validation:** 45 unit green (37 + 8 new), 26 e2e green, `tsc --noEmit` clean, `lint` 0 errors,
  `build` green.

### Phase 2 addendum (2026-08-01) — two defects found only by a real browser session

Everything above was validated by script: Playwright's API `request` fixture, and Node `fetch()`
probes using each account's own real JWT to fetch and forward Coach DNA manually. All green. None of
it is a real client, in a real browser, going through the app's own data-fetching code. The project
lead asked for exactly that test before this phase could be called done. It surfaced two defects that
every prior check — automated and manual — had missed, both pre-dating this phase.

**1. `generate-smart-workout` never sent CORS headers.** Confirmed via the browser console:
`TypeError: Failed to fetch` at `workoutGeneration.ts:83`, silently caught by
`StartWorkoutScreen`'s fallback path (`console.warn('[start-workout] AI generation failed —
using fallback plan', err)`), so the client saw a plausible, generic workout with no visible
error. `generate-workout.ts:331-333` already sets `Access-Control-Allow-Origin` — this endpoint
never did. In the two-process local setup (`vite` on 5173, `api-server.mjs` on 3000) that's cross-origin;
the same gap was already flagged for Capacitor in the sibling file's own comment ("CORS — required
for Capacitor WebView"), so it plausibly also blocks the native mobile client, not just local dev.
Production web is same-origin and unaffected. Fixed: same 3-line pattern ported into
`generate-smart-workout.ts`, plus explicit `OPTIONS` handling and the `VercelResponse` interface
extended with `setHeader`/`end` to match.

**2. `coach_dna` RLS had no read policy for a linked client.** With CORS fixed, the live session still
came back with the 4-block default order, not Carlos Silva's declared 6. Traced by querying as Tiago
Moreira (his own JWT, not a script-constructed payload): `GET coach_dna?trainer_id=eq.<Carlos>` → `[]`,
despite an `active` row in `trainer_clients` confirmed straight from the database. The only policy on
`coach_dna` was `trainer manages own coach dna` (`trainer_id = auth.uid()`) — nothing granted a client
read access to their own trainer's row. This is not a Phase 2 regression: it means Coach DNA has never
reached a real client through `StartWorkoutScreen`, for any field (`archetype`, `favoriteExercises`,
`avoidExercises`, `focus` — not just `sessionOrder`), since the table was created. Every earlier probe
in this phase (and the finding #4 refutation) fetched `coach_dna` with the *trainer's own* token and
forwarded it manually — none exercised the client-side RLS-gated read.

Fixed with an additive policy, applied directly to production (no staging environment exists for this
project — §9.2 non-conformity already on record):

```sql
create policy "linked client reads trainer coach dna"
on public.coach_dna for select to public
using (exists (
  select 1 from public.trainer_clients tc
  where tc.trainer_id = coach_dna.trainer_id
    and tc.client_id = auth.uid()
    and tc.status = 'active'
));
```

Archived at `supabase/sql-archive/supabase-coach-dna-linked-client-select-20260801.sql`. Rollback:
`drop policy "linked client reads trainer coach dna" on public.coach_dna;` — one statement, no data
migration.

**Verified end-to-end, in the browser, as the real client:**

| Step | Result |
|---|---|
| `coach_dna` read as Tiago, pre-fix | `[]` |
| `coach_dna` read as Tiago, post-fix | full row, `structure.order` intact |
| Live session, real browser, pre-fix | `warmup → strength → conditioning → cooldown` (default — Coach DNA never arrived) |
| Live session, real browser, post-fix | `warmup → mobility → technique → strength → conditioning → cooldown` — exact match to Carlos Silva's declared order |

**Process note, for the record:** the project lead's instruction was direct — this could have been
caught before Phase 2 was ever reported as verified, by testing with the client's own session instead
of a trainer's token or a synthetic payload. Recorded here so the next phase's validation plan starts
from a real logged-in session, not a script standing in for one.

---

## Phase 3 — Grouped Rendering & Phase Persistence

**Effort:** ~6h · **Risk:** Medium (schema + UI + live session) · **Depends on:** Phases 0–2 · **Migration:** **yes**

Section headers in the plan editor. Requires persistence — without it, grouping survives editing but is lost on save/reload, which is worse than not shipping it.

### Checklist

- [x] Migration: `plan_exercises.phase text null`, `workout_session_exercises.phase text null` — nullable and additive, so the reversal is a plain `DROP COLUMN` with no data loss on existing rows (§4.9); ~~apply to `savana.staging` first~~ **correction: `savana.staging` is a different project (sevenseeds-web's Supabase, `ewumdmxrfnmchjqawxef`), not this project's. No staging environment exists for `sevenseeds.trainer` (`xbfszzdyskwdctlqzztl`) — this line was a copy-paste artifact from the shared template. Applied directly to production, per project-lead authorization, same as the Phase 2 addendum's RLS change**
- [x] Write the rollback statement in the migration file before applying it anywhere — archived at `supabase/sql-archive/supabase-phase-persistence-20260801.sql`
- [x] Regenerate `src/types/supabase.ts`
- [x] `WorkoutPlanEditorScreen`: preserve `phase` in `WorkoutExercise` state (currently dropped in the AI mapping)
- [x] Persist `phase` in `sendPlan`; read it back when loading an existing plan — this screen never reloads an existing plan (always compose-and-send, confirmed by inspection); the "reopen" acceptance criterion below is about the client's plan card instead, see closing notes
- [x] Grouped rendering with block label, icon and colour from `STRUCTURE_BLOCKS`
- [x] Manual exercises: assignable block, defaulting to the first working block (`strength`, i.e. `ADJUSTABLE_BLOCKS[0]`)
- [x] `startSessionNow` propagates `phase` into the live session
- [x] Stop flattening in `workoutGeneration.ts` — `mapExercise` now takes the containing phase and carries it onto each `GeneratedWorkoutExercise`
- [x] Decide and document the client-side display of blocks (grouped vs. sequential) — **decision: sequential.** Grouped section headers (label/icon/colour) are implemented **only** in `WorkoutPlanEditorScreen` (the trainer's screen). Every client-facing surface (`StartWorkoutScreen`'s plan card, `WorkoutModeScreen`'s live session) carries `phase` through the full data path — DB, types, every mapping function — with **no new grouped UI**, consistent with Decision #3 (2026-07-31): "grouped rendering on the client's live session is deferred to a separate track." Extended that same treatment to the pre-session plan-card preview, for consistency.

### Acceptance

- [x] Save and reopen a plan → grouping preserved — verified as the client's plan-card, not the trainer's editor (which never reloads): sent a 2-exercise mixed-block plan as Carlos Silva, reloaded as the linked client, `phase` intact end to end
- [x] Mixed AI + manual plan groups correctly — the grouping memo keys off `phase` alone, indifferent to origin; not re-verified with a live AI batch in this pass (Phase 0/2 already established the AI path emits valid `phase` values; the mapping that carries them into editor state is exercised by the new unit tests instead)
- [x] Live session shows the block the exercise belongs to — data-only, per the sequential-display decision above: `workout_session_exercises.phase` persists and reaches `ExState.phase`; no visible label added on this screen
- [x] Legacy plans (null `phase`) render without headers and without errors — confirmed live: pre-existing plans and sessions (May 2026, before this migration) show `phase: null` and rendered without error in every screen touched
- [x] Full e2e suite green — 26/26

### Phase 3 closing notes (2026-08-01)

- **Migration applied directly to production**, same as the Phase 2 addendum's RLS change: this project has no staging environment (Open Decision, below, still unresolved). The checklist's original instruction to apply to `savana.staging` referred to a different project entirely.
- **Verified end-to-end with real accounts, not synthetic payloads** — the lesson from the Phase 2 addendum applied from the start of this phase instead of being learned again: logged in as Carlos Silva (trainer), built a 2-exercise plan spanning two blocks in the real UI, sent it; logged in as Andre Lima (his linked client), confirmed the plan card and the started live session; read `plan_exercises` and `workout_session_exercises` directly from the database to confirm `phase` persisted correctly on both tables, for both a trainer-composed plan and the session started from it.
- **Grouping order is independent of entry order.** Verified live: an exercise added to the `strength` block first, followed by one added to `warmup`, still render `Aquecimento` (warmup) before `Força` (strength) — `STRUCTURE_BLOCKS` order, not insertion order. Covered by a mutation-verified unit test.
- **Scope decision, stated plainly:** grouped section rendering shipped only in the trainer's plan editor. Every client-facing screen carries the data without new grouped UI, per Decision #3. If the project lead wants a visible (even minimal, non-grouped) block indicator on the client's live session, that is a follow-up, not a gap in this phase — the data is already there (`ExState.phase`) to build it from.
- **Coverage:** 5 new unit tests — 2 for `mapExercise`'s phase-carrying through the smart-endpoint flattening, 3 for the plan editor (manual-exercise default block, reassignment, group ordering). Mutation-verified individually: dropping the phase parameter in the flatten fails 1 test, defaulting `NEW_EXERCISE_DRAFT.phase` to `null` fails 2, disabling the block-picker's `onClick` fails 2, reversing `STRUCTURE_BLOCKS` order fails 1.
- **Observation, out of scope:** `src/types/supabase.ts` was already stale before this phase in an unrelated way — `plan_exercises.completed` existed in the checked-in types but not in the live table. Confirmed dead on both sides (no code reads or writes it) before regenerating; not investigated further.
- **Observation, out of scope:** `generate-smart-workout.ts` does not normalise the model's raw `phase` value before returning it (unlike `generate-workout.ts`'s `normalizeBlock` pass). No practical impact on what shipped here — the only grouped-rendering surface (the trainer's editor) only ever produces exercises through paths that already guarantee a valid block (the picker, or `normalizeBlock` applied client-side in `askAI`) — but worth hardening at the source if a future client-side consumer ever renders `generate-smart-workout`'s `phase` values directly.
- **Observation, out of scope:** during live verification, starting a session created two identical `workout_sessions` rows one millisecond apart. Traced to React 18 StrictMode's intentional double-invocation of effects in dev — a known framework behaviour, not present in production builds, and not something this phase touched. Not investigated further.
- **Validation:** 50 unit green (45 + 5 new), 26 e2e green, `tsc --noEmit` clean, `lint` 0 errors, `build` green.

---

## Progress Log

| Phase | Status | Completed | Commit | Notes |
|-------|--------|-----------|--------|-------|
| 0 — Taxonomy & Coach DNA in prompt | **Promoted** | 2026-07-31 | `feat/session-structure-phase-0` | Defect found and fixed mid-phase: time fitting could delete an entire declared block. |
| 1 — Context card accuracy | **Promoted** | 2026-07-31 | `feat/session-structure-phase-0` | Real but narrower than first reported — see closing notes. |
| 2 — Declared structure on client path | **Promoted** | 2026-08-01 | `d26bece` | Rescoped: the plan's finding #4 was false. Fixed a Phase 0 regression (`DEFAULT_AI_TRAINER`) found here. |
| 2 addendum — CORS + `coach_dna` RLS | RLS **live in production**; CORS fix **awaiting push authorization** | 2026-08-01 | RLS: DB policy, no commit. CORS: pending | Found only once tested in a real browser as the real client — see addendum. Neither is a Phase 2 regression; both pre-date it. |
| 3 — Grouped rendering & persistence | **Migration live in production; code awaiting push authorization** | 2026-08-01 | pending | Grouping shipped in the trainer's editor only (client-side deferred, Decision #3). Verified live with real trainer + client accounts and direct DB reads. |

**Update rule:** this table and the phase checklists are updated at the close of each phase, before requesting push authorization.

### Phase 1 closing notes (2026-07-31)

- **Scope of the defect was overstated when first reported.** The probe that produced the original evidence read the context card before the async profile/check-in fetch had mounted it, so it reported "no time displayed" for all five of the trainer's clients. Re-measured with a proper wait: only the client whose latest check-in carries no minutes was affected. The other four always showed their check-in value. The defect was real; its blast radius was one client in five, not five in five.
- **Fix verified in the real UI:** card and banner now agree for all five clients, and the profile-sourced case is labelled *"45min disponível (habitual, do perfil)"* rather than presented as a check-in figure.
- **Availability chip moved out of the check-in branch**, so a client with no check-in at all still shows the profile figure the banner is measuring against.
- **Coverage:** 4 unit tests on provenance (check-in wins / profile fallback and labelled / neither → no chip / card matches banner). Mutation-verified — reverting the card change fails two of them.
- **Validation:** 37 unit green, 26 e2e green, `tsc --noEmit` clean.

### Phase 0 closing notes (2026-07-31)

- **Defect found during validation, not review.** With the default order, trimming 4 exercises removed `conditioning` from the session entirely. Fitting now refuses to empty a block: it may shorten one, never delete one the trainer declared. Covered by `generate-workout: fitting never empties a declared block`.
- **`generate-smart-workout` emitted `main`** where the canonical vocabulary says `strength`; its contract and `ADJUSTABLE_PHASES` were aligned, with `main` still tolerated on input so older labels resolve to a working block.
- **Unit stubs required updating** — the new `coach_dna` read in the editor broke 9 tests that throw on unexpected tables.
- **Lint debt paid on the impacted scope:** `ai-time-budget.spec.ts` carried 7 pre-existing `any` errors and my change added an eighth; the file is now fully typed and clean (§8.2). One pre-existing error remains outside this scope (`isTrainerRole` unused in `generate-smart-workout.ts`).
- **Validation:** 26 e2e green, 33 unit green, `tsc --noEmit` clean. Live probes on the local API showed the declared sequence honoured — `warmup → mobility → technique → strength → conditioning → cooldown` — with `technique` present and the session at 93–107% of the window.

---

## Decisions Taken (project lead, 2026-07-31)

1. **Execution order:** 0 → 1 → 2 → 3, as proposed.
2. **Default order for trainers without Coach DNA:** `warmup → strength → conditioning → cooldown`.
3. **Phase 3 client display:** grouped rendering on the client's live session is deferred to a separate track.
4. **Legacy backfill:** existing `plan_exercises` rows keep `phase` null; they render ungrouped.

## Open Decision — Staging Environment (blocks promotion, not implementation)

§9.2 requires canonical validation in a non-production environment, and states that post-production smoke does not replace it. Current state:

- `savana.staging` Supabase project exists (`ewumdmxrfnmchjqawxef`)
- no staging deployment target is in use; Vercel shows only Production deployments from `main`
- consequently, no phase in this plan can be promoted in full compliance until a staging target exists

Options for the project lead:

- **A.** Stand up a staging Vercel environment bound to `savana.staging`, validate each phase there, then promote. Fully compliant; adds setup effort before Phase 0 promotion.
- **B.** Validate on Vercel **Preview** deployments generated by each phase's Pull Request, pointed at `savana.staging`. Lighter, uses machinery already available, and satisfies "traceable non-production environment".
- **C.** Documented exception per phase, recorded in the Promotion Record with the reason. Non-compliant by default — only acceptable as an explicit, time-boxed decision.

Recommendation: **B**. It satisfies §9.2 and §8.1 with the same artefact — the Pull Request — and requires no new infrastructure.

Implementation of each phase proceeds on its feature branch regardless; this decision gates promotion only.

## Open Finding — Manually-Entered Exercise Names Are Never Translated (2026-08-01)

Found and confirmed during Phase 3's live verification, unrelated to this plan's scope — recorded here so it is not lost, and flagged to the project lead at the close of this plan's execution.

**Scenario:** a trainer builds a plan manually, in their own preferred UI language. A linked client whose profile is set to a different language opens that plan. Every surrounding UI string renders in the client's language — but the exercise names themselves render exactly as the trainer typed them, in the trainer's language.

**Reproduced live, this session:** logged in as Carlos Silva (pt-BR UI), added `Agachamento Livre` and `Corrida Leve` manually to Andre Lima's plan. Logged in as Andre Lima — UI rendered in English (`Start Workout`, `Postpone`, `sets`, `rest`…), but both exercise names appeared verbatim in Portuguese.

**Root cause:** `src/i18n/index.ts:3` — `// Exercise/muscle names are DB content and are NOT translated here.` `muscle_group` has a real translation path despite that comment (`translateMuscleGroup.ts`, mapping a closed 8-value canonical enum to the UI locale). `exercise_name` has none, anywhere in the codebase — it is free text, rendered raw on every client-facing screen (`WorkoutModeScreen`, `ExerciseCard`, `StartWorkoutScreen`'s plan card). No on-demand translation pipeline exists in this project (`api/` has nothing equivalent to sevenseeds-web's `translate-content`; there is no `supabase/functions` directory at all).

**Why AI-generated plans don't show this:** the generation prompt already requests the client's own `locale`, so AI-authored exercise names are born in the client's language. The gap is specific to trainer-typed, manual exercise names.

**Not covered by §7.1's identity exception:** the directive protects exercise names only "if they carry brand-specific meaning." A generic movement name like `Agachamento Livre` does not qualify — it is the same category of content as "AI-generated workout descriptions," which §7.2 already lists as translatable.

**Pre-existing, not introduced by Phases 0–3.** Not fixed here — fixing it means adding a real translation pipeline for free text (on-demand, cached, versioned per §6.5), which is new feature work, not a bug-fix-sized change.

**Status: open, unscoped.** No phase in this plan addresses it. Flagged to the project lead for a decision on priority and approach.
