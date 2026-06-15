# Roadmap de Implementação — Monetização (Anos 1-3)

Baseado em `Recommended_Monetization_Model_Years_1_3 (2).pdf`. Avaliação de prontidão feita em 2026-06-15: nenhuma das 3 camadas (billing, gates, marketplace) existe hoje no app. Schema de papéis (`client`/`trainer`/`studio_trainer`/`studio_admin`) e vínculos (`trainer_clients`, `studios`, `studio_members`) já existem e servem de base.

---

## Fase 0 — Fundação de Billing (Stripe + Schema)

**Objetivo**: infraestrutura genérica de assinatura, sem nenhum gate ainda. Pré-requisito de todas as fases seguintes.

**Estimativa**: 3-4 dias

**"Fase 0 light" (2026-06-15, sem Stripe)**: como a conta Stripe ainda não existe,
avançamos a parte que não depende dela. Tabela `subscriptions` criada no Supabase
(`supabase/sql-archive/supabase-subscriptions-20260615.sql`) com `plan_key`,
`status`, `billing_cycle`, `current_period_end` e colunas `stripe_*` já
preparadas (nullable) para quando o Stripe existir — RLS: usuário lê/grava
apenas a própria assinatura (modelo "self-assign", sem checkout real).
`useAuth.ts` agora expõe `subscription`/`upsertSubscription`; `AppUser.plan_key`
propagado a todas as telas. `PlansScreen.tsx` grava o plano selecionado via
`upsertSubscription` (sem cobrança) e exibe badge "Plano atual". O gate de
`isPremium` em `PerformanceDashboardScreen.tsx` agora lê
`user.plan_key === 'ai_performance'` (mantendo `selectedClient` = trainer vê tudo).

- [ ] Definir tiers no Stripe Dashboard (produtos/preços): Trainer Pro (€49), Trainer Elite (€99), Client AI Fitness (€9.99), Client AI Performance (€24.99) — modo teste
- [x] Schema Supabase: tabela `subscriptions` (`user_id`, `stripe_customer_id`, `stripe_subscription_id`, `plan_key`, `status`, `billing_cycle`, `current_period_end`, `created_at`) + RLS (usuário só lê/grava a própria) — criada sem Stripe, modo self-assign
- [ ] Env vars no Vercel (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`)
- [ ] `/api/create-checkout-session` — gera sessão Stripe Checkout (hospedado) para um `plan_key`
- [ ] `/api/stripe-webhook` — trata `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`; idempotência via `stripe_event_id`
- [ ] Link para Stripe Billing Portal (gerenciar/cancelar) — sem UI própria
- [ ] Teste end-to-end em modo teste Stripe (cartões de teste, todos os fluxos de webhook)

---

## Fase 1 — Trainer Plans (Free Trial / Pro / Elite)

**Objetivo**: trainers pagam por tier. Primeiro a entrar em produção — já existe base de trainers ativos (Carlos, etc.).

**Estimativa**: 4-6 dias (depende da Fase 0)

- [ ] Definir o que cada tier desbloqueia (decisão de produto — exemplos a validar com o usuário):
  - Free Trial: limite de N clientes ativos, sem Coach DNA
  - Pro (€49): limite maior de clientes, Coach DNA básico
  - Elite (€99): clientes ilimitados, Coach DNA completo, relatórios avançados
- [ ] Tela "Planos" para trainer (comparação de tiers + CTA de upgrade)
- [ ] Banner de trial/expirado (ex: "Seu trial expira em X dias")
- [ ] Gate de feature: limite de `trainer_clients` ativos por tier (check em `TrainerDashboardScreen.tsx` e no fluxo de aceitar convite)
- [ ] Gate de feature: Coach DNA por tier (`CoachDNAScreen.tsx`)
- [ ] i18n (en/pt/es/de) para toda a UI de planos/billing
- [ ] Teste manual: trial → upgrade → downgrade → cancelamento → expiração

---

## Fase 2 — End Customer Plans (Free / AI Fitness / AI Performance)

**Objetivo**: cliente final paga por tier de IA. Depende de decisão de produto sobre o que diferencia os tiers.

**Estimativa**: 3-5 dias (reduzida — o "motor analítico" do AI Performance já existe, ver abaixo)

**Achado (2026-06-15)**: o subsistema `PerformanceDashboardScreen.tsx` / `perf-engines.ts` / `perf-types.ts`
(M5Data, RF-5.8) já calcula 9 scores preditivos (`churnRisk`, `fatigueRisk`, `painRecurrence`,
`progressionReadiness`, `sessionCompletion`, `planFit`, `recoveryInstability`, `responseCompatibility`,
`plateauRisk`) a partir de RPE/sono/aderência/dor/volume — para 100% dos clientes, sem gate.
Não cobre métricas "duras" de performance esportiva (VO2max, HRV, pace, 1RM, zonas de FC,
periodização estruturada), mas cobre boa parte do conceito "Performance" do documento de classificação
(fadiga, recovery, progressão, plateau, plan fit).

**Estratégia de upsell adotada**: em vez de esconder o AI Performance por trás de um paywall opaco,
o `TelaScores` (tela "AI Scores") já foi dividido em:

- **Free** (4 scores): `sessionCompletion`, `churnRisk`, `painRecurrence`, `planFit` — sinais básicos de
  engajamento/saúde, sempre visíveis.
- **AI Performance** (5 scores, teaser): `fatigueRisk`, `recoveryInstability`, `progressionReadiness`,
  `responseCompatibility`, `plateauRisk` — renderizados como cards com valor borrado, badge 🔒
  "AI Performance" e CTA, no mesmo grid (não somem, geram desejo).
- Implementado em `src/screens/client/PerformanceDashboardScreen.tsx` (`FREE_SCORE_CODES`,
  `LockedScoreCard`), CTA navega para a tela `plans` (`src/screens/client/PlansScreen.tsx`, ver abaixo).
- i18n adicionado (en/pt/es/de): `perf.scores.premiumBadge/premiumLocked/premiumCta`.
- Gate ligado à tabela `subscriptions` (Fase 0 light, 2026-06-15): `isPremium =
  !!selectedClient || user.plan_key === 'ai_performance'` — trainer vendo
  cliente sempre vê tudo; cliente vê os 5 scores avançados apenas com
  `plan_key === 'ai_performance'`. `ai_fitness` não desbloqueia os scores
  avançados (apenas o ajuste de IA por check-in, conforme item abaixo).

- [ ] Definir o que cada tier desbloqueia (decisão de produto — exemplos a validar):
  - Free: planos de treino fixos, sem ajuste de IA, 4 scores preditivos básicos
  - AI Fitness (€9.99): ajuste de IA por check-in (Coach DNA básico aplicado ao cliente)
  - AI Performance (€24.99): ajuste de IA avançado, os 5 scores preditivos avançados (fadiga/recovery/
    progressão/plateau/resposta), análises de tendência, body rhythm tracking completo
- [x] i18n da tela "Planos" mapeado do protótipo Inception (`inception-i18n.jsx` →
  `src/i18n/locales/{en,pt,es,de}.json`, namespace `plans`): textos de `plans` (kicker, headings,
  toggle mensal/anual, footer, `selectCta`), `plans.text.{free,ai_fitness,ai_performance,trial,pro,elite}`
  (tag/blurb/features/note por plano) e `plans.peek`/`plans.confirm` (quiz de recomendação e
  tela de confirmação).
- [x] Tela "Planos" (`src/screens/client/PlansScreen.tsx`, rota `plans`): grid de `PlanCard`
  (free/AI Fitness/AI Performance para `client`, trial/pro/elite para roles em `TRAINER_ROLES`) +
  `BillingToggle` mensal/anual com badge "2 meses grátis", reaproveitando o i18n acima e os átomos
  `perf-atoms`. CTA do `LockedScoreCard` agora navega para `plans`.
- [x] `PlansScreen` ligada a `subscriptions` (Fase 0 light, sem checkout): seleção de plano grava
  `plan_key`/`billing_cycle` via `upsertSubscription` (self-assign), badge "Plano atual" no card
  correspondente, e `isPremium` em `PerformanceDashboardScreen.tsx` lê `user.plan_key` real.
  Checkout real (Stripe) continua dependendo da Fase 0 completa.
- [ ] Quiz de recomendação (`QuizOption`/`computeRec`, `plans.peek`) — não implementado nesta etapa;
  é parte do fluxo de onboarding "Inception", escopo separado da tela de Planos em si.
- [ ] Gate de feature: pontos de ajuste de IA em `buildAIContext.ts`/`askAI()` condicionados ao tier do cliente
- [ ] Gate de feature: telas/seções premium (ex: body rhythm avançado) com placeholder de upsell
  (mesmo padrão visual do `LockedScoreCard`)
- [ ] i18n (en/pt/es/de) para a tela "Planos"
- [ ] Teste manual: free → upgrade → uso de features gated → downgrade

**Gap remanescente (fora desta fase)**: métricas esportivas "duras" (VO2max, HRV, pace, 1RM, zonas de
FC, periodização meso/macrociclo) não existem em `M5Data` e não são cobertas pelo `perf-engines.ts`.
Se o produto exigir essas métricas para justificar o tier "AI Performance" no longo prazo, é um item
de engenharia novo, não coberto por este roadmap.

---

## Fase 3 — Marketplace (15% revenue share)

**Objetivo**: novo módulo de produto — descoberta pública de trainers, matching, rastreamento de origem do cliente para cálculo de comissão. Maior esforço de todas as fases.

**Estimativa**: 10-15 dias (módulo novo completo)

- [ ] Definir modelo de dados: perfil público de trainer (bio, especialidades, preço, avaliações), `marketplace_leads`/`referrals` (rastreia origem do cliente: convite direto vs marketplace)
- [ ] Tela de descoberta/busca de trainers (filtros: especialidade, localização, preço)
- [ ] Perfil público do trainer (visível a não-autenticados ou só a clients logados — decisão de produto)
- [ ] Fluxo de "solicitar trainer via marketplace" → equivalente ao `trainer_invitations` mas com origem=marketplace
- [ ] Cálculo de comissão (15% sobre receita de clientes com origem=marketplace) — relatório para o trainer e para admin
- [ ] Schema/RLS para `marketplace_profiles`, `marketplace_referrals`
- [ ] i18n (en/pt/es/de)
- [ ] Teste manual: trainer publica perfil → cliente descobre → vincula → comissão calculada corretamente

---

## Fase 4 — Studio Tier (gap do documento)

**Objetivo**: o modelo recomendado não cobre Studio explicitamente, mas o app já tem papéis `studio_admin`/`studio_trainer`. Decidir posicionamento de Studio na grade de preços.

**Estimativa**: a definir após decisão de produto (provavelmente 3-5 dias se reusar billing da Fase 0)

- [ ] Decisão de produto: Studio é um tier próprio (ex: por assento/trainer) ou um add-on sobre Trainer Elite?
- [ ] Schema: se por assento, `subscriptions` precisa suportar `studio_id` + quantidade de seats
- [ ] Gate de feature: limite de `studio_members` por plano
- [ ] Tela de billing para `studio_admin` (gerenciar assentos/trainers)
- [ ] i18n (en/pt/es/de)

---

## Resumo de estimativas

| Fase | Estimativa | Depende de |
|---|---|---|
| 0 — Fundação Billing | 3-4 dias | — |
| 1 — Trainer Plans | 4-6 dias | Fase 0 |
| 2 — Client Plans | 4-6 dias | Fase 0 (paralelo à Fase 1 após definição de produto) |
| 3 — Marketplace | 10-15 dias | Fase 0 (independente de 1/2) |
| 4 — Studio Tier | 3-5 dias | Fase 0, decisão de produto |

**Total estimado (sequencial)**: ~24-36 dias de trabalho focado para o modelo completo. Fases 1 e 2 podem ser paralelizadas após a Fase 0; Fase 3 pode iniciar em paralelo a qualquer momento após Fase 0, dado que é o módulo de maior escopo e menor dependência das demais.

**Bloqueios de decisão de produto (precisam ser resolvidos antes de codar)**:
1. O que cada tier de trainer (Pro/Elite) desbloqueia em termos de features concretas do app atual?
2. O que diferencia "AI Fitness" de "AI Performance" para o cliente final?
3. Onde Studio se encaixa na grade de preços (ausente do documento original)?
4. Marketplace: perfis públicos são visíveis sem login? Como funciona o matching/aprovação?
