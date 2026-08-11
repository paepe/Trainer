-- Supports recipient-scoped chronological cursor reads without changing the
-- notification lifecycle or contents.

create index if not exists idx_notification_log_recipient_created_cursor
  on public.notification_log (to_user_id, created_at desc, id desc);
