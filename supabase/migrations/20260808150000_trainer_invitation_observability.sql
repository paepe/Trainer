-- Minimal operational telemetry for the invitation lifecycle. This table is
-- intentionally free of actor IDs, invitation IDs, e-mail, search terms and
-- health/training data; it supports aggregate monitoring only.
create table if not exists public.trainer_invitation_operation_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'created', 'declined', 'accepted', 'revoked', 'archived', 'restored', 'link_ended'
  )),
  source text check (source is null or source in ('email', 'in_app')),
  occurred_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);

create index if not exists trainer_invitation_operation_events_expiry_idx
  on public.trainer_invitation_operation_events (expires_at);
create index if not exists trainer_invitation_operation_events_type_time_idx
  on public.trainer_invitation_operation_events (event_type, occurred_at desc);

alter table public.trainer_invitation_operation_events enable row level security;
revoke all on table public.trainer_invitation_operation_events from public, anon, authenticated;

create or replace function public.log_trainer_invitation_operation_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'trainer_invitations' then
    if tg_op = 'INSERT' then
      insert into public.trainer_invitation_operation_events (event_type, source)
      values ('created', new.source);
    elsif new.status is distinct from old.status then
      if new.status in ('declined', 'accepted', 'revoked') then
        insert into public.trainer_invitation_operation_events (event_type, source)
        values (new.status, new.source);
      end if;
    elsif new.archived_at is distinct from old.archived_at then
      insert into public.trainer_invitation_operation_events (event_type, source)
      values (case when new.archived_at is null then 'restored' else 'archived' end, new.source);
    end if;
  elsif tg_table_name = 'trainer_clients'
    and tg_op = 'UPDATE'
    and old.status = 'active'
    and new.status = 'ended' then
    insert into public.trainer_invitation_operation_events (event_type)
    values ('link_ended');
  end if;
  return new;
end;
$$;

drop trigger if exists trainer_invitation_operation_event_log on public.trainer_invitations;
create trigger trainer_invitation_operation_event_log
after insert or update of status, archived_at on public.trainer_invitations
for each row execute function public.log_trainer_invitation_operation_event();

drop trigger if exists trainer_client_link_operation_event_log on public.trainer_clients;
create trigger trainer_client_link_operation_event_log
after update of status on public.trainer_clients
for each row execute function public.log_trainer_invitation_operation_event();

-- Invoked by the scheduled operational maintenance path; it returns only a
-- count and never exposes expired event contents.
create or replace function public.purge_expired_trainer_invitation_operation_events()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare v_deleted bigint;
begin
  delete from public.trainer_invitation_operation_events where expires_at <= now();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_expired_trainer_invitation_operation_events() from public, anon, authenticated;
