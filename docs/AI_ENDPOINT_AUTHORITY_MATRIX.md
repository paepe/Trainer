# TrAIner — Matriz de Autoridade dos Endpoints de IA

**Estado:** inventário técnico verificado — 2026-08-11

| Endpoint | Natureza | Quem pode iniciar | Autoridade comercial | Proteção principal |
|---|---|---|---|---|
| `generate-smart-workout` | Comercial: plano autônomo | Aluno ou TRAINER com vínculo ativo | Plano efetivo do aluno | JWT, vínculo, entitlement, cap de sessão, idempotência |
| `generate-workout` | Comercial: geração legada | Próprio aluno autenticado | Plano efetivo do caller | JWT, `ai.workout_generation`, payload limitado |
| `parse-voice` | Comercial: voz + interpretação | Próprio aluno autenticado | Plano efetivo do aluno | JWT, `checkin.voice_input` + `ai.checkin_interpretation` |
| `cleanup-voice-note` | Operação de apoio por propósito | Caller autenticado | Conforme propósito; não cria patrocínio de IA | JWT, propósito fechado, consentimento/entitlement/papel |
| `generate-amplified` | Comercial opcional: perfil analítico | Próprio usuário autenticado | Plano/consentimento do caller | JWT, consentimento persistido, perfil persistido minimizado |
| `translate-exercise-content` | Operação interna de localização | Usuário autenticado no fluxo de leitura | Não altera entitlement comercial | JWT, locale/lote/campo limitados, pool de 8 |
| `classify-exercises` | Operação interna de catálogo | TRAINER autenticado | Não atribuir a aluno | JWT, papel TRAINER, lote máximo de 50 |
| `send-welcome-message` | Operação interna de vínculo | TRAINER autenticado e vinculado | Não cria direito de IA para aluno | JWT, vínculo ativo, idempotência, persistência de notificação |

## Regras de interpretação

- Um campo no body nunca determina usuário, aluno, plano, consentimento ou vínculo.
- Um vínculo TRAINER–aluno permite colaboração prevista; não patrocina voz, interpretação ou adaptação por IA do aluno.
- Operações internas não devem transformar custo técnico em direito comercial transferível.
- Endpoints comerciais devem resolver a licença no backend do sujeito da funcionalidade, não no frontend.
- Quando os endpoints autónomos `generate-smart-workout` ou `generate-workout` recusam por `sessions_per_week_limit_reached`, o cliente deve apresentar o estado comercial e não degradar para um treino local; fallback é reservado a indisponibilidade técnica, nunca a uma recusa de entitlement.
