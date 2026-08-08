-- Trainer invitation lifecycle and opt-in discovery.
-- Additive migration. Do not apply to production until Product and Privacy
-- approve docs/TRAINER_INVITATION_LIFECYCLE_AND_DISCOVERY_PLAN.md Fase 0.

alter table public.trainer_invitations
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null,
  add column if not exists source text not null default 'email'
    check (source in ('email', 'in_app'));

-- Required for accent-insensitive name search (e.g. Gonçalo = Goncalo).
create extension if not exists unaccent with schema extensions;

create index if not exists trainer_invitations_owner_visible_created_idx
  on public.trainer_invitations (trainer_id, archived_at, created_at desc);

alter table public.trainer_clients
  add column if not exists ended_at timestamptz,
  add column if not exists ended_by uuid references public.profiles(id) on delete set null,
  add column if not exists end_reason text;

-- A user is invisible to TRAINER discovery until they opt in. The profile
-- itself remains protected by its existing RLS; discovery is exposed only by
-- the narrow RPC below.
create table if not exists public.trainer_discovery_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  discoverable boolean not null default false,
  -- One discovery opt-in covers this minimal commercial projection. It does
  -- not grant profile, health, training-history or e-mail access.
  share_avatar boolean not null default true,
  updated_at timestamptz not null default now()
);

create or replace function public.set_trainer_discovery_preferences_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trainer_discovery_preferences_set_updated_at on public.trainer_discovery_preferences;
create trigger trainer_discovery_preferences_set_updated_at
  before update on public.trainer_discovery_preferences
  for each row execute function public.set_trainer_discovery_preferences_updated_at();

alter table public.trainer_discovery_preferences enable row level security;

drop policy if exists "discovery preferences own read" on public.trainer_discovery_preferences;
create policy "discovery preferences own read"
  on public.trainer_discovery_preferences for select
  using (user_id = auth.uid());

drop policy if exists "discovery preferences own write" on public.trainer_discovery_preferences;
create policy "discovery preferences own write"
  on public.trainer_discovery_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Append-only audit evidence for a terminated relationship. Direct access is
-- deliberately not granted; the security-definer endpoint below is its writer.
create table if not exists public.trainer_client_link_events (
  id uuid primary key default gen_random_uuid(),
  trainer_client_id uuid not null references public.trainer_clients(id) on delete restrict,
  trainer_id uuid not null references public.profiles(id) on delete restrict,
  client_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('ended')),
  reason text,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists trainer_client_link_events_link_created_idx
  on public.trainer_client_link_events (trainer_client_id, created_at desc);

alter table public.trainer_client_link_events enable row level security;
revoke all on public.trainer_client_link_events from anon, authenticated;

-- Archives terminal invitations only. Sent invitations must be revoked
-- explicitly, otherwise a valid token would disappear from operational view.
create or replace function public.archive_trainer_invitations(
  p_invitation_ids uuid[],
  p_archive boolean default true
)
returns table (id uuid, archived_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;
  if not public.has_permission('manage_trainer_clients') then
    raise exception 'forbidden';
  end if;

  return query
  update public.trainer_invitations ti
     set archived_at = case when p_archive then now() else null end,
         archived_by = case when p_archive then auth.uid() else null end
   where ti.id = any(p_invitation_ids)
     and ti.trainer_id = auth.uid()
     and (
       ti.status in ('accepted', 'expired', 'revoked')
       or (ti.status = 'sent' and ti.expires_at < now())
     )
  returning ti.id, ti.archived_at;
end;
$$;

grant execute on function public.archive_trainer_invitations(uuid[], boolean) to authenticated;

-- Ends a relationship without deleting the trainer/client record or health data.
create or replace function public.end_trainer_client_links(
  p_link_ids uuid[],
  p_reason text default null
)
returns table (id uuid, status text, ended_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;
  if not public.has_permission('manage_trainer_clients') then
    raise exception 'forbidden';
  end if;

  return query
  with ended as (
    update public.trainer_clients tc
       set status = 'ended',
           ended_at = now(),
           ended_by = auth.uid(),
           end_reason = nullif(trim(p_reason), '')
     where tc.id = any(p_link_ids)
       and tc.trainer_id = auth.uid()
       and tc.status = 'active'
    returning tc.id, tc.trainer_id, tc.client_id, tc.status, tc.ended_at
  ), audited as (
    insert into public.trainer_client_link_events (
      trainer_client_id, trainer_id, client_id, event_type, reason, actor_id
    )
    select ended.id, ended.trainer_id, ended.client_id, 'ended',
           nullif(trim(p_reason), ''), auth.uid()
      from ended
  )
  select ended.id, ended.status, ended.ended_at from ended;
end;
$$;

grant execute on function public.end_trainer_client_links(uuid[], text) to authenticated;

-- Privacy-minimised discovery projection. This is intentionally not a view and
-- not a direct profiles SELECT grant: it never returns e-mail or health data.
create or replace function public.search_discoverable_free_clients(
  p_query text default '',
  p_plan_keys text[] default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (id uuid, display_name text, avatar_url text, plan_key text)
language sql
security definer
set search_path = public
as $$
  select p.id,
         p.name as display_name,
         case when d.share_avatar then p.avatar_url else null end as avatar_url,
         coalesce(s.plan_key, 'free') as plan_key
    from public.profiles p
    join public.trainer_discovery_preferences d on d.user_id = p.id
    left join lateral (
      select sub.plan_key
        from public.subscriptions sub
       where sub.user_id = p.id
         and sub.status in ('active', 'trialing')
       order by sub.updated_at desc
       limit 1
    ) s on true
   where d.discoverable = true
     and p.role = 'client'
     and lower(extensions.unaccent(p.name)) like '%' || lower(extensions.unaccent(trim(p_query))) || '%'
     and not exists (
       select 1 from public.trainer_clients tc
        where tc.client_id = p.id and tc.status = 'active'
     )
     and public.has_permission('manage_trainer_clients')
     and (p_plan_keys is null or coalesce(s.plan_key, 'free') = any(p_plan_keys))
   order by p.name asc
   limit greatest(1, least(coalesce(p_limit, 20), 50))
   offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.search_discoverable_free_clients(text, text[], integer, integer) to authenticated;
