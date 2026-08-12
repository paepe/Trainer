-- Only a request with a persisted, future deadline remains actionable.
-- Historical records without a deadline are informative once read and can be
-- archived; otherwise they would block mailbox housekeeping indefinitely.
create or replace function public.is_inbox_notification_actionable(
  p_type text,
  p_response text,
  p_expires_at timestamptz
)
returns boolean
language sql
stable
set search_path = public
as $$
  select p_response is null
    and (
      (p_type in ('workout_ready', 'access_request', 'trainer_invitation')
        and p_expires_at is not null
        and p_expires_at > now())
      or p_type = 'trainer_invitation_renewal_request'
    );
$$;
