# Plano de Implementação — Preferência de Idioma para Nomes de Exercícios

**Versão:** 1.0
**Data:** 2026-08-01
**Referências:** `src/types/preferences.ts` · `src/screens/client/SettingsScreen.tsx` · `api/translate-exercise-content.ts` · `src/hooks/useTranslatedExerciseContent.ts` · `api/generate-workout.ts` · `src/screens/trainer/WorkoutPlanEditorScreen.tsx` · `docs/SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md` (Open Finding)
**Estimativa total:** ~13h
**Origem:** Proposta do líder do projeto (2026-08-01) — conflito entre usuários que consideram os nomes de exercícios universais em inglês e usuários cuja cultura rejeita estrangeirismos.

---

## Contexto

Nomes de exercícios são hoje o único conteúdo do app que não acompanha o idioma configurado pelo usuário. Um treinador brasileiro vê `Bulgarian Split Squat` com todos os detalhes ao redor em português. Para parte dos usuários isso é natural — nomes de exercício são vocabulário técnico internacional. Para outros é inaceitável: a mesma cultura que traduz *mouse* por *ratón* não assimila um nome em inglês dentro de uma frase na própria língua.

Não existe resposta única correta. A proposta é transformar isso em **preferência explícita do usuário**, e não em decisão do produto.

### Escopo da preferência

Um toggle em Configurações, com o rótulo **"Manter os nomes dos exercícios no original em inglês"** (ligado/desligado), que:

- afeta **apenas o nome do exercício** — cue, observação, título e demais textos continuam seguindo o idioma do app, como já fazem hoje;
- existe de forma **independente para TRAINER e para CLIENT** — cada conta tem a sua, e a do aluno rege o que chega até ele;
- vale para nomes **manuais e gerados por IA**, e também para a **biblioteca de exercícios**;
- tem o **inglês como padrão** (ligado), preservando o comportamento atual para quem não mexer em nada.

---

## Achados verificados no banco de produção (2026-08-01)

Consultas diretas ao projeto `xbfszzdyskwdctlqzztl`, antes de qualquer decisão de escopo:

| # | Achado | Evidência |
|---|--------|-----------|
| 1 | A biblioteca é **100% inglês** — premissa do líder confirmada | `protocol_exercises`: 162 linhas, 129 nomes distintos, **0 com acentuação** |
| 2 | Os planos já são **mistos**, não inglês puro | `plan_exercises`: 536 linhas / 268 nomes distintos; **~20,5% das linhas** parecem PT (83 nomes distintos) — `Supino Reto`, `Respiração Diafragmática`, `Agachamento Livre` convivem com `Plank` e `Dumbbell Bench Press` |
| 3 | O cache de tradução está **vazio** | `exercise_content_translations`: **0 linhas** — o pipeline entregue hoje ainda não tem efeito em produção |
| 4 | O cache **não registra o idioma de origem** | Chave é `(source_text, target_locale)`; não há coluna de origem |
| 5 | O endpoint assume **origem sempre português**, fixo | `api/translate-exercise-content.ts:134` — correção deliberada do bug pt→es, mas incompatível com origem mista |
| 6 | Fallback devolve o **texto original** em qualquer falha | `api/translate-exercise-content.ts:182` e `:119` |
| 7 | O texto cru é renderizado **antes** da tradução chegar | `src/hooks/useTranslatedExerciseContent.ts:66` — `cache.get(...) ?? text` |
| 8 | O endpoint trunca em **50 itens** | `MAX_ITEMS = 50` + `.slice(0, MAX_ITEMS)` — a biblioteca tem **129 nomes**: 79 voltariam sem tradução, em operação normal |
| 9 | O botão "Perguntar à IA" do treinador envia **`locale: 'en'` fixo** | `src/screens/trainer/WorkoutPlanEditorScreen.tsx:268` — ignora o idioma do aluno destinatário |
| 10 | A tabela `preferences` é **coluna por preferência** | 26 colunas, snake_case; adicionar a preferência é uma coluna aditiva |

**Efeito líquido dos achados 6, 7 e 8:** o modelo atual — traduzir na leitura, com fallback para a origem — entrega inglês exatamente a quem configurou para não ver inglês. Um aluno espanhol abrindo a biblioteca veria hoje **50 nomes traduzidos e 79 em inglês**, sem que nenhum erro tenha ocorrido.

---

## Decisões arquiteturais

Derivadas da análise acima e validadas com o líder do projeto (2026-08-01):

| # | Decisão | Razão |
|---|---------|-------|
| D1 | Escopo é **o nome do exercício**, nada mais | Demanda real dos usuários; misturar critérios entre nome e cue não foi pedido |
| D2 | Duas preferências **independentes**, uma por conta | Treinador e aluno podem legitimamente discordar; a do aluno rege o que ele recebe |
| D3 | Padrão é **inglês** (toggle ligado) | Preserva o comportamento atual; quem não configurar nada não percebe mudança |
| D4 | Biblioteca é **pré-traduzida e armazenada**, com revisão humana | Único modelo que garante que o nome no idioma-alvo existe *antes* de alguém olhar. Elimina fallback, flash e o truncamento em 50. Terminologia técnica merece revisão humana |
| D5 | Conteúdo de IA é **gerado direto no idioma do destinatário** — sem etapa de tradução | Sem tradução não há fallback nem flash. É o que o fluxo autônomo do cliente já faz corretamente hoje |
| D6 | Nome digitado à mão é gravado **verbatim**, com o idioma de origem **registrado** | Ida-e-volta de tradução é comprovadamente não-determinístico (`Remada Curvada` → `Bent-Over Row` → `Remo Curvado`). O treinador não pode ver o próprio texto mudar |
| D7 | Idioma de origem é **registrado**, nunca inferido pelo modelo | Inferir foi exatamente a causa do bug pt→es. Registrar na escrita é a correção que funcionou |
| D8 | Falha de tradução resolve para o **nome originalmente enviado** — decidido pelo líder (2026-08-01): "não temos todos os elementos para decidir sobre isso e não devemos tratar a exceção como regra" | É o mesmo fallback já usado em todo o resto do sistema (§6.3); tratado como exceção aceita, não como caso a projetar indicador visível dedicado |

### O conflito que permanece irredutível

Treinador brasileiro digita `Remada Curvada` à mão para um aluno espanhol purista. Não há forma canônica pré-existente nem geração no idioma-alvo — tradução em tempo de leitura é o único caminho. Decidido (D8): quando a tradução não estiver disponível, o nome originalmente enviado é mantido, sem tratamento visual dedicado para essa exceção. Fora isso, o caso não tem solução puramente técnica.

---

## Premissas

- Nenhuma fase reescreve texto que o usuário digitou.
- Cada fase é independentemente publicável e reversível (§4.9).
- O cache está vazio **agora** — mudanças de schema nele são gratuitas nesta janela e caras depois.
- Nenhuma fase fecha sem `tsc --noEmit` limpo, lint limpo, testes verdes e verificação ao vivo com conta real.
- Todo teste de regressão novo é mutation-testado antes de contar como cobertura.
- Produção publica de `main` no push — cada fase exige autorização explícita antes do push (§9.4).
- A biblioteca (129 nomes) é conteúdo curado do produto, não conteúdo de usuário — tratada como tal.

---

## Governança de execução

Herdada de `docs/SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md`, mesma aplicação pelo líder do projeto.

| Regra | Diretriz | Requisito nesta workstream |
|-------|----------|----------------------------|
| Isolamento de branch | §4.9 | Uma branch por fase; PR não obrigatório neste projeto |
| Qualidade mínima | §8.2 | `lint`, `test`, `build` verdes no escopo impactado antes de publicar |
| Promoção rastreável | §8.3 | Registrar branch, SHA, URL de deploy, ambiente e data |
| Staging antes de produção | §9.2 | Não existe staging neste projeto — decisão em aberto herdada; validação ao vivo com conta real substitui, e isso fica registrado |
| Autorização de produção | §9.4 | Autorização explícita do líder antes de cada promoção, com causa provável, impacto, escopo, reversibilidade e critério de pós-validação |
| Rollback por design | §4.9 | Caminho de reversão escrito antes de promover |
| Uma capacidade, um contrato | §4.5 | A preferência tem uma única fonte de verdade (`preferences`), consumida por todas as telas |
| Versionamento de schema de IA | §6.3 | Mudança de prompt e de contrato de resposta versionadas juntas; parsing tolerante |

### Registro de promoção

| Fase | Branch | Commit SHA | Validado | Autorizado por | URL de deploy | Data |
|------|--------|-----------|----------|----------------|---------------|------|
| 0 (migração) | — (DB, sem branch) | n/a — aplicada via ferramenta de migração, sem staging neste projeto | Não — schema-only, tabelas afetadas com 0 linhas | Líder do projeto | aplicada direto em `xbfszzdyskwdctlqzztl` | 2026-08-01 |
| 0 (código) | `main` (direto) | `a2ee571` | Sim — verificado ao vivo com conta real (`carlos.silva@trainer.test`), ver Fase 0 | Líder do projeto | deploy automático via push em `main` (Vercel) | 2026-08-01 |
| 1 (carga de dados) | — (DB, sem branch) | n/a — 387 linhas aplicadas via SQL Editor do Supabase, sem staging neste projeto | Sim — `curated_count = 387` confirmado por consulta direta | Líder do projeto | aplicada direto em `xbfszzdyskwdctlqzztl` | 2026-08-01 |
| 1 (código) | `main` (direto) | `53d8bb4` | Sim — verificado ao vivo em produção (`trainer-lake.vercel.app`), resposta de rede conferida item a item, 129/129 | Líder do projeto | https://trainer-lake.vercel.app | 2026-08-01 |
| 2 (migração) | — (DB, sem branch) | n/a — aplicada via ferramenta de migração, sem staging neste projeto | Não ainda — coluna aditiva, sem consumidor até o código ser publicado | Líder do projeto | aplicada direto em `xbfszzdyskwdctlqzztl` | 2026-08-01 |
| 2 (código) | `main` (direto) | *pendente* | *pendente — aguardando push e verificação ao vivo* | Líder do projeto | *pendente* | 2026-08-01 |

---

## Fase 0 — Contrato da preferência e schema

**Esforço:** ~2h · **Risco:** Baixo · **Depende de:** nada · **Migração:** sim (aditiva)

Estabelece a preferência e corrige o schema do cache enquanto ele está vazio. **Nenhuma mudança de comportamento** — a preferência é gravada e lida, mas ainda não consumida por nenhuma tela. Fase deliberadamente inerte, para que o contrato exista antes de qualquer lógica depender dele.

### Checklist

- [x] Migração: `preferences.keep_exercise_names_in_english boolean not null default true`
- [x] Migração: `exercise_content_translations.source_locale text` — idioma de origem registrado, nunca inferido (D7)
- [x] Migração: `exercise_content_translations.curated boolean not null default false` — distingue terminologia revisada de saída de runtime; escrita de runtime nunca sobrescreve `curated = true`
- [x] Migração: ajustar a constraint única para `(source_text, source_locale, target_locale)`
- [x] `AppPreferences.keepExerciseNamesInEnglish: boolean` em `src/types/preferences.ts`
- [x] Mapeamento snake_case ↔ camelCase no serviço de preferências (`App.tsx` — hidratação e escrita)
- [x] Toggle em `SettingsScreen.tsx`, visível para TRAINER e CLIENT (seção "Nomes de Exercícios", sem guarda de role)
- [x] Chaves i18n `settings.toggle.exerciseNamesEnglish.{label,hint}` + `settings.sections.exerciseNames` nos 4 locales
- [x] Helper único `resolveExerciseNameLocale(prefs)` → `AppLanguage` — `src/lib/exerciseNameLocale.ts`, fonte de verdade única (§4.5)
- [x] Teste unitário do helper, mutation-testado (`src/lib/exerciseNameLocale.test.ts` — 3 testes; mutação de inversão da condição confirmada como capturada)

### Aceitação

- [x] Toggle aparece nas duas versões, alterna e persiste entre sessões — verificado ao vivo (conta `carlos.silva@trainer.test`): alternado para desligado, `SELECT` direto no banco confirmou `false`, reload da página refletiu o estado persistido, restaurado para `true`
- [x] Padrão de conta nova e de conta existente é **ligado** (inglês) — `default true` na coluna e no estado inicial do React
- [x] Nenhuma tela muda de comportamento nesta fase — helper criado mas não consumido por nenhum caller ainda (verificado por grep)
- [x] `tsc`, lint, testes, build verdes — 68/68 testes, 0 erros de lint, build ok

---

## Fase 1 — Terminologia da biblioteca (materializada)

**Esforço:** ~4h · **Risco:** Baixo · **Depende de:** Fase 0 · **Migração:** não (apenas dados)

Traduz os 129 nomes da biblioteca **uma única vez, offline, com revisão humana**, e passa a servi-los do banco. Nenhuma chamada de tradução em tempo de leitura para conteúdo de biblioteca — o que elimina de uma vez o fallback (achado 6), o flash (achado 7) e o truncamento em 50 (achado 8) para essa superfície.

### Checklist

- [x] Traduções dos 129 × 3 (`pt`, `es`, `de`) a partir do inglês, com `source_locale = 'en'` — rascunho inicial + auditoria por segundo modelo com orientação de contexto, revisada linha a linha (51/129 correções aceitas)
- [x] Saída em arquivo revisável (`docs/EXERCISE_LIBRARY_TRANSLATIONS_DRAFT_20260801.md`) — não escreveu no banco direto
- [x] Revisão humana da terminologia pelo líder do projeto antes da carga
- [x] Carga no banco com `curated = true` — 387 linhas confirmadas (129 × 3)
- [x] `TrainerLibraryExercisesScreen` renderiza o nome conforme a preferência do treinador — os 3 pontos de exibição (aba Exercícios, aba Protocolos, assistente de voz) conectados, `sourceLocale: 'en'` explícito
- [x] Autocomplete do editor de plano idem — sugestões do catálogo conectadas, `sourceLocale: 'en'` explícito. A lista de exercícios já adicionados ao plano **não** foi conectada — origem mista (catálogo ou digitado à mão) sem rastreamento ainda; ver nota abaixo
- [x] Leitura passa pelo cache do próprio endpoint existente (`api/translate-exercise-content.ts`, cache-first) — sem chamada ao modelo quando há linha curada; não é uma leitura direta e separada do banco como o texto original sugeria, mas atinge o mesmo efeito (achados 6/7/8)
- [~] Cobertura: preferência ligada → inglês (coberto, testes do endpoint); desligada → idioma do app (coberto); termo sem tradução curada → mantém o original (D8, coberto) — sem teste end-to-end específico da tela ainda
- [x] Testes mutation-testados (endpoint: 4 novos testes; hook: 4 novos testes)

**Achado durante a implementação, fora do escopo original**: dois bugs reais foram encontrados e corrigidos no endpoint compartilhado (`api/translate-exercise-content.ts`), preexistentes desde a Fase 0 mas nunca exercitados até a Fase 1 gerar tráfego real: (1) o `on_conflict` da escrita de cache ainda referenciava a constraint de 2 colunas, quebrado desde que a Fase 0 ampliou para 3; (2) o prompt de tradução assumia origem fixa em português — quebrado para o conteúdo em inglês que a Fase 1 introduziu. Ver commit para detalhes. `MAX_ITEMS` também foi ampliado de 50 para 300 (a biblioteca inteira excede o limite antigo).

### Aceitação

- [x] Conta pt-BR com toggle desligado: **129/129** traduzidos corretamente — verificado ao vivo em produção (`trainer-lake.vercel.app`, conta `carlos.silva@trainer.test`), resposta de rede conferida item a item contra a curadoria final: todas as 129 entradas batem exatamente, incluindo as 51 correções da auditoria (`Hip Thrust`, `Farmer's Walk`, `Kettlebell Swing` mantidos em inglês; `Passagem de Ombros com Elástico` em vez do termo de lesão; termos de decúbito dorsal/ventral)
- [x] Conta com toggle ligado: biblioteca volta a exibir em inglês — verificado ao vivo (`Back Squat`, `400m Interval Run`, `90/90 Hip Stretch`, `A-Skip Drill`)
- [x] Autocomplete respeita a preferência e ainda encontra o exercício
- [x] Nenhum nome pisca em inglês antes de virar espanhol/português (verificado ao vivo)
- [x] `tsc`, lint, testes, build verdes

**Nota sobre o "Bird-Dog" durante a investigação**: a verificação local (antes de publicar) mostrou resultados inconsistentes — alguns nomes bateram com a curadoria, outros não (`Bird-Dog` → `Pássaro-Cachorro`, `Back Squat` → `Agachamento` sem "Livre"). Investigação extensa (testes isolados, comparação byte a byte do SQL, consulta direta ao banco) eliminou dado incorreto e bug de código como causa — a causa real era `SUPABASE_SERVICE_ROLE_KEY` ausente em `.env.local`, fazendo toda leitura/escrita de cache falhar com 401 silenciosamente (log adicionado para essa classe de falha, antes invisível). Lacuna de ambiente local pré-existente à Fase 1, não um defeito desta fase — confirmada resolvida na verificação em produção acima, onde a chave está configurada.

---

## Fase 1b — Metadados de protocolo (extensão, 2026-08-01)

**Esforço:** ~2h · **Risco:** Baixo · **Depende de:** Fase 1 · **Migração:** não (apenas dados)

**Origem:** achado do líder do projeto ao revisar a aba "Protocolos" da Biblioteca de Exercícios — nem o toggle de nomes de exercício, nem o idioma geral do app, alcançavam o título, a descrição, o objetivo ou o nível do protocolo (`Full Body Beginner Fat Burn`, `HIIT Cardio Blast` etc. permaneciam em inglês dentro de uma UI em português). `workout_protocols` é uma tabela dinâmica — treinadores/estúdios criam novos protocolos via `createProtocol` (`src/studio/hooks/useStudioData.ts`) — logo o problema não é dado estático a corrigir uma vez, é ausência de tradução na superfície.

Categoria de conteúdo diferente de "nome de exercício" (não é gated pelo toggle "manter em inglês" — esse toggle é especificamente sobre nomes de movimento): título/objetivo/descrição de protocolo sempre seguem o idioma do app do treinador. `level` é enum fechado de 3 valores, mesmo caminho i18n já usado para `exercise.level` (`trLvl`), não a pipeline de tradução.

### Checklist

- [x] `{p.level}` → `{trLvl(p.level)}` — reaproveita o helper i18n já existente para o enum de nível
- [x] Novo hook `translateProtocolText` (`useTranslatedExerciseContent`, `sourceLocale: 'en'`, sem `targetLocale` explícito — segue o idioma do app do viewer) cobrindo `name`, `objective`, `description` dos 30 protocolos
- [x] Aplicado nos 3 pontos de exibição (título, descrição, valor do objetivo) em `TrainerLibraryExercisesScreen.tsx`
- [x] Traduções pt/es/de compostas diretamente (sem auditoria externa — conteúdo de baixo risco de ambiguidade técnica, decisão do líder do projeto) para os 30 nomes, 30 descrições e 5 valores distintos de `objective`
- [x] Rascunho revisável (`docs/PROTOCOL_METADATA_TRANSLATIONS_DRAFT_20260801.md`) antes da carga
- [x] Carga no banco com `curated = true` — 195 linhas (`supabase/sql-archive/supabase-protocol-metadata-curated-translations-20260801.sql`), aplicada via MCP em `xbfszzdyskwdctlqzztl`; confirmada: 30/30 nomes com 3 traduções curadas cada, 30/30 descrições idem
- [x] Reaproveita a mesma tabela/endpoint (`exercise_content_translations`), sem migração nova — a chave é agnóstica de qual tela originou o texto
- [x] `tsc`, lint, testes (75/75), build verdes

### Aceitação

- [x] Verificado ao vivo em produção (`trainer-lake.vercel.app`, `carlos.silva@trainer.test`, conta pt-BR): título, badge de nível e descrição/objetivo conferidos em 3 protocolos (`Full Body Beginner Fat Burn` → `Queima de Gordura Corpo Inteiro para Iniciantes`/INICIANTE/Perda de Peso; `Fat Burn Tabata` → `Tabata Queima Gordura`/AVANÇADO; `Express Lunch Break Burner` → `Queima Rápida na Pausa do Almoço`/INICIANTE) — todos batendo exatamente com o rascunho, nenhum resíduo em inglês
- [x] `tsc`, lint, testes (75/75), build verdes — confirmado antes do push

---

## Fase 2 — Nomes gerados por IA

**Esforço:** ~3h · **Risco:** Médio (toca geração ao vivo) · **Depende de:** Fase 0 · **Migração:** sim (aditiva, ver nota)

Faz a IA gerar o nome **já no idioma correto do destinatário**, eliminando a etapa de tradução para esse caminho (D5). Corrige, no mesmo movimento, o `locale: 'en'` fixo (achado 9), que hoje entrega nomes em inglês a alunos configurados em outro idioma independentemente de qualquer preferência.

**Nota sobre a migração (2026-08-01)**: o checklist original pedia gravar `name_source_locale` "preparando a Fase 3, mesma coluna" com o cabeçalho da fase declarando `Migração: não` — contraditório, já que nem `plan_exercises` nem `workout_session_exercises` tinham essa coluna. Confirmado via consulta direta ao schema de produção antes de codificar. Corrigido antecipando só a metade da migração da Fase 3 que esta fase precisa: `plan_exercises.name_source_locale text` (nullable, aditiva), aplicada diretamente em `xbfszzdyskwdctlqzztl` com autorização do líder. `workout_session_exercises.name_source_locale` permanece para a Fase 3, que não é tocada por este fluxo.

### Checklist

- [x] `WorkoutPlanEditorScreen`: substituir `locale: 'en'` pelo idioma efetivo do **aluno destinatário** (D2 — a preferência dele rege o que chega até ele) — [WorkoutPlanEditorScreen.tsx:322](../src/screens/trainer/WorkoutPlanEditorScreen.tsx)
- [x] Carregar a preferência do aluno junto do contexto do cliente já buscado na tela — nova consulta a `preferences` no mesmo `Promise.all` que já busca `profile_v2`/`checkin_prontidao`
- [x] Registrar `name_source_locale` nas linhas geradas (prepara a Fase 3; mesma coluna) — gravado no mapeamento da resposta da IA e persistido em `sendPlan()`; limpo automaticamente se o treinador reescrever o nome à mão; itens vindos do catálogo são marcados `'en'` (fonte certa, achado #1)
- [x] Editor do treinador: renderiza conforme a preferência **do treinador**, traduzindo só quando divergir da do aluno — reaproveita `useTranslatedExerciseContent`, mesmo padrão do autocomplete do catálogo; sem teste unitário dedicado ainda (ver nota de cobertura abaixo)
- [ ] Verificar empiricamente contra o modelo real que o nome sai no idioma pedido — 3 execuções por par de idiomas, não uma — **pendente, requer verificação ao vivo em produção após o push**
- [x] Confirmar que cue/observação/título continuam no idioma do app (fora de escopo, não podem regredir) — não tocados; verificado por grep, nenhum caminho de `notes`/cue alterado
- [x] Testes mutation-testados — 6 testes novos (`WorkoutPlanEditorScreen.test.tsx`), cada mutação de linha alterada confirmada como capturada

**Nota de cobertura**: a tradução condicional da lista já adicionada (item 4) não tem teste unitário dedicado — os 6 testes novos cobrem o caminho de escrita (locale enviado à IA, gravação e limpeza de `name_source_locale`), que é o que a Fase 3 e a aceitação desta fase dependem. A exibição para o próprio treinador é um refinamento de UX, não coberto pelos critérios de aceitação abaixo.

### Aceitação

- [ ] Treinador PT gera para aluno ES com toggle desligado: nomes chegam em espanhol, sem tradução em runtime — **pendente verificação ao vivo**
- [ ] Treinador PT gera para aluno ES com toggle ligado: nomes chegam em inglês — **pendente verificação ao vivo**
- [x] Cue e observação seguem o idioma do app em todos os casos acima (não regrediram) — não tocados nesta fase
- [ ] Fluxo autônomo do aluno permanece correto (regressão — já funcionava) — **pendente verificação ao vivo**
- [x] `tsc`, lint, testes (82/82), build verdes

---

## Fase 3 — Nomes digitados à mão

**Esforço:** ~4h · **Risco:** Médio (único caminho que ainda depende de tradução em runtime) · **Depende de:** Fases 0 e 2 · **Migração:** sim (aditiva)

Único caso sem forma canônica prévia. Grava verbatim (D6), registra a origem (D7) e traduz na leitura apenas quando o leitor pede idioma diferente. Falha de tradução mantém o nome originalmente enviado (D8).

### Checklist

- [ ] Migração: `plan_exercises.name_source_locale text` e `workout_session_exercises.name_source_locale text` (aditivas, nullable)
- [ ] Gravar o idioma do treinador no momento em que ele digita o nome
- [ ] `translate-exercise-content`: aceitar `sourceLocale` por item e declará-lo no prompt, substituindo o português fixo (achado 5)
- [ ] Curto-circuito: origem igual ao alvo → nenhuma chamada, texto intocado
- [ ] Backfill das linhas legadas: classificar `name_source_locale` (en/pt/es/de) por inspeção direta dos 268 nomes distintos existentes — decidido pelo líder (2026-08-01), sem sistema de detecção automática dedicado
- [ ] Falha de tradução mantém o nome originalmente enviado (D8) — mesmo fallback já usado no resto do pipeline, sem indicador visual dedicado
- [ ] Revalidar empiricamente o par pt→es após a mudança de prompt — foi onde o defeito original apareceu
- [ ] Revisar `MAX_ITEMS = 50` para o volume real desta superfície
- [ ] Testes mutation-testados, incluindo o caso origem == alvo

### Aceitação

- [ ] Treinador PT digita `Remada Curvada`, aluno PT: texto chega **idêntico**, zero chamadas de tradução
- [ ] Treinador PT digita `Remada Curvada`, aluno ES com toggle desligado: chega em espanhol
- [ ] Treinador PT digita, aluno com toggle ligado: chega em inglês
- [ ] O treinador **nunca** vê o próprio texto digitado se alterar sozinho no editor
- [ ] Falha de tradução tem comportamento observável, não silencioso
- [ ] 10 execuções do pior caso (pt→es, frase curta) sem nome não traduzido
- [ ] `tsc`, lint, testes, build verdes

---

## Log de progresso

| Fase | Status | Concluída | Commit | Notas |
|------|--------|-----------|--------|-------|
| 0 — Contrato e schema | **Concluída** | 2026-08-01 | `a2ee571` | Migração aplicada direto em `xbfszzdyskwdctlqzztl` (sem staging); código verificado ao vivo e publicado em `main` |
| 1 — Biblioteca | **Concluída** | 2026-08-01 | `53d8bb4` | 387 traduções curadas carregadas; verificado ao vivo em produção, 129/129 corretos nos dois estados do toggle |
| 1b — Metadados de protocolo | **Concluída** | 2026-08-01 | `e99b2cf` | 195 traduções curadas carregadas; verificado ao vivo em produção, 3 protocolos conferidos item a item |
| 2 — Nomes de IA | Código concluído, verificação ao vivo pendente | — | — | Migração (`plan_exercises.name_source_locale`) aplicada em produção; código aguardando push e teste ao vivo |
| 3 — Nomes manuais | Não iniciada | — | — | — |

---

## Decisões resolvidas (líder do projeto, 2026-08-01)

| # | Questão | Decisão |
|---|---------|---------|
| A1 | Comportamento quando a tradução falha e o leitor rejeitou o idioma de origem | Mantém o nome originalmente enviado. Tratado como exceção aceita — sem indicador visual dedicado (ver D8) |
| A2 | Backfill de `name_source_locale` nas 268 linhas legadas sem essa informação | Classificação direta por inspeção (en/pt/es/de), feita pelo executor, sem sistema de detecção automática dedicado — estimativa inicial de >80% inglês |
| A3 | Ambiente de staging para este projeto | Adiado — ambiente atual de "produção" é base de testes, não versão comercial |
| A4 | `translate-exercise-content.ts` envia observações de texto livre (potencialmente clínicas) a uma API externa (DeepSeek) | `multilingual_communication_architecture.md` §1.2.2 revisado (v1.1, 2026-08-01): de proibição para preferência — API externa não é mais proibida para conteúdo sensível, apenas desencorajada como padrão; uso pragmático autorizado. Risco aceito como está |

---

## Achado adicional — conformidade com arquitetura já aprovada (2026-08-01)

Antes de aplicar o perfil profissional a esta tarefa, li `policies/references/multilingual_communication_architecture.md` — referência que o próprio `PROFILE.md` exige consultar. Dois pontos mudam a leitura deste plano:

1. **Inglês canônico já é decisão arquitetural aprovada e implementada** para conteúdo gerado pelo sistema (notificações via `template_key` + `params`, resolvidos localmente por `tr()` no dispositivo do destinatário) — não é uma preferência nova, é extensão de um padrão já em produção. A Fase 1 deste plano (biblioteca pré-traduzida, sem chamada de rede em runtime) **já está alinhada** com esse padrão — mesmo princípio de "render-on-consume a partir de arquivo local".

2. O documento continha uma proibição explícita de APIs de tradução externas para conteúdo sensível/clínico, que colidia com o pipeline já em produção (`api/translate-exercise-content.ts`, via DeepSeek, usado também para a observação do exercício — texto livre que pode conter contexto clínico). **Revisado para v1.1 (2026-08-01)**, por autorização do líder: de proibição para preferência (ver A4) — "o ótimo é inimigo do bom".

---

## Caminho de reversão

| Fase | Reversão |
|------|----------|
| 0 | Colunas aditivas com default — reverter o código restaura o comportamento anterior sem tocar no banco |
| 1 | Deixar de ler as traduções curadas; as linhas ficam no banco, inertes |
| 2 | Restaurar o valor de locale anterior no editor; nenhum dado gravado muda de forma |
| 3 | Deixar de enviar `sourceLocale`; endpoint volta ao comportamento anterior. `name_source_locale` fica gravado e inerte |
