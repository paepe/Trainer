# Plano de Implementação — Feature Gating por Plano

**Versão:** 2.0
**Data:** 2026-06-18
**Referência:** `docs/FEATURE_ACCESS_MATRIX.md` · `docs/PLAN_PRICING_MODEL.md`
**Estimativa total:** ~32h
**Auditoria base:** 2026-06-18 — gaps integrados nas Fases 0, 6B e 8

> **Estado histórico:** este plano regista decisões de 2026-06. Não é a fonte de verdade actual para limites comerciais. Em 2026-08-05, AI FITNESS passou a uso ilimitado e os gates comerciais de categoria de exercício e de dias do plano TRAINER foram retirados. Consultar `FEATURE_ACCESS_MATRIX.md` §2 e §4 para o estado efectivo.

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

### 0B — Trial do Treinador: 21 dias com experiência PRO completa

**Decisão de produto (2026-06-18):**

- Duração: **21 dias** a partir do signup (alinhado com a welcome window do cliente)
- Tier exibido: **PRO completo** (clientes ilimitados durante o trial, Coach DNA, Studio Branding, AI scores avançados)
- Mecânica idêntica à welcome window do cliente: o trainer experimenta o produto real, sente a perda na expiração, converte por loss aversion
- `plan_key` permanece `'trial'` — a elevação de permissões é derivada pelo hook, não pelo DB

### Checklist

- [x] No fluxo de criação de conta trainer (signup/onboarding):
  - [x] Ao inserir o registo em `subscriptions` com `plan_key = 'trial'`: definir `current_period_end = now() + interval '21 days'`
  - [x] Escrito pelo servidor (`upsertSubscription`/`fetchProfile`), não pelo cliente
- [x] Em `useTrialStatus.ts`:
  - [x] Remover fallback de 14 dias estático — sem `current_period_end` → `expired`
  - [x] `daysLeft ≤ 4` → `expiring` (countdown banner em amber)
- [x] Criar `useTrialWindow.ts` (análogo a `useWelcomeWindow`):
  - [x] `plan_key === 'trial' && current_period_end > now()` → retornar permissões de `pro`
  - [x] Estados: `active | expiring | expired | not_applicable`
- [x] Em `useEffectivePlanKey`: se `inTrialWindow` activo, resolver com `plan_key = 'pro'`
- [x] Adicionar i18n keys (en/pt/es/de):
  - [x] `trial.countdownBanner`, `trial.countdownCta`, `trial.expiredModal`, `trial.expiredModalCta`
- [x] **UI:** `WindowBanner` — countdown nos últimos 4 dias (`expiring`), usa `trainer.trial.countdownBanner` + `countdownCta`
- [x] **UI:** `ExpiryModal` — modal full-screen na primeira sessão após expiração; dispensável via "Maybe later"
- [x] Commit: `feat(ui): add countdown banners + expiry modals` ✅ 8fcffd8

---

### 0C — Welcome Window (Freemium Progressivo para alunos FREE)

**Decisões de produto (2026-06-18):**

- Duração: **21 dias** a partir do signup
- Tier exibido: **AI Fitness completo** (à data: 7 sessões/semana, check-in completo, progresso fitness avançado; limite de sessões substituído por uso ilimitado em 2026-08-05 — ver nota de estado acima)
- Aplicação: **todos os novos cadastros a partir do lançamento** — sem retroactividade (produto não lançado)

**Mecânica:** o utilizador FREE recebe experiência completa de AI Fitness durante 21 dias sem cartão, sem fricção. Nos últimos 4 dias aparece um countdown discreto. No dia 22, o gating degrada para os limites FREE reais — o utilizador sente a perda concreta de algo que já usou, que é o CTA mais eficaz para conversão.

### Checklist

- [x] No signup de conta cliente (role `client`):
  - [x] Ao criar registo em `subscriptions` com `plan_key = 'free'`: definir `current_period_end = now() + interval '21 days'`
  - [x] Escrito pelo servidor (`fetchProfile`), não pelo cliente
- [x] Criar `useWelcomeWindow.ts`:
  - [x] Derivar `inWelcomeWindow = plan_key === 'free' && current_period_end > now()`
  - [x] Estados: `active | expiring | expired | not_applicable`
- [x] Em `useEffectivePlanKey`: se `inWelcomeWindow` activo, resolver com `plan_key = 'ai_fitness'`
- [x] Adicionar i18n keys (en/pt/es/de):
  - [x] `client.welcome.countdownBanner`, `countdownCta`, `expiredModal`, `expiredModalCta`
- [x] **UI:** `WindowBanner` — countdown nos últimos 4 dias (`expiring`), usa `client.welcome.countdownBanner` + `countdownCta`
- [x] **UI:** `ExpiryModal` — modal full-screen na primeira sessão após expiração; dispensável via "Maybe later"
- [x] Commit: `feat(ui): add countdown banners + expiry modals` ✅ 8fcffd8

---

## Fase 1 — Fundação: DB + Types

**Esforço:** ~1h
**Risco:** Baixo
**Dependências:** Fase 0

### Objectivo

Criar as 7 novas feature keys na base de dados e no type system. Nenhuma lógica de UI tocada ainda.

### Checklist

- [x] 7 novas feature keys inseridas no DB (já existiam de migration anterior)
- [x] Trial window DB rows inseridas (`trial` × 7 keys) via migration `feature_permissions_trial_window_20260618`
- [x] `src/types/feature-permissions.ts` — union `FeatureKey` já completo com todas as 7 keys
- [x] `useEffectivePlanKey` criado em `useFeatureAccess.ts` — eleva `free→ai_fitness` e `trial→pro`
- [x] `tsc --noEmit` limpo
- [x] Commit: `feat(permissions): add useEffectivePlanKey + trial window DB rows` ✅ 3ebfb19

> **Nota `workout.exercise_type`:** Decidido manter encoding `0 = fitness / null = all` em `limit_value` (evita alteração de schema). Adicionar comentário SQL no seed explicando a convenção. Se no futuro surgirem mais tipos, migrar para coluna `text_value TEXT`.

---

## Fase 2 — Check-in: `checkin.full`

**Esforço:** ~2h
**Risco:** Baixo
**Dependências:** Fase 1

### Objectivo

Condicionar o formulário de Check-in Completo ao plano do utilizador.

### Checklist

- [x] `CheckInProntidaoScreen` já tinha gate `checkin.full` implementado via `useFeatureAccess`
- [x] Ligado a `useEffectivePlanKey` — welcome window e trial window respeitados
- [x] `CheckInHub` filtra opções e mostra teaser de upgrade (UI + i18n já existiam)
- [x] i18n keys `checkin.hub.fullLocked`, `fullLockedNote`, `fullLockedCta` — 4/4 locales ✅
- [x] `tsc --noEmit` limpo
- [x] Commit: `feat(checkin): wire useEffectivePlanKey into checkin gate` ✅ c3aff90

---

## Fase 3 — Workout IA: sessões, exercícios e tipo

**Esforço:** ~4h
**Risco:** Médio
**Dependências:** Fase 1

### Objectivo

A IA respeita os limites do plano ao gerar sessões: máximo de sessões semanais, exercícios por sessão, e tipo de exercícios.

### Checklist

- [x] `useEffectivePlanKey` ligado — welcome/trial window respeitados
- [x] `sessionsPerWeek`, `exercisesPerSession`, `fitnessOnlyWorkout` já lidos e aplicados
- [x] Contagem semanal de sessões implementada (Monday-Sunday, blocks at cap)
- [x] `maxExercises` e `fitnessOnly` passados ao gerador IA via `TaskContext`
- [x] Teaser de desempenho adicionado após lista de exercícios gerados (visível FREE/AI Fitness)
- [x] i18n: `workout.performanceTeaser`, `performanceTeaserCta` — 4/4 locales ✅
- [x] `tsc --noEmit` limpo
- [x] Commit: `feat(workout): wire plan gates + performance teaser` ✅ cbcef36

---

## Fase 4 — Plano do Treinador: dias activos por semana

**Esforço:** ~3h
**Risco:** Médio
**Dependências:** Fase 1

### Objectivo

Limitar os dias do plano do treinador que o aluno pode executar conforme o seu plano.

### Checklist

- [x] `trainerPlanDaysCap` derivado de `useEffectivePlanKey` via `aiAccessMap`
- [x] `isPlanLocked` bloqueia planos além do cap; modal com CTA de upgrade implementado
- [x] Nota fitness-only adicionada acima da lista de planos quando `fitnessOnlyWorkout = true`
- [x] Nota: filtro por exercício individual adiado para Fase 9 (`plan_exercises` sem `exercise_category`)
- [x] i18n: `trainerPlan.dayLocked`, `dayLockedNote`, `dayLockedCta`, `exerciseTypeLocked` — 4/4 locales ✅
- [x] `tsc --noEmit` limpo
- [x] Commit: `feat(trainer-plan): gate active days + exercise type notice` ✅ ecbf339

---

## Fase 5 — Progresso: métricas fitness avançadas e desempenho

**Esforço:** ~2h
**Risco:** Baixo
**Dependências:** Fase 1

### Objectivo

Substituir o gate único `scores.advanced` por dois gates independentes.

### Checklist

- [x] `scores.advanced` removido; gates granulares `progress.fitness_advanced` e `progress.performance` activos
- [x] `FITNESS_ADVANCED_CODES` e `PERFORMANCE_CODES` separados; `locked` calculado independentemente
- [x] `useEffectivePlanKey` ligado via `user.subscription`
- [x] Testes actualizados: 5/5 passing (FREE / AI FITNESS / AI PERFORMANCE / nav / FREE_CODES)
- [x] `tsc --noEmit` limpo
- [x] Commit: `feat(progress): split fitness-advanced and performance score gates` ✅ 3c2d609

---

## Fase 6 — Comunicação de Valor na PlansScreen

**Esforço:** ~3h
**Risco:** Baixo
**Dependências:** Nenhuma (UI pura)

### Objectivo

Tornar visível o valor real de cada plano na tela de comparação, especialmente os benefícios invisíveis actualmente.

### 6A — Dias do plano do treinador por tier (aluno)

- [x] `plans.text.{free,ai_fitness,ai_performance}.features` actualizados com dias do treinador em 4/4 locales
- [x] Visível independentemente de ter treinador (proposta de valor futura)
- [x] `tsc --noEmit` limpo

### 6B — Teaser de Marketplace e Studio Branding (treinador)

- [x] `comingSoon[]` key adicionada a `pro` e `elite` em 4/4 locales
- [x] `PlansScreen` renderiza itens `comingSoon` com estilo muted + badge "Em breve" / "Soon" / "Demnächst" / "Próximamente"
- [x] `trial.sub` actualizado de "14 dias" → "21 dias" em 4/4 locales; blurb reflecte PRO completo
- [x] `pro.features`: cap corrigido para 50 clientes; Studio Branding → `comingSoon`
- [x] `elite.features`: Marketplace + White-label → `comingSoon`
- [x] `plans.comingSoon` label adicionada em 4/4 locales
- [x] Commit: `feat(plans): trainer days per tier + coming-soon badges` ✅ ef5cf13

---

## Fase 7 — Mensagens de Upgrade (i18n consolidação)

**Esforço:** ~2h
**Risco:** Baixo
**Dependências:** Fases 2, 3, 4, 5, 6

### Checklist

- [x] Auditoria: 14/14 keys presentes em 4/4 locales — zero lacunas
- [x] Keys de welcome window adicionadas: `client.welcome.{countdownBanner,countdownCta,expiredModal,expiredModalCta}` — 4/4 locales
- [x] Keys de trial window adicionadas: `trainer.trial.{countdownBanner,countdownCta,expiredModal,expiredModalCta}` — 4/4 locales
- [x] CTAs verificados: todos os pontos de upgrade navegam para `'plans'` com `source` correto
- [x] `tsc --noEmit` limpo
- [x] Commit: `feat(i18n): consolidate upgrade messaging + welcome/trial window keys` ✅ dbfb5c5

---

## Fase 8 — Validação Final e Deploy

**Esforço:** ~2h
**Risco:** Baixo
**Dependências:** Todas as fases anteriores

### Checklist

- [x] `tsc --noEmit` limpo — zero erros
- [x] `npx vitest run` — 5/5 passing; 14 falhas pré-existentes em PlansScreen (sem regressões)
- [x] DB confirmado: `clients.limit` TRIAL=3, PRO=50, ELITE=NULL
- [x] DB confirmado: 16 feature keys presentes e correctas (ver FEATURE_ACCESS_MATRIX.md)
- [x] `docs/FEATURE_ACCESS_MATRIX.md` actualizado com estado de implementação de cada key
- [x] Commit: `docs(matrix): mark Phases 0-8 complete in FEATURE_ACCESS_MATRIX` ✅ d94a7ea
- [ ] **Pendente:** Testes E2E manuais (requerem app em execução)
- [ ] **Pendente:** Push para remote (aguarda aprovação)
- [x] `fix(app)`: `subscription` adicionado ao `AppUser` — welcome/trial window operacionais ✅ 115c630

---

## Fase 9 — Categorização de Exercícios: Fitness vs. Desempenho

**Esforço:** ~8h
**Risco:** Baixo
**Dependências:** Nenhuma (schema independente das fases anteriores)

### Contexto e Abordagem

A IA já distingue fitness de desempenho via instrução no prompt (`fitnessOnly = true`). O treinador, ao construir planos manualmente, não tem essa distinção disponível — criando uma assimetria: a IA filtra, o plano do treinador não.

### Abordagem: Opção A com cache persistente (classificação ad-hoc + memoização)

A classificação não é armazenada antecipadamente — é calculada pela IA no momento de uso e persistida no DB como cache. Na próxima consulta, o campo já existe e a IA não é invocada.

Vantagens desta abordagem:

- Sem invariante para manter — novos exercícios adicionados à biblioteca são classificados automaticamente na primeira consulta
- Sem batch inicial obrigatório — o catálogo auto-popula com o uso real
- Sem intervenção humana — a classificação é completamente invisível para o treinador
- Degradação graciosa — se a IA falhar, `exercise_category` permanece `NULL` e o exercício é exibido sem filtro
- Corrigível — classificações incorrectas podem ser corrigidas via SQL; na próxima consulta o cache é lido directamente

Decisões de produto (2026-06-18):

- Exercícios ad-hoc criados directamente no editor de plano são efémeros — não entram na biblioteca, não requerem classificação. `exercise_category = NULL`; exibidos ao aluno sem filtro. Confiança na expertise do profissional.
- A classificação pela IA é uma sugestão persistida, não uma fonte de verdade imutável — pode ser corrigida manualmente.

---

### 9A — Schema DB

- [x] `exercise_category` adicionada a `exercises` (tabela real — não `exercise_catalog`) com CHECK constraint
- [x] `exercise_category` adicionada a `plan_exercises` com CHECK constraint + índice
- [x] Nota: tabela identificada incorrectamente como `exercise_catalog` — nome real é `exercises` ✅ corrigido
- [x] Migration aplicada no remoto (`sevenseeds.trainer`) via SQL Editor ✅ 2026-06-21
- [x] Arquivada em `supabase/sql-archive/20260621_exercise_category_phase9a.sql`
- [x] Commit: `fix(phase9): correct table name exercise_catalog → exercises` ✅ 868b278

---

### 9B — Tipos

- [x] `ExerciseCategory = 'fitness' | 'performance' | 'mobility'` adicionado a `src/types/workout.ts`
- [x] `ExerciseCatalogItem.exercise_category?: ExerciseCategory | null` adicionado
- [x] Tipos Supabase regenerados (`src/types/supabase.ts`) — `exercise_category` presente em `exercises` e `plan_exercises`
- [x] Query de `plan_exercises` activada com `exercise_category` após migration aplicada
- [x] `tsc --noEmit` limpo
- [x] Commit: `feat(phase9): activate exercise_category query after migration applied` ✅ f20e6cb

---

### 9C — Serviço de Classificação IA

- [x] `api/classify-exercises.ts` criado — DeepSeek, temperatura 0.1, batch máximo 50
- [x] Input/Output tipados; validação de categoria no servidor
- [x] Timeout 15s; degradação graciosa em erro
- [x] Commit: `feat(phase9): exercise category classification — AI ad-hoc + DB cache` ✅ f3c48e5

---

### 9D — Hook de Classificação com Cache (`useExerciseClassification`)

- [x] `src/hooks/useExerciseClassification.ts` criado
- [x] Lê cache DB → classifica nulls via endpoint → persiste de volta (fire-and-forget)
- [x] Persiste em tabela `exercises` (não `exercise_catalog`)
- [x] Degradação graciosa — `null` exibido sem filtro se endpoint falhar
- [x] `tsc --noEmit` limpo
- [x] Commit: `fix(phase9): correct table name exercise_catalog → exercises` ✅ 868b278

---

### 9E — Editor do Treinador

- [x] `WorkoutExercise` interface: campo `exercise_category?` adicionado
- [x] `applyFromCatalog`: propaga `exercise_category` do catálogo para o draft
- [x] `sendPlan`: inclui `exercise_category` no insert de `plan_exercises`
- [x] Exercícios ad-hoc: `exercise_category = null` — sem classificação, sem chamada à IA
- [x] Commit: `feat(phase9): exercise category classification — AI ad-hoc + DB cache` ✅ f3c48e5

---

### 9F — Filtro no StartWorkoutScreen

- [x] `filteredTrainerPlans`: remove exercícios `performance` quando `fitnessOnlyWorkout = true`
- [x] `filteredCount`: conta exercícios filtrados para nota discreta
- [x] Nota genérica (Fase 4) substituída por `trainerPlan.exercisesFiltered` com contagem real
- [x] `useExerciseClassification` invocado apenas quando `fitnessOnlyWorkout && !isTrainerView`
- [x] i18n: `trainerPlan.exercisesFiltered` adicionado a en/pt/es/de
- [x] `tsc --noEmit` limpo · 5/5 testes passing · zero regressões
- [x] Commit: `feat(phase9): exercise category classification — AI ad-hoc + DB cache` ✅ f3c48e5

**Ordem de execução:** 9A → 9B → 9C → 9D → 9E → 9F ✅

---

## Resumo Executivo

| Fase | Área | Esforço | Risco | Estado |
| --- | --- | --- | --- | --- |
| **0A** | Fix `clients.limit` PRO (seed conflict) | ~0.5h | Alto | ✅ DB já correto |
| **0B** | Fix trial expiry enforcement (trainer) | ~1.5h | Alto | ✅ 2026-06-18 |
| **0C** | Welcome window 21 dias para alunos FREE | ~3h | Médio | ✅ 2026-06-18 |
| 1 | DB seed + FeatureKey types + `useEffectivePlanKey` | ~1h | Baixo | ✅ 2026-06-18 |
| 2 | `checkin.full` gate | ~2h | Baixo | ✅ 2026-06-18 |
| 3 | `workout.*` gates + teaser desempenho | ~4h | Médio | ✅ 2026-06-18 |
| 4 | `trainer_plan.days_per_week` gate | ~3h | Médio | ✅ 2026-06-18 |
| 5 | `progress.fitness_advanced` / `progress.performance` | ~2h | Baixo | ✅ 2026-06-18 |
| 6 | PlansScreen — valor visível + badges "Em breve" | ~3h | Baixo | ✅ 2026-06-18 |
| 7 | i18n — mensagens de upgrade consolidadas | ~2h | Baixo | ✅ 2026-06-18 |
| 8 | Validação final + docs | ~2h | Baixo | ✅ 2026-06-18 |
| 9 | Categorização fitness/performance — IA ad-hoc + cache DB | ~8h | Baixo | ✅ 2026-06-21 |
| **Total** | | **~32h** | | |

> **Nota:** Estimativa revista de 30h → 32h. Fase 9 redesenhada: classificação ad-hoc pela IA com memoização no DB (6 sub-fases: schema → types → endpoint → hook → editor → filtro).

**Decisão de produto — exercícios ad-hoc:** efémeros, nunca entram na biblioteca. `exercise_category = NULL`; exibidos sem filtro. Não requerem classificação. Confiança na expertise do profissional.

**Decisão de produto — classificação IA:** sugestão persistida no DB como cache. Não é fonte de verdade imutável — corrigível manualmente. Modelo: Haiku (rápido, barato). Batch máximo: 50 exercícios por chamada.

**Ordem recomendada:** 0A → 0B → 0C → 1 → 5 → 2 → 3 → 4 → 6 → 7 → 8 → 9
