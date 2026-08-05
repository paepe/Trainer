# TrAIner — Plano de Uso Justo, Proteção de Custo e Prevenção de Abuso de IA

**Estado:** Fases 0–1 em execução; Fase 2 activada em observação controlada — enforcement permanece bloqueado até haver evidência de uso real e aprovação específica
**Última atualização:** 2026-08-05 — smoke autenticado de geração e telemetria confirmado em produção
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
- [ ] Distinguir funções comerciais (`voice`, geração, análise) de operações internas (`classify`, tradução, welcome), aplicando autorização por papel e propósito.
- [x] Mapear os propósitos de `cleanup-voice-note`: check-in, Coach DNA, nota de plano do TRAINER e onboarding (objetivos, histórico de movimento, saúde declarada, comorbidades e fatores sensíveis).
- [x] Aprovar D0.1: `allow_ai_adaptation` ausente ou falso equivale a não autorização; o consentimento é lido da versão persistida do perfil.
- [ ] Completar o consentimento/autorização dos propósitos restantes de voz e os limites operacionais de `generate-amplified`; D0.1 já resolve o onboarding e a minimização de dados de saúde.
- [ ] Definir limites duros de payload e concorrência a partir da UX real de cada fluxo.
- [ ] Definir teto de fan-out por request e estratégia de batching/fila para tradução; o teto deve limitar chamadas reais ao provedor, não apenas itens recebidos.
- [ ] Definir sinais de abuso: chamadas concorrentes, repetição idêntica, volume inviável para uso humano e padrões distribuídos por conta/rede.
- [ ] Aprovar modelo de telemetria, idempotência, cálculo de custo, retenção, RLS e descarte conforme minimização e GDPR.
- [ ] Definir HMAC/rotação do sinal de rede ou decidir formalmente não usá-lo.
- [ ] Definir política de degradação por endpoint e resposta a indisponibilidade da proteção.
- [ ] Obter aprovação explícita de Product, Privacy e Engineering para o desenho; thresholds de enforcement permanecem provisórios até a Fase 2 medir uso real.

**Critério de aceite:** inventário validado em execução, identidade cobrada, autorização, modelo de dados, retenção, degradação e ameaças aprovados. Nenhum threshold definitivo é escolhido antes da telemetria.

### Decisão D0.1 — processamento externo de dados de saúde por IA

**Recomendação técnica e de privacidade:** regra **default-deny**. Antes de um consentimento `allow_ai_adaptation=true` já persistido, nenhum texto de onboarding é enviado ao provedor externo de IA; o reconhecimento de voz continua utilizável com o texto bruto local. Após consentimento, o backend aceita somente o propósito autorizado e um payload minimizado. `generate-amplified` deve receber apenas dados operacionais necessários, nunca texto livre clínico, transcrições, medicação, saúde emocional ou fatores/ciclo sensíveis brutos.

**Aprovada e aplicada em 2026-08-05.** Esta decisão preserva o onboarding e evita inferir consentimento a partir de ausência de dado. O reconhecimento continua local antes do consentimento; `cleanup-voice-note` exige caller autenticado, propósito fechado e consentimento persistido para onboarding. `generate-amplified` exige caller autenticado, consentimento persistido e lê exclusivamente o perfil persistido, reduzido a sinais estruturados permitidos. A chamada do wizard que descartava a resposta foi removida.

### Fase 1 — Fechar exposição imediata dos endpoints de IA

**Objetivo:** garantir que cada chamada com custo tenha identidade autenticada, autorização e limites de payload antes de alcançar o provedor.

- [x] Migrar `parse-voice`, `cleanup-voice-note`, `generate-amplified`, `classify-exercises` e `send-welcome-message` para `api/_lib/auth.ts`.
- [ ] Atualizar os cinco chamadores para enviar o token; não aceitar identidade declarada apenas no body.
- [x] Em `parse-voice`, validar `checkin.voice_input` **e** `ai.checkin_interpretation` da própria conta; patrocínio do TRAINER nunca autoriza inferência paga.
- [x] Em `cleanup-voice-note`, introduzir propósito fechado e validar papel, fluxo e entitlement/consentimento correspondentes; não assumir que todo uso é check-in.
- [ ] Em `generate-amplified`, vincular o perfil ao próprio caller e exigir consentimento de IA aplicável.
- [x] Aplicar D0.1 aos fluxos de onboarding e Perfil Ampliado: fallback local pré-consentimento, `401/403` antes do provedor, leitura de consentimento/perfil persistidos e minimização de texto livre/dados sensíveis.
- [x] Em `classify-exercises`, exigir papel TRAINER e validar tamanho de cada campo, além do lote de 50.
- [x] Em `send-welcome-message`, derivar o aluno do JWT e exigir vínculo activo com o TRAINER; não confiar em `studentId`/`trainerId` declarados no body.
- [x] Substituir a chamada interna sem credencial por persistência server-side directa em `notification_log`; a operação só confirma sucesso após a escrita ser aceite.
- [x] Ativar a idempotência atómica de `send-welcome-message`: migração aplicada e verificada no Supabase em 2026-08-05; `AI_OPERATION_IDEMPOTENCY_HMAC_SECRET` e `AI_OPERATION_IDEMPOTENCY_ENABLED=true` configurados na Vercel Production, com RPCs restritas a `service_role`.
- [x] Em `generate-workout`, aplicar `ai.workout_generation` resolvido server-side, equivalente ao caminho smart.
- [ ] Validar método, `Content-Type`, esquema, tamanho máximo do body/campos, timeout e concorrência por request em todos os endpoints.
- [x] Limitar fan-out interno: `translate-exercise-content` preserva tradução isolada por item, mas usa pool máximo de 8 chamadas ao provedor por request.
- [ ] Aplicar proteção pré-auth emergencial, ampla e conservadora, nos cinco endpoints hoje anônimos; a política pós-auth calibrada continua na Fase 4.
- [ ] Adotar resposta uniforme: `401` anônimo, `403` sem papel/entitlement/vínculo, `400/413` payload inválido/excessivo.
- [ ] Testar que rejeições ocorrem antes de Supabase service role ou provedor de IA.
- [x] Remover o log da transcrição integral de `parse-voice`; rejeições de identidade, entitlement e tamanho são avaliadas antes do provedor.

**Critério de aceite:** nenhum endpoint de custo fica acessível anonimamente, confia em IDs do body como autoridade ou aceita payload ilimitado; testes positivos, negativos e de vínculo cobrem os oito endpoints.

**Nota de verificação (2026-08-05):** `send-welcome-message` bloqueia replays sequenciais consultando a mensagem persistida antes de gerar. Para concorrência, reserva uma chave HMAC numa tabela de claims antes de chamar o provedor, completa-a só depois de persistir a notificação e liberta-a em falha. A ativação foi confirmada com deploy Vercel Ready, variáveis de produção presentes, endpoint anônimo retornando `401`, zero claims residuais e permissões de RPC exclusivas de `service_role`.

### Fase 2 — Telemetria persistida, medição e custo por assinante

**Objetivo:** medir custo e comportamento normal antes de calibrar enforcement, sem registrar conteúdo sensível.

**Implementação activada:** [contrato de dados de telemetria](AI_TELEMETRY_DATA_CONTRACT.md) e migração revisável `supabase/sql-archive/supabase-ai-telemetry-20260805.sql`; retenção bruta de 90 dias, HMAC por ator e escrita exclusivamente server-side foram aplicados e auditados em produção em 2026-08-05. A flag `AI_USAGE_TELEMETRY_ENABLED=true` e o segredo HMAC estão configurados exclusivamente na Vercel Production.

- [x] Criar tabela de eventos de uso de IA com RLS administrativa e retenção bruta de 90 dias; aplicada e auditada em produção em 2026-08-05.
- [ ] Usar `request_id`/chave de operação única, gerada ou validada pelo servidor, para retries não duplicarem custo nem eventos.
- [x] Registrar sucesso, falha do provedor e rejeição pós-auth/pré-provedor sem prompt, transcrição, resposta ou dado de saúde.
- [ ] Para tráfego anônimo, usar somente métricas agregadas/amostradas da camada pré-auth; não criar um evento persistente por tentativa que permita encher a tabela.
- [x] Registrar contadores do provedor quando disponíveis; quando indisponíveis, marcar método como `unavailable` — nunca fabricar precisão.
- [ ] Calcular custo a partir de modelo, tokens/unidades, provedor, moeda e versão temporal do preço.
- [ ] Criar agregados diários por plano, endpoint e assinante; evitar consultas analíticas pesadas em tabelas transacionais.
- [x] Instrumentar emissão de sucesso minimizada nos oito endpoints; a emissão é feature-flagged e está activa em produção desde 2026-08-05.
- [ ] Executar período de observação aprovado sem bloqueio automático e medir percentis de uso, concorrência, erros e custo por plano.
- [ ] Testar RLS, minimização, retenção, idempotência, falha de escrita e indisponibilidade do coletor.
- [ ] Garantir que falha de telemetria não duplica a chamada de IA nem expõe conteúdo em fallback de log.

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

### Fase 3 — Política de Uso Justo, Termos e comunicação

**Objetivo:** alinhar contrato, marketing e UX antes de ativar contenção automatizada.

- [x] Redigir rascunho interno da Política de Uso Justo com exemplos de uso pessoal normal e abuso, sem converter o plano em quota visível — [AI_FAIR_USE_POLICY_DRAFT.md](AI_FAIR_USE_POLICY_DRAFT.md), pendente de revisão jurídica/privacidade e publicação.
- [ ] Inserir a cláusula aprovada nos Termos, com revisão jurídica e de privacidade.
- [ ] Manter “Ilimitado” no marketing de AI FITNESS e AI PERFORMANCE.
- [ ] Criar textos UX localizados para `429`, degradação e contenção temporária, com canal de suporte.
- [ ] Não publicar thresholds internos ou mecanismos que facilitem evasão.
- [ ] Atualizar a matriz de licenças para “ilimitado sujeito à Política de Uso Justo” somente após publicação dos Termos.
- [ ] Registrar política de consumo iniciado por TRAINER em nome de aluno e relação com eventual franquia de IA do TRAINER.

**Critério de aceite:** Termos, Política, marketing, matriz e UX descrevem a mesma oferta antes do enforcement da Fase 4.

### Fase 4 — Rate limiting server-side sem quota comercial

**Objetivo:** bloquear automação e rajadas antes do custo, com thresholds calibrados pela Fase 2.

- [ ] Implementar mecanismo compartilhado, server-side, atômico e resistente a múltiplas instâncias; memória local de função serverless não é autoridade.
- [ ] Implementar duas camadas: rajada pré-auth por sinal de rede pseudonimizado e limite pós-auth por ator + endpoint.
- [ ] Sinal de rede é defesa adicional e nunca fundamento isolado para sanção de conta; acomodar NAT, redes corporativas e famílias.
- [ ] Executar primeiro em modo sombra, comparar falsos positivos e obter aprovação antes de bloquear.
- [ ] Aplicar janelas de rajada e concorrência independentes por operação; não reutilizar um número global.
- [ ] Retornar `429` com `Retry-After` e mensagem localizada, sem revelar thresholds internos.
- [ ] Prever exceção operacional temporária, auditada, com motivo, aprovador e expiração automática.
- [ ] Implementar TTL/limpeza dos buckets e testes de concorrência, relógio, múltiplas instâncias e indisponibilidade.
- [ ] Em falha do limitador, aplicar a degradação aprovada: treino local seguro, check-in manual ou indisponibilidade não crítica; não chamar o provedor em fail-open.
- [ ] Validar que execução offline, registo de sets e sessão já iniciada nunca dependem do limitador.

**Critério de aceite:** excedentes não alcançam o provedor; concorrência não permite bypass; modo sombra demonstrou baixa taxa de falso positivo; uso humano normal permanece sem contador e sem cap comercial.

### Fase 5 — Anomalia, alertas e contenção operacional

**Objetivo:** detectar consumo economicamente anormal e responder com proporcionalidade.

- [ ] Definir baseline por plano, endpoint e coorte a partir da Fase 2.
- [ ] Criar regras de alerta para picos, alta taxa de erro, consumo por conta/rede e repetição automatizada.
- [ ] Entregar alertas a canal operacional com identificador pseudonimizado e contexto mínimo; validar DPA e acesso do destino.
- [ ] Implementar contenção progressiva: rate limit temporário → revisão manual → suspensão documentada em abuso confirmado.
- [ ] Exigir revisão humana antes de suspensão prolongada ou encerramento de conta.
- [ ] Criar runbook de investigação, reversão, comunicação ao cliente e preservação mínima de evidência.
- [ ] Testar alertas e contenção com eventos sintéticos, sem dados reais de saúde.

**Critério de aceite:** padrão anormal dispara alerta verificável, contenção é reversível e auditável, e nenhum usuário é suspenso apenas por IP ou decisão opaca.

### Fase 6 — Verificação de produção e governança contínua

**Objetivo:** provar operação segura e manter o plano vivo.

- [ ] Executar smoke tests autenticados nos endpoints protegidos, sem digitar credenciais pelo agente.
- [ ] Validar ao vivo uma chamada normal, uma rejeição de rate limit, uma degradação segura e a criação do evento minimizado.
- [ ] Confirmar que nenhuma chamada rejeitada ou degradada alcançou o provedor.
- [ ] Confirmar que não há prompt, transcrição, resposta ou dado de saúde em eventos, logs e alertas.
- [ ] Revisar custos, falsos positivos e suporte após período acordado de observação.
- [ ] Ajustar thresholds somente com evidência de telemetria, registrando decisão e impacto.
- [ ] Atualizar este documento ao concluir cada fase: data, alterações, testes, evidência e pendências.
- [ ] Reavaliar retenção, acesso administrativo e postura de privacidade trimestralmente.

**Critério de aceite:** os controles funcionam em produção, têm evidência registrada e não degradam o fluxo crítico de treino.

---

## 5. Registro de execução por fase

| Fase | Estado | Data | Evidência / decisão |
|---|---|---|---|
| 0 — Baseline e ameaça | 🟨 Em auditoria documental | 2026-08-05 | Inventário estático: 8 endpoints; 5 sem autenticação própria; sequência do plano corrigida |
| 1 — Exposição imediata | 🟨 Em execução | 2026-08-05 | Os oito endpoints de IA exigem identidade; todos exigem `Content-Type: application/json`; voz exige entitlement próprio, classificação exige TRAINER, tradução limita fan-out a 8 e rejeita `items` inválido/excessivo antes do provedor, e as duas rotas de geração rejeitam payload acima de 128 mil caracteres. Welcome usa idempotência atómica HMAC activa em produção. CORS de chamadas autenticadas foi validado em produção. Restam validação uniforme de schema e a camada pré-auth de rajada. |
| 2 — Telemetria persistida | 🟨 Em observação controlada | 2026-08-05 | Tabela, RLS, view diária e retenção de 90 dias aplicadas e auditadas; emissão minimizada de sucesso nos 8 endpoints está activa em produção. A primeira amostra autenticada e a medição de período de observação permanecem pendentes. |
| 3 — Termos e comunicação | 🟨 Em rascunho interno | 2026-08-05 | Política de Uso Justo redigida para revisão; nenhum Termo, marketing ou texto público foi alterado. |
| 4 — Rate limiting | ⬜ Não iniciada | — | — |
| 5 — Alertas e contenção | ⬜ Não iniciada | — | — |
| 6 — Produção e governança | ⬜ Não iniciada | — | — |

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
