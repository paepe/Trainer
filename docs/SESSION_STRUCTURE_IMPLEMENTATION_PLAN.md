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
| 4 | Client screen fetches Coach DNA and discards the result | `StartWorkoutScreen.tsx:461`; result never referenced |
| 5 | `TrainerContext.sessionOrder` exists and is printed to the prompt, but nobody populates it | `api/generate-smart-workout.ts:118,526` |
| 6 | Session phase is dropped on both paths | trainer editor mapping; `workoutGeneration.ts:193` flattens phases |
| 7 | No `phase` column on `plan_exercises` / `workout_session_exercises` | `information_schema` query — empty |
| 8 | Context card shows available time only when it comes from the check-in | `WorkoutPlanEditorScreen.tsx:500` |

**Net effect:** Coach DNA is sold on Pro and Elite and currently influences nothing in generation.

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

### Promotion Record

| Phase | Branch | Commit SHA | Staging validated | Authorized by | Deployment URL | Date |
|-------|--------|-----------|-------------------|---------------|----------------|------|
| — | — | — | — | — | — | — |

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

- [ ] Render the resolved `availableMinutes` (check-in → profile → none), not `latestCheckin.minutes`
- [ ] Move the time chip out of the `latestCheckin ?` branch so it shows without a check-in
- [ ] Label the source (today's check-in vs. profile default) — new i18n keys in `en`/`pt`/`de`/`es`
- [ ] Keep the "no check-in" notice for the remaining context fields

### Acceptance

- [ ] Client with check-in minutes → shows check-in value
- [ ] Client with null check-in minutes but profile availability → shows profile value, marked as such
- [ ] Client with neither → no time chip, banner correctly absent
- [ ] Displayed value always equals the value used by the banner

---

## Phase 2 — Activate Coach DNA on the Client Flow

**Effort:** ~3h · **Risk:** Low (contract already exists) · **Depends on:** Phase 0 taxonomy · **Migration:** no

The autonomous client path already fetches Coach DNA and throws it away, while the endpoint already declares the fields. Highest return for the effort.

### Checklist

- [ ] `StartWorkoutScreen`: consume the fetched `coach_dna` row instead of discarding it
- [ ] Populate `TrainerContext` — `sessionOrder`, `intensityCurve`, `preferredFormats`, `favoriteExercises`, `avoidExercises`, `focus`
- [ ] Preserve the `ai-coach` autonomous path when the client has no linked trainer
- [ ] Confirm the prompt renders the values (already wired at `generate-smart-workout.ts:526`)

### Acceptance

- [ ] Client linked to a trainer receives a session following that trainer's declared order
- [ ] Client with no trainer keeps the current autonomous behaviour
- [ ] Time band unchanged
- [ ] `avoidExercises` respected in generated output

---

## Phase 3 — Grouped Rendering & Phase Persistence

**Effort:** ~6h · **Risk:** Medium (schema + UI + live session) · **Depends on:** Phases 0–2 · **Migration:** **yes**

Section headers in the plan editor. Requires persistence — without it, grouping survives editing but is lost on save/reload, which is worse than not shipping it.

### Checklist

- [ ] Migration: `plan_exercises.phase text null`, `workout_session_exercises.phase text null` — nullable and additive, so the reversal is a plain `DROP COLUMN` with no data loss on existing rows (§4.9); apply to `savana.staging` first
- [ ] Write the rollback statement in the migration file before applying it anywhere
- [ ] Regenerate `src/types/supabase.ts`
- [ ] `WorkoutPlanEditorScreen`: preserve `phase` in `WorkoutExercise` state (currently dropped in the AI mapping)
- [ ] Persist `phase` in `sendPlan`; read it back when loading an existing plan
- [ ] Grouped rendering with block label, icon and colour from `STRUCTURE_BLOCKS`
- [ ] Manual exercises: assignable block, defaulting to the first working block
- [ ] `startSessionNow` propagates `phase` into the live session
- [ ] Stop flattening in `workoutGeneration.ts:193` — carry the phase through to the client
- [ ] Decide and document the client-side display of blocks (grouped vs. sequential)

### Acceptance

- [ ] Save and reopen a plan → grouping preserved
- [ ] Mixed AI + manual plan groups correctly
- [ ] Live session shows the block the exercise belongs to
- [ ] Legacy plans (null `phase`) render without headers and without errors
- [ ] Full e2e suite green

---

## Progress Log

| Phase | Status | Completed | Commit | Notes |
|-------|--------|-----------|--------|-------|
| 0 — Taxonomy & Coach DNA in prompt | **Complete, awaiting promotion** | 2026-07-31 | `feat/session-structure-phase-0` | Defect found and fixed mid-phase: time fitting could delete an entire declared block. |
| 1 — Context card accuracy | Not started | — | — | — |
| 2 — Coach DNA on client flow | Not started | — | — | — |
| 3 — Grouped rendering & persistence | Not started | — | — | — |

**Update rule:** this table and the phase checklists are updated at the close of each phase, before requesting push authorization.

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
