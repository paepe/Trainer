# Profile Save Failure Fix — 2026-05-23

## Scope
- Surface issue reported on deployed app: `Edit Profile` showed `TypeError: Failed to fetch` after clicking `Save changes`.
- Production URL under test: `https://trainer-lake.vercel.app/`

## Reproduction
1. Open client profile on production.
2. Enter `Edit Profile`.
3. Click `Save changes`.
4. Screen previously showed `TypeError: Failed to fetch` and stayed on the edit form.

## Diagnosis
- The failing save path used two parallel writes:
  - `profiles` update through `updateProfile`
  - `physical_profiles` upsert through `savePhysicalProfile`
- The `profiles` write used an `update(...).eq(...)` path.
- The screen surfaced low-level thrown errors directly, which is why the UI exposed `TypeError: Failed to fetch`.
- The safer route in this app is an id-based upsert with normalized nullable values, matching the way other profile-adjacent writes already behave.

## Fix
- Updated `src/hooks/useAuth.ts`.
  - Switched profile persistence from `update(...).eq(...)` to `upsert(..., { onConflict: 'id' })`.
  - Normalized nullable profile fields before writing (`phone`, `dob`, `location`, `gender`, `avatar_url`).
- Updated `src/screens/client/EditProfileScreen.tsx`.
  - Stopped saving profile and physical profile in one parallel call.
  - Saved sequentially so the failing branch is isolated.
  - Added safer error message extraction for thrown runtime errors.

## Verification
- `npm run build` passed locally.
- Deployed to production:
  - Production alias: `https://trainer-lake.vercel.app`
  - Deployment URL: `https://trainer-9wbtgay6e-paulo-eduardo-peress-projects.vercel.app`
  - Inspect URL: `https://vercel.com/paulo-eduardo-peress-projects/trainer/h4rBcRCgS5oKCuFFQ26cthHyQ5yV`
- Browser verification on production after deploy:
  - Opened `Edit Profile`
  - Clicked `Save changes`
  - App returned to `User Profile`
  - `TypeError: Failed to fetch` no longer appeared in the verified path

## Follow-up
- If email changes should become a real product feature, that should be handled through Supabase auth email update flow rather than only mirroring a value in `profiles`.
