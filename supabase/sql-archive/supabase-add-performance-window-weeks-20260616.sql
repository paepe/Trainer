-- Add performance_window_weeks to preferences table.
-- Controls how many weeks the performance dashboard looks back (4/6/8/12).
-- Default 6 matches the prior hardcoded value — no data migration needed.

alter table public.preferences
  add column if not exists performance_window_weeks smallint not null default 6
    check (performance_window_weeks in (4, 6, 8, 12));
