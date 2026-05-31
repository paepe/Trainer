# Plano de Ação: Padronização e Modularização de UI

Última atualização: 2026-05-31

## Achados da Investigação

Durante a investigação da arquitetura atual de componentes, identificamos as seguintes inconsistências, sobreposições e oportunidades de melhoria:

1. **Sobreposição de Componentes (Duplicação)**:
   - Existia uma forte duplicação entre os componentes de `src/screens/auth/wizard/atoms.tsx` e o diretório oficial de interface `src/ui/`.
   - Componentes duplicados incluíam: `Badge`, `Chip`, `SegmentedRow` (vs `SegmentedControl`), `Toggle`, `WizardHeader`, `SliderField` (vs `Slider`), e `FieldInput` (vs `TextInput`).
   - **→ Resolvido.** `atoms.tsx` removido; todas as telas Wizard agora importam de `src/ui/`.

2. **Acoplamento de Tema e Cores Hardcoded**:
   - O arquivo `atoms.tsx` e as telas usavam valores estáticos (ex: `#EF5B3C22`).
   - **→ Resolvido.** `ThemeProvider` + `ThemeContext` implementados. Tokens injetados via contexto. `useTrainerTheme()` lê do contexto em runtime. Trainer screens removeram `const dark = true` hardcoded.

3. **Fronteiras Arquiteturais (UI vs Components vs Screens)**:
   - Primitivas agora residem estritamente em `src/ui/`. Violação do `atoms.tsx` eliminada.
   - **→ Resolvido.**

---

## Status das Fases

### ✅ Fase 1: Limpeza e Consolidação de Primitivas de UI

**Objetivo**: Eliminar o arquivo `atoms.tsx` e migrar todas as telas do Wizard para usar os componentes oficiais de `src/ui/`.

- [x] Atualizar as telas do Wizard para usar `src/ui/Badge.tsx` ao invés de `atoms.Badge`.
- [x] Atualizar para usar `src/ui/Chip.tsx` ao invés de `atoms.Chip` e `atoms.ChipGroup`.
- [x] Substituir `atoms.SegmentedRow` por `src/ui/SegmentedControl.tsx`.
- [x] Substituir `atoms.Toggle` por `src/ui/Toggle.tsx`.
- [x] Substituir `atoms.FieldInput` por `src/ui/TextInput.tsx`.
- [x] Substituir `atoms.WizardHeader` por `src/ui/WizardHeader.tsx`.
- [x] Migrar `GoalCard`, `SectionLabel`, `VoiceOption`, `WizardFooter` para `src/ui/` ou `src/components/`.
- [x] Remover permanentemente `src/screens/auth/wizard/atoms.tsx`.
- [x] Reduzir estilos inline repetitivos (`display: flex, flexDirection: column/row`) usando `VStack`, `HStack`, `Spacer` de `src/ui/` — aplicado em todos os 16 wizard steps, WizardVoiceOverlay e TrainerDashboardScreen.

---

### ✅ Fase 2: Implementação de Temas Dinâmicos (Multi-Perfil)

**Objetivo**: Desacoplar os tokens de design fixos para permitir que diferentes atores (TRAINER, CLIENT) tenham experiências visuais diferenciadas via injeção contextual.

- [x] Criar `src/contexts/ThemeContext.tsx` com `ThemeProvider` e `useTheme()`. Tipo `AppTheme` exportado cobre todos os tokens de `BRAND`/`TRAINER_BRAND` + `dark`, `cycleEnabled`, `role`.
- [x] `ThemeProvider` integrado em `App.tsx` como root wrapper — recebe `t` (já computado como `isTrainer ? TRAINER_BRAND : BRAND`), `dark` e `isTrainer`.
- [x] `useTrainerTheme()` refatorado: era `return { t: TRAINER_BRAND, DARK }` estático, agora delega para `useTheme()` — responde ao perfil real do usuário em runtime.
- [x] Defaults hardcoded `'#2DD4E0'` removidos de Slider, Chip, Toggle, ChoiceCard, SegmentedControl — substituídos por `BRAND.primary` (semântico).

---

### ✅ Fase 3: Aplicação do System Design do TRAINER

**Objetivo**: Aplicar o `coach_dna_system_design.md` especificamente para usuários com perfil TRAINER.

- [x] `TRAINER_BRAND` tokens definidos em `src/theme/tokens.ts` com base em `coach_dna_system_design.md`.
- [x] `useTrainerTheme()` lê do `ThemeContext` — responde ao perfil real em runtime (não mais estático).
- [x] Telas de Trainer consomem `t.primary`, `t.accent` e `dark` do contexto via `useTrainerTheme()`. `const dark = true` hardcoded removido das 5 telas trainer.
- [x] **Provider/Layout formal**: `ThemeProvider` em `App.tsx` aplica `TRAINER_BRAND` ou `BRAND` conforme `isTrainer`. Nenhuma tela importa tokens diretamente.
- [x] **Isolamento validado**: nenhuma tela em `src/screens/` importa `TRAINER_BRAND` ou `BRAND` diretamente. Sem `const dark = true` hardcoded em trainer. Zero erros TypeScript.
