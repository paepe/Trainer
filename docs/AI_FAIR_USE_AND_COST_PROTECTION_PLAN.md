# TrAIner — Plano de Uso Justo, Proteção de Custo e Prevenção de Abuso de IA

**Estado:** Planejado — nenhuma fase autorizada para implementação
**Última atualização:** 2026-08-05
**Proprietário:** Product / Engineering / Privacy
**Escopo:** AI FITNESS, AI PERFORMANCE e endpoints de IA usados por TRAINER

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

| Controle | Estado |
|---|---|
| Limite FREE de sessão autónoma | Implementado no servidor: 1/semana |
| Autorização de entitlement na geração smart | Implementada no servidor |
| Registro de tokens de `generate-smart-workout` | Parcial: log estruturado `ai_generation_cost` |
| Telemetria persistida e agregável por assinante | Ausente |
| Rate limit por usuário/IP | Ausente |
| Alertas de consumo anormal | Ausentes |
| Política de uso justo / Termos | Ausente do repositório |
| `api/parse-voice` | Prioridade crítica: sem autenticação e sem rate limit próprios verificados |

---

## 3. Arquitetura alvo

```text
Request autenticado
        |
        v
Resolver de identidade + entitlement
        |
        v
Rate limit de rajada (usuário + IP pseudonimizado + endpoint)
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

**Dados mínimos de telemetria:** `actor_id`, `subject_id` quando distinto, `plan_key_effective`, `endpoint`, `origin`, timestamp, tokens de entrada/saída quando disponíveis, custo estimado, resultado HTTP e identificador técnico de correlação. Endereços IP devem ser pseudonimizados com hash rotativo; prompts, áudio e transcrições são proibidos nessa tabela.

---

## 4. Plano faseado

### Fase 0 — Baseline, decisões e modelo de ameaça

**Objetivo:** transformar “uso justo” em política mensurável, sem impor quota comercial.

- [ ] Inventariar todos os endpoints que chamam provedores de IA, o provedor, custo variável, autenticação atual e identidade cobrada.
- [ ] Confirmar os fluxos com custo: geração de treino, voz, interpretação, ajustes, análises e traduções.
- [ ] Definir limites de rajada iniciais por endpoint, usuário e IP pseudonimizado; documentar a justificativa de UX e custo.
- [ ] Definir sinais de abuso: chamadas concorrentes, repetição idêntica, volume inviável para uso humano e padrões distribuídos por IP/conta.
- [ ] Definir política de resposta: `429` temporário, retry seguro, escalonamento operacional e suspensão manual excepcional.
- [ ] Definir retenção, acesso e descarte da telemetria conforme minimização e GDPR.
- [ ] Obter aprovação explícita de Product, Privacy e Engineering para os valores iniciais.

**Critério de aceite:** tabela de endpoints, modelo de dados, thresholds iniciais, resposta a incidentes e retenção aprovados; nenhum valor escolhido apenas por intuição.

### Fase 1 — Fechar exposição imediata dos endpoints de IA

**Objetivo:** garantir que cada chamada com custo tenha identidade autenticada, autorização e limites de payload antes de alcançar o provedor.

- [ ] Migrar `api/parse-voice` para a autenticação compartilhada de `api/_lib/auth.ts`.
- [ ] Verificar entitlement próprio antes de voz, interpretação, ajuste ou análise; patrocínio nunca autoriza inferência paga.
- [ ] Validar tamanho máximo de texto/transcrição, formato, timeout e concorrência por request.
- [ ] Aplicar o mesmo padrão aos demais endpoints de IA que não o consumam integralmente.
- [ ] Testar: anônimo recebe `401`; entitlement negado recebe resposta de produto apropriada; payload inválido não chega ao provedor.
- [ ] Testar regressão de privacidade: nenhum dado sensível entra em logs de erro.

**Critério de aceite:** nenhum endpoint de custo fica acessível anonimamente ou com payload ilimitado; cobertura de testes positiva e negativa para cada endpoint.

### Fase 2 — Rate limiting server-side sem quota comercial

**Objetivo:** bloquear automação e rajadas antes do custo, preservando uso humano normal.

- [ ] Implementar mecanismo compartilhado de rate limit server-side, atômico e resistente a múltiplas instâncias.
- [ ] Preferir armazenamento durável/atômico no backend; não usar memória local de função serverless como autoridade.
- [ ] Aplicar janelas de rajada por `actor_id`, endpoint e IP pseudonimizado, com limites independentes por operação.
- [ ] Retornar `429` com `Retry-After` e mensagem UX localizada, sem revelar thresholds internos.
- [ ] Prever allowlist operacional temporária, auditada e com expiração automática.
- [ ] Implementar limpeza/TTL dos buckets e testes de concorrência.
- [ ] Validar que o rate limit não bloqueia o registo, a execução offline ou uma sessão de treino já iniciada.

**Critério de aceite:** chamadas excedentes não alcançam o provedor; concorrência não permite bypass; uso normal de AI FITNESS/PERFORMANCE permanece sem contador e sem cap comercial.

### Fase 3 — Telemetria persistida e custo por assinante

**Objetivo:** medir custo real sem registrar conteúdo sensível.

- [ ] Criar tabela de eventos de uso de IA com RLS administrativa e política de retenção definida na Fase 0.
- [ ] Registrar evento após cada chamada, inclusive falha do provedor e bloqueio por rate limit, sem prompt/transcrição.
- [ ] Calcular custo estimado a partir de modelo, tokens, provedor e versão de preço registrados no evento.
- [ ] Criar agregados diários por plano, endpoint e assinante; evitar consultas analíticas pesadas em tabelas transacionais.
- [ ] Instrumentar `parse-voice`, interpretação, ajustes e análises — hoje só a geração smart possui log de tokens.
- [ ] Testar RLS, minimização de campos, retenção e consistência em retries.

**Critério de aceite:** custo médio por assinante/plano e por endpoint é mensurável; nenhuma telemetria contém dados de saúde ou conteúdo de IA.

### Fase 4 — Anomalia, alertas e contenção operacional

**Objetivo:** detectar consumo economicamente anormal e responder com proporcionalidade.

- [ ] Definir baseline por plano, endpoint e coorte após período mínimo de medição.
- [ ] Criar regras de alerta para picos, alta taxa de erro, consumo por IP/conta e repetição automatizada.
- [ ] Entregar alertas a canal operacional com identificador pseudonimizado e contexto mínimo.
- [ ] Implementar contenção progressiva: rate limit temporário → revisão manual → suspensão documentada em caso de abuso confirmado.
- [ ] Criar runbook de investigação, reversão e comunicação ao cliente.
- [ ] Testar alertas com eventos sintéticos sem tocar em dados reais de saúde.

**Critério de aceite:** um padrão anormal dispara alerta verificável e pode ser contido sem interromper uso humano legítimo.

### Fase 5 — Política comercial, Termos e comunicação

**Objetivo:** alinhar promessa pública, contrato e operação.

- [ ] Redigir Política de Uso Justo com exemplos de uso pessoal normal e abuso, sem converter o plano em quota visível.
- [ ] Inserir a cláusula aprovada nos Termos, com revisão jurídica e de privacidade.
- [ ] Manter “Ilimitado” no marketing de AI FITNESS e AI PERFORMANCE.
- [ ] Criar texto UX para `429` e bloqueio temporário, com canal de suporte e sem expor critérios antiabuso.
- [ ] Atualizar matriz de licenças para declarar “ilimitado sujeito à Política de Uso Justo”, somente após Termos publicados.
- [ ] Registrar decisão sobre uso por TRAINER em nome de aluno e eventual franquia de IA do TRAINER.

**Critério de aceite:** marketing, Termos, UX e comportamento técnico dizem a mesma coisa; nenhuma promessa excede o enforcement real.

### Fase 6 — Verificação de produção e governança contínua

**Objetivo:** provar operação segura e manter o plano vivo.

- [ ] Executar smoke tests autenticados nos endpoints protegidos, sem digitar credenciais pelo agente.
- [ ] Validar ao vivo uma chamada normal, uma rejeição de rate limit e a criação do evento minimizado.
- [ ] Revisar custos, falsos positivos e suporte após período acordado de observação.
- [ ] Ajustar thresholds somente com evidência de telemetria, registrando decisão e impacto.
- [ ] Atualizar este documento ao concluir cada fase: data, alterações, testes, evidência e pendências.
- [ ] Reavaliar retenção, acesso administrativo e postura de privacidade trimestralmente.

**Critério de aceite:** os controles funcionam em produção, têm evidência registrada e não degradam o fluxo crítico de treino.

---

## 5. Registro de execução por fase

| Fase | Estado | Data | Evidência / decisão |
|---|---|---|---|
| 0 — Baseline e ameaça | ⬜ Não iniciada | — | — |
| 1 — Exposição imediata | ⬜ Não iniciada | — | — |
| 2 — Rate limiting | ⬜ Não iniciada | — | — |
| 3 — Telemetria persistida | ⬜ Não iniciada | — | — |
| 4 — Alertas e contenção | ⬜ Não iniciada | — | — |
| 5 — Termos e comunicação | ⬜ Não iniciada | — | — |
| 6 — Produção e governança | ⬜ Não iniciada | — | — |

### Regra de atualização

Ao fechar uma fase, atualizar o checklist correspondente e esta tabela no mesmo commit. O registro deve conter: endpoints afetados, decisão de threshold, testes executados, evidência de produção, impacto em privacidade e qualquer divergência remanescente. Nenhuma fase é marcada como concluída somente por código escrito.

---

## 6. Dependências e decisões que exigem autorização

1. Thresholds iniciais de rajada e tempo de bloqueio por endpoint.
2. Mecanismo de armazenamento atômico de rate limit e política de TTL.
3. Retenção dos eventos de custo e quem pode consultá-los.
4. Destino dos alertas e responsável operacional.
5. Texto final dos Termos e revisão jurídica.
6. Política para consumo de IA iniciado por TRAINER em nome de aluno.

Nenhuma escrita de BD de produção, alteração de termos, integração de alerta externo ou bloqueio automático será executado sem autorização específica.
