-- Prefer the name the client maintains in their profile. Older test and
-- imported accounts can lack it, so retain the invitation name as a safe
-- operational fallback for the trainer who created that relationship.

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
  ), notify_trainer as (
    insert into public.notification_log (
      to_user_id, from_user_id, type, title, body, entity_type, entity_id,
      template_key, params
    )
    select ended.trainer_id, ended.client_id, 'trainer_link_ended', '', '',
           'trainer_client_link', ended.id, 'trainer_link_ended',
           jsonb_build_object('clientName', coalesce(nullif(profile.name, ''), nullif(invitation.invited_name, ''), 'TrAIner client'))
      from ended
      left join public.profiles profile on profile.id = ended.client_id
      left join lateral (
        select ti.invited_name
          from public.trainer_invitations ti
         where ti.trainer_id = ended.trainer_id
           and ti.accepted_by = ended.client_id
           and ti.status = 'accepted'
         order by ti.accepted_at desc nulls last, ti.created_at desc
         limit 1
      ) invitation on true
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
