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
- [ ] Commit isolado: `feat(ui): add shared Spinner and i18n-aware date/number formatters`

## Fase 2 — Inspeção dirigida de Empty States e confirmações destrutivas

A varredura por grep não confirmou se existe (ou não) um padrão de Empty State
e de confirmação de ações destrutivas — requer leitura direta das telas.

- [ ] Inspecionar amostra representativa de telas com listas/dados assíncronos
      (`InboxScreen`, `HistoryScreen`, `TrainerClientDetailScreen`,
      `StartWorkoutScreen`, `PerformanceDashboardScreen`) e registrar como cada
      uma trata o estado "sem dados"
- [ ] Inspecionar telas com ações destrutivas (cancelar plano, remover cliente,
      descartar treino) e registrar se usam um padrão de confirmação comum ou
      overlays ad-hoc
- [ ] Decidir, com base no levantamento real (não na suposição): criar
      `EmptyState`/`ConfirmDialog` em `src/ui/` somente se houver duplicação
      genuína — caso contrário, documentar como não-problema e encerrar a fase
- [ ] Se aplicável: criar componente(s) e listar pontos de substituição
- [ ] Commit isolado (se houver mudança de código): `feat(ui): add shared EmptyState/ConfirmDialog where duplication confirmed`

## Fase 3 — Convergência das 6 telas concentradoras (uma por vez)

Ordem sugerida: da menor para a maior, para validar o método antes de aplicá-lo
ao arquivo mais arriscado (`PerformanceDashboardScreen`, 1043 linhas).

Para cada tela: (a) substituir cores hex/spinners locais pelos tokens/componentes
da Fase 1; (b) avaliar se o acesso direto ao Supabase deve migrar para um hook
dedicado (sem migração funcional especulativa — só onde reduzir acoplamento sem
risco real); (c) avaliar split de sub-componentes apenas onde há responsabilidade
claramente separável (não dividir por tamanho, dividir por coesão).

- [ ] `WorkoutPlanEditorScreen.tsx` (559 linhas, acesso direto ao Supabase)
- [ ] `TrainerLibraryExercisesScreen.tsx` (825 linhas, 34 cores hardcoded)
- [ ] `TrainerDashboardScreen.tsx` (686 linhas, 42 cores hardcoded, acesso direto ao Supabase)
- [ ] `TrainerClientDetailScreen.tsx` (890 linhas, 24 cores hardcoded, acesso direto ao Supabase)
- [ ] `StartWorkoutScreen.tsx` (972 linhas, 44 cores hardcoded, acesso direto ao Supabase)
- [ ] `PerformanceDashboardScreen.tsx` (1043 linhas — maior arquivo do sistema)

Cada item desta fase é um commit isolado e um ciclo de validação completo
(`tsc` + `eslint` + `build` + smoke-test manual da tela em EN/PT/ES/DE antes do
próximo item).

## Fase 4 — Triagem das supressões `exhaustive-deps`

- [ ] Localizar as 5 ocorrências de `eslint-disable ... react-hooks/exhaustive-deps`
      remanescentes e avaliar individualmente: supressão justificada (documentar
      o porquê inline) ou bug latente (corrigir as dependências)
- [ ] Commit isolado: `fix(hooks): triage remaining exhaustive-deps suppressions`

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
