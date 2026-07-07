# Auditoria de Gating de Funcionalidades por Plano — 2026-06-16

Levantamento do que cada `plan_key` promete (texto comercial em `PlansScreen.tsx` /
i18n `plans.text.*`) versus o que está **efetivamente implementado** (gate em
código) na data desta auditoria. Baseado em `git grep` por `plan_key`/`isPremium`/
`PlanKey` em todo `src/`.

---

## 1. Planos do cliente final (`role = 'client'`)

| Plano (`plan_key`) | Perfil | Funcionalidades prometidas (i18n `plans.text.*`) | Funcionalidades **implementadas** (gate real) | Status do amarramento |
|---|---|---|---|---|
| `free` | Cliente final, sem assinatura paga (default de todo cadastro). | Biblioteca de treinos inteligente; acompanhamento básico de progresso; algumas dicas de IA por semana. | • `TelaScores` (`PerformanceDashboardScreen.tsx`) exibe os 4 scores "free": `sessionCompletion`, `churnRisk`, `painRecurrence`, `planFit` (`FREE_SCORE_CODES`).<br>• Os outros 5 scores aparecem como `LockedScoreCard` (borrado + CTA → `plans`). | ✅ **Amarrado**. `isPremium = !!selectedClient \|\| user.plan_key === 'ai_performance'` (`PerformanceDashboardScreen.tsx:72`) — para `free`, `isPremium = false`, então os 5 scores avançados ficam bloqueados. |
| `ai_fitness` | Cliente, tier intermediário (€9.99). | Planos de IA totalmente personalizados; ajustes diários por energia e dores; programação sensível ao ciclo; histórico e insights completos. | **Nenhuma.** Não há nenhum `if (plan_key === 'ai_fitness')` no código — nem em `buildAIContext.ts`, nem em `askAI()`, nem em telas de plano/ciclo. | ❌ **Não implementado.** `ai_fitness` é aceito pelo CHECK constraint e pela UI de seleção de plano (grava em `subscriptions`), mas **não desbloqueia nada**: hoje um usuário `free` e um `ai_fitness` têm experiência idêntica no app. |
| `ai_performance` | Cliente, tier avançado (€24.99). | Tudo do AI Fitness + análises avançadas de desempenho + carga/recuperação preditivas + revisão humana prioritária. | • Desbloqueia os 5 scores avançados em `TelaScores`: `fatigueRisk`, `recoveryInstability`, `progressionReadiness`, `responseCompatibility`, `plateauRisk`. | ⚠️ **Parcialmente amarrado.** O gate dos 5 scores funciona (`isPremium === true` quando `plan_key === 'ai_performance'`). Mas as outras promessas ("revisão humana prioritária", "tudo do AI Fitness" — que por si só não existe) **não têm contrapartida em código**. |

---

## 2. Planos do trainer (`role` em `TRAINER_ROLES`: `trainer`, `studio_trainer`,
`studio_admin`, `internal_trainer`, `technical_coordinator`, `studio_manager`)

| Plano (`plan_key`) | Perfil | Funcionalidades prometidas (i18n `plans.text.*`) | Funcionalidades **implementadas** (gate real) | Status do amarramento |
|---|---|---|---|---|
| `trial` (14 dias) | Trainer em teste, sem cobrança. | Até 3 alunos; construtor de planos com IA; painel básico do estúdio. | **Nenhuma.** `TrainerDashboardScreen.tsx`, fluxo de `trainer_invitations` e `CoachDNAScreen.tsx` não leem `plan_key` em nenhum ponto. | ❌ **Não implementado.** Um trainer em `trial` pode vincular qualquer número de `trainer_clients` — o limite "até 3 alunos" não é verificado em lugar nenhum (nem no aceite de convite, nem no dashboard). |
| `pro` (€49) | Trainer pago, tier intermediário. | Alunos ilimitados; motor de metodologia com IA (Coach DNA); espaço de estúdio com marca própria; insights de adesão/alunos. | **Nenhuma.** `CoachDNAScreen.tsx` está disponível para qualquer trainer, independentemente de `plan_key`. | ❌ **Não implementado.** Coach DNA, branding de estúdio e insights não são condicionados a `pro`/`elite` — estão abertos (ou simplesmente não existem) para qualquer trainer. |
| `elite` (€99) | Trainer pago, tier máximo. | Tudo do Pro + app white-label para alunos + suíte de análises avançadas + destaque no marketplace + 15% revenue share sobre alunos vindos do marketplace. | **Nenhuma.** Não existe módulo de marketplace no código (`marketplace_*` não existe em `src/types/supabase.ts`); não há white-label de app nem "suíte de análises avançadas" diferenciada por tier. | ❌ **Não implementado.** Todas as features de `elite` dependem da Fase 3 (Marketplace) do roadmap, que ainda não foi iniciada. |

---

## 3. Conclusões

1. **Único gate real existente hoje**: `isPremium` em
   [PerformanceDashboardScreen.tsx:72](../../../../src/screens/client/PerformanceDashboardScreen.tsx#L72),
   que distingue apenas `ai_performance` (libera os 5 scores avançados) de
   todos os demais `plan_key` (mostram só os 4 scores free). Este gate está
   **corretamente amarrado** e coberto por testes (`PlansScreen.test.tsx`,
   `PerformanceDashboardScreen.test.tsx`).

2. **`ai_fitness` é um plano "fantasma"**: pode ser selecionado e persistido
   via `upsertSubscription`, aparece como "Plano atual" na UI, mas **não
   desbloqueia nenhuma funcionalidade**. Do ponto de vista do usuário pagante,
   `ai_fitness` e `free` são indistinguíveis no app hoje.

3. **Nenhum dos 3 planos de trainer (`trial`/`pro`/`elite`) tem qualquer gate
   de código**: limites de alunos, Coach DNA, branding e marketplace são
   100% texto comercial em `plans.text.*`, sem enforcement em
   `TrainerDashboardScreen.tsx`, fluxo de convites, ou `CoachDNAScreen.tsx`.

4. **Risco de produto/compliance**: cobrar por `ai_fitness`, `pro`, `elite` ou
   `trial`-com-limite hoje significaria cobrar por funcionalidades que não
   existem tecnicamente — qualquer billing real (Fase 0 completa/Stripe) sobre
   esses planos precisa ser precedido pela implementação dos gates
   correspondentes, listados como itens `[ ]` nas Fases 1 e 2 do
   `Monetization_Implementation_Roadmap.md`.

---

## 4. Próximos gates a implementar (por prioridade sugerida)

| Prioridade | Gate | Onde | Depende de |
|---|---|---|---|
| 1 | `ai_fitness` → ajuste de IA por check-in (Coach DNA básico aplicado ao cliente) | `src/ai/buildAIContext.ts` / `askAI()` | Decisão de produto: o que exatamente o ajuste de IA faz hoje vs. com `ai_fitness` |
| 2 | `trial` → limite de 3 `trainer_clients` ativos | Aceite de `trainer_invitations` + `TrainerDashboardScreen.tsx` | Nenhuma — pode ser implementado isoladamente |
| 3 | `pro`/`elite` → Coach DNA condicionado ao tier | `CoachDNAScreen.tsx` | Nenhuma |
| 4 | `elite` → marketplace + revenue share | Módulo novo (Fase 3 do roadmap) | Maior esforço — fora do escopo de "Fase 0 light" |

---

## 5. Inventário de Funcionalidades do Sistema (sem associação a planos)

> Levantamento **profile-agnostic** de tudo o que o produto faz hoje, organizado
> por domínio funcional. Objetivo: servir de insumo para uma análise de negócio
> externa que vai mapear cada funcionalidade aos planos (`free`, `ai_fitness`,
> `ai_performance`, `trial`, `pro`, `elite`). Nenhuma das descrições abaixo
> implica gate de plano — esse mapeamento é o próximo passo, fora deste documento.

### 5.1 Onboarding e Perfil do Cliente

**F01 — Cadastro e primeiro acesso**
Fluxo de criação de conta (e-mail/senha ou Google OAuth), sem seleção de papel
no formulário — todo cadastro inicia como `client`. Suporta fluxo de convite
(o usuário chega via link de convite de um trainer, com e-mail pré-preenchido
e bloqueado; ao confirmar, vincula automaticamente o cliente ao trainer que
convidou via `accept_trainer_invitation`).

**F02 — Seleção de plano (onboarding)**
Após o cadastro, o usuário escolhe um plano de uso (cliente: Free / AI Fitness
/ AI Performance; trainer: Trial / Pro / Elite). A escolha é persistida
imediatamente (tabela `subscriptions`, sem checkout/cobrança real ainda) e o
usuário segue para o preenchimento do perfil.

**F03 — Wizard de perfil (15 etapas)**
Questionário guiado e progressivo que constrói o perfil completo do cliente
para personalização e segurança da IA. Cada etapa é opcional/skippable onde
aplicável, com apoio de overlay de voz (ver F04). Etapas:

1. **Boas-vindas** — introdução ao processo de perfilamento, sem coleta de dados.
2. **Dados básicos** — nome, data de nascimento/idade, sexo biológico, altura
   (cm), peso (kg), localização.
3. **Objetivos** — objetivo principal (ex.: hipertrofia, perda de peso, força)
   e objetivos secundários (seleção múltipla entre 13 opções), com nota de voz
   opcional explicando motivações.
4. **Histórico de movimento** — frequência semanal de treino no passado, nível
   de condicionamento (iniciante/intermediário/avançado), modalidades já
   praticadas (musculação, corrida, yoga, etc.), histórico de abandono e
   preferência de progressão de intensidade.
5. **Saúde declarada** — declaração geral de condições de saúde (sim/não/prefiro
   não informar), categorias (cardiovascular, metabólica, musculoesquelética,
   etc.) e observações em texto livre.
6. **Comorbidades** — condições específicas (hipertensão, diabetes, asma,
   obesidade, gestação, pós-operatório, etc.).
7. **Capacidade funcional** — nível de mobilidade, equilíbrio/estabilidade,
   autonomia (parcial/independente), severidade de dor, acesso a equipamentos
   e preferências de formato de instrução (visual, auditivo, texto simplificado).
8. **Hábitos** — barreiras de estilo de vida (sedentarismo, baixa hidratação,
   estresse elevado, alimentação irregular, distúrbios de sono, tabagismo,
   compulsão alimentar emocional, etc.).
9. **Fatores sensíveis** — dados de ciclo menstrual (se aplicável), uso de
   contraceptivos, gestação, recuperação pós-parto, histórico de trauma.
10. **Ritmo corporal** — duração e fase do ciclo menstrual (se aplicável),
    padrões de energia ao longo do dia/semana.
11. **Ambiente de treino** — locais de treino (casa, academia, parque, etc.),
    equipamentos disponíveis (halteres, barra, máquinas, etc.) e tags de
    acessibilidade (baixo impacto, sem exercícios no chão, opções sentado).
12. **Disponibilidade** — dias da semana disponíveis, duração preferida de
    sessão, horário do dia preferido e restrições de agenda/deslocamento.
13. **Preferências** — intensidade de treino preferida (gradual/moderada/
    intensa), preferências de dias de descanso e de estilo de treino.
14. **Consentimento** — permissões de uso de dados (adaptação por IA,
    compartilhamento de dados, mascaramento de informações sensíveis de saúde).
15. **Classificação de risco** — o sistema calcula automaticamente um nível de
    risco (baixo/moderado/alto/crítico) a partir das declarações de saúde e
    comorbidades, sinalizando casos que exigem revisão humana ou mascaramento
    de dados sensíveis por IA.

**F04 — Overlay de voz no wizard**
Modal de captura de voz disponível em etapas-chave do wizard (objetivos,
histórico de saúde, preferências). Transcreve a fala, limpa o texto
automaticamente e converte em campos estruturados do formulário, evitando
digitação manual de respostas longas.

---

### 5.2 Check-in e Avaliação de Prontidão

**F05 — Check-in rápido**
Formulário de ~40 segundos com 5 perguntas em formato de slider/seleção:
energia (0–10), qualidade do sono (ruim/regular/boa/excelente), presença e
intensidade de dor (com seleção opcional de região do corpo), fadiga (0–10) e
tempo disponível para o treino (minutos).

**F06 — Check-in detalhado**
Formulário completo (~5 minutos) que, além dos itens do check-in rápido,
coleta: detalhes de dor (região, intensidade, movimento que provoca),
tipo de fadiga, estado emocional, sinais de segurança (red flags) e
preferências de adaptação do treino do dia.

**F07 — Check-in por voz**
Modalidade de ~30 segundos em que o usuário fala livremente sobre como está se
sentindo. A IA processa o áudio (speech-to-text) e extrai automaticamente os
sinais de prontidão equivalentes ao check-in rápido (energia, sono, dor,
fadiga, tempo disponível) a partir da fala.

**F08 — Avaliação de prontidão ("Prontidão") e gate de segurança**
A partir dos dados do check-in (qualquer modalidade), o sistema calcula um
score de prontidão (0–100) exibido em um medidor circular, classificado em
três níveis: **Liberado** (verde — pode treinar normalmente), **Atenção**
(âmbar — pode treinar com modificações) e **Bloqueado** (vermelho — treino não
recomendado). Um motor de IA avalia os sinais reportados (dor intensa, sono
ruim, fadiga elevada, sinais de segurança) para emitir alertas ou bloquear o
treino — funcionando como um "portão de segurança" automático antes de liberar
a sessão.

**F09 — Tela de resultado do check-in**
Mostra o medidor de prontidão, o status (liberado/atenção/bloqueado), os
sinais que dispararam alertas, a classificação de risco do trainer (quando
disponível) e ações recomendadas/alertas específicos (ex.: "Dor detectada —
ajustar exercícios de membros inferiores"). O cliente pode confirmar a
prontidão e seguir para o treino, ou retornar para ajustar as respostas.

---

### 5.3 Execução de Treino

**F10 — Tela de início de treino**
Exibe o plano de treino do dia (lista de exercícios com séries/repetições/
carga/descanso prescritos). Se a IA de geração de treino estiver indisponível,
aplica um circuito de peso corporal padrão (templates por objetivo:
hipertrofia, força, resistência, etc.) como fallback. Antes de iniciar, exige
um check-in recente — se não houver um, solicita ao usuário que o faça.

**F11 — Modo de treino (execução guiada)**
Tela de execução exercício-a-exercício durante a sessão:

- Exibe o exercício atual (nome, grupo muscular, séries/repetições/carga/
  descanso prescritos).
- Registro série a série: o usuário informa repetições, carga e RPE (esforço
  percebido, 0–10) realmente executados.
- Botão de "pular exercício" com seleção de motivo (sem equipamento, fadiga,
  problema de execução, dor).
- Modal de registro de dor: toque na região do corpo + intensidade (0–10),
  ficando associado ao exercício em execução.
- Cronômetro de descanso entre séries, com avisos sonoros/hápticos ao final.
- Exibição de volume e RPE acumulados ao longo da sessão.
- Opção de encerrar a sessão antecipadamente (registrada como incompleta).

**F12 — Resumo pós-treino**
Ao final da sessão, exibe estatísticas (duração, exercícios concluídos/total,
séries registradas, repetições totais, volume total) e coleta feedback do
cliente:

- Escala de sensação geral (emoji, de muito insatisfeito a muito satisfeito).
- Nível de energia após o treino (slider 0–10).
- Observações em texto livre (correções de execução, dor, condições do
  ambiente).

O feedback é salvo no perfil e alimenta a personalização futura por IA. A tela
indica se a sessão foi enviada pelo trainer ou iniciada pelo próprio cliente
(incluindo sessões de "treino gratuito"/demonstração).

---

### 5.4 Acompanhamento, Estatísticas e Scores Preditivos

**F13 — Histórico de sessões**
Lista cronológica (mais recente primeiro) de todas as sessões de treino,
completas ou abandonadas, com filtro por dia da semana. Cada item mostra data,
horário, duração e status de conclusão, com acesso ao resumo completo da
sessão. Trainers podem ver o histórico de qualquer cliente vinculado; clientes
veem apenas o próprio.

**F14 — Painel de desempenho (multi-aba)**
Painel com várias visões sobre os dados das últimas semanas:

- **Visão geral**: resumo das últimas 4 semanas, frequência de check-ins e
  sessões, gráficos de volume/RPE semanais.
- **Aderência**: taxa de conclusão de sessões, contador de sequência (streak),
  sessões planejadas vs. realizadas por semana.
- **Desempenho**: evolução de carga/volume (ex.: progressão de 1RM), recordes
  pessoais (PRs), estimativas de composição corporal.
- **Dor**: diagrama corporal destacando regiões de dor reportadas, mapa de
  frequência/intensidade e linha do tempo de eventos de dor recentes.
- **Voz**: insights derivados das avaliações de voz, relacionando o que foi
  falado com resultados mensuráveis.
- **Marcos (milestones)**: conquistas desbloqueadas (ex.: sequência de 10
  sessões, marca de carga atingida) com progresso até o próximo marco.
- Botão de atualização em tempo real; os dados são recalculados quando uma
  nova sessão ou check-in é registrado.

**F15 — Scores preditivos de IA (motor "M5")**
A partir de pelo menos 4 semanas de dados de check-in e sessões, o sistema
calcula 9 scores de 0–100 (com faixas de risco: baixo ≥75, moderado 50–74,
alto 30–49, crítico <30), cada um com um cartão visual (medidor circular):

1. **Risco de evasão** (`session_completion_score`*) — probabilidade de
   abandono do programa, com base em aderência, queda de check-ins e sessões
   perdidas.
2. **Risco de fadiga** (`fatigue_risk`) — detecta sobretreinamento via variação
   de RPE em relação à linha de base e médias de sono baixas.
3. **Recorrência de dor** (`pain_recurrence_score`) — acompanha eventos de dor
   repetidos nos últimos 14 dias, sinalizando risco de lesão crônica/recorrente.
4. **Prontidão para progressão** (`progression_readiness`) — avalia se o
   cliente pode aumentar volume/intensidade com segurança (depende de aderência,
   sustentabilidade do RPE e ausência de dor).
5. **Conclusão de sessões** (`session_completion_score`) — mede a capacidade de
   finalizar treinos completos vs. abandono parcial, sinalizando protocolos
   incompletos.
6. **Adequação do plano** (`plan_fit_score`) — avalia a adequação do plano de
   treino comparando sessões parciais (incompletas) vs. planejadas.
7. **Instabilidade de recuperação** (`recovery_instability`) — detecta sono
   irregular, alta variância de RPE ou dor intermitente, sugerindo recuperação
   deficiente.
8. **Compatibilidade de resposta** (`response_compatibility`) — compara
   mudanças de carga/volume nas últimas 3 semanas com a resposta do cliente
   (ex.: aumento de volume causou dor ou abandono?).
9. **Risco de platô** (`plateau_risk`) — identifica estagnação na progressão de
   carga, sinalizando necessidade de mudança de estímulo.

> \* Nota: `churn_risk_score` (risco de evasão) e `session_completion_score`
> (conclusão de sessões) são scores distintos no motor; ambos integram o grupo
> "free" (`FREE_SCORE_CODES`). Os 5 scores restantes (`fatigue_risk`,
> `recovery_instability`, `progression_readiness`, `response_compatibility`,
> `plateau_risk`) compõem o grupo "avançado". Esta nota é apenas técnica — a
> associação a planos é tratada na Seção 1/2, não aqui.

Cada score alimenta insights e sugestões de ajuste de treino geradas por IA.

---

### 5.5 Ritmo Corporal (Ciclo)

**F16 — Acompanhamento de ciclo menstrual**
Tela dedicada para clientes que optaram por rastrear o ciclo menstrual:
configuração de duração do ciclo (padrão 28 dias) e duração da menstruação
(tipicamente 5–7 dias); visualização circular dividindo o ciclo em 4 fases
(menstrual, folicular, ovulação, lútea); ajuste do dia atual do ciclo; exibição
do nome da fase e recomendações de intensidade/foco de treino adequadas a cada
fase (ex.: fase lútea → sugestão de menor intensidade devido à fadiga
naturalmente maior). Configuração pode ser salva e sincronizada entre
dispositivos.

---

### 5.6 Comunicação e Notificações

**F17 — Caixa de entrada do cliente**
Lista de notificações dirigidas ao cliente: avisos de "plano pronto" enviado
pelo trainer, mensagens/observações do trainer (ex.: correções de execução),
e alertas do sistema (marcos desbloqueados, avisos do gate de segurança,
conquistas de sequência). Notificações de "plano pronto" têm expiração
(ex.: 30 minutos).

**F18 — Caixa de alertas do trainer**
Lista de itens que requerem atenção do trainer: check-ins de clientes
pendentes de revisão (quando o gate de segurança da IA sinaliza algo que
requer aprovação humana), resumos de treinos concluídos pelos clientes (para
dar feedback), pedidos de plano de treino, e atualizações de perfil de
clientes (ex.: nova condição de saúde declarada). Inclui botões de
aprovar/rejeitar para os check-ins sinalizados.

---

### 5.7 Gestão de Clientes e Estúdio (Trainer)

**F19 — Painel do trainer**
Visão consolidada de todos os clientes vinculados (status, último check-in,
sequência de treinos), revisões de segurança pendentes (check-ins sinalizados
pela IA aguardando aprovação), sessões ativas em tempo real, convite de novos
clientes por e-mail, convites recebidos (aceitar/recusar) e fila de tarefas
operacionais (marcáveis como concluídas).

**F20 — Estúdio (visão analítica e branding)**
KPIs gerais: total de clientes, sessões na semana, percentual de aderência.
Campo de "alimentar a IA" onde o trainer descreve sua metodologia/filosofia de
coaching para ajuste do modelo de IA (retraining). Acesso rápido para
adicionar treinos, abrir a biblioteca de exercícios e disparar o retraining da
IA. Lista de clientes com indicadores de engajamento (no caminho certo,
atrasado, novo) e data da última sessão.

**F21 — Detalhe do cliente (visão do trainer)**
Perfil completo do cliente (dados demográficos, histórico de saúde, objetivos,
restrições), com mascaramento de visibilidade sensível conforme consentimento;
planos de treino (pendente/ativo/concluído/expirado); dados recentes de
check-in (prontidão, energia, dor, fadiga); histórico de sessões (concluídas/
parciais, RPE, duração); feedback pós-treino (sensação, energia, observações);
formulário para o trainer adicionar/editar anotações sobre o cliente.

**F22 — Biblioteca de exercícios**
Catálogo de exercícios pesquisável (por grupo muscular, equipamento,
dificuldade, tags de acessibilidade); formulário para adicionar/editar
exercícios personalizados (nome, grupo muscular, séries/repetições/carga,
observações, status); aba de "protocolos" (sequências de treino pré-montadas);
simulador de assistente de voz (o trainer fala instruções de exercício em
linguagem natural e visualiza como a IA interpreta/estrutura essa fala); log
de auditoria das alterações na biblioteca.

**F23 — Editor de plano de treino**
Lista editável de exercícios para um cliente específico, com painel de
contexto mostrando o check-in mais recente e as restrições de perfil do
cliente (equipamento, restrições, dor). Formulário de adição de exercício
(nome, grupo muscular, séries, repetições, carga, descanso, observações).
Geração de opções de treino por IA (via API externa) com base no perfil e
check-in do cliente. Botões para "enviar ao cliente" ou "iniciar sessão em
tempo real" (sessão ao vivo visível para trainer e cliente simultaneamente).
Suporta sessões de "treino gratuito"/demonstração (sem opção de envio,
apenas sessão ao vivo).

---

### 5.8 Perfilamento de Metodologia do Trainer ("Coach DNA")

**F24 — Questionário Coach DNA (12 blocos)**
Questionário guiado em que o trainer define sua identidade e metodologia de
coaching, usado para personalizar sugestões de IA e a marca/perfil do trainer:

1. **Identidade** — nome, credenciais/certificações, anos de experiência,
   especializações.
2. **Formação** — background educacional, certificações de fitness, eventual
   formação em reabilitação/área médica.
3. **Histórico esportivo** — conquistas pessoais como atleta, participação em
   eventos/competições (ex.: CrossFit, maratonas).
4. **Métodos de treino** — metodologias em que o trainer é especializado
   (CrossFit, HIIT, mobilidade, força, calistenia, etc.).
5. **Estilo de coaching** — estilo de comunicação (motivacional, técnico,
   empático, direto, descontraído, profissional, etc.).
6. **Princípios** — valores centrais de coaching (intensidade, qualidade,
   saúde em primeiro lugar, diversão, construção de força, mobilidade,
   desempenho atlético, funcionalidade, progresso).
7. **Foco** — sliders 0–10 para desempenho atlético, força, mobilidade,
   equilíbrio/estabilidade, resistência e coordenação.
8. **Exercícios** — exercícios favoritos (seleção múltipla) e exercícios a
   evitar.
9. **Desenho de treino** — formatos preferidos (circuitos, EMOM, AMRAP, blocos
   de força, etc.) e curva de progressão de intensidade (linear, ondulada,
   piramidal).
10. **Estrutura de sessão** — ordem típica da sessão (aquecimento, técnica,
    condicionamento, volta à calma).
11. **Público-alvo** — tom de comunicação (motivacional, técnico, atlético,
    direto, casual, profissional) e perfis de clientes típicos (atletas
    avançados, iniciantes, reabilitação, CrossFit).
12. **Filosofia** — lema pessoal de coaching e um parágrafo descrevendo a
    filosofia/voz de coaching do trainer.

**F25 — Arquétipo de coaching (resultado do Coach DNA)**
A partir das respostas dos 12 blocos, o sistema calcula um **arquétipo de
coaching** dentre 6 possíveis (Performance, Técnico, Motivador, Guia,
Instrutor Rigoroso, Especialista em Movimento), com base em pontuação
ponderada de estilo, princípios, áreas de foco, métodos de treino, público-alvo
e intensidade. A tela final exibe o arquétipo computado (ícone, nome, subtítulo
e descrição completa de como as escolhas do trainer levaram a esse resultado),
servindo de base para personalização de sugestões de IA e identidade do
trainer na plataforma.

---

### 5.9 Inteligência Artificial — Contexto e Geração

**F26 — Motor de contexto de IA**
Camada que monta o contexto estruturado consumido pelas funcionalidades de IA
(geração de treino, adaptação de plano, insights), combinando:

- **Contexto do trainer**: identidade, arquétipo (Coach DNA), estilos de
  coaching, valores centrais, métodos, preferência de intensidade, áreas de
  foco, preferências de estrutura de sessão, tom de comunicação, perfis de
  clientes atendidos, exercícios favoritos/a evitar.
- **Contexto do cliente**: perfil completo (idade, sexo, altura, peso),
  objetivos primário/secundários, nível de condicionamento, frequência/duração
  de treino, preferências, condições de saúde, comorbidades, mobilidade,
  equilíbrio, nível de dor, ambiente/equipamento disponível, disponibilidade,
  restrições funcionais.
- **Contexto do dia**: score de prontidão do check-in do dia, energia, sono,
  status de dor, tempo disponível, estado emocional.
- **Contexto estatístico**: os 9 scores preditivos (M5), taxa de aderência,
  sequência de treinos, eventos de dor recentes, tendência de volume/RPE
  semanal.
- **Contexto da biblioteca**: catálogo de exercícios disponíveis com
  restrições (baixo impacto, sentado, sem exercícios no chão, tags de
  acessibilidade), grupos musculares e disponibilidade de equipamento.

Esse contexto alimenta a geração de planos de treino personalizados, a
adaptação de dificuldade/volume e o motor de insights/recomendações.

---

## Addendum — 2026-07-07 (System Audit Follow-up)

Status update from the 2026-07-07 system audit (`policies/references/system-audit-trainer-20260707.md`, Area 7):

- The core findings of this document are **superseded**: feature gating is now implemented via the DB-backed `feature_permissions` table, `src/types/feature-permissions.ts` and `src/hooks/useFeatureAccess.ts`. Verified wired-up gates: `clients.limit` (TrainerDashboardScreen — trial student cap, also enforced server-side in `api/send-invitation.ts`) and `coach_dna` (CoachDNAScreen).
- **Accepted limitation:** apart from the invitation client-limit (server-enforced), feature gates are enforced client-side only (React hook gating UI rendering). They are a UX convenience, **not a security boundary** — a modified client could bypass them. No monetary-transaction bypass exists (billing flows through Stripe via authenticated `api/` endpoints as of commit `c182144`).
- **Decision point before scaling paid tiers:** evaluate server-side/RLS enforcement of `feature_permissions` for gates whose bypass has real cost (e.g., AI generation quotas).
