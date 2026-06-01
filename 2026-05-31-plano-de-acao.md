# Investigação Geral e Plano de Ação - TrAIner (31/05/2026)

Conforme solicitado, realizei uma investigação no sistema em busca de inconsistências, falta de padronização, sobreposições e oportunidades de reuso e modularização. Abaixo estão os achados arquiteturais e um plano de ação estruturado em fases.

## Achados da Investigação

### 1. Fragmentação e Sobreposição de Componentes
**Achado:** Temos componentes visuais espalhados em múltiplas pastas sem uma hierarquia estrita: `src/ui`, `src/components`, `src/coach-dna/components`, `src/studio/components`, além de arquivos como `atoms.tsx` e `perf-atoms.tsx` que contêm elementos genéricos misturados com regras de negócio.
**Impacto:** Dificuldade de aplicar atualizações de Design System consistentes, duplicação de esforço e aumento da manutenção.
**Oportunidade:** Consolidar os componentes genéricos (Cards, Inputs especializados, Badges) em `src/ui` ou `src/components`.

### 2. Padronização de Estilização Inline
**Achado:** O projeto faz uso intenso de estilização via `style={{ display: 'flex', gap: 10, ... }}` diretamente no JSX em quase todas as telas.
**Impacto:** O código se torna muito verboso, o layout perde padronização e alterar margens e estruturas globalmente torna-se um trabalho manual em dezenas de arquivos.
**Oportunidade:** Extrair utilitários de layout (ex: `HStack`, `VStack`, `Spacer`) e utilizar tokens do tema para garantir consistência estrutural.

### 3. Padrão de Fluxo em Etapas (Wizards) Duplicado
**Achado:** Existem duas implementações separadas e completas de "Wizards" (telas com múltiplas etapas, botões de avançar/voltar e barras de progresso): uma em `src/screens/auth/wizard` e outra em `src/coach-dna/steps`.
**Impacto:** A lógica de navegação, persistência parcial e validação de formulários está reimplementada, aumentando o risco de bugs em um fluxo enquanto o outro é corrigido.
**Oportunidade:** Criar um padrão `WizardController` centralizado que possa orquestrar qualquer fluxo de etapas no sistema.

### 4. Boilerplate em Hooks de Dados
**Achado:** O sistema possui mais de 13 hooks (`useAuth`, `useProfileData`, `useCheckinData`, etc.) lidando individualmente com chamadas ao Supabase.
**Impacto:** Lógicas de loading, tratamento de erros e atualização de estado estão fragmentadas.
**Oportunidade:** Centralizar as estratégias de requisição (Data Fetching), padronizando como o sistema reage a falhas na rede ou falta de permissão de acesso.

### 5. Resíduos de Infraestrutura (Firebase Data Connect)
**Achado:** A pasta `src/dataconnect-generated` sugere tentativas ou uso de Firebase Data Connect, enquanto a aplicação utiliza primariamente `Supabase` para backend e `Firebase` (somente para FCM/Mensageria).
**Impacto:** Aumento do tamanho do repositório e confusão sobre a stack oficial de dados.
**Oportunidade:** Limpar dependências/código gerado sem uso ativo e deixar claro o papel do Supabase (DB/Auth) vs Firebase (Push).

---

## 🚀 Plano de Ação e Execução

Para avançarmos com segurança e de forma modular, dividi as melhorias nas seguintes fases.

### Fase 1: Padronização de UI e Remoção de Sobreposições (CONCLUÍDO)
- **[x] 1.1:** Mapear e mover componentes atômicos de `atoms.tsx`, `perf-atoms.tsx` e `coach-dna/components` para `src/ui` e `src/components`.
  - **[x] 1.1.1:** Remover `src/screens/auth/wizard/atoms.tsx` e atualizar Wizard.
  - **[x] 1.1.2:** Refatorar `src/studio/components/SharedAtoms.tsx` usando `@/ui` (Studio).
- **[x] 1.2:** Aplicar estritamente tokens de tema (`DARK`, `BRAND`) e remover cores hardcoded de `src/ui/`.
- **[x] 1.3:** Criar primitivas de Layout (`HStack`, `VStack`, `Spacer`) e reduzir estilos inline substituindo declarações `style={{ ... }}` manuais em telas críticas.

### Fase 2: Arquitetura de Layout e Navegação (EM ANDAMENTO)
- **[x] 2.1:** Unificar Layouts (`AppLayout`), unificando o ClientLayout e TrainerLayout em um só componente para lidar com papéis dinamicamente.
- **[ ] 2.2:** Desacoplar Notificações (Toasts) do layout para um sistema ou contexto separado.
- **[ ] 2.3:** Implementar React Router em `App.tsx` para tratar a navegação de forma mais robusta que o toggle de estado `screen` atual.

### Fase 3: Refatoração de Domínio e Infraestrutura
- **[ ] 3.1:** Modularização de Padrões (Wizards e Fluxos):
  - **[ ] 3.1.1:** Desenvolver um `BaseWizardContext` e componentes de progressão genéricos.
  - **[ ] 3.1.2:** Refatorar o Onboarding (`auth/wizard`) e Coach DNA para adotar a arquitetura unificada.
- **[ ] 3.2:** Refatoração de Domínio (Screens e Hooks):
  - **[ ] 3.2.1:** Quebrar Telas Monolíticas e desacoplar God Hooks (ex: `useData.ts`).
  - **[ ] 3.2.2:** Unificar lógica de tratamento de exceções (try/catch) do Supabase nos Custom Hooks de dados.
- **[ ] 3.3:** Auditar e remover a pasta `dataconnect-generated` caso confirmemos que não está em uso no projeto.

### Fase 4: Múltiplos Design Systems (Trainer, Client, Studio) e Revisão Final
- **[ ] 4.1:** Com os componentes UI base devidamente modularizados, implementar os contêineres de temas específicos solicitados anteriormente (Design System diferenciado por ator de negócio).
- **[ ] 4.2:** Revisão Final e Testes Manuais.

## Como vamos trabalhar
O trabalho está atualmente na **Fase 2, Item 2.2 (Desacoplar Notificações / Toasts)**. Seguiremos a partir deste ponto.
