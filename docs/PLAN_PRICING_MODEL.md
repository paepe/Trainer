# Plan Pricing Model — Design & Implementation Plan

**Status:** Fase 1 ✓ · Fase 2 ✓ · Fase 3 pendente  
**Data:** 2026-06-17  
**Autor:** Paulo Peres + Claude Sonnet 4.6

---

## 1. Diagnóstico do estado actual

| Onde | O quê | Problema |
|---|---|---|
| `PlansScreen.tsx` | Preços hardcoded (`9.99`, `24.99`, `49`, `99`) em EUR | Qualquer alteração exige deploy de código |
| `PlansScreen.tsx` | Símbolo `€` hardcoded em `fmtPrice()` | Não suporta outras moedas |
| `billing.config.json` | Price IDs Stripe (vazios) | Ficheiro em código — não operacional para multi-moeda |
| `subscriptions` | Sem coluna de preço pago, moeda ou desconto | Impossível auditar o que cada utilizador pagou |
| Não existe | Tabela de definição de planos | Planos vivem apenas no frontend e em `feature_permissions` |
| Não existe | Histórico de transacções | Sem ledger de mudanças de plano |

---

## 2. Modelagem proposta

### 2.1 `plan_definitions` — catálogo de planos

Regista o que é cada plano: audiência, ícone, ordenação, estado activo.  
Nomes e descrições ficam em i18n (já correcto) — o DB guarda apenas dados estruturais.

```sql
create table public.plan_definitions (
  plan_key    text primary key,
  audience    text not null check (audience in ('client', 'trainer')),
  icon        text not null,
  sort_order  int  not null default 0,
  is_active   bool not null default true,
  created_at  timestamptz not null default now()
);
```

**Seed inicial:**

| plan_key | audience | icon | sort_order |
|---|---|---|---|
| `free` | client | activity | 1 |
| `ai_fitness` | client | sparkle | 2 |
| `ai_performance` | client | zap | 3 |
| `trial` | trainer | target | 1 |
| `pro` | trainer | user | 2 |
| `elite` | trainer | brain | 3 |

---

### 2.2 `plan_prices` — preços por ciclo, moeda e período

Fonte de verdade de preços. Suporta promoções, datas de validade, múltiplas moedas e IDs Stripe.

```sql
create table public.plan_prices (
  id              uuid primary key default gen_random_uuid(),
  plan_key        text        not null references public.plan_definitions(plan_key),
  billing_cycle   text        not null check (billing_cycle in ('monthly', 'annual', 'one_time')),
  currency        text        not null default 'EUR',  -- ISO 4217
  amount_cents    int         not null check (amount_cents >= 0),
  stripe_price_id text,
  label           text,          -- ex: 'Promo Lançamento', 'Black Friday'
  valid_from      timestamptz not null default now(),
  valid_until     timestamptz,   -- null = sem expiração
  is_active       bool        not null default true,
  created_at      timestamptz not null default now()
);

-- Índice para lookup eficiente do preço vigente
create index on public.plan_prices (plan_key, billing_cycle, currency, is_active);
```

> **Porquê `amount_cents`:** evita erros de floating point (`9.99 * 12 ≠ 119.88` em IEEE 754).  
> Standard da indústria — Stripe, Paddle e Braintree usam a mesma convenção.

**Seed inicial (preços actuais em EUR):**

| plan_key | billing_cycle | currency | amount_cents | label |
|---|---|---|---|---|
| `free` | monthly | EUR | 0 | — |
| `ai_fitness` | monthly | EUR | 999 | — |
| `ai_fitness` | annual | EUR | 9990 | 2 meses grátis |
| `ai_performance` | monthly | EUR | 2499 | — |
| `ai_performance` | annual | EUR | 24990 | 2 meses grátis |
| `trial` | monthly | EUR | 0 | 14 dias |
| `pro` | monthly | EUR | 4900 | — |
| `pro` | annual | EUR | 49000 | 2 meses grátis |
| `elite` | monthly | EUR | 9900 | — |
| `elite` | annual | EUR | 99000 | 2 meses grátis |

---

### 2.3 `subscription_events` — ledger imutável

Registo append-only de cada activação, upgrade, downgrade, cancelamento ou renovação.  
A tabela `subscriptions` continua a ser o estado actual; esta é o histórico auditável.

```sql
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
  amount_cents      int,         -- o que foi efectivamente pago
  discount_cents    int  not null default 0,
  price_id          uuid references public.plan_prices(id),
  stripe_invoice_id text,
  created_at        timestamptz not null default now()
);

create index on public.subscription_events (user_id, created_at desc);
```

---

## 3. Relação entre tabelas

```
plan_definitions (1) ──── (N) plan_prices
        │                          │
        │                          └── referenciado em subscription_events.price_id
        │
        └── (N) feature_permissions  ← já existe, sem alteração

subscriptions  ← estado actual (sem alteração ao schema)
        │
        └── (N) subscription_events  ← novo ledger
```

---

## 4. O que NÃO está no scope (e porquê)

| Hipótese | Razão para adiar |
|---|---|
| Tabela separada de cupões/promoções | `label` + `valid_until` + `discount_cents` em `subscription_events` cobre 95% dos casos; cupões com código exigem sistema de validação próprio — delegar ao Stripe quando ativo |
| Conversão cambial em tempo real | Requer API externa + tolerância a delay; o preço cobrado é sempre o da `plan_prices` activa; o frontend pode mostrar equivalências mas não define o preço |
| Tabela de países/regiões | Prematuro; quando houver preços regionais (Brasil vs Europa) adiciona-se coluna `region text` em `plan_prices` sem quebrar o schema |
| Deprecação imediata de `billing.config.json` | Feita na Fase 3, quando Stripe estiver ativo e `stripe_price_id` migrar para `plan_prices` |

---

## 5. Impacto no código existente

| Ficheiro | Mudança necessária |
|---|---|
| `src/screens/client/PlansScreen.tsx` | Ler preços via hook `usePlanPrices()` em vez de `STUDENT_PLANS`/`TRAINER_PLANS` hardcoded |
| `src/screens/client/PlansScreen.tsx` | `fmtPrice()` → `Intl.NumberFormat(locale, { style: 'currency', currency })` |
| `src/billing/billing.config.json` | `stripe_price_id` migra para `plan_prices`; JSON depreciado na Fase 3 |
| `src/hooks/useAuth.ts` | `upsertSubscription` regista evento em `subscription_events` |
| `src/types/feature-permissions.ts` | Sem alteração |

---

## 6. Plano de implementação — 3 Fases

### Fase 1 — Schema + seed (sem impacto no produto) ✓ 2026-06-17
- [x] Criar `plan_definitions`, `plan_prices`, `subscription_events`
- [x] Popular `plan_definitions` com os 6 planos actuais
- [x] Popular `plan_prices` com os preços EUR actuais
- [x] Arquivar SQL em `supabase/sql-archive/20260617_plan_pricing_model_phase1.sql`

### Fase 2
 — Frontend desacoplado ✓ 2026-06-17
- [x] Hook `usePlanPrices(audience)` — lê `plan_definitions` + `plan_prices` activos
- [x] `PlansScreen` consome o hook; remove arrays hardcoded
- [x] `fmtPrice` substituído por `Intl.NumberFormat` (cents, locale `de-DE`)
- [x] `plan_definitions` passa a ser a fonte de `icon` e `sort_order`
- [x] Tipos Supabase regenerados (`src/types/supabase.ts`)

### Fase 3 — Stripe wired + ledger activo
- [ ] `stripe_price_id` populado em `plan_prices` (via Supabase dashboard ou migration)
- [ ] `billing.config.json` depreciado; `BillingProvider` lê price ID do DB
- [ ] `upsertSubscription` escreve em `subscription_events` com `price_id` e `amount_cents`
- [ ] Deprecar mock provider

---

## 7. Convenções

- Preços sempre em **cents inteiros** (`amount_cents: int`). Display: `amount_cents / 100`.
- Moeda padrão: **EUR**. Multi-moeda: nova linha em `plan_prices` com `currency` diferente.
- Promoção: nova linha em `plan_prices` com `label`, `valid_from`, `valid_until` preenchidos e `is_active = true`. A linha anterior não é apagada — `is_active = false`.
- Plano descontinuado: `plan_definitions.is_active = false`. Utilizadores existentes mantêm o plano; novos não o vêem.
