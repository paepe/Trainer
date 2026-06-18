# Plano de Implementação — Feature Gating por Plano

**Versão:** 2.0
**Data:** 2026-06-18
**Referência:** `docs/FEATURE_ACCESS_MATRIX.md` · `docs/PLAN_PRICING_MODEL.md`
**Estimativa total:** ~21h
**Auditoria base:** 2026-06-18 — gaps integrados nas Fases 0, 6B e 8

---

## Premissas

- Zero hardcoded plan checks — todo gating via `feature_permissions` table
- Modelo aditivo: FREE → AI FITNESS → AI PERFORMANCE (cada tier herda o anterior)
- Hook `useFeatureAccess` / `useFeatureAccessMap` reutilizado sem alteração de contrato
- Override de treinador (`isTrainerOverride`) preservado em todos os pontos
- Cada fase é independente e deployável isoladamente
- TypeScript strict — nenhuma fase fecha sem `tsc --noEmit` limpo

---

## Fase 0 — Correcções Urgentes (Pré-condição)

**Esforço:** ~2h
**Risco:** Alto (revenue leak + conversão sem pressão)
**Dependências:** Nenhuma — executar antes de qualquer outra fase

### 0A — Conflito `clients.limit` PRO

Dois seeds conflitantes (mesmo dia) definem valores diferentes para o limite de clientes do plano PRO:

- `supabase-feature-permissions-20260616.sql` → PRO: `NULL` (ilimitado)
- `supabase-feature-permissions-trainer-additive-20260616.sql` → PRO: `50`

O valor correcto é **50**, conforme `docs/FEATURE_ACCESS_MATRIX.md`.

### Checklist

- [ ] Verificar estado actual na DB:

  ```sql
  SELECT plan_key, limit_value FROM feature_permissions WHERE feature_key = 'clients.limit';
  ```

- [ ] Se PRO retornar `NULL`: executar correcção:

  ```sql
  UPDATE feature_permissions SET limit_value = 50 WHERE feature_key = 'clients.limit' AND plan_key = 'pro';
  ```

- [ ] Arquivar SQL em `supabase/sql-archive/fix-clients-limit-pro-20260618.sql`
- [ ] Confirmar: TRIAL=3, PRO=50, ELITE=NULL
- [ ] Commit: `fix(permissions): set clients.limit PRO to 50 (was NULL)`

---

### 0B — Expiração do Trial sem Stripe

`useTrialStatus.ts` faz fallback de 14 dias quando `current_period_end` é null, o que significa que sem Stripe o trial nunca expira. Trainers ficam indefinidamente no tier TRIAL sem pressão de conversão.

### Checklist

- [ ] No fluxo de criação de conta trainer (signup/onboarding):
  - [ ] Ao inserir o registo em `subscriptions` com `plan_key = 'trial'`: definir `current_period_end = now() + interval '14 days'`
  - [ ] Garantir que este valor é escrito pelo servidor (Edge Function ou `upsertSubscription`), não pelo cliente
- [ ] Em `useTrialStatus.ts`:
  - [ ] Remover fallback de 14 dias estático
  - [ ] Ler `current_period_end` da tabela `subscriptions`
  - [ ] Se `current_period_end < now()` e `plan_key = 'trial'`: retornar `{ expired: true, daysLeft: 0 }`
- [ ] Em `App.tsx` (banner de trial):
  - [ ] Se `expired: true`: bloquear acesso às funcionalidades e apresentar modal de upgrade obrigatório (não apenas banner)
- [ ] Testar: criar conta trainer → forçar `current_period_end = now() - 1 day` em dev → confirmar bloqueio
- [ ] Commit: `fix(trial): enforce expiry via current_period_end, remove static fallback`

---

### 0C — Welcome Window (Freemium Progressivo para alunos FREE)

**Decisões de produto (2026-06-18):**

- Duração: **21 dias** a partir do signup
- Tier exibido: **AI Fitness completo** (7 sessões/semana, check-in completo, progresso fitness avançado)
- Aplicação: **todos os novos cadastros a partir do lançamento** — sem retroactividade (produto não lançado)

**Mecânica:** o utilizador FREE recebe experiência completa de AI Fitness durante 21 dias sem cartão, sem fricção. Nos últimos 4 dias aparece um countdown discreto. No dia 22, o gating degrada para os limites FREE reais — o utilizador sente a perda concreta de algo que já usou, que é o CTA mais eficaz para conversão.

### Checklist

- [ ] No signup de conta cliente (role `client`):
  - [ ] Ao criar registo em `subscriptions` com `plan_key = 'free'`: definir `current_period_end = now() + interval '21 days'`
  - [ ] Escrito pelo servidor (Edge Function ou `upsertSubscription`), não pelo cliente
- [ ] Em `useFeatureAccess` (ou `useTrialStatus`):
  - [ ] Derivar `inWelcomeWindow = plan_key === 'free' && current_period_end > now()`
  - [ ] Se `inWelcomeWindow`: retornar permissões de `ai_fitness` em vez de `free` para todas as feature keys de conteúdo
  - [ ] Permissões de plano (ex: `clients.limit`) não são afectadas — continuam as do `free`
- [ ] Banner de countdown (dias 18–21):
  - [ ] Exibir banner sutil na home/dashboard: "A sua experiência AI Fitness termina em X dias — continuar por €9,99/mês"
  - [ ] Não alarmista; dispensável pelo utilizador; reaparece a cada sessão
  - [ ] CTA leva directamente ao `PlansScreen` com AI Fitness pré-seleccionado
- [ ] No dia 22+ (welcome window expirada):
  - [ ] `inWelcomeWindow = false` → gating reverte para limites FREE reais
  - [ ] Na primeira acção bloqueada: modal de upgrade com contexto: "A sua experiência AI Fitness terminou. Retome por €9,99/mês."
  - [ ] Modal não é dispensável na primeira ocorrência; nas seguintes sim
- [ ] Adicionar i18n keys (en/pt/es/de):
  - [ ] `welcome.countdownBanner` — "A sua experiência AI Fitness termina em {{days}} dias"
  - [ ] `welcome.countdownCta` — "Continuar por €9,99/mês"
  - [ ] `welcome.expiredModal` — "A sua experiência AI Fitness terminou. Retome por €9,99/mês."
  - [ ] `welcome.expiredModalCta` — "Ver planos"
- [ ] Testar: criar conta cliente → confirmar `current_period_end = now() + 21 days` no DB
- [ ] Testar: forçar `current_period_end = now() - 1 day` em dev → confirmar degradação + modal
- [ ] Testar: dias 18–21 → confirmar countdown visível
- [ ] Commit: `feat(welcome-window): 21-day AI Fitness trial for new free accounts`

---

## Fase 1 — Fundação: DB + Types

**Esforço:** ~1h
**Risco:** Baixo
**Dependências:** Fase 0

### Objectivo

Criar as 7 novas feature keys na base de dados e no type system. Nenhuma lógica de UI tocada ainda.

### Checklist

- [ ] Criar `supabase/sql-archive/supabase-feature-permissions-client-v2-20260617.sql`
  - [ ] Inserir `workout.sessions_per_week` (free=1, ai_fitness=7, ai_performance=null)
  - [ ] Inserir `workout.exercises_per_session` (free=2, ai_fitness=null, ai_performance=null)
  - [ ] Inserir `workout.exercise_type` com encoding `0 = fitness only / null = all` em `limit_value`
  - [ ] Inserir `checkin.full` (free=false, ai_fitness=true, ai_performance=true)
  - [ ] Inserir `trainer_plan.days_per_week` (free=1, ai_fitness=3, ai_performance=null)
  - [ ] Inserir `progress.fitness_advanced` (free=false, ai_fitness=true, ai_performance=true)
  - [ ] Inserir `progress.performance` (free=false, ai_fitness=false, ai_performance=true)
- [ ] Aplicar migration via `apply_migration` (Supabase MCP)
- [ ] Atualizar `src/types/feature-permissions.ts`
  - [ ] Adicionar ao union `FeatureKey`:
    - `'workout.sessions_per_week'`
    - `'workout.exercises_per_session'`
    - `'workout.exercise_type'`
    - `'checkin.full'`
    - `'trainer_plan.days_per_week'`
    - `'progress.fitness_advanced'`
    - `'progress.performance'`
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(permissions): add client plan feature keys v2`

> **Nota `workout.exercise_type`:** Decidido manter encoding `0 = fitness / null = all` em `limit_value` (evita alteração de schema). Adicionar comentário SQL no seed explicando a convenção. Se no futuro surgirem mais tipos, migrar para coluna `text_value TEXT`.

---

## Fase 2 — Check-in: `checkin.full`

**Esforço:** ~2h
**Risco:** Baixo
**Dependências:** Fase 1

### Objectivo

Condicionar o formulário de Check-in Completo ao plano do utilizador.

### Checklist

- [ ] Localizar `AICheckinScreen.tsx` — identificar onde modo rápido vs. completo é seleccionado
- [ ] Adicionar `useFeatureAccess(user.plan_key, 'checkin.full')` ao componente
- [ ] Condicionar renderização:
  - [ ] Se `!checkinFullAllowed`: mostrar apenas Check-in Rápido
  - [ ] Se `!checkinFullAllowed`: mostrar badge/teaser de upgrade abaixo do formulário
- [ ] Adicionar i18n keys (en/pt/es/de):
  - [ ] `checkin.lockedFull` — "Check-in Completo disponível a partir do plano AI Fitness"
  - [ ] `checkin.lockedFullCta` — "Actualizar plano"
- [ ] Testar: FREE → apenas Rápido visível; AI FITNESS → Completo acessível
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(checkin): gate full check-in to ai_fitness+ plans`

---

## Fase 3 — Workout IA: sessões, exercícios e tipo

**Esforço:** ~4h
**Risco:** Médio
**Dependências:** Fase 1

### Objectivo

A IA respeita os limites do plano ao gerar sessões: máximo de sessões semanais, exercícios por sessão, e tipo de exercícios.

### Checklist

- [ ] `StartWorkoutScreen.tsx` — leitura dos novos gates
  - [ ] Adicionar ao `useFeatureAccessMap`: `'workout.sessions_per_week'`, `'workout.exercises_per_session'`, `'workout.exercise_type'`
  - [ ] Extrair: `sessionsPerWeek`, `exercisesPerSession`, `exerciseType` (0=fitness / null=all)
- [ ] Implementar contagem de sessões semanais
  - [ ] Query `workout_sessions` WHERE `user_id = X AND started_at >= start_of_week`
  - [ ] Se limite atingido: bloquear geração + CTA upgrade
- [ ] Passar limites ao gerador IA
  - [ ] `maxExercises` → incluir no prompt/parâmetros
  - [ ] `exerciseType` → filtrar exercícios de desempenho no prompt se `0`
- [ ] Teaser de exercícios de desempenho — **não silencioso:**
  - [ ] Para planos FREE e AI FITNESS: após listagem de exercícios gerados, mostrar secção bloqueada "Exercícios de Desempenho" com ícone cadeado e descrição do que inclui (ex: potência, sprint, ATL/CTL)
  - [ ] CTA: "Disponível no AI Performance — Ver planos"
  - [ ] Objectivo: o utilizador vê o que está a perder, não apenas um bloqueio opaco
- [ ] Mensagem de upgrade (FREE) citar as 3 limitações juntas: "1 sessão/semana · 2 exercícios · apenas Fitness"
- [ ] Adicionar i18n keys (en/pt/es/de):
  - [ ] `workout.limitWeekly`, `workout.limitExercises`, `workout.limitType`, `workout.limitCta`
  - [ ] `workout.performanceTeaser` — descrição dos exercícios de desempenho bloqueados
  - [ ] `workout.performanceTeaserCta` — "Disponível no AI Performance"
- [ ] Testar FREE / AI FITNESS / AI PERFORMANCE
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(workout): apply plan gates to AI session generation`

---

## Fase 4 — Plano do Treinador: dias activos por semana

**Esforço:** ~3h
**Risco:** Médio
**Dependências:** Fase 1

### Objectivo

Limitar os dias do plano do treinador que o aluno pode executar conforme o seu plano.

### Checklist

- [ ] Identificar onde os dias do plano do treinador são renderizados (`WorkoutModeScreen.tsx` ou equivalente)
- [ ] Adicionar `useFeatureAccess(user.plan_key, 'trainer_plan.days_per_week')`
- [ ] Dias excedentes: renderizar como bloqueados (ícone cadeado)
- [ ] Ao tentar executar dia bloqueado: modal com CTA de upgrade específico por tier
- [ ] Filtrar tipo de exercícios do treinador por `workout.exercise_type`
  - [ ] AI FITNESS: ignorar exercícios de desempenho; mostrar nota ao aluno
- [ ] Adicionar i18n keys (en/pt/es/de):
  - [ ] `trainerPlan.dayLocked`, `trainerPlan.dayLockedNote`, `trainerPlan.exerciseTypeLocked`
- [ ] Testar FREE / AI FITNESS / AI PERFORMANCE
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(trainer-plan): gate active days and exercise type by client plan`

---

## Fase 5 — Progresso: métricas fitness avançadas e desempenho

**Esforço:** ~2h
**Risco:** Baixo
**Dependências:** Fase 1

### Objectivo

Substituir o gate único `scores.advanced` por dois gates independentes.

### Checklist

- [ ] `PerformanceDashboardScreen.tsx`
  - [ ] Substituir `scores.advanced` por `progress.fitness_advanced` e `progress.performance`
  - [ ] Separar `ADVANCED_SCORE_CODES` em `FITNESS_ADVANCED_CODES` e `PERFORMANCE_CODES`
  - [ ] `locked` calculado independentemente por cada conjunto de scores
- [ ] Atualizar `PerformanceDashboardScreen.test.tsx`
  - [ ] Cenário: AI FITNESS → fitness avançados visíveis, desempenho bloqueados
  - [ ] Cenário: FREE → ambos bloqueados
- [ ] `tsc --noEmit` limpo
- [ ] `npx vitest run` limpo
- [ ] Commit: `feat(progress): split fitness-advanced and performance score gates`

---

## Fase 6 — Comunicação de Valor na PlansScreen

**Esforço:** ~3h
**Risco:** Baixo
**Dependências:** Nenhuma (UI pura)

### Objectivo

Tornar visível o valor real de cada plano na tela de comparação, especialmente os benefícios invisíveis actualmente.

### 6A — Dias do plano do treinador por tier (aluno)

- [ ] Em `PlansScreen.tsx` (vista de aluno):
  - [ ] Adicionar feature "Dias de treino com o seu treinador" às descrições de cada tier:
    - FREE: "1 dia/semana com o seu treinador"
    - AI FITNESS: "3 dias/semana com o seu treinador"
    - AI PERFORMANCE: "Todos os dias do plano do seu treinador"
  - [ ] Garantir que este item aparece mesmo que o aluno ainda não tenha treinador (proposta de valor futura)
- [ ] Adicionar i18n keys (en/pt/es/de):
  - [ ] `plans.feature.trainerDays.free`, `plans.feature.trainerDays.ai_fitness`, `plans.feature.trainerDays.ai_performance`
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(plans): show trainer plan days per tier in PlansScreen`

### 6B — Teaser de Marketplace e Studio Branding (treinador)

`marketplace.listing`, `marketplace.revenue_share` e `studio.branding` são features pagas (PRO/ELITE) mas sem UI implementada. O treinador que converte não vê o valor prometido — risco de churn imediato.

- [ ] Na PlansScreen de treinador, para PRO e ELITE:
  - [ ] Adicionar badge "Em breve" às features Marketplace e Studio Branding
  - [ ] Badge visível mas honesto — não prometer entrega imediata
- [ ] Criar issues/tasks para implementação prioritária de Studio Branding (PRO) e Marketplace (ELITE)
- [ ] Commit: `feat(plans): add coming-soon badges for marketplace and studio features`

---

## Fase 7 — Mensagens de Upgrade (i18n consolidação)

**Esforço:** ~2h
**Risco:** Baixo
**Dependências:** Fases 2, 3, 4, 5, 6

### Checklist

- [ ] Auditar todas as keys i18n adicionadas nas fases 2–6
- [ ] Garantir presença em `en.json`, `pt.json`, `es.json`, `de.json`
- [ ] Rever mensagens FREE para citar as 3 limitações juntas quando relevante
- [ ] Rever CTAs: texto consistente "Actualizar plano" / "Ver planos" em todos os pontos
- [ ] Verificar que `PlansScreen` mostra comparativo ao navegar via CTA
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(i18n): consolidate plan upgrade messaging`

---

## Fase 8 — Validação Final e Deploy

**Esforço:** ~2h
**Risco:** Baixo
**Dependências:** Todas as fases anteriores

### Checklist

- [ ] `tsc --noEmit` limpo em todo o projecto
- [ ] `npx vitest run` — zero regressões
- [ ] Confirmar DB: `clients.limit` TRIAL=3, PRO=50, ELITE=NULL
- [ ] Confirmar DB: todas as feature keys client v2 presentes
- [ ] Teste E2E — `ana.lima@client.test` (FREE, sem treinador):
  - [ ] Check-in → apenas Rápido
  - [ ] Workout IA → 1 sessão, 2 exercícios fitness + teaser de desempenho visível
  - [ ] 2ª sessão na semana → bloqueio + CTA
  - [ ] Progresso → básicas visíveis, restantes bloqueadas
- [ ] Teste E2E — `beatriz.nunes@client.test` (FREE, com treinador):
  - [ ] 1 dia activo, restantes bloqueados com CTA
- [ ] Teste E2E — conta AI FITNESS:
  - [ ] 7 sessões, fitness apenas, teaser de desempenho visível
  - [ ] 3 dias do treinador activos
  - [ ] Progresso fitness avançado visível, desempenho bloqueado
- [ ] Teste E2E — conta trainer TRIAL recém-criada:
  - [ ] `current_period_end` escrito no signup
  - [ ] Forçar expiração em dev → modal de upgrade aparece
- [ ] Commit final + push
- [ ] Actualizar `docs/FEATURE_ACCESS_MATRIX.md` — marcar feature keys como "implementadas"

---

## Resumo Executivo

| Fase | Área | Esforço | Risco | Estado |
| --- | --- | --- | --- | --- |
| **0A** | Fix `clients.limit` PRO (seed conflict) | ~0.5h | Alto | Pendente |
| **0B** | Fix trial expiry enforcement (trainer) | ~1.5h | Alto | Pendente |
| **0C** | Welcome window 21 dias para alunos FREE | ~3h | Médio | Pendente |
| 1 | DB seed + FeatureKey types | ~1h | Baixo | Pendente |
| 2 | `checkin.full` gate | ~2h | Baixo | Pendente |
| 3 | `workout.*` gates + teaser desempenho | ~4h | Médio | Pendente |
| 4 | `trainer_plan.days_per_week` gate | ~3h | Médio | Pendente |
| 5 | `progress.fitness_advanced` / `progress.performance` | ~2h | Baixo | Pendente |
| 6 | PlansScreen — valor visível + badges "Em breve" | ~3h | Baixo | Pendente |
| 7 | i18n — mensagens de upgrade consolidadas | ~2h | Baixo | Pendente |
| 8 | Validação final + deploy | ~2h | Baixo | Pendente |
| **Total** | | **~24h** | | |

> **Nota:** Estimativa revista de 16h → 24h pela inclusão das Fases 0A/0B (correcções urgentes), 0C (welcome window) e 6 (comunicação de valor).

**Ordem recomendada:** 0A → 0B → 0C → 1 → 5 → 2 → 3 → 4 → 6 → 7 → 8
