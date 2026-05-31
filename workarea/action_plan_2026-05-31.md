# Plano de Ação: Refatoração e Padronização do TrAIner Project

Última atualização: 2026-05-31

Com base na análise recente do repositório (ref: `analysis_results.md`), este plano de ação define os passos sequenciais para eliminar sobreposições, criar um sistema de design coeso e modularizar a arquitetura da aplicação.

## FASE 1: Unificação do Design System (UI Core) ✅

**Objetivo:** Consolidar todos os elementos de interface repetidos em uma única biblioteca padronizada que consuma estritamente os tokens de tema.

- [x] **1.1. Extração de Componentes Atômicos:** `src/ui/` consolidado com Button, TextInput, Typography, Badge, Chip, Toggle, Slider, SegmentedControl, ChoiceCard, VStack, HStack, Spacer, WizardHeader, WizardFooter, VoiceOption, Alert. `atoms.tsx` removido.
- [x] **1.2. Aplicação Estrita dos Tokens de Tema:** Componentes `src/ui/` lêem exclusivamente de `src/theme/tokens.ts`. Cores hardcoded removidas dos componentes base.
- [x] **1.3. Redução de Estilos Inline:** `VStack`, `HStack`, `Spacer` aplicados em todos os 16 wizard steps, WizardVoiceOverlay, TrainerDashboardScreen e AppLayout. `const color` duplicado em AppLayout corrigido.

## FASE 2: Arquitetura de Layout e Navegação ✅

**Objetivo:** Eliminar duplicação de lógica base e otimizar carregamento.

- [x] **2.1. Unificação de Layouts:** `<AppLayout role="client|trainer" />` implementado e em uso em `App.tsx`. Sem `TrainerLayout`/`ClientLayout` separados.
- [x] **2.2. Desacoplamento de Notificações:** `NotificationProvider` + `PushListener` em `src/contexts/NotificationContext.tsx`. Completamente desacoplado do layout.
- [x] **2.3. Code Splitting:** 16 telas convertidas para `React.lazy()` com `<React.Suspense>` em `App.tsx`. Bundle inicial reduzido a WelcomeScreen + LoginScreen + RegisterScreen. _Nota: migração para `react-router-dom` deprioritizada — app Capacitor opera com state machine que é mais adequada para shell nativo._

## FASE 3: Refatoração de Domínio (Screens e Hooks)
**Objetivo:** Quebrar arquivos gigantescos em componentes de fácil manutenção e separar a lógica de acesso a dados.

- [x] **3.1. Quebra das Telas Monolíticas:**
  - **WorkoutModeScreen:** 687→519 linhas. `ExerciseCard`, `BottomPanel`, `LabeledInput` movidos para `src/screens/client/workout/` (tipos em `workout/types.ts`).
  - **TrainerLibraryExercisesScreen:** 945→823 linhas. `VoiceAssistantPanel` e `ExerciseDetailModal` extraídos como sub-componentes no mesmo arquivo.
  - **PerformanceDashboardScreen:** 1021 linhas — já decomposto: componente principal ~100 linhas, Tela* (Overview, Aderencia, Performance, Dor, Scores, Voz, Marcos) como funções isoladas no arquivo.
- [x] **3.2. Desacoplamento do "God Hook" (`useData.ts`):**
  - `useData.ts` já era uma facade de 13 linhas delegando para `useProfileData`, `useCheckinData`, `useWorkoutData`, `useExerciseData`.
  - `App.tsx` agora importa `useProfileData`, `useCheckinData`, `useWorkoutData` diretamente (3 chamadas distintas).
  - `TrainerLibraryExercisesScreen` agora importa `useExerciseData` diretamente.
  - `useData.ts` sem callers — pode ser removido em cleanup futuro.

## FASE 4: Revisão Final e Testes ✅

- [x] **4.1. Verificação de Regressão Visual:** `src/ui/` sem hardcoded backgrounds. Defaults `color = '#2DD4E0'` substituídos por `color = BRAND.primary` em Slider, Chip, Toggle, ChoiceCard, SegmentedControl. 28 usos de funções de tema (`textPri`, `surfRaised`, etc.) confirmados.
- [x] **4.2. Teste do Fluxo de Roteamento:** Bug corrigido — `showTabs` usava `'postWorkoutSummary'` mas o estado real é `'workoutSummary'` (tabs desapareciam após treino). Todos os alvos de `nav()` têm case correspondente no switch de `App.tsx`. Fluxo Client e Trainer consistente.
