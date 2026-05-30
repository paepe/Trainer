# Onboarding Cycle Card Fix — 2026-05-23

## Scope
- Surface issue reported on deployed app: onboarding Step 4 showed the `Track menstrual cycle` card for a male user.
- Production URL under test: `https://trainer-lake.vercel.app/`

## Fix
- Updated `src/screens/auth/OnboardingScreen.tsx`.
- Added gender-aware rendering for the Step 4 cycle-tracking section.
- For users with `gender === 'male'`:
  - the menstrual-cycle card is hidden
  - the Step 4 subtitle no longer mentions cycle tracking
- For users who can use cycle tracking, the existing card behavior remains unchanged.

## Verification
- `npm run build` passed locally.
- Deployed to production:
  - Production alias: `https://trainer-lake.vercel.app`
  - Deployment URL: `https://trainer-7j0l62700-paulo-eduardo-peress-projects.vercel.app`
  - Inspect URL: `https://vercel.com/paulo-eduardo-peress-projects/trainer/7QADFHp46wuYFf3oH6b8a374KxNe`
- Browser verification on production:
  - Opened `Onboarding`
  - Advanced to `Step 4 / 4`
  - Confirmed subtitle reads `Injuries or restrictions. Stays private.`
  - Confirmed `Track menstrual cycle` card is not rendered for the current male profile
