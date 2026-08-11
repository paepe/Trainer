# Plano de Implementação — Workout Autónomo Vinculado ao TRAINER e Continuidade de Check-in

**Versão:** 1.0  
**Data inicial:** 2026-08-11  
**Estado:** Planeado — decisões de produto registadas; implementação ainda não iniciada  
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

---

## 2. Decisões de produto já confirmadas

| Decisão | Regra confirmada |
|---|---|
| Autonomia do aluno | Um aluno com TRAINER activo pode iniciar treino autónomo directamente no **Workout**; não precisa de aprovação prévia. |
| Papel do Coach DNA | O treino autónomo do aluno vinculado é orientado pelo DNA do TRAINER quando há DNA activo; não deve ser apresentado como plano supervisionado. |
| Check-in | A geração usa o check-in persistido aplicável. O vínculo patrocina ao aluno FREE a captura manual detalhada, mas não voz, interpretação nem ajuste de IA. |
| Fallback por timeout | É uma entrada alternativa para o mesmo treino autónomo, não uma autorização especial, nem crédito adicional de sessões. |
| Monitoramento | O TRAINER pode avaliar posteriormente histórico, sessão, check-ins e progresso; não existe acompanhamento em tempo real nem aprovação tácita. |
| Limites comerciais | FREE mantém 1 sessão autónoma/semana e até 6 exercícios; AI FITNESS e AI PERFORMANCE mantêm uso comercialmente ilimitado, sujeito a Uso Justo. Planos prescritos não consomem a quota autónoma. |
| Ausência de DNA | Se o TRAINER não tiver Coach DNA activo, o sistema usa o perfil/prefs do aluno e a IA padrão, sem alegar que o plano foi orientado pelo treinador. |

### Vocabulário obrigatório na UI

- **Plano prescrito pelo TRAINER:** preparado ou ajustado pelo profissional.
- **Treino autónomo orientado pelo DNA Coach:** iniciado pelo aluno, com metodologia do TRAINER quando disponível, para monitoramento posterior.
- **Treino autónomo por IA:** iniciado pelo aluno sem DNA Coach aplicável.

Não usar “sessão acompanhada”, “aprovada” ou equivalente nos dois últimos casos.

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

- [ ] Aplicar o `AI_GOVERNANCE_CHANGE_GATE.md` e classificar o impacto: endpoint/prompt, entitlement, patrocínio TRAINER, telemetria minimizada e dados de check-in.
- [ ] Atualizar `FEATURE_ACCESS_MATRIX.md`: FREE vinculado tem check-in manual detalhado patrocinado; manter a exclusão de voz, interpretação e ajuste por IA.
- [ ] Atualizar `AI_TRAINER_SPONSORED_CONSUMPTION_POLICY_DRAFT.md`: treino autónomo orientado por Coach DNA continua consumindo o entitlement do aluno; o vínculo não cria franquia adicional.
- [ ] Rever `AI_ENDPOINT_AUTHORITY_MATRIX.md`, `AI_TELEMETRY_DATA_CONTRACT.md`, `AI_ENDPOINT_OPERATIONAL_BOUNDS.md` e `AI_ENDPOINT_DEGRADATION_POLICY.md`; actualizar apenas os realmente afectados, com evidência de “sem impacto” nos restantes.
- [ ] Definir a validade do check-in para geração autónoma: recomendar check-in do dia local do aluno; quando expirado/ausente, encaminhar para novo check-in em vez de usar sinais antigos silenciosamente.
- [ ] Definir a apresentação de datas/horas com instante UTC autoritativo e formatação no locale do aluno.
- [ ] Registar a decisão de aprovação Product/Privacy exigida se a redação pública ou a exposição de dados for alterada.

**Conclusão da fase:** contrato técnico, comercial e documental sem contradições.

---

### Fase 1 — Contrato server-side único de geração autónoma vinculada

**Esforço:** médio · **Risco:** alto (fluxo runtime de treino) · **Migração:** provavelmente sim

- [ ] Criar um resolvedor server-side único para `autonomous_direct` e `trainer_timeout`.
- [ ] Resolver no servidor: aluno, vínculo TRAINER activo, estado do convite/relacionamento, entitlement efectivo, Coach DNA aplicável e check-in válido.
- [ ] Remover a regra cliente que força `coachDNA = null` em `source === 'trainer_timeout'`.
- [ ] Incluir Coach DNA no contrato de geração somente quando o vínculo e o DNA forem válidos; caso contrário, usar a IA padrão sem atribuição enganosa.
- [ ] Aplicar `workout.sessions_per_week` e `workout.exercises_per_session` na mesma autoridade para ambos os pontos de entrada.
- [ ] Distinguir plano prescrito de treino autónomo para que o primeiro não conte na quota autónoma FREE.
- [ ] Garantir Safety Gate e dados de dor como invariantes, independentemente da licença, origem ou disponibilidade de calibração diária.
- [ ] Definir respostas determinísticas: `generated`, `limit_reached`, `checkin_required`, `safety_blocked`, `relationship_unavailable` e `generation_unavailable`.

**Conclusão da fase:** nenhum caminho de UI decide Coach DNA, quota ou validade clínica por conta própria.

---

### Fase 2 — Persistência e rastreabilidade mínima

**Esforço:** médio · **Risco:** médio · **Migração:** sim

- [ ] Criar migração reversível para persistir a proveniência de geração (`autonomous_direct` ou `trainer_timeout`) sem depender de texto livre em `ai_notes`.
- [ ] Associar o plano gerado ao identificador do check-in efectivamente usado, sem duplicar conteúdo sensível do check-in.
- [ ] Guardar referência/versionamento mínimo do Coach DNA quando aplicado; não copiar o perfil completo nem dados de saúde para eventos de telemetria.
- [ ] Definir estado de monitoramento posterior visível ao TRAINER, sem semântica de aprovação nem vigilância em tempo real.
- [ ] Criar índices e RLS necessários para leitura apenas pelo aluno, TRAINER vinculado e backend autorizado.
- [ ] Preparar rollback da migração e compatibilidade de leitura para planos já existentes.

**Conclusão da fase:** cada treino autónomo pode ser explicado com proveniência, sem ampliar exposição de dados sensíveis.

---

### Fase 3 — Inbox, CTA e experiência de continuidade

**Esforço:** médio · **Risco:** médio · **Migração:** não (salvo apoio ao estado do card)

- [ ] Tornar a acção do card `workout_timeout` de uso único: após iniciar a geração, o card passa a informar o resultado/encaminhar para o treino criado.
- [ ] Não bloquear o botão normal **Workout** depois de o card ser consumido; a autonomia continua sujeita somente aos limites da licença e segurança.
- [ ] Ajustar a cópia do timeout para “treino autónomo orientado pelo DNA Coach” quando aplicável, e “treino autónomo por IA” quando não houver DNA.
- [ ] Exibir `checkin_required` como CTA claro para realizar novo check-in, sem tentativa de geração.
- [ ] Exibir limite FREE com CTA de upgrade já padronizado, sem apresentar a mensagem de timeout como segunda oferta concorrente.
- [ ] Localizar todos os estados em PT/EN/ES/DE e validar contraste, hierarquia e continuidade da sessão.
- [ ] Garantir que a abertura de um card não marca implicitamente uma acção clínica ou uma sessão como concluída.

**Conclusão da fase:** a Inbox é uma porta de contexto e continuidade, não um gerador repetitivo de treinos nem um bloqueio à autonomia legítima.

---

### Fase 4 — Visibilidade posterior para o TRAINER

**Esforço:** pequeno/médio · **Risco:** médio · **Migração:** depende da Fase 2

- [ ] Apresentar no histórico/dashboard do TRAINER que o aluno iniciou treino autónomo, incluindo origem e data/hora no locale adequado.
- [ ] Mostrar, quando permitido, que o treino usou o Coach DNA e o check-in aplicável, sem expor voz, interpretação ou conteúdo além das permissões existentes.
- [ ] Separar visualmente: “prescrito”, “autónomo orientado pelo DNA Coach” e “autónomo por IA”.
- [ ] Não enviar notificação invasiva por cada abertura de card; notificar eventos relevantes segundo a política actual de Inbox.
- [ ] Confirmar que o desligamento de acompanhamento corta o acesso futuro ao DNA e dados do TRAINER, sem alterar o histórico legítimo já registado.

**Conclusão da fase:** o TRAINER consegue monitorar e avaliar depois, sem falsa expectativa de atendimento síncrono.

---

### Fase 5 — Testes de regressão, pre-release e fecho documental

**Esforço:** médio · **Risco:** alto por abrangência · **Migração:** aplicar e verificar

- [ ] Testes unitários e de contrato para o resolvedor único: com/sem vínculo, com/sem DNA, check-in válido/expirado e todos os resultados determinísticos.
- [ ] Testes de autorização server-side: FREE no limite semanal, FREE fora do limite, AI FITNESS/PERFORMANCE, plano prescrito e tentativa de bypass do frontend.
- [ ] Testes de segurança: Safety Gate bloqueado, dor sinalizada, queda de IA e continuação segura de uma sessão já iniciada.
- [ ] Testes de Inbox: timeout uma vez, consumo da acção, retorno ao treino criado, reabertura do card e acesso normal pelo módulo Workout.
- [ ] Smoke visual local nas quatro locales e nas assinaturas FREE/AI FITNESS/AI PERFORMANCE relevantes.
- [ ] Smoke no pre-release com contas de teste: aluno sem TRAINER, aluno FREE vinculado, aluno pago vinculado e TRAINER com/sem Coach DNA.
- [ ] Executar `npx tsc --noEmit`, `npm test`, `npm run build`, validação SQL/RLS e `git diff --check`.
- [ ] Actualizar este checklist, os documentos controlados e a matriz com links para commits, migração, testes e deploy.
- [ ] Registar decisão de release: pronto, observe-only ou bloqueado por aprovação externa.

**Conclusão da fase:** comportamento validado ponta a ponta e documentação reflecte exactamente o estado efectivo.

---

## 5. Critérios de aceitação globais

1. Um aluno vinculado pode iniciar treino autónomo pelo Workout; o sistema usa Coach DNA válido e o check-in válido quando ambos existem.
2. O mesmo aluno, após timeout, recebe o mesmo contrato de geração — não a IA padrão por uma diferença de origem.
3. Reabrir a mensagem de timeout não cria uma autorização paralela nem repete a mesma acção; iniciar novo treino pelo módulo Workout continua possível conforme entitlement.
4. Um aluno FREE vinculado pode capturar check-in manual detalhado, mas não ganha voz, interpretação, ajuste por IA ou quota adicional por patrocínio.
5. Treino prescrito não consome sessão autónoma FREE; geração autónoma, inclusive via timeout, consome a quota aplicável.
6. O TRAINER vê o treino para avaliação posterior, sem o sistema dizer que a sessão foi supervisionada ou aprovada.
7. O backend é a autoridade de vínculo, Coach DNA, validade do check-in, safety e limites; a UI apenas apresenta a decisão.
8. Nenhum plano ou sessão em curso é interrompido por mudanças nesta lógica.

---

## 6. Revisão de consistência e fluxo lógico

Revisão concluída em 2026-08-11.

| Verificação | Resultado |
|---|---|
| Autonomia vs. timeout | Coerente: o timeout deixa de ser permissão especial e passa a usar o contrato autónomo comum. |
| Consumo do card vs. limite de treino | Coerente: consumir a acção da mensagem não consome nem bloqueia o direito de iniciar treino no módulo Workout. |
| Coach DNA vs. promessa comercial | Coerente: o DNA orienta a geração apenas quando existe; a UI não atribui a metodologia ao TRAINER se não houver DNA válido. |
| Check-in patrocinado vs. IA patrocinada | Coerente: captura manual detalhada é acesso operacional; inferências continuam governadas pela licença do aluno. |
| Monitoramento vs. acompanhamento | Coerente: o histórico permite avaliação posterior, sem alegação de presença, aprovação ou atendimento síncrono. |
| Dados de saúde e timezone | Coerente: somente referências mínimas são persistidas; validade usa instante do servidor e é exibida no locale do aluno. |
| Fonte de verdade | Coerente: Fase 1 centraliza decisão no servidor; fases de UI não recriam regras. |

**Risco residual deliberado:** a janela exacta de validade do check-in precisa de decisão de Product/Privacy na Fase 0. A recomendação é exigir check-in do dia local do aluno para uma nova geração autónoma, mantendo a segurança sem tornar o fluxo burocrático.

---

## 7. Regra de actualização deste plano

Ao término de cada fase, actualizar nesta mesma revisão:

1. estado da fase e itens `[x]` efectivamente concluídos;
2. evidência verificável (commit, migração, teste, query, captura ou deploy);
3. documentos controlados revistos e respectivas versões;
4. pendências reais, sem marcar aceitação por presunção.

Não haverá fase marcada como concluída apenas por alteração de UI ou por teste parcial do frontend.
