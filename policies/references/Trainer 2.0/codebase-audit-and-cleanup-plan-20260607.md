# Codebase Audit & Cleanup Plan — 2026-06-07

Scope: src/ (177 TS/TSX), api/ (Vercel functions), repo-root legacy artifacts, SQL migrations, lint/type-safety posture.

## Findings Summary

### A. Dead code
- Orphaned root-level legacy JSX (~4.5k LOC, not in Vite build per `vite.config.ts`):
  `app.jsx`, `app-v1.jsx`, `app-print.jsx`, `screens.jsx`, `screens-v1.jsx`, `android-frame.jsx`, `tweaks-panel.jsx`, `refactor.py`.
  Referenced only by offline prototype HTML (`TrAIner App*.html`, `studio.html` design handoffs).

### B. Duplicated / inconsistent patterns
- Three workout-generation surfaces still coexist: `api/generate-workout.ts` (legacy/fallback), `api/generate-smart-workout.ts` (current DeepSeek pipeline), `src/lib/workoutGeneration.ts` (dual-endpoint wrapper). Acknowledged in `policies/references/artifacts/workout-generation-centralization-20260523.md` — not yet finalized.
- No unified error-logging strategy: `useStudioData.ts` logs with `[useStudioData]` prefixes, `App.tsx` logs once, the rest of the codebase silently swallows Supabase `{ error }` results (~24 sites).

### C. Type-safety gaps
- 34 `as any` / `as unknown as` casts, concentrated in: `App.tsx:293,297,323,624` (Realtime payload casts, `push: any`), wizard steps (`undefined as unknown as PrimaryGoal` ×5), `InboxScreen.tsx`, `CheckInVoice.tsx`, `NotificationContext.tsx` (`t: any`).
- No `@ts-ignore`/`@ts-expect-error` found (clean).

### D. Structural inconsistencies
- 25 `supabase-*.sql` files at repo root, not under `supabase/migrations/` with timestamp convention.
- Context module naming drift in `src/contexts/index.ts` (mixed `*Provider` / `*Context` exports).
- ESLint config mismatch: `.eslintrc.js` present but ESLint version expects flat `eslint.config.js` — lint is effectively not running.

### E. Positive baseline
- Single, correctly centralized Supabase client (`src/supabase.ts`).
- TS conversion essentially complete (181 TS/TSX files; `CONVERSION-TO-TYPESCRIPT.md` phases done).
- No TODO/FIXME/HACK debt in `src/`.

---

## Phased Plan

### Phase 1 — Zero-risk cleanup (dead code removal)
- [ ] Confirm zero references to root-level legacy files via grep across `src/`, `api/`, `*.html`, `vite.config.ts`, `vercel.json`
- [ ] Delete `app.jsx`, `app-v1.jsx`, `app-print.jsx`, `screens.jsx`, `screens-v1.jsx`, `android-frame.jsx`, `tweaks-panel.jsx`, `refactor.py`
- [ ] If any are needed for design-handoff HTML, move them under `policies/references/Trainer 2.0/artifacts/legacy-prototypes/` instead of deleting
- [ ] Commit as standalone `chore: remove dead legacy JSX prototypes`

### Phase 2 — Tooling restoration
- [ ] Migrate `.eslintrc.js` → flat `eslint.config.js` (match installed ESLint major version)
- [ ] Run `npx eslint src --ext .ts,.tsx` and triage warning list
- [ ] Fix or suppress (with justification) all reported issues; no blanket `eslint-disable`
- [ ] Wire lint into existing CI/build step if not already present

### Phase 3 — Workout pipeline consolidation
**Status: investigated 2026-06-07 — scope re-baselined, partial execution done.**

Findings (correcting the original audit's assumption — the legacy endpoint is
**not** dead weight, it's load-bearing for two real flows):

- `api/generate-workout.ts` (legacy/simple DeepSeek) is still the live path for:
  1. `StartWorkoutScreen.tsx:382` — fallback when the client has **no physical profile**
  2. `WorkoutPlanEditorScreen.tsx:111` — the **trainer-side "Ask AI"** feature, which has
     never been migrated to the smart/safety-context pipeline
- `api/generate-smart-workout.ts` (full safety/context pipeline) powers:
  - `StartWorkoutScreen.tsx:453` — main client path (when a profile exists)
- `src/hooks/useAIContext.ts` (190 LOC, including a `callAI` wrapper that called
  `/api/generate-smart-workout` directly, bypassing `workoutGeneration.ts`) had
  **zero consumers** anywhere in the codebase — confirmed dead code, not a
  duplicated/divergent pattern. **Removed** (commit pending push).

Remaining work — requires functional migration + QA, not a mechanical refactor:

- [ ] Decide whether to migrate `WorkoutPlanEditorScreen`'s "Ask AI" to the smart
      endpoint (requires building full `TrainerContext`/`ClientContext`/etc. on
      the trainer side — currently only partial context is available there)
- [ ] Decide whether to migrate the `StartWorkoutScreen` no-profile fallback to
      the smart endpoint (requires a degraded-context contract on the smart side,
      or keep the legacy endpoint explicitly as the no-profile fallback)
- [ ] Once both are resolved, either retire `api/generate-workout.ts` and
      `requestWorkoutPlan()`, or document them as permanent, intentional
      fallback paths with explicit sunset/keep criteria
- [ ] Manual QA pass (EN/PT/ES/DE) on whichever flows change, before deploy

### Phase 3a — Dead code found during investigation (executed)

- [x] Removed `src/hooks/useAIContext.ts` — entire hook unused (190 LOC), confirmed
      via repo-wide grep with zero references outside the file itself
- [x] Verified `tsc --noEmit`, `eslint`, and `npm run build` all pass clean post-removal

### Phase 4 — Error-handling & observability standardization
**Status: investigated and executed 2026-06-07 — re-baselined, smaller than estimated.**

Re-examination found the original estimate (a "no unified strategy" / ~24 silent
sites) overstated the problem: of 63 `console.*` call sites in `src/`, ~58 already
follow a consistent `[Module] context:` prefix convention with `console.error`.
There is no silent-failure epidemic — nearly every Supabase `{ error }` result is
already logged. Introducing a formal `logger.ts` abstraction (levels, env-awareness)
would be over-engineering relative to the actual gap.

- [x] Identified the 5 true outliers breaking the existing convention:
      `TrainerLibraryExercisesScreen.tsx:79,145` (bare `console.error(e)`),
      `CheckInProntidaoScreen.tsx:102,134` (`.catch(console.error)` with no context),
      `AvatarUpload.tsx:50` (missing `[Module]` prefix)
- [x] Aligned all 5 to the existing `[Module] context:` convention — no new
      abstraction introduced, consistency achieved with minimal surface change
- [x] Verified `tsc --noEmit`, `eslint`, and `npm run build` all pass clean

### Phase 5 — Type-safety hardening
**Status: executed 2026-06-07.**

- [x] `App.tsx:293,297,323` — replaced `(p.new as any)` with a `NotificationLogRow`
      type alias derived from the generated `Database['public']['Tables']` types
- [x] `App.tsx:627` — typed `PushListener({ push })` as `ReturnType<typeof usePushNotifications>`
      (note: `t` in `NotificationContext` is the **brand/theme** object, not an
      i18n `TFunction` — added an exported `BrandTheme` type to `theme/tokens.ts`
      derived from `BRAND`/`TRAINER_BRAND` and used it there)
- [x] Wizard steps (`Step02BasicData`, `Step03Objectives`, `Step04MovementHistory`,
      `Step07FunctionalCapacity`) — replaced `undefined as unknown as X` initializers
      with `Partial<ProfileXxx>` typed locals (all consumers already null-checked).
      Required an explicit merge-and-assert at each `onUpdate` boundary because
      `exactOptionalPropertyTypes: true` doesn't let `Partial<T>` substitute for `T`
      — documented the invariant (gated by `nextDisabled`) inline at each site.
      `Step02BasicData` additionally needed a `setNumericField` helper since
      `exactOptionalPropertyTypes` forbids assigning `undefined` to optional
      `number` fields — clearing now deletes the key instead
- [x] `InboxScreen.tsx` — added missing `read_at` to the `InboxItem` interface
      (the actual root cause of the workaround casts), collapsing two
      `as unknown as` sites into one and removing a redundant intersection type
- [x] `CheckInVoice.tsx` — replaced `window as unknown as Record<string, unknown>`
      with a proper `WindowWithSpeechRecognition` ambient-style interface
- [x] Verified `tsc --noEmit`, `eslint` (232 warnings, down from 237; 0 errors),
      and `npm run build` all pass clean

### Phase 6 — SQL migration hygiene
- [ ] Classify each of the 25 root `supabase-*.sql` files: active migration vs. historical reference
- [ ] Move active ones into `supabase/migrations/` with proper timestamp-prefixed naming (Supabase CLI convention)
- [ ] Archive historical/reference-only ones under `policies/references/Trainer 2.0/artifacts/sql-archive/`
- [ ] Update any scripts/docs pointing to old root paths

### Phase 7 — Naming & module consistency pass
- [ ] Normalize `src/contexts/index.ts` exports to a single convention (`*Context` for the context object, `*Provider` for the provider component — document the rule in `EXECUTIVE_TECHNOLOGY_DIRECTIVE.md` if not already)
- [ ] Spot-check hooks/screens/components for convention drift introduced post-TS-conversion

---

## Sequencing Notes
- Phases 1–2 are independent and lowest-risk — execute first, in either order.
- Phase 3 (workout consolidation) should follow Phase 2 (lint clean baseline) to avoid masking new issues.
- Phases 4–5 can run in parallel once Phase 3 stabilizes the workout contract (avoids rework on `useAIContext.ts`).
- Phase 6–7 are housekeeping — schedule opportunistically, no functional risk.

Each phase: incremental, reversible commits; validate build (`npm run build`) and smoke-test affected screens before moving to the next phase — per Stability & Predictability pillar (`PROFILE.md`).
