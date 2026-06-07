# Plano de Convergência de Padrões — 2026-06-07

**Origem:** `architecture-standards-audit-20260607.md`
**Objetivo:** alinhar o sistema aos pilares de modularidade, reuso, UX/UI
previsível sob design system central, estabilidade e segurança — focando nos
6 arquivos identificados como concentradores dos desvios.

**Princípio de execução:** cada fase é incremental, reversível e validada por
`tsc --noEmit` + `eslint` + `npm run build` + smoke-test da tela afetada antes
do commit. Investigar antes de agir — se a investigação mostrar escopo menor
que o estimado, re-baselinear e documentar (padrão já validado no ciclo anterior).

---

## Fase 1 — Fundações de design system (componentes compartilhados)

**Status: executado 2026-06-07.**

- [x] Criado `Spinner`/`LoadingState` em `src/ui/Spinner.tsx` (props `color`,
      `trackColor`, `size`, `thickness`), substituindo as 6 implementações
      locais identificadas: `Step15RiskClassification`, `CheckInVoice`,
      `WorkoutModeScreen`, `StartWorkoutScreen`, `PerformanceDashboardScreen`
      (que tinha um `LoadingState` próprio) e `WorkoutPlanEditorScreen`
      (que também teve um `<style>@keyframes spin{}</style>` órfão removido)
- [x] Paleta de cores semânticas de status — **investigado e não centralizado
      por escolha deliberada**: o verde `#10B981` em `TrainerDashboardScreen.tsx:411`
      é um indicador de "sessão ativa" com animação `pulse` própria (distinta do
      `success` do tema, `#4ADE80`, usado para tons de arquétipo/ícones). É um
      uso único, não duplicado — criar um token novo para um único consumidor
      seria over-engineering. Fica registrado para reavaliação durante a Fase 3
      (convergência do `TrainerDashboardScreen`), quando o contexto completo do
      arquivo estiver em revisão
- [x] Criado `src/lib/format.ts` — `formatDate`/`formatTime`/`formatDateTime`/
      `formatNumber`/`formatDecimal`, todos resolvendo o locale via `BCP47`
      (já existente em `src/i18n`) a partir de `i18n.language`. Adotado nos
      dois piores outliers (locale fixo `'en-GB'` independente do idioma do
      usuário): `CycleScreen.tsx` e `HistoryScreen.tsx`. Os demais call sites
      já usavam `i18n.language || 'en-US'` corretamente — não precisam de
      migração obrigatória nesta fase, mas podem adotar o helper
      oportunisticamente durante a Fase 3 para reduzir duplicação de opções `Intl`
- [x] Validado `tsc --noEmit` (limpo), `eslint` (232 warnings, 0 erros — mesma
      baseline pré-existente, nenhum novo problema introduzido), `npm run build`
      (sucesso)
- [x] Commit: `feat(ui): add shared Spinner and i18n-aware date/number formatters` (`bec5cb8`)

## Fase 2 — Inspeção dirigida de Empty States e confirmações destrutivas

**Status: investigado 2026-06-07 — fechado, sem mudança de código.**

### Empty States

Inspecionadas as 5 telas amostradas. Todas tratam "sem dados" — não há
ausência de tratamento —, mas cada uma com sua própria marcação inline:

| Tela | Implementação | Estilo |
| --- | --- | --- |
| `InboxScreen.tsx:232` | `<div padding:'48px 22px' textAlign:'center'>` + `<Icon name="bell"/>` + texto | Com ícone |
| `HistoryScreen.tsx:122` | `<div padding:'32px 0' textAlign:'center'>` + texto | Só texto |
| `TrainerClientDetailScreen.tsx:578,711` | `<div color:textMute fontSize:12>` + texto | Só texto, inline na lista |
| `PerformanceDashboardScreen.tsx:83` | `<div padding:60 textAlign:'center' fontFamily:FF_MONO>` + texto | Só texto, fonte distinta |
| `StartWorkoutScreen.tsx` | Não possui — tela sempre tem conteúdo (fallback de plano) | N/A |

**Achado:** existe duplicação real (4 variações de "centralizar texto cinza
muted em padding"), mas o impacto visual é baixo — todas convergem
visualmente para "texto muted centralizado", com pequenas variações de
padding/fonte/ícone que refletem o contexto de cada tela (lista cheia vs.
dashboard vs. inbox). Criar um componente `EmptyState` agora exigiria definir
uma API genérica o bastante para cobrir "com ícone", "sem ícone", "inline em
lista" e "full-bleed dashboard" — abstração prematura para 4 ocorrências que já
funcionam e não geram confusão ao usuário. **Decisão: não criar componente
agora; registrar o padrão para quando uma 5ª variação aparecer** (sinal de que
a abstração se pagaria).

### Confirmações de ação destrutiva

Varredura completa por handlers `onClick`/`handle*` de cancelar/remover/excluir
em `src/screens/` encontrou **apenas uma** confirmação de ação destrutiva real
em todo o sistema: o modal de cancelamento de plano em
`StartWorkoutScreen.tsx:889-940` (bottom-sheet com overlay, título, corpo
explicativo "não pode ser desfeito" e botões Manter/Cancelar). O único outro
hit (`TrainerLibraryExercisesScreen.tsx:770`) é um botão "Cancelar" de
formulário de edição — não uma ação destrutiva, não precisa de confirmação.

**Achado:** não há padrão a convergir porque não há duplicação — existe um
único caso de confirmação destrutiva no sistema inteiro. Construir um
`ConfirmDialog` compartilhado agora seria abstrair a partir de uma amostra de
1, o oposto do que os pilares de modularidade pedem. **Decisão: não criar
componente; o modal existente em `StartWorkoutScreen` serve como referência de
padrão para o *próximo* caso que surgir** (nesse momento, com 2 ocorrências
reais, a extração para `src/ui/` se justifica).

- [x] Empty States — 5 telas inspecionadas, padrão registrado, decisão:
      não criar componente agora (duplicação real, mas baixo impacto e
      variações legítimas de contexto — abstração prematura)
- [x] Confirmações destrutivas — varredura completa, decisão: não criar
      componente (amostra de 1, sem duplicação a convergir)
- [x] Nenhuma mudança de código necessária — fase fechada por investigação

## Fase 3 — Convergência das 6 telas concentradoras (uma por vez)

Ordem sugerida: da menor para a maior, para validar o método antes de aplicá-lo
ao arquivo mais arriscado (`PerformanceDashboardScreen`, 1043 linhas).

Para cada tela: (a) substituir cores hex/spinners locais pelos tokens/componentes
da Fase 1; (b) avaliar se o acesso direto ao Supabase deve migrar para um hook
dedicado (sem migração funcional especulativa — só onde reduzir acoplamento sem
risco real); (c) avaliar split de sub-componentes apenas onde há responsabilidade
claramente separável (não dividir por tamanho, dividir por coesão).

- [x] `WorkoutPlanEditorScreen.tsx` (559 linhas, acesso direto ao Supabase) —
      **investigado e convergido 2026-06-07.** A estimativa original de
      "44 cores hardcoded" não se sustentou: o arquivo tem apenas 6 literais
      (`#fff` ×2 — uso pontual em botões, sem padrão a convergir; e uma família
      `#10B981`/`#10B98118`/`#10B98155` — CTA "iniciar sessão ao vivo"). Esse
      verde já havia sido visto em `TrainerDashboardScreen.tsx:411` como
      indicador de "sessão ativa" — **2 ocorrências reais** mudam o veredito da
      Fase 1 (que adiou a criação de token por ser amostra de 1). Criado
      `liveAction: '#10B981'` em `BRAND`/`TRAINER_BRAND` (`src/theme/tokens.ts`)
      e adotado nos dois arquivos via `t.liveAction`. A única chamada Supabase
      (`plan_exercises.insert`) está fortemente acoplada ao fluxo de salvar —
      extrair para hook adicionaria indireção sem reduzir risco; mantida como
      está. Nenhum split de sub-componente — responsabilidades já coesas.
      Validado `tsc`/`eslint` (232 warnings, 0 erros)/`build` — todos limpos.
- [x] `TrainerLibraryExercisesScreen.tsx` (825 linhas, 34 cores hardcoded estimadas)
      — **investigado e convergido 2026-06-07.** Achados:
      (1) **sem acesso direto ao Supabase** — a estimativa original também não
      se sustentou aqui (a tela usa `useExerciseData()`, já abstraído);
      (2) `'#0E1A2B'` ("ink" — texto sobre superfície de marca em abas/badges
      ativos) repetido 8× — convergido para constante local `INK`, com
      comentário documentando que é o mesmo hex de `primaryBtn`/`DARK.bg`
      (mantido local por ser regra de contraste específica desta tela, não
      um token de marca geral); (3) paleta de status de exercício
      (active/blocked/restricted/draft/neutral — vermelho/âmbar/verde/roxo/
      cinza) duplicada 16× entre o `badgeColor()` local e literais inline em
      `ExerciseDetailModal` (componente irmão, sem acesso ao closure) —
      convergida para `STATUS_TONES`/`statusTone()` em escopo de módulo,
      compartilhados pelos dois componentes. As cores roxas do painel de
      voz/IA (`rgba(110,68,255,...)`) foram **mantidas como estão** — são um
      tom visualmente próximo mas tecnicamente distinto (`#9b51e0` vs base
      `110,68,255`), específico do contexto de IA, não do status do exercício;
      convergi-las seria alterar uma decisão visual, não eliminar duplicação real.
      Validado `tsc`/`eslint` (232 warnings, 0 erros)/`build` — todos limpos.
- [x] `TrainerDashboardScreen.tsx` (686 linhas, 42 cores hardcoded estimadas,
      acesso direto ao Supabase) — **investigado e convergido 2026-06-07.**
      Achados: (1) o arquivo já continha dois mapas semânticos locais
      (`SEVERITY_COLOR`/`PRIORITY_COLOR` — critical/high/medium/low e
      urgent/high/medium/low) que **coincidiam exatamente** com literais
      hex repetidos em outros pontos do mesmo arquivo (`#EF5B3C`, `#F5A623`,
      `#4ade80`, `#2DD4BF`) sem referenciá-los — clássico "abstração já
      existe, só não é usada consistentemente"; convergidos ~14 literais
      para `SEVERITY_COLOR.critical/high/low` e `PRIORITY_COLOR.medium`
      (inclusive os fallbacks `?? '#F5A623'`/`?? '#2DD4BF'` que duplicavam
      os próprios valores dos mapas); (2) o chrome estático dos painéis
      "Safety Gate" e "Alerts" (fundo/borda/badge sempre na cor crítica,
      independente do conteúdo) usava `#EF5B3C` cru — convergido para
      `t.accent` (idêntico em `BRAND`/`TRAINER_BRAND`), correto porque é
      a identidade do painel, não uma severidade dinâmica; (3) removido
      `@keyframes livePulse` órfão (definia `box-shadow` com `#4ade80`
      desatualizado — nunca era aplicado via `animation:`, o indicador real
      usa `pulse` + `t.liveAction`); (4) `#fff`/`#FFFFFF` remanescentes são
      pares de contraste pontuais texto-sobre-superfície-de-marca (mesmo
      veredito das telas anteriores — não são duplicação de token).
      As 2 chamadas Supabase (`workout_sessions` cleanup+fetch realtime,
      `trainer_clients.insert` no convite) estão fortemente acopladas ao
      fluxo de carregamento/convite desta tela — extrair para hook
      adicionaria indireção sem reduzir risco; mantidas como estão.
      Nenhum split de sub-componente — `AlertsSection`/`TasksSection` já
      são coesos. Validado `tsc`/`eslint` (231 warnings, 0 erros — variação
      normal da baseline)/`build` — todos limpos.
- [x] `TrainerClientDetailScreen.tsx` (890 linhas, 24 cores hardcoded estimadas,
      acesso direto ao Supabase) — **investigado e convergido 2026-06-07.**
      Achados: (1) `'#10B981'` repetido 5× como cor de status "concluído/feito"
      em três contextos (timeline de sessões, lista de exercícios, sessões
      livres) — **match exato** de `t.liveAction` (criado na Fase 3 para
      `WorkoutPlanEditorScreen`/`TrainerDashboardScreen`); convergido
      diretamente; (2) escala de 3 níveis "bom/moderado/baixo" (`>=70 verde
      / >=40 âmbar / abaixo vermelho`) duplicada de forma idêntica em 3
      pontos (gráfico de prontidão, energia do check-in, label de prontidão)
      — extraída para helper local `tierColor(value, t)` (mesmo padrão de
      `STATUS_TONES`/`statusTone()` da `TrainerLibraryExercisesScreen`);
      a cor "baixa" já era `t.accent` num dos três sites — confirmando que
      os outros dois (`'#EF5B3C'` cru) deveriam convergir para o token, não
      o inverso; (3) legenda do gráfico e indicador de dor convergidos para
      `t.accent`/tons do helper; (4) `'#F5B45A'`/`'#FF4D4D'` (status
      postponed/cancelled, 1 ocorrência cada) eram matches exatos de
      `t.amber`/`t.criticalRed` — convergidos; (5) `'#F5A623'` da cor
      "abandoned" mantido como literal — é o mesmo tom usado dentro de
      `tierColor` mas não corresponde a nenhum token de marca, e introduzir
      uma segunda constante para 1 uso fora da escala seria over-engineering;
      (6) `'#FFFFFF'` remanescente é par de contraste texto-sobre-superfície
      (mesmo veredito de telas anteriores). As 5 chamadas Supabase formam um
      único `Promise.all` que hidrata o estado desta tela especificamente —
      extrair para hook relocaria o acoplamento sem reduzi-lo; mantidas como
      estão. Validado `tsc`/`eslint` (231 warnings, 0 erros)/`build` — limpos.
- [x] `StartWorkoutScreen.tsx` (972 linhas, 44 cores hardcoded estimadas,
      acesso direto ao Supabase) — **investigado e convergido 2026-06-07.**
      Achados: (1) par `dark ? '#fff' : '#0E1A2B'` repetido 7× idêntico —
      extraído para helper local `inkPri(dark)`; **não** reconciliado com o
      `textPri(dark)` já importado (que resolve `--text-pri`, um navy
      diferente em temas claros) para evitar mudança visual não intencional —
      documentado inline para revisão de design futura; (2) família de tons
      com sufixo alpha — `#EF5B3C`/`#FF4D4D`/`#F5B45A`/`#A78BFA`/`#10B981`
      (14 ocorrências) — eram **matches exatos** de `t.accent`/`t.criticalRed`/
      `t.amber`/`t.lavender`/`t.liveAction`; convergidos diretamente
      (precisou estender a interface `Theme` local, que só declarava
      `primary`/`primarySoft`/`accent`, com as 4 chaves novas); (3) `'#F5A623'`
      (status "active" do plano, 1 ocorrência) mantido como literal — não
      corresponde a nenhum token de marca, amostra única; (4) `#6b7a90`/
      `#aab`/`#9aa` (tons de texto secundário/muted com pequenas variações de
      alfa entre si) mantidos — não são duplicação real, são ajustes pontuais
      de hierarquia tipográfica por contexto. As 13 chamadas Supabase cobrem
      4 fluxos distintos (geração/salvamento de plano, carregamento de sessão
      via `Promise.all`, ações de ciclo de vida do plano start/postpone/cancel,
      lookup de vínculo com trainer) — todas fortemente acopladas aos seus
      fluxos de UI específicos; extrair adicionaria indireção sem reduzir
      risco. O modal de confirmação de cancelamento (registrado na Fase 2
      como referência única no sistema) permanece intacto. Validado
      `tsc`/`eslint` (231 warnings, 0 erros)/`build` — todos limpos.
- [x] `PerformanceDashboardScreen.tsx` (1043 linhas — maior arquivo do sistema)
      — **investigado e convergido 2026-06-07.** A estimativa original
      ("muitas cores hardcoded, acesso direto ao Supabase") não se sustentou:
      o arquivo **não acessa o Supabase diretamente** — usa `useM5Data()` —, e
      tem apenas 4 literais hex: (1) `'#10B981'`/variações alpha (3×, badge
      "visualizando como trainer") — match exato de `liveAction`; como o
      arquivo não usa `useTrainerTheme()` (só `C`, a paleta local de
      `perf-engines.ts`), adicionar uma dependência de tema só para 3 usos
      seria desproporcional — em vez disso, **adicionado `liveAction` à
      paleta `C`** em `perf-engines.ts` (mecanismo de compartilhamento já
      estabelecido pelo arquivo), documentando que espelha
      `theme/tokens.ts:liveAction`; (2) `'#0E1A2B'` (1×, ícone de microfone
      sobre botão circular ciano) — par de contraste pontual, mesmo veredito
      das 4 telas anteriores; mantido. O `LoadingState` local (linha 177) já
      fora convergido na Fase 1 — é uma composição legítima do `Spinner`
      compartilhado com rótulo traduzido, não uma reimplementação. Nenhuma
      mudança de Supabase ou split necessária. Validado `tsc`/`eslint`
      (231 warnings, 0 erros)/`build` — todos limpos.

**Fase 3 concluída — 6/6 telas convergidas.** Padrão consistente em todas:
as estimativas originais de "cores hardcoded" e "acesso direto ao Supabase"
foram sistematicamente menores que o estimado após investigação direta — a
maior parte da duplicação real já tinha mapas/paletas locais não referenciados
de forma consistente (`SEVERITY_COLOR`, `PRIORITY_COLOR`, `STATUS_TONES`,
`tierColor`), e o acesso ao Supabase em todas as 6 telas está fortemente
acoplado aos fluxos de UI específicos — extrair para hooks adicionaria
indireção sem reduzir risco real, conforme o princípio de execução do plano.

Cada item desta fase é um commit isolado e um ciclo de validação completo
(`tsc` + `eslint` + `build` + smoke-test manual da tela em EN/PT/ES/DE antes do
próximo item).

## Fase 4 — Triagem das supressões `exhaustive-deps`

**Status: executado 2026-06-07.**

- [x] `App.tsx:342` — **bug real corrigido**. `fetchProfileV2` era chamado no
      efeito mas faltava no array de deps; já é referência estável (vinda de
      `useProfileData`, usada em deps de outro efeito na mesma linha 247) —
      adicionada ao array, supressão removida. Validado: contagem de warnings
      `exhaustive-deps` permanece 9 antes/depois (nenhuma nova violação
      introduzida, a alteração realmente fechou o gap)
- [x] `ProfileWizardScreen.tsx:158` — **supressão justificada, comentário
      adicionado**. Efeito "carregar rascunho do wizard uma única vez no
      mount"; `fetchProfileV2` é prop e pode não ser referencialmente estável
      entre renders do pai — incluí-la arriscaria reset do progresso do wizard
      em re-renders não relacionados
- [x] `WorkoutModeScreen.tsx:123` — **supressão justificada, comentário
      adicionado**. Efeito "iniciar sessão de treino uma única vez ao montar
      a tela"; reexecutar em mudanças de prop (exercises/planId) durante o
      treino criaria sessões duplicadas e resetaria o progresso
- [x] `CoachDNAScreen.tsx:84` — **supressão justificada (com fragilidade
      latente documentada), comentário adicionado**. `fetchCoachDNA` vem de
      `useCoachDNA` como função plain (não memoizada com `useCallback`) —
      ganha nova identidade a cada render; incluí-la causaria refetch
      contínuo. O array `[trainerId]` é o gatilho correto. **Nota para
      revisão futura**: `useCoachDNA` deveria memoizar `fetchCoachDNA`
      com `useCallback([trainerId])` — não corrigido aqui por estar fora do
      escopo desta tela (mudaria o contrato do hook, usado em outros lugares)
- [x] `useRealtimeTable.ts:68` — **supressão exemplar, sem alteração**. Já
      usa o padrão de `ref` (`onRefreshRef`) para evitar re-subscrição por
      mudança de identidade do callback, e já tem comentário explicando o
      array de deps deliberado (`table`/`filter.column`/`filter.value`/
      `enabled`) — referência de como as demais supressões devem ser
      documentadas
- [x] Validado `tsc`/`eslint` (231 warnings, 0 erros — mesma contagem de
      `exhaustive-deps` antes/depois: 9)/`build` — todos limpos
- [x] Commit: `fix(hooks): triage remaining exhaustive-deps suppressions`

## Fase 5 — Verificação de convergência (fechamento)

- [ ] Re-executar as métricas da auditoria original (contagem de cores hex por
      arquivo, `style={{}}` inline, acessos diretos ao Supabase em telas,
      implementações locais de spinner) e comparar antes/depois
- [ ] Atualizar `architecture-standards-audit-20260607.md` com seção "Status
      pós-convergência" documentando o resultado mensurável de cada item
- [ ] Resumo final do engajamento

---

## Notas de sequenciamento

- Fase 1 é bloqueante para a Fase 3 (não tem sentido migrar telas para
  componentes que ainda não existem).
- Fase 2 é independente — pode rodar em paralelo à Fase 1.
- Fase 3 é a maior em esforço e risco — cada tela é um ciclo completo de
  commit + validação + smoke-test; não acumular mudanças entre telas.
- Fase 4 é independente — pode ser feita a qualquer momento, inclusive em
  paralelo às demais.
- Fase 5 fecha o ciclo e só faz sentido após a Fase 3 estar completa.

*Aguardando sua validação de escopo e prioridade para iniciar a Fase 1.*
