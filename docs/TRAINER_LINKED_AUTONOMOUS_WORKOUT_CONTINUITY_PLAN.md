# Plano de Implementação — Workout Autónomo Vinculado ao TRAINER e Continuidade de Check-in

**Versão:** 1.5
**Data inicial:** 2026-08-11
**Estado:** Em execução — Fases 0–4 concluídas; validação integrada e smoke permanecem na Fase 5
**Referências:** `docs/WORKOUT_READY_TIMEOUT_PLAN.md` · `docs/WORKOUT_PLAN_EXPIRY_CONTROL.md` · `docs/FEATURE_ACCESS_MATRIX.md` · `docs/AI_TRAINER_SPONSORED_CONSUMPTION_POLICY_DRAFT.md` · `docs/AI_GOVERNANCE_CHANGE_GATE.md`

---

## 1. Objectivo

Unificar os caminhos de treino autónomo de um aluno com TRAINER activo — início directo pelo módulo **Workout** e continuidade após falta de resposta do TRAINER — sem retirar a autonomia do aluno e sem prometer acompanhamento em tempo real.

O resultado deve ser um único contrato server-side que:

1. usa o **Coach DNA** do TRAINER activo quando ele existir;
2. usa o último check-in válido e persistido do aluno, incluindo o check-in manual detalhado patrocinado pelo vínculo;
3. preserva os limites de geração autónoma da licença efectiva do aluno;
4. diferencia treino **monitorado posteriormente** de treino prescrito/acompanhado;
5. impede que um card histórico de timeout funcione como uma fonte infinita e ambígua de novos treinos.

### Invariante de preservação

O acompanhamento **realtime** de check-in pelo TRAINER e a capacidade de o profissional prescrever/enviar um treino a partir desse check-in são fluxos estabilizados e ficam fora do escopo funcional desta iniciativa. Nenhuma fase pode alterar o envio de `workout_ready`, a leitura realtime de `checkin_prontidao`, a decisão manual do TRAINER, nem os caminhos de plano `manual`, `workout_approved` e `workout_rejected`.

---

## 2. Decisões de produto já confirmadas

| Decisão | Regra confirmada |
|---|---|
| Autonomia do aluno | Um aluno com TRAINER activo pode iniciar treino autónomo directamente no **Workout**; não precisa de aprovação prévia. |
| Papel do Coach DNA | O treino autónomo do aluno vinculado é orientado pelo DNA do TRAINER quando há DNA activo; não deve ser apresentado como plano supervisionado. |
| Plano prescrito | O plano prescrito pelo TRAINER usa a sua metodologia/Coach DNA, é integralmente executável pelo aluno e não consome a quota autónoma do aluno. |
| Check-in | Não é obrigatório para iniciar Workout. Quando existir check-in persistido aplicável, ele orienta a geração; sem novo check-in, o aluno segue com o seu estado actual e recebe apenas aconselhamento para confirmar as condições do dia. O vínculo patrocina ao aluno FREE a captura manual detalhada, mas não voz, interpretação nem ajuste de IA. |
| Ritmo Corporal | Para aluno que activou voluntariamente Ritmo Corporal, o lembrete de Workout recomenda revê-lo junto do check-in. Ele orienta a geração do plano do próprio aluno; a visibilidade para terceiros segue exclusivamente as configurações/grants já existentes do aluno. |
| Fallback por timeout | É uma entrada alternativa para o mesmo treino autónomo, não uma autorização especial, nem crédito adicional de sessões. |
| Monitoramento | O TRAINER pode avaliar posteriormente histórico, sessão, check-ins e progresso; não existe acompanhamento em tempo real nem aprovação tácita. |
| Limites comerciais | FREE mantém 1 sessão autónoma/semana e até 6 exercícios; AI FITNESS e AI PERFORMANCE mantêm uso comercialmente ilimitado, sujeito a Uso Justo. Planos prescritos não consomem a quota autónoma. |
| Ausência de DNA | Se o TRAINER não tiver Coach DNA activo, o sistema usa o perfil/prefs do aluno e a IA padrão, sem alegar que o plano foi orientado pelo treinador. |
| Sem TRAINER | O Workout autónomo usa o AI Coach e as preferências do aluno, sem associação a acompanhamento profissional. |

### Vocabulário obrigatório na UI

- **Plano prescrito pelo TRAINER:** preparado ou ajustado pelo profissional, sob a sua metodologia/Coach DNA, e executado integralmente pelo aluno.
- **Treino autónomo orientado pelo DNA Coach:** iniciado pelo aluno, com metodologia do TRAINER quando disponível, para monitoramento posterior.
- **Treino autónomo por IA:** iniciado pelo aluno sem DNA Coach aplicável.

Não usar “sessão acompanhada”, “aprovada” ou equivalente nos dois últimos casos.

### Matriz de aderência pactuada

| Caminho | Coach DNA | Check-in persistido | Participação do TRAINER | Limites |
|---|---|---|---|---|
| Plano prescrito pelo TRAINER | Sim | Sim | Prescreve, ajusta e acompanha | Patrocinado pelo vínculo; aluno executa integralmente. |
| Workout autónomo com TRAINER activo | Sim | Sim | Não aprova antes; monitora posteriormente por histórico, Progress e check-ins | Licença do aluno: FREE 1 sessão autónoma/semana; AI FITNESS/AI PERFORMANCE ilimitado comercialmente. |
| Fallback após falta de resposta | Deve usar Coach DNA | Sim | Não respondeu no prazo; pode avaliar depois | Mesmos limites da licença; entrada alternativa para treino autónomo. |
| Workout autónomo sem TRAINER | AI Coach + preferências do aluno | Sim | Não há acompanhamento profissional | Licença do aluno. |
| Aluno FREE vinculado a TRAINER | Sim, nos treinos autónomos e prescritos | Sim; check-in detalhado manual patrocinado | Pode receber plano prescrito ou treinar autonomamente com DNA Coach; TRAINER acompanha depois | 1 sessão autónoma/semana; plano prescrito não consome a quota. |

---

## 3. Estado actual e lacunas verificadas

| Área | Estado actual | Lacuna a fechar |
|---|---|---|
| Workout directo de aluno vinculado | Lê Coach DNA e o último check-in persistido | Formalizar e testar o contrato comum no servidor. |
| Fallback `trainer_timeout` | Usa check-in persistido, mas suprime o Coach DNA e força `DEFAULT_AI_TRAINER` | Deve usar o mesmo resolvedor de contexto do Workout directo. |
| Card `workout_timeout` | Pode ser reaberto e gerar sucessivos treinos pela mesma mensagem | Consumir a **acção do card**, sem limitar a autonomia normal pelo módulo Workout. |
| Limites FREE | Aplicados à geração autónoma | Garantir que ambos os pontos de entrada usam a mesma validação autoritativa. |
| Rastreabilidade | `ai_notes.trainer_timeout` é insuficiente como contrato de produto | Persistir proveniência mínima, check-in utilizado e estado de monitoramento. |
| Matriz documental | §2.2 de `FEATURE_ACCESS_MATRIX.md` diz que FREE tem apenas Check-in Rápido, mas §3 reconhece o patrocínio de check-in manual detalhado | Corrigir a contradição na mesma mudança governada. |

---

## 4. Fases e checklist vivo

### Fase 0 — Contrato, governança e critérios de validade

**Esforço:** pequeno · **Risco:** médio · **Migração:** não

Consolidar o contrato antes de alterar geração, pois ele influencia IA, licenciamento, dados de saúde e comunicação comercial.

- [x] Aplicar o `AI_GOVERNANCE_CHANGE_GATE.md` e classificar o impacto: endpoint/prompt, entitlement, patrocínio TRAINER, telemetria minimizada e dados de check-in. Evidência: revisão de 2026-08-11; não cria novo endpoint, provedor, custo, categoria de dado ou claim público.
- [x] Atualizar `FEATURE_ACCESS_MATRIX.md`: FREE vinculado tem check-in manual detalhado patrocinado; manter a exclusão de voz, interpretação e ajuste por IA.
- [x] Atualizar `AI_TRAINER_SPONSORED_CONSUMPTION_POLICY_DRAFT.md`: treino autónomo orientado por Coach DNA continua consumindo o entitlement do aluno; o vínculo não cria franquia adicional.
- [x] Rever `AI_ENDPOINT_AUTHORITY_MATRIX.md`, `AI_TELEMETRY_DATA_CONTRACT.md`, `AI_ENDPOINT_OPERATIONAL_BOUNDS.md` e `AI_ENDPOINT_DEGRADATION_POLICY.md`; a origem do treino não é enviada à telemetria e não altera limites. Ritmo Corporal activado é resolvido de `profile_v2` pelo backend, permanece excluído da telemetria e, se a leitura falhar, a geração segue sem esse contexto — sem tornar o payload do cliente autoritativo.
- [x] Definir a regra de check-in para geração autónoma: check-in é opcional. Quando houver um check-in persistido aplicável, a geração o utiliza; quando não houver confirmação actual, a UI recomenda validá-lo, sem bloquear Workout. Decisão de produto confirmada em 2026-08-11.
- [x] Estender o aconselhamento opcional a Ritmo Corporal quando o próprio aluno o activou; ele é contexto da geração para o próprio aluno, enquanto a divulgação ao TRAINER permanece nas configurações existentes de compartilhamento. Autorização explícita Product/Privacy para o envio backend → DeepSeek de dia/duração do ciclo e preferência de adaptação, registrada em 2026-08-11. Evidência: `StartWorkoutScreen.tsx` e `buildAIContext.ts` usam `profile_v2.body_rhythm.enabled`; `AI_ENDPOINT_AUTHORITY_MATRIX.md` registra a autoridade e `AI_TELEMETRY_DATA_CONTRACT.md` mantém exclusão de telemetria.
- [x] Definir a apresentação de datas/horas com instante UTC autoritativo e formatação no locale do aluno. Evidência: `WORKOUT_PLAN_EXPIRY_CONTROL.md`, migração `20260811201000_server_authoritative_workout_plan_expiry.sql` e `StartWorkoutScreen.tsx` validam no servidor e apresentam `expires_at` em `Intl.DateTimeFormat` no locale do aluno.
- [x] Registar a decisão de aprovação Product/Privacy exigida: autorização explícita de 2026-08-11 para que o backend envie ao DeepSeek os dados de Ritmo Corporal activados pelo aluno, exclusivamente para gerar o seu plano; divulgação ao TRAINER não é alterada.

**Conclusão da fase:** contrato técnico, comercial e documental sem contradições.

---

### Fase 1 — Contrato server-side único de geração autónoma vinculada

**Esforço:** médio · **Risco:** alto (fluxo runtime de treino) · **Migração:** provavelmente sim

- [x] Criar um resolvedor server-side único para `autonomous_direct` e `trainer_timeout`. Evidência: `set_autonomous_workout_provenance` valida no banco a notificação `workout_timeout`, o aluno destinatário, o vínculo activo e a acção ainda disponível; sem essa prova, a origem é normalizada para `autonomous_direct`. A geração continua no mesmo endpoint para ambos os caminhos.
- [x] Resolver no servidor: aluno, vínculo TRAINER activo, estado do convite/relacionamento, entitlement efectivo, Coach DNA aplicável e o último check-in persistido quando existir. Evidência: `generate-smart-workout` resolve vínculo, Coach DNA e check-in persistido no backend; na ausência de check-in, mantém a geração com o estado disponível, sem bloqueio.
- [x] Remover a regra cliente que força `coachDNA = null` em `source === 'trainer_timeout'`. Evidência: `StartWorkoutScreen.tsx`; o timeout passa a usar o mesmo contexto Coach DNA do Workout directo.
- [x] Incluir Coach DNA no contrato de geração somente quando o vínculo e o DNA forem válidos; caso contrário, usar a IA padrão sem atribuição enganosa. Evidência: `resolveAuthoritativeTrainerContext` rejeita perfil profissional submetido pelo cliente na ausência de DNA activo.
- [x] Aplicar `workout.sessions_per_week` e `workout.exercises_per_session` na mesma autoridade para ambos os pontos de entrada. Evidência: `generate-smart-workout` e `generate-workout` usam `resolveUserEntitlements`; `resolveAuthoritativeTaskGates` limita exercícios e `countSessionsThisWeek` aplica a quota semanal. O fast-path visual de `StartWorkoutScreen` aplica o mesmo filtro, sem substituir a autoridade server-side.
- [x] Distinguir plano prescrito de treino autónomo para que o primeiro não conte na quota autónoma FREE. Evidência: `countSessionsThisWeek` conta somente sessões ligadas a `workout_plans.source = ai_generated`; planos manuais prescritos ficam fora da quota.
- [x] Consumir a quota somente quando uma sessão autónoma é efectivamente iniciada; geração de plano, falha, Safety Gate, check-in ausente ou clique no CTA não consomem sessão. Evidência: `countSessionsThisWeek` conta `workout_sessions` iniciadas e ligadas apenas a `workout_plans.source = ai_generated`. Esta é a semântica coerente com o limite comercial de **sessões**, não de tentativas de geração.
- [x] Garantir Safety Gate e dados de dor como invariantes, independentemente da licença, origem ou disponibilidade de calibração diária. Evidência: `generate-smart-workout` interrompe a sessão com `safety_blocked` para `aiLedBlocked`/`safetyStatus=blocked`; testes confirmam que dor e Safety Gate continuam no prompt mesmo sem calibração diária. O fallback local aplica o mesmo bloqueio.
- [x] Proteger por testes de regressão o fluxo realtime existente: check-in do aluno → actualização no TRAINER → prescrição/envio de plano manual → aprovação/rejeição no aluno. Evidência: teste de `useRealtimeTable` protege a subscrição filtrada de check-ins, o refresh após evento, a troca segura do callback e o cleanup; não altera os canais de `TrainerDashboard`, `TrainerClientDetail` ou `StartWorkoutScreen`.
- [x] Definir respostas determinísticas: `generated`, `generated_without_current_checkin`, `limit_reached`, `safety_blocked`, `relationship_unavailable` e `generation_unavailable`. Evidência: contrato de saída de `generate-smart-workout` e teste unitário de sucesso com/sem check-in persistido; o `error` legado é preservado para compatibilidade de UI.

**Conclusão da fase:** nenhum caminho de UI decide Coach DNA, quota ou validade clínica por conta própria.

---

### Fase 2 — Persistência e rastreabilidade mínima

**Esforço:** médio · **Risco:** médio · **Migração:** sim

- [x] Criar migração reversível para persistir a proveniência de geração (`autonomous_direct` ou `trainer_timeout`) sem depender de texto livre em `ai_notes`. Evidência: migração `20260811220000_autonomous_workout_provenance.sql`; flag de DNA é derivada por trigger, não confiada ao browser.
- [x] Associar a sugestão/plano gerado ao identificador do check-in efectivamente usado, sem duplicar conteúdo sensível do check-in. Evidência: `ai_suggestions.checkin_id` deixa de receber `null` na geração autónoma.
- [x] Guardar referência/versionamento mínimo do Coach DNA quando aplicado; não copiar o perfil completo nem dados de saúde para eventos de telemetria. Evidência: `workout_plans.coach_dna_applied` é metadado booleano calculado no banco; o endpoint devolve apenas proveniência mínima ao dono do treino.
- [x] Definir estado de monitoramento posterior visível ao TRAINER, sem semântica de aprovação nem vigilância em tempo real. Evidência: histórico `Plano & Treino` apresenta “Disponível para revisão posterior” somente para treino autónomo, em PT/EN/ES/DE, sem criar aprovação ou notificação.
- [x] Criar índices e RLS necessários para leitura apenas pelo aluno, TRAINER vinculado e backend autorizado. Evidência: índices `workout_plans_assigned_autonomous_origin_created_idx` e `workout_plans_timeout_notification_id_idx`; auditoria do schema remoto em 2026-08-11 confirma RLS `assigned user reads own plan`, `trainer reads client plans` com `view_client_history` + vínculo `active`, e service role para backend. Não foi necessário ampliar policy a `ai_suggestions`, que permanece exclusiva do aluno.
- [x] Preparar rollback da migração e compatibilidade de leitura para planos já existentes. Evidência: `WORKOUT_AUTONOMOUS_PROVENANCE_ROLLBACK.md`; campos de proveniência são opcionais e o histórico trata `NULL` como legado.

**Conclusão da fase:** cada treino autónomo pode ser explicado com proveniência, sem ampliar exposição de dados sensíveis.

---

### Fase 3 — Inbox, CTA e experiência de continuidade

**Esforço:** médio · **Risco:** médio · **Migração:** não (salvo apoio ao estado do card)

- [x] Tornar a acção do card `workout_timeout` de uso único **após geração bem-sucedida**: o card passa a informar o resultado/encaminhar para o treino criado; em falha recuperável, permanece disponível com feedback apropriado. Evidência: RPC `consume_workout_timeout_notification`, migração `20260811213000` aplicada localmente.
- [x] Não bloquear o botão normal **Workout** depois de o card ser consumido; a autonomia continua sujeita somente aos limites da licença e segurança. Evidência: o consumo marca somente a notificação de timeout após plano persistido; a navegação normal para `workout` não recebe `source=trainer_timeout` nem lê esse estado como bloqueio.
- [x] Ajustar a cópia do timeout para “treino autónomo orientado pelo DNA Coach” quando aplicável, e “treino autónomo por IA” quando não houver DNA. Evidência: `StartWorkoutScreen` só apresenta a variante DNA após `coachDnaApplied` retornado pelo backend; as quatro locales têm ambas as variantes, sem alegar supervisão.
- [x] Quando não houver check-in actual, exibir aconselhamento não bloqueante para confirmar o check-in; nunca substituir o Workout por uma exigência de check-in. Evidência: card dispensável em `StartWorkoutScreen.tsx`, com continuação do treino preservada e traduções PT/EN/ES/DE.
- [x] Exibir limite FREE com CTA de upgrade já padronizado, sem apresentar a mensagem de timeout como segunda oferta concorrente. Evidência: no estado `weekly-limit`, o CTA comercial único é `limitWeeklyCta`; o card de calibração AI Fitness não é renderizado e o timeout permanece somente contextual.
- [x] Localizar o estado de card consumido em PT/EN/ES/DE; validação visual e de contraste permanece no smoke da Fase 5.
- [x] Garantir que a abertura de um card não marca implicitamente uma acção clínica ou uma sessão como concluída. Evidência: abrir `workout_timeout` somente navega para Workout; a notificação é consumida após plano autónomo persistido e não altera check-in, Safety Gate ou sessão.

**Conclusão da fase:** a Inbox é uma porta de contexto e continuidade, não um gerador repetitivo de treinos nem um bloqueio à autonomia legítima.

---

### Fase 4 — Visibilidade posterior para o TRAINER

**Esforço:** pequeno/médio · **Risco:** médio · **Migração:** depende da Fase 2

- [x] Apresentar no histórico/dashboard do TRAINER que o aluno iniciou treino autónomo, incluindo origem e data/hora no locale adequado. Evidência: histórico `Plano & Treino` mostra treino autónomo por IA ou orientado pelo DNA Coach; a data existente usa o locale da aplicação.
- [x] Mostrar, quando permitido, que o treino usou o Coach DNA e o check-in aplicável, sem expor voz, interpretação ou conteúdo além das permissões existentes. Evidência: migrações `20260812001000` e `20260812003000` mantêm em `workout_plans` apenas `checkin_applied`, validando que sugestão e check-in pertencem ao aluno; `TrainerClientDetailScreen.tsx` mostra o booleano somente ao lado da proveniência autónoma. A referência e o conteúdo sensível continuam em `ai_suggestions`, sem ampliar RLS; `20260812002000` revoga a execução directa das funções internas.
- [x] Separar visualmente: “prescrito”, “autónomo orientado pelo DNA Coach” e “autónomo por IA”. Evidência: somente planos com `autonomous_origin` exibem o novo rótulo; planos manuais preservam a apresentação estabilizada.
- [x] Não enviar notificação invasiva por cada abertura de card; notificar eventos relevantes segundo a política actual de Inbox. Evidência: abrir o card só navega ao Workout; a mensagem ao TRAINER é criada somente após geração de timeout bem-sucedida, que é um evento relevante já existente. A nova proveniência não cria notificação.
- [x] Confirmar que o desligamento de acompanhamento corta o acesso futuro ao DNA e dados do TRAINER, sem alterar o histórico legítimo já registado. Evidência: `end_my_trainer_link` muda `trainer_clients.status` para `ended`; `getActiveTrainerIdForClient` e a policy remota `trainer reads client plans` exigem `status = active`. Assim, geração futura não lê Coach DNA e o TRAINER perde leitura futura, enquanto os registros históricos não são apagados.

**Conclusão da fase:** o TRAINER consegue monitorar e avaliar depois, sem falsa expectativa de atendimento síncrono. O gate de IA/licenciamento/dado sensível foi aplicado: não há nova categoria de dado, endpoint, telemetria, claim público ou aprovação externa necessária; a Matriz de Autoridade foi actualizada para registar a minimização.

---

### Fase 5 — Testes de regressão, pre-release e fecho documental

**Esforço:** médio · **Risco:** alto por abrangência · **Migração:** aplicar e verificar

- [x] Testes unitários e de contrato para o resolvedor único: com/sem vínculo, com/sem DNA, check-in válido/expirado e todos os resultados determinísticos. Evidência: `api/generate-smart-workout.test.ts` cobre check-in persistido/ausente, Coach DNA válido/ausente e rejeição de identidade profissional fornecida pelo cliente; suíte completa passou em 2026-08-12.
- [x] Testes de autorização server-side: FREE no limite semanal, FREE fora do limite, AI FITNESS/PERFORMANCE, plano prescrito e tentativa de bypass do frontend. Evidência: `api/_lib/entitlements.test.ts` cobre cap FREE, ilimitado, e exclusão de planos prescritos da quota; `src/licensing/entitlements.test.ts` cobre patrocínio com vínculo e negação sem vínculo.
- [x] Testes de segurança: Safety Gate bloqueado, dor sinalizada, queda de IA e continuação segura de uma sessão já iniciada. Evidência: `api/generate-smart-workout.test.ts` protege a presença de dor e Safety Gate no prompt com/sem ajuste; `src/lib/workoutGeneration.test.ts` preserva recusas autoritativas e idempotência.
- [x] Testes de Inbox: timeout uma vez, consumo da acção, retorno ao treino criado, reabertura do card e acesso normal pelo módulo Workout. Evidência: suíte de Inbox e de `workoutGeneration` passou; o card continua contextual e a quota é validada no backend, sem fallback local em recusa comercial.
- [x] Regressão realtime: o TRAINER recebe o check-in do aluno em tempo real e continua podendo enviar plano manual a partir dele, sem interferência do caminho autónomo/timeout. Evidência: `src/hooks/useRealtimeTable.test.tsx` passou; smoke no pre-release com Beatriz/Carlos confirmou o perfil TRAINER com Prontidão, Check-ins Recentes e decisões existentes, respeitando os grants já configurados.
- [ ] Smoke visual local nas quatro locales e nas assinaturas FREE/AI FITNESS/AI PERFORMANCE relevantes.
- [ ] Smoke no pre-release com contas de teste: aluno sem TRAINER, aluno FREE vinculado, aluno pago vinculado e TRAINER com/sem Coach DNA.
- [x] Executar `npx tsc --noEmit`, `npm test`, `npm run build`, validação SQL/RLS e `git diff --check`. Evidência: 2026-08-12 — TypeScript, build e 46 ficheiros / 475 testes passaram; local/remoto estão sincronizados até `20260812003000`; dump remoto confirma trigger, funções não expostas ao cliente e RLS `trainer reads client plans` condicionado a vínculo activo.
- [x] Actualizar este checklist, os documentos controlados e a matriz com links para commits, migração, testes e deploy. Evidência: `aeda1a2`, `AI_ENDPOINT_AUTHORITY_MATRIX.md`, migrações `20260812001000`–`20260812003000` e deploy `trainer-lgyxv0auh-paulo-eduardo-peress-projects.vercel.app` (Ready, alias pre-release activo).
- [x] Registar decisão de release: **observe-only no pre-release**. Não há aprovação externa pendente; o fecho da Fase 5 depende somente dos dois smokes de matriz ainda assinalados abaixo.

**Conclusão da fase:** parcial e observável. As validações automatizadas, RLS, migrações e o smoke de aluno pago vinculado/TRAINER com Coach DNA estão concluídos. Permanecem os smokes visuais deliberados para as quatro locales/skins e para os perfis sem TRAINER, FREE vinculado e TRAINER sem Coach DNA; não marcar a fase como encerrada antes dessa cobertura.

---

## 5. Critérios de aceitação globais

1. Um plano prescrito usa a metodologia/Coach DNA do TRAINER, é executado integralmente e não consome quota autónoma do aluno.
2. Um aluno vinculado pode iniciar treino autónomo pelo Workout; o sistema usa Coach DNA válido e o último check-in persistido quando existir, sem exigir check-in parcial ou completo.
3. O mesmo aluno, após timeout, recebe o mesmo contrato de geração — não a IA padrão por uma diferença de origem.
4. Reabrir a mensagem de timeout não cria uma autorização paralela nem repete a mesma acção; iniciar novo treino pelo módulo Workout continua possível conforme entitlement.
5. Um aluno FREE vinculado pode capturar check-in manual detalhado, mas não ganha voz, interpretação, ajuste por IA ou quota adicional por patrocínio.
6. Geração autónoma, inclusive via timeout, consome a quota aplicável apenas quando o servidor gera o plano com sucesso.
7. Sem TRAINER ou DNA válido, a geração usa AI Coach + preferências do aluno, sem afirmar influência profissional inexistente.
8. O TRAINER vê o treino para avaliação posterior, sem o sistema dizer que a sessão foi supervisionada ou aprovada.
9. O backend é a autoridade de vínculo, Coach DNA, safety e limites; o check-in é um input opcional de contexto e a UI apenas recomenda sua confirmação quando necessário.
10. Nenhum plano ou sessão em curso é interrompido por mudanças nesta lógica.
11. O fluxo realtime de check-in e prescrição remota do TRAINER mantém exactamente a autoridade e a experiência já validadas.

---

## 6. Revisão de consistência e fluxo lógico

Revisão concluída em 2026-08-11.

| Verificação | Resultado |
|---|---|
| Autonomia vs. timeout | Coerente: o timeout deixa de ser permissão especial e passa a usar o contrato autónomo comum. |
| Consumo do card vs. limite de treino | Coerente: o card é consumido apenas após geração bem-sucedida; isso não consome nem bloqueia o direito de iniciar treino no módulo Workout. |
| Coach DNA vs. promessa comercial | Coerente: o DNA orienta a geração apenas quando existe; a UI não atribui a metodologia ao TRAINER se não houver DNA válido. |
| Plano prescrito vs. treino autónomo | Coerente: ambos podem usar Coach DNA, mas apenas o prescrito é um plano profissional integral; o autónomo é monitorado depois e segue a quota do aluno. |
| Check-in patrocinado vs. IA patrocinada | Coerente: captura manual detalhada é acesso operacional; inferências continuam governadas pela licença do aluno. |
| Monitoramento vs. acompanhamento | Coerente: o histórico permite avaliação posterior, sem alegação de presença, aprovação ou atendimento síncrono. |
| Dados de saúde e timezone | Coerente: somente referências mínimas são persistidas; o check-in melhora a qualidade da recomendação, mas sua ausência não impede o treino autónomo. |
| Fonte de verdade | Coerente: Fase 1 centraliza decisão no servidor; fases de UI não recriam regras. |

**Regra deliberada:** a confirmação de check-in é uma recomendação contextual, não uma barreira. Não se deve inferir que preferências em Configurações substituem as condições actuais; quando o aluno não confirmar check-in, o treino é gerado com o estado disponível, sem alegar calibração do dia.

---

## 7. Regra de actualização deste plano

Ao término de cada fase, actualizar nesta mesma revisão:

1. estado da fase e itens `[x]` efectivamente concluídos;
2. evidência verificável (commit, migração, teste, query, captura ou deploy);
3. documentos controlados revistos e respectivas versões;
4. pendências reais, sem marcar aceitação por presunção.

Não haverá fase marcada como concluída apenas por alteração de UI ou por teste parcial do frontend.

## 8. Registo de execução

| Data | Fase | Evidência | Estado |
|---|---|---|---|
| 2026-08-11 | 0–1 | Matriz de acesso, política patrocinada e matriz de autoridade reconciliadas; telemetria/bounds/degradação revistos sem impacto material; check-in definido como opcional e resolvido canonicamente pelo backend quando existir | Parcial — faltam rastreabilidade estruturada e testes de contrato ponta a ponta. |
| 2026-08-11 | 1–3 | Coach DNA e check-in persistido resolvidos novamente no servidor para impedir supressão/alteração no request; `ai_suggestions.checkin_id` persistido; card de timeout consumido por RPC após plano persistido; card de aconselhamento opcional de check-in em PT/EN/ES/DE | Parcial — rastreabilidade estruturada e testes de contrato ponta a ponta seguem pendentes. |
| 2026-08-12 | 4–5 | Proveniência minimizada de check-in aplicada e auditada; pre-release com Beatriz (aluna AI PERFORMANCE vinculada) e Carlos (TRAINER PRO com Coach DNA) confirmou que o fluxo realtime e os grants continuam no mesmo caminho estabilizado. TypeScript, build, 475 testes, migrações e RLS passaram. | Observe-only — concluir os smokes de matriz pendentes antes de fechar a fase. |
