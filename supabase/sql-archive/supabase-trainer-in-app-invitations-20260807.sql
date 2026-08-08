-- TrAIner · internal trainer invitation delivery
-- Consent-gated discovery, server-side invitation creation and inbox notice.

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  from_user_id uuid references public.profiles(id) on delete set null,
  type text,
  title text not null,
  body text not null,
  entity_type text,
  entity_id uuid,
  params jsonb,
  expires_at timestamptz,
  response text,
  response_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notification_log enable row level security;

drop policy if exists "notification_log own read" on public.notification_log;
create policy "notification_log own read" on public.notification_log
  for select using (to_user_id = auth.uid());

drop policy if exists "notification_log own update" on public.notification_log;
create policy "notification_log own update" on public.notification_log
  for update using (to_user_id = auth.uid()) with check (to_user_id = auth.uid());

create or replace function public.create_trainer_in_app_invitation(
  p_client_id uuid
)
returns table (id uuid, status text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
  v_invitation_id uuid;
  v_expires_at timestamptz := now() + interval '7 days';
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if not public.has_permission('manage_trainer_clients') then raise exception 'forbidden'; end if;

  select p.email, p.name into v_email, v_name
    from public.profiles p
    join public.trainer_discovery_preferences d on d.user_id = p.id
   where p.id = p_client_id and p.role = 'client' and d.discoverable = true;

  if v_email is null then raise exception 'candidate_not_available'; end if;

  if exists (
    select 1 from public.trainer_clients tc
     where tc.client_id = p_client_id and tc.status = 'active'
  ) then raise exception 'already_linked'; end if;

  select ti.id, ti.expires_at into v_invitation_id, v_expires_at
    from public.trainer_invitations ti
   where ti.trainer_id = auth.uid()
     and lower(ti.invited_email) = lower(v_email)
     and ti.status = 'sent'
     and ti.expires_at > now()
   order by ti.created_at desc
   limit 1;

  if v_invitation_id is null then
    insert into public.trainer_invitations (
      trainer_id, invited_email, invited_name, token, status, expires_at, source
    ) values (
      auth.uid(), v_email, coalesce(v_name, 'TrAIner user'), gen_random_uuid()::text,
      'sent', v_expires_at, 'in_app'
    ) returning trainer_invitations.id into v_invitation_id;

    insert into public.notification_log (
      to_user_id, from_user_id, type, title, body, entity_type, entity_id, params, expires_at
    ) values (
      p_client_id, auth.uid(), 'trainer_invitation', 'Trainer invitation',
      'You have received a trainer invitation in TrAIner.', 'trainer_invitation',
      v_invitation_id, jsonb_build_object('invitationId', v_invitation_id), v_expires_at
    );
  end if;

  return query select v_invitation_id, 'sent'::text, v_expires_at;
end;
$$;

grant execute on function public.create_trainer_in_app_invitation(uuid) to authenticated;
