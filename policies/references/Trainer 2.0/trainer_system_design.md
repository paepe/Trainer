# TrAIner — System Design & Arquitetura

O TrAIner ("The PT & ME Experience") é um ecossistema fitness que une personal trainers reais e inteligência artificial para fornecer treinos altamente personalizados, escaláveis e adaptativos. Este documento delineia a arquitetura técnica, modelo de dados e os princípios de design do sistema (excluindo o módulo *Coach DNA*).

---

## 1. Visão Geral da Arquitetura

O TrAIner segue um modelo de arquitetura *Serverless Client-Side Rendered (CSR)* com um backend gerido (BaaS). A stack principal baseia-se em tecnologias web modernas, empacotáveis para PWA e mobile via Capacitor.

### Stack Tecnológica
- **Frontend / Core:** React 18, TypeScript, Vite.
- **Estilização:** Sistema de Design proprietário baseado em objetos de estilo in-line (CSS-in-JS lite) para máximo isolamento e portabilidade sem necessidade de build steps complexos na versão prototipada.
- **Backend / Database:** Supabase (PostgreSQL).
- **Autenticação:** Supabase Auth (OAuth com Google e Apple + Email/Password).
- **IA e Lógica de Negócios:** Processamento via Edge Functions e *AI context building* no frontend (via hooks específicos).
- **Mobile Support:** PWA Ready + Capacitor (preparado com diretórios `ios/` e `android/`).

---

## 2. Padrões de Frontend e Gerenciamento de Estado

O frontend não utiliza bibliotecas de estado global pesadas (como Redux ou Zustand). A orquestração do estado principal flui do componente `App.tsx` para os filhos (Padrão de State Lifting e Unidirectional Data Flow).

### O Orquestrador: `App.tsx`
O arquivo `App.tsx` atua como o **State Container** global e roteador da aplicação:
- **Estados Globais:**
  - `user`: Identidade, role (`client`, `trainer`, `studio_admin`), e metas.
  - `prefs`: 11 configurações (notificações, tracking de ciclo, dark mode, personalização de IA, etc).
  - `checkin`: Dados temporários e correntes do check-in diário (nível de energia, dores, tempo disponível).
  - `cycleConfig`: Configurações de ritmo biológico (duração do ciclo, período e offset).
- **Navegação (Routing):** Roteamento em memória via variável de estado (`screen`). Sem necessidade de `react-router` para manter a leveza, operando via `switch/case` e injetando a função `nav(target, payload)`.

### Custom Hooks
A lógica de negócios é separada do UI através de Data Hooks agregados sob `useData.ts`:
- **`useAuth`**: Gerência de Sessão e perfis.
- **`useCheckinData` / `useLatestCheckin`**: Mutação e leitura de Readiness (Prontidão).
- **`useProfileData`**: Configurações de perfil estendido (V2).
- **`useWorkoutData` / `useExerciseData`**: Operações de treino.
- **`usePushNotifications`**: Gerenciamento de tokens e Foreground/Background listeners.
- **`useAIContext`**: (Motor de IA) responsável por construir os Prompts consolidados a partir do perfil, check-in diário e ciclo menstrual do usuário.

---

## 3. Topologia do Banco de Dados (Supabase / PostgreSQL)

O modelo de dados suporta múltiplos atores operando no mesmo ambiente, fortemente protegido por **Row Level Security (RLS)**.

### Modelos de Domínio
1. **Perfis & Autenticação (Identidade):**
   - `profiles`: Vinculado a `auth.users` via trigger automático. Gerencia o `role` (ex: `client`, `trainer`).
   - `preferences`: Configurações do App.
   - `physical_profiles`: Métricas biométricas (peso, altura, fitness level, restrições).
   - `cycle_config`: Rastreamento de ritmo biológico (fases do ciclo menstrual).

2. **Fitness & Atividade Diária:**
   - `checkins`: Inputs diários do aluno (Soreness, Energy, Minutos).
   - `workouts`: Histórico macro de treinos.

3. **Arquitetura Multi-Tenant & B2B (Módulo Trainer/Studio):**
   - `studios` & `studio_members`: Permite agrupar trainers sob uma mesma marca/organização (White-labeling).
   - `trainer_clients`: Tabela associativa que controla os convites (`status`) e vinculação de acesso entre Treinadores e Alunos.
   - `workout_protocols` & `protocol_exercises`: Biblioteca de treinos pré-definida pelos treinadores/estúdio.

4. **Execução de Treino & Governança (V2):**
   - `workout_plans`: O plano de treino assinalado. Possui controle de status e aprovação, além da origem da criação (ex: `ai_generated`, `manual`).
   - `plan_exercises` & `workout_sessions`: Execução de facto, onde os dados planejados versus realizados são contrastados.
   - `ai_suggestions`: Entidade de feedback loop para treinar o algoritmo sobre as preferências de aceite/rejeição das propostas da IA.

### Segurança (RLS Policies)
O banco de dados assume um modelo **Zero-Trust**:
- **Alunos (`client`)**: Acessam apenas as próprias linhas nas tabelas operacionais.
- **Treinadores (`trainer`)**: As políticas de `SELECT` verificam ativamente a existência de um vínculo ativo na tabela `trainer_clients` para permitir leitura do plano, check-in e evolução biométrica de seus clientes.
- **Studios**: Permissões baseadas em subqueries à tabela `studio_members`.

---

## 4. UI e Design System

O TrAIner utiliza um sistema de design sofisticado ("Premium Aesthetics") que suporta modos Claro e Escuro, baseado em uma paleta de cores proprietária.

### Brand Tokens (Tema)
- **Primary:** Cyan (`#2DD4E0`) — Acentua a presença da "IA".
- **Deep Accent:** Teal (`#0F8C85`) — Utilizado para gradientes e menus.
- **Alert/Accent 2:** Coral (`#EF5B3C`) — Badges, erros e fases menstruais específicas.
- **Cores de Superfície:** Variáveis dinâmicas de elevação (`surfRaised`, `surfSunken`) para gerar efeito Glassmorphism/Neumorphism moderado.

### Anatomia dos Componentes
- **Atoms:** 
  - `Icon`: Padrão SVG unificado.
  - Botões customizados encapsulados em funções de estilo puro (`primaryBtn`, `outlineBtn`).
- **Composições (Organisms):**
  - `SideMenu` (Drawer).
  - `BottomTabs` (Navegação sensível à role — Treinadores veem *Clients*, Alunos veem *Workout*).
  - `TweaksPanel`: Painel de QA/Development para *live switching* entre white-label, dark mode e papéis de usuário, injetando defaults globais.

---

## 5. Fluxos Principais (App Flows)

### Fluxo do Aluno (B2C)
1. **Onboarding Contextual:** Criação de conta, definição de biofísica, setup do ciclo menstrual e configurações iniciais.
2. **Daily Readiness (Check-In Diário):** Input rápido sobre prontidão neuromuscular (Soreness), Energia (1-10) e Tempo disponível.
3. **AI Generation:** Cruzamento de `Checkin` + `CycleConfig` + `Profile` para renderizar/adaptar o plano de treino do dia.
4. **Execução:** Modo de treino focado.
5. **Goal Achieved & Stats:** Resumo de feedback (carga adaptativa), telemetria e projeção do "fantasma" de performance no dashboard.

### Fluxo do Treinador/Studio (B2B)
1. **Dashboard & CRM:** Lista de clientes com indicadores visuais de aderência ("Sinais de Risco").
2. **Intervenção Manual ("O Humano no Loop"):** Capacidade de revisar e sobrescrever planos gerados pela IA ou criar treinos a partir da biblioteca (`workout_protocols`).
3. **White-labeling:** Adaptação da interface para o logo e marca do Studio (`studio` screens), ocultando a marca mãe do TrAIner.

---

## 6. Sincronização Biométrica & Ciclo Menstrual (Body Rhythm)

O rastreio do ciclo é central na engine adaptativa.
- **Arquitetura de Dados:** Salvo em `cycle_config` (legacy) e sincronizado com `physical_profiles.body_rhythm` (V2).
- **Motor Adaptativo:** A função `computeCyclePhases(length, palette)` garante que as 4 fases do ciclo (Menstrual, Folicular, Ovulatória, Lútea) sejam alocadas proporcionalmente num range elástico de 21 a 35 dias. A variação de fase impacta a resposta da IA (ex: sugerir treinos metabólicos vs de força máxima).

## 7. Escalabilidade e Perspectivas de Expansão
O sistema está programado para suportar expansões em direção a funcionalidades Offline-first e background processing (através do Firebase e integrações com o Capacitor App). O banco de dados relacional (Supabase) possibilita a evolução para Data Science com a captura granular entre "Plano Assinado" versus "Execução Real", nutrindo os loops de machine learning baseados no histórico real do indivíduo.
