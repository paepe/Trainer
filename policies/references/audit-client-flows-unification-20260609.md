# Auditoria de Fluxos do Aluno — Unificação de Código
**Data:** 2026-06-09  
**Escopo:** Mapeamento e comparação dos dois perfis de aluno (com e sem treinador) para elaboração de plano de unificação.

---

## 1. Contexto

O sistema suporta dois perfis funcionais de aluno que compartilham a mesma interface mas divergem em comportamento:

| Dimensão | Aluno COM Treinador | Aluno SEM Treinador |
|---|---|---|
| Plano de treino | Criado pelo treinador (manual + IA assistida) | Gerado pela IA automaticamente |
| Aprovação | Precisa aguardar plano ou solicitar via check-in | Inicia diretamente |
| Safety Gate | Notifica treinador + bloqueia | Bloqueia + exibe aviso ao aluno |
| Notificações | Bidirecional (aluno ↔ treinador) | Nenhuma |
| Inbox | Ativo (recebe planos, respostas) | Visível mas vazio |

---

## 2. Detecção do Vínculo com Treinador

### Ponto único de detecção: `App.tsx` (linha ~274)

```typescript
supabase
  .from('trainer_clients')
  .select('trainer_id')
  .eq('client_id', profile.id)
  .eq('status', 'active')
  .maybeSingle()
  .then(({ data }) => setLinkedTrainerId(data?.trainer_id ?? ''));
```

**Estado resultante:** `linkedTrainerId`
- `null` → resolução pendente
- `''` (string vazia) → sem treinador
- `string não vazia` → tem treinador

**Problema:** Este padrão de query é **duplicado em 10+ locais** ao longo do codebase (ver Seção 6).

---

## 3. Mapeamento de Fluxos

### 3.1 Fluxo: Aluno COM Treinador

```
Login
  └─► CheckInProntidaoScreen
        ├─ Safety Gate BLOQUEADO → notifica treinador + nav('checkin')
        ├─ Prontidão BAIXA       → notifica treinador + nav('checkin')
        └─ Prontidão OK          → "Notificar treinador" → nav('checkin')
                                       ↓ (treinador aprova via Inbox)
                                  StartWorkoutScreen
                                    ├─ Plano do treinador disponível → exibe lista
                                    │    ├─ Postpone → status 'postponed'
                                    │    ├─ Cancel   → status 'cancelled' + notifica treinador
                                    │    └─ Start    → WorkoutModeScreen
                                    └─ Sem plano do treinador → gera plano IA (Coach DNA do treinador)
                                                                   └─ WorkoutModeScreen
                                                                         └─ PostWorkoutSummaryScreen
                                                                               └─ notifica treinador (workout_completed)
                                                                                     └─ nav('stats')
```

### 3.2 Fluxo: Aluno SEM Treinador

```
Login
  └─► CheckInProntidaoScreen
        ├─ Safety Gate BLOQUEADO → exibe aviso ao aluno (sem notificação)
        └─ Prontidão OK          → "Iniciar Treino" → nav('workout')
                                        ↓
                                  StartWorkoutScreen
                                    └─ Gera plano IA (DEFAULT_AI_TRAINER)
                                         └─ WorkoutModeScreen
                                               └─ PostWorkoutSummaryScreen
                                                     └─ nav('stats')
                                                     (sem notificações)
```

---

## 4. Divergências por Arquivo

### 4.1 `CheckInProntidaoScreen.tsx`

| Condição | Com Treinador | Sem Treinador |
|---|---|---|
| Safety Gate bloqueado | `notify(trainer)` + `nav('checkin')` | exibe aviso, permanece na tela |
| Prontidão baixa | `notify(trainer)` + `nav('checkin')` | exibe aviso, permanece na tela |
| Aprovado — botão CTA | "Notificar treinador que estou pronto" | "Iniciar Treino" |
| `onAlert` callback | `notify(linkedTrainerId, ...)` | não existe |
| `onDone` routing | `nav('checkin')` | `nav('workout')` |

**Branching atual:** ternário `linkedTrainerId ? ... : ...` em ~5 pontos do componente.

---

### 4.2 `StartWorkoutScreen.tsx`

| Condição | Com Treinador | Sem Treinador |
|---|---|---|
| Fonte do plano | Trainer manual (source='manual') → AI fallback | Sempre AI (DEFAULT_AI_TRAINER) |
| Personalização IA | Coach DNA do treinador | DEFAULT_AI_TRAINER + settings do aluno |
| UI plano disponível | Lista de planos do treinador (cards) | Plano IA diretamente |
| Cancel/Postpone | Notifica treinador via `notify()` | Não aplicável |
| Sem plano | Gera AI com Coach DNA do treinador | Gera AI com DEFAULT_AI_TRAINER |

**Branching atual:**
- `hasTrainerPlans` — controla qual UI renderizar (linha ~679 vs ~823)
- `linkedTrainerId` — determina personalização IA (linha ~471)
- `linkedTrainerId` — determina se notifica ao cancelar/postponer (linha ~575)

---

### 4.3 `useCheckinData.ts`

| Evento | Com Treinador | Sem Treinador |
|---|---|---|
| Safety gate / baixa prontidão | Consulta `trainer_clients` + `notify(trainer)` | Nada |

```typescript
// Código atual — query duplicada dentro do hook
void supabase.from('trainer_clients')
  .select('trainer_id').eq('client_id', effectiveUserId).eq('status', 'active')
  .maybeSingle()
  .then(({ data: tc }) => {
    if (tc?.trainer_id) void notify(tc.trainer_id, ...);
  });
```

---

### 4.4 `useWorkoutData.ts`

| Evento | Com Treinador | Sem Treinador |
|---|---|---|
| `workout_completed` | Consulta `trainer_clients` + `notify(trainer)` | Nada |

Mesma query duplicada (padrão idêntico ao `useCheckinData`).

---

### 4.5 `InboxScreen.tsx` (shared)

Já é shared. O flag `isTrainer` controla:
- Trainer: botões Aprovar/Rejeitar
- Cliente com treinador: recebe notificações, vê badges
- Cliente sem treinador: tela vazia

**Sem divergência de código aqui** — funciona corretamente para os dois perfis.

---

### 4.6 Tabs de Navegação (`App.tsx`)

**Ambos os perfis de aluno usam as mesmas tabs:**
```
['checkin', 'workout', 'stats', 'inbox', 'menu']
```

Sem divergência. O inbox fica vazio para alunos sem treinador mas a tab existe.

---

## 5. Padrões Duplicados Identificados

### Padrão A — Detecção de treinador vinculado (10+ ocorrências)
```typescript
supabase.from('trainer_clients')
  .select('trainer_id')
  .eq('client_id', userId)
  .eq('status', 'active')
  .maybeSingle()
```
**Arquivos:** App.tsx, useCheckinData.ts, useWorkoutData.ts, StartWorkoutScreen.tsx, autoExpirePlans.ts, events.ts, CheckInProntidaoScreen.tsx

**Solução:** Hook `useTrainerLink(clientId)` com cache — expõe `trainerId: string | null`.

---

### Padrão B — Notificar treinador vinculado (4 ocorrências)
```typescript
const { data: tc } = await supabase.from('trainer_clients')...
if (tc?.trainer_id) void notify(tc.trainer_id, title, body, path, opts);
```
**Arquivos:** useCheckinData.ts, useWorkoutData.ts, StartWorkoutScreen.tsx, autoExpirePlans.ts

**Solução:** Helper `notifyLinkedTrainer(clientId, title, body, opts)` em `src/lib/notify.ts`.

---

### Padrão C — Safety gate threshold (2 ocorrências)
```typescript
score < 55  // limiar de baixa prontidão
```
**Arquivos:** useCheckinData.ts, CheckInProntidaoScreen.tsx

**Solução:** Constante `LOW_READINESS_THRESHOLD = 55` em arquivo de constantes.

---

## 6. Inventário de Branching por Variável

| Variável | Arquivos onde causa branching | Ocorrências |
|---|---|---|
| `linkedTrainerId` | App.tsx, CheckInProntidaoScreen, StartWorkoutScreen | ~8 |
| `hasTrainerPlans` | StartWorkoutScreen | ~4 |
| `isTrainer` | InboxScreen, App.tsx, múltiplos | ~15 |
| `trainer_clients` query inline | useCheckinData, useWorkoutData, autoExpirePlans, events | ~7 |

---

## 7. Proposta de Unificação

### 7.1 Fase 1 — Extrair hook `useTrainerLink`

**Arquivo novo:** `src/hooks/useTrainerLink.ts`

```typescript
export function useTrainerLink(clientId: string | null) {
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!clientId) { setTrainerId(null); setLoading(false); return; }
    supabase.from('trainer_clients')
      .select('trainer_id').eq('client_id', clientId).eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => {
        setTrainerId(data?.trainer_id ?? null);
        setLoading(false);
      });
  }, [clientId]);

  return { trainerId, hasTrainer: trainerId !== null, loading };
}
```

**Impacto:** elimina ~7 queries inline, centraliza cache.

---

### 7.2 Fase 2 — Extrair helper `notifyLinkedTrainer`

**Arquivo:** `src/lib/notify.ts` (adicionar export)

```typescript
export async function notifyLinkedTrainer(
  clientId: string,
  title: string,
  body: string,
  opts?: NotifyOptions,
): Promise<void> {
  const { data: tc } = await supabase
    .from('trainer_clients')
    .select('trainer_id').eq('client_id', clientId).eq('status', 'active')
    .maybeSingle();
  if (tc?.trainer_id) {
    void notify(tc.trainer_id, title, body, undefined, { ...opts, fromUserId: clientId });
  }
}
```

**Impacto:** elimina ~4 blocos duplicados em useCheckinData, useWorkoutData, StartWorkoutScreen, autoExpirePlans.

---

### 7.3 Fase 3 — Unificar `CheckInProntidaoScreen`

Substituir os 5 ternários `linkedTrainerId ? ... : ...` por uma prop explícita `mode: 'with-trainer' | 'standalone'` derivada do hook `useTrainerLink`.

**CTA unificado:**
```typescript
const cta = mode === 'with-trainer'
  ? { label: tr('checkin.result.notifyTrainerReady'), action: handleNotifyTrainer }
  : { label: tr('checkin.result.startWorkout'),       action: handleStartWorkout };
```

---

### 7.4 Fase 4 — Unificar personalização IA em `StartWorkoutScreen`

Criar `resolveTrainerContext(clientId, linkedTrainerId)`:
- Se `linkedTrainerId` → busca Coach DNA do treinador
- Se não → usa `DEFAULT_AI_TRAINER` + settings do aluno

Elimina o branching inline na montagem do payload de `requestSmartWorkout`.

---

## 8. Riscos e Dependências

| Risco | Mitigação |
|---|---|
| `linkedTrainerId` usado como string vazia vs null em guards | Normalizar para `null` no hook; auditar todos os guards `!linkedTrainerId` |
| Race condition: hook resolve depois do render inicial | Manter estado `loading` do hook; bloquear CTA até resolver |
| autoExpirePlans chamado server-side (edge fn) | `notifyLinkedTrainer` precisará de versão server-safe sem hook React |
| Aluno muda de treinador (status inativo → novo ativo) | Cache do hook deve re-fetch por `clientId` change |

---

## 9. Arquivos a Criar / Modificar

| Ação | Arquivo | Fase |
|---|---|---|
| CRIAR | `src/hooks/useTrainerLink.ts` | 1 |
| MODIFICAR | `src/App.tsx` — usar hook no lugar da query inline | 1 |
| MODIFICAR | `src/lib/notify.ts` — adicionar `notifyLinkedTrainer` | 2 |
| MODIFICAR | `src/hooks/useCheckinData.ts` | 2 |
| MODIFICAR | `src/hooks/useWorkoutData.ts` | 2 |
| MODIFICAR | `src/lib/autoExpirePlans.ts` | 2 |
| MODIFICAR | `src/lib/events.ts` | 2 |
| MODIFICAR | `src/screens/checkin/CheckInProntidaoScreen.tsx` | 3 |
| MODIFICAR | `src/screens/client/StartWorkoutScreen.tsx` | 4 |

---

## 10. Métricas Estimadas

| Métrica | Atual | Pós-unificação |
|---|---|---|
| Queries `trainer_clients` inline | ~10 | 1 (no hook) |
| Blocos notify+trainer-query duplicados | ~4 | 0 |
| Branching `linkedTrainerId` em componentes | ~8 | ~2 (apenas onde UI diverge) |
| Linhas eliminadas (estimado) | — | ~120 |

---

*Documento gerado em 2026-06-09. Aguarda aprovação para início da implementação por fases.*
