# Coach DNA — Perfil do Personal Trainer
## Especificação técnica de sistema de design (System Design para implementação por IA)

> **Documento de referência** para reprodução/implementação em alta fidelidade.
> Capturado a partir de `Coach DNA - Perfil do Personal Trainer.html` (TrAIner Project).
> Fonte de requisitos: `uploads/Personal Trainer Profile (PTP)_english.md`.
> Trilha: **Coach Studio (B2B) · "Feed the AI"** — paralela à trilha do aluno (Módulo 01).

---

## 1. Visão geral

### 1.1 Propósito do módulo
Capturar a **identidade técnica, o estilo comportamental e a metodologia** do personal trainer, de modo que o **AI Coach Engine** gere treinos com a *assinatura real* do coach — e não recomendações genéricas.

> *"Quanto mais fiel for o perfil do treinador, mais os treinos gerados parecerão escritos por ele."*

É o **construtor de perfil do treinador** (companion do "Perfil Inteligente do Aluno"). Onde o módulo do aluno produz um `RISK_LEVEL`, este produz um `COACH_ARCHETYPE`.

### 1.2 Saída principal
Um objeto **`coach_dna.json`** (ver §8) + um **arquétipo de coaching** derivado (ver §7), prontos para alimentar o gerador de treinos.

### 1.3 Estrutura do shell (3 colunas + tweaks)
```
┌─────────────┬──────────────────┬─────────────┐
│             │                  │             │
│  Context    │   Phone Frame    │  Live JSON  │
│  Panel      │   (420×860)      │  Peek       │
│  (280px)    │   iPhone-style   │  (320px)    │
│             │                  │             │
└─────────────┴──────────────────┴─────────────┘
                                          ↘ Tweaks panel (flutuante)
```
- **Coluna esquerda (280px):** título do módulo + lista navegável dos 12 blocos (com estado done/current) + chip do **Coach Archetype** ao vivo.
- **Coluna central (420×860px):** mockup do app em phone frame iOS, com header + conteúdo rolável + barra de ação inferior.
- **Coluna direita (320px):** peek do `coach_dna.json` ao vivo (mono) + card "Assinatura de coaching".
- **Tweaks flutuante:** frame on/off, JSON peek on/off, navegação por bloco, override do arquétipo.

### 1.4 Background do shell
```css
background:
  radial-gradient(1200px 700px at 80% -10%, rgba(239,92,60,.09), transparent 50%),
  radial-gradient(900px 600px at -10% 110%, rgba(45,212,224,.07), transparent 50%),
  #08111E;
padding: 28px;
gap: 32px;
```
> **Inversão cromática proposital:** trilha do aluno lidera com **cyan**; a trilha do coach lidera com **coral** (cor de accent / marca do coach). O glow superior-direito é coral; o inferior-esquerdo é cyan.

---

## 2. Design tokens

### 2.1 Cores (Brand TrAIner) — objeto `B`
| Token | Hex | Uso |
|---|---|---|
| `navy` | `#0E1A2B` | Background interno do app |
| `navyDeep` | `#08111E` | Background externo (shell) |
| `surfRaised` | `#142233` | Cards, seções, inputs elevados |
| `surfRaised2` | `#1A2A40` | Sub-elevação (drag ativo) |
| `border` | `#1F2E45` | Hairlines, divisores |
| `borderSoft` | `#243650` | Hairlines secundárias, dashed |
| `cyan` **(primary)** | `#2DD4E0` | Seleções neutras, foco, "força" |
| `cyanDeep` | `#0F8C85` | Gradientes/profundidade |
| `cyanSoft` | `#9DECF3` | Highlights, mono IA, ambientes |
| `coral` **(accent / coach)** | `#EF5B3C` | CTA do módulo, Coach DNA, archetype default, "evitar" |
| `lavender` | `#A78BFA` | Boolean true, mobilidade, público-alvo |
| `amber` | `#F5B45A` | Atenção, coordenação |
| `green` | `#4ADE80` | Sucesso, equilíbrio |
| `text` | `#FFFFFF` | Texto primário |
| `textSec` | `rgba(255,255,255,.65)` | Texto secundário |
| `textMute` | `rgba(255,255,255,.4)` | Labels, metadados, eixos |

> O **CTA primário** deste módulo é **coral** (`#EF5B3C`) com texto branco e `box-shadow: 0 10px 30px #EF5B3C44` — diferente do módulo do aluno (cyan com texto navy).

### 2.2 Tipografia
```css
--ff-display: "Plus Jakarta Sans", "Inter", system-ui, sans-serif;
--ff-body:    "Inter", system-ui, -apple-system, sans-serif;
--ff-mono:    "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
```
| Uso | Família | Peso | Tamanho | Letter-spacing | Notas |
|---|---|---|---|---|---|
| H1 intro/output | Display | 800 | 27–30px | -0.02em | line 1.08–1.1 |
| H2 (StepHeader) | Display | 700 | 24px | -0.01em | line 1.15 |
| Kicker (eyebrow) | Mono | 700 | 10.5px | 0.18em | UPPERCASE, coral ou cyan |
| BLOCO NN/NN | Mono | 700 | 10.5px | 0.15em | UPPERCASE, cyan |
| FieldLabel | Body | 600 | 11.5–12px | 0.06em | UPPERCASE, textSec |
| Body | Body | 400–500 | 13–13.5px | normal | line 1.45–1.55 |
| Hint (microcopy) | Body | 400 | 12.5px | normal | itálico, entre aspas curvas |
| Chip | Body/Mono | 600 | 12.5px | normal | — |
| Mono value (peek) | Mono | 400–600 | 11px | 0.02–0.04em | cyanSoft/color-coded |
| Stat grande (level/total) | Display | 800 | 16–26px | -0.01em | — |

### 2.3 Espaçamento e raios
| Token | Valor |
|---|---|
| Gap entre cards/seções | 8–14px |
| Padding card pequeno | 12–14px |
| Padding screen (telefone) | `18px 22px 100px` |
| Radius — pill/chip | 999px |
| Radius — card pequeno | 10–13px |
| Radius — card grande | 14px |
| Radius — PhotoSlot | 24px |
| Radius — botão | 9–14px |
| Radius — phone notch | 16px |
| Radius — phone screen | 42px |
| Radius — phone outer | 52px |

### 2.4 Sombras e efeitos
```css
/* Phone frame */
box-shadow: 0 50px 100px rgba(0,0,0,.6), inset 0 0 0 1px #2a3a52;
background: linear-gradient(180deg,#202B3B 0%,#0E1822 100%);
/* CTA coral */
box-shadow: 0 10px 30px #EF5B3C44;
/* Peek JSON */
box-shadow: 0 30px 60px rgba(0,0,0,.3);
/* Ícone-herói intro/output */
box-shadow: 0 12px 30px <accentColor>44;
```

### 2.5 Keyframes
```css
@keyframes wave        { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
@keyframes pulse-ring  { 0% { transform: scale(0.9); opacity: 0.7; } 100% { transform: scale(1.6); opacity: 0; } }
```
> **REGRA CRÍTICA (regressão conhecida):** **NÃO** aplicar animação de entrada no contêiner `.step-fade` via keyframe que parta de `opacity: 0`. Quando o relógio de animação do iframe é congelado (preview/captura), o valor corrente em 0% (`opacity: 0`) sobrescreve qualquer base e o conteúdo fica invisível. Usar estado de repouso visível:
> ```css
> .step-fade { opacity: 1; }
> .step-fade > * { opacity: 1; }
> ```
> Entrada animada, se desejada, deve ser feita por elemento com `animation-fill-mode` que **não** deixe `opacity:0` como valor de repouso — ou simplesmente omitida (abordagem adotada).

---

## 3. Phone frame (iOS-style)

- Outer: **420×860px**, `borderRadius: 52`, bezel gradient `#202B3B → #0E1822`, `padding: 12`.
- Inner screen: `borderRadius: 42`, `background: navy`, `overflow: hidden`.
- Notch: **110×28px**, top 8, centralizado, `#000`, `borderRadius: 16`, `z-index: 100`.
- Status bar: 44px, padding `14px 28px`, "9:41" à esquerda, "5G + bateria (SVG 22×11)" à direita, `pointer-events: none`.
- Quando `showFrame = false`: cair para um cartão `420×820`, `borderRadius: 28`, `border 1px border`, sem bezel/notch/status.

### 3.1 Header do app
```
┌──────────────────────────────────────────────┐
│ [back]    TrAIner · Coach Studio       [✓]   │
│           Bloco N de 12 / Coach DNA / Concluído│
│ ▰▰▰▰▱▱▱▱▱▱  (barra de progresso 3px)         │
└──────────────────────────────────────────────┘
```
- Padding `16px 22px 12px`, `borderBottom: 1px solid border`.
- **Back** 34×34 (radius 10, surfRaised); desabilitado/opacidade 0.3 na intro.
- **Centro:** kicker mono **coral** "TrAIner · Coach Studio" (.18em) + subtítulo dinâmico (`Coach DNA` na intro · `Bloco N de 12` nos blocos · `Concluído` no output).
- **✓** salvar (34×34, surfRaised) → `alert` de progresso salvo.
- **Progress bar:** track 3px `border`; fill `linear-gradient(90deg,#C23B22,#EF5B3C)`, `width = step/12 * 100%`, `transition .35s`.

### 3.2 Barra de ação inferior (BottomBar)
- Padding `14px 18px 18px`, `borderTop: 1px solid border`, fundo navy.
- **Intro:** 1 botão coral full-width — "Construir meu Coach DNA".
- **Blocos 1–11:** "Salvar" (outline) + "Continuar" (coral).
- **Bloco 12:** "Salvar" + "Gerar Coach DNA" (coral).
- **Output (13):** "Editar" (outline → vai ao bloco 1) + "Ativar Coach DNA" (coral → `alert` de conexão ao AI Coach Engine).

---

## 4. Componentes-base (atoms) — `coach-atoms.jsx`

### 4.1 `<Icon name size color stroke>`
SVG inline 24×24, paths-only, stroke `currentColor`, linecap/linejoin round. **Inventário (≈40):** `back, check, x, chevron, chevronDown, plus, minus, user, users, camera, medal, dumbbell, flame, run, gauge, percent, layers, grip, target, activity, heart, zap, sparkles, quote, compass, shield, shieldCheck, brain, mic, clock, fingerprint, wave, ban, mountain, trophy`.

### 4.2 `<Chip active onClick color multi locked mono>`
Pill de seleção. `padding 9px 14px`, `radius 999`, borda 1.5px. Ativo: `bg ${color}22`, texto `color`, borda `color`. `multi` exibe ícone `check` 12px à esquerda quando ativo. `mono` aplica `FF_MONO`.

### 4.3 `<ChoiceCard active onClick icon title sub color>`
Card-linha de escolha grande. `padding 14`, `radius 14`. Ícone em badge 38×38 à esquerda; título display 14.5 + sub 11.5; radio-check 18px à direita. Ativo: `bg ${color}14`, borda `color`.

### 4.4 `<Field label value onChange placeholder type suffix mono helper optional>`
Input de texto. Label UPPERCASE 11.5 textSec (+ "· opcional"). Caixa: `bg navy`, borda 1.5px, radius 12. `suffix` em mono à direita. `helper` em 11 textMute abaixo.

### 4.5 `<TextArea label value onChange placeholder helper rows optional>`
Mesma moldura do Field, multi-linha, `resize: vertical`, line 1.5.

### 4.6 `<PrivacyNote tone>` — *info note*
Caixa com ícone + texto. Tonalidades:
| tone | cor | ícone | uso |
|---|---|---|---|
| `default` | cyan | `sparkles` | explicação neutra de como o dado alimenta a IA |
| `coach` | coral | `fingerprint` | reforço de identidade/assinatura do coach |
| `optional` | lavender | `brain` | recurso opcional/explicativo |

### 4.7 `<Hint>` 
Microcopy itálica entre aspas curvas `“…”`, 12.5 textSec, margin-bottom 18. Usada como "pergunta do app" no topo de blocos.

### 4.8 `<StepHeader idx total title sub badge>`
Cabeçalho de bloco: linha mono "BLOCO NN / NN" (cyan) + `badge` opcional (pill coral); H2 display 24; sub 13 textSec.

### 4.9 `<FieldLabel hint>`
Rótulo de grupo: 12 textSec weight 600 + `· hint` em textMute.

### 4.10 `<Slider value onChange min max step label suffix color>`
Range com label + valor mono à direita; min/max em mono abaixo; `accent-color: color`.

### 4.11 `<ToggleRow on onChange title sub>`
Linha clicável com switch 38×22 à direita (knob navy). Ativo: borda cyan + track cyan.

### 4.12 `<VoiceBar active onToggle hint>`
Entrada por voz (dashed). Mic 32px (coral ativo / cyan idle), `pulse-ring` quando ativo, 5 wave-bars animadas. Texto "Ditar para a IA" / "Gravando…". **É decorativo/simulado** no protótipo.

### 4.13 `<PhotoSlot value onChange name>` *(novo)*
Upload de avatar via `<input type=file>` oculto + `URL.createObjectURL`. Slot 92×92 radius 24. Sem imagem: mostra iniciais derivadas de `name` (ou ícone `camera`). Com imagem: `background cover` + faixa "TROCAR". Botão "Enviar/Trocar imagem" ao lado.

### 4.14 `<LevelPicker value onChange items>` *(novo)*
Seletor 1–5 (lista vertical). Cada item: badge numérico 34px + título/sub + **mini barras de força** (5 barras, preenchidas conforme `5 - n`). Ativo: `bg cyan14`, badge cyan.

### 4.15 `<FocusBars items values onChange colorMap>` *(novo — assinatura do módulo)*
Distribuição percentual que **deve somar 100%**.
- Header: botão "Equilibrar" (auto-balance dividindo 100 entre N) + **TOTAL** colorido (`green` se =100, `coral` se >100, `amber` se <100).
- **Barra empilhada** (14px) mostrando proporção por cor.
- Uma linha por item: dot colorido + label + `%` mono + `<input type=range step=5>` com `accent-color` do item.
- Rodapé: mensagem "Faltam X%" / "Reduza X%" quando ≠ 100.

### 4.16 `<StructureSorter items onChange>` *(novo)*
Ordenação **drag-and-drop** (HTML5 `draggable`) **+ setas** ↑/↓ como fallback acessível.
- Cada linha: índice (1..n) + ícone colorido + label/sub + 2 botões de seta + handle `grip`.
- Estado: `dragIdx`/`overIdx`; `move(from,to)` reordena por splice; borda cyan no alvo de drop; opacidade 0.6 no item arrastado.

### 4.17 `<TagPicker value onChange suggestions max placeholder color>` *(novo)*
Lista de tags com input livre + sugestões.
- Input + botão `+`; Enter adiciona; bloqueia em `max` (mostra "Limite de N atingido"); evita duplicatas (case-insensitive).
- Tags selecionadas: pill com `×` para remover. Sugestões: chips dashed clicáveis (somem ao adicionar). Contador `n/max`.

---

## 5. Blocos do fluxo (Intro + 12 + Output) — `coach-steps.jsx`

`TOTAL = 12`. `renderStep()` em `coach-app.jsx` mapeia `step` 0..13.

| step | Componente | Título | Entradas | Estado (`data.*`) |
|---|---|---|---|---|
| 0 | `StepIntro` | Coach DNA (intro) | — | — |
| 1 | `Step01` | Identidade do treinador | PhotoSlot, nome (Field), gênero (Chips), idade (Field) | `identity {photo,name,gender,age}` |
| 2 | `Step02` | Formação e experiência | anos (Slider 0–40), certificações (ChoiceCard multi) | `background {years, certs[]}` |
| 3 | `Step03` | Seu nível físico atual | LevelPicker 1–5 | `fitness {level}` |
| 4 | `Step04` | Como e onde você treina | métodos (Chips multi), ambientes (Chips multi), intensidade (Chips single) | `training {methods[],envs[],intensity}` |
| 5 | `Step05` | Estilo de coaching `[Coach DNA]` | estilos (grid 2-col, multi) | `dna.style[]` |
| 6 | `Step06` | Princípios fundamentais `[≤3]` | princípios (lista, **máx 3**, ordenados/ranqueados) | `dna.principles[]` |
| 7 | `Step07` | Distribuição de foco `[=100%]` | FocusBars (6 capacidades) | `focus {strength,endurance,mobility,athletic,coord,balance}` |
| 8 | `Step08` | Exercícios assinatura | favoritos (TagPicker máx 10), a evitar (TagPicker) | `exercises {favorites[],avoid[]}` |
| 9 | `Step09` | Formatos e curva de intensidade | formatos (Chips mono multi), curva (ChoiceCard single) | `design {formats[],curve}` |
| 10 | `Step10` | Estrutura da sessão `[arraste]` | StructureSorter (6 blocos) | `structure[]` (array de chaves) |
| 11 | `Step11` | Comunicação e público | tom (Chips multi), perfis de cliente (Chips multi) | `audience {tone[],clients[]}` |
| 12 | `Step12` | Filosofia e personalidade da IA `[Final]` | lema (Field + exemplos), prompt de IA (TextArea) | `philosophy {motto,prompt}` |
| 13 | `StepOutput` | **{Archetype}** (Coach DNA) | — (render do resumo) | derivado |

### 5.1 Catálogos (constantes em `coach-steps.jsx`)
- `CERTS` (6): Personal Trainer · Treinador Fitness · Graduação Ed. Física/Ciências do Esporte · Fisioterapeuta · Strength & Conditioning · Outra. *(cada um com `icon`)*
- `FITNESS_LEVELS` (5): 1 Atleta de elite · 2 Muito condicionado · 3 Condicionado · 4 Mediano · 5 Moderadamente ativo.
- `METHODS` (12): CrossFit · Treino Funcional · HIIT · Circuito · Musculação/Bodybuilding · Treino de Força · Corrida · Mobilidade · Performance Atlética · Calistenia · Treino em Máquinas · Outro.
- `ENVIRONMENTS` (7): CrossFit Box · Academia comercial · Parque de calistenia · Ar livre s/ equip. · Ar livre elásticos · Indoor s/ equip. · Indoor elásticos.
- `INTENSITY` (4): Moderada · Desafiadora · Variável · Altamente exigente.
- `STYLES` (8): Motivacional · Profissional · Técnico · Orientado a performance · Descontraído/Bem-humorado · Empático · Direto · Disciplinado.
- `PRINCIPLES` (9): Qualidade antes da intensidade · Intensidade antes da perfeição · Saúde primeiro · Força primeiro · Atletismo primeiro · Mobilidade primeiro · Prazer e motivação primeiro · Função acima da estética · Progresso sustentável.
- `FOCUS_ITEMS` (6): Força · Resistência · Mobilidade · Performance atlética · Coordenação · Estabilidade/Equilíbrio. `FOCUS_COLORS` mapeia cada um a uma cor da paleta.
- `FORMATS` (10): EMOM · AMRAP · For Time · Intervalado · Circuito · Super-séries · Força + MetCon · Apenas Força · Apenas Condicionamento · Tabata.
- `STRUCTURE_BLOCKS` (6): Mobilidade · Aquecimento · Técnica · Força · Condicionamento/WOD · Volta à calma *(cada um com `icon`+`color`)*.
- `CURVES` (5): Crescente progressiva · Ondulatória · Pico inicial · Pico tardio · Constante.
- `TONES` (6): Profissional · Motivacional · Descontraído · Atlético · Direto · Técnico.
- `CLIENTS` (12): Iniciantes · Intermediários · Atletas avançados · Mulheres · Homens · Idosos · Trabalho de escritório · Emagrecimento · Ganho de massa · Reabilitação · Entusiastas de funcional · Atletas de CrossFit.
- `MOTTO_EXAMPLES` (4) e exemplos de prompt no `helper` do bloco 12.

> Mapeamento direto ao PTP: §1→bloco1, §2→bloco2, §3→bloco3, §4→bloco4, §5.1→bloco5, §5.2→bloco6, §6→bloco7, §7→bloco8, §8.1+8.3→bloco9, §8.2→bloco10, §9+§10→bloco11, §11+§12→bloco12.

---

## 6. Intro e Output

### 6.1 `StepIntro`
Ícone-herói 56px (gradient `coral → #C23B22`, ícone `fingerprint`) · kicker "COACH STUDIO · FEED THE AI" · H1 "Coach DNA" · parágrafo de propósito · lista de 5 destaques (ícone em badge coral + label) · `PrivacyNote tone="coach"` · meta mono "≈ 5–8 min · 12 blocos · alimenta o AI Coach Engine".

### 6.2 `StepOutput(data, archetype)`
- Ícone-herói 56px na cor do arquétipo + ícone do arquétipo.
- Kicker "SAÍDA · COACH DNA" + H1 = **nome do arquétipo** + sub descritivo.
- **Escala de arquétipos:** 6 segmentos (barra), o ativo na cor do arquétipo.
- **Card `coach_dna.json`** (resumo): pares chave→valor — `coach, experiencia, estilo, principios, metodos, foco_top, favoritos, evitar, formatos, publico, archetype`. `foco_top` = top-3 capacidades por %.
- Se houver `philosophy.motto`: card com ícone `quote` + lema em itálico display.
- `PrivacyNote tone="coach"` de fechamento.

---

## 7. Archetype engine — `computeArchetype(data)` (em `coach-app.jsx`)

Deriva 1 de **6 arquétipos** por **scoring ponderado** sobre estilo + princípios + distribuição de foco + intensidade.

### 7.1 Arquétipos (`ARCHETYPES`)
| key | nome | tag | cor | ícone |
|---|---|---|---|---|
| `performance` | Arquiteto de Performance | Performance Architect | coral | `zap` |
| `technician` | O Técnico | The Technician | cyan | `compass` |
| `motivator` | O Motivador | The Motivator | amber | `flame` |
| `guide` | O Guia | The Guide | green | `heart` |
| `drill` | O Disciplinador | The Drill Coach | `#FF4D4D` | `mountain` |
| `movement` | Especialista em Movimento | Movement Specialist | lavender | `wave` |

### 7.2 Pesos (resumo)
```
estilo:    perf+3→performance · tech+3→technician · motiv+3 / humor+2→motivator ·
           emp+3→guide · prof+1→technician&guide · disc+3 / direct+2→drill
princípio: 'Atletismo primeiro'+2 / 'Força primeiro'+2 / 'Intensidade antes da perfeição'(+1 perf,+2 drill)→performance/drill
           'Qualidade antes da intensidade'+3→technician · 'Prazer e motivação primeiro'+3→motivator
           'Saúde primeiro'+3 / 'Progresso sustentável'+2→guide
           'Mobilidade primeiro'+3 / 'Função acima da estética'+3→movement
foco:      athletic≥20 +2 / strength≥30 +1→performance · mobility≥25 +2 / balance≥20 +1→movement · coord≥20 +1→technician
intensid.: 'Altamente exigente' +1 performance & +1 drill · 'Moderada' +1 guide
```
- **Tie-break (ordem):** `performance → technician → movement → drill → guide → motivator`.
- Se `bestScore <= 0` → fallback **`technician`**.
- **Override:** `tweaks.archetypeOverride` (`auto` ou key fixa) tem precedência.

> O arquétipo aparece em 3 lugares: chip no `ContextPanel`, card "Assinatura de coaching" no `SidePeek`, e tela de `StepOutput`.

---

## 8. Modelo de dados

### 8.1 Estado interno (`data` em `CoachApp`) — prefill "Rafael Mendes"
```js
{
  identity:   { photo:null, name:'Rafael Mendes', gender:'Masculino', age:'34' },
  background: { years:11, certs:['pt','snc','edfis'] },
  fitness:    { level:2 },
  training:   { methods:[...], envs:['box','gym'], intensity:'Desafiadora' },
  dna:        { style:['perf','direct','tech'], principles:[...3] },
  focus:      { strength:30, endurance:20, mobility:15, athletic:20, coord:8, balance:7 },
  exercises:  { favorites:[...], avoid:['Box jump'] },
  design:     { formats:['AMRAP','EMOM','Força + MetCon'], curve:'progressive' },
  structure:  ['mobility','warmup','technique','strength','conditioning','cooldown'],
  audience:   { tone:[...], clients:[...] },
  philosophy: { motto:'…', prompt:'…' },
  voice:      null,        // bloco com voz ativa (id) ou null
}
```
`set(key,val)` faz merge raso por chave de topo.

### 8.2 Saída canônica `coach_dna.json` (estrutura-alvo do PTP §14)
```json
{
  "personalTrainerProfile": {
    "personalInformation":   { "profilePhoto":"", "fullName":"", "gender":"", "age":null },
    "professionalBackground":{ "yearsOfExperience":null, "certificationsEducation":[] },
    "personalFitnessLevel":  null,
    "trainingPreferences":   { "preferredTrainingMethods":[], "preferredTrainingEnvironments":[], "generalWorkoutIntensity":"" },
    "coachDNA": {
      "coachingStyle":[], "coreTrainingPrinciples":[],
      "trainingFocusDistribution":{ "strength":0,"endurance":0,"mobility":0,"athleticPerformance":0,"coordination":0,"stabilityBalance":0 }
    },
    "exercisePreferences":   { "favoriteExercises":[], "exercisesToAvoid":"" },
    "workoutDesignPreferences":{ "preferredWorkoutFormats":[], "preferredWorkoutStructure":[], "preferredIntensityCurve":"" },
    "communicationStyle":[], "primaryClientFocus":[],
    "coachPhilosophy":       { "motto":"", "aiPersonalityPrompt":"" },
    "derived":               { "coachArchetype":"" }
  }
}
```
> O `SidePeek` renderiza um subconjunto achatado ao vivo (`archetype, coach, experience_years, certifications, … dna_ready`). `dna_ready` torna-se `true` em `step >= 12`.

---

## 9. Tweaks panel

### 9.1 Defaults (`TWEAK_DEFAULTS`, editáveis pelo host via bloco `/*EDITMODE-BEGIN*/…/*EDITMODE-END*/`)
```json
{ "showFrame": true, "showJsonOutput": true, "archetypeOverride": "auto", "accent": "#EF5B3C", "step": 0 }
```

### 9.2 Controles
- **Visual:** TweakToggle "Phone frame" · TweakToggle "Live JSON peek".
- **Navigation:** TweakSelect "Go to block" → Intro + 12 blocos + Output.
- **Coach archetype:** TweakSelect "Override" → auto / 6 arquétipos.

### 9.3 Sincronização de passo
`React.useEffect(() => setTweak('step', step), [step])` — mantém o passo atual refletido no host (direct-manipulation). `ContextPanel`/`TweakSelect` chamam `setStep(n)` para navegar.

---

## 10. Regras de negócio / validações

| Código | Regra | Local |
|---|---|---|
| RC-1 | Princípios fundamentais limitados a **máx. 3**; opções extras desabilitam (opacity 0.4) ao atingir o limite; seleção exibe **rank** (1–3) | `Step06` |
| RC-2 | Distribuição de foco **deve somar 100%**; feedback colorido (green/amber/coral) + mensagem corretiva; "Equilibrar" redistribui igualmente | `Step07` / `FocusBars` |
| RC-3 | Favoritos limitados a **10**; input bloqueia e avisa no limite; sem duplicatas | `Step08` / `TagPicker` |
| RC-4 | "Exercícios a evitar" vira **regra rígida** no gerador (nunca incluídos) — comunicado via `PrivacyNote` | `Step08` |
| RC-5 | Estrutura da sessão é **ordenável** (drag + setas); a ordem é o esqueleto da sessão gerada | `Step10` / `StructureSorter` |
| RC-6 | **Coach DNA** (estilo + princípios) é destacado como a parte mais decisiva do perfil | `Step05`/`Step06` |
| RC-7 | Arquétipo é **explicável e sobreponível** (override em Tweaks) | `computeArchetype` |
| RC-8 | Campo "prompt de IA" é o que mantém treinos **consistentes com a identidade** do coach | `Step12` |

> Eventos modelados (não implementados como side-effects): `coach_profile_started`, `coach_dna_block_completed`, `coach_archetype_computed`, `coach_dna_generated`, `coach_dna_activated`.

---

## 11. Arquitetura de arquivos

```
Coach DNA - Perfil do Personal Trainer.html   ← shell HTML (+ keyframes, fontes)
coach/
  ├─ tweaks-panel.jsx   ← starter (cópia) — useTweaks + TweaksPanel/Section/Toggle/Select/Radio…
  ├─ coach-atoms.jsx    ← B tokens, FF_*, Icon + todos os atoms (incl. PhotoSlot, LevelPicker, FocusBars, StructureSorter, TagPicker)
  ├─ coach-steps.jsx    ← catálogos + StepIntro + Step01..Step12 + StepOutput + ARCHETYPES
  └─ coach-app.jsx      ← CoachApp + computeArchetype + Header + BottomBar + PhoneFrame + ContextPanel + SidePeek + mount
```

### 11.1 Ordem de carregamento (CRÍTICA)
```html
<script src="react@18.3.1"></script>
<script src="react-dom@18.3.1"></script>
<script src="@babel/standalone@7.29.0"></script>
<script type="text/babel" src="coach/tweaks-panel.jsx"></script>  <!-- 1: hooks/controls -->
<script type="text/babel" src="coach/coach-atoms.jsx"></script>   <!-- 2: B, Icon, atoms -->
<script type="text/babel" src="coach/coach-steps.jsx"></script>   <!-- 3: catálogos, Steps, ARCHETYPES -->
<script type="text/babel" src="coach/coach-app.jsx"></script>     <!-- 4: CoachApp mount -->
```
> Usar **exatamente** as versões pinadas + `integrity` do React/ReactDOM/Babel.

### 11.2 Globais expostos (workaround de escopo Babel)
```js
// coach-atoms.jsx
Object.assign(window, { B, FF_DISPLAY, FF_MONO, Icon, Chip, ChoiceCard, Field, TextArea,
  PrivacyNote, Hint, StepHeader, FieldLabel, Slider, ToggleRow, VoiceBar,
  PhotoSlot, LevelPicker, FocusBars, StructureSorter, TagPicker });
// coach-steps.jsx
Object.assign(window, { TOTAL_STEPS, StepIntro, Step01..Step12, StepOutput,
  ARCHETYPES, STYLES, FOCUS_ITEMS, FITNESS_LEVELS, CERTS });
```
> **Regra crítica:** cada `<script type="text/babel">` tem escopo próprio — só é compartilhado via `window`. **Nunca** declarar `const styles = {…}` global; usar inline styles (este módulo usa 100% inline).

---

## 12. Microcopy (PT-BR)

### 12.1 Tom por área
- **Intro/Output:** afirmativo, identitário ("sua assinatura", "Coach DNA").
- **Blocos:** instrucional curto; `Hint` em 1ª pessoa como "pergunta do app".
- **PrivacyNote `coach`:** reforça que o dado vira *método/assinatura*, não burocracia.
- **Saída:** celebratória e operacional ("pronto para conectar ao seu Studio").

### 12.2 Vocabulário-chave
- "Coach DNA", "assinatura", "metodologia", "Feed the AI", "AI Coach Engine".
- "arquétipo de coaching" (derivado), nomes de arquétipo preservam tag EN entre parênteses no `coach_dna.json`.
- Termos técnicos de WOD preservados: EMOM, AMRAP, For Time, MetCon, Tabata.
- Aspas curvas `“…”` para `Hint`, lemas e citações.

### 12.3 Padrão da mensagem-herói
```
{ícone de área} {kicker UPPERCASE mono} → {H1 display} → {parágrafo de propósito} → {nota tonal}
```

---

## 13. Checklist de fidelidade (QA visual)

- [ ] Background gradient dual — **coral** sup-direito + **cyan** inf-esquerdo — sobre navyDeep.
- [ ] Phone frame com bezel gradient, notch 110×28, screen radius 42, status "9:41 · 5G · bateria".
- [ ] Header com kicker **coral** "TrAIner · Coach Studio" + barra de progresso coral.
- [ ] CTA primário **coral** com texto branco e glow coral (≠ cyan do módulo do aluno).
- [ ] ContextPanel (280) com 14 itens (intro + 12 + output), estados done(✓)/current/idle + chip do arquétipo.
- [ ] SidePeek (320) com `coach_dna.json` ao vivo (mono, color-coded) + card "Assinatura de coaching".
- [ ] **FocusBars** soma 100% com barra empilhada + total colorido + "Equilibrar".
- [ ] **StructureSorter** arrastável + setas, índice 1..6, handle `grip`.
- [ ] **TagPicker** respeita limites (10/—), sem duplicatas, sugestões dashed.
- [ ] **LevelPicker** com mini-barras de força e badge numérico.
- [ ] Bloco 6 limita a 3 e mostra rank; bloco 12 com exemplos de lema.
- [ ] `StepOutput` exibe arquétipo correto (engine) + escala de 6 + resumo + lema.
- [ ] Tweaks: frame, JSON peek, navegação por bloco, override do arquétipo.
- [ ] `.step-fade` **visível em repouso** (sem animação que parta de opacity:0 — ver §2.5).
- [ ] PrivacyNote nas 3 tonalidades; VoiceBar com pulse-ring/wave quando ativo.
- [ ] Microcopy PT-BR com aspas curvas e termos de WOD preservados.

---

*Documento gerado em 30/05/2026. Compatível com `Coach DNA - Perfil do Personal Trainer.html` desta data.*
