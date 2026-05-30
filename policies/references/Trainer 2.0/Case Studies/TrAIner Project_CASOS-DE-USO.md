# TrAIner Project — Casos de Uso MVP

> **Fonte:** `TrAIner Project_MVP.pdf` + implementação actual do codebase  
> **Governação:** `PROFILE.md` · `EXECUTIVE_TECHNOLOGY_DIRECTIVE.md`  
> **Data de geração:** 2026-05-26  
> **Uso:** Referência técnica · Base para QA e testes de aceitação

---

## Actores

| Actor | Papel | Âmbito de Acesso |
|---|---|---|
| **Client (Aluno)** | Utilizador final que treina | Apenas dados próprios |
| **Personal Trainer** | Prescreve e monitoriza treinos | Apenas alunos vinculados |
| **Studio Admin** | Gere equipa e alunos de um estúdio | Âmbito do estúdio |
| **AI Coach** | Assistente autónomo governado | Lê contexto, sugere — nunca governa sozinho |
| **System / Admin** | Governação técnica | Acesso total (interno) |

> **Âmbito do MVP:** Client + Personal Trainer + AI Coach (governado).  
> Studio Admin, Billing e Community são pós-MVP.

---

## Casos de Uso por Módulo

### Fundação — Auth & Contexto (`M0`)

| # | Caso de Uso | Actor |
|---|---|---|
| UC-01 | Registar conta (email / Google) | Client, Trainer |
| UC-02 | Login / logout | Todos |
| UC-03 | Sessão persistente com redireccionamento por perfil | System |
| UC-04 | Atribuição de papel no registo (`client`, `trainer`, `studio_admin`) | System |

**Status de implementação:** ✅ `LoginScreen`, `RegisterScreen`, `useAuth`, políticas RLS.

---

### M1 — Perfil Inteligente do Aluno

| # | Caso de Uso | Actor |
|---|---|---|
| UC-05 | Preencher perfil mínimo (objetivo, nível, disponibilidade, equipamento, restrições, consentimento) | Client |
| UC-06 | Editar perfil | Client |
| UC-07 | Visualizar perfil do aluno | Personal Trainer |
| UC-08 | Bloquear personalização se perfil incompleto | System (Safety Gate) |

**Regra crítica:** Sem perfil mínimo, não há treino personalizado.  
**Status de implementação:** ✅ `ProfileWizardScreen`, `EditProfileScreen`, `saveProfileV2`.

---

### M8 — Biblioteca de Exercícios e Protocolos

| # | Caso de Uso | Actor |
|---|---|---|
| UC-09 | Navegar no catálogo de exercícios (pesquisa, filtros por músculo/equipamento/nível/status) | Trainer, Client |
| UC-10 | Criar / editar exercício | Trainer |
| UC-11 | Definir status do exercício (`draft`, `active`, `restricted`, `blocked`) | Trainer |
| UC-12 | Definir alternativas e restrições por exercício | Trainer |
| UC-13 | Navegar e criar protocolos de treino | Trainer |
| UC-14 | Bloquear prescrição de exercícios `blocked` | System |

**Regra crítica:** IA e Trainer não podem prescrever exercício bloqueado ou inexistente na biblioteca.  
**Status de implementação:** ✅ `TrainerLibraryExercisesScreen`, tabelas `exercises` e `workout_protocols`.

---

### M2 — Check-In e Safety Gate

| # | Caso de Uso | Actor |
|---|---|---|
| UC-15 | Submeter check-in pré-treino (energia, sono, fadiga, dor, tempo, local, equipamentos) | Client |
| UC-16 | Avaliar prontidão e executar Safety Gate | System / AI |
| UC-17 | Bloquear treino AI-led se dor ≥ 7 | System |
| UC-18 | Sinalizar para revisão humana (cria alerta + tarefa para trainer) | System |
| UC-19 | Recomendar treino leve se energia + sono são baixos | AI Coach |
| UC-20 | Recomendar treino curto se tempo disponível é reduzido | AI Coach |

**Resultados possíveis do Safety Gate:** `released` · `adapted` · `review recommended` · `blocked`  
**Status de implementação:** ✅ `CheckInProntidaoScreen`, `saveCheckinV2`, `updatePainRecurrence`.

---

### M3 — Planeamento e Prescrição de Treino

| # | Caso de Uso | Actor |
|---|---|---|
| UC-21 | Criar plano de treino para um aluno | Personal Trainer |
| UC-22 | Adicionar exercícios da biblioteca (séries, repetições, carga sugerida, descanso) | Personal Trainer |
| UC-23 | Guardar plano como rascunho | Personal Trainer |
| UC-24 | Aprovar e activar plano | Personal Trainer |
| UC-25 | IA gera proposta de plano a partir do check-in + perfil | AI Coach |
| UC-26 | Trainer revê e valida proposta da IA antes de activação | Personal Trainer |

**Regra crítica:** Plano prescrito e sessão executada são **entidades distintas**.  
**Status de implementação:** ✅ `WorkoutPlanEditorScreen`, `StartWorkoutScreen`, API `generate-workout`.

---

### M4 — Execução Real da Sessão

| # | Caso de Uso | Actor |
|---|---|---|
| UC-27 | Iniciar sessão de treino | Client |
| UC-28 | Ver exercício actual (nome, séries, reps, carga, descanso, notas) | Client |
| UC-29 | Registar série (reps realizadas, carga usada, RPE) | Client |
| UC-30 | Substituir exercício | Client |
| UC-31 | Saltar exercício | Client |
| UC-32 | Reportar dor durante a sessão | Client |
| UC-33 | Finalizar treino | Client |
| UC-34 | Ver resumo pós-treino (duração, taxa de conclusão, séries) | Client |
| UC-35 | Submeter feedback pós-treino (classificação, notas) | Client |

**Regra crítica:** A performance futura deve ser calculada sobre o que foi **realmente executado**, não sobre o plano prescrito.  
**Status de implementação:** ✅ `WorkoutModeScreen`, `WorkoutInProgressScreen`, `PostWorkoutSummaryScreen`, tabelas `workout_sessions` / `workout_set_logs`.

---

### Eventos, Alertas e Tarefas

| # | Caso de Uso | Actor |
|---|---|---|
| UC-36 | Gerar evento automaticamente em transições-chave (`checkin_submitted`, `workout_started`, `set_completed`, `pain_reported`, `workout_completed`) | System |
| UC-37 | Criar alerta quando dor ≥ 7 | System |
| UC-38 | Criar tarefa para o trainer quando aluno precisa de atenção | System |
| UC-39 | Visualizar alertas abertos e tarefas pendentes | Personal Trainer |
| UC-40 | Resolver / dispensar tarefa | Personal Trainer |

---

### Dashboard do Aluno

| # | Caso de Uso | Actor |
|---|---|---|
| UC-41 | Ver próxima acção segura (CTA muda conforme estado) | Client |
| UC-42 | Ver status de prontidão do dia | Client |
| UC-43 | Ver treino de hoje | Client |
| UC-44 | Ver resumo simples de progresso | Client |
| UC-45 | Ver mensagens ou alertas básicos | Client |

**Estados do CTA:** `Completar perfil` → `Fazer check-in` → `Iniciar treino` → `Ver versão adaptada` → `Solicitar revisão`

---

### Dashboard do Personal Trainer

| # | Caso de Uso | Actor |
|---|---|---|
| UC-46 | Ver lista de alunos vinculados | Personal Trainer |
| UC-47 | Ver alunos que precisam de atenção | Personal Trainer |
| UC-48 | Ver alertas abertos | Personal Trainer |
| UC-49 | Ver tarefas pendentes | Personal Trainer |
| UC-50 | Ver planos pendentes | Personal Trainer |
| UC-51 | Abrir detalhe do aluno (perfil, histórico de check-ins, sessões, sinais de dor) | Personal Trainer |

**Pergunta principal que esta tela responde:** *Quem precisa da minha atenção agora?*  
**Status de implementação:** ✅ `TrainerDashboardScreen`, `TrainerClientDetailScreen`.

---

### Permissões e RLS

| # | Caso de Uso | Actor |
|---|---|---|
| UC-52 | Cliente acede apenas aos próprios dados | System (RLS) |
| UC-53 | Trainer acede apenas aos alunos vinculados | System (RLS) |
| UC-54 | Exercícios bloqueados não podem ser prescritos | System |
| UC-55 | Acções de IA são registadas e auditáveis | System |
| UC-56 | Dor ≥ 7 bloqueia autonomia da IA | System (Safety Gate) |

---

## Fluxo Operacional End-to-End

```
CLIENT                          SYSTEM / AI                    TRAINER
  │                                  │                             │
  ├─ Registar + definir papel ─────► │                             │
  ├─ Completar perfil (M1) ────────► │ ◄── Trainer vincula aluno ──┤
  │   └─ Incompleto? Bloquear treino │                             │
  │                                  │                             │
  ├─ Check-in diário (M2) ─────────► │                             │
  │                                  ├─ Safety Gate               │
  │                                  │   ├─ Dor ≥ 7? ────────────►│ Alerta + Tarefa
  │                                  │   ├─ Energia baixa? → adapt │
  │                                  │   └─ Libertado → continuar  │
  │                                  │                             │
  │   ◄── IA gera plano ──────────── │ ◄── Trainer cria plano ─────┤
  │        (M3, check-in + perfil)   │      (M3, manual ou IA)     │
  │                                  │                             │
  ├─ Iniciar treino (M4) ──────────► │                             │
  │   ├─ Registar séries/reps/RPE   │                             │
  │   ├─ Substituir / saltar        │                             │
  │   ├─ Reportar dor ─────────────►│ → Alerta → Tarefa ─────────►│
  │   └─ Finalizar treino           │                             │
  │                                  │                             │
  │   ◄── Resumo pós-treino ──────── │                             │
  │   ◄── Feedback ────────────────  │                             │
  │                                  │                             │
  │                                  │ ◄── Trainer vê dashboard ───┤
  │                                  │      - Alertas              │
  │                                  │      - Sessões do aluno     │
  │                                  │      - Sinais de dor        │
```

---

## Fora do Âmbito do MVP v1

| Funcionalidade | Módulo | Justificativa |
|---|---|---|
| Scores de performance e analytics preditivo | M5 | Requer dados reais de execução primeiro |
| Ajuste de plano com IA e deload | M6 | Depende de M5 |
| Mensagens aluno–trainer | M7 | Requer contexto operacional primeiro |
| Gestão de estúdio (equipa, permissões) | M10 | Adiciona complexidade antes do núcleo estar provado |
| Relatórios e prova de valor | M11 | Requer dados de M4–M6 |
| Recomendações de IA governadas | M12 | Requer guardrails + dados reais |
| Billing e assinaturas | M13 | Valor deve ser provado primeiro |
| Comunidade, desafios e conquistas | M14 | Privacidade/moderação demasiado complexas cedo |

---

## Mapa de Fases de Desenvolvimento (fonte: MVP doc)

| Fase | Conteúdo |
|---|---|
| 4.1 Fundação | Auth, contexto, papéis, RLS, rotas |
| 4.2 Núcleo do Aluno | Perfil, consentimento, check-in, Safety Gate |
| 4.3 Núcleo Técnico | Biblioteca (M8), prescrição (M3) |
| **4.4 Execução Real** | **M4 — Sessão, set logs, dor, resumo** ← fase actual |
| 4.5 Operação Profissional | Eventos, alertas, tarefas, dashboard do trainer |
| 4.6 Inteligência Adaptativa | Performance, scores, ajustes |
| 4.7 IA Governada | Recomendações, guardrails, Edge Functions |
| 4.8 Profissionalização | Comunicação, agenda, relatórios |
| 4.9 Studio | Equipa, permissões, política de IA |
| 4.10 Comercial | Planos, assinaturas, billing |
| 4.11 Engajamento | Desafios, conquistas, comunidade |

---

## Regra de Ouro

> **A ordem mais segura de desenvolvimento é:**  
> Fundação → Perfil → Biblioteca → Check-in/Safety Gate → Prescrição →  
> Execução Real → Eventos/Alertas/Tarefas → Performance → Ajustes → IA  
> → Comunicação/Agenda/Relatórios → Studio → Billing → Comunidade.
>
> O MVP Core Operacional do TRAINER deve ser desenvolvido como um **sistema de fluxo**, não como uma colecção de ecrãs.

---

*Documento gerado por AI com base em `TrAIner Project_MVP.pdf` e análise do codebase em 2026-05-26.*  
*Actualizar sempre que novos módulos forem implementados ou o âmbito do MVP for revisto.*
