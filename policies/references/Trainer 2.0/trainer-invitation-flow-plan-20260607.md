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

- [ ] Criar tabela `trainer_invitations` (migration):
  - `id uuid pk`, `trainer_id uuid fk`, `invited_email text`, `invited_name text null`,
  - `token text unique`, `status text` (`'sent' | 'accepted' | 'expired' | 'revoked'`),
  - `created_at timestamptz`, `expires_at timestamptz`, `accepted_at timestamptz null`, `accepted_by uuid null fk profiles`
- [ ] Definir política de expiração (sugestão: 7 dias) e índice único em `token`
- [ ] RLS: treinador só vê/edita convites onde `trainer_id = auth.uid()`; convidado pode ler convite pelo `token` (via função segura/RPC, não acesso direto à tabela)
- [ ] Decidir e provisionar canal de e-mail transacional (ex.: Resend, SendGrid, Postmark — escolher conforme já usado/disponível na conta Vercel/Supabase do projeto)
- [ ] Adicionar variáveis de ambiente do provedor de e-mail (`EMAIL_API_KEY`, `EMAIL_FROM`, etc.) — documentar em `.env.example`

### Fase 1 — Geração e envio do convite (lado do treinador)
**Objetivo:** treinador consegue convidar qualquer e-mail, com ou sem conta.

- [ ] Novo endpoint `api/send-invitation.ts` (padrão similar a `api/send-notification.ts`):
  - Recebe `trainerId`, `invitedEmail`, `invitedName?`
  - Gera `token` único (ex.: UUID v4 ou hash assinado), grava em `trainer_invitations` com `status='sent'`
  - Dispara e-mail transacional com link `https://app.trainer/invite/{token}`
  - Usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS na escrita (mesmo padrão de `send-notification.ts:14-16`)
- [ ] Atualizar UI de convite em `TrainerDashboardScreen.tsx`:
  - Remover a checagem obrigatória de `profiles` (linha ~195-204) — convite passa a aceitar qualquer e-mail
  - Mostrar estado "Convite enviado — aguardando aceitação" distinto de "Cliente ativo" / "Pendente (já tem conta)"
  - Listar convites pendentes (`trainer_invitations.status='sent'`) com opção de reenviar/revogar
- [ ] i18n: novos textos em `en/pt/es/de` para os estados de convite

### Fase 2 — Recepção do convite (lado do convidado)
**Objetivo:** quem recebe o link, com ou sem conta, chega numa tela de aceitação clara.

- [ ] Roteamento de deep link `/invite/:token` (ou query param `?invite=token`, conforme arquitetura de navegação existente — `NavFn`/`screenPayload`)
- [ ] Nova tela `AcceptInvitationScreen`:
  - Busca o convite via RPC segura por `token` (não expõe `trainer_invitations` por completo via REST)
  - Se usuário **não autenticado** → direciona para login/cadastro preservando o token (query param ou `localStorage`)
  - Se usuário **autenticado** → mostra "Treinador X quer te convidar — aceitar?"
  - Botões: Aceitar / Recusar
- [ ] Ajustar `RegisterScreen.tsx` / `useAuth.signUp` para repassar o token pendente adiante após criação de conta (sem criar vínculo ainda — só preservar contexto)
- [ ] i18n: textos da tela de aceitação em todos os locales

### Fase 3 — Ativação automática do vínculo
**Objetivo:** ao aceitar, o vínculo `trainer_clients` é criado/ativado de forma consistente — único ponto de verdade, reaproveitado pelos dois caminhos (com/sem conta prévia).

- [ ] RPC/endpoint único `accept-invitation` (ex.: `api/accept-invitation.ts` ou função Postgres `accept_trainer_invitation(token, user_id)`):
  - Valida token (existe, não expirado, não usado)
  - Upsert em `trainer_clients` com `trainer_id`, `client_id = user_id`, `status='active'`, `invited_at`
  - Marca `trainer_invitations.status='accepted'`, `accepted_at`, `accepted_by`
  - Idempotente (reaceitar não duplica nem quebra)
- [ ] Notificar o treinador (reaproveitar `api/send-notification.ts` / `notification_log`) que o convite foi aceito
- [ ] Atualizar `App.tsx:269-278` se necessário para refletir o novo vínculo imediatamente (Realtime já cobre `trainer_clients`, validar se o filtro `status='active'` é suficiente)

### Fase 4 — Estados de erro, expiração e gestão
**Objetivo:** cobrir os casos de borda que todo convite assíncrono precisa.

- [x] Convite expirado → tela informa e instrui a pedir um novo convite ao treinador (`AcceptInvitationScreen`, fase "expired")
- [x] Convite revogado pelo treinador → bloqueia aceitação (`AcceptInvitationScreen`, fase "revoked"; RPC retorna `revoked` mesmo em re-tentativa)
- [x] E-mail já vinculado a outro treinador → **decisão tomada na seção 5: vínculo exclusivo**; bloqueado tanto na criação do convite (`api/send-invitation.ts`) quanto na aceitação (RPC `accept_trainer_invitation`)
- [x] Reenvio de convite (revoga o anterior se ainda pendente, gera novo token via `api/send-invitation.ts`) — `TrainerDashboardScreen.resendInvitation`
- [x] Painel do treinador mostra histórico de convites (pendente/aceito/expirado/revogado) com ações Revogar/Reenviar — seção "Recent invitations" no painel de convite

### Fase 5 — Validação e testes
- [ ] Teste manual E2E caminho A: convidado **com conta** → recebe e-mail → loga → aceita → vínculo ativo
- [ ] Teste manual E2E caminho B: convidado **sem conta** → recebe e-mail → cadastra → aceita → vínculo ativo
- [ ] Teste de expiração (convite vencido)
- [ ] Teste de revogação
- [ ] Teste de idempotência (clicar "aceitar" duas vezes, ou abrir o link em duas abas)
- [ ] Rodar pipeline de validação: `npx tsc --noEmit`, `npx eslint src`, `npm run build`
- [ ] Verificar i18n: zero chaves faltando nos 4 locales (`en/pt/es/de`)

### Fase 6 — Documentação e encerramento
- [ ] Atualizar `trainer_system_design.md` (ou doc equivalente) com o novo fluxo de convites
- [ ] Registrar decisões de negócio tomadas na Fase 4 (ex.: regra de múltiplos vínculos)
- [ ] Commit final com `Co-Authored-By`

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
