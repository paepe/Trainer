# Plano de Implementação — Aplicação Real do Tipo de Exercício por Licença (CLIENT)

**Versão:** 1.3 (três varreduras: consistência técnica, conformidade com a governança, harmonização com o fallback — 12 falhas corrigidas, 5 fases reescritas, 1 acrescentada; ver "Varredura de consistência")
**Data:** 2026-08-03
**Origem:** `docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_FINDINGS_20260803.md` — testes adversariais ao vivo mostraram que `fitnessOnly` e `maxExercises` são instruções textuais nunca validadas, com falha real medida em FREE (2/3) e AI_FITNESS (1/3), e que AI_PERFORMANCE não possui mecanismo positivo de injeção.
**Escopo:** as 3 licenças de cliente (`free`, `ai_fitness`, `ai_performance`) em ambos os caminhos de geração — o de IA (`api/generate-smart-workout.ts`, Fases 0-1-2-3-4-5) e o de contingência local (`src/lib/fallbackWorkoutGenerator.ts`, **apenas** a Fase 2.5, que unifica a definição de `fitnessOnly`). O gerador local é mecanicamente correto quanto a orçamento, segurança e contagem (75 testes); o defeito tratado aqui é de **critério de classificação**, não de mecânica.
**Estimativa:** ~12h em 8 fases (0, 1, 2, 2.5, 3, 4, 5, 6) independentemente publicáveis.

---

## Tese

O sistema já resolveu exatamente este problema uma vez, no mesmo arquivo, para outra dimensão:

> `fitWorkoutToBudget` (`api/generate-smart-workout.ts:333`) — *"O prompt declara o alvo, mas não se pode confiar que um LLM faça a aritmética (medido 86-146% no endpoint do treinador), então a banda é aplicada aqui."*

Tempo de sessão é validado no servidor depois da resposta. **Tipo de exercício e contagem de exercícios não são** — apesar de dependerem do mesmo tipo de obediência que já se provou não-confiável. Este plano estende o precedente que já existe, em vez de inventar arquitetura nova.

---

## Restrição decisiva descoberta na investigação

**Os nomes de exercício voltam no idioma do cliente**, não em inglês (`buildSystemPrompt` instrui o modelo a escrever em `LOCALE_TO_LANG[locale]`; confirmado em produção: planos reais com `Agachamento com Elástico`, `Respiração Diafragmática`).

Consequência direta: **uma deny-list de palavras-chave em inglês — a solução óbvia — falharia silenciosamente para todo cliente pt/es/de**, que é a maioria da base. Qualquer validação baseada em nome é inviável como mecanismo primário.

**Solução adotada:** o modelo passa a devolver um campo `category` (`fitness` | `performance` | `mobility`) por exercício, independente de idioma. O servidor valida esse campo — não o nome. Justificativa: **classificar é uma tarefa muito mais confiável para um LLM do que obedecer a uma restrição** — é precisamente por isso que `api/classify-exercises.ts` já existe, funciona, e é usado com sucesso nos planos do treinador. Trocamos "confie que o modelo obedeça" por "peça ao modelo que declare, e valide a declaração".

A deny-list de palavras-chave permanece no plano, mas rebaixada a **rede de segurança secundária** (Fase 3), não mecanismo primário.

---

## Conformidade com a governança (`PROFILE.md` + `EXECUTIVE_TECHNOLOGY_DIRECTIVE.md`)

Precedência (directive §3): este documento é nível 4 (*findings, plans, historical records*). O directive prevalece sobre ele em qualquer divergência.

**Este plano não é uma melhoria opcional — corrige uma violação de directive já em produção:**

| Cláusula | Texto | Situação hoje |
|---|---|---|
| §4.4 | "AI workout plan generation (prompt assembly + **response validation** must happen server-side)" | Prompt é montado no servidor ✅ · resposta **não é validada** ❌ |
| §6.2 | "o backend monta o prompt, chama o LLM, **valida a resposta estruturada**, e retorna apenas o plano seguro e pré-validado" | Só o orçamento de tempo é validado; tipo e contagem não ❌ |
| §11 | Anti-pattern: "AI prompt changes without response contract versioning" | O plano v1.0 alterava prompt e contrato **sem versionar** ❌ → corrigido na Fase 1 |
| `PROFILE.md`, Pilar 3 | "AI-generated recommendations must be validated before presentation to the user" | Não são ❌ |

**Aplicado ao desenho das fases:**

- **§4.5 (uma capacidade, um contrato):** toda a validação vive numa única função (`enforceExerciseTypePolicy`), em um único ponto do fluxo. A Fase 5 inverte um parâmetro dela — não cria caminho paralelo.
- **§4.9 / §9.4 (rollback e autorização de produção):** cada fase é um commit isolado; remover a chamada única restaura o comportamento anterior. Causa provável, impacto, escopo, reversibilidade e critério de pós-validação estão declarados por fase.
- **§4.10 (evidência acima de hipótese):** a v1.0 continha 8 afirmações não verificadas, 5 delas inexequíveis — ver "Varredura de consistência". Toda afirmação técnica desta versão cita arquivo e linha.
- **§8.2 (qualidade mínima):** `lint`, `test` e `build` verdes no escopo impactado, por fase.
- **§6.3 (contratos de saída da IA):** contrato versionado, parsing resiliente com default explícito.

**Desvios conhecidos, declarados e não mascarados:**

1. **§8.1 (branches + Pull Request):** a prática corrente desta workstream é push direto para `main`. Deploy vai direto a produção, sem preview intermediário. Registrado como desvio consciente já em curso — não introduzido por este plano, mas não silenciado por ele.
2. **§9.2 (staging antes de produção):** o directive exige validação canônica em ambiente não-produtivo. O projeto não tem staging em uso; a verificação ao vivo deste plano ocorre em produção com contas de teste. **Mitigação:** todas as fases de aplicação (2, 3, 5) são precedidas pela Fase 1 em modo sombra, que mede sem alterar comportamento — é o substituto mais próximo de staging disponível hoje.

## Achados a fechar

| # | Achado | Origem | Fase |
|---|--------|--------|------|
| A1 | `library.favoriteExercises` do treinador nunca é cruzado com `fitnessOnly` — as duas instruções competem no prompt sem arbitragem em código | Findings, seção "Contexto" | Fase 0 |
| A2 | `task.fitnessOnly` é texto de prompt, nunca validado na resposta | Findings, AI_FITNESS 1/3 e FREE 2/3 | Fases 1, 3 |
| A3 | `task.maxExercises` é texto de prompt, nunca validado — produção real entregou 10 com teto 6 | Findings + Fase 0 do plano de continuidade | Fases 1, 2 |
| A4 | `exercise_category` é `null` em 418/418 linhas geradas por IA — o único mecanismo semântico real do sistema nunca alcança este caminho | Findings, consulta em produção | Fase 4 |
| A5 | AI_PERFORMANCE não injeta conteúdo de performance; só remove o bloqueio. Cliente com treinador genérico recebe conteúdo idêntico ao AI_FITNESS | Findings, teste de controle + 7 planos reais do Tiago | Fase 5 |
| A6 | `docs/FEATURE_ACCESS_MATRIX.md` está desatualizado: documenta `FREE=2` exercícios; o valor real em produção é 6 desde a Fase 0 do plano de continuidade | Leitura direta, `:124`, `:157` | Fase 6 |
| A7 | **`fitnessOnly` tem duas definições contraditórias.** O fallback usa `intensity === 'high'` e exclui 18 exercícios que a definição canônica do sistema classifica como `fitness` (Back Squat, Bench Press, Deadlift, Pull-up…). Defeito ativo em produção, não hipotético | `fallbackWorkoutGenerator.ts:99` vs. `classify-exercises.ts` SYSTEM_PROMPT; medido no espelho | Fase 2.5 |

---

## Premissas

- Cada fase é publicável e revertível isoladamente.
- Nenhuma fase fecha sem `tsc --noEmit` limpo, `npm run lint` sem erros novos, testes verdes com mutação verificada, e `build` verde.
- Verificação ao vivo em produção, com conta real, antes de considerar a fase concluída — reproduzindo o mesmo desenho adversarial dos Findings (treinador exigente com favoritos de performance), não apenas o caminho feliz.
- `api/*` permanece autocontido (o bundler da Vercel não rastreia imports relativos) — nada é importado de `src/`; constantes duplicadas ficam comentadas como espelho.
- **Degradar conteúdo é aceitável; degradar segurança não.** Nenhuma validação deste plano pode remover exercício por motivo de licença quando isso conflitar com uma restrição de segurança já aplicada.
- Push exige autorização explícita do líder do projeto.

---

## Fase 0 — Declarar precedência explícita entre licença e preferência do treinador

**Esforço:** ~1h · **Risco:** Baixo · **Migração:** não · **Fecha:** A1

A causa raiz medida nos Findings não foi o modelo "desobedecer" no vácuo — foi o prompt conter **duas instruções contraditórias simultâneas**, ambas apresentadas como diretivas de igual peso: "os favoritos do treinador são Sprint, Box Jump, Clean" e "não inclua exercícios de performance". Nenhum código arbitra esse conflito, e **o prompt tampouco diz qual das duas vence** — a decisão é delegada ao modelo, sem critério.

### Revisão de desenho (a primeira versão desta fase estava errada)

A versão inicial deste plano propunha **filtrar** `library.favoriteExercises` por nome antes de montar o prompt. Verificação contra os dados reais invalidou a abordagem: os favoritos do Coach DNA são texto livre, e a produção mostra que chegam **truncados e corrompidos por ditado de voz** — `"Standing Gam Over"`, `"Dan Bell rama"`, `"Gummy Bell Hammer"`, `"Band cover"` (Coach DNA real do único treinador com favoritos cadastrados). Não há garantia de idioma nem de que o texto sequer corresponda a um exercício reconhecível.

Classificar isso por nome é tão pouco confiável quanto classificar a resposta traduzida — a justificativa que a versão anterior dava ("favoritos não passam por tradução") era irrelevante: o problema nunca foi tradução, foi a ausência de estrutura.

**Abordagem corrigida: não classificar nada.** Declarar a precedência no próprio prompt, que é determinístico, custa uma linha, e resolve a ambiguidade sem depender de reconhecer nome nenhum.

### Checklist

- [x] Quando `task.fitnessOnly` for verdadeiro, o prompt passa a declarar **explicitamente a precedência**: o limite de plano prevalece sobre as preferências do treinador, e favoritos incompatíveis devem ser ignorados em vez de acomodados — `api/generate-smart-workout.ts:711`
- [x] A linha de favoritos passa a ser apresentada como *preferência subordinada*, não como diretiva de mesmo nível — `:555-564`
- [x] Nenhum favorito é removido do prompt: o modelo continua vendo a preferência do treinador e pode honrá-la quando ela **for** compatível (`Back Squat` é favorito e é fitness — filtrar cegamente perderia isso)
- [x] `avoidExercises` permanece intocado e continua com precedência máxima: é restrição, não preferência, e vale em qualquer licença
- [x] Testes de `buildPrompt` mutation-testados: a cláusula de precedência aparece sob `fitnessOnly`, está ausente sem ele, e os favoritos continuam presentes nos dois casos — 5 testes novos, 2 mutações aplicadas e capturadas

### Aceitação

- [x] Prompt com `fitnessOnly: true` contém a cláusula de precedência **e** ainda lista os favoritos
- [x] Prompt com `fitnessOnly: false` não contém a cláusula nem o rótulo de subordinação (não-regressão do AI_PERFORMANCE) — confirmado por teste dedicado
- [x] Verificação ao vivo: repetidos os 3 testes adversariais dos Findings para AI_FITNESS (mesmos payloads, mesmo treinador exigente com favoritos de performance) — **0/3 vazamentos**, contra a linha de base de 1/3. O teste que vazou `Box Jump` na linha de base produziu, desta vez, `Kettlebell Swings, Mountain Climbers, Burpees` — sem nenhum item de performance

> **Limite reconhecido:** isto continua sendo instrução textual, o mesmo mecanismo que este plano existe para não depender. A diferença é que aqui ele remove uma **ambiguidade** (algo que modelos resolvem bem) em vez de impor uma **restrição** (algo que já medimos falhar). Não substitui a validação das Fases 2-3; reduz a pressão sobre ela.

---

## Fase 1 — Contrato de categoria + validador em modo sombra

**Esforço:** ~2h · **Risco:** Baixo (não altera comportamento) · **Migração:** não · **Fecha:** parte de A2/A3

Antes de bloquear qualquer coisa, medir. A amostra dos Findings é n=3 adversarial por licença — suficiente para provar que a falha existe, insuficiente para dimensionar a taxa real em uso normal. Um validador que só observa e registra estabelece essa linha de base sem risco de regressão.

### Checklist

- [x] Estender o contrato de saída: cada exercício passa a devolver `category: 'fitness' | 'performance' | 'mobility'` — `api/generate-smart-workout.ts`, interface `WorkoutExercise`
- [x] **Versionar o schema de resposta junto com o prompt** — `contextVersion` passa de `'1.0'` a `'1.1'`, com o mapeamento versão↔contrato comentado em `AIContext`. Exigido pelo directive §6.3, evitando o anti-pattern §11
- [x] Parsing resiliente com default explícito (§6.3): resposta sem `category` não quebra nem lança — cai para `undefined` e é contabilizada em `missingCategoryCount`
- [x] Instrução correspondente no prompt de sistema, com as **mesmas definições** de `api/classify-exercises.ts` (copiadas literalmente, comentadas como espelho)
- [x] Novo `enforceExerciseTypePolicy(workout, task)` — implementado, chamado em **modo sombra**: calcula violações, registra em log, **não altera a resposta**
- [x] Log estruturado por violação: tipo (`category` / `count`), nome do exercício, fase, contagem esperada vs. recebida — `console.warn` estruturado no handler
- [x] Tolerante a ausência: resposta sem `category` nunca lança — contabilizada, não bloqueia
- [x] Exportado como seam de teste, no mesmo padrão de `buildPrompt`
- [x] Testes mutation-testados: 10 testes novos, 3 mutações aplicadas e capturadas (checagem de categoria, checagem de contagem, contador de ausência)

### Aceitação

- [x] Nenhuma mudança observável para o usuário — `enforceExerciseTypePolicy` só lê `parsed.workout`, nunca o reatribui; a resposta segue para `fitWorkoutToBudget` inalterada
- [x] Taxa de violação medida e registrada **por licença** — ver "Resultado medido" abaixo
- [x] Confirmado que o modelo devolve `category` de forma consistente — **0 exercícios sem `category` em 346 exercícios, nas 3 licenças** (taxa de ausência: 0%)

> **Correção de método:** a versão inicial desta fase pedia "≥24h de logs de uso normal em produção". Consulta ao volume real invalidou o critério: **~5 gerações de usuários reais em 14 dias, e zero nos últimos 3 dias** (o restante do tráfego é teste desta própria workstream). Uma janela de 24h coletaria amostra vazia e daria falsa confiança.
>
> **Método real:** lote sintético adversarial — 12 gerações por licença (36 no total), reproduzindo o desenho dos Findings (treinador exigente com favoritos de performance) e variando duração (15/30/45/60) e objetivo. Adversarial por construção, portanto **limite superior** da taxa de falha, não a taxa esperada em uso normal.

### Resultado medido (2026-08-03, produção, 36 chamadas reais)

| Licença | Gerações OK | Exercícios | `category` ausente | Vazamento de categoria | Estouro de contagem |
|---|---|---|---|---|---|
| `free` | 12/12 | 96 | 0 | **0/12** | **11/12** |
| `ai_fitness` | 11/12¹ | 112 | 0 | **0/11** | n/a (sem teto) |
| `ai_performance` | 12/12 | 138 | 0 | n/a (`fitnessOnly=false`) | n/a (sem teto) |

¹ Uma geração falhou com `"Expected ',' or ']' after array element in JSON"` — o defeito de truncamento de JSON já registrado em sessão anterior (candidato a parsing resiliente, fora do escopo deste plano), não uma regressão desta fase.

**Leitura:** a Fase 0 (precedência explícita) zerou o vazamento de categoria mesmo sob pressão adversarial extrema — 0/23 gerações com `fitnessOnly=true`, contra a linha de base de 1/3 e 2/3 dos Findings. `category` chega em 100% das respostas, confirmando que a Fase 3 (ativar o corte) parte de uma base confiável. O estouro de contagem em `free` (11/12) confirma exatamente o que os Findings mediram e quantifica a urgência da Fase 2.

---

## Fase 2 — Aplicar o teto de contagem (`maxExercises`)

**Esforço:** ~1h30 · **Risco:** Baixo · **Migração:** não · **Fecha:** A3

Escolhida antes da categoria por ser **puramente determinística** — contar e cortar não exige julgamento semântico, não depende de o modelo ter classificado bem, e não tem falso positivo possível.

### Checklist

- [x] Ativar o corte de contagem — nova função `cutExerciseCount(workout, maxExercises)`, chamada no handler entre o relatório de sombra (Fase 1) e `fitWorkoutToBudget` — `api/generate-smart-workout.ts`
- [x] Corte espelha a lógica já existente em `fitWorkoutToBudget`: remove das fases ajustáveis (`strength`/`conditioning`/`main`), da mais populosa para a menos
- [x] `warmup`/`cooldown` nunca são cortados no corte por exercício — invariante mais estrita que o próprio fallback de `fitWorkoutToBudget` (que, por herança, não excluía warmup/cooldown do seu próprio pool de emergência; `cutExerciseCount` exclui os dois explicitamente)
- [x] **Ordem única e explícita:** o corte de contagem roda **antes** de `fitWorkoutToBudget`, uma única vez. O ajuste de tempo então trabalha sobre o conjunto já podado e é o **último** passo — não há "reexecução"
- [x] **Resolver a colisão teto × estrutura de sessão (ver abaixo)** — `BLOCK_REMOVAL_ORDER = ['cooldown', 'conditioning', 'technique', 'strength', 'mobility']`, `warmup` nunca incluído; ordem documentada como escolha deliberada (protege o bloco de estímulo primário — `strength` — antes de `technique`), não uma reversão mecânica de `SESSION_BLOCKS`
- [x] Testes mutation-testados: teto respeitado (incluindo o caso-limite em que o teto é atingido antes de qualquer fase chegar ao piso — pegou uma mutação `>` → `>=` que os outros testes não pegavam), prescritivos preservados, caso saturado, caso insatisfazível — 6 testes novos, 3 mutações aplicadas e capturadas

### Colisão conhecida: `maxExercises` × número de blocos declarados

`maxExercises=6` (valor real do FREE) contra um Coach DNA que declare os 6 blocos de `SESSION_BLOCKS` produz um sistema **exatamente saturado**: 1 exercício por bloco, zero profundidade. Se o teto fosse menor que o número de blocos, seria **insatisfazível** — impossível respeitar simultaneamente "não exceder o teto" e "nunca esvaziar um bloco declarado".

A versão inicial desta fase listava "nunca esvazia uma fase declarada" como invariante absoluta sem notar que ela pode conflitar com o próprio teto que a fase existe para aplicar. **Precedência definida:** o **teto de contagem vence**; blocos excedentes são removidos inteiros, do fim da sequência canônica para o início (`cooldown` → `conditioning` → `technique` → …), **preservando sempre `warmup`** — a mesma prioridade de segurança já adotada no gerador local ("prevenção de lesão é a última coisa a sacrificar").

Isto é consistente com o achado de engenharia de licenças já registrado em `WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md` ("Fora de escopo"): a colisão é sintoma de um teto definido sem considerar a estrutura de sessão, e a regra aqui a torna **determinística e visível**, não a resolve comercialmente.

### Aceitação

- [x] Nenhuma resposta excede `maxExercises` — provado por teste com respostas sintéticas acima do teto, e confirmado ao vivo (ver abaixo)
- [x] Caso saturado (teto = nº de blocos) entrega 1 por bloco, sem erro — testado sinteticamente **e** confirmado ao vivo com os 6 blocos reais do `SESSION_BLOCKS`
- [x] Caso insatisfazível (teto < nº de blocos) remove blocos pela regra de precedência e **sempre preserva `warmup`** — testado sinteticamente
- [x] **Revisado, não confirmado como escrito** — "sessão continua dentro de 90-110% do orçamento após o corte": **falso para FREE em produção**, ver "Resultado medido" abaixo. Mantido como item fechado porque o comportamento medido é o comportamento correto dado o teto — não uma regressão a corrigir nesta fase
- [x] Verificação ao vivo: conta FREE real (`maxExercises=6`) sob o desenho adversarial dos Findings, medindo contagem entregue em 3 durações + 1 variação de estrutura de sessão
- [x] Banner `planMayUnderrun` continua correto quando o corte encurtar a sessão — confirmado: é calculado no cliente a partir do plano **já recebido** (`estimateSessionMinutes(plan)` vs. `availableMinutes`), não de uma previsão pré-geração, então reflete corretamente qualquer origem (IA ou fallback) sem exigir mudança nesta fase — `StartWorkoutScreen.tsx:274-287`

### Resultado medido (2026-08-03, produção, conta FREE real, `maxExercises=6`)

| Cenário | Blocos declarados | Exercícios entregues | Duração entregue | Alvo | Dentro de 90-110%? |
|---|---|---|---|---|---|
| 30 min, Coach DNA com os 6 blocos canônicos | 6 (`mobility, warmup, technique, strength, conditioning, cooldown`) | 6/6 — 1 por bloco | 20 min | 30 min | Não (67%) |
| 45 min, Coach DNA com os 6 blocos canônicos | 6 | 6/6 — 1 por bloco | 27 min | 45 min | Não (60%) |
| 60 min, Coach DNA com os 6 blocos canônicos | 6 | 6/6 — 1 por bloco | 27 min | 60 min | Não (45%) |
| 45 min, estrutura padrão de 4 blocos | 4 (`warmup, strength, conditioning, cooldown`) | 6/6 | 24 min | 45 min | Não (53%) |

**Leitura:** o teto de contagem foi respeitado em 4/4 chamadas (0 excedeu 6), e o caso saturado apareceu exatamente como previsto — 1 exercício por bloco, sem erro, sem bloco removido. Mas o achado central é outro: **o subaproveitamento não é exclusivo do caso de 6 blocos saturados** — mesmo a estrutura padrão de 4 blocos underruns 45 min em quase metade. A causa é aritmética, não estrutural: `fitWorkoutToBudget` só adiciona *séries* (não exercícios) às fases ajustáveis, até `MAX_PADDED_SETS=5` por exercício; com um teto de 6 exercícios, no máximo 2-4 deles caem em fases ajustáveis, e o teto de séries por exercício limita quanto essa profundidade pode compensar. **Isto confirma, com medição em produção, a preocupação de engenharia de licenças já registrada em memória** (`project_license_engineering_free_trainer.md`): `maxExercises=6` foi definido sem relação com duração de sessão nem com a granularidade que `fitWorkoutToBudget` usa para preencher tempo, e nenhuma combinação de bloco cabe 6 exercícios em 45-60 minutos sem ficar rasa. O banner `planMayUnderrun` é a mitigação correta e já funciona — não há regressão a corrigir aqui. Resolver a causa (redefinir `maxExercises` em função da duração, ou desacoplar o teto Free-autônomo do Free-com-treinador) permanece fora do escopo desta fase, por decisão já registrada do líder do projeto.

---

## Fase 2.5 — Unificar a definição de `fitnessOnly` entre os dois caminhos

**Esforço:** ~2h · **Risco:** Médio (muda o conjunto de exercícios do fallback) · **Migração:** não · **Fecha:** A7

### Por que esta fase existe

Levantada em revisão do líder: *"como harmonizar a situação de FALLBACK com a afirmação de que §4.4/§6.2 exigem validação server-side?"* A resposta ao escopo é que o fallback não produz resposta de IA — não há oráculo a validar, e §4.1 exige que ele opere sem backend. Mas a pergunta expôs um problema maior: **os dois caminhos aplicam a mesma política com definições contraditórias, e a do fallback está errada pela definição canônica do próprio sistema.**

`src/lib/fallbackWorkoutGenerator.ts:99` usa `intensity === 'high'` como proxy de "performance". Medido no espelho real: **exclui 35 dos 129 exercícios**, sendo **19 do bloco `strength`**:

> Back Squat · Barbell Back Squat · Bench Press · Competition Bench Press · Competition Deadlift · Competition Squat · Deadlift · Dips · Flat Bench Press · Incline Dumbbell Press · Pull-up · Romanian Deadlift · Bulgarian Split Squat · Seated Dumbbell Press · Weighted Pull-up · Box Jump · (+ 3 supersets)

`api/classify-exercises.ts` — a definição canônica — afirma o oposto, literalmente:

> *"fitness: … (e.g. **Squat, Bench Press, Deadlift**, Plank, Row, Bicep Curl…)"*
> *"Compound movements like **Squat or Deadlift are fitness** unless explicitly athletic/power-focused"*

**18 dos 19 são exclusões falsas** — só `Box Jump` é genuinamente performance. Verificado ao vivo hoje: o mesmo cliente Free **recebeu** `Barbell Back Squat, Dumbbell Bench Press, Barbell Bent-Over Row` pelo caminho de IA; pelo fallback não receberia nenhum. Mesmo tier, mesma política, resultados opostos — e o aluno perde os levantamentos fundamentais exatamente quando o sistema já está degradado.

**Origem do defeito:** introduzido por mim na Fase 4 do plano de continuidade, registrado como ressalva (*"heurística defensável mas não testada contra a classificação `performance`"*) e nunca quantificado. Quantificado, não é imprecisão menor.

**Por que vem antes da Fase 3:** sem esta fase, o plano *formalizaria* a divergência — caminho de IA passando a `category`, fallback permanecendo em `intensity`. Isso é o anti-pattern §11 nominal (*"multiple sources of truth for critical context"*): eu estaria corrigindo uma ponta e cimentando o erro da outra.

### Checklist

- [x] Classificar os 129 exercícios do espelho em `category: 'fitness' | 'performance' | 'mobility'` — **não por inspeção**: submetidos ao próprio endpoint `api/classify-exercises` (3 lotes ≤50), a mesma fonte de verdade que o caminho de IA usa
- [x] **Rascunho revisável antes de virar código** — `FALLBACK_LIBRARY_CATEGORY_CLASSIFICATION_DRAFT_20260803.md`, apresentado e confirmado pelo líder antes de qualquer edição de código
- [x] **Validação cruzada:** rascunho manual feito primeiro como hipótese, comparado à IA — **22/129 (17%) divergiram**; a versão final usa o resultado da IA, não o rascunho (evidência acima de hipótese, §4.10)
- [x] `category` adicionada a `FallbackLibraryExercise` e ao artefato versionado (todas as 129 entradas); `intensity` **preservada**, sem mudança de significado
- [x] `fallbackWorkoutGenerator.ts:99` passa a filtrar por `category === 'performance'`, idêntico ao critério server-side da Fase 1/3
- [x] Novos testes no espelho: toda entrada tem `category` válida; nenhum bloco fica vazio sob `fitnessOnly` com o novo critério
- [x] Testes do gerador revisados (não só re-executados): o teste que assumia `intensity==='high'` foi reescrito para `category==='performance'`, mais 2 testes novos confirmando a correção do achado A7 e a exclusão do `Box Jump`
- [x] Registrado o antes/depois — ver "Resultado medido" abaixo

### Aceitação

- [x] `Back Squat`, `Bench Press`, `Deadlift` e `Pull-up` **disponíveis** para cliente `free`/`ai_fitness` no fallback — confirmado por teste dedicado que lê `category` diretamente do artefato
- [x] `Box Jump`, `Jump Squat`, `Squat Jump`, `Plyo Push-up` e sprints (`Treadmill Sprint`, `A-Skip Drill`) **permanecem excluídos** sob `fitnessOnly` — todos classificados `performance`
- [x] Nenhum bloco de sessão fica vazio sob `fitnessOnly` combinado com qualquer região contraindicada — nova varredura (5 sementes × 4 durações = 20 combinações) reexecutando o padrão da Fase 4 do plano de continuidade, todas passando
- [x] Banda de 90-110% preservada em todas as combinações objetivo × orçamento — suíte completa (227 testes, incluindo os testes de banda pré-existentes) verde após a troca de critério
- [x] **Uma única definição de `fitnessOnly` no sistema** — confirmado por busca: os únicos usos restantes de `intensity` no código são `pain_intensity`/UI de dor (campo homônimo, sem relação), nenhum decide tipo de exercício
- [x] **Revisado quanto a "verificação ao vivo":** `generateFallbackPlan` é uma função pura, sem chamada de rede (documentado no próprio arquivo) — diferente das Fases 0-2, que precisavam de verificação ao vivo porque dependiam do comportamento real e imprevisível de um LLM, aqui o comportamento é 100% determinístico e já exercitado por 86 testes com sementes/durações/objetivos/regiões reais. Não há reprodução em produção com conta real "IA indisponível" simulada, porque não existe hoje um gatilho de teste para forçar esse caminho sem tocar produção sem autorização adicional — registrado como decisão explícita, não como item pulado silenciosamente

### Resultado medido — antes/depois (fallback, sob `fitnessOnly`)

| | Critério antigo (`intensity==='high'`) | Critério novo (`category==='performance'`) |
|---|---|---|
| Excluídos | 35/129 (27%) | 14/129 (11%) |
| Disponíveis | 94/129 | 115/129 |
| Falsas exclusões em `strength` | 18/19 (Back Squat, Bench Press, Deadlift, Pull-up, Romanian Deadlift, Bulgarian Split Squat, etc.) | 0 — só `Box Jump`, corretamente |
| `conditioning` | misturava HIIT genérico e específico sem distinção semântica | 12/22 (55%) excluídos — captura pliometria/sprint/intervalo que `intensity` sozinho não distinguia de condicionamento geral |

---

## Fase 3 — Aplicar o filtro de categoria (`fitnessOnly`)

**Esforço:** ~2h · **Risco:** Médio (julgamento semântico; risco de falso positivo) · **Migração:** não · **Fecha:** A2

Só depois da Fase 1 ter medido a taxa real e confirmado que o modelo classifica de forma confiável.

### Checklist

- [x] Ativar o filtro de categoria — nova função `enforceCategoryFilter(workout, fitnessOnly)`, chamada após o corte de contagem (Fase 2) e antes de `fitWorkoutToBudget`
- [x] Exercício com `category: 'performance'` sob `fitnessOnly` é **removido**, não substituído
- [x] Remoção seguida de reexecução do ajuste de tempo (`fitWorkoutToBudget` roda depois, sobre o conjunto já filtrado) — sessão não encolhe para fora da banda além do que o próprio corte já explica
- [x] **Nunca esvaziar uma fase:** se todos os exercícios de um bloco forem `performance`, mantém **o primeiro da ordem devolvida** e registra em `forcedNonEmptyPhases`
- [x] Rede de segurança secundária — deny-list de padrões de nome, aplicada **apenas quando `category` estiver ausente**, nunca sobrepondo uma classificação explícita do modelo. **Ajuste em relação ao texto original:** as três frases estreitas (`depth jump`, `broad jump`, `box jump`) foram substituídas pelo token solto `jump` — são a única forma consistente com a allowlist que o próprio checklist já exigia (`Jumping Jacks` não contém nenhuma das três frases, só "jump"); documentado no código como resolução deliberada de uma lacuna no texto do plano
- [x] Allowlist explícita para `Jumping Jacks`
- [x] Testes mutation-testados incluindo o caso de bloco inteiro de performance e o caso de `category` ausente — 6 testes novos, 3 mutações aplicadas e capturadas (2 exigiram redesenho: a primeira versão de 2 testes tinha só 1 exercício por fase, e o próprio fallback "nunca esvaziar" mascarava a mutação ao manter o exercício certo pelo motivo errado)

> **Correção de contrato:** a versão inicial desta fase mandava "manter o de menor intensidade". **Não é implementável** — `WorkoutExercise` (`api/generate-smart-workout.ts:270`) não tem campo `intensity`; expõe apenas `name`, `muscleGroup`, `sets`, `reps`, `durationSeconds`, `load`, `restSeconds`, `cue`, `safetyNote`. O critério foi trocado por "o primeiro da ordem devolvida", que é determinístico e existe de fato. (`intensity` existe apenas no espelho local `FALLBACK_LIBRARY`, que `api/*` não pode importar.)

> **Limite real da rede secundária:** a deny-list opera sobre nomes em inglês, mas a resposta vem no idioma do cliente. Para clientes **pt/es/de — a maioria da base — não existe rede secundária efetiva**: se o modelo omitir `category`, o exercício passa. Isto não é mitigável sem uma segunda chamada de classificação (custo e latência) e fica explicitamente aceito como risco residual, com a taxa de campo ausente monitorada desde a Fase 1.

### Aceitação

- [x] Nenhum exercício `category: 'performance'` sobrevive sob `fitnessOnly` — teste com resposta sintética
- [x] Nenhuma fase termina vazia em nenhum cenário testado
- [x] Sessão permanece em 90-110% após as remoções — confirmado ao vivo para AI_FITNESS (3/3) e AI_PERFORMANCE (3/3); FREE continua abaixo da banda, mas por causa já documentada na Fase 2 (teto de 6 exercícios), não por esta fase
- [x] Verificação ao vivo: repetidos os 3 testes adversariais para AI_FITNESS **e** FREE — **0/3 vazamentos nos dois**, contra a linha de base de 1/3 e 2/3
- [x] Não-regressão do AI_PERFORMANCE: os 3 testes adversariais continuam entregando `Box Jump`, `40m Sprint`, `Broad Jump` sem alteração (3/3, `category=performance` presente como esperado — `fitnessOnly=false` não aciona o filtro)

### Resultado medido (2026-08-03, produção, 9 chamadas — mesmo desenho adversarial dos Findings)

| Licença | Vazamentos | Linha de base | Duração (min, alvo 45) | Fases vazias |
|---|---|---|---|---|
| `ai_fitness` | 0/3 | 1/3 | 45, 42, 45 (banda ok) | 0 |
| `free` (`maxExercises=6`) | 0/3 | 2/3 | 26, 24, 23 (abaixo da banda — Fase 2, não regressão) | 0 |
| `ai_performance` | 3/3 (esperado — `fitnessOnly=false`) | 3/3 | 44, 49, 46 (banda ok) | 0 |

---

## Fase 4 — Persistir `exercise_category` nos planos gerados por IA

**Esforço:** ~1h · **Risco:** Baixo · **Migração:** não (coluna já existe) · **Fecha:** A4

Com o modelo já devolvendo `category` (Fase 1), gravá-la fecha a lacuna de 418/418 linhas nulas e torna auditável, em dados, aquilo que hoje só se comprova por teste manual.

### Checklist

- [x] **Propagar `category` por toda a cadeia de tipos** — (1) `WorkoutExercise` em `src/ai/types.ts`, (2) `GeneratedWorkoutExercise` + `mapExercise` em `src/lib/workoutGeneration.ts:127`, (3) o `insert` de `persistGeneratedPlan` — usando o `ExerciseCategory` já existente em `src/types/workout.ts`, não um tipo novo
- [x] `persistGeneratedPlan` (`StartWorkoutScreen.tsx`) passa a gravar `exercise_category` a partir da resposta
- [x] Valor gravado é o declarado pelo modelo, já validado pela Fase 3 — não uma reclassificação independente
- [x] Linhas sem `category` continuam gravando `null` (o `useExerciseClassification` existente já trata nulo classificando sob demanda — comportamento preservado, não duplicado)
- [x] Confirmado por consulta em produção que novos planos passam a gravar o campo

### Aceitação

- [x] Novos planos gerados por IA têm `exercise_category` preenchido; consulta em produção confirma — ver "Resultado medido" abaixo
- [x] Nenhuma regressão no `useExerciseClassification` (que classifica sob demanda quando nulo) — inalterado, linhas sem `category` continuam nulas
- [x] Métrica auditável: mecanismo em produção, mas volume real ainda insuficiente para uma proporção por licença confiável — ver nota abaixo

### Resultado medido (2026-08-03, produção — plano real gerado ao vivo)

Gerado um plano real para a conta `free` (`andre.lima@client.test`, sem dor, readiness 71, R0), via check-in real → geração de IA real → persistência real, não uma chamada direta à API:

| | Total de linhas `ai_generated` em produção | Com `exercise_category` |
|---|---|---|
| Antes desta fase | 418 (o número já citado nos achados) | 0 |
| Depois desta fase (mesma consulta, agora) | 433 (418 antigas + 15 do plano gerado nesta verificação) | 15 — todas do plano novo; as 418 antigas permanecem `null`, como esperado |

Categorias do plano novo: 11 `fitness`, 4 `mobility`, 0 `performance`, 0 nulo — consistente com `fitnessOnly=true` (Free).

Confirma exatamente o comportamento esperado sob `fitnessOnly=true`: nenhum `performance` chega a ser persistido, e a mistura fitness/mobility reflete os blocos reais do plano (`warmup`, `mobility`, `technique`, `strength`, `conditioning`, `cooldown`).

**Nota sobre a métrica auditável do checklist:** com uma única geração de teste no ar, uma "proporção de `performance` por licença" ainda não tem amostra real — o mecanismo de coleta está correto e funcionando (a coluna agora se popula), mas o valor numérico da proporção só se torna significativo com volume de uso real, que é responsabilidade de acompanhamento contínuo, não desta fase.

---

## Fase 5 — Política bidirecional de tipo de exercício (fecha AI_PERFORMANCE)

**Esforço:** ~1h30 · **Risco:** Médio (muda o que o cliente recebe) · **Fecha:** A5

### Revisão de desenho (a primeira versão desta fase estava errada)

A v1.0 tratava isto como um problema de **injeção** e afirmava que "restrição é aplicável no servidor, injeção não é". A afirmação não se sustenta e foi construída, não verificada. Correção do enquadramento, com os campos conferidos em código:

**É o mesmo filtro, nas duas direções** — não dois mecanismos. `enforceExerciseTypePolicy` (Fases 1-3) já recebe `category` por exercício; a política apenas inverte o parâmetro conforme a licença:

| Licença | Política |
|---|---|
| `free`, `ai_fitness` | **Excluir** `category === 'performance'` |
| `ai_performance` | **Exigir** mínimo de `category === 'performance'`, quando o contexto indicar e a segurança permitir |

O sinal para decidir "quando o contexto indica" **já existe e já chega ao prompt** — verificado linha a linha, não presumido:

| Sinal | Origem | Onde entra no prompt |
|---|---|---|
| `trainer.focus.athletic` (0-10) | Coach DNA | `:548` |
| `trainer.archetype`, `trainer.intensity` | Coach DNA | `:539`, `:547` |
| `client.trainingFocus`, `client.fitnessLevel`, `client.preferenceIntensity` | `profile_v2` | `:584`, `:568`, `:582` |
| `client.intensityCeiling`, `client.trainabilityTier` | Perfil amplificado | `:642`, `:641` |
| `readinessScore`, `painPresent`, `safetyStatus` | Check-in | seção TODAY |

**Achado da verificação:** o bloco inteiro de Coach DNA é envolvido por `if (!isAutonomous)` (`:537`), e `isAutonomous` é `trainer.id === 'ai-coach'` (`:535`). **Para cliente sem treinador vinculado, nenhum sinal de Coach DNA chega ao prompt** — a política precisa cair para os sinais do próprio cliente (`trainingFocus`, `fitnessLevel`, `preferenceIntensity`), que estão sempre presentes. Sem essa ramificação, a fase falharia silenciosamente exatamente para o cliente autônomo, que é quem mais depende dela.

### Custo real da aplicação forçada — medido, não estimado

Detectar ausência de conteúdo performático é trivial (contar `category`). **Corrigir** é que tem custo: `api/*` não pode importar biblioteca de exercícios (regra do bundler), então inserir um exercício exigiria uma segunda chamada ao modelo. O timeout atual por chamada é **28s** (`:848`). Uma nova tentativa leva o pior caso de 28s para **56s**, com o aluno parado na tela "Generating your plan…".

Isso não é impossibilidade — é um trade-off de latência, e a decisão é do líder:

| Nível de aplicação | Custo | Efeito esperado |
|---|---|---|
| **(a) Direcionar + detectar + registrar** *(recomendado)* | Zero latência adicional | Direcionamento textual positivo funcionou **3/3** nos testes dos Findings; o teste de controle (treinador neutro) deu 0/3 — a evidência mostra que direcionar funciona. Ausência residual fica medida, não corrigida |
| **(b) Direcionar + detectar + nova tentativa reforçada** | Até +28s no pior caso, uma única vez | Aproxima da garantia, ao custo de dobrar a latência máxima de uma tela crítica de treino |

**Recomendação (a).** Justificativa: §4.1 do directive ("estabilidade e execução segura antes de sofisticação") e a evidência própria dos Findings — direcionamento positivo acertou 3/3, enquanto a restrição, que é o caso realmente arriscado, falhou 1/3 e 2/3. Pagar 28s de latência para cobrir o caso de menor risco inverte a prioridade.

### Alternativa comercial genuína (permanece)

**Não diferenciar por conteúdo** e corrigir o texto comercial: o diferencial real e já entregue do `ai_performance` é analytics (ATL/CTL/TSB, `progress.performance`), não conteúdo de treino. Custo zero de engenharia; exige revisão de `plans.text.ai_performance.features` nas 4 locales. É a única alternativa que não é engenharia — por isso permanece na mesa.

### Checklist

- [x] **Decisão do líder registrada:** nível (a) — direcionar + detectar + registrar, sem nova tentativa. Confirmado pelo líder em 2026-08-03
- [x] Política implementada na mesma `enforceExerciseTypePolicy`, com o parâmetro invertido (`requirePerformance`) — sem função paralela (§4.5). O cálculo do sinal (`requiresPerformanceContent`) é uma função à parte porque é uma responsabilidade diferente (decidir *se* a política se aplica, não aplicá-la) — a política em si permanece unificada
- [x] Ramificação para cliente autônomo (sem Coach DNA) usando sinais do próprio perfil (`client.trainingFocus`, `preferenceIntensity`, `fitnessLevel`)
- [x] **Piso de segurança inegociável:** Safety Gate ativo, dor relatada ou `readinessScore < 50` suprimem a exigência em qualquer licença, checados primeiro e de forma absoluta
- [x] Testes mutation-testados: exigência ativa com sinal atlético, suprimida por segurança (4 sinais, `it.each`), ramificação autônoma (3 casos), e não-regressão de `free`/`ai_fitness` — 20 testes novos, 3 mutações aplicadas e capturadas
- [x] Alternativa comercial: não escolhida, permanece registrada como opção futura caso o nível (a) se mostre insuficiente

### Aceitação

- [x] Verificação ao vivo com treinador **neutro** (o teste de controle dos Findings) — **0/3 de conteúdo performático**, idêntico à linha de base. Confirma que a Fase 5 não empurra conteúdo para um perfil que nunca pediu (o próprio comentário do código já previa isso: a linha de base 0/3 é o resultado correto, não um defeito)
- [x] Verificação ao vivo com check-in de dor + região excluída: **0 exercícios que sobrecarregam o joelho** entregues em 3/3 chamadas (mecanismo de `excludedRegions`, pré-existente, intacto). A supressão da *exigência* em si (`requiresPerformanceContent` retornando `false` sob dor) não é observável pela saída sozinha, porque `ai_performance` roda com `fitnessOnly=false` e portanto nunca exclui `performance` — 2/3 chamadas ainda trouxeram conteúdo performático não perigoso (Kettlebell Swing, Battle Rope Slam), variação natural do modelo, não a diretiva (que está desativada nesse cenário). A prova de que a supressão realmente ocorre é a suíte de testes mutados sobre `requiresPerformanceContent`, função pura e determinística — a verificação ao vivo aqui prova a ausência de risco de segurança, não a supressão da diretiva em si, que não é observável por este canal
- [x] Não-regressão: `free` e `ai_fitness` continuam com **0/3 vazamentos** após a Fase 3

### Resultado medido (2026-08-03, produção, 14 chamadas)

| Cenário | Licença | Resultado | Leitura |
|---|---|---|---|
| Treinador neutro (controle dos Findings) | `ai_performance` | 0/3 conteúdo performático | Idêntico à linha de base — sem empurrão indevido |
| Treinador atlético, **sem favoritos** de performance | `ai_performance` | 3/3 conteúdo performático | Novo — antes dependia de favoritos explícitos; agora o próprio perfil (arquétipo/foco/intensidade) já é suficiente |
| Treinador atlético + dor no joelho + região excluída | `ai_performance` | 0/3 exercícios que sobrecarregam o joelho; 2/3 ainda com conteúdo performático seguro | Segurança intacta; presença de performance é variação natural, não a diretiva (suprimida) |
| `free` (`maxExercises=6`) | `free` | 0/3 vazamentos | Não-regressão confirmada |
| `ai_fitness` | `ai_fitness` | 0/3 vazamentos | Não-regressão confirmada |

---

## Fase 6 — Higiene documental e fechamento

**Esforço:** ~1h · **Risco:** Baixo · **Fecha:** A6

### Checklist

- [ ] `docs/FEATURE_ACCESS_MATRIX.md` atualizado: `workout.exercises_per_session` do FREE documenta 2, valor real é 6 (`:124`, `:157`) — corrigir e anotar a data da mudança
- [ ] Mesma tabela: coluna "aplicado?" passa a distinguir **configurado** de **efetivamente aplicado**, distinção que não existe hoje e que originou toda esta investigação
- [ ] `docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_FINDINGS_20260803.md` recebe nota de fechamento apontando para este plano e para os resultados medidos
- [ ] Verificação ao vivo final: matriz completa de 3 licenças × 3 durações, com o desenho adversarial, registrando números medidos e não "ok"
- [ ] Memória do projeto atualizada (o achado de engenharia de licenças já registrado passa a apontar para o que foi resolvido e o que permanece aberto)

### Aceitação

- [ ] Nenhuma linha da matriz de acesso documenta um valor divergente da produção
- [ ] Taxa de vazamento final medida e registrada por licença, comparada à linha de base dos Findings
- [ ] Todo achado A1-A6 está fechado ou explicitamente registrado como decisão pendente

---

## Riscos conhecidos

| Risco | Mitigação |
|---|---|
| O modelo classificar mal a própria saída (declarar `fitness` para um sprint) | Deny-list secundária (Fase 3) + medição em modo sombra antes de ativar (Fase 1) |
| Falso positivo removendo exercício legítimo | Allowlist explícita; invariante de nunca esvaziar bloco; medição em sombra antes de ativar |
| Remoções encolherem a sessão para fora da banda de tempo | Ordem única e fixa: corte de contagem → filtro de categoria → ajuste de tempo **por último**, uma vez (Fase 2) |
| Custo/latência de tokens extra pelo campo `category` | Um enum curto por exercício; impacto marginal, medido na Fase 1 |
| **O modelo omitir `category`** | Contabilizado desde a Fase 1; parsing resiliente com default explícito, nunca lança. **Risco residual aceito:** sem o campo e em idioma não-inglês, não há rede secundária |
| Deny-list só funcionar em inglês | Rebaixada a rede secundária. **Para clientes pt/es/de — a maioria da base — não há rede secundária efetiva**; risco residual declarado, não mitigado |
| **Fase 5 nível (b): latência dobrada** (28s → 56s) numa tela crítica de treino | Por isso o nível (a) é o recomendado; (b) só mediante decisão explícita do líder, ciente do custo |

---

## Fora de escopo

- **Endpoint legado `api/generate-workout.ts`** — não recebe `fitnessOnly` nem `maxExercises` hoje; só é usado quando não há `profile_v2`. Fora do escopo até que se decida se ele permanece.
- **Reclassificação retroativa** das 418 linhas com `exercise_category` nulo — dado histórico; `useExerciseClassification` já resolve sob demanda.
- ~~**Reconciliação entre `intensity` (fallback) e `exercise_category` (IA)**~~ — **promovido a escopo (Fase 2.5)** após a revisão do líder de 2026-08-03. Deixou de ser "dois sistemas coexistindo" quando se mediu que um deles contradiz a definição canônica e remove os compostos fundamentais do cliente Free em produção.
- **Engenharia de licenças Free-com-treinador** — registrado em `WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md`, "Fora de escopo"; é a pergunta de produto que antecede qualquer número.

---

## Varredura de consistência (2026-08-03, sobre a v1.0)

Revisão crítica solicitada antes da execução, verificando cada afirmação do plano contra o código e os dados reais. **8 falhas encontradas e corrigidas** — 5 delas teriam quebrado a implementação ou invalidado a medição:

| # | Falha | Gravidade | Correção |
|---|-------|-----------|----------|
| 1 | Cabeçalho dizia "~9h em 6 fases"; a soma real é 10h e existem 7 fases (0 a 6) | Editorial | Corrigido |
| 2 | **Fase 0 propunha filtrar favoritos por nome**, com justificativa errada ("não passam por tradução"). Dados reais mostram favoritos truncados por ditado de voz (`"Dan Bell rama"`, `"Gummy Bell Hammer"`) — irreconhecíveis por qualquer classificador | **Alta** — a fase inteira era inexequível | Redesenhada: declarar precedência no prompt, sem classificar nada |
| 3 | **Fase 2 não resolvia a colisão `maxExercises` × nº de blocos** — com teto 6 e Coach DNA de 6 blocos o sistema é exatamente saturado; com teto menor, insatisfazível. "Nunca esvaziar um bloco" era listada como invariante absoluta sem notar o conflito com o próprio teto | **Alta** — regra ambígua em runtime | Precedência explícita definida: teto vence, remove blocos do fim da ordem canônica, `warmup` sempre preservado |
| 4 | Fase 2 pedia corte "antes de `fitWorkoutToBudget`" **e** "reexecutar o ajuste depois" — redundante e ambíguo | Média | Ordem única: corte → ajuste de tempo, uma vez |
| 5 | **Fase 3 mandava "manter o de menor intensidade"** — `WorkoutExercise` não tem campo `intensity` (só existe no espelho local, que `api/*` não pode importar) | **Alta** — inexequível | Trocado por "o primeiro da ordem devolvida" |
| 6 | **Fase 1 exigia "≥24h de logs de uso normal"** — o volume real é ~5 gerações de usuários reais em 14 dias, zero nos últimos 3 dias. A janela coletaria amostra vazia | **Alta** — daria falsa confiança | Substituído por lote sintético adversarial (≥10 por licença), com a natureza adversarial da amostra declarada |
| 7 | **Fase 4 citava só o `insert`**, omitindo `WorkoutExercise` (`src/ai/types.ts`) e `mapExercise` (`workoutGeneration.ts:127`) — sem eles o campo nunca chegaria ao banco | **Alta** — persistência silenciosamente inerte | Cadeia de tipos completa explicitada |
| 8 | A limitação de idioma da deny-list estava registrada de forma branda ("best-effort") | Média | Declarado sem eufemismo: para clientes pt/es/de **não existe rede secundária** |

### Segunda varredura (v1.2) — conformidade com a governança

Revisão adicional após leitura de `PROFILE.md` e `EXECUTIVE_TECHNOLOGY_DIRECTIVE.md`, solicitada pelo líder. **Mais 3 falhas:**

| # | Falha | Gravidade | Correção |
|---|-------|-----------|----------|
| 9 | **Fase 5 afirmava que "injeção não é aplicável no servidor"** — impossibilidade construída, não verificada. Todos os sinais necessários (`focus.athletic`, `archetype`, `trainingFocus`, `fitnessLevel`, `readiness`) já chegam ao prompt; detectar é trivial com `category`. O que existe é custo de latência (28s→56s, `:848`), não barreira arquitetural. Agravante: a evidência dos próprios Findings mostra direcionamento positivo acertando **3/3**, enquanto a restrição — o caso realmente arriscado — falhou 1/3 e 2/3 | **Alta** — a fase inteira partia de premissa falsa | Reescrita como política bidirecional, com o custo real medido e apresentado como decisão |
| 10 | **Contrato de resposta alterado sem versionamento** — directive §6.3 exige, §11 lista como anti-pattern explícito | **Alta** — violação direta de directive | `contextVersion` passa a `'1.1'` na Fase 1 |
| 11 | **`isAutonomous` não considerado na Fase 5** — todo o bloco de Coach DNA é suprimido para cliente sem treinador (`:537`). A política falharia em silêncio justamente para o cliente autônomo | **Alta** — falha silenciosa no caso mais dependente | Ramificação explícita para sinais do próprio cliente |

### Terceira varredura (v1.3) — harmonização com o fallback

Provocada por uma pergunta do líder: *"como harmonizar a situação de FALLBACK com a afirmação de que §4.4/§6.2 exigem validação server-side?"*

| # | Falha | Gravidade | Correção |
|---|-------|-----------|----------|
| 12 | **`fitnessOnly` tem duas definições contraditórias no sistema**, e a do fallback está errada pela definição canônica do próprio produto: exclui 18 exercícios `fitness` (Back Squat, Bench Press, Deadlift, Pull-up…) de clientes `free`/`ai_fitness`. **Defeito ativo em produção.** Pior: o plano v1.2, ao migrar só o caminho de IA para `category`, **formalizaria** a divergência — anti-pattern §11 nominal | **Alta** — defeito em produção + o plano o agravaria | Nova **Fase 2.5**, antes de qualquer ativação de filtro |

**Nota sobre a origem:** o defeito é meu, da Fase 4 do plano de continuidade. Foi registrado lá como ressalva textual e nunca quantificado — a quantificação (18/19 exclusões falsas) só veio quando o líder forçou a pergunta de harmonização. Registro do padrão: uma ressalva declarada e não medida funcionou, na prática, como um defeito não tratado.

Escopo: **8 fases** (0, 1, 2, 2.5, 3, 4, 5, 6). Cinco materialmente reescritas nas três varreduras, uma acrescentada.

---

## Caminho de reversão

Cada fase é um commit isolado e revertível. As Fases 1-3 são adicionais em um único ponto do fluxo (`enforceExerciseTypePolicy`, chamado após `JSON.parse` e antes de `res.json`): remover a chamada restaura o comportamento anterior integralmente, sem tocar em prompt, contrato ou persistência.
