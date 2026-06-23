# Plano de Implementação — Fallback Automático de Treino por Timeout

**Versão:** 1.0  
**Data:** 2026-06-23  
**Estado:** Aguarda aprovação para implementação  
**Referência:** `docs/FEATURE_GATING_IMPLEMENTATION_PLAN.md`

---

## 1. Diagnóstico do Estado Actual

### O que existe hoje

| Componente | Estado |
|---|---|
| `workoutReadyExpiryMin` | Configurável por treinador: 15 / 30 / 60 / 120 min (default: 30) |
| `expires_at` na `notification_log` | Calculado e gravado correctamente |
| `isExpired()` em `InboxScreen` | Detecta expiração para fins de UI (badge "Expired") |
| Fallback automático ao cliente | **Não existe** |

### O que falta

Quando `workout_ready` expira sem resposta do treinador:
- O aluno fica bloqueado — não há botão, não há plano, não há feedback
- O treinador vê "Expired" na inbox mas não é notificado que o aluno ficou sem treino
- A IA está plenamente preparada para gerar um plano autónomo (já o faz para clientes sem treinador)

---

## 2. Avaliação de Impacto

### 2.1 — Quantos minutos deve o aluno esperar?

**Recomendação: respeitar o `workoutReadyExpiryMin` configurado pelo treinador.**

Racional:
- O treinador já definiu este valor como a sua janela de resposta contratual com o aluno
- Alterar este valor unilateralmente quebraria a expectativa estabelecida
- O default de 30 minutos é razoável para a maioria dos contextos desportivos
- O aluno que não quer esperar pode sempre usar o workout autónomo (sem notificar o treinador)

**Não introduzir um segundo temporizador.** Um único valor, já configurável, é suficiente.

---

### 2.2 — A IA está "municiada" para atender automaticamente?

**Sim — com nuance.**

O `StartWorkoutScreen` já resolve o contexto completo:

| Componente | Com treinador presente | Com fallback (treinador ausente) |
|---|---|---|
| `ClientContext` | Perfil completo, comorbidades, medicamentos | **Idêntico** |
| `TodayContext` | Check-in do dia (voice/quick/detailed) | **Idêntico** |
| `TrainerContext` | Coach DNA do treinador | `DEFAULT_AI_TRAINER` (fallback genérico) |
| `StatsContext` | Histórico M5, adherência | **Idêntico** |
| `LibraryContext` | Equipamento do cliente | **Idêntico** |
| `TaskContext` | Gates de plano aplicados | **Idêntico** |

**O que muda no fallback:** `TrainerContext` usa `DEFAULT_AI_TRAINER` em vez do Coach DNA do treinador vinculado. O plano gerado é válido, seguro e personalizado — apenas sem a metodologia específica do treinador.

**Risco:** o aluno pode receber um plano ligeiramente diferente do que receberia com aprovação. Isto é aceitável — é o mesmo que acontece com qualquer cliente sem treinador.

---

### 2.3 — Que controlos de treino são aplicados?

Todos os controlos normais continuam activos:

- **Safety Gate** — o check-in do dia já foi processado; se havia sinal de alerta, o treino foi bloqueado antes da notificação ao treinador
- **Feature gating** — `workout.sessions_per_week`, `workout.exercises_per_session`, `workout.exercise_type` — aplicados via `useEffectivePlanKey` como sempre
- **Plano do treinador** — se existe um plano `sent` (enviado previamente), é activado. Se não existe, a IA gera um plano autónomo
- **Registro** — o treino é gravado em `workout_sessions` como sempre; o treinador pode ver no histórico

**Nenhum controlo é desactivado.** O fallback não é uma via de escape — é a via normal de clientes sem treinador, aplicada temporariamente.

---

### 2.4 — O que acontece na interface do aluno?

**Fluxo proposto:**

```
1. Aluno faz check-in → resultado → clica "Notificar treinador — estou pronto"
2. Notificação enviada ao treinador com expires_at = now + workoutReadyExpiryMin
3. Aluno é devolvido ao Check-in hub (comportamento actual)
4. [NOVO] Aluno abre Inbox → vê notificação "pending"
   → countdown visível: "O seu treinador tem X min para responder"
5. Se treinador responde → fluxo normal (aprovado/rejeitado)
6. [NOVO] Se expires_at < now e response = null:
   → Botão "Iniciar treino — o treinador não respondeu" aparece na inbox
   → Ao clicar → nav('workout') com flag `source: 'trainer_timeout'`
   → StartWorkoutScreen gera plano autónomo (DEFAULT_AI_TRAINER)
   → Plano gravado com metadata `trainer_timeout: true`
7. [NOVO] Treinador recebe notificação discreta: "X não esperou — treinou de forma autónoma"
```

**O botão de workout NÃO é libertado automaticamente** sem acção do aluno — o aluno tem de abrir a inbox e clicar. Isto é intencional: respeita a autonomia do aluno sem forçar uma acção que ele pode não querer naquele momento.

---

### 2.5 — Como sobe para a lista de treinos?

O plano gerado pela IA no fallback segue exactamente o mesmo caminho de qualquer plano IA:

1. `requestSmartWorkout()` gera os exercícios
2. Gravados em `workout_plans` (`source: 'ai'`) + `plan_exercises`
3. Gravado em `ai_suggestions`
4. Ao completar → `workout_sessions` actualizado
5. Visível no histórico do aluno e do treinador

O treinador vê no histórico que o aluno treinou, com que exercícios, e que o motivo foi `trainer_timeout`. Transparência total.

---

## 3. Decisões de Produto a Confirmar

Antes de implementar, as seguintes decisões precisam de aprovação:

| # | Decisão | Opção Recomendada | Alternativa |
|---|---|---|---|
| D1 | Botão de fallback aparece automaticamente ou o aluno tem de "puxar" a inbox? | **Aluno abre inbox e vê o botão** (não é push automático) | Notificação push ao aluno quando expira |
| D2 | O treinador é notificado quando o aluno usa o fallback? | **Sim — notificação discreta** | Apenas visível no histórico |
| D3 | O plano do fallback usa Coach DNA do treinador ou DEFAULT_AI_TRAINER? | **DEFAULT_AI_TRAINER** (treinador não aprovou) | Coach DNA do treinador (mais personalizado mas usa metodologia sem aprovação) |
| D4 | O aluno pode usar o fallback mesmo se o treinador rejeitou? | **Não** — rejeição é uma decisão clínica a respeitar | Sim, com aviso |
| D5 | Metadata `trainer_timeout` gravada para auditoria? | **Sim** | Não |

---

## 4. Plano Faseado

### Fase A — Feedback visual do countdown (UI only)

**Esforço:** ~2h  
**Risco:** Baixo  
**Dependências:** Nenhuma

**Objectivo:** O aluno sabe quanto tempo falta para o treinador responder.

### Checklist

- [ ] Em `InboxScreen`, para item `workout_ready` pendente com `expires_at`:
  - [ ] Mostrar countdown: "O seu treinador tem {{min}} min para responder"
  - [ ] Countdown actualiza em tempo real via `setInterval` (1 min)
  - [ ] Quando expirado: texto muda para "O treinador não respondeu no prazo"
- [ ] Adicionar i18n keys (en/pt/es/de):
  - [ ] `inbox.workout_ready.countdown` — "O seu treinador tem {{min}} min para responder"
  - [ ] `inbox.workout_ready.expired_no_response` — "O treinador não respondeu no prazo"
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(inbox): show countdown on pending workout_ready notification`

---

### Fase B — Botão de fallback após timeout

**Esforço:** ~3h  
**Risco:** Médio  
**Dependências:** Fase A

**Objectivo:** Quando a notificação expira sem resposta, o aluno pode iniciar treino autónomo pela inbox.

### Checklist

- [ ] Em `InboxScreen`, adicionar condição para item `workout_ready` expirado sem resposta:
  ```
  !isTrainer && isExpired(item) && item.type === 'workout_ready' && !item.response
  ```
  - [ ] Renderizar botão: "Iniciar treino — o treinador não respondeu"
  - [ ] Estilo: primário mas ligeiramente diferente do `workout_approved` (amber ou primary, não verde)
  - [ ] `onClick` → `nav('workout', { source: 'trainer_timeout' })`
- [ ] Garantir que o botão NÃO aparece se `item.response === 'rejected'` (rejeição é definitiva)
- [ ] Adicionar i18n keys (en/pt/es/de):
  - [ ] `inbox.actions.startWorkoutTimeout` — "Iniciar treino — o treinador não respondeu"
  - [ ] `inbox.actions.startWorkoutTimeoutNote` — "O seu treino será gerado pela IA com o seu perfil."
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(inbox): fallback start workout button after trainer timeout`

---

### Fase C — StartWorkoutScreen reconhece o source `trainer_timeout`

**Esforço:** ~2h  
**Risco:** Baixo  
**Dependências:** Fase B

**Objectivo:** Quando o aluno chega ao Workout via `trainer_timeout`, o sistema sabe que deve gerar plano autónomo e registar o motivo.

### Checklist

- [ ] `StartWorkoutScreen` recebe `source` via `screenPayload`
- [ ] Se `source === 'trainer_timeout'`:
  - [ ] Mostrar banner informativo no topo: "O seu treinador não respondeu — o plano é gerado pela IA"
  - [ ] Forçar `coachDNA = null` → `resolveTrainerContext` usa `DEFAULT_AI_TRAINER`
  - [ ] Gravar `metadata: { trainer_timeout: true }` no `workout_plans` inserido
- [ ] Adicionar i18n keys (en/pt/es/de):
  - [ ] `client.workout.trainerTimeoutBanner` — "Treinador não respondeu — plano gerado pela IA com o seu perfil."
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(workout): handle trainer_timeout source — autonomous plan with metadata`

---

### Fase D — Notificação ao treinador

**Esforço:** ~1h  
**Risco:** Baixo  
**Dependências:** Fase C

**Objectivo:** Transparência total — o treinador sabe que o aluno treinou autonomamente por falta de resposta.

### Checklist

- [ ] Em `StartWorkoutScreen`, quando `source === 'trainer_timeout'` e o plano é gerado:
  - [ ] `notifyLinkedTrainer(user.id, title, body, { type: 'trainer_timeout_workout', ... })`
  - [ ] Mensagem: "{{name}} treinou de forma autónoma — o treinador não respondeu no prazo."
- [ ] Em `InboxScreen` (vista do treinador), renderizar card `trainer_timeout_workout`:
  - [ ] Badge: "Treinou autonomamente"
  - [ ] Cor: amber (não vermelho — não é falha, é fallback)
- [ ] Adicionar i18n keys (en/pt/es/de):
  - [ ] `inbox.trainer_timeout_workout.title` — "{{name}} treinou de forma autónoma"
  - [ ] `inbox.trainer_timeout_workout.body` — "O treinador não respondeu no prazo. {{name}} iniciou treino pela IA."
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(inbox): notify trainer when client uses timeout fallback`

---

### Fase E — Validação e Settings

**Esforço:** ~2h  
**Risco:** Baixo  
**Dependências:** Fases A–D

**Objectivo:** Verificar o fluxo completo e garantir que o `workoutReadyExpiryMin` está exposto nas Settings do treinador.

### Checklist

- [ ] Verificar que `workoutReadyExpiryMin` (15/30/60/120) está acessível nas Settings do treinador
  - [ ] Se não estiver: adicionar selector nas Settings com label "Tempo de resposta ao aluno"
- [ ] Teste E2E manual:
  - [ ] Aluno faz check-in → notifica treinador
  - [ ] Forçar expiração via SQL: `UPDATE notification_log SET expires_at = now() - interval '1 min' WHERE type = 'workout_ready'`
  - [ ] Aluno abre inbox → confirma botão "Iniciar treino — o treinador não respondeu"
  - [ ] Clica → Workout abre com banner informativo → plano gerado
  - [ ] Treinador recebe notificação "treinou autonomamente"
  - [ ] Histórico do aluno mostra o treino
- [ ] `tsc --noEmit` limpo
- [ ] Commit: `feat(settings): expose workoutReadyExpiryMin in trainer settings UI`

---

## 5. Resumo Executivo

| Fase | Área | Esforço | Risco | Estado |
|---|---|---|---|---|
| A | Countdown visual na inbox do aluno | ~2h | Baixo | Pendente |
| B | Botão de fallback após timeout | ~3h | Médio | Pendente |
| C | StartWorkoutScreen — source `trainer_timeout` | ~2h | Baixo | Pendente |
| D | Notificação ao treinador | ~1h | Baixo | Pendente |
| E | Validação + Settings | ~2h | Baixo | Pendente |
| **Total** | | **~10h** | | |

**Ordem recomendada:** A → B → C → D → E

---

## 6. Princípios Aplicados

1. **Autonomia com transparência** — o aluno tem liberdade de treinar; o treinador é sempre informado.
2. **Sem pressão automática** — o botão aparece na inbox, não é um push intrusivo. O aluno decide.
3. **Rejeição é definitiva** — se o treinador rejeitou, o fallback não aparece. Decisão clínica é respeitada.
4. **Auditabilidade** — `trainer_timeout: true` em todos os registos para análise futura.
5. **Zero degradação de segurança** — Safety Gate continua activo; feature gating continua activo. O fallback usa o mesmo pipeline da geração autónoma.
6. **Configurável pelo treinador** — o tempo de espera respeita o `workoutReadyExpiryMin` já definido. Sem segundo temporizador.
