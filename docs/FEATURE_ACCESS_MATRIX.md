# Feature Access Matrix — TrAIner App
**Versão:** 1.7
**Data:** 2026-08-11
**Estado:** Matriz de referência de acesso; Uso Justo publicado nos [Termos](https://trainer-lake.vercel.app/legal/terms) e na [Política](https://trainer-lake.vercel.app/legal/fair-use)

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

**Auditoria de alinhamento 2026-08-07:** esta secção foi reconciliada com a configuração efectiva em produção e com a autoridade server-side (`api/_lib/entitlements.ts`). AI FITNESS tem sessões autónomas ilimitadas (`limit_value = null`); `workout.exercise_type` e `trainer_plan.days_per_week` são chaves legadas, não lidas. Portanto, categoria de exercício e dias de plano prescrito não são gates comerciais por licença. A diferença entre AI FITNESS e AI PERFORMANCE é o acesso à análise avançada e às métricas de desempenho — não um modelo de IA ou uma categoria de treino exclusiva.

**Revisão 2026-08-11:** ao atingir a sessão autónoma semanal do FREE, a interface apresenta a limitação confirmada e o CTA contextual para AI FITNESS. O retorno autoritativo `sessions_per_week_limit_reached` não pode acionar o fallback local; assim, a comunicação e o backend mantêm a mesma regra. Não houve mudança de preço, entitlement, patrocínio, Termos ou Política de Uso Justo.

**Revisão de comunicação 2026-08-11:** os dois cards de upgrade do FREE distinguem o benefício de AI FITNESS (check-in diário aplicado à adaptação do treino) do limite semanal atingido. A revisão apenas torna a proposta compreensível em PT/EN/ES/DE; não altera preço, entitlement, patrocínio, Termos ou Política de Uso Justo. Os CTAs partilham fundo primário, texto branco e borda arredondada.

**Revisão visual 2026-08-11:** a identidade visual do CLIENT acompanha a licença comercial: FREE preserva ciano, AI FITNESS usa verde e AI PERFORMANCE usa lilás; o navy estrutural e a identidade coral do TRAINER permanecem inalterados. A mudança não altera preço, entitlement, limites, patrocínio, Termos ou Política de Uso Justo; apenas torna o nível actual e as opções de upgrade visualmente distinguíveis.

| Funcionalidade | Descrição | FREE | AI FITNESS | AI PERFORMANCE |
|---|---|:---:|:---:|:---:|
| **Geração de treino por IA** | Se a IA cria o treino de todo — o gate mais fundamental do fluxo; existe em produção (`ai.workout_generation`, `true` nos 6 planos) mas nunca tinha sido documentado aqui até 2026-08-04 (Fase 3, `docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md`) | ✅ | ✅ | ✅ |
| **Sessões / semana (IA)** | Quantas sessões de treino a IA gera automaticamente por semana | 1 | Ilimitado | Ilimitado |
| **Exercícios por sessão (IA)** | Nº máximo de exercícios que a IA inclui em cada sessão gerada | 6 | Sem limite (tempo disponível) | Sem limite |
| **Categoria do treino gerado** | A categoria apropriada é definida por objectivo, perfil e regras de segurança; não é diferenciador comercial de licença | Sem gate comercial | Sem gate comercial | Sem gate comercial |
| **Plano do treinador — dias activos** | Um plano prescrito por TRAINER vinculado é executado integralmente; a licença do aluno não filtra dias | Todos os dias | Todos os dias | Todos os dias |
| **Plano do treinador — tipo exercícios** | O plano prescrito chega integralmente; aplicam-se apenas regras de segurança e adequação ao aluno, não um filtro de plano | Sem gate comercial | Sem gate comercial | Sem gate comercial |
| **Check-in Rápido** | Registo de prontidão por toque único, sem perguntas detalhadas | ✅ | ✅ | ✅ |
| **Check-in Completo** | Captura manual detalhada; voz e interpretação são direitos separados da licença do aluno | ✅ manual se houver TRAINER activo; voz/interpretação/ajuste ❌ | ✅ | ✅ |
| **Progresso — métricas básicas** | Treinos concluídos, sequência e indicadores essenciais no ecrã de Progresso | ✅ | ✅ | ✅ |
| **Progresso — métricas fitness avançadas** | Evolução física detalhada (força, volume, tendências) | ❌ bloqueado | ✅ | ✅ |
| **Progresso — métricas de desempenho** | Métricas atléticas (ATL/CTL/TSB — carga aguda/crónica e forma) | ❌ bloqueado | ❌ bloqueado | ✅ |
| **AI Score — básico** (4 scores) | Pontuações de IA sobre prontidão/risco, versão reduzida | ✅ | ✅ | ✅ |
| **AI Score — avançado** (8 scores) | Versão completa das pontuações de IA, maior granularidade | ❌ bloqueado | ❌ bloqueado | ✅ |
| **AI Checkin Adjustment** | Ajusta o treino do dia consoante energia, dor e sono reportados no check-in | ❌ | ✅ | ✅ |
| **AI Advanced Analysis** | Análise preditiva aprofundada de carga e recuperação sobre o histórico do aluno | ❌ | ❌ | ✅ |
| **Convite de treinador** | Permite ao aluno vincular-se a um treinador e receber o respectivo plano | ✅ (limitado ao plano) | ✅ (limitado ao plano) | ✅ |
| **CTA de upgrade** | Botão/mensagem de actualização mostrado ao aluno ao atingir um limite do plano | ✅ ao exceder 1 sessão/semana ou 6 exercícios/sessão | — | — |

**Uso ilimitado de IA:** AI FITNESS e AI PERFORMANCE oferecem uso ilimitado para utilização pessoal normal, sujeito à [Política de Uso Justo](https://trainer-lake.vercel.app/legal/fair-use) e aos [Termos de Uso](https://trainer-lake.vercel.app/legal/terms). Isto não cria contador comercial visível nem divulga controles operacionais internos.

### 2.2 Regras de Negócio — FREE

1. **Sessão única semanal:** A IA gera no máximo 1 sessão com 6 exercícios por semana. A escolha de exercícios segue objectivo, perfil e segurança, sem filtro comercial de categoria.
2. **Plano do treinador:** Se vinculado a um treinador, executa integralmente o plano prescrito. A licença FREE não reduz dias nem filtra categorias do plano.
3. **Check-in:** Check-in Rápido disponível. Quando houver TRAINER activo, o vínculo patrocina a **captura manual detalhada**; não patrocina voz, interpretação nem ajuste por IA.
4. **Progresso:** Todas as abas visíveis, mas métricas fitness avançadas e de desempenho bloqueadas.
5. **Mensagem de upgrade** deve informar: número de treinos/semana e quantidade de exercícios por sessão; não deve prometer desbloqueio de categoria de treino.

### 2.3 Regras de Negócio — AI FITNESS

1. **Sessões ilimitadas:** Sem restrição comercial de sessões ou de exercícios por sessão; a IA respeita o tempo disponível e o Uso Justo aplicável.
2. **Categoria adequada ao contexto:** Não há filtro comercial "fitness apenas". A escolha respeita objectivo, perfil e regras de segurança.
3. **Plano do treinador:** Executado integralmente, sem redução de dias ou filtragem comercial de exercícios pelo plano do aluno.
4. **Check-in:** Rápido e Completo disponíveis.
5. **Progresso:** Métricas fitness avançadas desbloqueadas; métricas de desempenho permanecem bloqueadas.

### 2.4 Regras de Negócio — AI PERFORMANCE

1. **Sessões ilimitadas:** Sujeitas ao Uso Justo. A categoria não é diferenciador comercial; continua condicionada à adequação e segurança.
2. **Plano do treinador:** Executado integralmente, como nos demais planos de aluno vinculados.
3. **Check-in:** Rápido e Completo.
4. **Progresso:** Todas as métricas desbloqueadas, incluindo ATL/CTL/TSB e demais scores de desempenho.

---

## 3. Planos de Treinador (Trainer)

### 3.1 Matriz de Acesso

**Correção 2026-08-04:** Studio Branding e Marketplace estavam documentados como "✅" para PRO/ELITE, mas nunca tiveram UI implementada — permanecem com badge "Em breve" em `PlansScreen.tsx` (confirmado por captura de ecrã da produção). Consistente com §4, que já documentava `studio.branding`/`marketplace.*` como "UI pendente".

**Correção 2026-08-05 (Fase 6):** PRO deixou de ser um degrau único (50 clientes) — passou a 3 faixas seleccionáveis (PRO 5/15/30), com preço próprio cada, renderizadas num único card com selector na UI (`PlansScreen.tsx`). ELITE inalterado.

**Correção 2026-08-05 (pós-Fase 6):** o `pro` legado, usado como entitlement efectivo durante a janela de 21 dias do TRIAL, foi alinhado a **30 clientes**. Assim, o TRIAL não excede a maior faixa PRO comercial; ELITE continua o único nível ilimitado.

**Auditoria documental 2026-08-06:** os manuais TRAINER en/pt/es foram alinhados à capacidade PRO 5/15/30. A expressão comercial “ilimitado sujeito à Política de Uso Justo” está publicada nos [Termos](https://trainer-lake.vercel.app/legal/terms) e na [Política de Uso Justo](https://trainer-lake.vercel.app/legal/fair-use); não expõe thresholds internos.

| Funcionalidade | Descrição | TRIAL | PRO (5 / 15 / 30) | ELITE |
|---|---|:---:|:---:|:---:|
| **Clientes activos (limite)** | Nº máximo de alunos que o treinador pode gerir em simultâneo na conta | 3 | 5 / 15 / 30 (à escolha) | Ilimitado |
| **Coach DNA** | Motor que codifica a metodologia própria do treinador (estrutura de blocos, princípios) para a IA gerar planos alinhados ao seu método | ❌ | ✅ | ✅ |
| **Studio Branding** | Marca própria (logo/cores) no espaço/app voltado ao aluno | ❌ | 🔜 (UI pendente) | 🔜 (UI pendente) |
| **Marketplace — listagem** | Perfil do treinador visível no marketplace do TrAIner para novos alunos o encontrarem | ❌ | ❌ | 🔜 (UI pendente) |
| **Marketplace — revenue share** | Participação de 15% na receita de alunos captados via marketplace | ❌ | ❌ | 🔜 (UI pendente) |
| **AI Score — básico** (4 scores) | Pontuações de IA sobre prontidão/risco de cada aluno, versão reduzida, na perspectiva do dashboard do treinador | ✅ | ✅ | ✅ |
| **AI Score — avançado** (8 scores) | Versão completa das pontuações de IA por aluno, no dashboard do treinador | ❌ | ✅ | ✅ |
| **AI Checkin Adjustment** | O motor de IA do treinador ajusta os planos gerados consoante o check-in dos alunos | ❌ | ✅ | ✅ |
| **AI Advanced Analysis** | Análises preditivas avançadas sobre os alunos geridos pelo treinador | ❌ | ✅ | ✅ |
| **Vista do dashboard do cliente** | Ao abrir o dashboard de um aluno, o treinador vê sempre todos os dados — o gating é do plano do aluno, não do seu próprio | ✅ (override completo) | ✅ (override completo) | ✅ (override completo) |

> **Escopo da matriz TRAINER:** as capacidades acima descrevem o que a conta TRAINER pode utilizar no seu próprio contexto. Elas não são automaticamente transferidas para o aluno vinculado.

#### Direitos patrocinados ao aluno vinculado

Um vínculo activo com TRAINER patrocina apenas capacidades determinísticas, sem custo de inferência. A licença do TRAINER não patrocina voz nem recursos de IA ao aluno FREE.

| Recurso para aluno FREE vinculado | Disponível | Descrição |
|---|:---:|---|
| Check-in manual detalhado | ✅ | Captura estruturada completa, além do check-in rápido. |
| Dados operacionais para o TRAINER | ✅ | Dados brutos e operacionais de aderência, frequência, carga e volume. |
| Check-in por voz | ❌ | Requer `checkin.voice_input` da licença do próprio aluno. |
| Interpretação de check-in por IA | ❌ | Requer `ai.checkin_interpretation` da licença do próprio aluno. |
| Ajuste de plano por IA | ❌ | Requer `ai.checkin_adjustment` da licença do próprio aluno. |

> **Nota override:** Um treinador que acede ao dashboard de um cliente vê sempre todos os scores e métricas, independentemente do seu próprio plano. O gating é aplicado pelo plano do **cliente**, não do treinador. Implementado via `isTrainerOverride = !!selectedClient` em `PerformanceDashboardScreen.tsx`.

### 3.2 Enforcement — Limite de Clientes

O limite `clients.limit` é validado em dois pontos:
- **Frontend:** `TrainerDashboardScreen.tsx` bloqueia botão "+ Convidar cliente" quando `activeClients.length >= limitValue`.
- **Backend:** `api/send-invitation.ts` retorna HTTP 403 `client_limit_reached` se o limite for ultrapassado (protecção contra bypass UI).

---

## 4. Feature Keys na Base de Dados

**Última actualização:** 2026-08-04 (Fase 3 de `docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md`) — adicionado `ai.workout_generation` (existia em produção, nunca documentado); semeadas as linhas de `pro`/`elite` que faltavam para `checkin.full`, `progress.fitness_advanced`, `progress.performance`, `workout.*` e `trainer_plan.days_per_week` (87 linhas ao todo agora; verificado sem lacunas por `npm run check:feature-permissions`, que corre contra a tabela real via `src/licensing/completeness.ts`). Anteriormente: 2026-08-03 — valor real de `workout.exercises_per_session`/FREE corrigido (era documentado como 2, a coluna `feature_permissions.limit_value` já estava em 6 desde 2026-06-17; ver `docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md` Fase 6). Fases 0–8 originais concluídas em 2026-06-18.

| feature_key | Tipo | Usado em | **Configurado** | **Aplicado?** |
| --- | --- | --- | --- | --- |
| `ai.workout_generation` | boolean | StartWorkoutScreen (gate mais fundamental — se a IA gera o treino de todo) | ✅ `true` nos 6 planos | ✅ autoridade de servidor (Fase 2, `api/_lib/entitlements.ts`), confirmado com chamada real após a correcção do bug de import ESM (§Fase 2 do plano de licenciamento) |
| `scores.basic` | boolean | PerformanceDashboardScreen | ✅ | ✅ |
| `scores.advanced` | boolean | (legacy — sem leitor na UI; `progress.fitness_advanced`/`progress.performance` substituem) | ✅ (histórico, todos os planos) | — (código morto) |
| `ai.checkin_adjustment` | boolean | StartWorkoutScreen | ✅ | ✅ |
| `ai.advanced_analysis` | boolean | StartWorkoutScreen | ✅ | ✅ |
| `coach_dna` | boolean | CoachDNAScreen | ✅ | ✅ |
| `clients.limit` | integer cap | TrainerDashboardScreen + api/send-invitation.ts | ✅ TRIAL=3, **PRO 5/15/30** (substituiu o degrau único de 50 — Fase 6, 2026-08-05), ELITE=∞ | ✅ (frontend + backend, ver §3) |
| `studio.branding` | boolean | (UI pendente — badge "Em breve" na PlansScreen) | 🔜 | — |
| `marketplace.listing` | boolean | (UI pendente — badge "Em breve" na PlansScreen) | 🔜 | — |
| `marketplace.revenue_share` | boolean | (UI pendente — badge "Em breve" na PlansScreen) | 🔜 | — |
| `checkin.full` | boolean | CheckInProntidaoScreen → CheckInHub (alcançável por aluno e por treinador no próprio uso) | ✅ inclui PRO/ELITE desde 2026-08-04 (corrige auditoria §3.5.1) | ✅ |
| `workout.sessions_per_week` | integer cap | StartWorkoutScreen (geração IA) | ✅ FREE=1, AI Fitness=∞, AI Performance=∞; PRO/ELITE=∞ (key não se aplica à conta do treinador; AI FITNESS alterado para `null` na Fase 5, 2026-08-05) | ✅ servidor (Fase 2 do plano de licenciamento, `api/_lib/entitlements.ts`, confirmado com chamada real) |
| `workout.exercises_per_session` | integer cap | StartWorkoutScreen (geração IA) | ✅ FREE=**6** (não 2 — corrigido 2026-08-03), resto=∞ | ✅ caminho de IA (Fase 2, `cutExerciseCount`, medido 0 violações); ✅ fallback local (Fase 0 do plano de continuidade); ✅ autoridade de servidor (Fase 2 do plano de licenciamento) |
| `workout.exercise_type` | integer encoded | ~~StartWorkoutScreen (geração IA)~~ **legado, não lido** | 🔜 retirado como gate comercial (Fase 5 de `LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md`, 2026-08-05) — categoria de exercício deixa de ser diferenciador de preço; keys/linhas mantidas no catálogo, sem leitor | — `enforceCategoryFilter` é no-op permanente por construção (`fitnessOnly` resolvido a `false` na fonte única, `api/_lib/entitlements.ts`), não por omissão |
| `trainer_plan.days_per_week` | integer cap | ~~StartWorkoutScreen (plano do treinador)~~ **legado, não lido** | 🔜 retirado (Fase 4 de `LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md`, 2026-08-04) — plano prescrito nunca é filtrado pelo tier do próprio aluno; keys/linhas mantidas no catálogo, sem leitor | — RLS de `workout_sessions` continuava sem validar plano na escrita (auditoria §3.3), mas ficou sem função depois da key deixar de ser lida — não por correcção da RLS |
| `progress.fitness_advanced` | boolean | PerformanceDashboardScreen (alcançável por aluno e por treinador no próprio uso) | ✅ inclui PRO/ELITE desde 2026-08-04 (corrige auditoria §3.5.1) | ✅ |
| `progress.performance` | boolean | PerformanceDashboardScreen (alcançável por aluno e por treinador no próprio uso) | ✅ inclui PRO/ELITE desde 2026-08-04 (corrige auditoria §3.5.1) | ✅ |

**Nota:** `useEffectivePlanKey` eleva automaticamente `free → ai_fitness` (welcome window 21 dias) e `trial → pro` (trial window 21 dias) — todos os gates acima respeitam esta elevação. Confirmado ao vivo em 2026-08-04: uma conta FREE dentro da janela de boas-vindas recebe correctamente os limites de `ai_fitness` (ver `docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md` §2.1).

**Guarda anti-regressão:** `npm run check:feature-permissions` (script `scripts/check-feature-permissions-completeness.mjs`, lógica pura testada em `src/licensing/completeness.test.ts`) falha se qualquer combinação feature_key × plan_key aplicável não tiver linha em `feature_permissions` — é o que teria acusado a regressão `trial → pro` antes de chegar a produção.

**Sobre a coluna "Aplicado?":** até 2026-08-03 esta tabela só documentava se um valor estava *configurado* em `feature_permissions`, não se o caminho de geração da IA de fato o *respeitava* — foi exatamente essa lacuna que permitiu `workout.exercises_per_session`/FREE ficar documentado como 2 (nunca aplicado nesse valor, nem antes nem depois da mudança para 6) e `workout.exercise_type` ficar sem validação server-side por meses (`docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_FINDINGS_20260803.md`). "✅" nesta coluna significa validado com medição ao vivo em produção, não presunção de que o código faz o que o nome sugere.

---

## 5. Feature Keys Implementadas (Fases 0–8) — ⚠️ ARQUIVO HISTÓRICO

> **Higiene documental, 2026-08-05 (Fase 7 de `LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md`):** esta secção é a proposta original de 2026-06-17, escrita **antes** da implementação — daí o título "Implementadas" contradizer o corpo do texto ("são necessárias", "seed proposto"). Todas as keys abaixo foram implementadas há muito e o estado real, verificado ao vivo, está em **§4 acima** — é essa a fonte de verdade, não esta secção. Mantida apenas como registo histórico do desenho original; **não editar como se fosse estado actual.** Duas divergências entre o proposto aqui e o implementado, para quem consultar este histórico: `workout.exercise_type` foi implementado como `integer encoded` (`limit_value`), não como `string enum` como proposto aqui; e foi **retirado como gate comercial na Fase 5** (2026-08-05) — deixou de ser diferenciador de preço.

Para implementar as regras dos planos de cliente definidas nesta sessão, são necessárias as seguintes feature keys novas:

| feature_key | Tipo (proposto aqui, 2026-06-17) | Descrição |
|---|---|---|
| `workout.sessions_per_week` | integer cap | Máximo de sessões semanais geradas pela IA (proposta histórica: 1, 7, null=∞; estado actual em §4: 1, ∞, ∞) |
| `workout.exercises_per_session` | integer cap | Máximo de exercícios por sessão IA (2, null=∞) |
| `workout.exercise_type` | string enum *(implementado como `integer encoded` — ver nota acima)* | Tipo permitido: `'fitness'` ou `'all'` |
| `checkin.full` | boolean | Acesso ao Check-in Completo |
| `trainer_plan.days_per_week` | integer cap | Dias do plano do treinador activos por semana (1, 3, null=∞) |
| `progress.fitness_advanced` | boolean | Métricas fitness avançadas no Progresso |
| `progress.performance` | boolean | Métricas de desempenho no Progresso (ATL/CTL/TSB etc.) |

### Seed proposto (clientes) — histórico, valores de 2026-06-17, não o estado actual (ver §4)

```sql
-- workout.sessions_per_week
('workout.sessions_per_week', 'free',           true, 1),
('workout.sessions_per_week', 'ai_fitness',     true, 7), -- histórico; produção actual usa null (∞), ver §4
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
| ~~`StartWorkoutScreen.tsx:465-473`~~ **Corrigido 2026-08-05 (Fase 5.1)** | ~~`gatedStatsCtx` com valores numéricos (50, 20, 10, 70) para scores truncados~~ Substituído por `buildStatsContext(m5)` — dado real, não constante | Era **médio, com impacto funcional real** (não "sem impacto" como avaliado aqui originalmente) — era a razão de a IA nunca reagir à carga que ela própria prescrevia. Ver Fase 5.1 de `LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md` |
| `App.tsx:77,80` | Defaults de preferências UI (sessionHistoryLimit: 50, etc.) | Nenhum — são preferências de UI, não feature gates |

**Conclusão:** Zero hardcoded plan_key checks. Todo o gating é data-driven. Dos 3 pontos acima, o de `StartWorkoutScreen.tsx` já foi corrigido (Fase 5.1); os outros dois seguem isolados e sem impacto.

---

## 8. Princípios de Engenharia Aplicados

1. **Single source of truth:** `feature_permissions` table — código nunca decide o que um plano pode fazer.
2. **Modelo aditivo:** Cada tier herda explicitamente tudo o que o tier inferior tem (sem herança implícita que crie ambiguidade).
3. **Override de treinador:** Treinadores acedem a dados de clientes com override total — o gating é do cliente, não do treinador.
4. **Backend enforcement:** Limites numéricos críticos (clients.limit) são validados no servidor, não apenas na UI.
5. **Cache por sessão:** `permissionCache` evita N+1 queries; invalidado em signout e plan upgrade.
6. **Type safety:** `FeatureKey` union type garante que feature keys inválidas são caught em compile-time.
