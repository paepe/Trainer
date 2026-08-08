-- A CLIENT can end only their own active trainer relationship. The operation is
-- intentionally terminal: a later relationship requires a new invitation and
-- explicit acceptance.

create or replace function public.get_my_active_trainer_link()
returns table (id uuid, trainer_id uuid, trainer_name text)
language sql
security definer
set search_path = public
as $$
  select tc.id, tc.trainer_id, p.name
    from public.trainer_clients tc
    join public.profiles p on p.id = tc.trainer_id
   where tc.client_id = auth.uid()
     and tc.status = 'active'
   order by tc.created_at desc
   limit 1;
$$;

grant execute on function public.get_my_active_trainer_link() to authenticated;

create or replace function public.end_my_trainer_link(p_reason text default null)
returns table (id uuid, status text, ended_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  return query
  with ended as (
    update public.trainer_clients tc
       set status = 'ended',
           ended_at = now(),
           ended_by = auth.uid(),
           end_reason = left(nullif(trim(p_reason), ''), 120)
     where tc.client_id = auth.uid()
       and tc.status = 'active'
    returning tc.id, tc.trainer_id, tc.client_id, tc.status, tc.ended_at
  ), audited as (
    insert into public.trainer_client_link_events (
      trainer_client_id, trainer_id, client_id, event_type, reason, actor_id
    )
    select ended.id, ended.trainer_id, ended.client_id, 'ended',
           left(nullif(trim(p_reason), ''), 120), auth.uid()
      from ended
  ), revoke_pending_operational_notices as (
    update public.notification_log nl
       set response = 'revoked', response_at = now()
      from ended
     where nl.to_user_id = ended.trainer_id
       and nl.from_user_id = ended.client_id
       and nl.type = 'workout_ready'
       and nl.response is null
  ), disable_discovery as (
    insert into public.trainer_discovery_preferences (user_id, discoverable)
    select client_id, false from ended
    on conflict (user_id) do update
      set discoverable = false,
          updated_at = now()
  )
  select ended.id, ended.status, ended.ended_at from ended;
end;
$$;

grant execute on function public.end_my_trainer_link(text) to authenticated;
