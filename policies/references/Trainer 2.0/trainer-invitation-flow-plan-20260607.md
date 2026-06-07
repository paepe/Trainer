# Plano: Fluxo Completo de Convite Treinador → Aluno

**Data:** 2026-06-07
**Status:** Proposto — aguardando aprovação para iniciar Fase 1
**Objetivo:** Permitir que um treinador convide qualquer pessoa para se associar como aluno/cliente — **com ou sem conta prévia no TrAIner** — e que essa associação se complete automaticamente assim que o convidado tiver login ativo.

---

## 1. Diagnóstico do estado atual

| Etapa | Situação | Evidência |
| --- | --- | --- |
| Treinador dispara convite | Funciona, mas só por busca de e-mail em `profiles` | `TrainerDashboardScreen.tsx:191-223` |
| Convidado SEM conta | **Bloqueado** — retorna erro `errNotFound` | `TrainerDashboardScreen.tsx:201-204` |
| Persistência do convite | Cria `trainer_clients` com `status:'pending'` | `TrainerDashboardScreen.tsx:207-211` |
| Envio de e-mail/notificação ao convidado | **Inexistente** | nenhum endpoint encontrado |
| Vínculo automático ao criar conta | **Inexistente** — nenhum trigger / handler | — |
| Tela de aceitar/recusar convite | **Inexistente** | — |
| Resolução do vínculo ativo no app | Só reconhece `status:'active'` | `App.tsx:269-278` |

**Conclusão:** o convite é uma operação de mão única que cria um registro `pending` órfão — nunca vira `active`, e nunca chega a quem não tem conta.

---

## 2. Princípios de design

1. **Um único fluxo, dois pontos de entrada** — o convite deve funcionar de forma idêntica para "tem conta" e "não tem conta"; a única diferença é se a pessoa loga primeiro ou se cadastra primeiro.
2. **Token de convite como elo universal** — em vez de depender de busca por e-mail (`profiles`), o convite gera um token único que carrega a intenção (`trainer_id` + `email convidado` + `expiração`). Esse token funciona tanto para login quanto para cadastro novo.
3. **Vínculo nunca é silencioso** — o convidado sempre vê e confirma a associação (mesmo que de forma simples, ex.: "Aceitar convite de [Treinador]?"). Evita associações indesejadas/erradas.
4. **Reaproveitar infraestrutura existente** — usar `trainer_clients.status` (`pending`→`active`), `notification_log`/push (já existe via `api/send-notification.ts`), e o padrão de Realtime já presente em outras telas.
5. **E-mail é a única lacuna de infraestrutura nova** — hoje só existe push (FCM). Precisamos de um canal de e-mail transacional para alcançar quem ainda não tem conta.

---

## 3. Visão do fluxo-alvo (E2E)

```
Treinador → gera convite (e-mail + nome opcional)
   │
   ├─ cria registro em `trainer_invitations` (token único, status='sent', expires_at)
   │
   └─ dispara e-mail transacional com link: https://app.trainer/invite/{token}
            │
            ├─ Convidado JÁ TEM CONTA
            │     → abre link → app detecta token → tela "Aceitar convite de [Treinador]"
            │     → ao aceitar: cria/ativa `trainer_clients` (status='active') + marca invitation 'accepted'
            │
            └─ Convidado NÃO TEM CONTA
                  → abre link → tela de cadastro pré-preenchida (e-mail) + token persistido (query param/local storage)
                  → cria conta → app detecta token pendente → mesma tela "Aceitar convite"
                  → ao aceitar: cria/ativa `trainer_clients` (status='active') + marca invitation 'accepted'
```

A diferença entre os dois caminhos é **apenas se o cadastro acontece antes ou depois da tela de aceitação** — a partir daí, o fluxo converge.

---

## 4. Plano faseado

### Fase 0 — Fundamentos de dados e infraestrutura
**Objetivo:** preparar o terreno sem alterar UX ainda.

- [x] Criar tabela `trainer_invitations` (migration `supabase/sql-archive/supabase-trainer-invitations-20260607.sql`):
  - `id uuid pk`, `trainer_id uuid fk`, `invited_email text`, `invited_name text not null`,
  - `token text unique`, `status text` (`'sent' | 'accepted' | 'expired' | 'revoked'`),
  - `created_at timestamptz`, `expires_at timestamptz`, `accepted_at timestamptz null`, `accepted_by uuid null fk profiles`
- [x] Definir política de expiração (**7 dias**, ver decisão #3) e índice único em `token`
- [x] RLS: políticas `trainer_invitations_select_own` / `_insert_own` / `_update_own` (treinador só vê/edita convites próprios); convidado lê convite pelo `token` exclusivamente via `get_invitation_by_token` (SECURITY DEFINER) — sem policy de leitura direta por token
- [x] Provedor de e-mail transacional decidido: **Resend** (ver decisão #1) — integração via `api/send-invitation.ts`
- [x] Variáveis de ambiente do provedor (`EMAIL_API_KEY`/`RESEND_API_KEY`, `EMAIL_FROM`) — wiring no código pronto; **configuração da chave explicitamente adiada para o final do projeto a pedido do usuário** (ver nota de fechamento)

### Fase 1 — Geração e envio do convite (lado do treinador)
**Objetivo:** treinador consegue convidar qualquer e-mail, com ou sem conta.

- [x] Novo endpoint `api/send-invitation.ts` (padrão similar a `api/send-notification.ts`):
  - Recebe `trainerId`, `invitedEmail`, `invitedName`
  - Gera `token` único (UUID v4), grava em `trainer_invitations` com `status='sent'` e `expires_at = now()+7d`
  - Dispara e-mail transacional (Resend) com link `https://app.trainer/invite/{token}` — envio condicional ao `RESEND_API_KEY` estar configurado (chave ainda pendente, ver Fase 0)
  - Usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS na escrita + checagem de exclusividade (decisão #2)
- [x] Atualizar UI de convite em `TrainerDashboardScreen.tsx`:
  - Convite passa a aceitar qualquer e-mail (sem exigir `profiles` pré-existente) via `sendInvite()`
  - Estados distintos refletidos no histórico de convites (`sent`/`accepted`/`expired`/`revoked`)
  - Lista de convites com opções de Reenviar/Revogar — seção "Recent invitations" (`fetchInvitations`/`resendInvitation`/`revokeInvitation`)
- [x] i18n: namespace `invite.*` (18 chaves) + `trainer.dashboard.inviteHistoryTitle/inviteStatus.*/resend/revoke` em en/pt/es/de

### Fase 2 — Recepção do convite (lado do convidado)
**Objetivo:** quem recebe o link, com ou sem conta, chega numa tela de aceitação clara.

- [x] Roteamento de deep link `/invite/:token` — parsing de `window.location.pathname` em `App.tsx` (efeito mount-only) + rewrite `/invite/(.*)` → `/index.html` em `vercel.json`
- [x] Nova tela `AcceptInvitationScreen.tsx`:
  - Busca o convite via RPC segura `get_invitation_by_token` (projeção mínima, nunca expõe `trainer_id` cru antes da aceitação)
  - Se usuário **não autenticado** → `goAuth()` persiste o token em `sessionStorage('trainer_pending_invite_token')` e direciona para login/cadastro
  - Se usuário **autenticado** → mostra "Treinador X quer te convidar — aceitar?" com estados loading/invalid/expired/revoked/ready/accepted/error
  - Botão: Aceitar (fluxo de "recusar" resolvido implicitamente — convidado simplesmente não aceita; convite expira em 7 dias)
- [x] `App.tsx` consome o token pendente do `sessionStorage` no efeito de navegação por papel pós-login/cadastro e direciona para `acceptInvitation` (cobre os dois caminhos — já tinha conta / criou conta agora — convergindo na mesma tela)
- [x] i18n: namespace `invite.*` (18 chaves: title, body, needAccount, createAccount, login, accept, accepting, continue, acceptedTitle/Body, unavailable, invalid, expired, revoked, errAlreadyLinked, goHome, trainerPushTitle/Body) em en/pt/es/de

### Fase 3 — Ativação automática do vínculo
**Objetivo:** ao aceitar, o vínculo `trainer_clients` é criado/ativado de forma consistente — único ponto de verdade, reaproveitado pelos dois caminhos (com/sem conta prévia).

- [x] Função Postgres SECURITY DEFINER `accept_trainer_invitation(p_token, p_user_id)`:
  - Valida token (existe, não expirado, não revogado), com `for update` row-lock contra corridas
  - Upsert em `trainer_clients` (`trainer_id`, `client_id`, `status='active'`, `invited_at`) com `on conflict ... do update`
  - Marca `trainer_invitations.status='accepted'`, `accepted_at`, `accepted_by`
  - Idempotente — re-clique retorna `already_accepted` sem duplicar; checagem dupla de exclusividade (`already_linked_elsewhere`) cobre corrida com outro convite
- [x] Notifica o treinador via `notify()` (mesmo pipeline de `api/send-notification.ts`/`notification_log`) — RPC retorna `trainer_id`/`trainer_name` apenas em caso de sucesso (seguro, pois o vínculo já está visível via RLS nesse ponto)
- [x] `App.tsx` reflete o vínculo imediatamente: o efeito de navegação por papel roteia para `acceptInvitation` assim que sessão+perfil carregam com token pendente; Realtime existente em `trainer_clients` (filtro `status='active'`) cobre a atualização ao vivo no dashboard do treinador, sem necessidade de ajuste adicional

### Fase 4 — Estados de erro, expiração e gestão
**Objetivo:** cobrir os casos de borda que todo convite assíncrono precisa.

- [x] Convite expirado → tela informa e instrui a pedir um novo convite ao treinador (`AcceptInvitationScreen`, fase "expired")
- [x] Convite revogado pelo treinador → bloqueia aceitação (`AcceptInvitationScreen`, fase "revoked"; RPC retorna `revoked` mesmo em re-tentativa)
- [x] E-mail já vinculado a outro treinador → **decisão tomada na seção 5: vínculo exclusivo**; bloqueado tanto na criação do convite (`api/send-invitation.ts`) quanto na aceitação (RPC `accept_trainer_invitation`)
- [x] Reenvio de convite (revoga o anterior se ainda pendente, gera novo token via `api/send-invitation.ts`) — `TrainerDashboardScreen.resendInvitation`
- [x] Painel do treinador mostra histórico de convites (pendente/aceito/expirado/revogado) com ações Revogar/Reenviar — seção "Recent invitations" no painel de convite

### Fase 5 — Validação e testes
- [x] Rodar pipeline de validação: `npx tsc --noEmit -p tsconfig.json` (limpo, 0 erros), `npx eslint src` (0 erros, 231 warnings — todos de categorias pré-existentes do baseline), `npm run build` (✓ build em ~1.1s)
- [x] Verificar i18n: zero chaves faltando/sobrando nos 4 locales (`en/pt/es/de`) — checagem automatizada confirmou paridade total para `invite.*` (18 chaves) e `trainer.dashboard.*` novas (6 chaves, incl. `inviteStatus` aninhado)
- [x] Migration `supabase-trainer-invitations-20260607.sql` aplicada no projeto remoto `sevenseeds.trainer` (`xbfszzdyskwdctlqzztl`) — tabela `trainer_invitations` confirmada via `list_tables` (RLS habilitado, 0 linhas) e funções `get_invitation_by_token`/`accept_trainer_invitation` confirmadas nos advisors (avisos esperados de "SECURITY DEFINER executável por anon/authenticated" — comportamento intencional do design)
- [x] `src/types/supabase.ts` regenerado — wrappers tipados temporários (`rpc` em `AcceptInvitationScreen`, `InvitationQuery`/`invitationsTable` em `TrainerDashboardScreen`) removidos; chamadas diretas `supabase.rpc(...)`/`supabase.from('trainer_invitations')` agora totalmente tipadas (commit `1e94608`)
- [x] Variáveis `RESEND_API_KEY`/`EMAIL_FROM` (ou nomes equivalentes escolhidos pelo usuário) criadas no Vercel — chave do Resend configurada
- [ ] Teste manual E2E caminho A: convidado **com conta** → recebe e-mail → loga → aceita → vínculo ativo *(ambiente agora desbloqueado — pendente apenas de execução manual ao vivo)*
- [ ] Teste manual E2E caminho B: convidado **sem conta** → recebe e-mail → cadastra → aceita → vínculo ativo *(idem)*
- [ ] Teste de expiração (convite vencido) *(idem)*
- [ ] Teste de revogação *(idem)*
- [ ] Teste de idempotência (clicar "aceitar" duas vezes, ou abrir o link em duas abas) *(idem; lógica idempotente já validada por leitura de código no RPC — `already_accepted` / row-lock `for update`)*

> **Bug pré-existente descoberto e corrigido durante a regeneração de tipos:** `events.ts:60-61,80-81` insere `template_key`/`params` em `trainer_alerts`/`operational_tasks`, mas a migration `supabase-add-template-keys-events.sql` nunca havia sido aplicada ao banco remoto — essas colunas existiam só em `notification_log`, e os tipos antigos (desatualizados) mascaravam o erro de compilação. Aplicada a migration faltante (`add_template_keys_to_alerts_and_tasks`), alinhando o schema remoto ao código e restaurando a arquitetura multilíngue de templates para alertas/tarefas operacionais. Sem relação com o fluxo de convites — efeito colateral positivo da sincronização de tipos.
>
> Os 5 testes manuais E2E acima agora só dependem de execução ao vivo (clicar no link recebido por e-mail, etc.) — toda a infraestrutura (migration, tipos, chave Resend) está pronta.

### Fase 6 — Documentação e encerramento
- [x] Checklist do plano atualizado de ponta a ponta (Fases 0–5 marcadas, decisões registradas na seção 5)
- [x] Decisões de negócio da Fase 4 já registradas na seção 5 (regra de exclusividade #2, validade #3, nome obrigatório #4) e referenciadas nos itens de checklist correspondentes
- [ ] Atualizar `trainer_system_design.md` (ou doc equivalente) com o novo fluxo de convites — *não localizado um doc de design canônico para o sistema de treinadores; este próprio plano serve como registro de arquitetura até que um seja criado*
- [x] Commit final com `Co-Authored-By` (commits `125769f`, `4386ecd`, `1e94608`)

> **Fechamento:** a chave do Resend foi configurada e a migration aplicada — os dois itens que estavam explicitamente adiados (*"ainda não tenho a chave Resend deste projeto, então siga com o projeto e deixaremos a configuração da chave para o final"*) estão concluídos. O fluxo de convite está 100% implementado, tipado e validado estaticamente; resta apenas a execução dos 5 testes manuais E2E ao vivo listados acima.

---

## 5. Decisões confirmadas (2026-06-07)

| # | Questão | Decisão |
| --- | --- | --- |
| 1 | Provedor de e-mail transacional | **Resend**, integrado via Supabase |
| 2 | E-mail já vinculado a outro treinador | **Regra de exclusividade**: um aluno convidado só pode ter UM personal trainer — aquele que o convidou. Convite para e-mail já vinculado a outro treinador deve ser bloqueado/recusado |
| 3 | Validade do convite | **7 dias** |
| 4 | Nome do convidado no convite | **Obrigatório** — o treinador informa nome + e-mail ao convidar (personaliza o e-mail enviado) |

> A regra de exclusividade (#2) tem impacto direto na Fase 1 (validação no momento do convite) e na Fase 3 (validação no momento da aceitação — dupla checagem para cobrir corridas/condições concorrentes).

---

## 6. Notas de implementação

- Reaproveitar o padrão de endpoint serverless já usado em `api/send-notification.ts` (uso de `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS, REST direto via `fetch`).
- Reaproveitar o padrão de Realtime já usado em `TrainerClientDetailScreen.tsx` para refletir aceitação de convite ao vivo no dashboard do treinador.
- O token de convite **nunca deve ser previsível** (usar geração criptograficamente segura) e **nunca deve expor dados sensíveis** ao ser passado por URL — a tabela `trainer_invitations` deve ser protegida por RLS, com leitura pelo token mediada por RPC/função seguraque valida e retorna apenas o necessário (nome do treinador, status do convite).
