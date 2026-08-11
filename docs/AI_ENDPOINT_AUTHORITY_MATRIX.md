# TrAIner — Matriz de Autoridade dos Endpoints de IA

**Estado:** inventário técnico verificado — 2026-08-12

| Endpoint | Natureza | Quem pode iniciar | Autoridade comercial | Proteção principal |
|---|---|---|---|---|
| `generate-smart-workout` | Comercial: plano autônomo | Aluno ou TRAINER com vínculo ativo | Plano efetivo do aluno | JWT, vínculo, Coach DNA e check-in persistido resolvidos no backend, entitlement, cap de sessão, idempotência; origem `autonomous_direct`/`trainer_timeout` não muda a autoridade comercial |
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
- Para aluno com TRAINER activo, `generate-smart-workout` resolve novamente no backend o vínculo, o Coach DNA activo e o último check-in persistido quando existir; timeout é somente uma origem de navegação, não uma alteração de metodologia, licença ou quota. A proveniência `trainer_timeout` só é persistida se o banco confirmar a notificação `workout_timeout` ainda acionável, destinada ao aluno e vinculada ao TRAINER activo; caso contrário o plano é `autonomous_direct`. O identificador da notificação não é mostrado na UI nem enviado à telemetria. Ausência de check-in não bloqueia o Workout: a geração usa o estado disponível sem alegar calibração confirmada do dia.
- O histórico do TRAINER recebe somente metadados minimizados do treino autónomo: origem, aplicação de Coach DNA e o booleano `checkin_applied`. A referência e o conteúdo do check-in permanecem em `ai_suggestions`, exclusiva do aluno; não há voz, interpretação, campos clínicos ou conteúdo de Ritmo Corporal copiados para `workout_plans`.
- A quota `workout.sessions_per_week` conta exclusivamente sessões iniciadas de planos `ai_generated`; sessões de planos prescritos pelo TRAINER nunca consomem a quota autónoma do aluno.
- Um plano manual accionável é apresentado como uma escolha própria no Workout e nunca suprime a geração, a apresentação ou o CTA do treino autónomo. Ambos os caminhos reutilizam o mesmo contrato `generate-smart-workout`; a coexistência na UI não altera quota, Coach DNA, check-in, Safety Gate ou o fluxo realtime de prescrição.
- Quando o aluno activa voluntariamente Ritmo Corporal, `generate-smart-workout` resolve dia/duração do ciclo e preferência de adaptação da `profile_v2` no backend para personalizar o seu próprio plano. Essa informação é enviada ao provedor de IA somente pelo backend; a sua divulgação ao TRAINER continua a depender exclusivamente da matriz de compartilhamento do aluno. Decisão explícita Product/Privacy registrada em 2026-08-11.
- Quando os endpoints autónomos `generate-smart-workout` ou `generate-workout` recusam por `sessions_per_week_limit_reached`, o cliente deve apresentar o estado comercial e não degradar para um treino local; fallback é reservado a indisponibilidade técnica, nunca a uma recusa de entitlement.
