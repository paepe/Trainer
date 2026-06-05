# Coach DNA — System Design & Visual Standards

> **Documento Autoritativo.** Este documento define os padrões de design aplicados ao módulo **Coach DNA** e, por extensão, a **toda interface voltada ao papel TRAINER** no ecossistema TrAIner. Qualquer alteração de token, componente ou layout para usuários com `role: trainer` deve ser derivada deste documento.
>
> Documento equivalente para o papel CLIENT: [`trainer_system_design.md`](./trainer_system_design.md)

---

## 1. Identidade Visual e Princípios

O Coach DNA é a interface onde o Trainer define sua **assinatura metodológica**. A linguagem visual deve comunicar:

- **Precisão e profissionalismo** — não é uma ferramenta casual.
- **Profundidade de configuração** — 12 blocos de dados estruturados.
- **Dark-first** — o ambiente de trabalho de um Coach é focado, sem distrações. A interface não tem modo claro: é **sempre dark**.

### Posicionamento
- Produto: *TrAIner · Coach Studio*
- Público: Personal Trainers, Coaches de força e condicionamento, Educadores Físicos.
- Tom da interface: técnico, direto, premium.

---

## 2. Paleta de Cores (Brand Tokens)

Todos os valores abaixo são os **canônicos** do Coach DNA, extraídos de `src/coach-dna/` e `src/theme/tokens.ts`.

### 2.1 Superfícies (Dark-only)

| Token | Hex | Uso |
|---|---|---|
| `DARK.bg` | `#0E1A2B` | Background global (root da tela) |
| `DARK.surface` | `#142233` | Cards, listas, painéis de conteúdo |
| `DARK.surface2` | `#122034` | Variante alternada |
| `DARK.surface3` | `#1A2A40` | Estado elevado / drag |
| `DARK.border` | `#1F2E45` | Bordas primárias de separação |
| `DARK.borderSoft` | `#243650` | Bordas secundárias / tracejadas |

### 2.2 Texto

| Token | Valor | Uso |
|---|---|---|
| `DARK.textPri` | `#FFFFFF` | Títulos e conteúdo principal |
| `DARK.textSec` | `rgba(255,255,255,.65)` | Subtítulos, descrições |
| `DARK.textMute` | `rgba(255,255,255,.40)` | Metadados, hints, labels secundários |

### 2.3 Cores de Marca (Ação e Semântica)

| Token | Hex | Papel no Coach DNA |
|---|---|---|
| `BRAND.accent` | `#EF5B3C` | **CTA principal**, labels de kicker, ícones de destaque, progress bar, box-shadows |
| `BRAND.primary` | `#2DD4E0` | Labels técnicos (ex: `BLOCK 01 / 12`), ícones de estrutura |
| `BRAND.primarySoft` | `#9DECF3` | Archetype *Technician* |
| `BRAND.amber` | `#F5B45A` | Archetype *Motivator*, ícones warm-up |
| `BRAND.success` | `#4ADE80` | Archetype *Guide*, ícones cool-down |
| `BRAND.lavender` | `#A78BFA` | Archetype *Movement*, ícones mobility |
| `BRAND.criticalRed` | `#FF4D4D` | Erros, alertas críticos |

> **Nota de hierarquia:** No Coach DNA, `BRAND.accent` (Coral) é a cor primária de ação. Isso inverte a hierarquia do tema CLIENT, onde `BRAND.primary` (Cyan) é a cor de ação e `accent` é reservada para alertas.

### 2.4 Gradientes Canônicos

| Contexto | Gradiente |
|---|---|
| Barra de progresso do wizard | `linear-gradient(90deg, #C23B22, #EF5B3C)` |
| Hero icon (StepIntro) | `linear-gradient(135deg, #EF5B3C, #C23B22)` |
| Box-shadow CTAs | `0 8px 24px #EF5B3C44` (CTA primário) |
| Box-shadow hero icon | `0 12px 30px #EF5B3C44` |

---

## 3. Tipografia

O Coach DNA usa **três famílias** com papéis distintos e não intercambiáveis.

| Família | Papel | Propriedades padrão |
|---|---|---|
| `"Plus Jakarta Sans"` | Headings / Títulos de step | `fontWeight: 700–800`, `letterSpacing: -0.01em a -0.02em`, `lineHeight: 1.08–1.15` |
| `"Inter"`, `system-ui` | Corpo de texto, descrições, labels de UI | `fontSize: 13–14`, `lineHeight: 1.5–1.7` |
| `"JetBrains Mono"` | Labels técnicos, kickers, contadores | `fontSize: 9.5–10.5`, `fontWeight: 700`, `letterSpacing: .15em–.18em`, `textTransform: uppercase` |

### Hierarquia de Tamanhos

| Elemento | Família | Tamanho | Peso |
|---|---|---|---|
| Título principal (StepIntro `h1`) | Plus Jakarta Sans | 30px | 800 |
| Título de step (`h2` via StepHeader) | Plus Jakarta Sans | 24px | 700 |
| Kicker / label de seção (monospace) | JetBrains Mono | 10–10.5px | 700 |
| Badge de archetype | JetBrains Mono | 9.5px | 700 |
| Corpo / descrição | Inter | 13–14px | 400 |
| Subtítulo de step | Inter | 13px | 400 |
| Helper text / hint | Inter | 11–12px | 400 |
| Botão CTA principal | (inherit) | 14–15px | 700 |
| Botão outline (Save) | (inherit) | 14px | 600 |

> **Fonte não utilizada:** A fonte `"Oswald"` **não faz parte** do sistema Coach DNA. Não deve ser introduzida em nenhum componente Trainer.

---

## 4. Espaçamento e Layout

### Padding de conteúdo
- Tela principal (scroll area): `18px 22px 100px` (top · sides · bottom — reserva espaço para a action bar fixa)
- Header da tela: `16px 22px 12px`
- Action bar inferior: `14px 18px 18px`

### Gap entre elementos
- Listas de features/blocos: `12px` (horizontal), `11px 14px` (item padding)
- Botões na action bar: `10px`

### Anatomy da tela (Coach DNA Wizard)
```
┌─────────────────────────────────┐
│  HEADER (fixo, flex-shrink: 0)  │
│  ├─ Row: [Back] [Title] [Save]  │
│  └─ Progress bar (3px height)   │
├─────────────────────────────────┤
│  CONTENT (flex: 1, overflow-y)  │
│  └─ Step atual                  │
├─────────────────────────────────┤
│  ACTION BAR (fixo, flex-shrink) │
│  └─ [Save outline] [Continue ▶] │
└─────────────────────────────────┘
```

---

## 5. Componentes Canônicos (Atoms & Molecules)

### 5.1 Chip (Seleção múltipla e única)
- Border-radius: `999px` (pílula)
- Estado inativo: `border: 1.5px solid DARK.border`, `background: transparent`, `color: DARK.textSec`
- Estado ativo: `border: 1.5px solid [cor semântica]`, `background: [cor]22`, `color: [cor semântica]`
- Font-size: `12.5px`, `fontWeight: 600`
- Ícone de check (multi-select): `size={12}`, `stroke={2.5}`

### 5.2 DNAField (Input de texto)
- Border-radius: `12px`
- Border: `1.5px solid DARK.border`
- Background: `DARK.bg` (fundido com a tela)
- Font: herda do contexto (`"Inter"` por padrão), opção monospace disponível
- Padding: `12px 14px` (sem suffix) / `12px 48px 12px 14px` (com suffix)
- Estado disabled: `opacity: 0.5`

### 5.3 StepHeader (Cabeçalho de bloco)
- Kicker (`BLOCK 01 / 12`): `JetBrains Mono`, `10.5px`, `BRAND.primary` (Cyan)
- Badge opcional: `borderRadius: 999`, `background: BRAND.accent22`, `color: BRAND.accent`, `10px`, `fontWeight: 700`
- Título (`h2`): `Plus Jakarta Sans`, `24px`, `fontWeight: 700`, `DARK.textPri`
- Subtítulo: `Inter`, `13px`, `DARK.textSec`

### 5.4 Botão CTA Principal
```
background: BRAND.accent (#EF5B3C)
color: #fff
borderRadius: 14px
padding: 15–16px 20px
fontSize: 14–15px, fontWeight: 700
boxShadow: 0 8–10px 24–30px #EF5B3C44
```

### 5.5 Botão Outline (Save / Secundário)
```
background: transparent
border: 1.5px solid BRAND.accent
color: BRAND.accent
borderRadius: 14px
padding: 15px 20px
fontSize: 14px, fontWeight: 600
```

### 5.6 Botões de navegação do header (Back / Save icon)
```
width/height: 34px
borderRadius: 10px
background: DARK.surface
border: none
```

### 5.7 Cards de conteúdo / painéis
```
background: DARK.surface
borderRadius: 14–16px
border: 1px solid DARK.border  (ou 1.5px para destaque)
padding: 18–20px
```

---

## 6. Archetypes do Coach DNA

O módulo computa um archetype para cada Trainer com base nas suas escolhas. Cada archetype tem uma **cor semântica** e um **ícone** associados.

| Archetype | Título | Cor Semântica | Ícone |
|---|---|---|---|
| `performance` | Performance Coach | `BRAND.accent` (#EF5B3C) | `zap` |
| `technician` | The Technician | `BRAND.primarySoft` (#9DECF3) | `gauge` |
| `motivator` | The Motivator | `BRAND.amber` (#F5B45A) | `flame` |
| `guide` | The Guide | `BRAND.success` (#4ADE80) | `heart` |
| `drill` | Drill Master | `BRAND.primary` (#2DD4E0) | `shieldCheck` |
| `movement` | Movement Specialist | `BRAND.lavender` (#A78BFA) | `wave` |

---

## 7. Animações

| Animação | Uso | Parâmetros |
|---|---|---|
| `dna-appear` | Revelação do archetype no StepOutput | `from: opacity:0, scale(.88) translateY(8px)` → `to: opacity:1, scale(1) translateY(0)` |
| `spin` | Loading spinner | `border-top: BRAND.accent`, `0.7s linear infinite` |
| Transição de barra de progresso | Progress bar do wizard | `transition: width .35s ease` |
| Slide down (Foreground Notification) | Toast de notificação | `.25s ease` |
| Chip / botões | Hover states | `transition: background .15s, border-color .15s, color .15s` |

---

## 8. Modo de Aparência

O módulo Coach DNA é **dark-mode exclusivo**. Não existe implementação de modo claro neste módulo.

**Comportamento esperado para usuários Trainer:**
- A preferência `prefs.dark` do usuário **não afeta** a interface Trainer.
- O `TrainerLayout` aplica sempre as superfícies `DARK.*` independentemente da configuração global.
- Isso garante que o ambiente de trabalho do Coach seja consistente e imersivo.

---

## 9. Estrutura de Ficheiros do Módulo

```
src/coach-dna/
├── CoachDNAScreen.tsx      ← Orchestrator principal (wizard + estado)
├── computeArchetype.ts     ← Motor de scoring do archetype
├── constants.ts            ← Constantes do domínio (métodos, estilos, princípios…)
├── index.ts                ← Exports públicos
├── components/             ← Átomos e moléculas específicos do DNA
│   ├── Chip.tsx
│   ├── ChoiceCard.tsx
│   ├── DNAField.tsx
│   ├── DNASlider.tsx
│   ├── FieldLabel.tsx
│   ├── Hint.tsx
│   ├── LevelPicker.tsx
│   ├── PhotoSlot.tsx
│   ├── PrivacyNote.tsx
│   ├── StepHeader.tsx
│   └── VoiceBar.tsx
└── steps/                  ← Os 12 blocos do wizard + intro e output
    ├── StepIntro.tsx
    ├── Step01Identity.tsx … Step12Philosophy.tsx
    └── StepOutput.tsx
```

---

## 10. Referências Cruzadas

| Documento | Relação |
|---|---|
| [`trainer_system_design.md`](./trainer_system_design.md) | Design system do perfil CLIENT (padrão base da aplicação) |
| `src/theme/tokens.ts` | Fonte dos tokens `BRAND`, `DARK`, `LIGHT`, `TRAINER_BRAND` |
| `src/layouts/TrainerLayout.tsx` | Shell visual que aplica este sistema ao role Trainer |
| `src/layouts/ClientLayout.tsx` | Shell visual do role Client |
| `src/App.tsx` | Controlador que decide qual layout renderizar com base no role |
