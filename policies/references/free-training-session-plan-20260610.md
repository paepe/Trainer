# Sessão de Treino Livre — Plano Faseado de Implementação

**Data:** 2026-06-10
**Status:** Aprovado para implementação (aguardando autorização de execução)
**Origem:** Documento "MELHORIA E OTIMIZAÇÃO — SESSÃO DE TREINO LIVRE" + 4 rodadas de análise de impacto
**Projeto Supabase:** `sevenseeds.trainer` (`xbfszzdyskwdctlqzztl`)

---

## 1. Resumo executivo

Disponibilizar, na interface do treinador, **sessões de treino livres** para clientes presenciais **sem licença do app** (avulsos). O fluxo reaproveita check-in completo, DNA Coach, IA de plano e execução já existentes, **minimizando impacto num sistema estabilizado**.

**Decisão arquitetural central:** em vez de tratar o avulso como entidade fora do banco (inviável — `workout_sessions/checkin_prontidao/post_workout_feedback` têm `user_id` NOT NULL + FK → `profiles.id` + RLS exigindo `trainer_clients` ativo), cria-se um **usuário sintético** (profile real, descartável, sem `auth.users`) no momento de abertura da sessão. Esse `user_id` real-mas-sintético destrava todas as FKs/NOT NULL/RLS e elimina a necessidade de ramos condicionais nas telas compartilhadas.

---

## 2. Fundamentos verificados no schema de produção

| Achado | Implicação |
|---|---|
| `workout_sessions.user_id` NOT NULL, FK → `profiles.id` | Sintético precisa existir em `profiles` |
| `checkin_prontidao.user_id` NOT NULL, FK → `profiles.id` | idem |
| `post_workout_feedback.user_id`+`session_id` NOT NULL, FK → `profiles.id`/`workout_sessions.id` | idem |
| `profiles.id` **NÃO tem FK para `auth.users`** | Profile sintético sem usuário de auth é tecnicamente possível |
| RLS INSERT `profiles`: `with_check (auth.uid() = id)` | App **não** pode inserir profile de id alheio → exige RPC `SECURITY DEFINER` |
| RLS sessão/checkin/feedback: exige `trainer_clients` ativo (`client_id=user_id, trainer_id=auth.uid(), status='active'`) | Gravação exige vínculo ativo → mas vínculo ativo apareceria em MyClients |
| `fetchClients()` lê `trainer_clients` filtrando `in ('active','pending')` | Sintético vazaria para Dashboard se vinculado normalmente |
| `computeSafetyGate()` é **puro, client-side** | "Reprovado" (`status==='blocked'`) reusa algoritmo existente, sem cálculo novo |
| `requestWorkoutPlan()` aceita `physicalProfile/checkin = null` | IA funciona mesmo com dados neutros |
| Trigger `on_auth_user_created` cria profile p/ usuários reais | Não interfere no sintético (que não passa por `auth.users`) |

---

## 3. Decisões consolidadas (do usuário)

1. **Sujeito:** usuário sintético criado automática e dinamicamente no acionamento do CTA. Real e persistido para o sistema.
2. **Criação:** via função server-side `SECURITY DEFINER` (segurança é valor inegociável). Nada de INSERT direto do app.
3. **Persistência dos dados de execução:** gravados nas entidades reais (`workout_sessions` etc.), atrelados ao sintético. Dispensa "JSON neutro" — os dados reais do treino livre vivem no sujeito descartável.
4. **Recurso autoritativo mandatório:** CHECK IN COMPLETO obrigatório. Quick e Voice desabilitados no modo livre.
5. **Bloqueio por REPROVADO:** reuso de `computeSafetyGate()` → `status==='blocked'` desabilita "PLANO DE TREINO", habilita "VOLTAR".
6. **Propagação de modo:** `freeSession` elevado a estado dedicado no App (não payload volátil); `selectedClient` recebe o sintético automaticamente.
7. **Paleta azul-claro:** requisito **descartado** (atenção do treinador já garantida por outros sinais). Settings/tema operam normalmente com cliente selecionado.
8. **ID `AAAAMMDDhhmm`:** **perde efeito** — usuário dinâmico persistido já provê identificador. Sem prejuízo das demais premissas.
9. **Retenção:** dados **perenes, impessoais, seguros** — bem estratégico para ciência de dados. **Sem TTL, sem limpeza.**
10. **Email do sintético:** fake no padrão `nome_automatico@trainer.fs` (`fs` = Free Session).

---

## 4. Princípio de isolamento (invariante de projeto)

> O usuário sintético **nunca** aparece em MyClients, Dashboard, Performance, Inbox, ou qualquer superfície voltada a clientes reais. Toda query do treinador que lista clientes/sessões deve **excluir** o sintético por marcador explícito.

**Marcador:** `profiles.role = 'free_session_subject'` (novo valor de role). Critério único de exclusão em todas as listas.

---

## 5. Arquitetura da solução

```
[Trainer Dashboard]
   └─ CTA "Sessão de Treino Livre" (ação global, sem cliente pré-selecionado)
        └─ RPC create_free_session_subject()  [SECURITY DEFINER]
             • cria profiles{ id:uuid, role:'free_session_subject', name:auto, email:auto@trainer.fs }
             • cria trainer_clients{ trainer_id, client_id:synthetic, status:'active' }  (necessário p/ RLS)
             • retorna { client_id, name, email }
        └─ App: setFreeSession(true); setSelectedClient(synthetic)
        └─ nav('checkin', modo livre)
             • CheckInHub: só DETAILED habilitado
             • CALCULAR PRONTIDÃO → computeSafetyGate (client-side)
                 - blocked  → PLANO DE TREINO desabilitado, VOLTAR habilitado
                 - clear/caution → PLANO DE TREINO habilitado
        └─ nav('workoutPlanEditor', modo livre)
             • guard !selectedClient: satisfeito (sintético presente)
             • contexto: DNA Coach do treinador + checkin do sintético
             • PERGUNTE À IA + ADICIONAR: ativos
             • ENVIAR AO CLIENTE: oculto
             • CTA "INICIAR SESSÃO AO VIVO" → renomeado "INICIAR SESSÃO DE TREINO LIVRE"
        └─ nav('workoutMode', modo livre)  → grava normalmente (sujeito sintético)
        └─ nav('workoutSummary')  → avaliação grava em post_workout_feedback (sintético)
        └─ encerramento: limpa freeSession + selectedClient
```

**Por que o vínculo `trainer_clients` ativo é necessário e seguro:** as RLS de `workout_sessions`/`checkin_prontidao`/`post_workout_feedback` exigem-no. O vazamento para MyClients é neutralizado pelo filtro de `role` (Fase 4), não pela ausência do vínculo.

---

## 6. Plano faseado + checklist

### FASE 0 — Fundação de dados (backend) ✅ CONCLUÍDA 2026-06-10
- [x] Role `'free_session_subject'` definido (distinto de trainer/client/studio_admin; coluna `profiles.role` é text livre)
- [x] RPC `create_free_session_subject(p_trainer_id uuid)` `SECURITY DEFINER`, `search_path=public`:
  - [x] valida `auth.uid() = p_trainer_id` (RAISE `unauthorized`) e role `trainer` (RAISE `not_a_trainer`)
  - [x] gera `gen_random_uuid()` para o sintético
  - [x] nome automático `Free Session <YYYYMMDDHH24MISS>`
  - [x] email `fs_<YYYYMMDDHH24MISS>@trainer.fs`
  - [x] INSERT em `profiles { id, name, email, role:'free_session_subject' }`
  - [x] INSERT em `trainer_clients { trainer_id, client_id, status:'active' }`
  - [x] retorna `{ client_id, name, email }`
- [x] Migração aplicada em produção (`sevenseeds.trainer`) — sem staging equivalente (autorizado)
- [x] Grants endurecidos: REVOKE anon/PUBLIC; só `authenticated`+`service_role`
- [x] Guarda testada: chamada sem `auth.uid()` rejeitada com `unauthorized`

**Notas Fase 0:**
- FK `trainer_clients.client_id → profiles.id ON DELETE CASCADE`; `UNIQUE(trainer_id, client_id)` evita colisão (uuid novo/sessão).
- `status_check` aceita `pending/active/paused/ended` — `active` válido e exigido pelas RLS de execução.
- `has_permission(perm text, uid uuid)` é a assinatura real (2º arg default).

### FASE 1 — Isolamento nas listas do treinador (anti-vazamento) ✅ CONCLUÍDA 2026-06-10
- [x] `TrainerDashboardScreen.fetchClients()`: select inclui `role`; filtro client-side `role !== 'free_session_subject'` remove a linha inteira (não embed-null). Tipo `TrainerClient.client` estendido com `role?`.
- [x] `TrainerDashboardScreen` (safety gate / active sessions): `ids` derivam de `clientsList` JÁ filtrado → sintéticos não entram nas queries de alerta/sessão ativa. Cobertura por origem única.
- [x] `TrainerClientDetailScreen`: inacessível ao sintético — não há card na lista (filtrada) que dispare `selectClient`. Confirmado por construção.
- [x] `PerformanceDashboardScreen`: usa `selectedClient?.id`; sintético só visível DURANTE o fluxo livre (intencional). Limpo ao encerrar (Fase 2/6). Não vaza para visão de clientes reais.
- [x] Verificação de triggers (produção): único trigger em `checkin_prontidao` é `checkin_denorm_sync` (BEFORE INSERT, denormaliza o próprio registro). **SEM fan-out** para `safety_gate_events`/`trainer_alerts`/`operational_tasks`. Check-in do sintético não gera alertas automáticos.
- [ ] **Invariante p/ Fases 4–6:** código do fluxo livre NÃO deve chamar `notify()`/`emitEvent()`/inserts de `trainer_alerts`/`operational_tasks` para o sintético.
- [ ] **Verificação manual (Fase 8):** criar 1 sessão livre e confirmar ZERO aparições em Dashboard/MyClients/Performance/Inbox/histórico.

**Mapa de consumidores `trainer_clients`/`profiles` (varredura):**
- `TrainerDashboardScreen` — FILTRADO ✅
- `useAlerts` (`trainer_alerts`/`operational_tasks` por `trainer_id`) — sem vazamento se fluxo livre não gerar alertas (invariante acima)
- `notify.ts` / `events.ts` (`trainer_clients`) — relevantes só se o fluxo livre disparar notificação; invariante cobre
- `useStudioData` / `StudioApp` — contexto studio, não MyClients do treinador comum
- `StartWorkoutScreen` / `useTrainerLink` / `useAuth` — contexto cliente, fora de escopo

### FASE 2 — Estado de modo livre no App ✅ CONCLUÍDA 2026-06-10
- [x] Estado `freeSession: boolean` em `App.tsx` (par com `selectedClient`); helper `exitFreeSession()` limpa ambos
- [x] `startFreeSession()`: chama RPC → seta sintético + modo → `nav('checkin', …)`
- [x] `freeSession` propagado às telas do fluxo (checkin, editor, workoutMode, summary) via router (estado, não payload volátil)
- [x] Encerramento via `onExitFreeSession` no "Salvar e continuar" do summary
- [x] Reset de modo ao sair (summary chama `exitFreeSession` antes de `nav('trainerDashboard')`)

### FASE 3 — CTA e ponto de entrada ✅ CONCLUÍDA 2026-06-10
- [x] Botão "Sessão de Treino Livre" no `TrainerDashboardScreen` — **ABAIXO do "+ Convidar cliente"**, cor `liveAction`
- [x] onClick: `startFreeSession()` (RPC → sintético → modo → checkin)
- [x] Tratamento de erro da RPC (log + não navega se falhar)
- [x] Loading/disabled (`startingFree`) durante a criação

### FASE 4 — Check-in livre (só Detailed + bloqueio reprovado) ✅ CONCLUÍDA 2026-06-10
- [x] `CheckInHub`: prop `freeSession` → renderiza **apenas** `detailed` (filtra OPTIONS)
- [x] `CheckInProntidaoScreen`: prop `freeSession` repassada a Hub e Result; check-in persiste via vínculo ativo
- [x] `CheckInResult`: `freeBlocked = freeSession && status==='blocked'` → substitui CTA por aviso "não pronto", só VOLTAR
- [x] `clear`/`caution` → CTA normal `buildPlan` (leva ao editor via `mode==='trainer-context'`)
- [x] `computeSafetyGate` **NÃO** alterado (reuso puro confirmado)

### FASE 5 — Editor de plano em modo livre ✅ CONCLUÍDA 2026-06-10
- [x] `WorkoutPlanEditorScreen`: guard `!selectedClient` satisfeito pelo sintético
- [x] Contexto DNA Coach + checkin do sintético (sem alteração no fetch)
- [x] Botão "ENVIAR AO CLIENTE" oculto quando `freeSession`
- [x] CTA relabel → "INICIAR SESSÃO DE TREINO LIVRE" (`startFreeSession` i18n) quando `freeSession`; hint oculto
- [x] `startSessionNow()` → `nav('workoutMode')`; `freeSession` injetado pelo router (App state)
- [x] PERGUNTE À IA + ADICIONAR inalterados

### FASE 6 — Execução e avaliação ✅ CONCLUÍDA 2026-06-10
- [x] `WorkoutModeScreen`: prop `freeSession` aceita; grava normalmente no sintético (sem modo efêmero)
- [x] `freeSession` chega ao summary via App state (router)
- [x] `PostWorkoutSummaryScreen`: grava feedback; em `freeSession` chama `onExitFreeSession()` + `nav('trainerDashboard')` e retorna
- [x] Allowlist `returnTo` inalterada (fluxo livre usa caminho dedicado, não `returnTo`)

### FASE 7 — i18n + textos ✅ CONCLUÍDA 2026-06-10
- [x] `trainer.dashboard.freeSession` + `startingFreeSession` (en/pt/es/de)
- [x] `trainer.planner.startFreeSession` (en/pt/es/de)
- [x] `checkin.result.freeBlockedTitle` + `freeBlockedBody` (en/pt/es/de)
- [x] Nome automático do sintético gerado server-side (`Free Session <ts>`) — não requer i18n
- [x] JSON dos 4 locales validado (parse OK)

### FASE 8 — Validação e fechamento (PARCIAL)
- [x] `npx tsc --noEmit` limpo
- [ ] Smoke test do fluxo completo (requer app rodando): CTA → check-in detailed → reprovado (bloqueia) → aprovado (libera) → plano IA → iniciar → executar → avaliar → voltar
- [ ] **Anti-vazamento (crítico):** confirmar sintético ausente de Dashboard/MyClients/Performance/Inbox/histórico
- [ ] Confirmar dados persistidos de forma impessoal e consultáveis para estatística
- [ ] Atualizar este doc com resultado da validação manual

---

## 7. Riscos residuais e mitigações

| Risco | Severidade | Mitigação |
|---|---|---|
| Esquecer 1 query → sintético vaza para tela do treinador | Alta | Fase 1 dedicada + verificação manual obrigatória na Fase 8 |
| Modo livre "gruda" após sair do fluxo | Média | Reset explícito de `freeSession`+`selectedClient` em todos os pontos de saída (Fase 2/6) |
| RPC `SECURITY DEFINER` mal escopada (cria sintético para trainer alheio) | Alta | Validar `auth.uid() = p_trainer_id` dentro da função; GRANT só a `authenticated` |
| Acúmulo de dados (decisão: perene) | Baixa (aceito) | Dados são ativo estratégico; impessoais e seguros. Sem limpeza por decisão de produto |
| `email`/`name` nulos quebrando telas | Baixa | Email fake `@trainer.fs` + nome automático sempre preenchidos pela RPC |
| Alteração inadvertida do fluxo de clientes pagantes | Alta | Todo ramo novo condicionado a `freeSession`; telas compartilhadas testadas com modo desligado |

---

## 8. Fora de escopo (explicitamente descartado)

- Paleta azul-clara (requisito retirado)
- ID custom `AAAAMMDDhhmm` (substituído pelo id do sintético)
- TTL / rotina de limpeza (dados perenes por decisão estratégica)
- Conversão de sessão livre → cliente tradicional (mencionada como visão futura; não implementada agora)

---

## 9. Ordem de execução recomendada

`Fase 0 (backend) → Fase 1 (isolamento) → Fase 2 (estado) → Fase 3 (entrada) → Fase 4 (check-in) → Fase 5 (editor) → Fase 6 (execução) → Fase 7 (i18n) → Fase 8 (validação)`

Backend e isolamento primeiro: garantem a invariante de segurança antes de qualquer superfície de UI existir.
