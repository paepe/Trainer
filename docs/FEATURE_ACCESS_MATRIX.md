# Feature Access Matrix — TrAIner App
**Versão:** 1.0  
**Data:** 2026-06-17  
**Estado:** Base para revisão de política de preços

---

## 1. Arquitectura de Gating

O sistema usa uma **matriz data-driven centralizada** — nenhum limite está hardcoded no código.

```
feature_permissions (Supabase)
  └── feature_key × plan_key → allowed (bool) + limit_value (int?)
        ↓
  useFeatureAccess / useFeatureAccessMap (React hooks, cache em memória)
        ↓
  UI: locked teasers + upgrade CTAs
  API: enforcement no backend (send-invitation.ts)
```

**Ficheiros-chave:**
| Responsabilidade | Ficheiro |
|---|---|
| Hook principal | `src/hooks/useFeatureAccess.ts` |
| Tipos de features | `src/types/feature-permissions.ts` |
| Seed trainer | `supabase/sql-archive/supabase-feature-permissions-trainer-additive-20260616.sql` |
| Seed client | `supabase/sql-archive/supabase-feature-permissions-client-additive-20260616.sql` |

---

## 2. Planos de Aluno (Client)

### 2.1 Matriz de Acesso

| Funcionalidade | FREE | AI FITNESS | AI PERFORMANCE |
|---|:---:|:---:|:---:|
| **Sessões / semana (IA)** | 1 | 7 | Ilimitado |
| **Exercícios por sessão (IA)** | 2 | Sem limite (tempo disponível) | Sem limite |
| **Tipo de exercícios** | Fitness apenas | Fitness apenas | Fitness + Desempenho |
| **Plano do treinador — dias activos** | 1 dia | 3 dias / semana | Todos os dias |
| **Plano do treinador — tipo exercícios** | Fitness apenas | Fitness apenas | Fitness + Desempenho |
| **Check-in Rápido** | ✅ | ✅ | ✅ |
| **Check-in Completo** | ❌ | ✅ | ✅ |
| **Progresso — métricas básicas** | ✅ | ✅ | ✅ |
| **Progresso — métricas fitness avançadas** | ❌ bloqueado | ✅ | ✅ |
| **Progresso — métricas de desempenho** | ❌ bloqueado | ❌ bloqueado | ✅ |
| **AI Score — básico** (4 scores) | ✅ | ✅ | ✅ |
| **AI Score — avançado** (8 scores) | ❌ bloqueado | ❌ bloqueado | ✅ |
| **AI Checkin Adjustment** | ❌ | ✅ | ✅ |
| **AI Advanced Analysis** | ❌ | ❌ | ✅ |
| **Convite de treinador** | ✅ (limitado ao plano) | ✅ (limitado ao plano) | ✅ |
| **CTA de upgrade** | ✅ ao exceder limite | ✅ ao tentar desempenho | — |

### 2.2 Regras de Negócio — FREE

1. **Sessão única semanal:** A IA gera no máximo 1 sessão com 2 exercícios fitness por semana.
2. **Plano do treinador:** Se vinculado a um treinador, pode receber plano para 1 dos dias disponíveis. Nos dias restantes, ao tentar treinar, aparece mensagem de limitação + botão **Actualizar conta**.
3. **Check-in:** Apenas Check-in Rápido disponível.
4. **Progresso:** Todas as abas visíveis, mas métricas fitness avançadas e de desempenho bloqueadas.
5. **Mensagem de upgrade** deve informar: número de treinos/semana, tipo de exercícios e quantidade de exercícios por sessão.

### 2.3 Regras de Negócio — AI FITNESS

1. **7 sessões semanais:** Sem restrição de exercícios por sessão; a IA respeita o tempo disponível.
2. **Apenas fitness:** A IA nunca inclui exercícios de desempenho, mesmo que o plano do treinador os contenha.
3. **Plano do treinador:** Até 3 dias/semana; somente exercícios fitness.
4. **Check-in:** Rápido e Completo disponíveis.
5. **Progresso:** Métricas fitness avançadas desbloqueadas; métricas de desempenho permanecem bloqueadas.

### 2.4 Regras de Negócio — AI PERFORMANCE

1. **Sem restrição de sessões** ou tipo de exercícios.
2. **Plano do treinador:** Todos os dias disponíveis; fitness e desempenho.
3. **Check-in:** Rápido e Completo.
4. **Progresso:** Todas as métricas desbloqueadas, incluindo ATL/CTL/TSB e demais scores de desempenho.

---

## 3. Planos de Treinador (Trainer)

### 3.1 Matriz de Acesso

| Funcionalidade | TRIAL | PRO | ELITE |
|---|:---:|:---:|:---:|
| **Clientes activos (limite)** | 3 | 50 | Ilimitado |
| **Coach DNA** | ❌ | ✅ | ✅ |
| **Studio Branding** | ❌ | ✅ | ✅ |
| **Marketplace — listagem** | ❌ | ❌ | ✅ |
| **Marketplace — revenue share** | ❌ | ❌ | ✅ |
| **AI Score — básico** (4 scores) | ✅ | ✅ | ✅ |
| **AI Score — avançado** (8 scores) | ❌ | ✅ | ✅ |
| **AI Checkin Adjustment** | ❌ | ✅ | ✅ |
| **AI Advanced Analysis** | ❌ | ✅ | ✅ |
| **Vista do dashboard do cliente** | ✅ (override completo) | ✅ (override completo) | ✅ (override completo) |

> **Nota override:** Um treinador que acede ao dashboard de um cliente vê sempre todos os scores e métricas, independentemente do seu próprio plano. O gating é aplicado pelo plano do **cliente**, não do treinador. Implementado via `isTrainerOverride = !!selectedClient` em `PerformanceDashboardScreen.tsx`.

### 3.2 Enforcement — Limite de Clientes

O limite `clients.limit` é validado em dois pontos:
- **Frontend:** `TrainerDashboardScreen.tsx` bloqueia botão "+ Convidar cliente" quando `activeClients.length >= limitValue`.
- **Backend:** `api/send-invitation.ts` retorna HTTP 403 `client_limit_reached` se o limite for ultrapassado (protecção contra bypass UI).

---

## 4. Feature Keys Existentes na Base de Dados

| feature_key | Tipo | Usado em |
|---|---|---|
| `scores.basic` | boolean | PerformanceDashboardScreen |
| `scores.advanced` | boolean | PerformanceDashboardScreen |
| `ai.checkin_adjustment` | boolean | StartWorkoutScreen |
| `ai.advanced_analysis` | boolean | StartWorkoutScreen |
| `coach_dna` | boolean | CoachDNAScreen |
| `clients.limit` | integer cap | TrainerDashboardScreen + api/send-invitation.ts |
| `studio.branding` | boolean | (reservado — UI pendente) |
| `marketplace.listing` | boolean | (reservado — UI pendente) |
| `marketplace.revenue_share` | boolean | (reservado — UI pendente) |

---

## 5. Feature Keys a Criar (Novas Regras desta Matriz)

Para implementar as regras dos planos de cliente definidas nesta sessão, são necessárias as seguintes feature keys novas:

| feature_key | Tipo | Descrição |
|---|---|---|
| `workout.sessions_per_week` | integer cap | Máximo de sessões semanais geradas pela IA (1, 7, null=∞) |
| `workout.exercises_per_session` | integer cap | Máximo de exercícios por sessão IA (2, null=∞) |
| `workout.exercise_type` | string enum | Tipo permitido: `'fitness'` ou `'all'` |
| `checkin.full` | boolean | Acesso ao Check-in Completo |
| `trainer_plan.days_per_week` | integer cap | Dias do plano do treinador activos por semana (1, 3, null=∞) |
| `progress.fitness_advanced` | boolean | Métricas fitness avançadas no Progresso |
| `progress.performance` | boolean | Métricas de desempenho no Progresso (ATL/CTL/TSB etc.) |

### Seed proposto (clientes)

```sql
-- workout.sessions_per_week
('workout.sessions_per_week', 'free',           true, 1),
('workout.sessions_per_week', 'ai_fitness',     true, 7),
('workout.sessions_per_week', 'ai_performance', true, null),

-- workout.exercises_per_session
('workout.exercises_per_session', 'free',           true, 2),
('workout.exercises_per_session', 'ai_fitness',     true, null),
('workout.exercises_per_session', 'ai_performance', true, null),

-- workout.exercise_type
-- (requer coluna text; extensão do schema)

-- checkin.full
('checkin.full', 'free',           false, null),
('checkin.full', 'ai_fitness',     true,  null),
('checkin.full', 'ai_performance', true,  null),

-- trainer_plan.days_per_week
('trainer_plan.days_per_week', 'free',           true, 1),
('trainer_plan.days_per_week', 'ai_fitness',     true, 3),
('trainer_plan.days_per_week', 'ai_performance', true, null),

-- progress.fitness_advanced
('progress.fitness_advanced', 'free',           false, null),
('progress.fitness_advanced', 'ai_fitness',     true,  null),
('progress.fitness_advanced', 'ai_performance', true,  null),

-- progress.performance
('progress.performance', 'free',           false, null),
('progress.performance', 'ai_fitness',     false, null),
('progress.performance', 'ai_performance', true,  null);
```

---

## 6. Impacto e Esforço de Implementação

### 6.1 Impacto por Área

| Área | Impacto | Notas |
|---|---|---|
| `feature_permissions` (DB) | Baixo | INSERT das novas feature keys; sem alteração de schema para boolean/integer |
| `src/types/feature-permissions.ts` | Baixo | Adicionar novas FeatureKey ao union type |
| `StartWorkoutScreen.tsx` | Médio | Ler `workout.sessions_per_week`, `workout.exercises_per_session`, `workout.exercise_type` e aplicar caps na geração IA |
| `AICheckinScreen.tsx` | Baixo | Ler `checkin.full` e condicionar o formulário completo |
| `PerformanceDashboardScreen.tsx` | Baixo | Substituir `scores.advanced` por `progress.fitness_advanced` e `progress.performance` (dois gates distintos) |
| `WorkoutModeScreen.tsx` / plano do treinador | Médio | Aplicar `trainer_plan.days_per_week` ao renderizar dias activos; mostrar CTA de upgrade quando excedido |
| Mensagens de upgrade (i18n) | Médio | Novas strings em en/pt/es/de descrevendo cada limitação |
| Backend (`api/`) | Baixo | `send-invitation.ts` já valida `clients.limit`; padrão reutilizável |

### 6.2 Estimativa de Esforço

| Fase | Escopo | Esforço |
|---|---|---|
| 1 | DB seed + FeatureKey types | ~1h |
| 2 | `checkin.full` gate (AICheckinScreen) | ~2h |
| 3 | `workout.*` gates (StartWorkoutScreen + AI prompt) | ~4h |
| 4 | `trainer_plan.days_per_week` gate (WorkoutMode + trainer plan display) | ~3h |
| 5 | `progress.fitness_advanced` / `progress.performance` (PerformanceDashboard) | ~2h |
| 6 | Mensagens i18n + upgrade CTAs | ~2h |
| 7 | Testes + validação | ~2h |
| **Total** | | **~16h** |

---

## 7. Código Fixo Identificado (Riscos)

| Localização | Tipo | Risco |
|---|---|---|
| `PerformanceDashboardScreen.tsx:658-668` | `ADVANCED_SCORE_CODES` hardcoded como Set de strings | Baixo — lista de scores, não planos; isolada no componente |
| `StartWorkoutScreen.tsx:465-473` | `gatedStatsCtx` com valores numéricos (50, 20, 10, 70) para scores truncados | Médio — valores arbitrários que substituem scores reais; sem impacto funcional mas difícil de manter |
| `App.tsx:77,80` | Defaults de preferências UI (sessionHistoryLimit: 50, etc.) | Nenhum — são preferências de UI, não feature gates |

**Conclusão:** Zero hardcoded plan_key checks. Todo o gating é data-driven. Os 3 pontos acima são isoláveis e não bloqueiam a implementação da nova matriz.

---

## 8. Princípios de Engenharia Aplicados

1. **Single source of truth:** `feature_permissions` table — código nunca decide o que um plano pode fazer.
2. **Modelo aditivo:** Cada tier herda explicitamente tudo o que o tier inferior tem (sem herança implícita que crie ambiguidade).
3. **Override de treinador:** Treinadores acedem a dados de clientes com override total — o gating é do cliente, não do treinador.
4. **Backend enforcement:** Limites numéricos críticos (clients.limit) são validados no servidor, não apenas na UI.
5. **Cache por sessão:** `permissionCache` evita N+1 queries; invalidado em signout e plan upgrade.
6. **Type safety:** `FeatureKey` union type garante que feature keys inválidas são caught em compile-time.
