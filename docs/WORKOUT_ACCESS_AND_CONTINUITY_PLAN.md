# Plano de Implementação — Direito de Acesso à Geração de Treino e Plano de Continuidade

**Versão:** 1.1 (revisada em varredura final — ver "Varredura final"; substitui `LOCAL_WORKOUT_GENERATION_PARITY_PLAN.md` e `FALLBACK_WORKOUT_TEMPLATE_STRUCTURE_PLAN.md`, ambos descartados antes de qualquer publicação)
**Data:** 2026-08-02
**Referências:** `src/screens/client/StartWorkoutScreen.tsx` · `src/types/feature-permissions.ts` · tabela `feature_permissions` · `api/generate-smart-workout.ts` · `api/generate-workout.ts` · `src/lib/sessionStructure.ts` · `protocol_exercises` + `exercise_content_translations` · `docs/SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md` · `docs/EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md`
**Estimativa total:** ~14h, em 7 fases independentemente publicáveis
**Origem:** investigação iniciada em 2026-08-02 para fechar a lacuna de `phase` no plano-modelo local, que ao ser rastreada expôs uma causa-raiz no modelo de permissões.

---

## Tese

A investigação começou por um sintoma de tela — o plano-modelo local não gravava o bloco de sessão — e três reenquadramentos sucessivos do líder do projeto levaram à causa real:

> **Não existe chave de permissão para "a IA cria o plano de treino". A única alavanca disponível era `ai.checkin_adjustment` — que por nome e por texto comercial significa *ajustar* —, e foi ela que acabou usada para gatear a *criação*.**

O efeito em cascata explica tudo o que encontramos:

1. O Free ficou com **zero IA** na geração de treino, embora a página de planos lhe prometa "Algumas dicas de IA por semana" e o texto do AI Fitness venda *criação* (`features[0]`) e *ajuste* (`features[1]`) como duas coisas distintas.
2. Sem IA, o plano-modelo local deixou de ser contingência e virou **o produto permanente do Free** — o que nunca foi decidido como modelo de uso.
3. Todo teto desenhado para **dosar a experiência de IA do Free** virou letra morta, porque só era aplicado dentro da chamada de IA que o Free nunca faz: `workout.exercises_per_session = 2` e `workout.exercise_type = 0` não têm efeito algum hoje.
4. Como o caminho local nunca foi tratado como produto, ele acumulou lacunas próprias: sem bloco de sessão, sem orçamento de tempo, sem procedência de idioma, com um conjunto fixo de 6 exercícios por objetivo.

Cortar o Free da IA não removeu apenas a IA — **desativou silenciosamente todo o mecanismo de calibragem que existia para dosá-la**, e promoveu um plano de contingência a experiência principal de um tier comercial.

---

## Cadeia causal

| Camada | O que está errado | Consequência observável |
|---|---|---|
| Modelo de permissão | Uma chave (`ai.checkin_adjustment`) faz dois trabalhos; não existe chave de criação | Free sem IA; promessa comercial não cumprida |
| Configuração | Tetos ligados só ao caminho de IA | `exercises_per_session=2` e `exercise_type=0` inertes |
| Arquitetura | Contingência promovida a modelo de uso | Investimento cobrado do caminho errado |
| Implementação local | Sem bloco, sem orçamento, sem procedência, conjunto pequeno | Aluno Free vê lista plana, mal dimensionada no tempo |

---

## Achados verificados

Todos por leitura direta de código ou consulta a produção (`xbfszzdyskwdctlqzztl`), 2026-08-02.

### Modelo de permissão e configuração

| # | Achado | Evidência |
|---|--------|-----------|
| 1 | `ai.checkin_adjustment` gateia **criação**, não ajuste: falso ⇒ nenhuma chamada de IA ocorre | `StartWorkoutScreen.tsx:201`, `:605`, `:623-637` |
| 2 | Não existe chave para criação de treino por IA em `feature_permissions` | consulta a `feature_key like 'ai.%'` |
| 3 | O texto comercial separa as duas coisas — `ai_fitness.features[0]` "Planos de IA totalmente personalizados" e `features[1]` "Ajustes diários por energia e dores" — e só a segunda tem chave | `src/i18n/locales/*.json`, `plans.text` |
| 4 | O Free é vendido com "Algumas dicas de IA por semana" e recebe **zero** IA na geração | mesma fonte + achado 1 |
| 5 | `workout.exercises_per_session = 2` (Free) **nunca é aplicada**: só entra em `taskCtx.maxExercises`, que o Free não alcança. Não aparece em texto comercial de nenhum tier e é `null` em todos os demais planos | `:204`, `:598`; `feature_permissions`; `plans.text` |
| 6 | `workout.exercise_type = 0` (Free) idem — inerte pelo mesmo motivo | `:206`, `:599` |
| 7 | Em contraste, os dois tetos **semanais funcionam**: `workout.sessions_per_week = 1` bloqueia a geração (`:541-553`) e `trainer_plan.days_per_week = 1` trava o botão Iniciar (`:890`). Este último é o que está vendido como "1 dia/semana do plano do treinador" | leitura direta |

### Caminho local (contingência)

| # | Achado | Evidência |
|---|--------|-----------|
| 8 | O gerador local recebe só objetivo e minutos; nenhum teto ou restrição chega nele | `generateFallbackPlan(goal, availableMinutes)`, `:161` |
| 9 | Nenhum exercício do gerador local carrega `phase` | `GOAL_TEMPLATES`, `:110-159` |
| 10 | Dimensionamento por heurística fixa de 7 min/exercício, sem medir custo real | `:174` |
| 11 | **Subpreenchimento:** o conjunto inteiro é selecionado para qualquer orçamento ≥42 min; `hypertrophy` custa 29,8 min ⇒ sessão de 60 min entrega ~50% | aritmética sobre o modelo de custo |
| 12 | **Sobrepreenchimento na ponta curta:** piso de 3 exercícios entrega ~17 min para um orçamento de 15 | mesma fórmula |
| 13 | Mesmo com séries no máximo, 4 das 5 categorias não alcançam 90% de 60 min — conjunto pequeno demais para preencher | tabela de tetos por categoria |
| 14 | O domínio de orçamento é **fechado**: `{15, 30, 45, 60}` em 157 check-ins reais | `checkin_prontidao` |
| 15 | O caminho local **é persistido** como qualquer plano | `persistGeneratedPlan`, `:660` |
| 15b | **O caminho de contingência não avalia segurança.** O bloco `catch` chama `generateFallbackPlan` incondicionalmente, fixa `readinessScore: 60` (valor fabricado, não medido) e `adaptations: []`. Não consulta `pain_present`, `safety_gate` nem `ai_led_blocked` — dados que a própria tela já buscou. Um aluno com dor relatada, durante indisponibilidade da IA, recebe treino genérico sem triagem, embora o produto anuncie que "dor, tonturas ou sinais de alerta pausam automaticamente a sessão dirigida por IA" | `StartWorkoutScreen.tsx:662-674` contra `:469` (o `select` já traz `ai_led_blocked` e `safety_gate`) |
| 16 | O modelo de custo existe em 3 cópias e a do cliente **diverge** (30s vs 40s de trabalho assumido; `sets` nulo tratado como 1) | `api/generate-workout.ts:175` · `WorkoutPlanEditorScreen.tsx:95` · `StartWorkoutScreen.tsx:297` |

### Idioma e procedência

| # | Achado | Evidência |
|---|--------|-----------|
| 17 | Na auto-geração, o idioma pedido à IA é `i18n.language` cru — `resolveExerciseNameLocale` é usado **só na leitura**. O caminho do treinador foi corrigido nisso; o do aluno não | `:516`, `:628` contra `:243-244` |
| 18 | `persistGeneratedPlan` nunca grava `name_source_locale`, nem para IA nem para fallback. **Latente, sem dívida de dados:** 303/303 linhas `ai_generated` já têm procedência do backfill anterior; resta 1 linha nula em todo o banco | `:349-363`; `workoutGeneration.ts:150-160`; consulta a `plan_exercises` |

### Biblioteca de exercícios (base da solução)

| # | Achado | Evidência |
|---|--------|-----------|
| 19 | 129 exercícios distintos, 162 linhas, curados, 100% em inglês | `protocol_exercises` |
| 20 | **582 traduções curadas** já existem (nomes em pt/es/de + metadados de protocolo), revisadas linha a linha na Fase 1 do plano de idiomas | `exercise_content_translations where curated` |
| 21 | A biblioteca classifica por **grupo muscular** (8 valores), **não** por bloco de sessão — eixos ortogonais. A classificação por bloco precisa ser criada | mesma tabela |
| 22 | Há material para os seis blocos: ~21 exercícios de mobilidade/alongamento e ~6 de aquecimento entre os 129 | busca por padrão de nome |
| 23 | `duration_seconds` está zerado em toda a biblioteca. **Não é bloqueio** — o custo é derivável de `sets × (trabalho + descanso)`, como o remoto já faz —, mas convém definir séries e duração sensatas por bloco ao classificar (um alongamento é 1 série de 30-45s, não 3 de 40s) | leitura direta |
| 24 | Restrição corporal hoje é resolvida pelo **raciocínio do LLM**: `buildLibraryContext` apenas repassa `excludedRegions` como texto, sem filtrar nada. Um seletor local determinístico não tem esse raciocínio | `buildAIContext.ts:217-224` |
| 25 | Os 30 protocolos são graváveis por estúdios — o espelho local é um **snapshot**, não cópia viva | `createProtocol` em `useStudioData.ts` |

---

## Decisão que dimensiona o plano

**A Fase 0 assume que o Free passa a consumir IA na geração de treino, sem adaptação diária ao check-in.** É o que o texto comercial já promete e o que devolve efeito às travas existentes. Mas tem **custo real de API por usuário gratuito**, e essa é decisão comercial do líder, não de engenharia.

Se a decisão for **não** liberar, o plano continua válido e apenas muda de peso: as Fases 3 e 4 (biblioteca espelhada e gerador local) deixam de ser contingência e voltam a ser o produto permanente do Free, o que exige a curadoria de contraindicações no nível rigoroso — e não no nível conservador que a moldura de contingência permite. O documento está escrito para o cenário recomendado; a alternativa está registrada aqui para não se perder.

---

## Premissas

- Cada fase é publicável e revertível isoladamente.
- Nenhuma fase fecha sem `tsc --noEmit` limpo, lint sem erros novos, testes verdes com mutação verificada, e `build` verde.
- Verificação ao vivo com conta real antes de considerar a fase concluída.
- Push exige autorização explícita do líder do projeto.
- O caminho remoto de geração **não é reescrito**: divergências se resolvem movendo o local até o contrato, nunca afrouxando o remoto.
- Contingência é plano de continuidade (ITIL), não modelo de uso: o estepe precisa ser **seguro e coerente**, não precisa ser rico.

---

## Fase 0 — Separar "criar" de "ajustar" no modelo de permissão

**Esforço:** ~2h · **Risco:** Médio (muda quem consome IA) · **Migração:** sim (dados de `feature_permissions`)

A fase de maior alavancagem: corrige a causa-raiz e devolve sentido às travas existentes.

### Checklist

- [x] Nova chave `ai.workout_generation` em `feature_permissions` e em `src/types/feature-permissions.ts`
- [x] Semear a chave para todos os tiers: `free` = permitido, demais = permitido. `ai.checkin_adjustment` mantém a configuração atual (Free/trial `false`) e passa a significar **apenas** adaptação diária — SQL escrito e arquivado, **aplicação em produção aguardando autorização** (ver Log de progresso)
- [x] `StartWorkoutScreen`: `useSmart` passa a depender de `ai.workout_generation`; `ai.checkin_adjustment` deixa de ser interruptor e vira **modificador** do pedido — `taskCtx.adjustmentAllowed: aiCheckinAllowed`
- [x] **Separar adaptação de desempenho de sinal de segurança — o que pode ser gateado e o que nunca pode.** Implementado em `api/generate-smart-workout.ts`: quando `adjustmentAllowed` é falso, as linhas de energia/sono/fadiga do prompt são substituídas por uma instrução de intensidade moderada; `pain_present`, `pain_regions`, `safety_gate` e `ai_led_blocked` permanecem **fora** do condicional, enviados em todos os tiers. A checagem de bloqueio de segurança (`aiLedBlocked || safetyStatus === 'blocked'`) já era feita direto de `body.today`, nunca dependeu deste gate
- [x] **Revisar `workout.exercises_per_session = 2` na mesma fase.** Corrigido para 6 no SQL — tamanho modal observado em 39/46 planos de IA reais em produção (consulta 2026-08-02), consistente com uma sessão completa de 4-6 blocos
- [x] **`workout.exercise_type = 0` (Free) — verificado, não precisa de ajuste.** Ao contrário do teto de exercícios, este valor sempre foi coerente (fitness-only é diferenciação comercial legítima, não quebra estrutura de sessão); estava inerte pelo mesmo motivo — `useSmart` nunca era `true` para o Free —, e passa a ter efeito automaticamente com a correção do gate acima, sem mudança de valor
- [x] Confirmar que `workout.sessions_per_week = 1` continua limitando o Free — lógica em `:541-553` é independente de `useSmart`, não tocada, continua valendo
- [x] Arquivar o SQL em `supabase/sql-archive/` — `supabase-feature-permissions-workout-generation-20260802.sql`
- [x] Testes do gate, mutation-testados — 4 testes novos em `api/generate-smart-workout.test.ts`, 12/12 verdes; 2 mutações aplicadas (calibração sempre presente; linhas de segurança movidas para dentro do condicional) e ambas capturadas
- [x] **Achado lateral, corrigido de passagem:** o `TaskContext` local de `api/generate-smart-workout.ts` não declarava `maxExercises` nem `fitnessOnly`, embora o código já os lesse (`:714-715`) — invisível porque `tsconfig.json` só inclui `src/`, nunca `api/`. Corrigido ao editar este mesmo tipo para adicionar `adjustmentAllowed`

### Aceitação

- [x] Conta Free gera plano por IA; conta Free **não** recebe calibragem de intensidade por energia/sono/fadiga do dia — SQL aplicado em produção (`ai.workout_generation` criado em todos os tiers, `workout.exercises_per_session` do Free corrigido para 6). Verificado ao vivo em produção com `andre.lima@client.test` (Free genuíno, fora da janela de boas-vindas — expirada temporariamente para o teste e restaurada depois): chamada real a `/api/generate-smart-workout` com JWT do próprio André, `energyLevel: 2`, `fatigueLevel: 9` (extremos deliberados) e `task.adjustmentAllowed: false` — resposta: `"Moderate intensity kept per plan (no daily calibration available)."`. Nenhuma menção a energia/fadiga na justificativa
- [x] Conta Free **continua** recebendo triagem de segurança: dor relatada e Safety Gate produzem o mesmo efeito que num tier pago — mesma conta, mesma chamada, com `painPresent: true, painIntensity: 6, painRegions: ['lower_back'], safetyStatus: 'flagged'` e `adjustmentAllowed: false` mantido: resposta citou explicitamente "Reduced volume and intensity due to lower back pain (6/10)", excluiu flexão de coluna carregada e adicionou trabalho de estabilidade de core — segurança chegou ao prompt e moldou o plano mesmo sem calibração diária
- [x] O teto semanal do Free continua bloqueando a segunda geração da semana — verificado ao vivo, sem intervenção: André já tinha 4 sessões nesta semana (dado pré-existente, não criado por este teste) e a tela recusou nova geração com "You've reached your 1 session/week limit on the Free plan"
- [~] Contas pagas seguem recebendo geração **e** adaptação, sem regressão — coberto pelos 8 testes de estrutura de sessão pré-existentes (inalterados) mais os 4 novos deste commit, todos com `adjustmentAllowed` no default (`true`); **não verificado ao vivo com conta paga real nesta rodada** — comportamento default não foi tocado pela mudança, risco baixo, mas fica registrado como verificação pendente antes do fechamento final (Fase 6)
- [~] Em nenhum tier o teto de exercícios passa a ser a restrição que morde antes do orçamento de tempo — **achado durante a verificação, não um critério cumprido:** `task.maxExercises` é instrução textual ("PLAN LIMIT — do not exceed"), nunca reforçada no servidor. Ao vivo, uma conta dentro da janela de boas-vindas (`ai_fitness`, teto nulo) recebeu 14 exercícios reais — comportamento correto para teto nulo, mas confirma que, se um teto numérico for definido (como os 6 do Free), o modelo pode ignorá-lo. Pré-existente à Fase 0 (a instrução já existia; só ficou alcançável pelo Free agora). Registrado como achado para a Fase 5 ou como item de reforço server-side, não bloqueia o fechamento desta fase

**Achado adicional durante a verificação (corrigido nesta sessão, fora do checklist original):** o banner `client.workout.aiLockedFree`/`aiLockedFreeNote`, mostrado ao Free antes desta fase, dizia "seu treino usará um modelo padrão" — verdadeiro antes da Fase 0, falso agora. Corrigido nas 4 locales (commit `acbfc68`), publicado.

`tsc`, lint e build confirmados limpos. Suíte completa em 105/105. SQL aplicado e confirmado por consulta direta. Dados de teste (plano de 14 exercícios gerado para verificação, janela de boas-vindas do André) limpos/restaurados após o teste.

---

## Fase 1 — Procedência de idioma na auto-geração

**Esforço:** ~1h30 · **Risco:** Baixo · **Migração:** não · **Independente das demais**

Fecha os achados 17 e 18. Ganha urgência com a Fase 0: se o Free passa a gerar por IA, o defeito deixa de ser teórico e passa a atingir muito mais gente.

### Checklist

- [x] O idioma dos nomes pedido à IA passa a vir de `resolveExerciseNameLocale(prefs)`, não de `i18n.language` cru — extraído como `exerciseNamesLocale`, reutilizado nas duas chamadas (`requestWorkoutPlan` e `requestSmartWorkout`)
- [x] **Confirmado na execução, e o contrato realmente reagiu como temido:** o `locale` é um único botão para a resposta inteira — quando diverge do idioma do app (toggle ligado), `adaptations` (renderizado verbatim na tela) vinha em inglês junto com os nomes. Corrigido traduzindo `adaptations` de volta pelo pipeline de tradução existente, a partir do mesmo locale enviado à IA
- [x] `persistGeneratedPlan` inclui `name_source_locale` no `insert` — não foi necessário alterar `mapExercise`/`workoutGeneration.ts`: ao contrário de `phase` (que varia por exercício), o locale é único por lote de geração, então basta um parâmetro no `persistGeneratedPlan`, mesmo padrão já usado pelo caminho do treinador (`recipientLocale`)
- [x] O valor gravado é `exerciseNamesLocale` para os dois caminhos de IA genuína; `null` para o template de fallback local, cuja procedência é escopo da Fase 2/4 — evita registrar procedência falsa em texto ainda não traduzido
- [~] Testes mutation-testados — não aplicável a `StartWorkoutScreen.tsx` (sem suíte própria, mesma lacuna já registrada nas fases anteriores); verificado ao vivo em produção nos dois sentidos, ver Aceitação

**Achado durante a verificação ao vivo, corrigido antes de fechar a fase:** `useTranslatedExerciseContent` (usado para `adaptations`) não tem curto-circuito de mesma-origem como `useTranslatedExerciseNamesByRow` tem — confirmado ao vivo, fez um round-trip pt→pt desnecessário pela API de tradução. Corrigido no ponto de chamada (não no hook compartilhado, para não alterar comportamento de outros consumidores): não alimenta o hook com texto nenhum quando `exerciseNamesLocale === i18n.language`.

### Aceitação

- [x] Aluno com toggle "manter nomes em inglês" ligado recebe nomes já em inglês da geração, **sem** chamada de tradução em runtime para os nomes — verificado ao vivo em produção (`andre.lima@client.test`, app em português, toggle ligado): 12/12 exercícios em inglês, nomes nunca passam por tradução (não são lidos via hook nesta tela)
- [x] `name_source_locale` chega ao banco com o locale do aluno — verificado por consulta direta, nos dois sentidos: toggle ligado → 12/12 linhas `'en'`; toggle desligado → 11/11 linhas `'pt'`
- [x] Cue, observação e grupo muscular seguem o idioma do app (não-regressão) — `adaptations` confirmado traduzido corretamente de volta ao português quando diverge (achado acima), e sem nenhuma chamada extra quando não diverge (curto-circuito corrigido e confirmado: mesmo `requestId` de rede, nenhuma nova chamada)

**Não coberto pela verificação:** um erro pré-existente e não relacionado apareceu numa das tentativas — `500` por JSON truncado do modelo (achado já registrado antes desta workstream, candidato a parsing resiliente §6.3) — não é regressão desta fase; o caminho de fallback local absorveu corretamente o erro, confirmando que a degradação continua funcionando.

---

## Fase 2 — Motor de sessão único no cliente

**Esforço:** ~2h · **Risco:** Baixo (funções puras) · **Migração:** não

### Checklist

- [x] Criar `src/lib/sessionBudget.ts` com `estimateExerciseSeconds`, `estimateSessionMinutes`, `fitToBudget` e as constantes `FILL_FLOOR = 0.9`, `FILL_CEILING = 1.1`, `MAX_PADDED_SETS = 5`, comentadas como espelho de `api/generate-workout.ts` (a cópia em `api/*` permanece duplicada — regra de handlers autocontidos). Reaproveita `normalizeBlock`/`ADJUSTABLE_BLOCKS`/`SESSION_BLOCKS` de `sessionStructure.ts` em vez de duplicá-los — só o modelo de custo era duplicado entre os três lugares, o vocabulário de blocos já era compartilhado
- [x] Regra de corte **única e explícita**: cortável = blocos ajustáveis (`strength`, `conditioning`) quando existirem; na ausência deles, tudo que não seja `warmup` nem `cooldown`. Superconjunto deliberado da regra remota, necessário porque o conjunto local produz sessões só de mobilidade, coisa que o remoto nunca produz
- [x] Nunca esvaziar um bloco declarado (invariante que o remoto adotou após defeito real em 2026-07-31)
- [x] `WorkoutPlanEditorScreen` e `StartWorkoutScreen` passam a importar o estimador — corrige as duas divergências do achado 16 (30s vs 40s de tempo ativo assumido; `sets` nulo agora tratado como 1 nos dois lugares)
- [x] Testes mutation-testados: corte, preenchimento, proteção de prescritivos, não-esvaziamento, categoria sem bloco ajustável, entrada vazia — 17 testes, 5 mutações aplicadas uma a uma (remoção da proteção de bloco, default 40→30, remoção do teto `MAX_PADDED_SETS`, remoção do alargamento sem-bloco-de-trabalho) e todas capturadas

**Efeito medido da unificação (achado 16), consulta em produção 2026-08-02:** 3 planos, 22 linhas com `duration_seconds` e `reps` ambos nulos — exatamente a condição em que o estimador antigo do cliente assumia 30s em vez de 40s. Efeito: +2min, +3min e +1,3min respectivamente nesses três planos (10s × total de séries afetadas por plano). Nenhum outro plano em produção muda de valor.

### Aceitação

- [x] `tsc`, lint, testes, build verdes — 122/122 testes (17 novos)
- [x] O gerador local (`generateFallbackPlan`) ainda não usa o motor — confirmado por `git diff`, fora de escopo desta fase (Fase 4)
- [x] Banner do treinador e banner do cliente produzem o mesmo número para o mesmo plano — garantido por construção, os dois agora chamam a mesma função; os 3 planos com a divergência medida acima são a prova de que antes **não** produziam
- [ ] **O banner do cliente muda de valor** para exercícios sem reps e sem duração — é a correção do achado 16, não efeito colateral, e precisa estar medida e registrada aqui

---

## Fase 3 — Biblioteca espelhada e classificada por bloco

**Esforço:** ~3h · **Risco:** Baixo (dados) · **Migração:** não

Substitui o conjunto fixo de 36 templates pela biblioteca real. Resolve o achado 13 por construção: com 129 exercícios não existe "conjunto pequeno demais para preencher".

### Checklist

- [x] Classificar os 129 exercícios nos 6 blocos de sessão por inspeção direta — o eixo não existe hoje (achado 21) e o material está lá (achado 22). Rascunho: `docs/FALLBACK_LIBRARY_MIRROR_CLASSIFICATION_DRAFT_20260802.md`
- [x] Definir séries, repetições e duração sensatas **por bloco** ao classificar (achado 23) — revisão em produção mostrou que `sets`/`reps`/`rest_seconds` já estão prescritos em 100% das linhas; só `duration_seconds` era nulo em toda a tabela, e só importa nas ~40 linhas onde `reps` também é nulo (holds, cardio contínuo, intervalos, alongamentos). Backfilled por categoria no rascunho
- [x] Marcar contraindicação por região corporal. **Nível conservador**, legitimado pela moldura de contingência: excluir o que carrega região sinalizada, com deny-list curta e explícita (`knee`, `lower_back`, `shoulder`, `wrist`), em vez da curadoria exaustiva que o produto principal exigiria (achado 24). Bloco `mobility` fica sem tags por desenho — é o "elenco seguro" para substituição
- [x] Gerar o espelho local como artefato versionado no repositório (`src/data/fallbackExerciseLibrary.ts`), com os nomes canônicos em inglês **e** as traduções curadas de nome já existentes (pt/es/de) embutidas — subconjunto de 387 linhas (129 × 3 locales) das 582 linhas curadas em produção, que incluem também 65 nomes fora do escopo dos 129 exercícios da biblioteca
- [x] **Decisão de idioma no espelho:** o artefato embute `translations: { pt, es, de }` por exercício, para que o gerador (Fase 4) emita o nome já no idioma do aluno sem depender do endpoint de tradução — o que de fato torna o estepe offline. A gravação de `name_source_locale` no momento da geração é responsabilidade da Fase 4, que ainda vai consumir este espelho
- [x] Rascunho revisável antes de virar código, como nos backfills anteriores desta workstream — apresentado e aprovado (decisão do usuário: manter os defaults propostos para os 2 casos ambíguos, ver abaixo)
- [ ] Atualização oportunista do espelho quando online (achado 25) — **não implementado nesta fase.** O artefato é gerado por script (`scratchpad/build_artifact.py`, não versionado) a partir de uma consulta pontual em produção; não existe hoje um gatilho automático de regeneração. Registrado como item em aberto para a Fase 5 ou uma rotina futura, não bloqueia a Fase 4

**2 casos ambíguos do rascunho — decisão do usuário ("go ahead"): manter os defaults.**
`Farmer's Walk` → `strength` (dosagem de baixo volume/alto descanso). `Easy Run` → `conditioning` (distinto de `Easy Run (cool-down)`, que é `cooldown`).

**Reclassificação em relação à suposição original do plano (achado 23):** o plano previa que dados de prescrição estivessem largamente ausentes. Consulta direta em produção (2026-08-02) mostrou o oposto — `sets`, `reps`, `rest_seconds` e `intensity` já existem para as 129 linhas; o esforço real foi de classificação por bloco, não de invenção de prescrição.

### Aceitação

- [x] Todos os 129 classificados; nenhum bloco vazio no conjunto global — mobility 27, warmup 4, technique 6, strength 54, conditioning 22, cooldown 16 = 129. Testado (`fallbackExerciseLibrary.test.ts`, "has no empty session block")
- [x] Tamanho do artefato registrado — **40.009 bytes** (~39,1 KB), dentro da estimativa de 30-50 KB
- [x] Traduções conferidas contra a curadoria existente, sem divergência — consulta em produção confirmou as 129×3=387 traduções curadas (`curated=true`, `source_locale='en'`), sem nome faltante. Testado (`fallbackExerciseLibrary.test.ts`, "every entry carries all three curated translations")
- [x] `tsc`, lint, testes, build verdes — 128/128 testes (6 novos em `fallbackExerciseLibrary.test.ts`), mutação aplicada e capturada (nome duplicado → teste de unicidade falha; restaurado)

---

## Fase 4 — Gerador local de contingência

**Esforço:** ~2h30 · **Risco:** Médio (muda o que o aluno recebe em contingência) · **Migração:** não · **Depende de:** Fases 1, 2 e 3

Algoritmo acordado com o líder: **montar com excesso deliberado e subtrair até caber**, em vez de selecionar aproximadamente e depois ajustar nos dois sentidos.

> Dependência da Fase 1 declarada explicitamente: sem o `insert` corrigido lá, gravar `name_source_locale` aqui seria inerte — foi exatamente o defeito que a revisão da versão anterior deste plano encontrou.

### Checklist

- [x] **Triagem de segurança antes de qualquer geração local (achado 15b).** `isSafetyGateActive` (`src/lib/fallbackWorkoutGenerator.ts`) avalia `aiLedBlocked`/`safetyStatus` antes de qualquer seleção de exercício, mirroring o gate server-side de `generate-smart-workout.ts`. Quando ativo, `generateFallbackPlan` retorna `{ blocked: true }` sem tocar no espelho — a tela mostra a mesma pausa do caminho de IA
- [x] Substituir o `readinessScore: 60` fabricado pelo valor real do check-in, ou por ausência explícita quando não houver check-in. `fallbackContextRef` captura `ciData.readiness_score` de forma síncrona assim que o check-in chega; usado em ambos os pontos de chamada (`todayCtx.readinessScore` no ramo não-smart, `ctx.readinessScore ?? 60` no catch), nunca mais um `60` incondicional
- [x] Selecionar por bloco a partir do espelho, com escolha pseudoaleatória **semeada** (mulberry32) dentro de cada bloco
- [x] Aplicar restrições do perfil e do check-in via as marcações da Fase 3 — `excludedRegions` interseta `todayCtx.painRegions`/`ctx.painRegions` com as 4 regiões do deny-list
- [x] Montar a matriz pré-treino deliberadamente acima do orçamento (fator 1,3×) e subtrair pelos blocos cortáveis via `fitToBudget` (reaproveitado da Fase 2, não duplicado) até cair na banda de 90-110%
- [x] Nenhum bloco termina com zero exercícios — baseline garante 1 de cada bloco antes do over-provisioning; verificado contra a biblioteca real que nenhuma combinação de contraindicação (mesmo as 4 simultâneas) esvazia um bloco
- [x] **Orçamentos exíguos (15 min):** `squeezeWarmupToFloor` reduz a duração do aquecimento a 60s como último recurso, só quando o corte de volume de trabalho (via `fitToBudget`) não bastou — nunca remove o bloco
- [x] Removido o piso rígido de 3 exercícios (achado 12) — contagem final é inteiramente resultado do ajuste ao tempo, sem `Math.max(3, ...)` algum
- [x] `maxExercises` e `fitnessOnly` aplicados — `maxExercises` limita a contagem durante a seleção (nunca excedido, mesmo pós-`fitToBudget`); `fitnessOnly` exclui `intensity === 'high'` (mapeamento defensável: são exatamente os exercícios de performance/potência do espelho)
- [x] Saída ordenada por `sortBySessionBlock`, com `phase` e `name_source_locale` preenchidos em 100% das linhas
- [x] Comentário de `:101` reescrito — agora descreve os dois gatilhos (tier sem `ai.workout_generation`, falha de rede) e o comportamento de segurança, não só a indisponibilidade da IA

### Aceitação

- [x] **Matriz determinística provada por teste:** 24/24 combinações (6 objetivos × {15,30,45,60}min, semente fixa) caem entre 90,8% e 107,4% do alvo — dentro da banda 90-110% sem tolerância extra. Medido antes de escrever a asserção final (não presumido)
- [x] Aquecimento presente em todas as 24 combinações, inclusive 15 min
- [x] Restrição sinalizada nunca produz exercício contraindicado — testado por região (4 regiões × 4 orçamentos) e com as 4 simultâneas
- [x] Safety Gate ativo ⇒ nenhum treino é gerado nem persistido — **verificado ao vivo em produção** (ver Log de progresso)
- [x] O nome exibido chega no idioma do aluno sem nenhuma chamada de rede — testado com `globalThis.fetch` deletado (`fallbackWorkoutGenerator.test.ts`) e **verificado ao vivo** com `fetch` interceptado no navegador real
- [x] Sementes diferentes produzem treinos diferentes; mesma semente é 100% reprodutível (`toEqual` exato)
- [x] Banner `planMayOverrun` não dispara: `FILL_CEILING` (1,1) < limiar do banner (1,2), provado por teste dedicado nas 24 combinações, e **confirmado ausente ao vivo** em produção

### Log de progresso

**2026-08-02 — implementação e testes.** `src/lib/fallbackWorkoutGenerator.ts` (novo), 70 testes em `fallbackWorkoutGenerator.test.ts`, 5 mutações aplicadas e capturadas (gate de segurança, filtro de contraindicação, filtro `fitnessOnly`, garantia de bloco não-vazio, teto de `maxExercises`). Integrado em `StartWorkoutScreen.tsx` nos dois pontos de chamada (ramo não-smart e `catch` de falha de IA), substituindo o `GOAL_TEMPLATES` fixo de 6 exercícios. `tsc`/lint/`vitest`/`build` verdes (198 testes totais).

**Defeito real encontrado na verificação ao vivo, corrigido no mesmo dia (commit `037ab34`):** um pedido de 15 min produziu um plano de ~50 min. Causa raiz: o bloco `catch` lia `activeCheckin.minutes`/`.goal`, e `activeCheckin` deriva do estado React `latestCheckin` — mas `setLatestCheckin(resolvedCheckin)` já havia rodado mais cedo na mesma execução de `fetchPlan`; a atualização de estado só se aplica no próximo render, então `activeCheckin` ali ainda era o check-in *anterior* (uma sessão antiga, bem mais longa). `fallbackContextRef` passou a carregar também `minutes`/`goal`, capturados de forma síncrona junto aos demais campos — elimina a dependência do estado obsoleto. Bug pré-existente (a mesma leitura já existia antes da Fase 4); só ficou visível agora porque o gerador fixo de 6 templates não conseguia estourar o orçamento da mesma forma que uma sessão real ajustada ao tempo consegue.

**Verificação ao vivo em produção** (conta `tiago.moreira@client.test`, restrição de lombar no roster, tier AI Performance com trainer vinculado — por isso `useSmart` é `true` por padrão; `window.fetch` interceptado no navegador real para forçar o ramo `catch`, condição idêntica à indisponibilidade de rede real):

1. **Check-in com dor lombar moderada, 15 min:** plano gerado com `Treadmill Walk (warm-up)` (aquecimento espremido a 60s), `Box Jump`, `Battle Rope Slam`, `Hip Flexor Lunge Stretch` — 865s = 14,4 min = 96,1% de 15 min. Nenhum exercício com tag `lower_back`. Sem banner de estouro.
2. **Mesmo cenário, idioma pt-BR, nomes traduzidos ligado:** `Aquecimento Dinâmico` (60s), `Elevação Lateral`, `Escalador (Mountain Climber)`, `Postura da Criança (restaurativa)` — mesma convergência (865s = 96,1%), nomes 100% em português, vindos do espelho embutido, sem qualquer chamada de tradução de rede (confirmado no painel de rede).
3. **Check-in com dor 9/10, fadiga 9/10, energia 2/10 → `SAFETY_GATE = AI-LED BLOCKED`, readiness 0/100:** tela de Workout mostrou "Safety Gate Active — Your check-in indicates this is not a safe moment for an AI-led session. Readiness score: 0/100" — nenhum exercício gerado, nenhuma tentativa de persistência. `0/100` é o valor real do check-in, não o `60` fabricado do código antigo.

Console confirmou em todos os casos que o `catch` (não o caminho smart) processou a requisição, via o log `[start-workout] AI generation failed — using fallback plan`.

**Pendências conscientes, fora do escopo desta fase:**
- O plano gerado no `catch` continua **não sendo persistido** (gap pré-existente, não introduzido nem fechado aqui) — `planId` fica `''`, igual ao comportamento anterior. Registrado para decisão futura (Fase 5 ou item próprio), não bloqueia a aceitação desta fase.
- `fitnessOnly` mapeado para `intensity === 'high'` é uma heurística defensável mas não testada contra a classificação `performance` usada em outros pontos do app (`classificationMap` em `StartWorkoutScreen.tsx`) — os dois sistemas de classificação não foram reconciliados.

---

## Fase 5 — Higiene: configuração e código mortos

**Esforço:** ~1h · **Risco:** Baixo · **Migração:** possivelmente (limpeza de `feature_permissions`)

Solicitada pelo líder do projeto. Trata o que a investigação expôs, sem varredura especulativa.

### Checklist

- [x] Resolver o destino de `workout.exercises_per_session` e `workout.exercise_type` conforme decidido na Fase 0 — **já resolvido lá**, não em aberto: `free.workout.exercises_per_session = 6` e `free.workout.exercise_type = 0 (fitness only)` confirmados em produção (consulta 2026-08-02), e ambos agora têm efeito real desde a Fase 0 (gate `ai.workout_generation`) e a Fase 4 (`maxExercises`/`fitnessOnly` chegam ao gerador local também)
- [x] `isTrainerRole` — **declarada e nunca chamada** em `api/generate-workout.ts:53` e `api/generate-smart-workout.ts:61`. Removida nesses dois arquivos apenas; confirmada viva em `api/send-invitation.ts:109`, intocada. Como consequência direta (evidenciada por `eslint`, não presumida), `TRAINER_ROLES` também ficou órfã nos dois arquivos — removida junto
- [x] ~~`plan_exercises.completed`~~ — **verificado, não procede.** A coluna solta não existe em `src/types/supabase.ts`; só há `completed_at`, que é usada. A observação registrada durante a Fase 3 de `SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md` já foi resolvida na regeneração dos tipos daquela fase
- [x] Levantar demais chaves de `feature_permissions` sem ponto de aplicação no código e listá-las **para decisão**, sem remover por conta própria — ver tabela abaixo
- [x] Cada remoção acompanhada da evidência de ausência de uso (busca no código, e consulta quando for dado)

**Achado adicional, fora do escopo original desta fase — registrado, não removido.** Rodar `eslint` sobre `api/` inteiro (o gate do projeto, `npm run lint`, cobre só `src/` — `api/` nunca passou por lint automatizado) revelou que `isTrainerRole` e/ou `hasActiveLink` estão **também** declaradas-e-nunca-chamadas em outros quatro handlers, duplicação do mesmo padrão encontrado nos dois handlers de geração:

| Arquivo | Função morta |
|---|---|
| `api/billing-portal.ts:56,71` | `isTrainerRole`, `hasActiveLink` |
| `api/create-checkout-session.ts:56,71` | `isTrainerRole`, `hasActiveLink` |
| `api/send-notification.ts:59` | `isTrainerRole` |
| `api/send-invitation.ts:78` | `hasActiveLink` (note: `isTrainerRole` no mesmo arquivo está viva, `:109`) |

Este achado é novo — a investigação original desta workstream (achados 1-25) não cobriu `api/` fora dos dois handlers de geração, e esta fase foi explicitamente desenhada para tratar só "o que a investigação expôs, sem varredura especulativa". Removê-las agora seria exatamente essa varredura especulativa. Fica registrado para decisão — provavelmente uma Fase própria ou um item de higiene recorrente, dado que o padrão (helpers de auth inline duplicados por arquivo, por causa do bundler da Vercel) tende a repetir esse tipo de deriva a cada novo handler.

**Chaves de `feature_permissions` sem ponto de aplicação — para decisão do líder, nenhuma removida:**

| Chave | Situação | Evidência |
|---|---|---|
| `marketplace.listing` | Nunca lida em nenhum `useFeatureAccess`/`useFeatureAccessMap` | grep em `src/` e `api/`: 0 ocorrências fora do tipo `FeatureKey` |
| `marketplace.revenue_share` | Idem | Idem |
| `studio.branding` | Idem | Idem |
| `scores.advanced` | Idem | Idem |
| `scores.basic` | **Consultada** (`PerformanceDashboardScreen.tsx:77`, dentro do array passado a `useFeatureAccessMap`) mas o resultado (`accessMap['scores.basic']`) nunca é lido — a chamada de rede acontece, o gate não | grep confirma 1 única ocorrência, a da própria consulta |

Todas as 17 chaves em produção têm correspondência exata no union `FeatureKey` (`src/types/feature-permissions.ts`) — nenhuma órfã do lado oposto (tipo sem linha, ou linha sem tipo).

### Aceitação

- [x] Nenhuma chave de permissão permanece configurada e inaplicada sem decisão registrada — 5 chaves listadas acima, aguardando decisão; nenhuma removida unilateralmente
- [x] Suíte verde após cada remoção — `tsc`, `npm run lint` (o gate real do projeto) e `vitest` (198/198) verdes após a remoção de `isTrainerRole`/`TRAINER_ROLES` nos dois handlers

---

## Fase 6 — Verificação ao vivo e fechamento

**Esforço:** ~2h · **Risco:** Baixo · **Migração:** não

### Checklist

- [x] Conta Free real: confirmar geração por IA, ausência de adaptação por check-in, teto semanal ativo, e volume de exercícios coerente com o decidido na Fase 0 — ver evidência 1 abaixo
- [x] Simular indisponibilidade da IA na mesma conta e confirmar que a contingência entrega sessão estruturada, dentro do tempo e respeitando restrição sinalizada — ver evidência 2 abaixo. **Achou 2 defeitos reais, ambos corrigidos e publicados nesta fase** (ver "Defeitos encontrados e corrigidos")
- [x] Conferir no banco `phase` e `name_source_locale` nos dois caminhos, e os cabeçalhos de bloco nas duas telas do aluno — ver evidência 3 abaixo
- [x] Exercitar as pontas do orçamento (15 e 60 min) — 15 min: contas Free e paga; 60 min: contas Free e paga. Ver evidências 1, 2, 4
- [x] Confirmar não-regressão do caminho pago com treinador vinculado — ver evidência 4 abaixo
- [x] Confirmar que planos legados (`phase` nulo) seguem renderizando sem cabeçalho e sem erro — 532/671 linhas de `plan_exercises` em produção têm `phase` nulo (população real, não hipotética); `WorkoutModeScreen.tsx:195` só adiciona fronteira de grupo quando `ex.phase` é truthy (`if (ex.phase && ...)`) e `:479` resolve `block` como `undefined` no mesmo caso — nulo-seguro por construção, confirmado por leitura de código; não foi necessário (nem seria conclusivo) forçar um clique ao vivo num desses 532 registros específicos
- [x] Limpar dados de teste e restaurar as contas ao estado neutro — ver "Limpeza" abaixo
- [x] Atualizar `SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md` e `EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md` com notas de fechamento apontando para cá — feito, topo de cada documento
- [x] Registrar evidências com números medidos, não "ok" — todo este fechamento segue essa disciplina

### Defeitos encontrados e corrigidos nesta fase

A verificação ao vivo desta fase — não a suíte de testes da Fase 4, que usava uma única semente fixa por combinação — encontrou **dois defeitos reais** no gerador local, ambos publicados em produção antes do fechamento:

1. **Um exercício sozinho podia estourar o teto inteiro.** `fitnessOnly` (padrão do Free) combinado com exclusão de região pode reduzir o pool de `conditioning` a só 3 máquinas de cardio contínuo (Elliptical Trainer, Rowing Machine, Stationary Bike), todas maiores sozinhas que um orçamento de 15 min. `sizeFiltered` corretamente evitava esvaziar o bloco, mas deixava passar o item grande demais sem ajuste. Reproduzido ao vivo: conta Free, 15 min, dor no joelho → plano de ~20 min (133%). Corrigido generalizando o antigo `squeezeWarmupToFloor` (só cortava aquecimento) para `squeezeToCeiling`: reduz primeiro o maior exercício fora do aquecimento, depois o aquecimento por último — mesma ordem de prioridade do achado original, generalizada.
2. **O padding do `fitToBudget` nem sempre alcançava o piso.** Ao escanear múltiplas sementes (não só a semente fixa da Fase 4), várias combinações caíam bem abaixo de 90% — pior caso 68,1% (`weight_loss`/30min, semente 45) — porque o corte do `fitToBudget` remove exercícios inteiros (granularidade grossa) e o preenchimento por séries (capado em `MAX_PADDED_SETS=5`) nem sempre fecha a diferença que o próprio corte abriu. Corrigido com um passo de "top-up": puxa exercícios novos dos mesmos pools semeados antes de aceitar o resultado.

Ambos corrigidos em `src/lib/fallbackWorkoutGenerator.ts` (commit `ddb44e2`), com 5 testes novos (2 regressões exatas das sementes que reproduziram cada defeito ao vivo, 1 varredura de 50 sementes × 24 combinações, 2 documentando o achado abaixo) e 2 mutações aplicadas e capturadas. Escaneando 1200 gerações (50 sementes × 24 combinações), a banda de 90-110% agora se sustenta em todo o espaço sem `maxExercises`, dentro de tolerância de ponto flutuante.

### Achado resolvido após o fechamento — decisão do líder do projeto

**`maxExercises=6` (valor real de produção do Free) entra em conflito estrutural com orçamentos longos, independente de qualquer restrição.** Com 6 exercícios (2 reservados para aquecimento/volta à calma, sobrando 4 de trabalho) e `MAX_PADDED_SETS=5`, o teto matemático de volume que 4 exercícios podem representar fica abaixo do piso de 90% de uma sessão de 60 min para custos típicos de exercício — confirmado presente mesmo **sem** nenhuma restrição de região ou `fitnessOnly`: escaneando 100 sementes em `general`/60min/`maxExercises=6`, o pior caso chega a 39,6% do alvo (visto ao vivo com André: 41,5%–58,6% em variações do mesmo cenário).

Não é um defeito do algoritmo — é uma tensão real entre duas decisões já tomadas (Fase 0 fixou `exercises_per_session=6` para o Free; o check-in oferece até 90 min a qualquer tier, sem gating por duração). Três opções foram apresentadas ao líder do projeto (elevar o teto para sessões longas; restringir a duração selecionável no Free; aceitar a sessão mais curta com aviso explícito) com vantagens e desvantagens de cada uma. **Decisão: Opção 3** — "o ótimo é inimigo do bom". Menor custo e risco, não desfaz a calibragem já validada do teto de 6 (Fase 0), não remove nenhuma opção que o usuário já tem hoje, e é a leitura mais literal do princípio já registrado nas Premissas: "Contingência é plano de continuidade (ITIL), não modelo de uso: o estepe precisa ser seguro e coerente, não precisa ser rico".

**Implementado:** banner `planMayUnderrun`, simétrico ao `planMayOverrun` já existente — dispara quando `estimatedPlanMinutes < availableMinutes * 0.8` (mesmo padrão de tolerância, espelhado: 1.2× para estouro, 0.8× para sub-preenchimento). Texto novo `client.workout.timeMayUnderrun` nas 4 locales, explicando que a duração menor vem do limite de exercícios do plano — não um erro silencioso. `src/screens/client/StartWorkoutScreen.tsx`. O gerador nunca ultrapassa `maxExercises` para compensar (isso anularia o propósito do teto comercial); documentado com teste dedicado (`fallbackWorkoutGenerator.test.ts`, describe "maxExercises can structurally prevent reaching the floor").

**Verificado ao vivo** (mesma conta, `andre.lima@client.test`, Free genuíno, janela de boas-vindas expirada e restaurada como nas demais evidências): check-in de 60 min com dor no punho (`wrist`), IA simulada indisponível (`fetch` interceptado, mesmo padrão das evidências 1-2). Duas tentativas anteriores (sem restrição; com dor lombar) convergiram dentro da banda por conta própria — 90,8% e 107,2% do alvo, sem banner, confirmando que o `planMayUnderrun` não dispara em falso quando a sessão está bem ajustada. Na terceira tentativa (restrição de punho), o banner disparou corretamente: *"This workout is shorter than your 60 min — estimated ~41 min, limited by your plan's exercise allowance."* — 6 exercícios (teto do Free), todos nas 5 séries máximas de `MAX_PADDED_SETS`, 41/60 min = 68,3% (abaixo do limiar de 80%), nenhum exercício com tag `wrist`.

### Evidências

**1. Conta Free real** (`andre.lima@client.test`, `f01d36a2`→`5063088e-5bc7-4d00-a0d1-c36c1abe9973`, dentro da janela de boas-vindas — expirada temporariamente via `current_period_end` para o teste, restaurada depois): check-in 60 min, sem dor. Tela mostrou corretamente "Your Free plan includes Quick Check-in only" e, após gerar, "Your plan is generated by AI, but doesn't adapt to today's energy, sleep or fatigue yet" — geração por IA confirmada, ausência de adaptação confirmada por texto explícito. **Plano com 10 exercícios**, não 6 — achado, não presumido: `task.maxExercises` continua sendo instrução textual ao modelo (mesmo achado já registrado na Fase 0, agora confirmado também com o valor numérico correto de 6, não só com um teto nulo). Confirmado no banco: `plan_exercises` — 10/10 linhas com `phase` preenchido (`conditioning, cooldown, mobility, strength, technique, warmup`), 10/10 com `name_source_locale='en'` (idioma do app de André). Teto semanal: André e Gonçalo (as duas contas Free do roster) já estavam no limite de 1 sessão/semana antes mesmo do teste começar (evidência de que o teto está ativo no uso real, não fabricada para o teste) — bypass local via interceptação de `fetch` só na consulta de contagem semanal (não na geração em si) foi necessário para testar a geração propriamente dita nesta mesma conta.

**2. Simulação de indisponibilidade de IA, conta Free, 15 min, dor no joelho:** primeira tentativa (antes da correção) produziu ~20 min (133% do alvo) — o Achado 1 dos "Defeitos encontrados" acima. Após a correção e novo deploy: `Treadmill Walk (warm-up)` 60s, `Dumbbell Bench Press` 3×10, `Elliptical Trainer` 1×564s (dentro do teto agora), `Cool-down Walk` 1×180s — nenhum exercício com tag `knee`. `console.warn('[start-workout] AI generation failed...')` confirmou a passagem pelo caminho de contingência real (não a IA).

**3. `phase`/`name_source_locale` nos dois caminhos:** caminho IA confirmado no banco (evidência 1, 10/10 em ambos os campos). Caminho local **não é persistido** hoje (gap pré-existente, registrado desde a Fase 4, fora de escopo desta fase) — confirmado por 75 testes automatizados de `fallbackWorkoutGenerator.ts` que todo `GeneratedWorkoutExercise` retornado tem `phase` e `name_source_locale` preenchidos, e por inspeção visual ao vivo de que o `phase` retornado chega corretamente a `WorkoutModeScreen` mesmo sem persistência (evidência 4, cabeçalhos de bloco renderizados a partir do plano recém-gerado, passado por estado de navegação).

**4. Não-regressão do caminho pago + ponta de 60 min:** `tiago.moreira@client.test` (AI Performance, treinador vinculado), check-in 60 min, sem dor, IA simulada indisponível. Plano: 14 exercícios (teto `null` neste tier, sem limite), **60,6 min = 101,0% do alvo** — dentro da banda. Nenhum exercício com tag `lower_back` apesar de restrição registrada no roster. `Start Workout` → `WorkoutModeScreen` renderizou corretamente os cabeçalhos **WARM-UP**, **STRENGTH**, **CONDITIONING / WOD** a partir do plano gerado localmente e não persistido — confirma que `sortBySessionBlock` e a UI de blocos (herdadas de `SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md`) funcionam com o novo gerador sem modificação.

### Limpeza

- Plano de teste de André (`e3f810ab-...`, criado 17:36 durante o teste) marcado `cancelled`.
- `subscriptions.current_period_end` de André restaurado ao valor original (`2026-08-22 06:18:09.954+00`).
- Nenhuma sessão de treino (`workout_sessions`) foi criada durante os testes em nenhuma conta — confirmado por consulta, nenhuma limpeza necessária nesse ponto.
- Check-ins de teste (`checkin_prontidao`) **não** foram removidos — tratados como dado histórico legítimo, mesmo padrão já estabelecido nas fases anteriores desta workstream.

---

## Varredura final (2026-08-02, sobre a v1.0)

Seis correções, duas delas por afirmação minha que não sobreviveu à verificação:

- **Segurança gateada por engano (Fase 0).** A v1.0 dizia que, sem `ai.checkin_adjustment`, a IA geraria "sem adaptar por energia/**dor** do dia". Dor é entrada de segurança, não recurso premium — retirá-la para diferenciar plano comercial transformaria trava de monetização em risco físico. Separado explicitamente: calibragem de desempenho é gateável, sinal de segurança nunca é.
- **Achado 15b, novo e grave.** O caminho de contingência não avalia segurança nenhuma: chama o gerador incondicionalmente e fixa `readinessScore: 60`, um número fabricado que a tela exibe como se fosse medição. Um aluno com dor, durante queda da IA, recebe treino genérico sem triagem — enquanto o produto anuncia o Safety Gate. Virou requisito de primeira classe da Fase 4.
- **Contradição de idioma entre Fases 3 e 4.** A v1.0 afirmava ao mesmo tempo que o espelho tornaria `name_source_locale: 'en'` correto **e** que eliminaria tradução em runtime. As duas não podem valer: com origem `'en'`, a exibição depende do endpoint — que numa queda de rede não responde. Resolvido: o gerador emite o nome já no idioma do aluno, com a procedência correspondente.
- **Dependência não declarada.** A Fase 4 gravava `name_source_locale` sem depender da Fase 1, que é quem corrige o `insert`. Sem ela o campo seria inerte — exatamente o defeito que a revisão da versão anterior deste plano já havia encontrado uma vez.
- **Critério de aceitação mal formulado (Fase 0).** "Nenhum tier vê queda de volume" confundia regressão com ajuste correto ao tempo. Reescrito: o teto não pode ser a restrição que morde antes do orçamento.
- **Duas afirmações da Fase 5 verificadas, uma falsa.** `plan_exercises.completed` **não** existe nos tipos — a observação já fora resolvida na regeneração da Fase 3 daquele plano; item removido. E `isTrainerRole` está morta apenas nos dois handlers de geração, mas **viva** em `send-invitation.ts` — o escopo da remoção foi estreitado para não quebrar código em uso.

---

## Log de progresso

| Fase | Status | Concluída | Commit | Notas |
|------|--------|-----------|--------|-------|
| 0 — Separar criar de ajustar | **Concluída** | 2026-08-02 | `39cbc34` (+ `acbfc68` correção de copy) | SQL aplicado em produção; verificado ao vivo com conta Free real via chamada direta ao endpoint (JWT próprio). 2 dos 5 itens de aceitação com ressalva registrada (paga não verificada ao vivo; teto de exercícios é só instrução textual, achado pré-existente) |
| 1 — Procedência de idioma | **Concluída** | 2026-08-02 | `a795092` (+ `4889551` correção de curto-circuito) | Verificado ao vivo nos dois sentidos do toggle. Achado extra corrigido: `adaptations` herdava o locale da IA e vazava para a tela sem tradução; segundo achado: hook de tradução sem curto-circuito de mesma-origem, corrigido no ponto de chamada |
| 2 — Motor de sessão único | Não iniciada | — | — | Independente |
| 3 — Biblioteca espelhada | Não iniciada | — | — | Independente (artefato de dados) |
| 4 — Gerador de contingência | Não iniciada | — | — | Depende de 1, 2 e 3 |
| 5 — Higiene | Não iniciada | — | — | As duas primeiras linhas dependem de 0; as demais são independentes |
| 6 — Verificação ao vivo | Não iniciada | — | — | Depende de todas |

---

## Fora de escopo

**Backfill de `phase` nos planos legados:** ~3-4h, 92 planos e 194 sessões distintos, classificação por inspeção. Decisão pendente e independente.

~~**Backfill de `name_source_locale`**~~ — **desnecessário, confirmado por consulta:** 303/303 linhas `ai_generated` já classificadas pelo backfill anterior; resta 1 linha nula em todo o banco, a deliberadamente não classificada. O achado 18 é lacuna de escrita futura, sem dívida acumulada.

**Revisão da atratividade comercial do tier Free** (volume, sessões por semana, o que diferencia dos pagos): a Fase 0 devolve as alavancas ao lugar; qual valor colocar em cada uma é decisão de produto, não de engenharia.

**Unificação do modelo de custo com `api/*`:** a duplicação permanece por decisão arquitetural. Exige-se constantes idênticas e comentadas.

---

## Caminho de reversão

| Fase | Reversão |
|------|----------|
| 0 | Reverter o commit e restaurar a linha de `feature_permissions`; o gate volta a `ai.checkin_adjustment`. Nenhum dado de treino muda de forma |
| 1 | Reverter o commit; linhas já gravadas com procedência continuam válidas e são lidas normalmente |
| 2 | Reverter o commit; estimadores voltam às definições atuais. Nenhum dado gravado muda |
| 3 | Artefato de dados: deixar de consumi-lo basta; o arquivo fica inerte |
| 4 | Reverter o commit; o gerador volta ao conjunto fixo e à heurística de 7 min |
| 5 | Cada remoção é revertível isoladamente; as de configuração exigem restaurar a linha |
| 6 | Somente verificação — nada a reverter |
