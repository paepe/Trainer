-- ─────────────────────────────────────────────────────────────────────────────
-- Trainer Invitation Flow — schema for inviting candidates with or without
-- a pre-existing TrAIner account.
-- See: policies/references/Trainer 2.0/trainer-invitation-flow-plan-20260607.md
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. TABLE ────────────────────────────────────────────────
create table if not exists trainer_invitations (
  id            uuid primary key default gen_random_uuid(),
  trainer_id    uuid references profiles(id) on delete cascade not null,
  invited_email text not null,
  invited_name  text not null,
  token         text unique not null,
  status        text not null default 'sent'
    check (status in ('sent', 'accepted', 'expired', 'revoked')),
  created_at    timestamptz default now(),
  expires_at    timestamptz not null,
  accepted_at   timestamptz,
  accepted_by   uuid references profiles(id) on delete set null
);

create index if not exists idx_trainer_invitations_trainer_id  on trainer_invitations(trainer_id);
create index if not exists idx_trainer_invitations_email       on trainer_invitations(lower(invited_email));
create index if not exists idx_trainer_invitations_token       on trainer_invitations(token);
create index if not exists idx_trainer_invitations_status      on trainer_invitations(status);


-- ─── 2. RLS ──────────────────────────────────────────────────
alter table trainer_invitations enable row level security;

-- Trainer manages only their own invitations
create policy "trainer_invitations_select_own"
  on trainer_invitations for select
  using (trainer_id = auth.uid());

create policy "trainer_invitations_insert_own"
  on trainer_invitations for insert
  with check (trainer_id = auth.uid());

create policy "trainer_invitations_update_own"
  on trainer_invitations for update
  using (trainer_id = auth.uid());

-- No direct client-side select-by-token policy: invitation lookup by token
-- is mediated exclusively through the get_invitation_by_token() / accept_trainer_invitation()
-- SECURITY DEFINER functions below, so an unauthenticated/unrelated user can never
-- browse the table directly — only resolve a single invite they already hold the token for.


-- ─── 3. Exclusivity guard: one active trainer per client ────
-- Enforced at the DB level so accept_trainer_invitation() cannot be bypassed
-- by direct inserts into trainer_clients.
create unique index if not exists uq_trainer_clients_active_client
  on trainer_clients(client_id)
  where status = 'active';


-- ─── 4. RPC: resolve invitation by token (safe, minimal projection) ──
-- Returns only what the acceptance screen needs to render — never exposes
-- the full row (e.g. trainer_id is resolved to a display name, not the raw uuid).
create or replace function get_invitation_by_token(p_token text)
returns table (
  invited_name  text,
  trainer_name  text,
  status        text,
  expires_at    timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    ti.invited_name,
    p.name as trainer_name,
    case
      when ti.status = 'sent' and ti.expires_at < now() then 'expired'
      else ti.status
    end as status,
    ti.expires_at
  from trainer_invitations ti
  join profiles p on p.id = ti.trainer_id
  where ti.token = p_token;
$$;

grant execute on function get_invitation_by_token(text) to anon, authenticated;


-- ─── 5. RPC: accept invitation (idempotent, exclusivity-checked) ────
-- Single point of truth for activating the trainer_clients link, reused by
-- both "already had an account" and "just signed up" paths.
create or replace function accept_trainer_invitation(p_token text, p_user_id uuid)
returns table (result text, trainer_id uuid, trainer_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite trainer_invitations%rowtype;
  v_existing_trainer uuid;
  v_trainer_name text;
begin
  select * into v_invite from trainer_invitations where token = p_token for update;

  if not found then
    return query select 'not_found', null::uuid, null::text;
    return;
  end if;

  select p.name into v_trainer_name from profiles p where p.id = v_invite.trainer_id;

  if v_invite.status = 'accepted' and v_invite.accepted_by = p_user_id then
    return query select 'already_accepted', v_invite.trainer_id, v_trainer_name; -- idempotent re-click
    return;
  end if;

  if v_invite.status = 'revoked' then
    return query select 'revoked', null::uuid, null::text;
    return;
  end if;

  if v_invite.status <> 'sent' or v_invite.expires_at < now() then
    return query select 'expired', null::uuid, null::text;
    return;
  end if;

  -- Exclusivity: a client may only have ONE active trainer (the one who invited them)
  select trainer_id into v_existing_trainer
    from trainer_clients
    where client_id = p_user_id and status = 'active'
    limit 1;

  if v_existing_trainer is not null and v_existing_trainer <> v_invite.trainer_id then
    return query select 'already_linked_elsewhere', null::uuid, null::text;
    return;
  end if;

  insert into trainer_clients (trainer_id, client_id, status, invited_at)
  values (v_invite.trainer_id, p_user_id, 'active', v_invite.created_at)
  on conflict (trainer_id, client_id) do update
    set status = 'active';

  update trainer_invitations
    set status = 'accepted', accepted_at = now(), accepted_by = p_user_id
    where id = v_invite.id;

  return query select 'accepted', v_invite.trainer_id, v_trainer_name;
end;
$$;

grant execute on function accept_trainer_invitation(text, uuid) to authenticated;
