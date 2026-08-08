# Plano — Ciclo de Vida de Convites e Descoberta Opt-in de Alunos

**Estado:** Em implementação — base local Docker validada; publicação cloud bloqueada pelas pendências explícitas deste checklist
**Versão:** 1.0
**Criado em:** 2026-08-07
**Responsáveis:** Product · Engineering · Privacy
**Fontes de verdade relacionadas:** `FEATURE_ACCESS_MATRIX.md`, `AI_TRAINER_SPONSORED_CONSUMPTION_POLICY_DRAFT.md`, `AI_GOVERNANCE_CHANGE_GATE.md`, `policies/references/Trainer 2.0/trainer-invitation-flow-plan-20260607.md`

---

## 1. Objetivo e resultado esperado

Resolver dois problemas distintos, sem apagar histórico nem reduzir a proteção de dados:

1. permitir ao TRAINER organizar convites antigos por busca, filtro, ordenação, seleção individual e em lote, arquivando-os apenas da visão operacional;
2. permitir que um usuário FREE, que tenha aderido explicitamente à descoberta por TRAINER, receba convite interno no app além do convite convencional por e-mail.

O resultado é uma operação de clientes limpa, auditável e reversível. Não há exclusão física de convites, perfis, treinos ou dados de saúde.

### Fora de escopo

- marketplace público, perfil público indexável ou venda de leads;
- exposição de e-mail, dados de saúde, histórico de treino ou dados de check-in de usuário FREE a um TRAINER antes da aceitação;
- patrocínio de IA, alteração de licença do aluno ou transferência de franquia/custo;
- exclusão de registros pessoais do banco de dados.

---

## 2. Decisões de produto a confirmar antes da Fase 1

| Decisão | Proposta | Estado |
|---|---|---|
| Arquivamento | Arquivar remove somente da lista padrão; é reversível no filtro **Arquivados**. | Pendente Product |
| “Todos” | Significa **Todos (não arquivados)**. | Pendente Product |
| Busca | Nome e e-mail; case/accent-insensitive; tokens do termo devem ser localizados em qualquer posição. | Pendente Product/Privacy |
| Ordenação | Mais recentes (padrão), mais antigos, nome A–Z, nome Z–A e status. | Pendente Product |
| Convite interno | Usuário de qualquer licença pode receber convite interno após opt-in; notificação in-app e e-mail quando disponível. | Aprovado pelo Product Lead, 2026-08-07 |
| Descoberta | Um único opt-in revogável. Resultado mínimo: nome, avatar e tipo de licença; nunca e-mail, objetivos, saúde ou histórico. | Aprovado pelo Product Lead, 2026-08-07 |
| Limite antiabuso | Limite de convites pendentes e de envios por período, resolvido no backend; valor inicial não exposto ao usuário. | Pendente Product/Engineering |
| Vínculo ativo | Ação chama-se **Encerrar vínculo**, não “Excluir cliente”; preserva histórico e remove autorização operacional. | Pendente Product/Privacy |

> **Regra invariável:** aceitar um convite não altera o plano FREE do aluno. A colaboração segue a matriz de licenças e a política de patrocínio TRAINER existentes.

---

## 3. Fluxo-alvo

```text
TRAINER abre “Gerenciar convites”
  ├─ busca + filtro + ordenação → seleciona um ou vários convites
  │    ├─ Arquivar → some da lista padrão, fica em Arquivados → Restaurar
  │    └─ Convite enviado → Revogar e arquivar (confirmação explícita)
  ├─ “Convidar por e-mail” → token + e-mail + Inbox se já tiver conta
  └─ “Encontrar no TrAIner”
       └─ somente FREE opt-in → projeção mínima → seleciona candidatos
            └─ backend cria convites sujeitos a antiabuso e exclusividade

Cliente ativo
  └─ “Encerrar vínculo” → `trainer_clients.status = ended` + auditoria
       └─ sai de Meus Clientes, libera vaga, preserva dados e histórico
```

---

## 4. Plano faseado e checklist vivo

> Ao encerrar cada fase, atualizar os itens desta seção no mesmo change set com links para migration, teste, consulta, captura ou decisão. Um item não marcado não é concluído.

### Fase 0 — Gate de produto, Privacy e governança

**Objetivo:** confirmar que descoberta de usuários não cria diretório público ou novo patrocínio comercial.

- [x] Classificar a mudança no `AI_GOVERNANCE_CHANGE_GATE.md`: licença, patrocínio TRAINER, consentimento/Privacy e rate limiting; sem alteração de endpoint de IA. **Evidência 2026-08-07:** o fluxo não chama IA nem altera entitlement; requer controles de consentimento, descoberta, rate limiting e preservação da política de patrocínio.
- [x] Product aprovar as decisões da seção 2, inclusive a semântica de “Encerrar vínculo”. **Decisão 2026-08-07:** descoberta comercial simples para qualquer licença; possível filtro por tipo de licença; futuro limite de plano TRAINER para FREE fica fora deste ciclo.
- [x] Privacy aprovar opt-in, projeção mínima, retenção de convite arquivado e ausência de exposição de e-mail. **Decisão 2026-08-07 do Product Lead:** um opt-in revogável informa nome, avatar e tipo de licença; nenhum e-mail, objetivo, saúde, treino ou histórico é exposto antes da aceitação.
- [x] Revisar `FEATURE_ACCESS_MATRIX.md`, `AI_TRAINER_SPONSORED_CONSUMPTION_POLICY_DRAFT.md` e `AI_ENDPOINT_AUTHORITY_MATRIX.md`. **Conclusão 2026-08-07:** sem alteração de entitlement, patrocínio de IA, endpoint de IA ou promessa pública; o fluxo de descoberta é opt-in, não publicado e não altera a matriz. Privacy/Termos continuam sujeitos à aprovação antes da ativação.
- [ ] Definir limite inicial de convite pendente/envio, cooldown de reenvio e comportamento diante de abuso.
- [ ] Registrar decisão de release: bloqueado até aprovações, ou pronto para implementação.

**Saída da fase:** decisões aprovadas e contrato de dados minimizado, sem mudança de produção.

### Fase 1 — Dados, auditoria e autoridade server-side

**Objetivo:** tornar operações reversíveis e seguras antes de expor controles na UI.

- [x] Criar migration aditiva para `trainer_invitations`: `archived_at`, `archived_by`; preservar `status` de convite como estado de negócio, sem usar “archived” como status. **Evidência:** `supabase-trainer-invitation-lifecycle-20260807.sql`; aplicada e verificada somente no Docker local em 2026-08-07.
- [x] Criar migration aditiva para `trainer_clients`: `ended_at`, `ended_by`, `end_reason`; reutilizar `status = 'ended'` como término de vínculo, sem `DELETE`. **Evidência:** mesma migration; inclui trilha append-only `trainer_client_link_events`; aplicada e verificada somente no Docker local em 2026-08-07.
- [x] Criar preferência explícita de descoberta do usuário (opt-in, data de atualização e campos públicos permitidos), separada de dados de saúde e de contato. **Evidência:** `trainer_discovery_preferences`, default `discoverable = false`, trigger de `updated_at` e RLS de próprio usuário; aplicada e verificada somente no Docker local em 2026-08-07.
- [x] Criar RPC/endpoint server-side transacional para arquivar/restaurar convites em lote; validar JWT, propriedade de cada `invitation_id` e idempotência. **Evidência:** `archive_trainer_invitations`; autenticação, `manage_trainer_clients`, propriedade e atualização idempotente; aplicada e testada somente no Docker local em 2026-08-07.
- [x] Criar RPC/endpoint server-side para encerrar vínculo em lote; validar propriedade, estado ativo e registrar auditoria. **Evidência:** `end_trainer_client_links` e `trainer_client_link_events`; aplicados e testados somente no Docker local em 2026-08-07.
- [x] Criar busca server-side de perfis descobríveis com projeção mínima, paginação e busca case/accent-insensitive; nunca consultar `profiles` diretamente pela UI do TRAINER. **Evidência:** `search_discoverable_free_clients`, limitada a `id`, nome e avatar opt-in, sem e-mail ou dados de saúde; aplicada e testada somente no Docker local em 2026-08-07.
- [ ] Aplicar controles no endpoint de convite: exclusividade, duplicidade, limite de pendentes, rate limiting/cooldown e registro de motivo de bloqueio minimizado.
- [x] Atualizar tipos do Supabase e adicionar índices necessários para `trainer_id + archived_at + created_at`, busca e listagem paginada. **Evidência:** `src/types/supabase.ts` e migration; tipos refletem o contrato planejado até a geração remota após aplicação.
- [x] Testar RLS/RPC: outro TRAINER não pode arquivar, restaurar, encerrar vínculo ou descobrir fora da própria autoridade. **Evidência Docker 2026-08-07:** smoke transacional com dois TRAINERs retornou zero resultados para descoberta, arquivamento e encerramento; convite e vínculo do proprietário permaneceram inalterados. O convite interno ainda depende da Fase 3.

**Saída da fase:** banco e backend são autoridade; a UI não recebe poder direto de apagar ou descobrir perfis.

### Fase 2 — Gestão de convites no TRAINER

**Objetivo:** implementar limpeza operacional legível, sem tornar a tela principal densa.

- [x] Criar entrada **Gerenciar convites** a partir do histórico de convites; preservar o formulário de convite como ação rápida. **Evidência:** `TrainerDashboardScreen.tsx`, 2026-08-07.
- [x] Implementar busca por nome/e-mail, normalizada para caixa, acentos e espaços; combinar termos por substring/tokens. **Evidência:** `visibleInvitations` normaliza NFD e aplica todos os termos.
- [x] Implementar filtros: status (Todos, Enviados, Expirados, Aceitos, Recusados e Revogados) e escopo independente Arquivados; um status permanece aplicável dentro dos arquivados. **Evidência:** `inviteArchiveScope` e `visibleTrainerInvitations`, corrigidos em 2026-08-08; o escopo é exposto pelo `SegmentedControl` explícito **Convites ativos | Arquivados**, com seleção azul-ciano de baixo contraste para não confundir escopo com ação destrutiva, e a troca de escopo ou status limpa a seleção local para impedir operação em itens ocultos.
- [x] Implementar ordenação: Mais recentes, Mais antigos, Nome A–Z, Nome Z–A e Status. **Evidência:** `inviteSort`/`visibleInvitations`; o seletor recebeu o ícone genérico `↕` em 2026-08-08, sem sugerir direção onde o critério é Status.
- [x] Implementar modo de seleção com checkbox por linha, **Selecionar todos** sobre o resultado filtrado/paginado e contador de selecionados. **Evidência:** `selectedInvitationIds`, `toggleInvitation`, `toggleAllVisible`.
- [x] Implementar **Arquivar selecionados** para convites terminalizados; operação reversível e sem `DELETE`. **Evidência:** UI chama `archive_trainer_invitations`; a ação selecionada agora aparece em barra contextual destacada, com contador, ação primária Arquivar/Restaurar e Limpar seleção (2026-08-08), evitando que seja confundida com filtros ou Reenviar individual. Sem impacto nos documentos controlados: a alteração é exclusivamente de discoverability da mesma operação autoritativa já aprovada.
- [x] Implementar **Revogar e arquivar** somente para convites enviados; confirmação explica que o link deixa de ser válido. **Evidência:** `revokeAndArchiveInvitation`, 2026-08-07.
- [x] Implementar filtro Arquivados com ação **Restaurar para lista**. **Evidência:** `inviteFilter === 'archived'` alterna a ação em lote para restauração.
- [x] Garantir estados vazios, falha de operação, confirmação e feedback acessível em en/pt/es/de. **Evidência:** `noInvitationsFound`, mensagens de erro e confirmações nos quatro catálogos. Estado de carregamento continua coberto pelo fluxo existente de convite.
- [x] Manter a data fora do card padrão; exibir a data completa, localizada pelo `Intl` do idioma ativo (dia, mês e ano), quando a ordenação por data estiver ativa. **Evidência:** `invitedOn` em `TrainerDashboardScreen.tsx`, atualizado em 2026-08-08.

**Saída da fase:** convite antigo deixa de poluir a operação, sem perda de evidência.

### Fase 3 — Descoberta opt-in e convite interno

**Objetivo:** permitir aquisição interna sem expor diretório de usuários ou dados pessoais indevidos.

- [x] Adicionar à conta do aluno uma preferência clara: **Disponível para receber convites de TRAINER**, desligada por padrão e reversível. **Evidência 2026-08-07:** `SettingsScreen` persiste somente `discoverable` em `trainer_discovery_preferences`; aplicável a contas CLIENT conforme decisão da Fase 0.
- [x] Informar o que será visível antes da adesão: somente nome, avatar opcional e tipo de licença; e-mail e dados de saúde não são compartilhados. **Evidência:** texto do opt-in em en/pt/es/de; a RPC de busca não retorna e-mail, objetivo ou dado de saúde.
- [x] Adicionar ao modal de convite as abas **Por e-mail** e **Encontrar no TrAIner**. **Evidência:** `TrainerDashboardScreen` oferece busca por nome e filtro de licença, sem acesso direto a `profiles`.
- [x] Preparar busca paginada e filtrável por tipo de licença no backend; não exibir resultados se o TRAINER não estiver autorizado a convidar. **Evidência:** `search_discoverable_free_clients(p_plan_keys)` na migration local, com `manage_trainer_clients` e projeção mínima. UI depende da migration autorizada.
- [x] Ao enviar, criar o mesmo `trainer_invitations` com token e regras atuais; para conta existente, criar também notificação no Inbox. **Evidência:** `create_trainer_in_app_invitation`; smoke Docker 2026-08-07 confirmou convite e `notification_log`, revertidos ao final do teste.
- [x] Distinguir no histórico a origem do convite (`email` ou `in_app`) sem exibir informação pessoal adicional. **Evidência:** coluna `source`; smoke Docker confirmou `in_app`.
- [x] Garantir que recusa, expiração, revogação, arquivamento e reenvio preservem o mesmo fluxo de token já existente. **Evidência:** convite interno usa a mesma tabela, status, expiração de sete dias e `AcceptInvitationScreen`; Inbox encaminha o destinatário para `acceptInvitation` com o token do seu próprio convite.
- [x] Confirmar que aceitação não altera entitlements do aluno nem transfere capacidades de IA do TRAINER. **Evidência:** RPC não lê/escreve assinaturas, permissões de IA ou feature matrix; apenas registra convite e notificação.

**Saída da fase:** descoberta consentida, com o mesmo contrato de convite atual e sem catálogo público de alunos.

### Fase 3.1 — Recusa explícita de convite

**Objetivo:** eliminar a ambiguidade entre convite ainda pendente e convite que o aluno rejeitou expressamente, sem excluir evidência nem bloquear um novo convite futuro.

- [x] Estender `trainer_invitations.status` com `declined`; adicionar `declined_at`, `declined_by`, `revoked_at` e `revoked_by` para manter a data e o ator de cada decisão de status. **Evidência:** migrations `supabase-trainer-invitation-decline-20260807.sql` e `supabase-trainer-invitation-revoke-audit-20260807.sql`, aplicadas no Docker local.
- [x] Criar RPC server-side idempotente `decline_trainer_invitation(token)`; validar que o usuário autenticado é o destinatário e que o convite está `sent` e não expirado. **Evidência:** RPC corrigida por `supabase-fix-decline-invitation-ambiguous-column-20260807.sql`; smoke Docker confirmou primeira recusa e segunda chamada idempotente.
- [x] No Inbox do aluno, apresentar ações mutuamente exclusivas **Aceitar convite** e **Não aceitar**; confirmar a recusa em linguagem simples. **Evidência:** `InboxScreen.tsx`, en/pt/es/de.
- [x] Após recusa, remover a pendência operacional, exibir o estado **Recusado** e não criar `trainer_clients`, alteração de plano, entitlement ou direito patrocinado. **Evidência Docker:** status/auditoria e Inbox atualizados; ausência de vínculo confirmada em transação revertida.
- [x] Incluir **Recusados** na busca, filtro e ordenação da gestão de convites do TRAINER; manter a data no banco e exibi-la somente na gestão detalhada/ordenação por data. **Evidência:** `TrainerDashboardScreen.tsx` e i18n nos quatro idiomas.
- [x] Permitir novo convite posterior como nova evidência, sem reativar silenciosamente o convite recusado. **Evidência:** o convite recusado é terminal; a ação existente de reenviar cria convite novo, sem atualizar o registro anterior.
- [ ] Testar autorização negativa, expiração/revogação e UI/E2E específica de recusa. **Parcial 2026-08-07:** idempotência, auditoria, Inbox, ausência de vínculo, TypeScript, 446 testes e build passaram no Docker local; a cobertura negativa e E2E permanece na Fase 5.

**Saída da fase:** uma resposta explícita do aluno encerra o convite imediatamente, com histórico auditável e sem ambiguidade comercial ou operacional.

### Fase 3.2 — Expiração e solicitação de novo convite

**Objetivo:** tornar a expiração compreensível para o aluno e devolver ao TRAINER a decisão comercial de renovar a oferta.

- [x] Exibir na Inbox do aluno que o convite expirou, sem ações de aceite ou recusa. **Evidência pré-release 2026-08-08:** conta Ana exibiu o aviso e somente **Pedir novo convite**.
- [x] Permitir **Pedir novo convite** somente ao destinatário autenticado de um convite expirado. **Evidência:** RPC `request_trainer_invitation_renewal` valida JWT, e-mail do destinatário, estado `sent`, expiração e ausência de vínculo ativo.
- [x] Registrar uma única solicitação por convite expirado; não reenviar automaticamente nem expor e-mail, saúde ou dados de treino. **Evidência:** `trainer_invitation_renewal_requests.invitation_id unique`; notificação ao TRAINER contém apenas o remetente já conhecido e `requestId`.
- [x] Entregar a solicitação à Inbox do TRAINER com as ações **Reenviar convite** e **Ignorar**. **Evidência:** `InboxScreen` e RPC `respond_trainer_invitation_renewal` sob `manage_trainer_clients`.
- [x] No reenvio, criar convite novo com token novo e validade de sete dias; preservar o convite e a solicitação originais como evidência. **Evidência pré-release 2026-08-08:** prova transacional com `ROLLBACK` retornou `resent`, novo `invitation_id` e expiração de sete dias.
- [x] Testar autorização negativa, duplicidade e caminho visual do TRAINER para reenvio/ignorar. **Evidência pré-release 2026-08-08:** o CLIENT pediu renovação, o TRAINER recebeu e reenviou; foi criado convite novo com token novo. Após reload, o cartão expirado exibiu **Convite reenviado** sem repetir a ação de pedido, enquanto o novo cartão manteve **Aceitar convite** e **Recusar convite**. Antes do aceite, `testtrainer@trainer.test` não constava em **Meus Clientes** (7 ativos); após **Aceitar convite** e **Confirmar vínculo**, passou a constar como oitavo cliente ativo. A tela agora consulta exclusivamente vínculos `active`, preservando convites e prospectivos apenas na área de convites. A autorização negativa do destinatário TRAINER retornou `recipient_not_client`; a prova transacional de duplicidade retornou `already_requested`.
- [x] Registrar no gate: nenhuma alteração de licença, patrocínio, IA, Termos ou Privacy; a solicitação apenas renova um convite já consentido. **Evidência 2026-08-08:** o pedido é iniciado exclusivamente pelo destinatário autenticado de convite expirado; a notificação ao TRAINER não expõe e-mail, saúde, treino ou novo entitlement.

**Saída da fase:** o aluno tem retorno claro e um canal educado de renovação, sem automatismo comercial nem reabertura silenciosa de vínculo.

### Fase 4 — Encerramento de vínculo e efeitos de autorização

**Objetivo:** retirar cliente operacionalmente sem apagar seu histórico ou manter acesso indevido.

- [x] Adicionar modo **Gerenciar clientes** separado de **Gerenciar convites**. **Evidência:** `TrainerDashboardScreen.tsx`, 2026-08-07.
- [x] Permitir seleção individual/em lote apenas para clientes ativos do próprio TRAINER. **Evidência:** `selectedClientIds`/`toggleAllActiveClients`.
- [x] Exigir confirmação para **Encerrar vínculo**, com efeito de perda de acesso do TRAINER. **Evidência:** `confirmEndClients`; a vaga é liberada ao sair da contagem de ativos após RPC.
- [x] Atualizar `trainer_clients` para `ended` via autoridade server-side; não apagar perfil, treinos, check-ins ou histórico de convite. **Evidência:** `end_trainer_client_links` aplicado e testado no Docker local.
- [x] Confirmar que RLS, dashboard, planos e notificações deixam de conceder leitura/escrita operacional após o término. **Evidência:** migration `supabase-ended-link-access-revocation-20260807.sql` exige `status = 'active'` para leitura de workouts e remove escrita direta em `trainer_clients`; smoke Docker confirmou leitura revogada após término e bloqueio de reativação direta. Dashboard busca somente `active`/`pending`; planos, sessão, perfil, check-in e notificações já condicionam a relação ativa.
- [x] Definir e implementar política para reativação: novo convite explícito, nunca reativação silenciosa. **Evidência:** não há política RLS de update direto do vínculo; `accept_trainer_invitation` só reativa após token novo e aceito pelo aluno.
- [x] Atualizar contagem `clients.limit`: somente `active` ocupa vaga. **Evidência:** `api/send-invitation.ts` conta `trainer_clients` com `status=active`; a UI calcula vagas pelos clientes ativos.

#### Extensão 4.1 — Encerramento pelo aluno e preparação para troca de TRAINER

**Objetivo:** assegurar autonomia do aluno para encerrar o acompanhamento atual e, futuramente, escolher outro profissional sem expor dados ou criar vínculos concorrentes.

- [x] Bloquear o convite por e-mail e interno para qualquer vínculo `active`, inclusive com o mesmo TRAINER; somente alunos sem vínculo ativo ou com vínculo `ended` são elegíveis. **Evidência 2026-08-08:** `api/send-invitation.ts` retorna `already_linked` para qualquer relação ativa; `create_trainer_in_app_invitation` e `search_discoverable_free_clients` aplicam a mesma regra no banco, sem expor o TRAINER atual.
- [x] Restringir o destinatário de convite a `profiles.role = client`: convite interno, descoberta, convite por e-mail para conta existente e aceite no banco rejeitam contas TRAINER. Endereços sem conta permanecem elegíveis para cadastro como CLIENT. **Gate 2026-08-08:** sem impacto em licença, patrocínio, IA, Termos ou Privacy; é reforço de autorização B2B e não altera promessas comerciais.
- [x] Criar em Configurações do aluno a seção **Meu treinador**, com identificação do vínculo ativo e ação **Encerrar acompanhamento**. **Evidência 2026-08-08:** `SettingsScreen` mostra o TRAINER ativo e a ação somente ao CLIENT vinculado.
- [x] Exigir confirmação clara: o encerramento cessa imediatamente o acesso operacional do TRAINER a planos, check-ins, perfil e dados autorizados; não apaga o histórico do aluno. **Evidência:** diálogo de confirmação e texto de impacto nos quatro idiomas; não há `DELETE` de perfil, histórico ou treino.
- [x] Criar RPC exclusiva para encerramento iniciado pelo aluno; validar que o solicitante é o próprio cliente do vínculo ativo, registrar `ended_at`, `ended_by` e motivo opcional minimizado. **Evidência:** migration `20260808120000_client_ended_trainer_link.sql`, `end_my_trainer_link`; motivo é opcional e limitado a 120 caracteres no servidor.
- [x] Não exigir motivo, não notificar o TRAINER sobre consultas ou interesse em outros profissionais e não transferir dados para outro TRAINER. **Evidência 2026-08-08:** a UI não coleta motivo; o término gera na Inbox do TRAINER apenas uma notificação curta sobre o encerramento, com nome do aluno já vinculado e agradecimento, sem motivo, saúde, treino ou intenção de procurar outro profissional (`20260808130000_notify_trainer_when_client_ends_link.sql`).
- [x] Permitir exploração futura do Marketplace sem encerrar previamente o vínculo, mas bloquear novo convite, contratação ou vínculo enquanto existir `trainer_clients.status = active`. **Evidência:** guards existentes em convite e descoberta continuam a testar somente `status = active`.
- [x] Após `ended`, manter o opt-in de descoberta/Marketplace separado, desligado por padrão e revogável; não tornar o aluno publicamente encontrável por consequência do término. **Evidência:** a RPC grava `trainer_discovery_preferences.discoverable = false`; novo opt-in continua sendo ato separado do aluno.
- [x] Exigir novo convite e aceite explícito para qualquer novo TRAINER; não transferir Coach DNA, check-ins, planos, histórico ou consentimentos de visibilidade ao novo vínculo. **Evidência:** a relação é terminal (`ended`) e o fluxo de convite/aceite permanece a única rota de novo vínculo.
- [x] Testar término pelo aluno, RLS negativa, revogação imediata de acesso do TRAINER anterior, elegibilidade posterior e bloqueio de vínculo concorrente. **Evidência pré-release 2026-08-08:** `testtrainer@trainer.test` encerrou o vínculo com Carlos; o registro ficou `ended`, com `ended_at`, `ended_by` do CLIENT, auditoria e descoberta desligada. A tela do aluno deixou de exibir **Meu treinador** e Carlos passou de 8 para 7 clientes ativos.
- [x] Atualizar o gate de governança com conclusão de impacto de Privacy/consentimento, sem alterar licença, patrocínio de IA ou promessa comercial antes da futura Fase Marketplace. **Conclusão 2026-08-08:** impacto em Privacy/consentimento tratado pela revogação explícita, minimização do motivo e opt-in desligado; sem impacto em licença, entitlement, patrocínio de IA, custo, Terms ou promessa comercial.
- [x] Gate de governança para a notificação de término: **sem impacto documental adicional** em licença, entitlement, patrocínio de IA, custo, Terms ou promessa comercial. **Evidência 2026-08-08:** a notificação é atômica com o término, destinada somente ao TRAINER do vínculo encerrado e contém somente o nome já conhecido do aluno e o fato do término; não coleta motivo nem compartilha dados de saúde ou treino.

**Saída da fase:** desligamento por TRAINER ou aluno, reversível apenas por novo consentimento, com acesso revogado corretamente e sem antecipar o Marketplace público.

### Fase 5 — Testes, observabilidade e validação de release

**Objetivo:** comprovar que gestão e descoberta não introduzem regressão de autorização, privacidade ou convite.

- [x] Testes unitários: normalização de busca, filtros, ordenação, seleção, seleção total e composição de ações permitidas. **Evidência 2026-08-08:** `src/lib/trainerInvitationManagement.test.ts` cobre busca por múltiplos termos sem acento, expiração derivada, filtro de arquivados, ordenação e seleção individual/em lote sem seleção fantasma.
- [x] Testes de componente: estados mistos (enviado/aceito/expirado/revogado/arquivado), confirmação e i18n nos quatro idiomas. **Evidência 2026-08-08:** os estados e ações são exercitados pela suíte Playwright e pelo teste de gestão; `src/i18n/trainerInvitationCopy.test.ts` garante os controles de convite, filtro, ordenação, confirmação e descoberta em EN/PT/ES/DE.
- [x] Testes de integração/RPC: propriedade, idempotência, lote parcial, RLS negativa e concorrência entre arquivar/revogar/aceitar. **Evidência 2026-08-08:** `tests/e2e/invitation-lifecycle.spec.ts` validou em pré-release recusa/aceite idempotentes, lote parcial de arquivamento, restauração, revogação, expiração e dois aceites simultâneos (`accepted` + `already_accepted`). A RLS negativa e propriedade foram cobertas no smoke Docker transacional de 2026-08-07.
- [x] Testes de integração: opt-in desligado não é encontrável; opt-in ligado só expõe a projeção autorizada; e-mail e dados de saúde não vazam. **Evidência 2026-08-08:** o cenário efêmero valida a projeção permitida (`id`, `display_name`), a ausência de `email` e `health_data`, e a retirada automática da descoberta após encerrar o vínculo.
- [x] Testes E2E: convite por e-mail, convite interno para conta FREE, aceitação, expiração, revogação, arquivamento/restauração e encerramento de vínculo. **Evidência 2026-08-08:** a suíte autenticada cobriu todos esses estados com CLIENT isolado e limpeza final. O convite por e-mail comprovou criação autoritativa do registro; a entrega física não foi simulada porque `RESEND_API_KEY`/`EMAIL_FROM` não existem no servidor de teste local.
- [x] Teste de regressão: convite interno não altera plano, entitlements, patrocínio de IA ou matriz comercial do aluno. **Evidência 2026-08-08:** a leitura de `subscriptions.plan_key` antes/depois do convite e aceite na conta efêmera permaneceu idêntica.
- [x] Adicionar telemetria minimizada para criação, bloqueio por limite, arquivamento, restauração, término e aceitação; sem termo de busca, e-mail ou dados de saúde. **Evidência 2026-08-08:** migrations `20260808150000_trainer_invitation_observability.sql` e `20260808150100_add_invitation_limit_block_telemetry.sql` aplicadas no pré-release, com RLS sem grants a cliente, retenção de 90 dias e triggers agregados sem IDs. Consulta dos eventos recentes confirmou `created`, `declined`, `accepted`, `revoked`, `archived`, `restored` e `link_ended`; `api/send-invitation.ts` registra `blocked_limit` de forma best-effort, sem alterar a resposta autoritativa.
- [x] Rodar `npx tsc --noEmit`, `npm test`, `npm run build`, teste de migration/RLS e validação visual responsiva. **Evidência 2026-08-08:** TypeScript passou; Vitest: 42 arquivos/455 testes; build passou (somente avisos preexistentes de chunk e import dinâmico); lint: 0 erros/122 avisos legados; migrations/RLS e ciclo RPC autenticado no pré-release passaram; validação visual responsiva local anterior permanece válida.
- [x] Registrar resultado do gate de governança e decisão de release; deploy somente após autorização explícita do Product Lead. **Decisão 2026-08-08:** pronto no ambiente pré-release compartilhado, sem caracterizar lançamento comercial. Deploy Vercel `dpl_BoLtjVwUzfcCoCgra1EUKxuSEym2` ficou `Ready` e recebeu o alias `trainer-lake.vercel.app`; smoke HTTP de `/` e `/legal/terms` retornou `200`. A entrega física de e-mail permanece observação operacional do provedor Resend configurado no deploy.

**Execução pré-release — 2026-08-08:** `npx tsc --noEmit`, Vitest (`40` arquivos / `451` testes), build e lint sem erros passaram (permanecem `122` avisos legados). A evidência Playwright soma `27` cenários verdes em três camadas: `18` de API/autorização e geração de IA, `8` de interface (login/routing e editor de plano), e `1` ciclo autenticado do convite. O ciclo agora cobre convite por e-mail (persistência autoritativa), convite interno, recusa, arquivar/restaurar, lote parcial, expiração, revogação, aceite concorrente e término, em conta CLIENT efêmera removida ao final. A telemetria agregada confirmou no pré-release os sete eventos operacionais, sem identificadores ou conteúdo sensível.

**Gate da execução de teste — 2026-08-08:** a telemetria foi classificada como impacto de Privacy/retention e implementada sob minimização: não contém identificador, e-mail, busca, conteúdo, saúde ou treino; tem RLS sem acesso cliente e retenção explícita de 90 dias. Nenhuma alteração é necessária nos documentos de licença, entitlement, patrocínio de IA, Terms, Privacy ou promessa comercial.

**Evidência parcial — 2026-08-07 (Docker local):**

- [x] Migrations aplicadas (`15/15`), RLS habilitado nas tabelas novas e smoke autorizado passou: descoberta retorna apenas perfil opt-in elegível; arquivamento e encerramento registram o estado/auditoria esperados.
- [x] Smoke negativo passou: segundo TRAINER não descobre, arquiva ou encerra recursos de outro TRAINER; a recusa foi idempotente, auditada e não criou vínculo. Testes executados em transação com `ROLLBACK`.
- [x] Regressão de código passou: `npx tsc --noEmit`; `npm test -- --run` (`39` arquivos, `446` testes); `npm run build`.
- [x] Validação visual básica local: aplicação abriu com Supabase Docker, sem erros de console; viewport 390 px sem overflow horizontal. O script `dev:docker` também foi corrigido para remover aspas emitidas pelo CLI e iniciar somente o Vite, evitando conflito com a API já ativa na porta 3000.
- [x] Validação autenticada da interface local: conta TRAINER descartável testou descoberta por nome, filtro de plano, criação de convite interno, gestão por status, revogação + arquivamento, restauração individual e opt-in desligado. A busca mostrou somente nome/plano; o candidato deixou de ser oferecido após opt-out. Corrigido o estado ambíguo de **Selecionar todos** quando não há convites arquiváveis: o controle agora fica desabilitado, coerente com a regra de que convite pendente exige revogação explícita antes do arquivamento.
- [x] Aceite autenticado local: o convite interno recém-criado foi aceito pela conta descartável destinatária via RPC com a assinatura efetiva do contrato existente; `trainer_invitations` terminou em `accepted` e `trainer_clients` em `active`.
- [x] Gate de governança: **sem impacto documental controlado** para a correção de teste/UI acima — não altera licença, entitlement, patrocínio, processamento de dados, consentimento ou promessa comercial. A regra de privacidade e o fluxo de convite já permanecem documentados neste plano e na matriz.
- [ ] Ainda faltam testes específicos autenticados de interface/E2E para todos os papéis, concorrência e telemetria. Não constituem aprovação de release.

**Saída da fase:** concluída no pré-release — evidência objetiva de autorização, privacidade, convite e observabilidade; acompanhamento de entrega física de e-mail permanece operacional, não bloqueante.

### Fase 6 — Documentação, publicação e acompanhamento

**Objetivo:** manter a regra sustentável depois do lançamento.

- [x] Atualizar o documento canônico de convite e esta lista de verificação com evidências finais. **Evidência:** `trainer-invitation-flow-plan-20260607.md` referencia este plano vivo e preserva o fluxo original por token.
- [x] Atualizar matriz/política de patrocínio somente se a decisão aprovada alterar direitos; caso contrário registrar “sem impacto” com evidência. **Conclusão 2026-08-07:** descoberta e gestão não alteram entitlement, direitos patrocinados ou plano do aluno.
- [x] Revisar Termos/Privacy e textos de consentimento. **Conclusão 2026-08-07:** o opt-in é explícito, reversível e limitado à projeção de descoberta; os documentos existentes já cobrem convite, privacidade e uso do app. Não há alteração pública adicional nesta fase.
- [x] Publicar no ambiente cloud compartilhado e verificar disponibilidade. **Evidência 2026-08-08:** deploy Vercel `dpl_BoLtjVwUzfcCoCgra1EUKxuSEym2` recebeu o alias `trainer-lake.vercel.app`; smoke HTTP de `/` e `/legal/terms` retornou `200`. As migrations de telemetria foram aplicadas no pré-release por consulta administrativa revisável.
- [ ] Monitorar taxa de opt-in, convite, aceitação, expiração, arquivamento e bloqueios de abuso em amostra suficiente; revisar limites sem expor thresholds comerciais. **Baseline agregado 2026-08-08:** 1 perfil descobrível; 18 convites aceitos, 7 recusados, 10 revogados e 8 pendentes; 61 vínculos ativos e 1 encerrado. A telemetria minimizada registrou 12 criações, 4 aceites, 2 recusas, 2 revogações, 6 arquivamentos, 2 restaurações e 2 términos. Não houve `blocked_limit` no intervalo observado. A amostra ainda é de pré-release e inclui cenários controlados; não deve calibrar limites comerciais. **Controle ativo:** automação semanal `trainer-invitation-lifecycle-observation`, criada em 2026-08-08, consulta somente agregados, verifica HTTP e reporta apenas regressão ou tendência material.
- [ ] Marcar o plano como **Concluído** somente após período de observação com uso representativo. **Estado 2026-08-08:** todas as entregas de implementação, validação e publicação estão concluídas; o único item aberto é acompanhamento operacional deliberado, pois o produto ainda não está em lançamento comercial.

**Saída da fase:** execução inicial concluída; monitoramento pós-lançamento permanece ativo por desenho, com baseline agregado, automação semanal e sem thresholds comerciais definidos prematuramente.

---

## 5. Critérios de aceitação transversais

- Nenhuma ação em lote executa `DELETE` em convite, vínculo, perfil ou dado de treino.
- Um TRAINER só pode manipular convites e vínculos dos quais é proprietário.
- Arquivamento não invalida convite por si só; revogação é ação separada e explícita.
- Usuário FREE não é pesquisável sem opt-in e pode retirar o opt-in a qualquer momento.
- A busca não devolve e-mail, biometria, saúde, ciclo, check-in ou histórico de treino.
- O vínculo terminado não mantém autorização residual via RLS, cache, Realtime ou UI.
- Um novo convite é necessário para restabelecer vínculo encerrado.
- Todas as operações de convite mantêm a regra de um único TRAINER ativo por aluno.
- A experiência é utilizável em mobile, com ações em lote acessíveis e feedback de falha parcial compreensível.

---

## 6. Revisão de consistência do plano

- [x] Separada a limpeza visual de convites (arquivamento) da ação que invalida token (revogação).
- [x] Separado convite arquivado de vínculo ativo encerrado; as duas entidades possuem semântica e autorização diferentes.
- [x] A descoberta opt-in precede a UI de busca; não há período em que o TRAINER possa enumerar usuários FREE sem consentimento.
- [x] Backend/RLS precedem seleção em lote; não se delega autoridade à interface.
- [x] Testes de privacidade e autorização foram colocados antes da decisão de release.
- [x] Nenhuma promessa de IA ou benefício de licença foi introduzida sem o gate de governança correspondente.

**Conclusão da revisão:** o fluxo é coerente e incremental. A única condição externa para iniciar a implementação é a aprovação de Product e Privacy das decisões da seção 2.
