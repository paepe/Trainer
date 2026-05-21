# Deployment Record — TrAIner Project

**Date:** 20/05/2026 12:25 (UTC-3)  
**Environment:** Production  
**Triggered by:** paepe (project lead — explicit authorization)

## Promotion details

| Field | Value |
|---|---|
| **Source branch** | `main` |
| **Commit SHA** | `e7635ae` |
| **Commit message** | Add Vercel deployment config for static hosting |
| **Deployment URL (prod)** | https://trainer-lake.vercel.app |
| **Deployment URL (preview)** | https://trainer-comsz56e1-pauloeduardoperes-projects.vercel.app |
| **Vercel project** | paulo-eduardo-peress-projects/trainer |
| **Framework** | Static HTML (CDN-based React 18 + Babel) |
| **Inspect URL** | https://vercel.com/paulo-eduardo-peress-projects/trainer/5srzC7kwNgNzvUgRY6Q2RXnwSopM |

## Policy compliance

| Check | Status |
|---|---|
| Secrets exposed in deployment | ✅ Pass — No hardcoded keys, `.env` files gitignored |
| Repository as source of truth | ✅ Pass — Deployed from committed SHA `e7635ae` |
| Recreatable from repository | ✅ Pass — `vercel.json` is committed |
| Pre-publication validation | ✅ Pass — Preview deployment verified before promotion |
| Explicit authorization | ✅ Pass — User requested deployment directly |
| Rollback path | ✅ Pass — Previous commits available for rollback; Vercel instant rollback available |

## Notes

- Initial prototype deployment. No backend, all state is in-memory via React `useState`.
- `.env.local` contains Supabase credentials — properly gitignored, never deployed.

---

## Deployment #2 — Vite + Capacitor migration

**Date:** 20/05/2026 13:35 (UTC-3)  
**Commit SHA:** `daefdba`  
**Commit message:** Migrate to Vite + React + Capacitor + Supabase; add deployment record per §8.3  
**Framework:** Vite 6.4.2 → React 18.3.1 + Supabase JS + Capacitor 7  
**Build output:** `dist/` (430 KB JS, 1.2 KB HTML gzipped)  
**Inspect URL:** https://vercel.com/paulo-eduardo-peress-projects/trainer/4SSVxBsgf1wWNq4nThS7JqYxZEhS  
**Production:** https://trainer-lake.vercel.app  

**Policy compliance re-verified:** All checks from Deployment #1 still pass. New dependencies: Supabase credentials remain gitignored.
