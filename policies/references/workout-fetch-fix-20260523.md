# Workout Screen Failure Fix — 2026-05-23

## Scope
- Surface issue reported on deployed app: `Start Workout` screen showed `Failed to fetch` with a `Retry` CTA.
- Production URL under test: `https://trainer-lake.vercel.app/`

## Reproduction
1. Open client profile on production.
2. Enter the workout flow.
3. Wait for `Today's AI plan` to load.
4. Screen showed `Failed to fetch`.

## Diagnosis
- Production API route `/api/generate-workout` was reachable.
- Direct production POST returned `200` with a valid workout payload.
- Vercel runtime logs showed successful `POST /api/generate-workout` during the failing browser flow.
- Conclusion: the visible failure was not the AI generation request itself.
- Root cause was in the client flow: plan generation and persistence were handled inside one `try/catch`, so any later failure in the Supabase persistence path could overwrite a successfully generated plan with a generic fetch error state.
- A second production pass showed another failure mode in the embedded browser: the workout page could fail before the request reached the live Vercel function logs.
- Final client-side mitigation was:
  - treat `physical_profiles` lookup as optional context, not a blocking dependency
  - use an explicit absolute API origin in production instead of relying on a relative empty-base path

## Fix
- Updated `src/screens/client/StartWorkoutScreen.tsx`.
- Separated workout generation from background persistence.
- Preserved generated plans in UI even if saving the generated plan fails later.
- Added stricter response parsing and invalid-response messaging for the API fetch.
- Reset stale `plan` and `planId` before each fresh generation attempt.
- Wrapped `physical_profiles` loading in its own non-fatal `try/catch`.
- Switched workout generation requests to use an explicit API origin:
  - client flow: `window.location.origin` in production, `http://localhost:3000` on local dev unless `VITE_API_URL` overrides it
  - trainer editor flow: `VITE_API_URL` or `window.location.origin`

## Verification
- `npm run build` passed locally.
- Deployed to production:
  - Production alias: `https://trainer-lake.vercel.app`
  - Latest deployment URL: `https://trainer-gjj2g4btb-paulo-eduardo-peress-projects.vercel.app`
  - Latest inspect URL: `https://vercel.com/paulo-eduardo-peress-projects/trainer/DWZ1oEUnw4AEphyFYYyXinUsVt2V`
- Final browser verification on production:
  - Opened `Workout Start today's plan` from the live `User Profile` screen
  - `Today's AI plan` rendered a populated exercise list
  - `Start Workout` CTA was enabled
  - Vercel recorded `POST /api/generate-workout 200` for the verified run

## Remaining Follow-up
- Inspect Supabase persistence logs for generated workout plans to determine which downstream write was failing intermittently.
- Add a non-blocking user-facing status if background save failures need to be visible to trainers or clients later.
