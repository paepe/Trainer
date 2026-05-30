# Workout Generation Centralization — 2026-05-23

## Problem
- The app could behave differently depending on how the user reached `Start Workout`.
- `Workout` from the profile area and `Generate today’s workout` from `Daily check-in` were not guaranteed to use the same request path or the same check-in context.
- That violated the simplicity principle and made the `Failed to fetch` diagnosis noisy.

## Change
- Added a shared module: `src/lib/workoutGeneration.ts`
- Centralized the AI workout request into one function:
  - resolves the API base in one place
  - performs the fetch in one place
  - parses and validates the API response in one place
  - normalizes transport errors into a clearer service-level error

## Modules moved to the shared call
- `src/screens/client/StartWorkoutScreen.tsx`
- `src/screens/trainer/WorkoutPlanEditorScreen.tsx`

## Context simplification for client workout flow
- `StartWorkoutScreen` no longer depends only on volatile in-memory check-in state.
- Before calling the AI, it now resolves:
  - latest persisted `checkins` row for the logged-in user
  - current `physical_profiles` row
  - cycle context when applicable
- If the latest check-in is unavailable, it falls back to the current in-memory check-in state.

## Why this is simpler
- One AI entrypoint
- One API-base resolver
- One response parser
- One error model
- One context-loading strategy for the client workout flow

## Verification
- `npm run build` passed locally.
- Deployed to production:
  - Production alias: `https://trainer-lake.vercel.app`
  - Deployment URL: `https://trainer-91h3hxfoa-paulo-eduardo-peress-projects.vercel.app`
  - Inspect URL: `https://vercel.com/paulo-eduardo-peress-projects/trainer/ECKdWhXpjN3tQJX3dxQcTBeXNHjA`
- Browser verification on production:
  - `Workout` from the profile area loaded `Start Workout` with a generated plan
  - `Generate today’s workout` from `Daily check-in` also loaded `Start Workout` with a generated plan

## Files changed
- `src/lib/workoutGeneration.ts`
- `src/screens/client/StartWorkoutScreen.tsx`
- `src/screens/trainer/WorkoutPlanEditorScreen.tsx`
