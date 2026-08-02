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

- [ ] Criar `src/lib/sessionBudget.ts` com `estimateExerciseSeconds`, `estimateSessionMinutes`, `fitToBudget` e as constantes `FILL_FLOOR = 0.9`, `FILL_CEILING = 1.1`, `MAX_PADDED_SETS = 5`, comentadas como espelho de `api/generate-workout.ts` (a cópia em `api/*` permanece duplicada — regra de handlers autocontidos)
- [ ] Regra de corte **única e explícita**: cortável = blocos ajustáveis (`strength`, `conditioning`) quando existirem; na ausência deles, tudo que não seja `warmup` nem `cooldown`. Superconjunto deliberado da regra remota, necessário porque o conjunto local produz sessões só de mobilidade, coisa que o remoto nunca produz
- [ ] Nunca esvaziar um bloco declarado (invariante que o remoto adotou após defeito real em 2026-07-31)
- [ ] `WorkoutPlanEditorScreen` e `StartWorkoutScreen` passam a importar o estimador — corrige as duas divergências do achado 16
- [ ] Testes mutation-testados: corte, preenchimento, proteção de prescritivos, não-esvaziamento, categoria sem bloco ajustável, entrada vazia

### Aceitação

- [ ] Banner do treinador e banner do cliente produzem o mesmo número para o mesmo plano
- [ ] **O banner do cliente muda de valor** para exercícios sem reps e sem duração — é a correção do achado 16, não efeito colateral, e precisa estar medida e registrada aqui

---

## Fase 3 — Biblioteca espelhada e classificada por bloco

**Esforço:** ~3h · **Risco:** Baixo (dados) · **Migração:** não

Substitui o conjunto fixo de 36 templates pela biblioteca real. Resolve o achado 13 por construção: com 129 exercícios não existe "conjunto pequeno demais para preencher".

### Checklist

- [ ] Classificar os 129 exercícios nos 6 blocos de sessão por inspeção direta — o eixo não existe hoje (achado 21) e o material está lá (achado 22)
- [ ] Definir séries, repetições e duração sensatas **por bloco** ao classificar (achado 23): alongamento em 1 série de 30-45s, aquecimento em 1 série contínua, trabalho em 3-4 séries
- [ ] Marcar contraindicação por região corporal. **Nível conservador**, legitimado pela moldura de contingência: excluir o que carrega região sinalizada, com deny-list curta e explícita, em vez da curadoria exaustiva que o produto principal exigiria (achado 24)
- [ ] Gerar o espelho local como artefato versionado no repositório, com os nomes canônicos em inglês **e** as 387 traduções curadas de nome já existentes (pt/es/de) embutidas — subconjunto relevante das 582 linhas curadas, que incluem também metadados de protocolo fora deste escopo
- [ ] **Decisão de idioma no espelho, para não repetir a contradição da versão anterior deste plano:** o gerador emite o nome **já no idioma do aluno**, tirado da tabela embutida, e grava `name_source_locale` = locale do aluno. Não emite inglês com `'en'`. O motivo é a própria natureza da contingência: se o nome saísse em inglês, a exibição dependeria do endpoint de tradução — que numa queda de rede não responde, e o aluno lusófono veria o nome cru em inglês. Traduzir na origem é o que torna o estepe realmente offline
- [ ] Rascunho revisável antes de virar código, como nos backfills anteriores desta workstream
- [ ] Atualização oportunista do espelho quando online, mantendo a cópia empacotada como piso garantido (achado 25) — evita que o estepe envelheça

### Aceitação

- [ ] Todos os 129 classificados; nenhum bloco vazio no conjunto global
- [ ] Tamanho do artefato registrado (estimativa: 30-50 KB)
- [ ] Traduções conferidas contra a curadoria existente, sem divergência

---

## Fase 4 — Gerador local de contingência

**Esforço:** ~2h30 · **Risco:** Médio (muda o que o aluno recebe em contingência) · **Migração:** não · **Depende de:** Fases 1, 2 e 3

Algoritmo acordado com o líder: **montar com excesso deliberado e subtrair até caber**, em vez de selecionar aproximadamente e depois ajustar nos dois sentidos.

> Dependência da Fase 1 declarada explicitamente: sem o `insert` corrigido lá, gravar `name_source_locale` aqui seria inerte — foi exatamente o defeito que a revisão da versão anterior deste plano encontrou.

### Checklist

- [ ] **Triagem de segurança antes de qualquer geração local (achado 15b).** Avaliar `pain_present`, `safety_gate` e `ai_led_blocked` do check-in já carregado; quando o Safety Gate estiver ativo, a contingência **não** entrega treino genérico — apresenta a mesma pausa que o caminho de IA apresentaria. Degradar serviço é aceitável num plano de continuidade; degradar segurança não é
- [ ] Substituir o `readinessScore: 60` fabricado pelo valor real do check-in, ou por ausência explícita quando não houver check-in — nunca por um número inventado que a tela exibe como se fosse medição

- [ ] Selecionar por bloco a partir do espelho, com escolha pseudoaleatória **semeada** dentro de cada bloco — variedade real (hoje são sempre os mesmos 6 exercícios) sem perder testabilidade determinística
- [ ] Aplicar restrições do perfil e do check-in via as marcações da Fase 3
- [ ] Montar a matriz pré-treino deliberadamente acima do orçamento e subtrair pelos blocos cortáveis até cair na banda de 90-110%
- [ ] Nenhum bloco termina com zero exercícios
- [ ] **Orçamentos exíguos (15 min):** reduzir volume de trabalho primeiro, cortar desaquecimento depois; o aquecimento sobrevive sempre, ainda que em 60s — prevenção de lesão é a última coisa a sacrificar num produto de saúde
- [ ] Remover o piso rígido de 3 exercícios (achado 12): quem manda é o ajuste ao tempo
- [ ] Aplicar `maxExercises` e `fitnessOnly` já resolvidos na Fase 0
- [ ] Saída ordenada por `sortBySessionBlock`, com `phase` e `name_source_locale` preenchidos
- [ ] Corrigir o comentário de `:101`, que descreve só o gatilho de indisponibilidade da IA

### Aceitação

- [ ] **Matriz determinística provada por teste:** cada objetivo × cada orçamento de `{15, 30, 45, 60}` cai em 90-110%, com semente fixa
- [ ] Aquecimento presente em todas as combinações, inclusive 15 min
- [ ] Restrição sinalizada nunca produz exercício contraindicado — teste por região
- [ ] Safety Gate ativo ⇒ nenhum treino é gerado nem persistido; a tela mostra a pausa, não uma sessão
- [ ] O nome exibido chega no idioma do aluno **sem nenhuma chamada de rede** — testado com `fetch` indisponível, que é a condição real de contingência
- [ ] Sementes diferentes produzem treinos diferentes e igualmente válidos
- [ ] Banner `planMayOverrun` (`:305`) **não dispara** em plano local: ceiling 1,1× é menor que o limiar 1,2×, logo é asserção, não medição

---

## Fase 5 — Higiene: configuração e código mortos

**Esforço:** ~1h · **Risco:** Baixo · **Migração:** possivelmente (limpeza de `feature_permissions`)

Solicitada pelo líder do projeto. Trata o que a investigação expôs, sem varredura especulativa.

### Checklist

- [ ] Resolver o destino de `workout.exercises_per_session` e `workout.exercise_type` conforme decidido na Fase 0 — corrigir valor ou remover a chave, nunca deixar configuração sem efeito
- [ ] `isTrainerRole` — **declarada e nunca chamada** em `api/generate-workout.ts:53` e `api/generate-smart-workout.ts:61`. Atenção ao escopo: a mesma função **está viva** em `send-invitation.ts:109` e existe por duplicação deliberada (handlers autocontidos). Remover apenas nos dois handlers de geração, nunca por busca global de nome
- [ ] ~~`plan_exercises.completed`~~ — **verificado, não procede.** A coluna solta não existe em `src/types/supabase.ts`; só há `completed_at`, que é usada. A observação registrada durante a Fase 3 de `SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md` já foi resolvida na regeneração dos tipos daquela fase
- [ ] Levantar demais chaves de `feature_permissions` sem ponto de aplicação no código e listá-las **para decisão**, sem remover por conta própria
- [ ] Cada remoção acompanhada da evidência de ausência de uso (busca no código, e consulta quando for dado)

### Aceitação

- [ ] Nenhuma chave de permissão permanece configurada e inaplicada sem decisão registrada
- [ ] Suíte verde após cada remoção

---

## Fase 6 — Verificação ao vivo e fechamento

**Esforço:** ~2h · **Risco:** Baixo · **Migração:** não

### Checklist

- [ ] Conta Free real: confirmar geração por IA, ausência de adaptação por check-in, teto semanal ativo, e volume de exercícios coerente com o decidido na Fase 0
- [ ] Simular indisponibilidade da IA na mesma conta e confirmar que a contingência entrega sessão estruturada, dentro do tempo e respeitando restrição sinalizada
- [ ] Conferir no banco `phase` e `name_source_locale` nos dois caminhos, e os cabeçalhos de bloco nas duas telas do aluno
- [ ] Exercitar as pontas do orçamento (15 e 60 min)
- [ ] Confirmar não-regressão do caminho pago com treinador vinculado
- [ ] Confirmar que planos legados (`phase` nulo) seguem renderizando sem cabeçalho e sem erro
- [ ] Limpar dados de teste e restaurar as contas ao estado neutro
- [ ] Atualizar `SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md` e `EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md` com notas de fechamento apontando para cá
- [ ] Registrar evidências com números medidos, não "ok"

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
