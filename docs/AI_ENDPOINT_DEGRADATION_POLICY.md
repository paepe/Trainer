# TrAIner — Política de Degradação por Endpoint de IA

**Estado:** decisão técnica operacional — 2026-08-06

## Princípio

Uma indisponibilidade do provedor, telemetria, idempotência ou futuro limitador nunca pode corromper dados nem interromper um treino já iniciado. Para novas chamadas com custo, a proteção indisponível não pode abrir caminho para uma nova chamada paga sem autoridade.

| Endpoint | Função | Quando IA/proteção não está disponível | Continuidade obrigatória |
|---|---|---|---|
| `generate-smart-workout` | Plano autônomo | Não enviar nova chamada paga; retornar indisponibilidade temporária ou reutilizar resposta idempotente concluída | Cliente gera plano local seguro; sessão já iniciada continua intacta |
| `generate-workout` | Caminho legado de geração | Indisponibilidade temporária; não persistir plano parcial | Tela consumidora usa o plano local seguro quando aplicável; nunca iniciar sessão vazia |
| `translate-exercise-content` | Localização de texto de exercício | Preservar texto de origem quando uma tradução falhar | Exercícios permanecem legíveis e utilizáveis; cache não recebe resultado parcial inválido |
| `parse-voice` | Estruturar check-in por voz | Retornar falha de voz; não registrar transcrição em log | Usuário continua pelo check-in manual/detalhado |
| `cleanup-voice-note` | Remover eco de fala | Retornar texto original sem alteração | Campo de texto continua salvável; não inventar conteúdo |
| `generate-amplified` | Perfil analítico opcional | Indisponibilidade temporária; não modificar perfil persistido | Onboarding e perfil básico continuam sem narrativa amplificada |
| `classify-exercises` | Classificação operacional de biblioteca | Não classificar/retentar de modo controlado; não inventar categoria | Biblioteca existente continua disponível; classificação pendente não bloqueia treino |
| `send-welcome-message` | Mensagem de boas-vindas | Não confirmar envio sem persistir `notification_log` | Aceite de convite e vínculo permanecem válidos; mensagem pode ser reemitida idempotentemente |

## Regras transversais

- `429`, `503` e falhas de fornecedor comunicam indisponibilidade temporária sem revelar thresholds, custo ou lógica antiabuso.
- Telemetria é best-effort e nunca repete a chamada de IA; falha de telemetria não muda o resultado já calculado.
- Para proteção de custo/idempotência, indisponibilidade é fail-closed antes de uma nova chamada paga. O fallback local é aplicado no cliente apenas onde foi projetado e testado.
- Nenhum fallback escreve prompt, áudio, transcrição, resposta do modelo ou dado de saúde em logs.
- Execução offline, registro de sets e treino em curso não dependem de endpoint de IA.
- Se a geração com Ritmo Corporal activado estiver indisponível, o endpoint não persiste nem expõe o contexto de ciclo; o fluxo segue a mesma continuidade segura de `generate-smart-workout`.

## Verificação exigida antes de enforcement

Cada modo precisa de teste automatizado e smoke autenticado proporcional ao risco. O teste de `429` somente ocorre depois de existir limitador aprovado e em modo sombra; não se simula bloqueio em produção sem essa aprovação.
