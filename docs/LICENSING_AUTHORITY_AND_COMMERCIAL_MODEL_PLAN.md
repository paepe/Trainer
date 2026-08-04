# Plano — Autoridade de Licenciamento e Modelo Comercial

**Data:** 2026-08-04
**Estado:** Fases 0, 1 e 2 concluídas (sucesso) — os 3 gates de IA têm agora autoridade real no servidor. Fase 3 é a próxima.
**Base:** `docs/BILLING_FEATURE_MODEL_AUDIT_20260804.md` (auditoria técnica) + `ANALISE_COMERCIAL_FEATURE_ACCESS_MATRIX_TRAINER_20260804.md` (visão comercial)
**Governança:** `policies/references/PROFILE.md` · `policies/references/EXECUTIVE_TECHNOLOGY_DIRECTIVE.md`

---

## 0. Diagnóstico de causa raiz — por que andamos em círculos

Cada incidente de licenciamento dos últimos 60 dias (`exercises_per_session` mal configurado, `exercise_type` sem validação, `sessions_per_week` sem autoridade, regressão `trial → pro`) tem **a mesma causa estrutural**, não quatro causas distintas:

> **Não existe uma autoridade única que responda "a que este utilizador tem direito?".** Existem três implementações parciais, e nenhuma delas é normativa.

| Implementação | Onde | O que faz | Estado |
|---|---|---|---|
| A | `src/hooks/useFeatureAccess.ts` | lê `feature_permissions`, aplica elevação de janela, mapeia linha→acesso | Client-side. Não é autoridade (é o próprio cliente). |
| B | `api/send-invitation.ts:125-170` | resolve `plan_key` real do DB, aplica elevação, lê `feature_permissions` | Server-side, **correcto**, mas inline e usado por um único gate. |
| C | `api/generate-smart-workout.ts` | — | Não resolve nada; aceita `body.task` do cliente. |

**A lógica de elevação de janela (`free → ai_fitness`, `trial → pro`) está escrita duas vezes** — `useFeatureAccess.ts:12-22` e `send-invitation.ts:146-151` — em linguagens de acesso a dados diferentes, sem teste que garanta equivalência. Duas implementações da mesma regra de negócio comercial que podem divergir silenciosamente: é exactamente a classe de defeito que esta sessão passou o dia a encontrar.

**O diagnóstico do project lead está correcto e é literal:** *"ou temos funções disponíveis e não as alcançamos por falha de fluxo, ou simplesmente duplicamos código."* Ambas ocorrem, e são o mesmo problema visto de dois ângulos — B existe e funciona, mas C não a alcança; então C não faz nada e A duplica-a mal.

### 0.1 Métrica de duplicação verificada

| Artefacto duplicado | Ocorrências | Verificado em |
|---|---|---|
| `verifyRequestUser` + `authSupabaseUrl`/`authServiceKey`/`authAnonKey` + `interface AuthedUser` | **7 handlers** | `api/{generate-smart-workout,generate-workout,send-invitation,send-notification,create-checkout-session,billing-portal,translate-exercise-content}.ts` |
| `hasActiveLink` (query a `trainer_clients`) | ≥2 handlers | `generate-smart-workout.ts:56`, `send-invitation.ts:83` |
| Lógica de elevação de plano | 2 (client + server) | `useFeatureAccess.ts:12-22`, `send-invitation.ts:146-151` |
| Cap de exercícios / filtro de categoria | 2 superfícies (server + mirror local) | `generate-smart-workout.ts:483,559`, `src/lib/fallbackWorkoutGenerator.ts` |

### 0.2 A justificação da duplicação não resiste a inspecção

Todos os 7 handlers carregam a mesma justificação:

```
api/generate-smart-workout.ts:9-11
// ── Inlined auth helpers (Vercel's Node.js function builder does not trace
// relative imports outside this file into the deployed bundle — confirmed in
// production; every api/* file must be self-contained) ──
```

Facto verificado que contradiz o diagnóstico implícito: **`tsconfig.json` tem `"include": ["src"]` — o directório `api/` está fora do projecto TypeScript.** Não há `api/tsconfig.json`. Portanto os imports relativos em `api/*` nunca tiveram cobertura de type-check nem de resolução configurada. A falha observada em produção é consistente com um defeito de configuração de projecto, **não** com uma limitação do tracer do Vercel (`@vercel/nft` resolve imports relativos por design).

**Não vou afirmar isto como resolvido sem prova de deploy.** É precisamente esse tipo de asserção não verificada que produziu os defeitos desta auditoria. Por isso a Fase 0 é um spike bloqueante: ou provamos que um módulo partilhado sobrevive ao deploy, ou adoptamos codegen com verificação em CI. A decisão de arquitectura de todas as fases seguintes depende do resultado.

---

## 1. Princípios inegociáveis deste plano

Derivados de `EXECUTIVE_TECHNOLOGY_DIRECTIVE.md` e `PROFILE.md` §Quality Directive:

1. **Uma regra, um lugar.** Nenhuma regra de licenciamento pode existir em dois ficheiros. Se cliente e servidor precisam da mesma decisão, partilham o mesmo módulo — ou o mesmo módulo gerado, com verificação automática de equivalência.
2. **O backend é autoridade.** Nenhum limite comercial é considerado aplicado se depende de valor enviado pelo cliente. UI aplica *experiência*; servidor aplica *direito*.
3. **Fail-closed por omissão.** Ausência de configuração nunca concede. O comportamento actual (cap ausente ⇒ ilimitado) inverte-se.
4. **Estabilizar antes de expandir.** Nenhuma mudança comercial (Fases 4-6) entra antes de a autoridade estar fechada (Fases 1-3). Reempacotar preços sobre enforcement quebrado propaga o defeito para o modelo novo.
5. **Reversível e pré-validado.** Cada fase entrega valor isolado, com critério de aceitação medível e caminho de rollback.
6. **Medido, não presumido.** "Aplicado" significa verificado com medição real — nunca "a função existe e o nome sugere que funciona".

---

## 2. Painel de estado

> Actualizar esta tabela na conclusão de cada fase. É o índice de progresso do plano.

| Fase | Escopo | Bloqueia | Estado | Concluída em |
|:---:|---|---|:---:|---|
| 0 | Spike: módulo partilhado em `api/` | 1,2 | ✅ Concluída — sucesso | 2026-08-04 |
| 1 | Núcleo de entitlements (fonte única) | 2,3 | ✅ Concluída — sucesso | 2026-08-04 |
| 2 | Autoridade no servidor (3 gates de IA) | 4 | ✅ Concluída — sucesso | 2026-08-04 |
| 3 | Cobertura de dados + guarda anti-regressão | 4, 6 | ✅ Concluída — sucesso | 2026-08-04 |
| 4 | Direito autónomo × patrocinado (comercial #1 — **decidida**) | 5 | ✅ Concluída — verificação parcial ao vivo (ver §Fase 4) | 2026-08-04 |
| 4.1 | Decomposição de `checkin.full` e métricas — fecha comercial #1 em paralelo à Fase 4 | — | ⬜ Pendente | — |
| 4.2 | Franquia de IA do treinador | — | ⛔ Bloqueada por medição | — |
| 5 | Fitness×Performance por planeamento (comercial #2 — **decidida**) | — | ⬜ Pendente | — |
| 6 | Faixas de clientes e tiers de treinador (comercial #3 — **decidida**) | — | ⬜ Pendente | — |
| 7 | Higiene documental + artefacto executivo | — | ⬜ Pendente | — |

**Legenda:** ⬜ Pendente · 🟡 Em curso · ✅ Concluída · ⛔ Bloqueada

---

## 3. Fases

### Fase 0 — Spike de viabilidade do módulo partilhado ✅ Concluída (2026-08-04)

**Porquê primeiro:** decide se as Fases 1-2 usam import directo ou codegen. Sem esta resposta, qualquer decisão de arquitectura é palpite.

**Esforço:** ~2h · **Risco:** nulo (nada em produção muda)

- [x] Criar `api/_lib/auth.ts` exportando `verifyRequestUser`, `hasActiveLink`, `isTrainerRole`, helpers de env (extraídos verbatim, sem alteração de comportamento)
- [x] Criar `api/tsconfig.json` cobrindo `api/**` com `moduleResolution` adequada a Node
- [x] Migrar **um** handler de baixo risco (`api/billing-portal.ts`) para importar de `_lib/auth`
- [x] Deploy para **preview** (nunca produção)
- [x] Registar resultado neste documento em §5 (Registo de decisões)

**Critério de aceitação — resultado real:**
- ✅ `npx tsc -p api/tsconfig.json --noEmit`: zero erros em `billing-portal.ts` e `_lib/auth.ts` (erros pré-existentes em `generate-workout.ts`/`generate-smart-workout.test.ts`, não tocados, fora de escopo)
- ✅ `vercel deploy` completou com `readyState: "READY"`
- ✅ **Prova directa de bundle** (`vercel build` local, inspecção de `.vercel/output/functions/api/billing-portal.func/`): `api/_lib/auth.js` existe como ficheiro próprio no bundle da função; `api/billing-portal.js` contém `import { verifyRequestUser } from './_lib/auth'` intacto — o relative import foi correctamente rastreado e incluído
- ⚠️ **Não testado:** chamada HTTP autenticada de ponta a ponta contra a preview URL. A preview está atrás de Vercel Deployment Protection (SSO da equipa); contorná-la exigiria criar um bypass token ou alterar definições do projecto — configuração de segurança, fora do que esta sessão altera sem autorização explícita separada. A inspecção directa do bundle (acima) é evidência mais forte do critério "o bundle contém o código de `_lib`" do que uma chamada HTTP teria sido; falta apenas a confirmação de comportamento em runtime servido, não de conteúdo.

**Bifurcação — SUCESSO.** A premissa dos comentários originais ("Vercel's Node.js function builder does not trace relative imports outside this file") está refutada com evidência de bundle real, não presumida. Fases 1-2 usam `api/_lib/*` como módulo partilhado real — **sem codegen**. `api/billing-portal.ts` fica migrado (não revertido); é o primeiro dos 7 handlers da métrica de duplicação (§0.1) já resolvido.

---

### Fase 1 — Núcleo de entitlements: uma regra, um lugar ✅ Concluída (2026-08-04)

**Objectivo:** extrair toda a decisão de licenciamento para um módulo **puro** (sem I/O), consumível por cliente e servidor.

**Esforço:** ~6h · **Depende de:** Fase 0

- [x] Criar `src/licensing/entitlements.ts` — funções puras, zero dependências de ambiente:
  - `resolveEffectivePlanKey(subscription, now)` — **única** implementação da elevação `free→ai_fitness` / `trial→pro`. Reutiliza a matemática de janela já correcta em `useWelcomeWindow`/`useTrialWindow` (que continuam vivos, servindo o estado rico dos banners de contagem); centraliza apenas a decisão de *qual plan_key aplicar*, que antes existia em duas implementações divergentes (cliente vs `send-invitation.ts`)
  - `toEntitlements(rows, planKey)` — mapeia linhas de `feature_permissions` para um objecto tipado e **total** (todas as 17 `FeatureKey` sempre presentes)
  - `DEFAULTS` — política explícita de omissão, fail-closed, com cada valor rastreável ao tier real mais restritivo hoje configurado (documentado inline)
  - `ALL_FEATURE_KEYS` — tipado via `Record<FeatureKey, true>`; o compilador recusa build se a union e a lista divergirem
- [x] Inverter o fail-open dos caps numéricos: linha ausente ⇒ `DEFAULTS[key]` (o mais restritivo real), nunca `null`/ilimitado por omissão
- [x] Refactor `src/hooks/useFeatureAccess.ts` para delegar ao núcleo — `useEffectivePlanKey` e o mapeamento linha→acesso em `useFeatureAccess`/`useFeatureAccessMap` chamam `toEntitlements`; cache (`permissionCache`/`fetchPermissions`) e o comportamento de `override` preservados sem alteração
- [x] Testes unitários — `src/licensing/entitlements.test.ts`, 30 casos: elevação (activa/expirada/ausente/fronteira, os 6 `PlanKey`), matriz contra snapshot real de produção (73 linhas condensadas), fail-closed em omissão, e o teste de regressão explícito abaixo
- [x] Teste de regressão explícito: `trial` elevado a `pro` **não pode perder** nenhuma capacidade face a `trial` bruto — verificado sobre fixture completa (simula o estado pós-Fase-3); documentado também, sem quebrar, que **hoje** essa mesma elevação ainda perde `checkin.full`/`progress.*` contra o snapshot real — lacuna de dado da Fase 3, não deste módulo

**Critério de aceitação — resultado real:**
- ✅ `npx vitest run src/licensing/entitlements.test.ts`: 30/30
- ✅ `npx vitest run` (suite completa): 252/252 testes relevantes passam; as 3 suites que falham (`PlansScreen`, `WorkoutModeScreen`, `PerformanceDashboardScreen`) falham por `supabaseUrl is required` — ausência de `.env` neste worktree, confirmada pré-existente por `git stash` do próprio ficheiro alterado e reexecução (falha idêntica sem a mudança)
- ✅ `npx tsc --noEmit -p tsconfig.json`: zero erros no projecto inteiro
- ✅ Zero lógica de elevação fora de `entitlements.ts` escrita à mão — `useEffectivePlanKey` é agora um wrapper de uma linha

**Nota para a Fase 2:** `toEntitlements`/`resolveEffectivePlanKey` são puros e já testados — o resolvedor server-side dessa fase importa-os directamente (import directo confirmado viável na Fase 0), sem reescrever nem re-testar a lógica.

---

### Fase 2 — Autoridade no servidor ✅ Concluída (2026-08-04)

**Objectivo:** o servidor deixa de honrar limites enviados pelo cliente. Fecha os 3 gates de IA de uma vez, no mesmo ponto — `sessions_per_week`, `exercises_per_session`, `exercise_type`.

**Fora de escopo aqui:** `trainer_plan.days_per_week`. É a mesma classe de lacuna (RLS de `workout_sessions` não valida plano na escrita, auditoria §3.3), mas não é corrigida aqui — é eliminada por perda de uso na Fase 4, que é a sua única aplicação. Ver nota nessa fase.

**Esforço:** ~8h · **Depende de:** Fases 0, 1 · **Fluxo crítico — autorizado explicitamente pelo project lead em 2026-08-04**

- [x] Criar resolvedor de entitlements server-side (`api/_lib/entitlements.ts`): `resolveUserEntitlements(userId)` resolve `plan_key` real via `subscriptions` (com a mesma elevação de janela da Fase 1 — `resolveEffectivePlanKey`, não reimplementada), lê `feature_permissions`, devolve `Entitlements` via `toEntitlements`. Import directo `api/_lib/ → src/licensing/` — território novo além da prova da Fase 0, **verificado separadamente** (ver evidência abaixo)
- [x] `api/generate-smart-workout.ts`: `resolveAuthoritativeTaskGates(entitlements, body.task)` deriva `maxExercises`/`fitnessOnly` do resolvedor, sobrepostos em `ctx.task` — dali em diante o prompt (`buildPrompt`), `requiresPerformanceContent`, o modo-sombra (`enforceExerciseTypePolicy`) e os dois cortes (`cutExerciseCount`, `enforceCategoryFilter`) leem todos `ctx.task`, nunca `body.task`. `isLinkedTrainer` preservado; entitlements sempre resolvidas contra `body.client.id` (o plano do aluno gate o conteúdo, não o do treinador que gera em nome dele)
- [x] Cap `sessions_per_week` aplicado no servidor: `countSessionsThisWeek` + `isSessionsPerWeekCapReached`, verificado **antes** da chamada à IA (evita custo desperdiçado), usando `startOfWeek` — a mesma função agora também usada em `StartWorkoutScreen.tsx` (eliminou mais uma cópia da mesma matemática de data)
- [x] `api/send-invitation.ts` refactorado para consumir `resolveUserEntitlements` — as ~50 linhas de resolução de plano inline substituídas por uma chamada; o ficheiro deixa de ser o único exemplar do padrão correcto
- [x] **Os 7 handlers migrados** para `api/_lib/auth.ts`: `billing-portal` (Fase 0) + `generate-smart-workout`, `send-invitation`, `generate-workout`, `send-notification`, `create-checkout-session`, `translate-exercise-content` (Fase 2). `isTrainerRole`/`hasActiveLink` não migrados onde eram código morto (definidos, nunca chamados) — mesmo critério aplicado em todos
- [x] `body.task` continua aceite (compatibilidade de wire) mas ignorado para gates; `resolveAuthoritativeTaskGates` calcula `divergences` e o handler regista `console.warn` com `client_id`/`caller_id` quando o cliente pede algo diferente do que tem direito
- [x] Instrumentação de custo por chamada — uma linha JSON (`ai_generation_cost`) por geração, com `task_type`, `client_id`, `caller_id`, `origin` (`autonomous_ai`/`client_self`/`linked_trainer` — os sinais já disponíveis nesta fase; a Fase 4 introduz o conceito formal via `workout_plans`), `input_tokens`, `output_tokens`. Pré-requisito da Fase 4.2 já cumprido
- [x] Teste de bypass — `api/_lib/entitlements.test.ts`: um cliente FREE que se auto-declara `maxExercises: 999, fitnessOnly: false` resolve para `6`/`true`, com 2 divergências reportadas; AI PERFORMANCE resolve `undefined` (ilimitado), não o valor pedido; `pro` sem linhas cai nos DEFAULTS fail-closed, não em ilimitado

**Critério de aceitação — resultado real:**
- ✅ Teste de bypass: `api/_lib/entitlements.test.ts`, 6/6 (mecanismo puro, testável sem mockar DeepSeek/Supabase)
- ✅ `npx vitest run`: 258/258 testes relevantes (222 pré-existentes + 30 Fase 1 + 6 Fase 2); mesmas 3 suites com falha de ambiente pré-existente (`.env` ausente no worktree)
- ✅ `npx tsc --noEmit` (projecto inteiro `src/` + `api/tsconfig.json`): zero erros novos — os 6 erros remanescentes em `generate-workout.ts` são pré-existentes, não tocados por esta fase (confirmados por número de linha consistente com o deslocamento da remoção do bloco de auth inline)
- ✅ `verifyRequestUser` existe **uma única vez** no repositório (`api/_lib/auth.ts:30`) — confirmado por grep recursivo, sem excepção de codegen necessária (Fase 0 resolveu por import directo)
- ✅ **Prova de bundle para o import cross-directory novo** (`api/_lib/entitlements.ts` → `../../src/licensing/entitlements.ts`, nunca testado pela Fase 0): `vercel build` local + inspecção de `.vercel/output/functions/api/generate-smart-workout.func/` — `src/licensing/entitlements.js` presente no bundle, `api/_lib/entitlements.js` importa dele correctamente, `resolveAuthoritativeTaskGates`/`isSessionsPerWeekCapReached`/`resolveUserEntitlements` presentes no ficheiro compilado
- ✅ `_lib/auth.js` confirmado presente em **todos os 7** bundles de função (`billing-portal`, `generate-smart-workout`, `send-invitation`, `generate-workout`, `send-notification`, `create-checkout-session`, `translate-exercise-content`)
- ✅ `vercel deploy` (preview, nunca produção) — `readyState: "READY"`, `dpl_HqHb5UQLD3SGM5hMbswwiKFo2PhU`

**Rollback:** feature flag de ambiente que reverte para o comportamento anterior sem redeploy — **não implementado nesta fase**; o `body.task` continua a ser lido e logado, mas a reversão real hoje é `git revert`, não uma flag em runtime. Registado como divergência do plano original, não como pendência oculta.

#### 2.1 A chamada HTTP de ponta a ponta — feita, e encontrou um bug real que a prova de bundle não pegou

A limitação "não testado" acima foi fechada, com o project lead autenticado no navegador (SSO do Vercel, sem eu tocar em configuração de segurança) e credenciais de conta de teste digitadas por ele — nunca por mim.

**A primeira chamada real quebrou.** `POST /api/generate-smart-workout` → `500 FUNCTION_INVOCATION_FAILED`. `vercel logs` revelou a causa:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/api/_lib/auth'
imported from /var/task/api/generate-smart-workout.js
```

**Causa raiz:** este projecto tem `"type": "module"` em `package.json` — Node ESM nativo exige extensão explícita (`.js`) em specifiers de import relativos. `tsc` com `moduleResolution: "bundler"` não acusa isso (assume que um bundler resolve); `tsx` em dev local resolve automaticamente; nenhum dos dois reflecte o `node` puro que a Vercel executa em runtime. **A prova de bundle da Fase 0/2 confirmou que os ficheiros estavam fisicamente presentes e que o `import` os referenciava — nunca confirmou que o resolvedor de módulos do Node aceitaria a referência sem extensão.** Os 7 handlers migrados tinham o mesmo defeito; `billing-portal.ts` (dado como sucesso na Fase 0) nunca tinha sido chamado de verdade.

**Corrigido:** extensão `.js` adicionada a todos os imports relativos em `api/*.ts` e `api/_lib/*.ts` (11 ocorrências, 8 ficheiros), incluindo um segundo defeito da mesma classe (`'../../src/types'` → `'../../src/types/index.js'`: import de directório também não resolve em Node ESM nativo). `tsc`/`vitest` re-verificados (mesmo resultado limpo — o que confirma que essas checagens *nunca teriam detectado isto*). Commit `f24e376`, push, novo deploy automático via integração git.

**Resultado da chamada real, após o fix:** `200 OK`. Verificado ao vivo, com conta de teste FREE (`andre.lima@client.test`):
- `fitnessOnly` correctamente resolvido `true` — todos os exercícios da resposta são `category: "fitness"` ou `"mobility"`, nenhum `"performance"`
- Log de instrumentação (`ai_generation_cost`) disparou com `client_id`/`caller_id` correctos e `input_tokens: 2268` — batendo exactamente com `usage.input_tokens` da resposta
- **Achado não-bug, confirmado contra a BD:** a resposta trouxe 15 exercícios, não 6. Investigado: `andre.lima` foi criado em 2026-08-01, `current_period_end: 2026-08-22` — dentro da janela de boas-vindas de 21 dias. `resolveEffectivePlanKey` eleva `free → ai_fitness` nesse período (mesma função usada no cliente); `ai_fitness` tem `exercise_type=0` (fitness-only, igual ao FREE — por isso bateu) e `exercises_per_session=null` (ilimitado — por isso não cortou). Comportamento correcto, não gap

**O que ainda não foi provado ao vivo:** o corte para 6 exercícios de uma conta FREE **fora** da janela de boas-vindas (nenhuma conta `@client.test` está fora dela hoje) e o bloqueio 403 de `sessions_per_week`. Ambos têm cobertura unitária directa em `api/_lib/entitlements.test.ts` (6/6, incluindo o cenário exacto de bypass com `maxExercises: 999`); forçar o cenário ao vivo exigiria alterar `current_period_end` de uma conta de teste na BD — escrita em produção, ainda que sobre dado de teste, não feita sem perguntar primeiro.

---

### Fase 3 — Cobertura de dados e guarda anti-regressão ✅ Concluída (2026-08-04)

**Objectivo:** eliminar a classe de defeito "linha em falta" — origem da regressão `trial → pro` e do bloqueio do treinador PRO.

**Esforço:** ~4h · **Depende de:** Fase 1

- [x] Semeadas as 14 linhas em falta para `pro`/`elite` (`checkin.full`, `progress.fitness_advanced`, `progress.performance`, `workout.exercises_per_session`, `workout.exercise_type`, `workout.sessions_per_week`, `trainer_plan.days_per_week` × 2 planos) — **primeira escrita de dados desta sessão**, `INSERT ... ON CONFLICT DO NOTHING` com `RETURNING`, confirmado: 73 → 87 linhas. Corrige o bloqueio real de auditoria §3.5.1
- [x] `workout.*`/`trainer_plan.days_per_week` para `pro`/`elite` registados explicitamente como `allowed:true, limit_value:null` — decisão: continuam ilimitados (essas keys não se aplicam à conta do próprio treinador, per investigação da Fase 2), mas agora por linha explícita, não por omissão acidental
- [x] `ai.workout_generation` adicionado à `FEATURE_ACCESS_MATRIX.md` §2.1 e §4
- [x] Teste de completude: `src/licensing/completeness.ts` (`findMissingPermissions`, pura) + `FEATURE_AUDIENCE`, o mapa de aplicabilidade **derivado do código real que lê cada feature_key** (grep de cada `useFeatureAccess`/`useFeatureAccessMap`, não suposição) — `src/licensing/completeness.test.ts`, 6/6, incluindo teste que reproduz a regressão real `trial`/`pro` de `checkin.full`
- [x] "Integrar no CI" — **nota honesta:** este repositório não tem `.github/workflows` nem qualquer pipeline de CI configurado. Criado `scripts/check-feature-permissions-completeness.mjs` + `npm run check:feature-permissions`, que lê `plan_definitions`/`feature_permissions` reais via REST e chama o mesmo verificador testado. É o que existe para chamar automaticamente quando um pipeline real existir — não finjo uma integração que não há

**Critério de aceitação — resultado real:**
- ✅ `npm run check:feature-permissions` contra a base de dados real (`sevenseeds.trainer`): `OK — 6 planos, 87 linhas, nenhuma lacuna`
- ✅ `npx vitest run`: 264/264 relevantes (258 da Fase 0-2 + 6 novos); `tsc --noEmit` limpo
- ✅ Treinador PRO/ELITE já acede Check-in Completo e progresso avançado no próprio uso — dado real confirmado, não só código
- ✅ Nenhuma entitlement aplicável resolvida por omissão — as únicas ausências restantes na tabela são por desenho (audiência não aplicável), verificado pelo mesmo script

---

### Fase 4 — Direito autónomo × direito patrocinado ✅ Concluída (2026-08-04) *(decisão comercial #1 — DECIDIDA)*

**Objectivo:** resolver o conflito central da análise comercial — *o plano do aluno não pode bloquear o programa que um treinador autorizado prescreveu* — separando **dados e execução** (patrocinados) de **automação e inteligência variável** (pagas por quem remunera a chamada de IA).

**Esforço:** ~12h · **Depende de:** Fases 2, 3

#### Decisão comercial vigente (project lead, 2026-08-04)

> O vínculo activo com um treinador concede ao aluno o direito de executar integralmente o programa prescrito, preencher o check-in completo e registar os dados e métricas necessários ao acompanhamento profissional. Esse direito **não** amplia os limites de geração autónoma por IA do plano do aluno. A interpretação do check-in, o ajuste automático do treino, a geração de sessões adicionais e as análises avançadas somente serão executados quando cobertos pelo plano do aluno ou pela franquia de IA do treinador. O servidor deverá distinguir sessões `trainer_prescribed` de sessões `autonomous_ai` antes de aplicar permissões, limites e consumo de IA.

**Princípio:** dados e execução pertencem ao serviço patrocinado; automação e inteligência variável pertencem ao plano que remunera a chamada de IA.

#### O discriminador de origem já existe — não criar novo [V]

Verificado em produção (`workout_plans`, 136 linhas, correlação perfeita, zero ambiguidade):

| `source` | `created_by = assigned_to` | Linhas | Significado |
|---|:---:|---:|---|
| `ai_generated` | ✅ verdadeiro | 76 | autónomo (`autonomous_ai`) |
| `manual` | ❌ falso | 60 | prescrito por treinador (`trainer_prescribed`) |

E **já é usado como autoridade** na RLS: a política `client creates own ai-generated plan` exige `assigned_to = auth.uid() AND created_by = auth.uid() AND source = 'ai_generated'`.

Este é o caso literal de *"temos funções disponíveis e não as alcançamos por falha de fluxo"*: o discriminador existe, está populado, está correcto e é enforçado na camada de dados — mas a camada de licenciamento nunca o lê. **Não haverá coluna nova nem backfill.** O predicado canónico é `created_by <> assigned_to` (semântica de prescrição), com `source` como sinal secundário.

#### Checklist

- [x] `resolveWorkoutOrigin` adicionado a `src/licensing/entitlements.ts` (`created_by <> assigned_to`), testado (2/2) — **correcção ao plano original:** os bullets seguintes (§235-237 da v-anterior) presumiam que `generate-smart-workout.ts` precisava de resolver `origin` para decidir se aplica os caps. Investigação directa mostrou que não: a query que popula `trainerPlans` em `StartWorkoutScreen.tsx` já filtra `.eq('source', 'manual')` — **tudo o que chega a esse array já é, por construção, `trainer_prescribed`**; `generate-smart-workout.ts` nunca gera nem recebe conteúdo prescrito, só autónomo. Não havia nenhum caminho de código onde os caps precisassem de ser condicionalmente ignorados no servidor — precisavam era de **parar de ser aplicados no cliente** a um array que já sabia ser prescrito
- [x] Removida a filtragem de exercícios do plano do treinador pelo tier do aluno (`filteredTrainerPlans`/`filteredCount`, e o fetch de classificação que só existia para as alimentar — `allTrainerExercises`/`useExerciseClassification`)
- [x] Removido o bloqueio por `trainer_plan.days_per_week` (`isPlanLocked`, o modal `trainerPlanLocked`) — a key deixa de ser lida em `StartWorkoutScreen.tsx`; confirmado por grep que não sobrevive nenhuma outra leitura. **Fecha a lacuna de RLS da auditoria §3.3 por eliminação de uso**, como previsto
- [x] i18n: removidas as 4 strings agora inalcançáveis (`client.trainerPlan.dayLocked*`, `exercisesFiltered`) em pt/en/es/de
- [x] Cap autónomo do AI FITNESS removido (`workout.sessions_per_week` → `null` em produção) — decisão #4, D4 — e as 4 strings `limitWeeklyCta` actualizadas para "ilimitado" em vez de "7"
- [~] Teste: cobertura parcial — ver nota de verificação abaixo

**Critério de aceitação:** aluno FREE vinculado executa 100% do programa prescrito; o cap autónomo permanece aplicado e verificado no servidor; nenhuma chamada de IA é disparada automaticamente por execução de programa prescrito.

**Nota de verificação — honesta sobre o que foi e não foi provado ao vivo:**
- ✅ `tsc --noEmit` limpo (zero referências órfãs às variáveis/imports removidos — confirmado por grep antes e depois)
- ✅ `npx vitest run`: 266/266 relevantes (264 + 2 novos para `resolveWorkoutOrigin`)
- ✅ Deploy real (`vercel build` → push → CI do Vercel) `READY`; página carrega sem crash, confirmado ao vivo (`andre.lima@client.test`, FREE)
- ⚠️ **Não foi possível exercer ao vivo o cenário exacto** (plano prescrito com >1 dia, ou com exercício `performance`, sendo executado sem filtro/bloqueio): nenhuma conta `@client.test` tem hoje mais de 1 plano prescrito activo ou exercícios de categoria `performance` num plano prescrito. O único plano prescrito de `andre.lima` mudou de estado **durante os próprios testes desta sessão** — `autoExpirePlans`/auto-heal (lógica pré-existente, não tocada por esta fase) corre a cada abertura do ecrã e cancelou/completou os planos de teste disponíveis. Forçar o cenário exigiria criar novo dado de teste (mais escrita em produção) — não feito sem perguntar primeiro. A mudança é puramente subtractiva (remoção de filtros client-side), risco mais baixo do que a autoridade de servidor da Fase 2, mas a ressalva fica registada, não escondida.

---

#### Fase 4.1 — Decomposição de `checkin.full` e das métricas ⬜

**Depende de:** Fase 1 · **Independente da Fase 4** — não usa o discriminador `origin`, corre em paralelo. Fase 4 fecha a metade de *execução de treino* da decisão #1; esta fase fecha a metade de *dados/check-in*. As duas precisam de estar concluídas para a decisão #1 valer por inteiro.

**Porquê:** `checkin.full` agrega hoje três coisas comercialmente distintas — captura do formulário, custo de transcrição e interpretação por IA. Sob o direito patrocinado, conceder o conjunto inteiro entregaria inferência não remunerada.

**Custo real confirmado [V]:** `api/parse-voice.ts` chama DeepSeek para estruturar o check-in por voz (`CheckInVoice.tsx:57`). Hoje o acesso à voz é governado exclusivamente por `checkin.full` (`CheckInProntidaoScreen.tsx:60-61` → `CheckInHub.tsx:36`). Tornar `checkin.full` patrocinado **sem decompor** abriria transcrição paga a todo aluno vinculado — a decomposição não é refinamento, é pré-requisito.

- [ ] Decompor `checkin.full` em:
  - `checkin.full_capture` — formulário estruturado (**patrocinado**, custo marginal baixo)
  - `checkin.voice_input` — transcrição por voz (**condicional**: franquia do treinador ou plano do aluno)
  - `ai.checkin_interpretation` — leitura narrativa por IA (**condicional**)
  - `ai.checkin_adjustment` — ajuste automático do treino (**condicional**, já existe como key)
- [ ] Decompor as métricas em:
  - `progress.client_raw_data` — dados brutos do aluno (**patrocinado**)
  - `progress.coach_operational` — aderência, frequência, carga, volume, tendências determinísticas (**patrocinado**)
  - `progress.fitness_advanced` · `progress.performance` · `ai.advanced_analysis` (**pagas**, inalteradas)
- [ ] Introduzir o eixo patrocinado: `trainer_sponsored.execution_full`, `trainer_sponsored.checkin_full_capture`, `trainer_sponsored.progress_operational`
- [ ] Migração compatível: `checkin.full` mantém-se a resolver para `full_capture + voice_input` até a UI migrar — **nenhum utilizador perde capacidade durante a transição**
- [ ] Todas as métricas patrocinadas devem ser **determinísticas** (calculadas em SQL/cliente, sem inferência) — critério objectivo de fronteira de custo

**Critério de aceitação:** nenhuma chamada de IA é executada sob entitlement exclusivamente patrocinado; treinador acompanha o aluno com dados completos sem consumir inferência.

---

#### Fase 4.2 — Franquia de IA do treinador ⬜ *(depende de medição)*

**Bloqueada por dado.** Os números só podem ser definidos após medir: custo médio por geração, por interpretação de check-in e por transcrição; frequência de uso; consumo médio por cliente activo; margem pretendida.

- [ ] Instrumentar custo por chamada em `generate-smart-workout`, `parse-voice`, `generate-amplified` (registo por `user_id`, `origin` e tokens)
- [ ] Medir durante ≥2 semanas antes de fixar qualquer franquia
- [ ] Só então modelar: ajustes por cliente activo · pool mensal · franquia de voz · créditos adicionais · fair use
- [ ] Oferecer ao treinador o caminho manual (dados incluídos, sem IA) como opção legítima e sem fricção

**Nota de sequenciamento:** a instrumentação já é item do checklist da Fase 2, não desta — o servidor já resolve `plan_key` e `origin` nesse ponto. Esta fase consome os dados já colectados; não introduz nova captura.

---

### Fase 5 — Fitness × Performance por planeamento ⬜ *(decisão comercial #2 — decidida)*

**Objectivo:** parar de diferenciar tiers por catálogo de movimentos — tecnicamente frágil e degrada a prescrição.

**Esforço:** ~8h · **Depende de:** Fase 4

- [ ] Aposentar `workout.exercise_type` como diferenciador comercial (mantém-se, se necessário, como preferência clínica/segurança — nunca como gate de preço)
- [ ] Deslocar o diferencial do AI PERFORMANCE para o sistema de planeamento e análise: periodização, gestão de carga, prontidão, planeamento de pico
- [ ] Remover `enforceCategoryFilter` do caminho de licenciamento (ou reduzi-lo a filtro de segurança), **e o seu espelho** em `fallbackWorkoutGenerator.ts` — uma regra, um lugar
- [ ] Implementar o modelo de carga **nativo de força** — volume load ponderado por RPE (decisão #2, D2). Dados já existentes: RPE 100%, carga 96%
- [ ] Não implementar ATL/CTL/TSB no modelo TrainingPeaks — deriva de endurance e exige duração × intensidade, que não temos
- [ ] Corrigir a captura de `workout_sessions.duration_minutes` (hoje 1/233) — falha de registo que desbloqueia sRPE numa fase futura
- [ ] Alinhar a copy do AI PERFORMANCE ao que o modelo entrega de facto

**Critério de aceitação:** nenhum gate de preço decide sobre categoria de exercício; a promessa do AI PERFORMANCE é sustentada por métrica calculável com os dados existentes.

#### 5.1 A métrica de carga é input da geração, não só output do dashboard [correcção — 2026-08-04]

**Achado:** o canal para a IA se autorregular já existe — `stats.predictiveScores.fatigueRisk` é enviado ao prompt (`generate-smart-workout.ts:957`) — mas o valor nunca é calculado. É constante para todo utilizador, sempre:

```
StartWorkoutScreen.tsx:568  predictiveScores: { progressionReadiness: 50, fatigueRisk: 20, painRecurrence: 10, sessionCompletion: 70, planFit: 70 }
```

`gatedStatsCtx` (linha 612) finge decidir se o AI PERFORMANCE recebe scores reais, mas os dois ramos do `if` devolvem os mesmos números fixos — `statsCtx` nunca teve um score real para gatear. Já constava como risco de baixo impacto em `FEATURE_ACCESS_MATRIX.md` §7 ("valores arbitrários... sem impacto funcional"); tem impacto funcional, sim: **é a razão pela qual a IA não evita a carga que ela própria prescreveu.**

Sem esta correcção, a Fase 5 constrói um dashboard que informa o aluno de um problema que a própria IA causou e nunca soube que estava a causar — exactamente a inconsistência apontada pelo project lead.

- [ ] Substituir `predictiveScores.fatigueRisk`/`progressionReadiness` fixos por cálculo real a partir do volume load 7d/28d e deriva de RPE (D2), **antes** da geração — não só para leitura no dashboard
- [ ] Sessão **autónoma** (`origin = autonomous_ai`): a IA recebe o valor real e ajusta a próxima sessão (reduz volume/intensidade) pelo mesmo mecanismo já usado por `ai.checkin_adjustment` — hoje reactivo a auto-relato diário, passa a reagir também a carga acumulada real
- [ ] Sessão **prescrita** (`origin = trainer_prescribed`): a IA **não** tem autoridade para alterar o programa do treinador. O mesmo sinal de carga alta vira alerta accionável ao treinador, reaproveitando `trainer_alerts`/`InboxScreen.tsx` (infra já existente) — nunca ajuste silencioso
- [ ] Reescrever a mensagem ao aluno: deixa de ser aviso passivo ("sua carga está alta, considere reduzir") e passa a ser transparência de uma redução que a IA já aplicou — nunca a IA a reportar, sem agir, um problema que ela própria gerou

**Critério de aceitação (adicional):** nenhuma sessão autónoma é gerada com `fatigueRisk` fixo; um pico de carga em sessão autónoma resulta em ajuste automático na sessão seguinte, medido; um pico em programa prescrito gera alerta ao treinador, nunca mensagem passiva ao aluno.

---

### Fase 6 — Faixas de clientes e higiene de promessas ⬜ *(decisão comercial #3 — decidida)*

**Objectivo:** substituir o degrau único de 50 e retirar da oferta o que não está implementado. **ELITE mantém-se inalterado** — nome, preço e estrutura (decisão #3, D3).

**Esforço:** ~8h · **Depende de:** Fase 3

- [ ] Introduzir faixas em `clients.limit` (5/15/30/50 + incremental), no padrão de mercado
- [ ] **Reutilizar o enforcement existente** — `clients.limit` é o único gate desta auditoria já correcto (frontend + backend). Não reimplementar: parametrizar
- [ ] Manter marketplace e white-label como estão na oferta: são itens de **roadmap correctamente rotulados "Em breve"** (`comingSoon` → badge em `PlansScreen.tsx:299-311`). Não há promessa falsa a corrigir — as keys `marketplace.*` ficam declaradas à espera da implementação
- [ ] Popular `stripe_price_id` em `plan_prices` (Fase 3 do `PLAN_PRICING_MODEL.md`, nunca concluída — a tabela de preços é hoje display-only)

**Fora de escopo desta fase:** STUDIO. É produto planeado do roadmap, com licenciamento próprio, e reaproveitará a base já existente (`studios`, `studio_members`, `studio_has_trainer()`, `src/studio/`). Não substitui nem altera o ELITE.

**Critério de aceitação:** nenhuma feature cobrada sem implementação; faixas configuráveis por dado, sem deploy.

---

### Fase 7 — Higiene documental e artefacto executivo ⬜

**Esforço:** ~3h

- [ ] Corrigir as inconsistências confirmadas em auditoria §4: `workout.exercise_type` (`integer encoded` vs `string enum`), título "Implementadas" vs "seed proposto", nota de override ambígua, seed histórico com valor 2
- [ ] Actualizar a coluna "Aplicado?" com o estado real pós-Fases 2-3
- [ ] Corrigir `plan_prices.label` do trial (diz "14 dias"; a UI mostra 21 via i18n — dado morto)
- [ ] Regenerar o `.docx` executivo **com render visual verificado** (instalar LibreOffice; converter para PDF e inspeccionar página a página). O artefacto anterior cortou as colunas AI PERFORMANCE e ELITE — as colunas de decisão
- [ ] Fechar este plano com registo de medições reais

---

## 4. Decisões que dependem do project lead

Não são técnicas. Bloqueiam as fases indicadas.

| # | Decisão | Bloqueia |
|---|---|---|
| ~~1~~ | ~~**Amplitude do direito patrocinado.**~~ **DECIDIDA 2026-08-04** — cobre execução integral + captura de check-in + métricas operacionais determinísticas; **não** cobre automação nem inferência. Texto vigente em §Fase 4; contexto económico em D1. | ✅ desbloqueada |
| ~~2~~ | ~~Requisito de dados para ATL/CTL/TSB.~~ **DECIDIDA 2026-08-04** — a condição posta pela auditoria de business ("só sustentam plano premium com dados fiáveis") **está satisfeita para musculação**: RPE em 100% dos sets, carga em 96%. Modelo nativo de força, não cópia do TrainingPeaks. Ver D2. | ✅ desbloqueada |
| ~~3~~ | ~~Destino do ELITE.~~ **DECIDIDA 2026-08-04** — ELITE mantém-se sem alteração de nome, preço ou estrutura. Retira-se da copy o que não existe. STUDIO segue como **produto planeado do roadmap**, com a sua própria ligação de licenciamento — não substitui nem absorve o ELITE. Ver D3. | ✅ desbloqueada |
| ~~4~~ | ~~Cap autónomo do AI FITNESS.~~ **DECIDIDA 2026-08-04** — removido (sem função comercial após Fases 4 e 5; dado de produção favorável). O cap da FREE passa a guardrail de custo com autoridade no servidor. Ver D4. | ✅ desbloqueada |

### D1 — Contexto económico da decisão #1 [V]

**Executar programa prescrito não consome IA.** Verificado: `startPlan` (`StartWorkoutScreen.tsx:786-787`) faz UPDATE em `workout_plans` e navega para `workoutMode`; nem `WorkoutModeScreen` nem esse caminho chamam `generate-smart-workout`. O plano já foi construído pelo treinador. Custo marginal = armazenamento + push, não inferência.

Logo a decisão **não é de custo** — é de arquitectura de receita. Hoje a trava de 1 dia/semana funciona como alavanca de upsell B2C sobre trabalho que o treinador já vendeu. A Fase 4 remove essa alavanca; o que a substitui é o **direito autónomo** (geração própria por IA acima do cap, check-in, analytics) — aditivo, não coercivo.

| Actor | Paga | Cobertura implícita |
|---|---|---|
| Aluno FREE vinculado | €0 | — |
| Treinador PRO | €49/mês | até 50 alunos ⇒ **€0,98 por aluno/mês** |
| Treinador ELITE | €99/mês | ilimitado ⇒ tende a €0 por aluno |

**Onde o custo de IA realmente está:** na geração autónoma. Por isso o cap autónomo permanece aplicado (e, após a Fase 2, verificado no servidor). Desbloquear prescrição ≠ desbloquear geração.

### D2 — Base da decisão #2 — modelo de carga nativo de força [V]

A auditoria de business condicionou o tier premium a dados fiáveis: *"Sem wearable, frequência cardíaca, potência, ritmo ou um modelo sólido para musculação, elas podem parecer números sofisticados sem utilidade prática."* A condição está satisfeita — pela via da musculação, não pela do endurance.

| Sinal | Cobertura em produção (`workout_set_logs`, 2 659 registos) |
|---|---|
| `rpe` | **2 659 / 2 659 — 100%** |
| `load_kg` | 2 565 — 96% |
| `reps_done` | 2 649 — 99,6% |
| `workout_sessions.duration_minutes` | **1 / 233 — 0,4%** |

- **ATL/CTL/TSB clássico (TSS):** inviável — deriva de endurance e exige duração × intensidade.
- **Volume load ponderado por RPE:** viável hoje, sem dado novo. É o modelo nativo de treino de força.
- **sRPE (RPE × duração):** desbloqueado assim que `duration_minutes` for populado — falha de captura, não de modelo.

**Consequência para a Fase 5:** o diferencial do AI PERFORMANCE assenta em carga/recuperação nativa de força. Corrigir a captura de `duration_minutes` entra como item da fase.

### D3 — Base da decisão #3 — ELITE inalterado; STUDIO como produto planeado

ELITE mantém `plan_key`, nome, preço e estrutura. Nada é substituído, absorvido ou descontinuado.

**Marketplace e white-label não são promessa falsa** — são roadmap correctamente rotulado. A UI renderiza-os pelo array `comingSoon` com badge "Em breve" e em cinzento (`PlansScreen.tsx:299-311`, confirmado em captura de produção). As keys `marketplace.listing`/`marketplace.revenue_share` permanecem declaradas em `src/types/feature-permissions.ts:10-11` à espera da implementação — declaração antecipada de roadmap, não código morto a remover. Nada a corrigir na oferta.

STUDIO segue como produto do roadmap, com licenciamento próprio. A base de dados já existe e é reaproveitada, não recriada: `studios` (`logo_url`), `studio_members` (`role`, `permissions` jsonb), `studio_has_trainer()` em RLS, e a app separada em `src/studio/` servida em `/studio`. O gate `studio.branding` liga-se a essa base quando a fase de STUDIO for executada — fora do escopo deste plano.

### D4 — Base da decisão #4 — cap autónomo

Após a Fase 4 o cap aplica-se só à geração autónoma; após a Fase 5 a diferenciação sai do eixo de volume. O cap de 7/semana fica sem função comercial, e o dado sustenta a remoção: no tier já sem cap (AI PERFORMANCE), média de 3,55 sessões/semana e **uma única semana** em todo o histórico acima de 7 (auditoria §3.4).

**Inversão a registar:** o cap que passa a importar é o **1/semana da FREE** — com o programa prescrito liberado, é a única contenção de custo de IA para o aluno patrocinado que paga €0. É precisamente o cap que hoje só existe no frontend (auditoria §3.2) e que a Fase 2 passa a aplicar no servidor. Deixa de ser alavanca de upsell e passa a ser guardrail de custo, calibrado pela medição da Fase 4.2.

---

## 5. Registo de decisões e medições

> Preencher na conclusão de cada fase. Sem medição real, a fase não fecha.

| Fase | Data | Decisão / resultado medido | Evidência |
|---|---|---|---|
| 0 | 2026-08-04 | **Sucesso — import directo, sem codegen.** `api/_lib/auth.ts` criado; `billing-portal.ts` migrado; deploy preview READY; `_lib/auth.js` confirmado presente no bundle da função por inspecção directa do output de `vercel build`. | Deploy `dpl_A7L8bHmN5iHMuemGtxMKdyPSE3Wx`; `.vercel/output/functions/api/billing-portal.func/api/_lib/auth.js` (artefacto local, não commitado — gitignored) |
| 1 | 2026-08-04 | **Sucesso.** `src/licensing/entitlements.ts` criado (núcleo puro); `useFeatureAccess.ts` refactorado para delegar; fail-open dos caps numéricos invertido. 30 testes novos, 252 pré-existentes intactos, zero erros de tipo. | `src/licensing/entitlements.test.ts` (30/30); `npx vitest run` (252/252 relevantes); `npx tsc --noEmit` limpo |
| 2 | 2026-08-04 | **Sucesso, com um bug real encontrado e corrigido no caminho.** `api/_lib/entitlements.ts` criado; `generate-smart-workout.ts` deriva os 3 gates de IA do servidor, não do cliente; `send-invitation.ts` consome o mesmo resolvedor; 7/7 handlers migrados para `_lib/auth`; instrumentação de custo adicionada. A primeira chamada HTTP real (project lead autenticado, credenciais nunca digitadas por mim) devolveu 500 `ERR_MODULE_NOT_FOUND` — imports relativos sem extensão `.js`, que nem `tsc` nem a prova de bundle da Fase 0 detectam sob Node ESM nativo. Corrigido (`f24e376`), redeploy, 200 confirmado ao vivo com conta FREE real, incluindo a elevação `free→ai_fitness` a funcionar correctamente. Rollback por feature flag **não implementado** — divergência registada, não pendência oculta. | `api/_lib/entitlements.test.ts` (6/6); `npx vitest run` (258/258 relevantes); 7 bundles confirmados; `vercel logs` do 500 e do 200 pós-fix; log `ai_generation_cost` real com tokens a bater com a resposta |
| 3 | 2026-08-04 | **Sucesso.** 14 linhas semeadas em `feature_permissions` (73→87, primeira escrita de dados da sessão); `ai.workout_generation` documentado; teste de completude com mapa de audiência derivado do código real, não suposto. | `src/licensing/completeness.test.ts` (6/6); `npm run check:feature-permissions` contra a BD real — "6 planos, 87 linhas, nenhuma lacuna"; `npx vitest run` (264/264 relevantes) |
| 4 | 2026-08-04 | **Sucesso, com correcção ao plano no caminho.** Investigação mostrou que `generate-smart-workout.ts` nunca lida com conteúdo prescrito — a query de `trainerPlans` já filtra `source='manual'`, então o bug era filtrar/bloquear no cliente algo já sabido ser prescrito, não falta de um discriminador de servidor. Removida a filtragem por tipo de exercício e o cap de dias em `StartWorkoutScreen.tsx`; `resolveWorkoutOrigin` formalizado no núcleo para reuso futuro (Fase 5.1). Decisão #4 aplicada (cap do AI FITNESS removido). Verificação ao vivo parcial: página carrega sem crash, mas nenhuma conta de teste tinha dado qualificado (>1 plano prescrito ou exercício `performance`) para exercer o cenário exacto — os dados disponíveis mudaram de estado durante os próprios testes (auto-expire/auto-heal pré-existente). | `npx vitest run` (266/266 relevantes); `tsc --noEmit` limpo; deploy READY, carregamento ao vivo confirmado sem erro; cenário exacto não reproduzido ao vivo por falta de dado de teste qualificado |

---

## 6. O que este plano não faz

| Fora de escopo | Porquê |
|---|---|
| Integração com wearables (Garmin/Apple Health/Strava) | Produto novo; pré-requisito de dados para o AI PERFORMANCE credível, mas não é correcção de licenciamento |
| Gestão multi-treinador / STUDIO operacional | Produto novo (Fase 6 apenas avalia e delimita) |
| Conformidade GDPR/AI Act do perfilamento | Já coberto por `project_consent_visibility_enforcement`; interage mas não se sobrepõe |
| Migração de billing para Stripe | Fase 3 do `PLAN_PRICING_MODEL.md`; a Fase 6 apenas desbloqueia o pré-requisito de dados |

---

## 7. Referências

- `docs/BILLING_FEATURE_MODEL_AUDIT_20260804.md` — auditoria técnica base
- `ANALISE_COMERCIAL_FEATURE_ACCESS_MATRIX_TRAINER_20260804.md` — visão comercial
- `docs/FEATURE_ACCESS_MATRIX.md` · `docs/PLAN_PRICING_MODEL.md`
- `docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md` · `docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_FINDINGS_20260803.md`
- `policies/references/PROFILE.md` · `policies/references/EXECUTIVE_TECHNOLOGY_DIRECTIVE.md`
