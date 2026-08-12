-- A workout-readiness request is actionable only during its response window.
-- Older records created before expiry persistence was introduced have a null
-- expires_at and were therefore treated as actionable indefinitely, preventing
-- a read message from being archived. Preserve the original creation instant
-- and apply the established 30-minute fallback only to those legacy records.

update public.notification_log
   set expires_at = created_at + interval '30 minutes'
 where type = 'workout_ready'
   and response is null
   and expires_at is null;

-- The client sends the TRAINER preference explicitly. This trigger is solely a
-- server-authoritative guard for any future writer that omits that deadline.
create or replace function public.ensure_workout_ready_expiry()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.type = 'workout_ready' and new.expires_at is null then
    new.expires_at := coalesce(new.created_at, now()) + interval '30 minutes';
  end if;
  return new;
end;
$$;

drop trigger if exists set_workout_ready_expiry on public.notification_log;

create trigger set_workout_ready_expiry
before insert on public.notification_log
for each row
execute function public.ensure_workout_ready_expiry();
