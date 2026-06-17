-- ============================================================
-- FASE 1: Plan Pricing Model
-- plan_definitions · plan_prices · subscription_events
-- Aplicado: 2026-06-17
-- ============================================================

create table public.plan_definitions (
  plan_key    text primary key,
  audience    text not null check (audience in ('client', 'trainer')),
  icon        text not null,
  sort_order  int  not null default 0,
  is_active   bool not null default true,
  created_at  timestamptz not null default now()
);

insert into public.plan_definitions (plan_key, audience, icon, sort_order) values
  ('free',           'client',  'activity', 1),
  ('ai_fitness',     'client',  'sparkle',  2),
  ('ai_performance', 'client',  'zap',      3),
  ('trial',          'trainer', 'target',   1),
  ('pro',            'trainer', 'user',     2),
  ('elite',          'trainer', 'brain',    3);

create table public.plan_prices (
  id              uuid primary key default gen_random_uuid(),
  plan_key        text        not null references public.plan_definitions(plan_key),
  billing_cycle   text        not null check (billing_cycle in ('monthly', 'annual', 'one_time')),
  currency        text        not null default 'EUR',
  amount_cents    int         not null check (amount_cents >= 0),
  stripe_price_id text,
  label           text,
  valid_from      timestamptz not null default now(),
  valid_until     timestamptz,
  is_active       bool        not null default true,
  created_at      timestamptz not null default now()
);

create index on public.plan_prices (plan_key, billing_cycle, currency, is_active);

insert into public.plan_prices (plan_key, billing_cycle, currency, amount_cents, label) values
  ('free',           'monthly', 'EUR',     0, null),
  ('ai_fitness',     'monthly', 'EUR',   999, null),
  ('ai_fitness',     'annual',  'EUR',  9990, '2 meses grátis'),
  ('ai_performance', 'monthly', 'EUR',  2499, null),
  ('ai_performance', 'annual',  'EUR', 24990, '2 meses grátis'),
  ('trial',          'monthly', 'EUR',     0, '14 dias'),
  ('pro',            'monthly', 'EUR',  4900, null),
  ('pro',            'annual',  'EUR', 49000, '2 meses grátis'),
  ('elite',          'monthly', 'EUR',  9900, null),
  ('elite',          'annual',  'EUR', 99000, '2 meses grátis');

create table public.subscription_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id),
  event_type        text not null check (event_type in (
                      'activated', 'upgraded', 'downgraded',
                      'cancelled', 'renewed', 'promo_applied'
                    )),
  plan_key          text not null,
  billing_cycle     text,
  currency          text,
  amount_cents      int,
  discount_cents    int  not null default 0,
  price_id          uuid references public.plan_prices(id),
  stripe_invoice_id text,
  created_at        timestamptz not null default now()
);

create index on public.subscription_events (user_id, created_at desc);

alter table public.subscription_events enable row level security;

create policy "users_own_events" on public.subscription_events
  for select using (auth.uid() = user_id);
