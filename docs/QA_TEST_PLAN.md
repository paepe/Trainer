# QA Test Plan — Feature Gating & Subscription Windows

**Versão:** 1.0  
**Data:** 2026-06-21  
**Projecto:** TrAIner — sevenseeds.trainer  
**Ambiente:** Staging / Produção  
**Preparado por:** Engineering

---

## Configuração Necessária

### Acesso
- App a correr (URL de staging ou localhost)
- Acesso ao Supabase SQL Editor: `https://supabase.com/dashboard/project/xbfszzdyskwdctlqzztl/sql/new`
- Permissão para criar contas de teste

### Contas de Teste a Criar Antes de Começar

| Alias | Role | Estado Inicial |
|---|---|---|
| `client_free` | client | Nova conta (plan_key = free) |
| `client_ai_fitness` | client | Fazer upgrade para AI Fitness |
| `client_ai_performance` | client | Fazer upgrade para AI Performance |
| `trainer_trial` | trainer | Nova conta (plan_key = trial) |
| `trainer_pro` | trainer | Fazer upgrade para Pro |

### SQL de Apoio — Consultar Estado

```sql
-- Ver subscription de um utilizador pelo email
SELECT u.email, s.plan_key, s.status, s.current_period_end
FROM auth.users u
JOIN subscriptions s ON s.user_id = u.id
WHERE u.email = '<email>';

-- Forçar expiração de welcome/trial window
UPDATE subscriptions
SET current_period_end = now() - interval '1 day'
WHERE user_id = '<user_id>';

-- Forçar countdown (últimos 3 dias)
UPDATE subscriptions
SET current_period_end = now() + interval '3 days'
WHERE user_id = '<user_id>';

-- Restaurar janela completa (21 dias)
UPDATE subscriptions
SET current_period_end = now() + interval '21 days'
WHERE user_id = '<user_id>';

-- Ver clientes activos de um trainer
SELECT COUNT(*) FROM trainer_clients
WHERE trainer_id = '<trainer_id>' AND status = 'active';
```

---

## Módulo 1 — Welcome Window (Cliente FREE)

> **Contexto:** Clientes que criam conta nova recebem 21 dias com experiência AI Fitness completa. Nos últimos 4 dias aparece um banner de countdown. No dia 22, o gating degrada para os limites FREE reais.

---

### TC-01 — Signup de cliente cria welcome window

**Pré-condição:** Nenhuma conta existente com o email a usar.

**Passos:**
1. Criar conta nova como cliente (role: aluno)
2. Completar o registo
3. No Supabase SQL Editor, executar:
   ```sql
   SELECT plan_key, current_period_end
   FROM subscriptions
   WHERE user_id = (SELECT id FROM auth.users WHERE email = '<email>');
   ```

**Resultado esperado:**
- `plan_key = 'free'`
- `current_period_end` ≈ `now() + 21 dias` (entre 20 e 22 dias no futuro)

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-02 — Cliente FREE em welcome window tem experiência AI Fitness

**Pré-condição:** Conta `client_free` recém-criada (dentro dos 21 dias).

**Passos:**
1. Login com `client_free`
2. Navegar para Workout → verificar limite de sessões semanais
3. Navegar para Check-in → verificar opções disponíveis
4. Navegar para Progresso → verificar métricas visíveis

**Resultado esperado:**
- Workout: sem limite de sessões (comportamento AI Fitness — 7 sessões/semana)
- Check-in: opções Rápido, Detalhado e Voz disponíveis
- Progresso: métricas fitness avançadas visíveis (não bloqueadas)
- Sem banner de countdown (janela tem mais de 4 dias)

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-03 — Banner de countdown aparece nos últimos 4 dias

**Pré-condição:** Conta `client_free` com welcome window activa.

**Passos:**
1. No SQL Editor, executar:
   ```sql
   UPDATE subscriptions SET current_period_end = now() + interval '3 days'
   WHERE user_id = (SELECT id FROM auth.users WHERE email = '<email_client_free>');
   ```
2. Fazer logout e login com `client_free`
3. Observar o topo da app

**Resultado esperado:**
- Banner visível no topo: "A sua experiência AI Fitness termina em 3 dias" (ou equivalente no idioma configurado)
- Botão de upgrade visível no banner
- Experiência AI Fitness ainda activa (gating não degradado)

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-04 — Modal de expiração aparece após welcome window expirada

**Pré-condição:** Conta `client_free`.

**Passos:**
1. No SQL Editor:
   ```sql
   UPDATE subscriptions SET current_period_end = now() - interval '1 day'
   WHERE user_id = (SELECT id FROM auth.users WHERE email = '<email_client_free>');
   ```
2. Fazer logout e login com `client_free`
3. Observar o ecrã inicial

**Resultado esperado:**
- Modal de expiração aparece sobre o conteúdo
- Texto: "A sua experiência AI Fitness terminou. Retome por €9,99/mês." (ou equivalente)
- Dois botões: upgrade (primário) e "Talvez mais tarde" (secundário)

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-05 — Modal não reaparece após "Talvez mais tarde"

**Pré-condição:** TC-04 concluído, modal visível.

**Passos:**
1. Clicar "Talvez mais tarde" no modal
2. Navegar entre ecrãs
3. Fazer logout
4. Fazer login novamente

**Resultado esperado:**
- Modal não reaparece após clicar "Talvez mais tarde"
- Modal não reaparece após logout + login (persiste em localStorage)

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-06 — Gating reverte para FREE após expiração

**Pré-condição:** Conta `client_free` com `current_period_end` no passado (TC-04).

**Passos:**
1. Dispensar o modal (clicar "Talvez mais tarde")
2. Navegar para Workout → tentar gerar sessão
3. Navegar para Check-in → verificar opções
4. Navegar para Progresso → verificar métricas

**Resultado esperado:**
- Workout: limite de 1 sessão/semana (bloqueia 2ª sessão com mensagem de upgrade)
- Check-in: apenas opção Rápido disponível (Detalhado e Voz bloqueados)
- Progresso: métricas fitness avançadas bloqueadas (ícone cadeado visível)

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-07 — PlansScreen mostra AI Fitness como plano actual durante welcome window

**Pré-condição:** Conta `client_free` com welcome window activa (restaurar: `now() + 21 days`).

**Passos:**
1. Login com `client_free`
2. Navegar para Planos (Plans)
3. Observar qual plano está marcado como "Plano actual"

**Resultado esperado:**
- "AI Fitness" aparece marcado como plano actual (não "Free")
- Badge "Plano actual" visível no card AI Fitness

**Pass / Fail:** ___  
**Notas:** ___

---

## Módulo 2 — Trial Window (Trainer TRIAL)

> **Contexto:** Trainers que criam conta nova recebem 21 dias com experiência PRO completa. Mesma mecânica da welcome window.

---

### TC-08 — Signup de trainer cria trial window de 21 dias

**Pré-condição:** Nenhuma conta existente com o email a usar.

**Passos:**
1. Criar conta nova como trainer (role: treinador)
2. Completar o registo
3. No SQL Editor:
   ```sql
   SELECT plan_key, current_period_end
   FROM subscriptions
   WHERE user_id = (SELECT id FROM auth.users WHERE email = '<email>');
   ```

**Resultado esperado:**
- `plan_key = 'trial'`
- `current_period_end` ≈ `now() + 21 dias`

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-09 — Trainer em trial window pode convidar até 50 clientes

**Pré-condição:** Conta `trainer_trial` com trial window activa.

**Passos:**
1. Login com `trainer_trial`
2. No dashboard, tentar convidar clientes
3. Verificar se o botão "+ Convidar cliente" está activo
4. Verificar o limite mostrado na UI (se existir)

**Resultado esperado:**
- Botão de convite activo
- Limite efectivo é 50 (PRO), não 3 (TRIAL)
- Não aparece mensagem de limite atingido com 3 clientes

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-10 — Coach DNA acessível durante trial window

**Pré-condição:** Conta `trainer_trial` com trial window activa.

**Passos:**
1. Login com `trainer_trial`
2. Navegar para Coach DNA

**Resultado esperado:**
- Coach DNA acessível sem bloqueio
- Sem mensagem de upgrade

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-11 — Banner de countdown aparece nos últimos 4 dias (trainer)

**Pré-condição:** Conta `trainer_trial`.

**Passos:**
1. No SQL Editor:
   ```sql
   UPDATE subscriptions SET current_period_end = now() + interval '3 days'
   WHERE user_id = (SELECT id FROM auth.users WHERE email = '<email_trainer_trial>');
   ```
2. Logout e login
3. Observar o topo da app

**Resultado esperado:**
- Banner: "O seu trial Pro termina em 3 dias"
- Botão de upgrade visível
- Funcionalidades PRO ainda activas

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-12 — Após expiração do trial, limite de clientes reverte para 3

**Pré-condição:** Conta `trainer_trial`.

**Passos:**
1. No SQL Editor:
   ```sql
   UPDATE subscriptions SET current_period_end = now() - interval '1 day'
   WHERE user_id = (SELECT id FROM auth.users WHERE email = '<email_trainer_trial>');
   ```
2. Logout e login
3. Dispensar o modal de expiração
4. Tentar convidar o 4º cliente

**Resultado esperado:**
- Modal de expiração aparece no login
- Após dispensar, botão de convite bloqueado quando há 3 clientes activos
- Mensagem: limite atingido

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-13 — Coach DNA bloqueado após expiração do trial

**Pré-condição:** Conta `trainer_trial` com trial expirado (TC-12).

**Passos:**
1. Navegar para Coach DNA

**Resultado esperado:**
- Coach DNA bloqueado
- Mensagem / CTA de upgrade visível

**Pass / Fail:** ___  
**Notas:** ___

---

## Módulo 3 — Gating de Exercícios de Performance

> **Contexto:** Clientes FREE e AI Fitness não têm acesso a exercícios de performance no plano do treinador. O sistema filtra automaticamente os exercícios classificados como "performance".

---

### TC-14 — Exercícios de performance filtrados para cliente FREE

**Pré-condição:**
- Trainer com pelo menos um plano enviado a um cliente FREE
- O plano deve conter exercícios de performance (ex: Sprint, Box Jump, Clean & Jerk)
- Se necessário, criar o plano no editor do treinador

**Passos:**
1. Login com conta de cliente FREE (welcome window expirada)
2. Navegar para Workout
3. Observar a lista de exercícios do plano do treinador

**Resultado esperado:**
- Exercícios classificados como "performance" não aparecem na lista
- Nota visível: "X exercício(s) de desempenho deste plano do treinador não estão incluídos no seu plano"
- Exercícios fitness do mesmo plano continuam visíveis

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-15 — Exercícios de performance visíveis para cliente AI Performance

**Pré-condição:** Mesmo plano do TC-14, mas com conta `client_ai_performance`.

**Passos:**
1. Login com `client_ai_performance`
2. Navegar para Workout
3. Observar a lista de exercícios

**Resultado esperado:**
- Todos os exercícios visíveis, incluindo os de performance
- Sem nota de filtro
- Sem bloqueios

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-16 — Classificação automática de exercícios na primeira consulta

**Pré-condição:** Exercício recentemente adicionado à biblioteca do treinador (sem `exercise_category` ainda definido).

**Passos:**
1. Login com trainer
2. Navegar para Library e adicionar novo exercício (ex: "Sprint 100m")
3. Criar plano com esse exercício e enviar a cliente FREE
4. Login com o cliente FREE
5. Navegar para Workout

**Resultado esperado:**
- Exercício é classificado automaticamente (pode demorar 1-2 segundos na primeira vez)
- Se classificado como "performance", aparece a nota de filtro
- No Supabase, verificar que `exercises.exercise_category` foi preenchido:
  ```sql
  SELECT name, exercise_category FROM exercises WHERE name ILIKE '%sprint%';
  ```

**Pass / Fail:** ___  
**Notas:** ___

---

## Módulo 4 — Gating Geral por Plano

---

### TC-17 — Check-in: cliente FREE tem apenas Check-in Rápido

**Pré-condição:** Conta `client_free` com welcome window expirada.

**Passos:**
1. Login com `client_free`
2. Navegar para Check-in

**Resultado esperado:**
- Apenas a opção "Check-in Rápido" disponível
- Opções "Detalhado" e "Voz" ausentes ou bloqueadas
- Teaser de upgrade visível abaixo

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-18 — Check-in: cliente AI Fitness tem todas as opções

**Pré-condição:** Conta `client_ai_fitness`.

**Passos:**
1. Login com `client_ai_fitness`
2. Navegar para Check-in

**Resultado esperado:**
- Opções Rápido, Detalhado e Voz disponíveis

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-19 — Progresso: cliente FREE vê métricas básicas, avançadas bloqueadas

**Pré-condição:** Conta `client_free` com welcome window expirada.

**Passos:**
1. Login com `client_free`
2. Navegar para Progresso → separador AI Scores

**Resultado esperado:**
- 4 scores básicos visíveis (churnRisk, painRecurrence, sessionCompletion, planFit)
- 5 scores fitness avançados bloqueados (cadeado visível)
- 3 scores de performance bloqueados (cadeado visível)

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-20 — Progresso: cliente AI Fitness vê scores fitness, performance bloqueada

**Pré-condição:** Conta `client_ai_fitness`.

**Passos:**
1. Login com `client_ai_fitness`
2. Navegar para Progresso → AI Scores

**Resultado esperado:**
- 4 scores básicos visíveis
- 5 scores fitness avançados visíveis (desbloqueados)
- 3 scores de performance bloqueados (cadeado)

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-21 — Progresso: cliente AI Performance vê todos os scores

**Pré-condição:** Conta `client_ai_performance`.

**Passos:**
1. Login com `client_ai_performance`
2. Navegar para Progresso → AI Scores

**Resultado esperado:**
- Todos os 12 scores visíveis, nenhum bloqueado

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-22 — Dias do plano do treinador limitados por tier de cliente

**Pré-condição:**
- Trainer com plano de 5 dias enviado a clientes de tiers diferentes
- Conta `client_free` (welcome window expirada), `client_ai_fitness`, `client_ai_performance`

**Passos:**
1. Login com `client_free` → Workout → verificar dias activos do plano
2. Login com `client_ai_fitness` → Workout → verificar dias activos
3. Login com `client_ai_performance` → Workout → verificar dias activos

**Resultado esperado:**
- `client_free`: 1 dia activo, restantes com cadeado e CTA de upgrade
- `client_ai_fitness`: 3 dias activos, restantes bloqueados
- `client_ai_performance`: todos os dias activos

**Pass / Fail:** ___  
**Notas:** ___

---

## Módulo 5 — Backend Enforcement

---

### TC-23 — `send-invitation` respeita limite efectivo durante trial window

**Pré-condição:** Conta `trainer_trial` com trial window activa e 3 clientes já activos.

**Passos:**
1. Login com `trainer_trial`
2. Tentar convidar o 4º cliente

**Resultado esperado:**
- Convite aceite (limite efectivo é 50 durante trial window)
- 4º cliente aparece no dashboard

**Pass / Fail:** ___  
**Notas:** ___

---

### TC-24 — `send-invitation` bloqueia após expiração do trial

**Pré-condição:** Conta `trainer_trial` com trial expirado e 3+ clientes activos.

**Passos:**
1. Login com `trainer_trial`
2. Tentar convidar cliente adicional

**Resultado esperado:**
- Convite bloqueado (limite real é 3 após expiração)
- Mensagem de limite atingido visível

**Pass / Fail:** ___  
**Notas:** ___

---

## Módulo 6 — PlansScreen

---

### TC-25 — PlansScreen mostra tier correcto durante windows

| Conta | Window activa | Plano esperado na PlansScreen |
|---|---|---|
| `client_free` (21 dias) | Welcome window | AI Fitness |
| `client_free` (expirado) | Nenhuma | Free |
| `trainer_trial` (21 dias) | Trial window | Pro |
| `trainer_trial` (expirado) | Nenhuma | Trial |

**Passos:** Para cada linha da tabela acima, verificar o plano marcado como "Plano actual" na PlansScreen.

**Pass / Fail (por linha):** ___  
**Notas:** ___

---

### TC-26 — Badges "Em breve" visíveis nos planos PRO e ELITE

**Pré-condição:** Qualquer conta de trainer.

**Passos:**
1. Login com conta de trainer
2. Navegar para Planos → separador Trainer
3. Observar os cards PRO e ELITE

**Resultado esperado:**
- PRO: "Studio Branding" aparece com badge "Em breve"
- ELITE: "App white-label" e "Destaque no marketplace" com badge "Em breve"

**Pass / Fail:** ___  
**Notas:** ___

---

## Resumo de Resultados

| Módulo | Total TCs | Pass | Fail | Blocker |
|---|---|---|---|---|
| 1 — Welcome Window (cliente) | 7 | | | |
| 2 — Trial Window (trainer) | 6 | | | |
| 3 — Exercícios de Performance | 3 | | | |
| 4 — Gating Geral | 6 | | | |
| 5 — Backend Enforcement | 2 | | | |
| 6 — PlansScreen | 2 | | | |
| **Total** | **26** | | | |

---

## Critérios de Aprovação

- **Go:** 0 Blockers, ≤ 2 Fails (não críticos)
- **Go Condicional:** 0 Blockers, 3–5 Fails com workaround conhecido
- **No-Go:** ≥ 1 Blocker ou > 5 Fails

---

*Documento gerado por Engineering em 2026-06-21. Questões: reportar ao tech lead.*
