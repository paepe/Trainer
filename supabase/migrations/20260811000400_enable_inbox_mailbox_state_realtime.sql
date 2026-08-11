-- Cross-session reconciliation requires the recipient mailbox state, Inbox
-- events and trainer-owned invitation state to be published. Each table has
-- recipient/trainer-scoped SELECT RLS, so publication never broadens access.

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notification_log') then
    alter publication supabase_realtime add table public.notification_log;
  end if;

  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notification_mailbox_states') then
    alter publication supabase_realtime add table public.notification_mailbox_states;
  end if;

  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trainer_invitations') then
    alter publication supabase_realtime add table public.trainer_invitations;
  end if;
end;
$$;
