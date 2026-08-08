# Security Follow-up Backlog

## Deferred: local authorization tables without RLS

- **Observed:** 2026-08-08
- **Environment:** local Supabase Docker stack only
- **Source:** Supabase database advisor
- **Objects:** `public.permissions`, `public.role_permissions`, and `public.roles`
- **Status:** deferred for a dedicated security pass; no remediation has been applied.

### Why it is deferred

Enabling Row Level Security without first mapping the existing permission-resolution
queries, service-role access, grants, and expected authenticated access could break
authorization flows. The advisor result does not establish that the pre-release
cloud database has the same configuration.

### Required follow-up

- [ ] Inventory table consumers, grants, and current authorization paths.
- [ ] Define least-privilege RLS policies for each table, including service-role
      and administrative paths.
- [ ] Validate the policy set locally with authorization and regression tests.
- [ ] Inspect the pre-release database separately and apply a reviewed migration
      only if it has the same exposure.
- [ ] Record the outcome and any production-release implications.

### Guardrail

Do not enable RLS as an isolated configuration change. It must ship with the
corresponding policies, tests, and a rollback-safe migration.
