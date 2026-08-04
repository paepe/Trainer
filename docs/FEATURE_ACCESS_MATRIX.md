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

**Nota 2026-08-04:** coluna Descrição adicionada; valor de "Exercícios por sessão (IA)" para FREE corrigido de 2 para 6, alinhando com a correcção já feita em §4 (2026-08-03).

| Funcionalidade | Descrição | FREE | AI FITNESS | AI PERFORMANCE |
|---|---|:---:|:---:|:---:|
| **Sessões / semana (IA)** | Quantas sessões de treino a IA gera automaticamente por semana | 1 | 7 | Ilimitado |
| **Exercícios por sessão (IA)** | Nº máximo de exercícios que a IA inclui em cada sessão gerada | 6 | Sem limite (tempo disponível) | Sem limite |
| **Tipo de exercícios** | Se a IA pode prescrever exercícios de Desempenho (velocidade, potência, resistência) além de Fitness | Fitness apenas | Fitness apenas | Fitness + Desempenho |
| **Plano do treinador — dias activos** | Quantos dias/semana do plano criado pelo treinador o aluno consegue efectivamente treinar; nos restantes vê CTA de upgrade | 1 dia | 3 dias / semana | Todos os dias |
| **Plano do treinador — tipo exercícios** | Se os exercícios de Desempenho do plano do treinador chegam ao aluno, ou são filtrados para Fitness apenas | Fitness apenas | Fitness apenas | Fitness + Desempenho |
| **Check-in Rápido** | Registo de prontidão por toque único, sem perguntas detalhadas | ✅ | ✅ | ✅ |
| **Check-in Completo** | Formulário detalhado (voz/texto) que alimenta o AI Checkin Adjustment | ❌ | ✅ | ✅ |
| **Progresso — métricas básicas** | Treinos concluídos, sequência e indicadores essenciais no ecrã de Progresso | ✅ | ✅ | ✅ |
| **Progresso — métricas fitness avançadas** | Evolução física detalhada (força, volume, tendências) | ❌ bloqueado | ✅ | ✅ |
| **Progresso — métricas de desempenho** | Métricas atléticas (ATL/CTL/TSB — carga aguda/crónica e forma) | ❌ bloqueado | ❌ bloqueado | ✅ |
| **AI Score — básico** (4 scores) | Pontuações de IA sobre prontidão/risco, versão reduzida | ✅ | ✅ | ✅ |
| **AI Score — avançado** (8 scores) | Versão completa das pontuações de IA, maior granularidade | ❌ bloqueado | ❌ bloqueado | ✅ |
| **AI Checkin Adjustment** | Ajusta o treino do dia consoante energia, dor e sono reportados no check-in | ❌ | ✅ | ✅ |
| **AI Advanced Analysis** | Análise preditiva aprofundada de carga e recuperação sobre o histórico do aluno | ❌ | ❌ | ✅ |
| **Convite de treinador** | Permite ao aluno vincular-se a um treinador e receber o respectivo plano | ✅ (limitado ao plano) | ✅ (limitado ao plano) | ✅ |
| **CTA de upgrade** | Botão/mensagem de actualização mostrado ao aluno ao atingir um limite do plano | ✅ ao exceder limite | ✅ ao tentar desempenho | — |

### 2.2 Regras de Negócio — FREE

1. **Sessão única semanal:** A IA gera no máximo 1 sessão com 6 exercícios fitness por semana.
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

**Correção 2026-08-04:** Studio Branding e Marketplace estavam documentados como "✅" para PRO/ELITE, mas nunca tiveram UI implementada — permanecem com badge "Em breve" em `PlansScreen.tsx` (confirmado por captura de ecrã da produção). Consistente com §4, que já documentava `studio.branding`/`marketplace.*` como "UI pendente".

| Funcionalidade | Descrição | TRIAL | PRO | ELITE |
|---|---|:---:|:---:|:---:|
| **Clientes activos (limite)** | Nº máximo de alunos que o treinador pode gerir em simultâneo na conta | 3 | 50 | Ilimitado |
| **Coach DNA** | Motor que codifica a metodologia própria do treinador (estrutura de blocos, princípios) para a IA gerar planos alinhados ao seu método | ❌ | ✅ | ✅ |
| **Studio Branding** | Marca própria (logo/cores) no espaço/app voltado ao aluno | ❌ | 🔜 (UI pendente) | 🔜 (UI pendente) |
| **Marketplace — listagem** | Perfil do treinador visível no marketplace do TrAIner para novos alunos o encontrarem | ❌ | ❌ | 🔜 (UI pendente) |
| **Marketplace — revenue share** | Participação de 15% na receita de alunos captados via marketplace | ❌ | ❌ | 🔜 (UI pendente) |
| **AI Score — básico** (4 scores) | Pontuações de IA sobre prontidão/risco de cada aluno, versão reduzida, na perspectiva do dashboard do treinador | ✅ | ✅ | ✅ |
| **AI Score — avançado** (8 scores) | Versão completa das pontuações de IA por aluno, no dashboard do treinador | ❌ | ✅ | ✅ |
| **AI Checkin Adjustment** | O motor de IA do treinador ajusta os planos gerados consoante o check-in dos alunos | ❌ | ✅ | ✅ |
| **AI Advanced Analysis** | Análises preditivas avançadas sobre os alunos geridos pelo treinador | ❌ | ✅ | ✅ |
| **Vista do dashboard do cliente** | Ao abrir o dashboard de um aluno, o treinador vê sempre todos os dados — o gating é do plano do aluno, não do seu próprio | ✅ (override completo) | ✅ (override completo) | ✅ (override completo) |

> **Nota override:** Um treinador que acede ao dashboard de um cliente vê sempre todos os scores e métricas, independentemente do seu próprio plano. O gating é aplicado pelo plano do **cliente**, não do treinador. Implementado via `isTrainerOverride = !!selectedClient` em `PerformanceDashboardScreen.tsx`.

### 3.2 Enforcement — Limite de Clientes

O limite `clients.limit` é validado em dois pontos:
- **Frontend:** `TrainerDashboardScreen.tsx` bloqueia botão "+ Convidar cliente" quando `activeClients.length >= limitValue`.
- **Backend:** `api/send-invitation.ts` retorna HTTP 403 `client_limit_reached` se o limite for ultrapassado (protecção contra bypass UI).

---

## 4. Feature Keys na Base de Dados

**Última actualização:** 2026-08-03 — valor real de `workout.exercises_per_session`/FREE corrigido (era documentado como 2, a coluna `feature_permissions.limit_value` já estava em 6 desde 2026-06-17; ver `docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md` Fase 6). Fases 0–8 originais concluídas em 2026-06-18.

| feature_key | Tipo | Usado em | **Configurado** | **Aplicado?** |
| --- | --- | --- | --- | --- |
| `scores.basic` | boolean | PerformanceDashboardScreen | ✅ | ✅ |
| `scores.advanced` | boolean | PerformanceDashboardScreen | ✅ (legacy; substituído pelos gates granulares abaixo) | ✅ |
| `ai.checkin_adjustment` | boolean | StartWorkoutScreen | ✅ | ✅ |
| `ai.advanced_analysis` | boolean | StartWorkoutScreen | ✅ | ✅ |
| `coach_dna` | boolean | CoachDNAScreen | ✅ | ✅ |
| `clients.limit` | integer cap | TrainerDashboardScreen + api/send-invitation.ts | ✅ TRIAL=3, PRO=50, ELITE=∞ | ✅ (frontend + backend, ver §3) |
| `studio.branding` | boolean | (UI pendente — badge "Em breve" na PlansScreen) | 🔜 | — |
| `marketplace.listing` | boolean | (UI pendente — badge "Em breve" na PlansScreen) | 🔜 | — |
| `marketplace.revenue_share` | boolean | (UI pendente — badge "Em breve" na PlansScreen) | 🔜 | — |
| `checkin.full` | boolean | CheckInProntidaoScreen → CheckInHub | ✅ | ✅ |
| `workout.sessions_per_week` | integer cap | StartWorkoutScreen (geração IA) | ✅ FREE=1, AI Fitness=7, AI Performance=∞ | não auditado por este plano |
| `workout.exercises_per_session` | integer cap | StartWorkoutScreen (geração IA) | ✅ FREE=**6** (não 2 — corrigido 2026-08-03), resto=∞ | ✅ caminho de IA (Fase 2, `cutExerciseCount`, medido 0 violações); ✅ fallback local (Fase 0 do plano de continuidade) |
| `workout.exercise_type` | integer encoded | StartWorkoutScreen (geração IA) | ✅ 0=fitness only, null=all | ✅ caminho de IA (Fase 3, `enforceCategoryFilter`, medido 0/3 vazamentos); ✅ fallback local (Fase 2.5, `category` em vez de `intensity`) |
| `trainer_plan.days_per_week` | integer cap | StartWorkoutScreen (plano do treinador) | ✅ FREE=1, AI Fitness=3, AI Performance=∞ | não auditado por este plano |
| `progress.fitness_advanced` | boolean | PerformanceDashboardScreen | ✅ | ✅ |
| `progress.performance` | boolean | PerformanceDashboardScreen | ✅ | ✅ |

**Nota:** `useEffectivePlanKey` eleva automaticamente `free → ai_fitness` (welcome window 21 dias) e `trial → pro` (trial window 21 dias) — todos os gates acima respeitam esta elevação.

**Sobre a coluna "Aplicado?":** até 2026-08-03 esta tabela só documentava se um valor estava *configurado* em `feature_permissions`, não se o caminho de geração da IA de fato o *respeitava* — foi exatamente essa lacuna que permitiu `workout.exercises_per_session`/FREE ficar documentado como 2 (nunca aplicado nesse valor, nem antes nem depois da mudança para 6) e `workout.exercise_type` ficar sem validação server-side por meses (`docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_FINDINGS_20260803.md`). "✅" nesta coluna significa validado com medição ao vivo em produção, não presunção de que o código faz o que o nome sugere.

---

## 5. Feature Keys Implementadas (Fases 0–8)

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
-- Histórico, não o valor atual: a coluna real em produção está em 6 desde
-- 2026-06-17 (mesmo dia deste seed), sem que este documento fosse atualizado
-- — corrigido em §4 acima em 2026-08-03
-- (docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md Fase 6).
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
