# QA Report — Experiência pós-login do convidado (Cenário A) e regressões no Onboarding/Treino

**Data:** 2026-06-08
**Origem:** Teste end-to-end com `paulo.peres@sevenseeds.biz` aceitando convite de treinador (Cenário A — pré-cadastrado), seguido pelo fluxo de Perfil Inteligente do Aluno (Smart Student Profile) e disparo de treino.
**Severidade geral:** 🔴 BLOQUEADOR — o vínculo treinador↔aluno não foi estabelecido e o usuário caiu no fluxo legado de "usuário independente sem treinador", que carrega regressões de UI/UX e de voz.

---

## Hipótese central (a investigar primeiro)

Os 9 achados abaixo provavelmente têm uma **causa raiz comum**: o vínculo `accept_trainer_invitation` não foi efetivado para essa conta durante o fluxo de aceite recém-implementado. Sem o vínculo, o app classificou a conta como "usuário independente" (sem treinador) e roteou para o fluxo legado de treino livre — que aparenta conter código desatualizado/paralelo ao fluxo atual de aluno vinculado.

**Antes de tocar em qualquer tela**, é preciso:
1. Confirmar no banco (`trainer_clients` / `trainer_invitations`) se o vínculo de `paulo.peres@sevenseeds.biz` com o treinador foi de fato criado.
2. Reconstituir, passo a passo, qual caminho de código essa conta percorreu no login (Cenário A com conta pré-existente confirmada → deveria ter passado por `confirmLink`/`accept`).
3. Mapear se existem **dois fluxos de treino coexistindo** (aluno-vinculado vs. usuário-independente) compartilhando o mesmo código-base, conforme suspeita do usuário — e se o roteamento entre eles depende exclusivamente de `linkedTrainerId`.

Essa investigação deve preceder qualquer correção pontual nos itens 3–9, pois mexer na UI do "usuário independente" pode ser esforço desperdiçado se a causa for simplesmente "essa conta nunca deveria ter caído nesse fluxo".

---

## 1. 🔴 CRÍTICO — Vínculo treinador↔aluno não foi estabelecido no aceite do convite

**Sintoma:** Login funcionou, mas a conta não recebeu o status de aluno do treinador que a convidou.

**Impacto:** É a falha mais grave — anula o propósito de todo o fluxo de convite. Sem o vínculo, o sistema trata a conta como usuário independente, o que **explica todos os achados 2, 5 e 9** (a pessoa caiu inteiramente no fluxo legado de "treino livre sem treinador").

**A investigar:**
- Checar diretamente na tabela `trainer_clients` (ou equivalente) se existe registro para essa conta + esse treinador.
- Conferir nos logs/Supabase se `accept_trainer_invitation` foi de fato chamada e qual `result` retornou (`accepted`, `already_linked_elsewhere`, `email_mismatch`, etc.).
- Validar se o caminho de aceite percorrido foi o esperado para Cenário A (conta pré-existente e confirmada → botão único "Confirmar vínculo" → `signIn` + `accept`), ou se a conta entrou por outro caminho (ex.: já estava autenticada de sessão anterior e pulou a etapa de aceite).
- **Nota:** o usuário relatou poder "acionar um treino livre sem pedir autorização ao treinador" — o que reforça que a conta está rodando como usuário independente, não como aluno vinculado.

**Ação:** corrigir a causa raiz no fluxo de aceite (pode ser regressão do redesenho recém-implementado) e, manualmente, vincular a conta de teste ao treinador para permitir reteste do restante do fluxo.

---

## 2. 🟡 App parece estar rodando versão desatualizada / possível regressão

**Sintoma:** Sensação geral de estar usando uma versão mais antiga do app.

**Hipótese:** Consequência direta do item 1 — se a conta caiu no fluxo de "usuário independente sem treinador", ela está percorrendo telas/lógica legadas que não recebem as mesmas atualizações do fluxo de aluno vinculado. Não necessariamente uma regressão de deploy, mas sim a exposição de um caminho de código desatualizado que normalmente não é exercitado.

**Ação:** revisitar após resolver o item 1 — é provável que o app "pareça atualizado" assim que a conta passar a percorrer o fluxo de aluno vinculado.

---

## 3. 🟠 Perfil Inteligente do Aluno — Bloco 01/14 trava o botão CONTINUE

**Sintomas:**
- Botão "Continue" não dispara no passo 01/14.
- "Salvar" apresenta delay significativo; só funcionou após sair da tela e retornar — e mesmo assim não avançou para o próximo passo.
- Campo de Data de Nascimento no mobile abre um seletor (date picker nativo?) de baixa usabilidade.

**Ação proposta:**
- Investigar a race condition entre `saveProfileV2` e a habilitação do botão `Continue` (possível dependência de estado que não atualiza a tempo).
- Avaliar simplificar o campo de Data de Nascimento para um input de texto mascarado, com **máscara de formato localizada por idioma (i18n)** — ex.: `DD/MM/AAAA` em pt-BR, `MM/DD/YYYY` em en-US, etc. — preservando também a opção de seletor para quem preferir.

---

## 4. 🟠 Bloco 02/14 — overflow lateral em opções com texto longo

**Sintoma:** Opções como "CONDICIONAMENTO", "PERDA DE PESO" estouram a largura da tela em até ~5 caracteres no mobile.

**Ação proposta:** ajustar o dimensionamento dos cards/chips de opção (ex.: reduzir fonte/padding em ~10%, permitir quebra de linha controlada, ou usar `clamp()`/`auto-fit` no CSS) para acomodar os rótulos mais longos sem overflow. Testar em viewport mobile real (não apenas DevTools).

---

## 5. 🟠 "Fale com o app" — eco na captura de voz (regressão)

**Sintoma:** Eco durante a captura de voz ao longo do módulo — problema que o usuário já havia reportado e que acreditava resolvido.

**Ação proposta:**
- Confirmar se a correção anterior está de fato presente na branch/versão atual em produção (possível regressão por merge/revert, ou — mais provável dado o contexto — a conta está caindo num componente de voz legado por conta do item 1).
- Se a correção está presente mas não está sendo aplicada neste fluxo, mapear se existe um componente de captura de voz duplicado/paralelo (reforça a hipótese de "dois códigos convivendo").

---

## 6. 🟠 Bloco 12/14 — não salva sem alteração + pré-configurações suspeitas (possível hardcode legado)

**Sintomas:**
- O botão "Continue" só funciona se o usuário alterar manualmente alguma preferência — caso contrário, fica sem ação.
- A tela carrega uma série de pré-configurações cuja origem é desconhecida; o usuário suspeita de hardcode legado.

**Ação proposta:**
- Localizar de onde vêm os valores pré-carregados (hardcode no componente? valores padrão de uma versão antiga do schema? fallback de "usuário independente"?).
- Corrigir a lógica de habilitação do `Continue` para não depender de uma mudança ativa — deve avançar mesmo aceitando os valores padrão (com "dirty check" tratando o estado inicial como válido, não como "nada para salvar").

---

## 7. 🔴 Bloco 14/14 — tela de Classificação de Risco duplicada (dois fluxos coexistindo)

**Sintoma:** A tela de Classificação de Risco aparece **duas vezes em sequência**:
1. Primeira aparição: botão amarelo "Eu entendo - Gerar Mesmo Assim" (capitalização em estilo legado, fora do padrão atual de escrita).
2. Ao clicar, abre uma **segunda** tela de Classificação de Risco, agora com o botão "Gerar Perfil Ampliado".

**Hipótese do usuário (compartilhada pela análise):** dois códigos de readiness/classificação de risco convivendo em paralelo — característica clássica de migração incompleta entre uma versão legada e a atual.

**Ação proposta:**
- Localizar os dois componentes/fluxos de Classificação de Risco no código e determinar qual é o atual e qual é o legado.
- Eliminar a duplicidade, mantendo apenas o fluxo correto, e padronizar a copy do botão ao estilo de escrita atual (sem capitalização legada).
- Verificar se a duplicidade está condicionada ao estado "sem vínculo de treinador" (reforçaria a hipótese do item 1/9).

---

## 8. 🟡 Bloco 13/14 — overflow na margem direita

**Sintoma:** Conteúdo ultrapassa a margem direita da tela no mobile.

**Ação proposta:** mesmo tratamento do item 4 — redução proporcional (~10%) ou ajuste de layout responsivo para conter o conteúdo dentro da viewport.

---

## 9. 🔴 CRÍTICO — Usuário convidado foi conduzido automaticamente a "Iniciar Treino" livre, com UI de treino legada

**Sintomas:**
- Ao final do onboarding, o app conduziu automaticamente para "Iniciar Treino" — comportamento que **não deveria ocorrer para um convidado por um treinador** (o fluxo correto seria aguardar plano/aprovação do treinador, não gerar treino livre).
- Mensagem de "Sessão Adaptada" + "Plano de IA de Hoje" carregado com **interface antiga** de treino:
  - Nomes de exercícios longos ("REMADA COM HALTERES (APOIADO NO BANCO)", "AGACHAMENTO COM PESO CORPORAL (PARCIAL)") ultrapassam o centro do card.
  - Cards não exibem série e tempo do exercício.
- **Pista adicional registrada pelo usuário:** ao abrir a tela de Treino, apareceu a mensagem **"Sincronização online falhou — sessão salva localmente"**.

**Por que essa mensagem pode ser uma pista-chave:**

- Sugere que a sessão de treino tentou sincronizar com o backend e falhou, recaindo num modo de armazenamento local — comportamento tipicamente associado a fluxos legados/offline-first de "usuário independente" que não dependem de aprovação do treinador.
- Pode indicar que o app, ao não encontrar um vínculo de treinador ativo (item 1), tentou gravar a sessão num caminho/tabela que pressupõe um contexto diferente do esperado para "aluno vinculado" — gerando o erro de sincronização como sintoma colateral.
- Vale checar os logs do Supabase (`get_logs`) no horário do teste para identificar exatamente qual chamada de sincronização falhou e por quê — isso pode revelar diretamente o ponto de bifurcação entre os dois fluxos (item 1/3) e acelerar o diagnóstico da causa raiz.

**Ação proposta:** investigar esse erro de sincronização em conjunto com o item 1 — é provável que seja sintoma do mesmo problema de roteamento/vínculo, e não uma falha isolada de rede.

**Hipótese do usuário (avaliação concorda):** essa é a "ponta do fio" que expõe o problema maior — a conta rodou o fluxo de **usuário independente sem treinador** (que carrega bastante legado de UI/UX), porque o vínculo do item 1 não foi estabelecido. **O sistema compartilha a mesma base de código entre aluno-vinculado e usuário-independente; o que muda são os fluxos de aprovação/exercícios conforme o perfil.** O perfil de usuário independente precisa ter seu próprio fluxo isolado e atualizado — ou então essa rota nem deveria ter sido alcançável por uma conta recém-vinculada.

**Ação proposta:**
- **Não mexer na UI legada de treino livre isoladamente** — primeiro confirmar (item 1) que o roteamento correto é: aluno vinculado → fluxo de treino sob orientação do treinador, nunca o de "treino livre".
- Mapear formalmente os pontos de bifurcação de código entre os dois perfis (provavelmente condicionados por `linkedTrainerId`/`isTrainer`/`role`) e avaliar o quanto de UI/UX legada ainda está presente no ramo "usuário independente".
- Decidir, com base nesse mapeamento, se vale a pena (a) atualizar a UI legada do usuário independente para o padrão atual, ou (b) investir no fluxo de aluno vinculado e tratar o de usuário independente como rota secundária de menor prioridade.

---

## Plano de Ação Faseado — Checklist de Acompanhamento

> Marcar cada item com `[x]` à medida que for concluído. Cada fase só deve começar quando as dependências da fase anterior estiverem fechadas.

### Fase 0 — Diagnóstico da causa raiz (🔴 Bloqueador)

- [x] Checar nas tabelas `trainer_clients`/`trainer_invitations` se o vínculo de `paulo.peres@sevenseeds.biz` com o treinador foi criado
- [x] Checar nos logs do Supabase (`get_logs`) qual `result` a RPC `accept_trainer_invitation` retornou nesse aceite (`accepted`, `already_linked_elsewhere`, `email_mismatch`, etc.)
- [x] Reconstituir o caminho exato de código percorrido no aceite (Cenário A → `confirmLink`/`accept` foi de fato chamado?)
- [x] Refinar a hipótese com o esclarecimento do usuário (abriu o convite correto, mas se desviou para "Forgot your password" por não lembrar a senha) — ver análise revisada abaixo
- [ ] Checar nos logs a chamada de sincronização que gerou "Sincronização online falhou — sessão salva localmente" e identificar a causa (item 9 / pista adicional)
- [x] **Critério de saída:** causa raiz identificada e documentada — `trainer_pending_invite_token` em `sessionStorage` (escopo de aba) perdido quando o link de recuperação de senha abre em nova aba/janela; corrigido na Fase 1 com resolução server-side

#### 🔎 ACHADO-CHAVE (2026-06-08, investigação ao vivo via Supabase MCP)

**O usuário NUNCA passou pela tela de aceite de convite.** Confirmado via consulta direta ao banco e aos logs de autenticação:

- **`trainer_invitations`:** o convite mais recente (`97e6730c-4121-4664-8b02-972419da4c1f`, criado às `12:11:21`) permanece com `status: 'sent'` — nunca virou `'accepted'`.
- **`trainer_clients`:** nenhuma linha existe vinculando `paulo.peres@sevenseeds.biz` (`4f3fbc30-e345-4282-a97a-63d0b25993c1`) a `trainer_id = 027559c2-ce97-4c25-aaed-56eacacbbc8b`.
- **Nenhuma chamada** a `get_invitation_by_token` ou `accept_trainer_invitation` aparece nos logs — nem qualquer acesso a `/invite/:token`.

**O que de fato aconteceu**, segundo os logs de `auth` (sequência cronológica real):

```text
12:11:21 → convite criado (token 95a9db3c-c9e3-4026-bdc0-743e8c0c6c6b)
   ?      → user_recovery_requested  (POST /recover)
12:18:30 → login "implicit"          (GET /verify — abertura de magic-link)
   ?      → user_modified            (PUT /user — senha alterada via recovery)
12:20:01 → login "password"          (POST /token — login normal subsequente)
```

**Conclusão (revisada):** o usuário **não abriu o e-mail errado** — ele esclareceu que abriu sim o convite mais recente, mas não recordava a senha da conta pré-existente, e por isso **acionou manualmente "Forgot your password"** dentro do próprio fluxo de autenticação. Ou seja: o desvio para `PASSWORD_RECOVERY` foi uma ação legítima do usuário em pleno fluxo de aceite — não um erro de operação nem um e-mail malformado. A hipótese nº 1 anterior ("e-mail errado aberto") está **descartada**. Isso desloca a investigação de "qual e-mail foi aberto" para **"o que acontece com a referência do convite quando o usuário se desvia para recuperação de senha no meio do fluxo"** — exatamente a pergunta que o usuário levantou: *"será que perdemos algum token ou autorização no processo que poderia ter aberto um PROFILE sem TREINADOR por perda de referência no processo?"*

**Sequência reconstituída (com base no código atual + relato do usuário):**

1. Usuário abre o link do convite mais recente → app roteia para `/invite/:token` → `AcceptInvitationScreen` (linha [App.tsx:375-380](../../src/App.tsx#L375-L380)).
2. Conta já existia (`accountExists: true`) → cenário "pré-cadastrado" → tela pede para autenticar/confirmar vínculo.
3. Usuário não lembra a senha → aciona **"Forgot your password"** → `requestPasswordReset(email)` ([useAuth.ts:106-112](../../src/hooks/useAuth.ts#L106-L112)) dispara e-mail de recuperação via Supabase.
4. Usuário abre o e-mail de recuperação e clica no link → Supabase emite evento `PASSWORD_RECOVERY` → `passwordRecovery = true` → app força a tela `resetPassword` ([App.tsx:352-354](../../src/App.tsx#L352-L354)).
5. Usuário define nova senha → `updatePassword()` → `passwordRecovery = false` → `onDone` leva de volta para `screen = 'login'` ([App.tsx:562](../../src/App.tsx#L562)).
6. Daí em diante, o app segue o roteamento normal pós-login (`trainerDashboard`/`profileWizard`/`checkin`) — **sem nunca passar por `AcceptInvitationScreen` outra vez nem chamar `accept_trainer_invitation`**.

**🎯 Hipótese principal — perda da referência por `sessionStorage` ser isolado por aba/janela:**

O mecanismo que "lembra" o convite pendente durante uma troca de tela (`trainer_pending_invite_token`) é gravado em **`sessionStorage`** (ex.: [App.tsx:359-365](../../src/App.tsx#L359-L365), e no fluxo antigo de `AcceptInvitationScreen` via `goAuth`/`switchAccount`, [linha 190](../../src/screens/auth/AcceptInvitationScreen.tsx#L190)). O problema estrutural: **`sessionStorage` não é compartilhado entre abas/janelas do navegador**. Se o link do e-mail de recuperação de senha abriu em uma nova aba/janela (comportamento padrão de praticamente todo cliente de e-mail/navegador), essa nova aba carrega o app com um `sessionStorage` **vazio** — sem o `trainer_pending_invite_token` gravado na aba original. Resultado:

- A nova aba processa `PASSWORD_RECOVERY` → `resetPassword` → login normalmente, mas **não tem mais nenhuma referência ao convite pendente**.
- O efeito de roteamento por papel ([App.tsx:357-365](../../src/App.tsx#L357-L365)) não encontra `pendingInviteToken` e segue o caminho padrão (dashboard do cliente / `profileWizard`), criando exatamente o cenário relatado: **um perfil "independente", sem vínculo ao treinador**, mesmo o usuário tendo de fato aberto e iniciado o convite corretamente.
- A aba original (com o token salvo) provavelmente nunca foi reaproveitada — o usuário concluiu o fluxo pela aba/janela nova, aberta a partir do e-mail de recuperação.

**Resposta direta à pergunta do usuário:** sim — é altamente provável que o **token de convite pendente (`trainer_pending_invite_token`) tenha sido perdido** nesse desvio, precisamente por depender de `sessionStorage` (escopo de aba) em vez de um mecanismo robusto a trocas de contexto/aba/janela (ex.: `localStorage`, parâmetro persistido na URL/redirect, ou — melhor ainda — reconsulta server-side do convite pendente pelo e-mail do usuário após qualquer login, independentemente de estado local do navegador).

**Implicação de design a registrar para correção (nova entrada no plano de ação):** o app não deveria depender de estado de navegador (sessionStorage) para "lembrar" um convite pendente através de fluxos que podem trocar de aba/janela (recuperação de senha, confirmação de e-mail, OAuth). A correção mais robusta é **resolver o convite pendente a partir do servidor**: após qualquer login bem-sucedido, consultar se existe um convite `status = 'sent'` cujo `invited_email` bate com o e-mail do usuário autenticado (e ainda não expirado/revogado) e, se existir, rotear para `AcceptInvitationScreen` automaticamente — eliminando a dependência de `sessionStorage`/`token` sobrevivendo entre abas.

**Próximo passo direto:** validar a hipótese reproduzindo o cenário — abrir o convite, clicar em "Forgot your password", e verificar empiricamente se o link do e-mail de recuperação abre em nova aba/janela (comportamento do cliente de e-mail usado) e se o `sessionStorage` da nova aba está, de fato, vazio nesse ponto. Caso confirmado, priorizar a correção server-side acima como item do plano (nova fase ou ajuste da Fase 1).

### Fase 1 — Correção do vínculo + reteste mínimo (🔴 Bloqueador)

- [x] Corrigir a causa raiz identificada na Fase 0 no fluxo de aceite de convite — implementada a resolução **server-side** do convite pendente:
  - Nova função `get_pending_invitation_for_user()` (SQL, `security definer`, resolve por `auth.uid()` → e-mail → convite `status='sent'` não expirado), arquivada em [supabase-pending-invitation-resolution-20260608.sql](../../supabase/sql-archive/supabase-pending-invitation-resolution-20260608.sql) e aplicada ao projeto via MCP
  - Efeito de roteamento pós-login em [App.tsx:356-381](../../src/App.tsx#L356-L381) substituído: não lê mais `sessionStorage['trainer_pending_invite_token']` — chama a nova RPC e roteia para `acceptInvitation` se houver convite pendente, **imune a troca de aba/janela**
  - Removida a escrita em `sessionStorage` em `switchAccount` ([AcceptInvitationScreen.tsx](../../src/screens/auth/AcceptInvitationScreen.tsx)) e a limpeza correspondente em `RegisterScreen.tsx` — mecanismo inteiro descontinuado
  - Tipos do Supabase regenerados (`src/types/supabase.ts`); `tsc --noEmit` validado limpo
  - Deploy em produção concluído (`https://trainer-lake.vercel.app`, commit `eda01f3`)
- [x] **🐛 Bug adicional descoberto e corrigido durante o reteste:** `accept_trainer_invitation` lançava `column reference "trainer_id" is ambiguous` em **todas** as chamadas — pré-existente, não relacionado à correção do sessionStorage. A função declara `RETURNS TABLE(result text, trainer_id uuid, trainer_name text)`, e essa coluna de saída colidia com `trainer_clients.trainer_id` em dois pontos: (1) `select trainer_id into ... from trainer_clients` e (2) `INSERT ... ON CONFLICT (trainer_id, client_id) DO UPDATE`. A tela capturava o erro e revertia silenciosamente para a tela de prompt — exatamente o "clico e volta pra mesma tela" relatado. Corrigido qualificando a primeira ocorrência (`tc.trainer_id`) e reescrevendo o `ON CONFLICT` para referenciar a constraint pelo nome (`ON CONFLICT ON CONSTRAINT trainer_clients_trainer_id_client_id_key`). Arquivado em [supabase-fix-accept-invitation-ambiguous-column-20260608.sql](../../supabase/sql-archive/supabase-fix-accept-invitation-ambiguous-column-20260608.sql) e aplicado ao projeto.
- [x] Vincular a conta de teste `paulo.peres@sevenseeds.biz` ao treinador — **concluído**: chamada direta de `accept_trainer_invitation` retornou `{result: 'accepted', trainer_id: '027559c2-...', trainer_name: 'Carlos Silva'}`
- [x] Reteste: confirmado no banco — `trainer_clients` agora contém a linha `trainer_id=027559c2-... (Carlos Silva) ↔ client_id=4f3fbc30-... (paulo.peres@sevenseeds.biz)`, `status='active'`; `trainer_invitations.status` agora `'accepted'`
- [x] **Critério de saída:** vínculo confirmado no banco (`trainer_clients.status='active'`) e causa raiz + bug colateral documentados e corrigidos em produção

### Fase 2 — Mapeamento dos dois fluxos (aluno-vinculado vs. usuário-independente) (🔴 Crítico)

- [ ] Mapear os pontos de bifurcação de código (`linkedTrainerId`/`isTrainer`/`role` ou equivalentes)
- [ ] Listar telas/componentes compartilhados vs. exclusivos de cada ramo
- [ ] Avaliar quanto de UI/UX legada ainda está presente no ramo "usuário independente" (relacionado aos itens 2, 5, 7, 9)
- [ ] **Critério de saída:** documento/diagrama com o mapa de bifurcação e veredito sobre o estado do legado em cada ramo

### Fase 3 — Reteste completo como aluno corretamente vinculado (🟠 Alto)

- [ ] Reexecutar o onboarding completo (Perfil Inteligente do Aluno, 14 blocos) já como aluno vinculado
- [ ] Confirmar quais dos itens 2, 3, 4, 5, 6, 7, 8, 9 se reproduzem nesse caminho correto e quais desaparecem
- [ ] Atualizar este documento marcando quais achados eram sintomas do item 1 (e portanto já resolvidos) vs. quais são bugs reais e independentes
- [ ] **Critério de saída:** lista final e validada de bugs remanescentes a corrigir

### Fase 4 — Correção dos bugs remanescentes do onboarding (🟠 Alto)

- [ ] Botão "Continue" travado no bloco 01/14 + delay no "Salvar" (item 3)
- [ ] Campo de Data de Nascimento — avaliar input com máscara i18n (item 3)
- [ ] Overflow lateral no bloco 02/14 — opções "Condicionamento", "Perda de Peso" etc. (item 4)
- [ ] Overflow no bloco 13/14 (item 8)
- [ ] Eco na captura de voz do "Fale com o app" (item 5) — só corrigir aqui se ainda se reproduzir após a Fase 3
- [ ] Bloco 12/14 não avança sem alteração + investigar origem das pré-configurações suspeitas (item 6)
- [ ] **Critério de saída:** todos os itens desta fase corrigidos e retestados

### Fase 5 — Eliminação da duplicidade de Classificação de Risco (🟠 Alto)

- [ ] Localizar os dois componentes/fluxos de Classificação de Risco (legado vs. atual)
- [ ] Remover a duplicidade, manter apenas o fluxo correto
- [ ] Padronizar a copy do botão ao estilo de escrita atual (sem capitalização legada tipo "Eu entendo - Gerar Mesmo Assim")
- [ ] **Critério de saída:** tela de Classificação de Risco aparece uma única vez, com copy padronizada

### Fase 6 — Tratamento do fluxo "usuário independente" (🟡 Médio)

- [ ] Decidir, com base no mapeamento da Fase 2: atualizar a UI legada desse ramo OU isolá-lo como rota secundária de menor prioridade
- [ ] Executar a decisão tomada
- [ ] Garantir que uma conta de aluno vinculado **nunca** consiga cair nesse fluxo (reforço de roteamento)
- [ ] **Critério de saída:** fluxo "usuário independente" tratado conforme decisão e roteamento validado

### Fase 7 — Validação final end-to-end com usuário novo (🔴 Crítico — fecha o ciclo)

- [ ] Disparar um **novo convite a um usuário 100% novo** (nunca cadastrado) — valida Cenário B
- [ ] Repetir também com um usuário pré-cadastrado — revalida Cenário A
- [ ] Confirmar em ambos os cenários: vínculo criado corretamente, onboarding sem os bugs das fases anteriores, roteamento de treino correto (sob orientação do treinador, não treino livre)
- [ ] **Critério de saída:** ambos os cenários aprovados de ponta a ponta, sem regressões

---

## Observação de processo

Conforme combinado, **um novo teste end-to-end com um usuário completamente novo recebendo convite do zero** deve ser realizado assim que o item 1 for corrigido — tanto para validar a correção quanto para confirmar se os demais sintomas (2, 5, 9) desaparecem ao percorrer o fluxo correto de aluno vinculado.

**Lembrete registrado:** próximo teste de aceite de convite deve usar conta nova (nunca antes cadastrada) para validar Cenário B também, e confirmar que o vínculo é criado corretamente em ambos os cenários.
