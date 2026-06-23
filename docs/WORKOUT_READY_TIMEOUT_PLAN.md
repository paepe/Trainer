# Plano de Implementação — Fallback Automático de Treino por Timeout

**Versão:** 2.0  
**Data inicial:** 2026-06-23 · **Última actualização:** 2026-06-23  
**Estado:** ✅ Fases A–E concluídas  
**Referência:** `docs/FEATURE_GATING_IMPLEMENTATION_PLAN.md`

---

## 1. Diagnóstico do Estado Inicial

| Componente | Estado inicial |
|---|---|
| `workoutReadyExpiryMin` | Configurável: 15 / 30 / 60 / 120 min (default: 30) |
| `expires_at` na `notification_log` | Calculado e gravado correctamente |
| `isExpired()` em `InboxScreen` | Detectava expiração para badge UI apenas |
| Fallback automático ao cliente | **Não existia** |
| Botão de notificação | Sem feedback após clique; permitia pedidos duplicados |

---

## 2. Decisões de Produto (confirmadas 2026-06-23)

| # | Decisão | Escolha |
|---|---|---|
| D1 | Trigger do fallback | Aluno abre inbox e vê o botão — não é push automático |
| D2 | Treinador notificado? | Sim — card amber "Treinou autonomamente" |
| D3 | Plano do fallback | `DEFAULT_AI_TRAINER` (Coach DNA não aprovado = não usado) |
| D4 | Fallback se treinador rejeitou? | Não — rejeição clínica é definitiva |
| D5 | Auditoria | `trainer_timeout: true` gravado em `ai_notes` de `workout_plans` |

**Decisões adicionais tomadas durante implementação:**

- Fluxo de fallback redesenhado: `workout_timeout` vai para inbox do cliente (não botão directo no `workout_ready` do trainer)
- Botão de notificação no `CheckInResult` passa a ter estado inteligente — bloqueia duplicados, mostra countdown, restaura automaticamente
- Texto do botão de fallback: **"Continuar com plano personalizado pela IA"** (aprovado pelo produto)
- `nav('checkin')` removido do `onAlert` — aluno permanece no resultado e acompanha o countdown

---

## 3. Fluxo Implementado

```
1. Aluno faz check-in → resultado → clica "✦ Notificar treinador — estou pronto"
   → notificação workout_ready enviada ao treinador (expires_at = now + workoutReadyExpiryMin)
   → CheckInResult permanece visível com mensagem + countdown

2. CheckInResult mostra:
   → "Treinador já notificado, aguarde."
   → "Resposta esperada em X min" (countdown ao minuto)
   → Se aluno sair e reabrir check-in: DB consultado; se pedido activo → countdown residual; se expirado → botão restaurado

3a. Treinador responde dentro do prazo:
   → workout_approved ou workout_rejected chega na inbox do aluno
   → Fluxo normal (botão "Iniciar Treino" ou mensagem de rejeição)

3b. Treinador não responde (timeout):
   → Countdown chega a zero → botão restaurado automaticamente no CheckInResult
   → Quando treinador abre a sua inbox: sistema envia workout_timeout ao aluno (deduplicado)
   → Aluno abre inbox → card amber com botão "Continuar com plano personalizado pela IA"
   → nav('workout', {source: 'trainer_timeout'})

4. StartWorkoutScreen com source='trainer_timeout':
   → Banner amber informativo no topo
   → DEFAULT_AI_TRAINER (Coach DNA ignorado)
   → ai_notes inclui 'trainer_timeout: true'
   → Plano gerado normalmente (Safety Gate, feature gating, tudo activo)

5. Treinador recebe card amber "Treinou autonomamente" na sua inbox
```

---

## 4. Checklists por Fase

### Fase A — Countdown na inbox do aluno (InboxScreen)

- [x] `CountdownBanner` component — mostra minutos restantes, actualiza a cada 30s
- [x] Quando expirado: texto "O treinador não respondeu no prazo"
- [x] i18n: `inbox.workout_ready.countdown` e `expired_no_response` — 4/4 locales
- [x] `tsc --noEmit` limpo
- [x] Commit: `feat(inbox): workout_ready timeout fallback — 4 phases implemented` ✅ f2eed13

---

### Fase B — Botão de fallback para o cliente

**Nota:** Redesenhado durante implementação. O botão NÃO aparece directamente no item `workout_ready` (que vai para o trainer). Em vez disso, o trainer ao abrir a inbox com item expirado dispara `workout_timeout` ao cliente. O cliente vê o botão no seu próprio card `workout_timeout`.

- [x] Auto-envio de `workout_timeout` ao cliente quando trainer abre inbox com item expirado
- [x] Deduplicação: verifica se já foi enviado antes de criar novo
- [x] Card `workout_timeout` na inbox do cliente com botão amber
- [x] Botão NÃO aparece se `response === 'rejected'`
- [x] i18n: `inbox.actions.startWorkoutTimeout` → "Continuar com plano personalizado pela IA" — 4/4 locales
- [x] i18n: `inbox.actions.startWorkoutTimeoutNote` — 4/4 locales
- [x] `tsc --noEmit` limpo
- [x] Commits: `f2eed13` + `765b184` (correcção do fluxo após teste de caso de uso)

---

### Fase C — StartWorkoutScreen reconhece `trainer_timeout`

- [x] Props `source` e `source?: string | undefined` adicionados à interface
- [x] `App.tsx` passa `source={screenPayload?.source}` ao `StartWorkoutScreen`
- [x] `source === 'trainer_timeout'` → `coachDNA = null` → `DEFAULT_AI_TRAINER`
- [x] `ai_notes` inclui `'trainer_timeout: true'` para auditoria
- [x] Banner amber no topo: "O seu treinador não respondeu — plano gerado pela IA com o seu perfil."
- [x] i18n: `client.workout.trainerTimeoutBanner` — 4/4 locales
- [x] `tsc --noEmit` limpo
- [x] Commit: `feat(inbox): workout_ready timeout fallback — 4 phases implemented` ✅ f2eed13

---

### Fase D — Notificação ao treinador

- [x] `notifyLinkedTrainer` disparado em `persistGeneratedPlan` quando `source === 'trainer_timeout'`
- [x] Card amber `trainer_timeout_workout` na inbox do treinador com nota explicativa
- [x] Badge "Treinou autonomamente" (amber) no `StatusBadge`
- [x] i18n: `inbox.trainer_timeout_workout.{title,body,note}` — 4/4 locales
- [x] i18n: `inbox.badges.trainedAutonomously` e `trainerTimeout` — 4/4 locales
- [x] `tsc --noEmit` limpo
- [x] Commit: `feat(inbox): workout_ready timeout fallback — 4 phases implemented` ✅ f2eed13

---

### Fase E — CheckInResult inteligente + limpeza

**Nota:** Fase redesenhada. Em vez de expor Settings, o trabalho principal foi tornar o botão de notificação inteligente — bloqueando duplicados, mostrando countdown e restaurando automaticamente.

- [x] `CheckInResult` consulta DB ao montar — verifica `workout_ready` activo sem resposta
- [x] Estado `requestState`: `idle | pending | expired` (hardcoded, sem tabela DB)
- [x] `pending` → mensagem + countdown ao minuto via `setInterval`
- [x] `expired` → botão restaurado automaticamente (novo pedido disponível)
- [x] `nav('checkin')` removido do `onAlert` — aluno permanece no resultado
- [x] Props `userId` e `workoutReadyExpiryMin` passados do `CheckInProntidaoScreen`
- [x] i18n: `checkin.result.trainerNotified` e `trainerNotifiedCountdown` — 4/4 locales
- [x] Código morto removido: `notified`/`setNotified` (3 ocorrências)
- [x] i18n órfã removida: `inbox.requestExpires` dos 4 locales
- [x] `tsc --noEmit` limpo · testes sem regressões
- [x] Commits: `b4f494e` + `c2b6f40` + `b6b9c29`

---

## 5. Resumo Executivo

| Fase | Área | Esforço | Estado |
|---|---|---|---|
| A | Countdown visual na inbox (InboxScreen) | ~2h | ✅ 2026-06-23 |
| B | Botão fallback via workout_timeout ao cliente | ~3h | ✅ 2026-06-23 |
| C | StartWorkoutScreen — source `trainer_timeout` | ~2h | ✅ 2026-06-23 |
| D | Notificação ao treinador (card amber) | ~1h | ✅ 2026-06-23 |
| E | CheckInResult inteligente + limpeza de código | ~3h | ✅ 2026-06-23 |
| **Total** | | **~11h** | ✅ **Completo** |

---

## 6. Consistência com Princípios

1. ✅ **Autonomia com transparência** — aluno treina quando quer; treinador sempre informado
2. ✅ **Sem pressão automática** — botão na inbox, aluno decide; countdown no resultado, não intrusivo
3. ✅ **Rejeição é definitiva** — fallback bloqueado se `response === 'rejected'`
4. ✅ **Auditabilidade** — `trainer_timeout: true` em `ai_notes` de `workout_plans`
5. ✅ **Zero degradação de segurança** — Safety Gate, feature gating, tudo activo
6. ✅ **Hardcoded** — fluxo como invariante de produto; `workoutReadyExpiryMin` é o único parâmetro configurável
7. ✅ **Sem duplicados** — DB verifica pedido activo antes de permitir novo; deduplicação no envio de `workout_timeout`
8. ✅ **Treinos aprovados por mensageria** — `CheckInResult` não decide treinos; inbox é o canal de resposta
