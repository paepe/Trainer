-- ─────────────────────────────────────────────────────────────────────────────
-- Profile Access Grants — request/grant flow for "authorized_only" consent
-- categories (Phase 4 of the consent-visibility-enforcement plan).
-- A trainer can request access to a category the client marked
-- authorized_only; the client grants or denies via the Inbox. Granted
-- categories render as "full" for that trainer in TrainerClientDetailScreen.
-- Visual-only: src/ai/buildAIContext.ts never reads this table.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. TABLE ────────────────────────────────────────────────
-- "Latest row wins" per (client_id, trainer_id, category): each request is a
-- new row, ordered by requested_at desc. No unique constraint / upsert needed.
create table if not exists profile_access_grants (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid references profiles(id) on delete cascade not null,
  trainer_id     uuid references profiles(id) on delete cascade not null,
  category       text not null check (category in (
    'training_objective', 'training_history', 'pain_operational_restriction',
    'relevant_comorbidity', 'sensitive_medication', 'emotional_psychiatric_health', 'body_rhythm'
  )),
  status         text not null default 'pending'
    check (status in ('pending', 'granted', 'denied', 'revoked')),
  requested_at   timestamptz not null default now(),
  responded_at   timestamptz,
  expires_at     timestamptz,            -- unused this phase, reserved for Phase 4b
  last_viewed_at timestamptz,
  view_count     int not null default 0
);

create index if not exists idx_profile_access_grants_lookup
  on profile_access_grants(client_id, trainer_id, category, requested_at desc);


-- ─── 2. RLS ──────────────────────────────────────────────────
alter table profile_access_grants enable row level security;

-- Trainer: can see and create requests for their own active clients
create policy "trainer select own requests"
  on profile_access_grants for select
  using (trainer_id = auth.uid());

create policy "trainer insert request"
  on profile_access_grants for insert
  with check (
    trainer_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from trainer_clients tc
      where tc.trainer_id = auth.uid()
        and tc.client_id = profile_access_grants.client_id
        and tc.status = 'active'
    )
  );

-- Client: can see and respond (grant/deny) to requests addressed to them
create policy "client select own grants"
  on profile_access_grants for select
  using (client_id = auth.uid());

create policy "client respond to request"
  on profile_access_grants for update
  using (client_id = auth.uid());


-- ─── 3. RPC: log a view of a granted category ───────────────
-- The trainer has no UPDATE policy on this table — only this SECURITY DEFINER
-- function may touch view_count / last_viewed_at, and only for grants it owns
-- that are currently "granted".
create or replace function log_profile_access_view(p_grant_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update profile_access_grants
  set view_count = view_count + 1, last_viewed_at = now()
  where id = p_grant_id and trainer_id = auth.uid() and status = 'granted';
$$;

grant execute on function log_profile_access_view(uuid) to authenticated;
