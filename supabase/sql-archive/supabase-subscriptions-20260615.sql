-- "Fase 0 light": subscriptions table for plan-tier gating without Stripe.
-- Self-assign model (no checkout): users upsert their own plan_key via the
-- app's Plans screen. Stripe columns are nullable placeholders for Fase 0.

create table subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references profiles(id) on delete cascade not null,
  plan_key               text not null default 'free' check (plan_key in (
    'free', 'ai_fitness', 'ai_performance', 'trial', 'pro', 'elite'
  )),
  status                 text not null default 'active' check (status in (
    'active', 'trialing', 'canceled', 'past_due'
  )),
  billing_cycle          text check (billing_cycle in ('monthly', 'annual')),
  current_period_end     timestamptz,
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create unique index idx_subscriptions_user_id on subscriptions(user_id);

alter table subscriptions enable row level security;

create policy "user select own subscription" on subscriptions
  for select using (user_id = auth.uid());

create policy "user upsert own subscription" on subscriptions
  for insert with check (user_id = auth.uid());

create policy "user update own subscription" on subscriptions
  for update using (user_id = auth.uid());
