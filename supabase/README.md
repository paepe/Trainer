# TrAIner local Supabase stack

This directory defines the isolated Docker-backed Supabase environment used for
local integration and RLS validation. It never targets the shared cloud
environment.

## Start and stop

```bash
supabase start
supabase status
supabase stop
```

The stack uses dedicated local ports to avoid conflict with other Supabase
projects on the same machine:

- API: `http://127.0.0.1:55321`
- Postgres: `postgresql://postgres:postgres@127.0.0.1:55322/postgres`
- Studio: `http://127.0.0.1:55323`
- Mailpit: `http://127.0.0.1:55324`

To run the TrAIner app against this local API without changing `.env.local`, use:

```bash
npm run dev:docker
```

## Schema baseline

`migrations/` deliberately references the versioned SQL archive in a defined
order. It bootstraps the core domain, subscriptions, feature permissions, RBAC,
trainer invitations, the fixed invitation acceptance RPC, and the current
invitation lifecycle/discovery schema.

Apply the baseline to an already running local stack with:

```bash
supabase migration up --local
```

For a clean local database, use:

```bash
supabase db reset --local
```

The latter is destructive **only to this local Docker database**. It must never
be used with remote connection flags for shared environments.

## Scope guard

This is a local integration baseline for the Trainer invitation lifecycle and
its RBAC/RLS dependencies. New changes must add an ordered migration here and
be tested locally before cloud deployment. Do not modify unrelated local
Supabase stacks.
