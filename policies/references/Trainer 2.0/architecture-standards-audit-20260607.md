# Auditoria de Padrões de Engenharia & UX — 2026-06-07

**Escopo:** `src/` (177 TS/TSX, 48 telas), avaliado contra os pilares declarados:
modularidade, reuso/compartilhamento de código, UX/UI previsível sob design
system central, estabilidade e segurança.

**Nota:** o ciclo de limpeza de 7 fases (`codebase-audit-and-cleanup-plan-20260607.md`)
já tratou dead code, lint, casts `as any`, convenção de logging e higiene de SQL.
Este documento foca em **padrões estruturais/arquiteturais** não cobertos ali.

---

## 1. Modularidade

### 1.1 Telas-monólito (god-files)
Cinco telas concentram lógica, estado, fetch de dados e apresentação em um único
arquivo, em vez de delegar a hooks/sub-componentes:

| Arquivo | Linhas |
|---|---|
| `src/screens/client/PerformanceDashboardScreen.tsx` | 1043 |
| `src/screens/client/StartWorkoutScreen.tsx` | 972 |
| `src/screens/trainer/TrainerClientDetailScreen.tsx` | 890 |
| `src/screens/trainer/TrainerLibraryExercisesScreen.tsx` | 825 |
| `src/screens/trainer/TrainerDashboardScreen.tsx` | 686 |

**Severidade: média.** Não é dead code nem bug — é debt estrutural. Arquivos
desse porte dificultam revisão, testes e reuso, e tendem a acumular ainda mais
responsabilidades com o tempo.

### 1.2 Acesso direto ao Supabase a partir de telas
8 telas chamam `supabase.from/rpc/channel/auth` diretamente, em vez de passar
por hooks (`src/hooks/`, 5 arquivos) ou `lib/` (1 arquivo) — quebrando a camada
de abstração de dados que o restante do sistema segue:

`RegisterScreen.tsx`, `LoginScreen.tsx`, `InboxScreen.tsx`,
`CheckInProntidaoScreen.tsx`, `StartWorkoutScreen.tsx`,
`TrainerClientDetailScreen.tsx`, `WorkoutPlanEditorScreen.tsx`,
`TrainerDashboardScreen.tsx`.

**Severidade: média.** Login/Register acessando auth diretamente é aceitável
(fronteira natural). Mas `StartWorkoutScreen`, `TrainerClientDetailScreen`,
`TrainerDashboardScreen` e `WorkoutPlanEditorScreen` — exatamente os arquivos
mais longos da lista 1.1 — misturam fetch, realtime subscriptions e
apresentação no mesmo lugar, reforçando o problema de modularidade.

---

## 2. Reuso / Compartilhamento de código

### 2.1 Spinner/loading reimplementado localmente
Não existe um componente `Spinner`/`LoadingState` compartilhado em `src/ui/`
(que tem 17 componentes, mas nenhum de loading). Resultado: 6 telas
reimplementam sua própria UI de carregamento com `<div>` + `animation: spin`
inline, e 2 arquivos declaram `function Spinner(...)` localmente
(`Step15RiskClassification.tsx`, `CheckInVoice.tsx:126,280` — esta última
duplica a própria função Spinner duas vezes no mesmo arquivo).
`PerformanceDashboardScreen.tsx:176` define seu próprio `LoadingState()`.

Telas com spinner próprio: `Step15RiskClassification`, `CheckInVoice`,
`WorkoutModeScreen`, `StartWorkoutScreen`, `PerformanceDashboardScreen`,
`WorkoutPlanEditorScreen`.

**Severidade: média.** Padrão repetido em pelo menos 6 lugares — candidato
claro a um componente único em `src/ui/`, hoje inexistente.

### 2.2 Formatação de data/hora/número duplicada inline
30 ocorrências de `toLocaleDateString`/`toLocaleTimeString`/`toFixed` espalhadas
em 12 telas, cada uma montando suas próprias opções de `Intl` — incluindo
inconsistências de locale: algumas usam `i18n.language`, outras usam literais
fixos `'en-GB'` ou `'en-US'` independentemente do idioma do usuário
(`CycleScreen.tsx:151`, `HistoryScreen.tsx:72,76` usam `'en-GB'` fixo;
`PostWorkoutSummaryScreen.tsx:161-162` e `StartWorkoutScreen.tsx:541` usam
`i18n.language || 'en-US'`).

`src/lib/` não contém nenhum helper de formatação (`format*`).

**Severidade: média — risco de UX inconsistente entre telas no mesmo idioma.**
Um cliente DE pode ver datas em formato `en-GB` numa tela e `de` em outra,
dependendo de qual desenvolvedor escreveu o componente.

---

## 3. UX/UI — Consistência sob design system central

### 3.1 Cores hardcoded fora do tema
339 ocorrências de cores hex/rgb literais dentro de `src/screens/`, concentradas
em poucos arquivos:

| Arquivo | Ocorrências |
|---|---|
| `StartWorkoutScreen.tsx` | 44 |
| `TrainerDashboardScreen.tsx` | 42 |
| `TrainerLibraryExercisesScreen.tsx` | 34 |
| `TrainerClientDetailScreen.tsx` | 24 |
| `CheckInQuick.tsx` | 17 |
| `CheckInResult.tsx` | 16 |

44 de 48 telas (92%) importam de `theme/`/`theme/tokens` — o sistema de tema
*é* usado como base —, mas o vazamento de valores literais nesses arquivos
específicos (incluindo cores semânticas como `'#10B981'` para status "ativo",
linha 411 do dashboard do trainer) indica que paletas de status/feedback não
estão centralizadas em tokens, forçando reinvenção tela a tela.

**Severidade: baixa-média.** Não é dead code nem bug funcional — é debt de
design system. Esses são exatamente os arquivos mais longos (seção 1.1),
reforçando que "tela grande" e "foge do design system" andam juntos aqui.

### 3.2 Estilo inline extensivo
1306 ocorrências de `style={{ ... }}` dentro de `src/screens/`. Construir
estilos ad-hoc por componente em vez de via tokens/variantes do `src/ui/`
dificulta auditoria visual e propaga o problema de 3.1.

**Severidade: baixa** isoladamente, mas é o mecanismo pelo qual 3.1 acontece —
vale tratar como sintoma do mesmo problema raiz.

### 3.3 Ausência de componente de Empty State
Nenhuma ocorrência de `EmptyState`/padrão de "nenhum dado" encontrada em
`src/ui/` ou `src/screens/`. Não é possível afirmar se cada tela trata o caso
"sem dados" de forma própria e ad-hoc, ou simplesmente não trata — qualquer das
duas hipóteses é uma lacuna de consistência de UX que merece levantamento mais
profundo por amostragem de telas.

**Severidade: a confirmar — recomenda-se inspeção dirigida** (não coberta por
grep simples).

### 3.4 Diálogos de confirmação
Nenhum uso de `window.confirm`/`window.alert` foi encontrado (bom — não há
vazamento de diálogos nativos do browser). Existe um único componente
`Alert.tsx` em `src/ui/`, mas não há `Modal`/`Dialog`/`ConfirmSheet` dedicado;
não foi possível confirmar, sem leitura individual das 48 telas, se ações
destrutivas (cancelar plano, remover cliente, etc.) usam um padrão de
confirmação único ou cada uma monta seu próprio overlay.

**Severidade: a confirmar.**

---

## 4. Estabilidade & Segurança

### 4.1 Nenhum segredo hardcoded
Varredura por padrões `api_key`/`secret`/`password`/`token` com valores
literais não retornou ocorrências em `src/`. **Positivo — confirma a baseline
de segurança já registrada na Fase 5 do plano de limpeza.**

### 4.2 Supressões de regra de hooks ainda presentes
5 ocorrências de `eslint-disable ... react-hooks/exhaustive-deps` (ou
correlatas) remanescentes em `src/`. Não investigado se são justificadas;
ficam registradas para triagem — especialmente à luz do bug real de
Rules-of-Hooks já corrigido em `CycleScreen.tsx` durante o ciclo anterior.

**Severidade: baixa — merece triagem pontual**, não pânico (volume pequeno).

### 4.3 Nenhum TODO/FIXME/HACK reintroduzido
Confirma que a baseline "zero debt marker" da Fase 4 do ciclo anterior se
mantém — nenhuma regressão.

---

## 5. Resumo executivo

| Tema | Achado central | Severidade | Amplitude |
|---|---|---|---|
| Modularidade | 5 telas-monólito (686–1043 LOC) concentram fetch+estado+UI | Média | 5 de 48 telas |
| Modularidade | 8 telas acessam Supabase direto, ignorando a camada de hooks/lib | Média | 8 de 48 telas |
| Reuso | Spinner/LoadingState reimplementado localmente, sem componente central | Média | ≥6 telas, 1 com duplicação interna |
| Reuso | Formatação de data/hora/número duplicada, com locale inconsistente | Média | 30 ocorrências em 12 telas |
| UX/Tema | Cores hex hardcoded concentradas em telas grandes (até 44/arquivo) | Baixa-média | 339 ocorrências, 6 arquivos concentram ~70% |
| UX/Tema | 1306 `style={{}}` inline — sintoma do vazamento acima | Baixa | Generalizado |
| UX/Tema | Sem componente de Empty State / confirmação de ação destrutiva central | A confirmar | Requer inspeção dirigida |
| Segurança | Sem segredos hardcoded, sem TODO/FIXME residual | — | Baseline confirmada (positivo) |
| Estabilidade | 5 supressões `exhaustive-deps` remanescentes | Baixa | Triagem pontual |

**Padrão geral observado:** os mesmos 4–6 arquivos aparecem repetidamente como
outliers em modularidade, acesso a dados e fidelidade ao design system — não é
um problema disperso por todo o sistema, é concentrado nas telas
mais antigas/maiores (`StartWorkoutScreen`, `TrainerDashboardScreen`,
`TrainerClientDetailScreen`, `TrainerLibraryExercisesScreen`,
`PerformanceDashboardScreen`, `WorkoutPlanEditorScreen`). Isso sugere que a
correção mais eficiente não é uma campanha ampla, mas um plano de refatoração
focado nesse conjunto específico.

---

## Status pós-convergência (2026-06-07)

O plano de convergência derivado desta auditoria
(`architecture-convergence-plan-20260607.md`) foi executado e fechado em
5 fases no mesmo dia. Métricas finais e resumo do engajamento estão na
seção "Fase 5 — Verificação de convergência" daquele documento — incluindo
a tabela antes/depois e a observação de que várias estimativas desta
auditoria inicial (cores hex ~339→66, telas com Supabase direto 8→6,
supressões `exhaustive-deps` 5→4) eram superiores ao escopo real, revelado
só através de investigação linha-a-linha de cada arquivo.

---

*Documento de constatação factual — sem recomendações de correção. Aguardando
sua avaliação para definição de prioridades e plano de ação.*
