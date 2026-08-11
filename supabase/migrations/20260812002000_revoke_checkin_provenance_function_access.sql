-- The provenance helpers are trigger-only. They must not be callable through
-- the PostgREST function surface by anonymous or authenticated users.

revoke all on function public.refresh_workout_plan_checkin_applied(uuid) from public, anon, authenticated;
revoke all on function public.sync_workout_plan_checkin_applied() from public, anon, authenticated;
