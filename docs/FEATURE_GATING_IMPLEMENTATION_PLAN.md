# Plano de Implementação — Feature Gating por Plano de Aluno
**Versão:** 1.0  
**Data:** 2026-06-17  
**Referência:** `docs/FEATURE_ACCESS_MATRIX.md`  
**Estimativa total:** ~16h

---

## Premissas

- Zero hardcoded plan checks — todo gating via `feature_permissions` table
- Modelo aditivo: FREE → AI FITNESS → AI PERFORMANCE (cada tier herda o anterior)
- Hook `useFeatureAccess` / `useFeatureAccessMap` reutilizado sem alteração de contrato
- Override de treinador (`isTrainerOverride`) preservado em todos os pontos
- Cada fase é independente e deployável isoladamente
- TypeScript strict — nenhuma fase fecha sem `tsc --noEmit` limpo

---

## Fase 1 — Fundação: DB + Types
**Esforço:** ~1h  
**Risco:** Baixo  
**Dependências:** Nenhuma

### Objectivo
Criar as 7 novas feature keys na base de dados e no type system. Nenhuma lógica de UI tocada ainda.

### Checklist

- [ ] Criar `supabase/sql-archive/supabase-feature-permissions-client-v2-20260617.sql`
  - [ ] Inserir `workout.sessions_per_week` (free=1, ai_fitness=7, ai_performance=null)
  - [ ] Inserir `workout.exercises_per_session` (free=2, ai_fitness=null, ai_performance=null)
  - [ ] Inserir `workout.exercise_type` — requer coluna `text_value TEXT` na tabela (ver nota abaixo)
  - [ ] Inserir `checkin.full` (free=false, ai_fitness=true, ai_performance=true)
  - [ ] Inserir `trainer_plan.days_per_week` (free=1, ai_fitness=3, ai_performance=null)
  - [ ] Inserir `progress.fitness_advanced` (free=false, ai_fitness=true, ai_performance=true)
  - [ ] Inserir `progress.performance` (free=false, ai_fitness=false, ai_performance=true)
- [ ] Aplicar migration via `apply_migration` (Supabase MCP)
- [ ] Adicionar coluna `text_value TEXT` à tabela `feature_permissions` (para `workout.exercise_type`)
- [ ] Atualizar `src/types/feature-permissions.ts`
  - [ ] Adicionar ao union `FeatureKey`:
    - `'workout.sessions_per_week'`
    - `'workout.exercises_per_session'`
    - `'workout.exercise_type'`
    - `'checkin.full'`
    - `'trainer_plan.days_per_week'`
    - `'progress.fitness_advanced'`
    - `'progress.performance'`
- [ ] Atualizar `src/hooks/useFeatureAccess.ts`
  - [ ] Incluir `text_value` no select do `fetchPermissions`
  - [ ] Expor `textValue: string | null` no retorno do hook
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(permissions): add client plan feature keys v2`

> **Nota `workout.exercise_type`:** `limit_value` é INTEGER — não comporta `'fitness'|'all'`. A coluna `text_value` resolve sem quebrar o schema existente. Alternativa: encodificar como 0=fitness, 1=all (evita alteração de schema); decidir antes de implementar.

---

## Fase 2 — Check-in: `checkin.full`
**Esforço:** ~2h  
**Risco:** Baixo  
**Dependências:** Fase 1

### Objectivo
Condicionar o formulário de Check-in Completo ao plano do utilizador. Utilizadores FREE vêem apenas Check-in Rápido; AI FITNESS e AI PERFORMANCE têm acesso ao Completo.

### Checklist

- [ ] Localizar `AICheckinScreen.tsx` (ou equivalente de check-in)
  - [ ] Identificar onde o modo rápido vs. completo é seleccionado
- [ ] Adicionar `useFeatureAccess(user.plan_key, 'checkin.full')` ao componente
- [ ] Condicionar renderização:
  - [ ] Se `!checkinFullAllowed`: mostrar apenas Check-in Rápido
  - [ ] Se `!checkinFullAllowed`: mostrar badge/teaser de upgrade abaixo do formulário
- [ ] Adicionar i18n keys (en/pt/es/de):
  - [ ] `checkin.lockedFull` — "Check-in Completo disponível a partir do plano AI Fitness"
  - [ ] `checkin.lockedFullCta` — "Actualizar plano"
- [ ] Testar: login FREE → check-in → confirmar apenas Rápido visível
- [ ] Testar: login AI FITNESS → check-in → confirmar Completo acessível
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(checkin): gate full check-in to ai_fitness+ plans`

---

## Fase 3 — Workout IA: sessões, exercícios e tipo
**Esforço:** ~4h  
**Risco:** Médio  
**Dependências:** Fase 1

### Objectivo
A IA respeita os limites do plano ao gerar o plano de treino: máximo de sessões semanais, máximo de exercícios por sessão, e tipo de exercícios (fitness vs. desempenho).

### Checklist

- [ ] `StartWorkoutScreen.tsx` — leitura dos novos gates
  - [ ] Adicionar ao `useFeatureAccessMap`: `'workout.sessions_per_week'`, `'workout.exercises_per_session'`, `'workout.exercise_type'`
  - [ ] Extrair: `sessionsPerWeek = accessMap['workout.sessions_per_week']?.limitValue ?? null`
  - [ ] Extrair: `exercisesPerSession = accessMap['workout.exercises_per_session']?.limitValue ?? null`
  - [ ] Extrair: `exerciseType = accessMap['workout.exercise_type']?.textValue ?? 'all'`
- [ ] Implementar contagem de sessões semanais
  - [ ] Query `workout_sessions` WHERE `user_id = X AND started_at >= start_of_week`
  - [ ] Se `sessionsPerWeek !== null && weekCount >= sessionsPerWeek`: bloquear geração
  - [ ] Mostrar mensagem de limite semanal + CTA upgrade
- [ ] Passar limites ao gerador de treino IA
  - [ ] `maxExercises: exercisesPerSession` → incluir no prompt / parâmetros da API
  - [ ] `exerciseType: exerciseType` → filtrar exercícios de desempenho no prompt se `'fitness'`
- [ ] Mensagem de upgrade (FREE) deve indicar:
  - [ ] "1 sessão / semana no plano Free"
  - [ ] "Máximo 2 exercícios por sessão"
  - [ ] "Apenas exercícios de Fitness"
- [ ] Adicionar i18n keys (en/pt/es/de):
  - [ ] `workout.limitWeekly` — "Atingiu o limite de {{n}} sessão/semana do seu plano"
  - [ ] `workout.limitExercises` — "O seu plano inclui até {{n}} exercícios por sessão"
  - [ ] `workout.limitType` — "Exercícios de Desempenho disponíveis no plano AI Performance"
  - [ ] `workout.limitCta` — "Actualizar para mais"
- [ ] Testar FREE: gera 1 sessão com 2 exercícios fitness; bloqueia 2ª sessão na semana
- [ ] Testar AI FITNESS: gera até 7 sessões, sem limite de exercícios, apenas fitness
- [ ] Testar AI PERFORMANCE: sem restrições
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(workout): apply plan gates to AI session generation`

---

## Fase 4 — Plano do Treinador: dias activos por semana
**Esforço:** ~3h  
**Risco:** Médio  
**Dependências:** Fase 1

### Objectivo
Limitar os dias do plano do treinador que o aluno pode executar conforme o seu plano. FREE=1 dia, AI FITNESS=3 dias, AI PERFORMANCE=todos.

### Checklist

- [ ] Identificar onde os dias do plano do treinador são renderizados para execução
  - [ ] `WorkoutModeScreen.tsx` ou equivalente de seleção de dia
- [ ] Adicionar `useFeatureAccess(user.plan_key, 'trainer_plan.days_per_week')` ao componente
- [ ] Lógica de dias activos:
  - [ ] Obter lista de dias do plano do treinador
  - [ ] Se `limitValue !== null`: activar apenas os primeiros N dias da lista
  - [ ] Dias excedentes: renderizar como bloqueados (ícone cadeado)
- [ ] Ao tentar executar dia bloqueado:
  - [ ] Mostrar modal/banner: "O seu plano Free permite 1 dia de treino com o seu treinador"
  - [ ] CTA: "Actualizar para AI Fitness — 3 dias/semana"
- [ ] Garantir que o tipo de exercícios do treinador também é filtrado (`workout.exercise_type`)
  - [ ] AI FITNESS: ignorar exercícios de desempenho no plano do treinador
  - [ ] Mostrar nota ao aluno: "Exercícios de Desempenho não incluídos no seu plano"
- [ ] Adicionar i18n keys (en/pt/es/de):
  - [ ] `trainerPlan.dayLocked` — "Dia bloqueado pelo seu plano"
  - [ ] `trainerPlan.dayLockedNote` — "O seu plano {{plan}} permite {{n}} dia(s)/semana com o seu treinador"
  - [ ] `trainerPlan.exerciseTypeLocked` — "Exercício de Desempenho requer plano AI Performance"
- [ ] Testar FREE: 1 dia activo, restantes bloqueados com CTA
- [ ] Testar AI FITNESS: 3 dias activos, exercícios desempenho filtrados
- [ ] Testar AI PERFORMANCE: todos os dias, todos os exercícios
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(trainer-plan): gate active days and exercise type by client plan`

---

## Fase 5 — Progresso: métricas fitness avançadas e desempenho
**Esforço:** ~2h  
**Risco:** Baixo  
**Dependências:** Fase 1

### Objectivo
Substituir o gate único `scores.advanced` por dois gates independentes: `progress.fitness_advanced` e `progress.performance`. AI FITNESS desbloqueia fitness; só AI PERFORMANCE desbloqueia desempenho.

### Checklist

- [ ] `PerformanceDashboardScreen.tsx`
  - [ ] Substituir `['scores.basic', 'scores.advanced']` por `['scores.basic', 'scores.advanced', 'progress.fitness_advanced', 'progress.performance']`
  - [ ] Extrair: `fitnessAdvancedAllowed = accessMap['progress.fitness_advanced']?.allowed ?? false`
  - [ ] Extrair: `performanceAllowed = accessMap['progress.performance']?.allowed ?? false`
  - [ ] Rever `ADVANCED_SCORE_CODES`:
    - Scores fitness avançados (fatigueRisk, recoveryInstability, progressionReadiness, responseCompatibility, plateauRisk) → gate por `fitnessAdvancedAllowed`
    - Scores de desempenho (acuteLoad, trainingForm, trainingStrain) → gate por `performanceAllowed`
  - [ ] `locked = (!fitnessAdvancedAllowed && FITNESS_ADVANCED_CODES.has(s.code)) || (!performanceAllowed && PERFORMANCE_CODES.has(s.code))`
- [ ] Atualizar `PerformanceDashboardScreen.test.tsx`
  - [ ] Adicionar cenário: AI FITNESS → fitness avançados visíveis, desempenho bloqueados
  - [ ] Adicionar cenário: FREE → ambos bloqueados
- [ ] `tsc --noEmit` limpo
- [ ] `npx vitest run` limpo (apenas falhas pré-existentes em PlansScreen)
- [ ] Commit: `feat(progress): split fitness-advanced and performance score gates`

---

## Fase 6 — Mensagens de Upgrade (i18n)
**Esforço:** ~2h  
**Risco:** Baixo  
**Dependências:** Fases 2, 3, 4, 5

### Objectivo
Consolidar e rever todas as mensagens de upgrade para serem informativas, específicas por limitação e com CTA claro.

### Checklist

- [ ] Auditar todas as keys i18n adicionadas nas fases 2–5
- [ ] Garantir presença em `en.json`, `pt.json`, `es.json`, `de.json`
- [ ] Rever mensagens FREE para citar as 3 limitações juntas quando relevante:
  - [ ] "O plano Free inclui 1 sessão/semana · 2 exercícios por sessão · apenas Fitness"
- [ ] Rever CTAs: texto consistente "Actualizar plano" / "Ver planos" em todos os pontos
- [ ] Verificar que `PlansScreen` mostra comparativo das limitações ao navegar via CTA
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(i18n): consolidate plan upgrade messaging`

---

## Fase 7 — Validação Final e Deploy
**Esforço:** ~2h  
**Risco:** Baixo  
**Dependências:** Todas as fases anteriores

### Checklist

- [ ] `tsc --noEmit` limpo em todo o projecto
- [ ] `npx vitest run` — zero regressões (apenas falhas pré-existentes em PlansScreen permitidas)
- [ ] Teste de ponta a ponta com `ana.lima@client.test` (FREE, sem treinador):
  - [ ] Login OK
  - [ ] Check-in → apenas Rápido visível
  - [ ] Workout IA → 1 sessão, 2 exercícios fitness
  - [ ] Tentativa de 2ª sessão na semana → mensagem de limite + CTA
  - [ ] Progresso → métricas básicas visíveis, restantes bloqueadas
- [ ] Teste com `beatriz.nunes@client.test` (FREE, com treinador):
  - [ ] Plano do treinador → 1 dia activo, restantes bloqueados
  - [ ] Dia bloqueado → CTA upgrade visível
- [ ] Teste com conta AI FITNESS (criar seed se necessário):
  - [ ] 7 sessões semanais IA, fitness apenas
  - [ ] 3 dias do plano do treinador activos
  - [ ] Progresso fitness avançado visível, desempenho bloqueado
- [ ] Verificar `feature_permissions` na DB — todos os rows corretos
- [ ] Commit final + push
- [ ] Actualizar `docs/FEATURE_ACCESS_MATRIX.md` — marcar feature keys como "implementadas"

---

## Resumo Executivo

| Fase | Área | Esforço | Risco |
|---|---|---|---|
| 1 | DB seed + FeatureKey types | ~1h | Baixo |
| 2 | `checkin.full` gate | ~2h | Baixo |
| 3 | `workout.*` gates (IA + limites) | ~4h | Médio |
| 4 | `trainer_plan.days_per_week` gate | ~3h | Médio |
| 5 | `progress.fitness_advanced` / `progress.performance` | ~2h | Baixo |
| 6 | i18n — mensagens de upgrade | ~2h | Baixo |
| 7 | Validação final + deploy | ~2h | Baixo |
| **Total** | | **~16h** | |

**Ordem recomendada de execução:** 1 → 5 → 2 → 3 → 4 → 6 → 7  
(Fase 5 antes das 2/3/4 porque tem menor risco e valida o padrão de dois gates independentes antes de aplicá-lo nas áreas de maior impacto.)
