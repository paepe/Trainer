# TrAIner — Plano de Uso Justo, Proteção de Custo e Prevenção de Abuso de IA

**Estado:** Fases 0–1 em execução; Fase 2 activada em observação controlada — enforcement permanece bloqueado até haver evidência de uso real e aprovação específica
**Última atualização:** 2026-08-06 — período de observação iniciado; sem evidência suficiente para calibrar enforcement
**Proprietário:** Product / Engineering / Privacy
**Escopo:** todos os endpoints server-side com custo de IA — recursos de AI FITNESS/AI PERFORMANCE, operações do TRAINER e automações internas/onboarding

---

## 1. Objetivo e princípio comercial

Manter a promessa comercial de **uso ilimitado** para utilização pessoal normal, sem expor o TrAIner a automação, abuso ou custo variável descontrolado.

> **Proposta para os Termos:** “Uso ilimitado para utilização pessoal normal, sujeito à política de uso justo e aos mecanismos de proteção contra abuso.”

O produto não exibirá contador de uso para clientes AI FITNESS/AI PERFORMANCE. Controles técnicos devem atuar somente contra rajadas, automação, credenciais comprometidas e padrões economicamente anormais.

### Limites de escopo

- Não introduzir cap comercial visível nos planos AI FITNESS ou AI PERFORMANCE.
- Não registrar prompts, transcrições, dados de saúde, ciclo ou outros dados sensíveis para fins de custo.
- Não transferir custo de IA ao aluno FREE por patrocínio de TRAINER.
- Qualquer bloqueio deve ser temporário, explicável e auditável; não pode interromper sessão de treino em andamento.

---

## 2. Estado inicial verificado

| Endpoint com custo de IA | Autenticação própria | Autorização de função/entitlement | Máx. de chamadas ao provedor por request | Telemetria de custo |
|---|:---:|:---:|:---:|:---:|
| `generate-smart-workout` | ✅ | ✅ entitlement do aluno + vínculo | 1 | Log de tokens |
| `generate-workout` | ✅ | ⚠️ sem gate explícito de `ai.workout_generation` | 1 | Ausente |
| `translate-exercise-content` | ✅ | ⚠️ autenticado, sem gate comercial específico | **até 300 concorrentes** em cache miss | Ausente |
| `parse-voice` | ❌ | ❌ | 1 | Ausente |
| `cleanup-voice-note` | ❌ | ❌ | 1 | Ausente |
| `generate-amplified` | ❌ | ❌; recebe perfil potencialmente sensível | 1 | Ausente |
| `classify-exercises` | ❌ | ❌; deve ser operação de TRAINER | 1 | Ausente |
| `send-welcome-message` | ❌ | ❌; usa service role com IDs fornecidos pelo cliente | 1 | Ausente |

**Controles transversais verificados:** limite FREE de 1 sessão autónoma/semana e autoridade de entitlement existem em `generate-smart-workout`; rate limiting, agregação por assinante, alertas e Política de Uso Justo não existem. O tratamento amigável de erro de rate limit no cliente não constitui proteção server-side.

**Prioridade corrigida:** a exposição imediata não se limita a `parse-voice`. `generate-amplified` e os dois endpoints de voz tratam conteúdo potencialmente sensível; `send-welcome-message` combina custo de IA e service role. Os cinco endpoints sem autenticação própria entram na Fase 1.

**Achado de privacidade:** `parse-voice` registra hoje a transcrição integral em `console.warn` quando a extração resulta vazia. Esse log contém potencial dado de saúde e deve ser removido na Fase 1; a correção não pode esperar a telemetria da Fase 2.

**Achado de fluxo/custo:** `translate-exercise-content` processa os itens ausentes com `Promise.all`; uma chamada autenticada de até 300 itens pode iniciar até 300 chamadas concorrentes ao provedor. O teto de payload não é um teto econômico. A Fase 1 deve limitar fan-out e a Fase 4 deve limitá-lo também por ator.

**Achado de entrega:** `send-welcome-message` chama `send-notification` sem credencial e ignora a resposta. Como `send-notification` exige autenticação, a geração pode custar sem a mensagem ser entregue. A Fase 1 precisa de uma entrega interna autorizada, verificável e idempotente; não deve apenas adicionar um token do cliente a essa chamada.

**Achado de consentimento:** `cleanup-voice-note` é usado no check-in, na filosofia do Coach DNA, em notas de plano do TRAINER e nos passos de objetivos, histórico de movimento, saúde declarada, comorbidades e fatores sensíveis do onboarding. Os três últimos podem ocorrer antes do passo de consentimento. Além disso, `generate-amplified` remove `sensitive_factors`/`body_rhythm`, mas ainda pode enviar saúde declarada e comorbidades ao provedor. A Fase 1 exige uma decisão explícita de consentimento e minimização antes de alterar esses fluxos.

---

## 3. Arquitetura alvo

```text
Request
        |
        v
Limite de transporte (método, Content-Type e tamanho bruto)
        |
        v
Proteção pré-auth de rajada por sinal de rede pseudonimizado
        |
        v
Identidade autenticada + autorização de papel, vínculo e entitlement
        |
        v
Rate limit atômico por ator + endpoint
        |
        +-- bloqueado: 429 temporário, sem chamada ao provedor de IA
        |
        v
Executor de IA
        |
        v
Evento de uso minimizado (sem prompt/transcrição/dados de saúde)
        |
        +-- agregação de custo, detecção de anomalia e alertas
        |
        v
Resposta ao utilizador
```

**Autoridade:** backend. O cliente pode exibir mensagens de estado, mas nunca decide limite, custo, suspensão ou entitlement.

**Duas camadas:** uma proteção pré-auth, curta e ampla, evita que tráfego anônimo force consultas de autenticação; após autenticar, o limite por ator/endpoint aplica a política de uso justo. A camada pré-auth pode desacelerar uma origem de rede, mas nunca justificar suspensão de conta. O servidor não deve interpretar nem registrar conteúdo sensível antes de autenticar — antes disso, apenas método, cabeçalhos e tamanho bruto.

**Dados mínimos de telemetria:** `actor_id`, `subject_id` quando distinto e estritamente necessário, `plan_key_effective`, `endpoint`, `origin`, timestamp, tokens de entrada/saída quando disponíveis, custo estimado, resultado HTTP, latência, modelo/provedor e identificador idempotente de correlação. Prompts, áudio, transcrições, respostas do modelo e dados de saúde são proibidos nessa tabela.

**Sinal de rede:** não persistir IP bruto. Se aprovado na avaliação de privacidade, usar HMAC com segredo server-side e época de rotação explícita; hash simples ou “hash rotativo” sem gestão de chave não é suficiente. IP nunca pode ser o único fundamento para bloquear contas em redes partilhadas.

**Continuidade:** falha do controle de custo não deve interromper treino iniciado. Geração de treino degrada para o gerador local seguro; voz degrada para check-in manual; operações não críticas retornam indisponibilidade temporária. Não fazer fail-open para uma chamada paga quando a autoridade de proteção estiver indisponível.

---

## 4. Plano faseado

### Fase 0 — Baseline, decisões e modelo de ameaça

**Objetivo:** fechar o inventário, classificar risco e aprovar o desenho antes de escrever código ou dados.

- [x] Inventariar estaticamente os oito endpoints que chamam o provedor de IA, autenticação, autorização, payload e telemetria — revisão de 2026-08-05 registrada no §2.
- [ ] Confirmar em execução os oito fluxos e identificar a pessoa/entidade que deve ser cobrada em cada um.
- [x] Identificar fan-out econômico estático: `translate-exercise-content` pode disparar até 300 chamadas concorrentes em um único request de cache miss.
- [x] Identificar dependência quebrada de entrega: `send-welcome-message` não autentica a chamada interna a `send-notification` e não valida seu resultado.
- [x] Distinguir funções comerciais (`voice`, geração, análise) de operações internas (`classify`, tradução, welcome), aplicando autorização por papel e propósito — [AI_ENDPOINT_AUTHORITY_MATRIX.md](AI_ENDPOINT_AUTHORITY_MATRIX.md).
- [x] Mapear os propósitos de `cleanup-voice-note`: check-in, Coach DNA, nota de plano do TRAINER e onboarding (objetivos, histórico de movimento, saúde declarada, comorbidades e fatores sensíveis).
- [x] Aprovar D0.1: `allow_ai_adaptation` ausente ou falso equivale a não autorização; o consentimento é lido da versão persistida do perfil.
- [ ] Completar o consentimento/autorização dos propósitos restantes de voz e os limites operacionais de `generate-amplified`; D0.1 já resolve o onboarding e a minimização de dados de saúde.
- [x] Definir limites duros de payload e concorrência por request — [AI_ENDPOINT_OPERATIONAL_BOUNDS.md](AI_ENDPOINT_OPERATIONAL_BOUNDS.md); limites de uso justo por ator continuam dependentes da observação.
- [ ] Definir teto de fan-out por request e estratégia de batching/fila para tradução; o teto deve limitar chamadas reais ao provedor, não apenas itens recebidos.
- [ ] Definir sinais de abuso: chamadas concorrentes, repetição idêntica, volume inviável para uso humano e padrões distribuídos por conta/rede.
- [ ] Aprovar modelo de telemetria, idempotência, cálculo de custo, retenção, RLS e descarte conforme minimização e GDPR.
- [x] Decidir formalmente não usar HMAC/rotação de sinal de rede no aplicativo: a WAF gerenciada mantém o bucket efêmero sem IP, segredo ou tabela do TrAIner — [D0.2](AI_PREAUTH_NETWORK_SIGNAL_DECISION_DRAFT.md).
- [x] Definir política de degradação por endpoint e resposta a indisponibilidade da proteção — [AI_ENDPOINT_DEGRADATION_POLICY.md](AI_ENDPOINT_DEGRADATION_POLICY.md); treino em curso e execução offline permanecem independentes de IA.
- [ ] Obter aprovação explícita de Product, Privacy e Engineering para o desenho; thresholds de enforcement permanecem provisórios até a Fase 2 medir uso real.

**Critério de aceite:** inventário validado em execução, identidade cobrada, autorização, modelo de dados, retenção, degradação e ameaças aprovados. Nenhum threshold definitivo é escolhido antes da telemetria.

**D0.2 aplicada (2026-08-06):** o guard pré-auth usa exclusivamente o bucket da WAF Vercel, sem IP bruto, correlação com saúde/conta, tabela do aplicativo ou sanção baseada em rede — [decisão e escopo](AI_PREAUTH_NETWORK_SIGNAL_DECISION_DRAFT.md).

### Decisão D0.1 — processamento externo de dados de saúde por IA

**Recomendação técnica e de privacidade:** regra **default-deny**. Antes de um consentimento `allow_ai_adaptation=true` já persistido, nenhum texto de onboarding é enviado ao provedor externo de IA; o reconhecimento de voz continua utilizável com o texto bruto local. Após consentimento, o backend aceita somente o propósito autorizado e um payload minimizado. `generate-amplified` deve receber apenas dados operacionais necessários, nunca texto livre clínico, transcrições, medicação, saúde emocional ou fatores/ciclo sensíveis brutos.

**Aprovada e aplicada em 2026-08-05.** Esta decisão preserva o onboarding e evita inferir consentimento a partir de ausência de dado. O reconhecimento continua local antes do consentimento; `cleanup-voice-note` exige caller autenticado, propósito fechado e consentimento persistido para onboarding. `generate-amplified` exige caller autenticado, consentimento persistido e lê exclusivamente o perfil persistido, reduzido a sinais estruturados permitidos. A chamada do wizard que descartava a resposta foi removida.

### Fase 1 — Fechar exposição imediata dos endpoints de IA

**Objetivo:** garantir que cada chamada com custo tenha identidade autenticada, autorização e limites de payload antes de alcançar o provedor.

- [x] Migrar `parse-voice`, `cleanup-voice-note`, `generate-amplified`, `classify-exercises` e `send-welcome-message` para `api/_lib/auth.ts`.
- [x] Atualizar os cinco chamadores para enviar o token; não aceitar identidade declarada apenas no body — auditoria estática confirmou `authHeaders()` em cleanup, voz, classificação e welcome; Perfil Ampliado ignora o body e lê o perfil persistido do caller.
- [x] Em `parse-voice`, validar `checkin.voice_input` **e** `ai.checkin_interpretation` da própria conta; patrocínio do TRAINER nunca autoriza inferência paga.
- [x] Em `cleanup-voice-note`, introduzir propósito fechado e validar papel, fluxo e entitlement/consentimento correspondentes; não assumir que todo uso é check-in.
- [x] Em `generate-amplified`, vincular o perfil ao próprio caller e exigir consentimento de IA aplicável; body legado é ignorado, perfil/consentimento são persistidos e o request é limitado a 8.000 caracteres.
- [x] Aplicar D0.1 aos fluxos de onboarding e Perfil Ampliado: fallback local pré-consentimento, `401/403` antes do provedor, leitura de consentimento/perfil persistidos e minimização de texto livre/dados sensíveis.
- [x] Em `classify-exercises`, exigir papel TRAINER e validar tamanho de cada campo, além do lote de 50.
- [x] Em `send-welcome-message`, derivar o aluno do JWT e exigir vínculo activo com o TRAINER; não confiar em `studentId`/`trainerId` declarados no body.
- [x] Substituir a chamada interna sem credencial por persistência server-side directa em `notification_log`; a operação só confirma sucesso após a escrita ser aceite.
- [x] Ativar a idempotência atómica de `send-welcome-message`: migração aplicada e verificada no Supabase em 2026-08-05; `AI_OPERATION_IDEMPOTENCY_HMAC_SECRET` e `AI_OPERATION_IDEMPOTENCY_ENABLED=true` configurados na Vercel Production, com RPCs restritas a `service_role`.
- [x] Em `generate-workout`, aplicar `ai.workout_generation` resolvido server-side, equivalente ao caminho smart.
- [x] Validar método, `Content-Type`, esquema de raiz, tamanho máximo do body/campos, timeout e concorrência por request em todos os endpoints. Os oito endpoints exigem objeto JSON na raiz e rejeitam body acima de um teto global antes de I/O subsequente; validação declarativa adicional dos campos complexos segue como melhoria de robustez fora do bloqueio imediato.
- [x] Limitar fan-out interno: `translate-exercise-content` preserva tradução isolada por item, mas usa pool máximo de 8 chamadas ao provedor por request.
- [x] Aplicar proteção pré-auth emergencial, ampla e conservadora, nos oito endpoints de IA: bucket WAF `ai-preauth-burst`, invocado apenas após autenticação ausente/inválida, com 120 tentativas/IP/minuto e `429`; a política pós-auth calibrada continua na Fase 4.
- [x] Adotar resposta uniforme: `401` sem autenticação válida, `429` para rajada pré-auth, `403` sem papel/entitlement/vínculo e `400/413` payload inválido/excessivo.
- [x] Testar que rejeições ocorrem antes de Supabase service role ou provedor de IA; a suíte dos oito handlers e do guard pré-auth cobre rejeições de identidade, payload, papel, vínculo, consentimento e limite sem chamada ao fornecedor.
- [x] Remover o log da transcrição integral de `parse-voice`; rejeições de identidade, entitlement e tamanho são avaliadas antes do provedor.

**Critério de aceite:** nenhum endpoint de custo fica acessível anonimamente, confia em IDs do body como autoridade ou aceita payload ilimitado; testes positivos, negativos e de vínculo cobrem os oito endpoints.

**Nota de verificação (2026-08-05):** `send-welcome-message` bloqueia replays sequenciais consultando a mensagem persistida antes de gerar. Para concorrência, reserva uma chave HMAC numa tabela de claims antes de chamar o provedor, completa-a só depois de persistir a notificação e liberta-a em falha. A ativação foi confirmada com deploy Vercel Ready, variáveis de produção presentes, endpoint anônimo retornando `401`, zero claims residuais e permissões de RPC exclusivas de `service_role`.

**Validação de boundary (2026-08-06):** `generate-amplified` recebeu limite explícito de 8.000 caracteres mesmo não consumindo o body legado; a autoridade continua sendo apenas o perfil persistido do caller. Os oito handlers agora exigem objeto JSON na raiz, além de seus campos e limites específicos. A suíte passou com 99 testes, cobrindo autenticação, consentimento/papel/vínculo quando aplicável, `Content-Type`, limites, guard WAF e caminhos sem chamada ao provedor para rejeições críticas.

**Boundary anônimo em produção (2026-08-06):** um `POST` JSON sem credencial para cada um dos oito endpoints retornou `401`: `generate-smart-workout`, `generate-workout`, `translate-exercise-content`, `parse-voice`, `cleanup-voice-note`, `generate-amplified`, `classify-exercises` e `send-welcome-message`. Nenhuma dessas requisições chegou ao fornecedor; o guard WAF continua reservado para rajadas anônimas acima do limiar amplo configurado.

### Fase 2 — Telemetria persistida, medição e custo por assinante

**Objetivo:** medir custo e comportamento normal antes de calibrar enforcement, sem registrar conteúdo sensível.

**Implementação activada:** [contrato de dados de telemetria](AI_TELEMETRY_DATA_CONTRACT.md) e migração revisável `supabase/sql-archive/supabase-ai-telemetry-20260805.sql`; retenção bruta de 90 dias, HMAC por ator e escrita exclusivamente server-side foram aplicados e auditados em produção em 2026-08-05. A flag `AI_USAGE_TELEMETRY_ENABLED=true` e o segredo HMAC estão configurados exclusivamente na Vercel Production.

- [x] Criar tabela de eventos de uso de IA com RLS administrativa e retenção bruta de 90 dias; aplicada e auditada em produção em 2026-08-05.
- [x] Usar `request_id`/chave de operação única, gerada ou validada pelo servidor, para retries não duplicarem custo nem eventos; UUID do cliente é HMAC-vinculado ao ator no backend e a resposta fica disponível somente por 10 minutos para o retry.
- [x] Registrar sucesso, falha do provedor e rejeição pós-auth/pré-provedor sem prompt, transcrição, resposta ou dado de saúde.
- [x] Para tráfego anônimo, usar somente a WAF gerenciada pré-auth; não criar evento persistente por tentativa que permita encher a tabela. O TrAIner não armazena IP ou bucket de rede.
- [x] Registrar contadores do provedor quando disponíveis; quando indisponíveis, marcar método como `unavailable` — nunca fabricar precisão.
- [x] Calcular custo a partir de modelo, tokens/unidades, provedor, moeda e versão temporal do preço; para `deepseek-chat`, o cálculo conservador usa preço de cache miss e declara a qualidade da estimativa.
- [x] Criar agregados diários por plano e endpoint, além de agregado diário administrativo por ator HMAC; evitar consultas analíticas pesadas em tabelas transacionais.
- [x] Instrumentar emissão de sucesso minimizada nos oito endpoints; a emissão é feature-flagged e está activa em produção desde 2026-08-05.
- [ ] Executar período de observação aprovado sem bloqueio automático e medir percentis de uso, concorrência, erros e custo por plano.
- [x] Preparar relatório reexecutável de observação agregada por dia/endpoint/plano/resultado — `scripts/report-ai-observation.mjs` e RPC administrativa `ai_usage_observation_report`, sem actor hash ou conteúdo no output.
- [x] Testar RLS, minimização, retenção, idempotência, falha de escrita e indisponibilidade do coletor. Auditoria de produção de 2026-08-06 confirmou RLS ativa, zero privilégios `anon`/`authenticated`, esquema sem campos de conteúdo e retenção de 90 dias em todos os sete eventos; a suíte cobre idempotência e falha do coletor.
- [x] Garantir que falha de telemetria não duplica a chamada de IA nem expõe conteúdo em fallback de log; `emitAIUsageEvent` é best-effort, sem retry da operação, e os testes cobrem indisponibilidade.

**Critério de aceite:** custo e distribuição de uso por plano/endpoint são mensuráveis com qualidade declarada; retries não duplicam eventos; nenhuma telemetria contém conteúdo ou dados de saúde.

**Nota de verificação (2026-08-05):** uma tentativa de smoke test pelo navegador foi interrompida antes de qualquer chamada porque a aba disponível apresentava a tela de login. A consulta de produção confirmou `0` eventos totais e `0` eventos recentes; portanto, não houve geração nem escrita de telemetria indevida. Permanece pendente uma chamada normal por uma sessão autenticada já existente, sem o agente inserir credenciais.

**Correcção de privacidade (2026-08-05):** o log técnico de custo de `generate-smart-workout` deixou de incluir `client_id` e `caller_id` brutos. A análise por ator permanece exclusivamente no evento minimizado com HMAC.

**Correcção de privacidade (2026-08-05):** logs de falha dos endpoints de IA e do cache de tradução passaram a registrar somente categoria e status técnico; não registram corpo de resposta, mensagem de erro do provedor, conteúdo de IA ou identificadores brutos.

**Correcção de privacidade (2026-08-05):** logs de enforcement do treino inteligente passaram a registrar somente contagens; listas de exercícios derivadas da resposta da IA não são mais escritas em log.

**Telemetria de falha (2026-08-05):** todos os oito endpoints agora registram resultado minimizado de falha/degradação: os seis fluxos críticos e welcome usam `provider_failed` para timeout, erro ou resposta inválida do provedor; tradução registra `degraded/provider_partial_failure` quando preserva o texto original após falha parcial. Falha de persistência da welcome é registrada como `degraded/delivery_persist_failed`.

**Uso do provedor (2026-08-05):** todos os oito endpoints passam para a telemetria `prompt_tokens` e `completion_tokens` quando a resposta do provedor os disponibiliza; tradução soma as chamadas isoladas do lote. Ausência do contador continua registrada como precisão indisponível, sem estimativa inventada.

**Rejeições pós-auth (2026-08-05):** os oito endpoints registram de forma minimizada rejeições que já têm identidade autenticada e ainda não chamaram o provedor (Content-Type, payload/tamanho, consentimento, papel, entitlement, vínculo e teto de sessões, conforme aplicável). Tentativas anônimas continuam sem evento persistente por tentativa. A validação automática cobre os oito handlers (89 testes) e o contrato do coletor, incluindo minimização e falha de escrita sem retry.

**Evidência de deploy (2026-08-05):** a instrumentação de rejeições e a correção de compilação associada foram publicadas nos commits `c6ab6a1` e `1fe8911`. O deploy de produção `dpl_86LSA6vM3hcJz2nQqthTWmz7GFKq` ficou `Ready` e recebeu o alias `https://trainer-lake.vercel.app`. A validação funcional autenticada e o período de observação continuam pendentes; não foram simuladas credenciais nem gerado tráfego artificial.

**Smoke autenticado (2026-08-05):** uma geração normal iniciada pela conta cliente em produção retornou plano personalizado e gravou o evento minimizado `succeeded` no banco: `generate-smart-workout`, HTTP `200`, `2.318` tokens de entrada, `1.655` de saída e `3.973` no total. A consulta omitiu identificadores de ator. O primeiro smoke revelou que o cliente abortava aos 28s antes de uma resposta válida do servidor; `SMART_WORKOUT_CLIENT_TIMEOUT_MS` passou a 40s para preservar a margem de transporte sobre o timeout do fornecedor no backend. A correção foi publicada no deploy `dpl_DqanNunMcbudkihVSf7He6DjvwHZ`.

**Custo e agregação (2026-08-05):** a migração `supabase-ai-telemetry-cost-and-aggregate-20260805.sql` foi aplicada em produção. Ela mantém um catálogo temporal e administrativo de preço, com a referência oficial da DeepSeek, e dois agregados diários: por plano/endpoint/resultado e por ator HMAC/endpoint/plano. `ai_usage_events` e o catálogo permanecem sob RLS, sem acesso público. O custo atual é explicitamente conservador (`cache_miss`) porque o provedor não retorna a separação de tokens de cache; não se afirma precisão que não existe.

**Correção da dimensão de plano (2026-08-05):** o smoke posterior confirmou uma geração válida (`4.267` tokens), mas expôs que o resolvedor server-side retornava somente os grants e descartava o `planKey`; por isso, o evento ficou com plano nulo. A correção preserva o plano efetivo, resolvido exclusivamente no backend, junto aos entitlements e foi publicada no deploy `dpl_2YLPAUxxYvDFQmxqtsDNUBZg6iMc`. A geração pós-deploy confirmou a gravação de `plan_key=ai_fitness`: HTTP `200`, `2.318` tokens de entrada, `1.810` de saída e `4.128` no total. O agregado diário separou corretamente esse plano (`1` request, custo conservador de `831` micros USD). Eventos históricos não são reclassificados por inferência.

**Idempotência de retries (2026-08-05):** a migração `supabase-ai-request-idempotency-20260805.sql` acrescentou resposta curta e expiração à tabela de claims HMAC já protegida por RLS. A aplicação gera um UUID por solicitação de treino e o backend o associa por HMAC ao ator autenticado; uma repetição recebe a resposta previamente concluída, sem nova chamada ao fornecedor. O smoke pós-deploy confirmou a geração normal e uma claim `smart_workout_generation` em estado `completed`, com resposta server-side presente e expiração de 10 minutos. A cobertura automatizada valida UUID, claim, resposta em cache e indisponibilidade fail-closed.

**Auditoria de observação (2026-08-06):** a produção contém sete eventos de smoke controlado, de um único ator pseudonimizado: cinco gerações `generate-smart-workout` bem-sucedidas, `20.197` tokens no total e custo conservador agregado de `4.032` micros USD; há duas falhas do provedor, sem tokens ou custo mensurável. A mais recente foi um smoke autenticado de degradação: o fornecedor falhou sem status HTTP, a telemetria registrou somente `provider_failed`/HTTP 500/modelo e o cliente iniciou o treino com plano seguro de fallback. A tabela contém exclusivamente campos operacionais minimizados, RLS está ativa, não há privilégios para `anon`/`authenticated`, todos os eventos expiram em exatamente 90 dias e não há expiração pendente. Não existe amostra de uso humano normal, concorrência ou distribuição por coorte suficiente para definir thresholds, alertas ou bloqueios. O enforcement pós-auth da Fase 4 permanece bloqueado.

### Fase 3 — Política de Uso Justo, Termos e comunicação

**Objetivo:** alinhar contrato, marketing e UX antes de ativar contenção automatizada.

- [x] Redigir rascunho interno da Política de Uso Justo com exemplos de uso pessoal normal e abuso, sem converter o plano em quota visível — [AI_FAIR_USE_POLICY_DRAFT.md](AI_FAIR_USE_POLICY_DRAFT.md), pendente de revisão jurídica/privacidade e publicação.
- [ ] Inserir a cláusula aprovada nos Termos, com revisão jurídica e de privacidade.
- [x] Manter “Ilimitado” no marketing de AI FITNESS e AI PERFORMANCE; a revisão confirmou ausência de contador/quota comercial visível e preservou a mensagem de upgrade para sessões ilimitadas.
- [x] Criar textos UX localizados para `429`, degradação e contenção temporária, com canal de suporte — chaves `workoutGen.*` adicionadas para en/pt/es/de; só serão exibidas quando o enforcement for aprovado.
- [x] Não publicar thresholds internos ou mecanismos que facilitem evasão; a política e os textos UX deliberadamente não contêm números operacionais.
- [ ] Atualizar a matriz de licenças para “ilimitado sujeito à Política de Uso Justo” somente após publicação dos Termos.
- [x] Registrar política de consumo iniciado por TRAINER em nome de aluno e relação com eventual franquia de IA do TRAINER — [AI_TRAINER_SPONSORED_CONSUMPTION_POLICY_DRAFT.md](AI_TRAINER_SPONSORED_CONSUMPTION_POLICY_DRAFT.md), pendente de aprovação comercial/jurídica/Privacy.

**Auditoria de consistência (2026-08-06):** os manuais TRAINER en/pt/es ainda comunicavam o degrau histórico PRO de 50 alunos. Foram alinhados à matriz efectiva PRO 5/15/30; as traduções da UI já apresentavam essas três faixas. A política continua interna e não há Termos no workspace a publicar, portanto esta fase permanece dependente de aprovação e publicação externas.

**Critério de aceite:** Termos, Política, marketing, matriz e UX descrevem a mesma oferta antes do enforcement da Fase 4.

### Fase 4 — Rate limiting server-side sem quota comercial

**Objetivo:** bloquear automação e rajadas antes do custo, com thresholds calibrados pela Fase 2.

- [x] Preparar e aplicar mecanismo compartilhado, server-side e atômico, com HMAC por ator e bucket por endpoint — `api/_lib/postAuthRateLimit.ts` e migração `supabase/sql-archive/supabase-ai-postauth-rate-limit-20260806.sql` aplicada em produção em 2026-08-06. RLS ativa e sem `SELECT` para `anon`/`authenticated`; permanece desligado e sem ruleset até observação/aprovação; memória local não é autoridade.
- [ ] Implementar duas camadas: rajada pré-auth por sinal de rede pseudonimizado e limite pós-auth por ator + endpoint.
- [ ] Sinal de rede é defesa adicional e nunca fundamento isolado para sanção de conta; acomodar NAT, redes corporativas e famílias.
- [ ] Executar primeiro em modo sombra, comparar falsos positivos e obter aprovação antes de bloquear.
- [ ] Aplicar janelas de rajada e concorrência independentes por operação; não reutilizar um número global.
- [ ] Retornar `429` com `Retry-After` e mensagem localizada, sem revelar thresholds internos.
- [x] Prever exceção operacional temporária, auditada, com motivo, aprovador e expiração automática — tabela `ai_rate_limit_exceptions` aplicada com RLS, máximo de sete dias e revogação; o limitador consulta somente exceção ativa quando for habilitado.
- [ ] Implementar TTL/limpeza dos buckets e testes de concorrência, relógio, múltiplas instâncias e indisponibilidade.
- [ ] Em falha do limitador, aplicar a degradação aprovada: treino local seguro, check-in manual ou indisponibilidade não crítica; não chamar o provedor em fail-open.
- [ ] Validar que execução offline, registo de sets e sessão já iniciada nunca dependem do limitador.

**Execução técnica 2026-08-06:** a camada pós-auth foi conectada aos oito endpoints e a infraestrutura atômica está aplicada com RLS. O modo padrão `off` é uma operação nula; por isso a produção continua sem bucket, bloqueio ou retenção adicional até existir ruleset aprovado. Regressão integral: 37 arquivos / 438 testes aprovados; deploys de produção correspondentes ficaram `Ready`.

**Teste sintético do bucket (2026-08-06):** em produção, com hashes fictícios e sem dados de conta, três consumos contra máximo três foram permitidos e o quarto/quinto retornaram `limited=true`; a expiração foi forçada somente sobre o bucket sintético, a próxima operação removeu o item expirado e os dois buckets de teste foram apagados. Em seguida, 12 processos concorrentes consumiram o mesmo bucket: o resultado foi uma única linha com contador 12 e estado limitado, sem perda de incremento; a limpeza posterior confirmou zero buckets sintéticos residuais. Os testes focados de indisponibilidade do limitador e continuidade/offline do treino passaram (17/17), e a regressão integral anterior passou com 38 arquivos / 441 testes. Ainda faltam teste de relógio e validação em sombra com regras aprovadas.

**Critério de aceite:** excedentes não alcançam o provedor; concorrência não permite bypass; modo sombra demonstrou baixa taxa de falso positivo; uso humano normal permanece sem contador e sem cap comercial.

### Fase 5 — Anomalia, alertas e contenção operacional

**Objetivo:** detectar consumo economicamente anormal e responder com proporcionalidade.

- [ ] Definir baseline por plano, endpoint e coorte a partir da Fase 2.
- [ ] Criar regras de alerta para picos, alta taxa de erro, consumo por conta/rede e repetição automatizada.
- [ ] Entregar alertas a canal operacional com identificador pseudonimizado e contexto mínimo; validar DPA e acesso do destino.
- [ ] Implementar contenção progressiva: rate limit temporário → revisão manual → suspensão documentada em abuso confirmado.
- [ ] Exigir revisão humana antes de suspensão prolongada ou encerramento de conta.
- [x] Preparar runbook interno de investigação, reversão, comunicação ao cliente e preservação mínima de evidência — [AI_ABUSE_RESPONSE_RUNBOOK_DRAFT.md](AI_ABUSE_RESPONSE_RUNBOOK_DRAFT.md). É rascunho não operacional e depende das aprovações e do baseline desta fase.
- [ ] Testar alertas e contenção com eventos sintéticos, sem dados reais de saúde.

**Infraestrutura preparada (2026-08-06):** `ai_usage_alerts` foi aplicada em produção com RLS, sem acesso `anon`/`authenticated`, retenção de 90 dias e apenas evidência operacional limitada a 4 KB. O escritor server-side está desligado até `AI_ANOMALY_ALERTS_ENABLED=true`; não existem regras, destino externo, alerta ativo ou contenção automática antes do baseline. Regressão integral: 38 arquivos / 440 testes aprovados.

**Ligação de observação preparada (2026-08-06):** quando e somente quando o limitador estiver em `shadow` e o escritor de alertas estiver explicitamente ativo, o resultado `would_limit` cria alerta minimizado de volume e indisponibilidade do limitador cria alerta técnico. Não há destino externo, decisão automática ou alerta ativo no estado atual.

**Critério de aceite:** padrão anormal dispara alerta verificável, contenção é reversível e auditável, e nenhum usuário é suspenso apenas por IP ou decisão opaca.

### Fase 6 — Verificação de produção e governança contínua

**Objetivo:** provar operação segura e manter o plano vivo.

- [x] Executar smoke tests autenticados nos endpoints protegidos, sem digitar credenciais pelo agente — geração de treino e degradação segura validadas em produção na sessão já autenticada.
- [ ] Validar ao vivo uma chamada normal, uma rejeição de rate limit, uma degradação segura e a criação do evento minimizado.
- [ ] Confirmar que nenhuma chamada rejeitada ou degradada alcançou o provedor.
- [x] Confirmar que não há prompt, transcrição, resposta ou dado de saúde em eventos, logs e alertas — auditoria de telemetria/logs e esquema RLS das tabelas de proteção revisados em 2026-08-06.
- [ ] Revisar custos, falsos positivos e suporte após período acordado de observação.
- [ ] Ajustar thresholds somente com evidência de telemetria, registrando decisão e impacto.
- [x] Atualizar este documento ao concluir cada fase: data, alterações, testes, evidência e pendências.
- [ ] Reavaliar retenção, acesso administrativo e postura de privacidade trimestralmente.

**Smoke autenticado de degradação (2026-08-06):** na conta FREE já autenticada, a geração de plano remoto retornou falha do fornecedor (`network_or_runtime`, sem status HTTP). A configuração Vercel confirma `DEEPSEEK_API_KEY` presente; a falha foi transitória de runtime/rede, não ausência de credencial. O cliente apresentou estado de geração, finalizou um plano seguro de fallback e o botão **Start Workout** abriu o modo de execução com dez exercícios, sem registrar séries ou concluir a sessão. A telemetria persistiu um único evento minimizado `provider_failed`, sem tokens, custo, prompt ou dado de saúde. A UI foi corrigida para identificar esse resultado como plano local seguro, nunca como plano gerado por IA. Isto confirma a degradação segura desse fluxo, mas não substitui a validação dos demais endpoints, do rate limit pós-auth ou do período de observação.

**Validação da Fase 6 (2026-08-06):** o modo enforce do limitador pós-auth foi coberto em teste com `429` e `Retry-After`; ele não foi ativado em produção. A regressão integral passou com 38 arquivos / 441 testes. As tabelas `ai_usage_events`, `ai_rate_limit_buckets` e `ai_usage_alerts` foram verificadas com RLS ativa em produção. A rejeição ao vivo de rate limit e a revisão após observação continuam pendentes deliberadamente.

**Critério de aceite:** os controles funcionam em produção, têm evidência registrada e não degradam o fluxo crítico de treino.

---

## 5. Registro de execução por fase

| Fase | Estado | Data | Evidência / decisão |
|---|---|---|---|
| 0 — Baseline e ameaça | 🟨 Em auditoria documental | 2026-08-05 | Inventário estático: 8 endpoints; 5 sem autenticação própria; sequência do plano corrigida |
| 1 — Exposição imediata | 🟩 Concluída | 2026-08-06 | Os oito endpoints de IA exigem identidade, `Content-Type: application/json`, objeto JSON na raiz e rejeitam body acima de um teto global antes de I/O subsequente; voz exige entitlement próprio, classificação exige TRAINER, tradução limita fan-out a 8 e valida lote, e as duas rotas de geração aceitam no máximo 128 mil caracteres. Welcome usa idempotência atómica HMAC ativa em produção. O guard WAF `ai-preauth-burst` protege somente falhas de autenticação, sem armazenamento de IP no aplicativo. |
| 2 — Telemetria persistida | 🟨 Em observação controlada | 2026-08-06 | Tabela, RLS, retenção de 90 dias, catálogo temporal de preço, agregados diários e idempotência de retries foram aplicados e auditados; emissão minimizada de sucesso nos 8 endpoints está ativa. A observação começou, mas a primeira amostra contém apenas smokes controlados; não há base para thresholds. |
| 3 — Termos e comunicação | 🟨 Dependência externa | 2026-08-06 | Política de Uso Justo, atribuição TRAINER–aluno e textos UX en/pt/es/de foram preparados e revisados; manuais TRAINER en/pt/es foram corrigidos para PRO 5/15/30. Não há thresholds públicos. Publicação em Termos e referência explícita na matriz dependem de aprovação de Product, Jurídico e Privacy. |
| 4 — Rate limiting | 🟨 Fundação aplicada, aguardando sombra | 2026-08-06 | Bucket atômico com RLS foi aplicado e conectado aos oito endpoints; o modo permanece `off` até ruleset baseado na observação e aprovação para sombra. |
| 5 — Alertas e contenção | 🟨 Fundação aplicada, aguardando baseline | 2026-08-06 | Tabela administrativa minimizada, RLS, escritor desativado e runbook foram preparados; faltam baseline, regras, destino operacional e validação sintética. |
| 6 — Produção e governança | 🟨 Verificação parcial | 2026-08-06 | O boundary anônimo dos oito endpoints devolveu `401` em produção. Smoke autenticado confirmou que uma falha transitória do fornecedor degrada para plano seguro e não interrompe o início do treino; telemetria minimizada registrou o erro sem conteúdo e a UI identifica o resultado local sem alegar geração por IA. Permanecem pendentes os demais endpoints, rate limit pós-auth e observação de uso real. |

### Regra de atualização

Ao fechar uma fase, atualizar o checklist correspondente e esta tabela no mesmo commit. O registro deve conter: endpoints afetados, identidade e autorização aplicadas, decisão de threshold, testes executados, evidência de produção, impacto em privacidade e qualquer divergência remanescente. Nenhuma fase é marcada como concluída somente por código escrito. Achados documentais podem marcar uma fase como “em auditoria”, mas não como concluída.

---

## 6. Dependências e decisões que exigem autorização

### Ordem e gates

1. Fase 0 precede qualquer implementação.
2. Fase 1 precede telemetria e qualquer período de observação — não se mede produção deixando endpoints anônimos expostos.
3. Fase 2 precede thresholds definitivos e modo sombra do rate limit.
4. Fase 3 pode começar após a aprovação da Fase 0 e correr em paralelo às Fases 1–2; não depende de thresholds técnicos porque não publica números. Deve estar publicada antes do enforcement pós-auth de uso justo da Fase 4. Proteções pré-auth contra tráfego anônimo são controles de segurança e entram já na Fase 1.
5. Fase 5 depende da telemetria da Fase 2 e do enforcement da Fase 4.
6. Fase 6 fecha o plano somente após evidência real das Fases 1–5.

### Decisões

1. Identidade cobrada e autorização exigida por endpoint.
2. Limites máximos de payload e política de degradação por fluxo.
3. Modelo de evento, idempotência, retenção e quem pode consultar custos.
4. Uso ou não de sinal de rede; HMAC, rotação e retenção se aprovado.
5. Thresholds de rajada/concorrência e tempo de contenção por endpoint, calibrados pela Fase 2.
6. Armazenamento atômico do rate limit, TTL e comportamento em indisponibilidade.
7. Destino dos alertas, DPA aplicável e responsável operacional.
8. Texto final dos Termos e revisão jurídica/privacidade.
9. Política para consumo de IA iniciado por TRAINER em nome de aluno.

Nenhuma escrita de BD de produção, alteração de termos, integração de alerta externo ou bloqueio automático será executado sem autorização específica.
