# Auditoria — Modelo de Cobrança e Funcionalidades (TrAIner)

**Data:** 2026-08-04
**Revisão:** v2 — revista contra o algoritmo em execução (código + RLS + `feature_permissions` de produção). A v1 continha uma imprecisão material, corrigida em §3.1 e registada em §8.
**Escopo:** cruzamento entre a análise comercial externa (`ANALISE_COMERCIAL_FEATURE_ACCESS_MATRIX_TRAINER_20260804.md`) e verificação técnica directa.
**Natureza:** auditoria de achados. Não contém plano de implementação nem decisão — aguarda instrução do project lead.

**Método aplicado nesta auditoria:** *"Aplicando: conciso, direto, sem recapitulação."* — protocolo de interação do `PROFILE.md` §Interaction Protocols (conciseness extrema, viés de ação, tom executivo). Registado aqui por instrução do project lead: as recomendações de impacto comercial em §7 seguem o mesmo protocolo — afirmação directa, sem hedge decorativo, sem repetição de contexto já estabelecido.

**Convenção de atribuição:**
- **[C]** — originado da análise comercial externa; não re-verificado por mim salvo indicação.
- **[V]** — verificado nesta sessão contra código, RLS ou dados de produção, com citação.
- **[X]** — cruzamento onde as duas fontes se reforçam ou se contradizem.

---

## 1. Síntese executiva

A análise comercial conclui **GO condicionado** (5/10 de prontidão) apontando um conflito de monetização: *a assinatura do aluno interfere no serviço que o treinador já vendeu*.

A verificação técnica encontra um problema paralelo e mais grave, agora **confirmado em todas as camadas**: dos 4 gates que produzem essa fricção comercial, **nenhum tem autoridade real no servidor**. Não é "a maioria" — é a totalidade. O servidor de geração por IA aplica os limites *que o cliente lhe informa*, e a camada de dados (RLS) não impõe limite de plano algum sobre criação de sessões.

Consequência para a decisão comercial: o modelo actual **bloqueia o usuário honesto e não bloqueia o desonesto**. Redesenhar a política de planos sem fechar o enforcement apenas transporta essa fragilidade para o modelo novo.

| Dimensão | Avaliação comercial [C] | Achado técnico correspondente [V] |
|---|---|---|
| Arquitectura de gating | 9/10 | Configuração é single-source-of-truth; **aplicação não é** — §3.1, §3.5 |
| Planos B2C | 6/10 | `sessions_per_week` e `exercises_per_session` sem autoridade server-side — §3.1, §3.2 |
| Planos de treinador | 4/10 | `trainer_plan.days_per_week` idem, agora confirmado via RLS — §3.3 |
| Diferenciação Fitness×Performance | 6/10 | `exercise_type` idem — §3.1 |
| Prontidão comercial | 5/10 | Defeito de layout do `.docx` confirmado — §4, item 7 |

---

## 2. Eixo comercial — síntese da análise externa [C]

*(Condensado. Fontes externas — ACSM, Trainerize, Everfit, Fitbod, TrainingPeaks, GDPR, AI Act — não foram re-verificadas nesta sessão.)*

### 2.1 Conflito central de monetização

> "O treinador paga para gerenciar o cliente, o cliente paga pelo serviço do treinador e, mesmo assim, o aplicativo exige uma terceira compra para liberar o programa que o treinador já prescreveu."

Hoje: aluno FREE vinculado a treinador executa 1 dia/semana do plano prescrito; AI FITNESS, 3 dias; exercícios de Desempenho são filtrados fora do AI PERFORMANCE. Contrasta com Trainerize/Everfit/TrueCoach, onde a monetização é por cliente activo do treinador.

**Correção proposta:** separar **direito autónomo** (pago pelo aluno: geração independente por IA, analytics pessoal) de **direito patrocinado pelo treinador** (execução integral do programa prescrito, todos os dias, todos os exercícios, registo, check-in).

> Regra sugerida: *"O plano do aluno limita o que ele pode gerar autonomamente com IA, mas não bloqueia o programa que um treinador autorizado prescreveu."*

### 2.2 Planos de aluno

- **FREE** — janela de 21 dias equivalente ao AI FITNESS é bom mecanismo de aquisição, mas está invisível na oferta. Cap de "6 exercícios/sessão" é trava artificial sem relação com valor percebido; recomenda-se controlar custo por nº de gerações, não por contagem de exercícios.
- **AI FITNESS** — "7 sessões/semana" vs. "ilimitado" não é diferença percebida pelo consumidor. *(Sustentado por dado de produção — §3.4.)*
- **AI PERFORMANCE** — precisa ser definido por periodização, gestão de carga, integração com wearables e interpretação profissional — não por contagem de scores (4 vs. 8) ou catálogo de exercícios. Alerta: ATL/CTL/TSB dependem de dado consistente de carga/intensidade; sem wearable ou modelo sólido para musculação, podem "parecer números sofisticados sem utilidade prática".

### 2.3 Planos de treinador

- **TRIAL** — Coach DNA aparecer bloqueado contradiz a elevação automática `trial → pro` por 21 dias. *(Contradição confirmada em dado: `coach_dna`/`trial` = `allowed: false` — §3.6.)*
- **PRO** — degrau único de 50 clientes é alto demais; sugerida segmentação gradual (5/15/30/50 + incremental).
- **ELITE** — branding e marketplace, os dois diferenciais, não estão implementados. Sugestão de renomeação: `PRO` / `STUDIO` / `ENTERPRISE` com funcionalidades administrativas inexistentes hoje.

### 2.4 Fitness × Performance não deveria ser "quais exercícios"

O mesmo movimento serve saúde geral ou meta competitiva; a diferença está na periodização e no sistema de análise, não no catálogo. Bloquear velocidade/potência/resistência no AI FITNESS degrada a prescrição do treinador.

### 2.5 Recursos com bom potencial comercial

Coach DNA (melhor diferencial proprietário — não deveria estar escondido no TRIAL); check-in com ajuste automático (deixar claro que ajusta treino, não diagnostica); AI Score (o problema é comunicar "8 scores" em vez do resultado); arquitectura data-driven — **desde que a protecção de custo esteja no backend, não só na UI/prompt**.

> Este último ponto é exactamente o que a verificação técnica confirma como falho — ver §3.1. Não é risco teórico: é o estado actual.

### 2.6 Lacunas de modelo de negócio

15 perguntas em aberto (preço prático, quem paga com treinador+aluno, patrocínio de licença, definição de "cliente activo", pausados/downgrade, custo de IA por cliente, fair use, margem bruta, distribuição dos 15%, impostos/chargeback). Nenhuma respondida nesta sessão.

---

## 3. Eixo técnico — achados verificados

### 3.1 O servidor aplica os limites que o cliente lhe informa [V] — achado central

**Correção da v1.** A v1 afirmou que "o backend não valida plano nenhum". Isso é impreciso e a imprecisão importa: existe código de enforcement rodando no servidor. O defeito é outro, mais específico:

```
generate-smart-workout.ts:1195  if (... && body.task.maxExercises != null) { cutExerciseCount(...) }
generate-smart-workout.ts:1209  if (... && body.task.fitnessOnly)         { enforceCategoryFilter(...) }
```

`cutExerciseCount` e `enforceCategoryFilter` **são** funções server-side, testadas e medidas em produção (Fases 2/3, 2026-08-03). O problema é que os **parâmetros** vêm de `body.task` — populado pelo cliente:

```
StartWorkoutScreen.tsx:142  const exercisesPerSession = aiAccessMap['workout.exercises_per_session']?.limitValue ?? null;
StartWorkoutScreen.tsx:144  const fitnessOnlyWorkout  = (aiAccessMap['workout.exercise_type']?.limitValue ?? null) === 0;
StartWorkoutScreen.tsx:597         maxExercises: exercisesPerSession ?? undefined,
StartWorkoutScreen.tsx:598         fitnessOnly:  fitnessOnlyWorkout,
```

`aiAccessMap` é uma leitura **client-side** de `feature_permissions` (`useFeatureAccess.ts:31`, via `supabase.from(...)` no browser). O handler nunca resolve `plan_key` nem consulta `feature_permissions`.

Formulação precisa do defeito: **o enforcement é server-side; a autoridade sobre os parâmetros é client-side.** Uma chamada directa com `maxExercises: 999, fitnessOnly: false` é honrada integralmente, independente do plano pago. Vale para `workout.exercises_per_session`, `workout.exercise_type` e `workout.sessions_per_week`.

**O caminho de IA é alcançável por FREE** — não é hipótese: `ai.workout_generation` = `allowed: true` para **todos** os planos, incluindo `free` (verificado em `feature_permissions`), e `useSmart` (`StartWorkoutScreen.tsx:603`) habilita a chamada real ao endpoint. Portanto a exposição de custo de IA é real, não teórica.

**A correcção é de baixo esforço, e isto é relevante para priorização:** o handler **já tem** identidade verificada server-side —

```
generate-smart-workout.ts:1081  const caller = await verifyRequestUser(req);   // valida JWT contra /auth/v1/user
generate-smart-workout.ts:1086  && await hasActiveLink(caller.id, body.client.id);  // consulta com service key
```

Falta apenas usar `caller.id` para resolver `plan_key` e ler `feature_permissions` — exactamente o que `api/send-invitation.ts:125` já faz ("resolve trainer's real plan_key from DB (never trust client)").

### 3.2 `workout.sessions_per_week` — sem autoridade em nenhuma camada [V]

Frontend:
```
StartWorkoutScreen.tsx:540  if (sessionsPerWeekCap !== null) { ...conta sessões da semana e bloqueia... }
```
Nenhuma checagem equivalente em `api/`. E a camada de dados também não impõe limite (§3.3). O cap de **1 sessão/semana da FREE** — o mais sensível comercialmente — não é aplicado fora da UI.

### 3.3 `trainer_plan.days_per_week` — auditoria pendente: RESOLVIDA [V]

Esta era a linha marcada "não auditado por este plano" na `FEATURE_ACCESS_MATRIX.md` §4 e deixada em aberto na v1. Auditada agora.

Frontend bloqueia de facto:
```
StartWorkoutScreen.tsx:937   const isPlanLocked = trainerPlanDaysCap !== null && i >= trainerPlanDaysCap;
StartWorkoutScreen.tsx:1046  onClick={() => isPlanLocked ? setTrainerPlanLocked(true) : startPlan(p)}
```

RLS em `workout_sessions` (consultado em `pg_policies`, produção):

| Política | cmd | Expressão |
|---|---|---|
| `own sessions` | ALL | `auth.uid() = user_id` |
| `trainer manages client sessions` | ALL | vínculo activo em `trainer_clients` |

**Conclusão: não há enforcement de backend.** A política de escrita valida apenas propriedade da linha — nenhuma referência a plano, a `feature_permissions` ou a contagem semanal. Um usuário autenticado pode inserir sessões sem limite de dias. `trainer_plan.days_per_week` é, portanto, **frontend-only**, como os outros três.

Observação secundária (integridade, não licenciamento): a política `own sessions` não valida que `plan_id` pertence ao usuário — só que `user_id = auth.uid()`. Não explorei o impacto; registado para verificação separada, não como achado de licenciamento.

### 3.4 Dado real de produção — o risco de custo por "ilimitado" não se confirma na base actual [V]

Supabase `sevenseeds.trainer` (`xbfszzdyskwdctlqzztl`), 233 sessões / 13 assinaturas activas, 2026-08-04:

| Plano | Assinantes activos | Máx. sessões numa semana | Média em semanas activas | Semanas com ≥7 |
|---|---|---|---|---|
| ai_fitness | 1 | — (0 sessões registadas) | — | — |
| ai_performance (já sem cap) | 5 | 10 (1 outlier) | 3,55 | 1 em toda a base |
| free | 5 | 6 | 3,42 | 0 |

No único tier hoje sem cap, a média real é ~3,5/semana e apenas uma semana em toda a história passou de 7. Apoia empiricamente §2.2 e indica baixo risco de custo em remover o cap do AI FITNESS. **Ressalva:** base pequena (13 assinaturas), produto em estágio inicial — não é garantia para escala.

### 3.5 Caps numéricos falham *abertos*; gates booleanos falham *fechados* [V] — achado novo

```
useFeatureAccess.ts:135-136   allowed:    row?.allowed     ?? false,
                              limitValue: row?.limit_value ?? null,
```

Linha ausente em `feature_permissions` ⇒ boolean vira **negado** (fail-closed, seguro) mas cap numérico vira **null = ilimitado** (fail-open, inseguro). Um `DELETE` acidental, um `plan_key` novo sem seed completo, ou um erro de migração remove silenciosamente um limite comercial sem qualquer sinal.

Isto já é observável: `pro` e `elite` **não têm linhas** para `workout.*` nem `trainer_plan.days_per_week`. Resolvem para ilimitado por ausência, não por decisão explícita registada — mas **verificado nesta revisão como inofensivo na prática**: `StartWorkoutScreen` (onde essas keys são lidas) está em `SideMenu.tsx:35` (`TRAINER_EXCLUDE = new Set(['profile', 'workout', 'cycle', 'studio'])`) e os três `nav('workout', ...)` de `InboxScreen.tsx` (linhas 413, 453, 465) estão todos dentro de blocos `!isTrainer`. Um treinador não chega a essa tela sob a própria conta — a ausência de linha nunca é lida com `override=false` para `pro`/`elite`. Fica como fragilidade estrutural (§3.5 continua válido como padrão), não como bug reproduzível.

#### 3.5.1 A mesma ausência de linha, mas alcançável — `checkin.full` e `progress.*` [V] — CONFIRMADO

Diferente do parágrafo anterior, `checkin` e `stats` (progresso) **não estão** em `TRAINER_EXCLUDE` — um treinador PRO/ELITE tem essas duas telas no próprio menu e as usa sob a própria conta, sem `selectedClient`/`clientUserId`:

```
CheckInProntidaoScreen.tsx:58        const isTrainerContext  = !!clientUserId;      // false = check-in próprio
CheckInProntidaoScreen.tsx:60        const checkinFullAccess = useFeatureAccess(effectivePlanKey, 'checkin.full', isTrainerContext);
PerformanceDashboardScreen.tsx:73    const isTrainerOverride = !!selectedClient;    // false = dashboard próprio
PerformanceDashboardScreen.tsx:74-78 const accessMap = useFeatureAccessMap(effectivePlanKey, [...'progress.fitness_advanced','progress.performance'...], isTrainerOverride);
```

Quando `override=false`, a leitura vai contra o `plan_key` real do treinador. `fetchPermissions('pro')` retorna as 10 linhas confirmadas em §3.6 — nenhuma é `checkin.full`, `progress.fitness_advanced` ou `progress.performance`. `row?.allowed ?? false` resolve negado.

**Resultado, reproduzível: um treinador PRO (€49/mês) ou ELITE (€99/mês) é bloqueado do Check-in Completo e das duas abas de progresso avançado no próprio uso — permanentemente, não apenas na janela de trial.** Isto substitui o "efeito colateral a verificar" da v2 anterior desta seção: estava sob-verificado; a reachability agora tem prova de dois lados (menu + guarda de override).

### 3.6 Achados de documentação verificados contra o dado real [V]

- **`ai.workout_generation` não consta da `FEATURE_ACCESS_MATRIX.md` §4.** Existe em produção (6 linhas, todos os planos `allowed: true`) e é lido em `StartWorkoutScreen.tsx:138`, onde decide se a IA gera o treino. É o gate mais fundamental do fluxo e está ausente da matriz.
- **`coach_dna`/`trial` = `allowed: false`** confirma a contradição comercial de §2.3: a matriz nega no direito bruto o que a elevação `trial → pro` concede por 21 dias.
- **`clients.limit`** = trial 3 / pro 50 / elite null ✓ bate com a documentação.
- **`workout.exercises_per_session`/`free`** = 6 ✓ confirma a correcção de 2026-08-03.

### 3.7 Padrão de processo, não incidentes isolados [V]

Quatro gates, quatro vezes o mesmo defeito. A causa comum: `feature_permissions` garante **configuração** centralizada, mas nada garante que ela seja **lida com autoridade** em cada superfície. Cada gate é religado manualmente, sem teste ou auditoria que feche o loop.

**Evidência de que isto é falha de processo, não de conhecimento** — dois artefactos escritos pela própria equipa:

1. O padrão correcto já existe, a três ficheiros de distância:
   ```
   api/send-invitation.ts:125  // ── 0. Plan limit guard — resolve trainer's real
                                 plan_key from DB (never trust client) ──
   ```

2. Mais revelador: comentários no código **afirmam que o gate server-side existe** —
   ```
   src/lib/fallbackWorkoutGenerator.ts:175  // Mirrors the server-side gate in api/generate-smart-workout.ts
   StartWorkoutScreen.tsx:628               // ...mirroring the server-side gate in generate-smart-workout.ts
   ```
   A equipa acredita que há autoridade no servidor. E há código no servidor — só que parametrizado pelo cliente (§3.1). O defeito sobreviveu justamente porque *parece* estar coberto: existe função, existe teste, existe medição em produção. O que nunca foi testado é o vector de entrada.

Isto também explica por que a coluna "Aplicado?" da matriz só surgiu depois do primeiro incidente (2026-08-03) e ainda assim deixou duas linhas "não auditadas" — as mesmas que esta auditoria acabou de examinar e reprovar.

---

## 4. Inconsistências documentais — status consolidado [X]

| # | Apontado pela análise externa | Status verificado |
|---|---|---|
| 1 | §2/§4 dizem 6 exercícios no FREE; §5/seed dizem 2 | **Parcialmente resolvido nesta janela** — §2.1/§2.2 corrigidos para 6 (DB confirma 6). §5 mantém "2" rotulado como histórico; a confusão do leitor é legítima. |
| 2 | `workout.exercise_type` como `integer encoded` vs. `string enum` | **Confirmado, pendente.** §4 usa `integer encoded` (correcto — o dado real é `limit_value = 0`); §5 usa `string enum` (incorrecto). |
| 3 | §5 intitula "Implementadas" mas diz "são necessárias" + "seed proposto" | **Confirmado, pendente.** |
| 4 | TRIAL sem Coach DNA vs. elevação `trial → pro` | **Confirmado em dado** — `coach_dna`/`trial` = false. Contradição real entre direito bruto e elevação. |
| 5 | Nota de override do treinador ambígua | **Redação confusa, não contradição lógica.** O mecanismo é único (`override = true` ⇒ tudo liberado, `useFeatureAccess.ts:69-71`); a ordem de apresentação gera a leitura de conflito. Vale reescrever. |
| 6 | `sessions_per_week` e `trainer_plan.days_per_week` "não auditados" | **Auditados nesta sessão — ambos reprovados.** §3.2 e §3.3. O rótulo na matriz está desactualizado. |
| 7 | Tabelas do `.docx` ultrapassam a margem, ocultando AI PERFORMANCE e ELITE | **Confirmado — defeito do artefacto que eu gerei.** Ver §8. |

---

## 5. Onde comercial e técnico se reforçam [X]

1. **O mesmo defeito, dois ângulos.** A crítica comercial (limites do aluno atrapalham o serviço do treinador, §2.1) e o achado técnico (esses limites não têm autoridade, §3.1–§3.3) descrevem o mesmo sistema: ele irrita quem paga e não contém quem não paga. Qualquer redesenho comercial precisa vir acompanhado do fechamento do enforcement — senão o modelo novo herda a fragilidade do actual.

2. **A recomendação de remover o cap de sessões é apoiada pelo dado (§3.4), mas é ortogonal ao defeito.** Remover o cap do AI FITNESS resolve um problema de percepção comercial; não resolve — e nem toca — o facto de que nem o cap actual nem qualquer cap futuro é verificado no servidor.

3. **O alerta comercial de §2.5 sobre "protecção de custo no backend" estava correcto e é agora quantificável:** o caminho de IA é alcançável por FREE (`ai.workout_generation` = true para todos os planos), logo a exposição não é hipotética.

4. **A crítica ao ELITE (§2.3) coincide com correcção já aplicada nesta janela** ao `FEATURE_ACCESS_MATRIX.md`: Studio Branding e Marketplace passaram de "✅" para "🔜 UI pendente".

---

## 6. Perguntas em aberto

**Herdadas da análise comercial [C]** — nenhuma resolvida: preço prático por plano; responsabilidade de pagamento com treinador+aluno; patrocínio de licença pelo treinador; definição de "cliente activo"; pausados/downgrade; custo de IA por cliente activo; fair use; margem bruta; distribuição dos 15%; responsabilidade fiscal/chargeback.

**Da auditoria técnica [V]:**
- Qual o custo real por chamada ao DeepSeek? Sem isso não é possível dimensionar a exposição de §3.1 nem calibrar prioridade.
- A ausência de validação de `plan_id` na política `own sessions` tem impacto além de licenciamento? (§3.3)
- **Resolvida nesta revisão:** RLS de `workout_sessions` não impõe limite de plano — era a última pergunta em aberto da v1.
- **Resolvida nesta revisão:** `checkin.full`/`progress.*` ausentes para `pro`/`elite` **negam de facto** Check-in Completo e progresso avançado ao treinador no próprio uso — confirmado alcançável via `SideMenu.tsx` + `isTrainerOverride`/`isTrainerContext` (§3.5.1). Não é mais pergunta em aberto.

---

## 7. Impacto das mudanças comerciais propostas — leitura técnica [X]

*Aplicando: conciso, direto, sem recapitulação.*

| Proposta comercial [C] | Viabilidade técnica [V] | Dependência crítica |
|---|---|---|
| Treinador libera integralmente o programa prescrito | **Alta.** É mudança de dado (`trainer_plan.days_per_week` → null para planos com vínculo activo) + separar o gate de "plano do treinador" do gate de "geração autónoma". Já são feature keys distintas. | Exige decidir *quem* patrocina o custo; não exige refactor. |
| Fitness×Performance por planeamento, não por exercício | **Média.** `workout.exercise_type` (`limit_value` 0/null) teria de ser aposentado ou reposicionado; `enforceCategoryFilter` e o mirror local (`fallbackWorkoutGenerator.ts`) dependem dele em duas superfícies. | Toca o caminho de IA — mesma zona de §3.1. Fazer junto, não em sequência. |
| Faixas graduais de clientes (5/15/30/50) | **Alta e de baixo risco.** `clients.limit` já é `integer cap` e **já tem enforcement real de backend** (`send-invitation.ts`, frontend+backend). É o único gate desta auditoria que não está quebrado. | Novas linhas em `plan_definitions`/`plan_prices`/`feature_permissions`. |
| Remover cap de sessões do AI FITNESS | **Trivial** (`limit_value` → null) e suportado por dado (§3.4). | 4 strings de i18n com "7" hardcoded (`limitWeeklyCta`, pt/en/es/de:1187). |
| PRO / STUDIO / ENTERPRISE com gestão multi-treinador | **Baixa — não existe.** Requer produto novo (papéis, permissões administrativas, transferência de clientes, dashboard de operação). | Não prometer comercialmente antes de existir. Mesma classe do ELITE actual. |

**Regra de sequenciamento que decorre da auditoria:** qualquer proposta que altere limites de geração por IA (linhas 1, 2 e 4) atravessa `generate-smart-workout.ts`. Alterar valores sem corrigir a autoridade dos parâmetros produz um modelo comercial novo com o mesmo enforcement nulo do actual — e desta vez sem a desculpa de não saber.

---

## 8. Correcções a esta auditoria e ao artefacto entregue

**§3.1 (v1 → v2).** A v1 afirmou que `generate-smart-workout.ts` "não valida plano nenhum no servidor". Impreciso: as funções de enforcement rodam no servidor e são testadas. O defeito real é que os **parâmetros** são client-supplied. A conclusão prática não muda (o limite é contornável), mas a formulação da v1 subestimava o que já existe e por isso descrevia mal a correcção necessária — que é pequena, não estrutural.

**§3.3 (v1 → v2).** A v1 deixou a auditoria de RLS explicitamente pendente. Resolvida: sem enforcement de backend.

**Defeito no `.docx` entregue nesta sessão.** `~/Downloads/FEATURE_ACCESS_MATRIX.docx` passou validação XSD e leitura por `textutil`, mas **nenhuma dessas checagens valida layout** — colunas cortadas na margem direita, ocultando AI PERFORMANCE e ELITE, exactamente as colunas de decisão. A ausência de LibreOffice no ambiente impediu o render em PDF que teria detectado isso; sinalizei a limitação na entrega, mas ainda assim entreguei um artefacto que não servia ao propósito executivo. Correcção de processo: sem render visual, tratar como pendência de verificação — não como entregue.

---

## 9. Referências

- Análise comercial: `ANALISE_COMERCIAL_FEATURE_ACCESS_MATRIX_TRAINER_20260804.md` (project lead, 2026-08-04)
- [FEATURE_ACCESS_MATRIX.md](FEATURE_ACCESS_MATRIX.md) · [PLAN_PRICING_MODEL.md](PLAN_PRICING_MODEL.md)
- [LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md](LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md) · [LICENSE_EXERCISE_TYPE_ENFORCEMENT_FINDINGS_20260803.md](LICENSE_EXERCISE_TYPE_ENFORCEMENT_FINDINGS_20260803.md)
- Código: `api/generate-smart-workout.ts`, `api/send-invitation.ts`, `src/screens/client/StartWorkoutScreen.tsx`, `src/hooks/useFeatureAccess.ts`, `src/lib/fallbackWorkoutGenerator.ts`
- Produção (`xbfszzdyskwdctlqzztl`): `feature_permissions` (73 linhas), `pg_policies` (`workout_sessions`, `workout_plans`, `plan_exercises`, `workout_session_exercises`), `subscriptions` × `workout_sessions` — consultados 2026-08-04
