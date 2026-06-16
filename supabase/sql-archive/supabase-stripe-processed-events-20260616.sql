-- Idempotency table for Stripe webhook events.
-- Prevents double-processing of retried or replayed events.
-- Referenced by: api/stripe-webhook.ts

create table if not exists public.stripe_processed_events (
  stripe_event_id  text        primary key,
  event_type       text        not null,
  processed_at     timestamptz not null default now()
);

-- Only the service role may read or write this table.
alter table public.stripe_processed_events enable row level security;

create policy "service_role_only"
  on public.stripe_processed_events
  for all
  using (false)
  with check (false);

-- Prune events older than 30 days to bound table growth.
-- Run via pg_cron or an external cron if available.
-- delete from public.stripe_processed_events where processed_at < now() - interval '30 days';
