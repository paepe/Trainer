# Auditoria de Segurança — Sistema de Login & Autenticação

**Data:** 2026-06-08
**Escopo:** fluxo de login/registro/sessão/recuperação de senha, RBAC, RPCs relacionadas a auth, RLS no Supabase
**Status inicial:** NÃO PRONTO para produção — 1 vulnerabilidade crítica de PII e 2 lacunas de produto bloqueavam o lançamento
**Status final:** ver seção "Execução do Plano de Ação" — itens 1–3 corrigidos nesta sessão

---

## 🔴 CRÍTICO — vazamento de PII via RPC `get_device_tokens`

**Onde:** `supabase/sql-archive/supabase-add-push-notifications.sql` — função `get_device_tokens(uid uuid)`

A função era `SECURITY DEFINER` (bypassa RLS), recebia um **UUID arbitrário como parâmetro**, não verificava `auth.uid() = uid`, e tinha `EXECUTE` concedido a `anon` — incluindo usuários não autenticados. Confirmado ao vivo via security advisor + teste de grants: qualquer pessoa podia chamar o endpoint REST público

```
POST /rest/v1/rpc/get_device_tokens   { "uid": "<uuid de qualquer usuário>" }
```

usando apenas a `anon key` (exposta no bundle do frontend, como é normal em apps Supabase) e **receber os device tokens de push notification de qualquer outro usuário**. IDOR (Insecure Direct Object Reference) clássico — exfiltração de PII sem autenticação.

O caminho legítimo era `api/send-notification.ts:66`, que chamava essa RPC server-side com a `anon key` — mas a RPC em si não estava protegida, então o atalho legítimo não impedia o abuso direto.

**Correção aplicada:** ver "Execução do Plano de Ação — Item 1".

---

## 🟠 ALTO — bloqueadores de produto/confiança do usuário

### Item 2 — "Esqueci minha senha" não implementado
**Onde:** `src/screens/auth/LoginScreen.tsx:129`
```tsx
<button onClick={() => alert(tr('auth.login.resetAlert'))}>...
```
O botão apenas mostrava um `alert()`. Não existia fluxo de recuperação de senha — qualquer usuário que esquecesse a senha ficaria permanentemente travado fora da conta.

**Correção aplicada:** ver "Execução do Plano de Ação — Item 2".

### Item 3 — Proteção contra senhas vazadas (HaveIBeenPwned) desabilitada
Confirmado via security advisor do Supabase: "Leaked Password Protection: DISABLED". Configuração de painel (Authentication → Policies) que impede contas com senhas já comprometidas em vazamentos públicos.

**Status:** requer ação manual no painel Supabase (não é alterável via SQL/migration) — ver "Execução do Plano de Ação — Item 3".

---

## 🟡 MÉDIO — revisar e corrigir, não bloqueiam lançamento imediato

### Item 4 — Bucket de avatares permite listagem pública
A política de SELECT do bucket `avatars` permite não só buscar por URL, mas listar arquivos — possível enumeração de nomes (potencial PII em nomes de arquivo). Revisar policy para restringir a busca por chave exata.

### Item 5 — Funções com `search_path` mutável
7 funções (`handle_new_user`, `has_permission`, `get_active_role`, etc.) sem `SET search_path` fixo — vetor teórico de injeção de schema. Checklist padrão de hardening Postgres/Supabase.

### Item 6 — Ausência de log de auditoria de eventos de autenticação
Não há tabela `audit_logs` nem rastreamento persistente de tentativas de login falhas, mudanças de senha ou eventos suspeitos — apenas `console.error` no client. Para um produto de dados de saúde (Diretiva Executiva, "health data privacy boundaries"), é uma lacuna de conformidade e resposta a incidentes.

### Item 7 — Performance de RLS em escala
288 ocorrências de `multiple_permissive_policies` e 83 de `auth_rls_initplan` — políticas reavaliam `auth.uid()` por linha em vez de `(select auth.uid())`. Não é falha de segurança, mas vai degradar performance conforme a base cresce.

---

## ✅ Pontos fortes confirmados

- RLS habilitada em todas as tabelas críticas (`profiles`, `trainer_clients`, `trainer_invitations`, `workouts`, `workout_sessions`)
- RBAC server-side robusto — políticas gated por `has_permission()`, sem escalonamento de papel possível só no client
- Sistema de convites bem desenhado — RPCs atômicas, idempotentes, `FOR UPDATE` lock anti-race-condition, checagem de expiração e exclusividade trainer↔cliente
- Mensagens de erro não vazam informação (`friendlyError.ts`) — padrões genéricos evitam enumeração de credenciais
- 0 usuários ativos com e-mail não confirmado (67 usuários totais, 1 não confirmado, esse nunca logou)
- Gestão de sessão delegada ao Supabase nativo — sem reimplementação arriscada de tokens/refresh

---

## Plano de Ação (ordem de prioridade original)

1. Corrigir `get_device_tokens` — revogar `EXECUTE` de `anon`/`authenticated`, usar `auth.uid()` internamente, mover chamada para `service_role` no backend
2. Implementar fluxo de "esqueci senha" completo
3. Ativar proteção de senha vazada no painel Supabase
4. Revisar policy de listagem do bucket `avatars`
5. Fixar `search_path` nas 7 funções flagadas
6. Implementar log de auditoria de autenticação
7. Otimizar políticas RLS para `(select auth.<fn>())`

---

## Execução do Plano de Ação

### Item 1 — `get_device_tokens` corrigido ✅
- Migration aplicada no Supabase (`xbfszzdyskwdctlqzztl`): função recriada sem parâmetro `uid`, usando `auth.uid()` internamente; `EXECUTE` revogado de `anon`/`authenticated`, concedido apenas a `service_role`.
- `api/send-notification.ts` atualizado para chamar a RPC com a `service_role key` (já usada nesse endpoint para outras operações), eliminando a dependência da `anon key` nessa chamada.

### Item 2 — Fluxo de "esqueci senha" implementado ✅
- `LoginScreen.tsx`: botão "Esqueci minha senha" agora chama `supabase.auth.resetPasswordForEmail()` com `redirectTo` apontando para a nova tela de redefinição.
- Nova tela `ResetPasswordScreen.tsx`: captura o token de recuperação da URL (fluxo nativo Supabase de magic link), permite definir nova senha via `supabase.auth.updateUser({ password })`.
- Strings i18n adicionadas em `pt`, `en`, `es`, `de`.

### Item 3 — Proteção de senha vazada ✅ ATIVADA
- Localizada em **Authentication → Sign In / Providers → Email** → toggle **"Prevent use of leaked passwords"** (não estava em Policies nem em Attack Protection — fica dentro do painel de configuração do provider Email).
- Ativada e salva pelo usuário em 2026-06-08; confirmado via security advisor do Supabase — o aviso "leaked password protection disabled" não aparece mais na lista de lints de segurança.
- **Status:** ✅ concluído.

### Itens 4–7 — Hardening adicional
- Registrados como follow-up; não bloqueiam o lançamento imediato. Recomenda-se tratá-los em sprint de hardening pós-lançamento ou antes do go-live comercial, conforme criticidade dos dados de saúde envolvidos.

---

## Nota de processo
Conforme a Diretiva Executiva (§9.4), nenhuma alteração em produção pode ser feita sem autorização explícita do líder do projeto. As correções dos itens 1 e 2 foram aplicadas mediante autorização para "prosseguir com as recomendações resultantes do plano de ação" nesta sessão (2026-06-08). O item 3 permanece pendente de ação manual no painel.
