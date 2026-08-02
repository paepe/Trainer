# Fase 3 — Biblioteca espelhada e classificada por bloco (rascunho revisável)

Fonte: `WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md`, Fase 3. Classifica os 129 exercícios de
`protocol_exercises` nos 6 blocos de `sessionStructure.ts`
(`mobility|warmup|technique|strength|conditioning|cooldown`), define prescrição por
exercício e um deny-list conservador de contraindicação por região corporal.
**Ainda não é código.** Após aprovação, vira o artefato TS/JSON versionado (achado 20),
embutindo as 387 traduções curadas já existentes.

## Metodologia de classificação

Inspeção direta por padrão de nome + `intensity`/`sets`/`reps`/`rest_seconds` já
prescritos em produção (achado 23 revisado: dados majoritariamente disponíveis, ao
contrário da suposição original do plano — só `duration_seconds` está de fato nulo em
100% das linhas). Heurística aplicada:

- **mobility** — ativação/mobilização de baixo custo, `intensity=low`, sem carga
  externa relevante (Cat-Cow, Bird-Dog, Band Pull-apart, Clamshell...).
- **warmup** — elevação de frequência cardíaca / preparação dinâmica genérica, não
  específica de um padrão de força (Dynamic Warm-up, Jumping Jacks, A-Skip Drill).
- **technique** — prática de padrão de movimento com carga mínima/nula, tempo
  controlado (Bodyweight Squat, Breathing Squat, Step-down eccentric, Turkish Get-up).
- **strength** — a maior parte dos levantamentos nomeados (barra/halter/cabo/máquina),
  `intensity` moderate/high com carga externa real.
- **conditioning** — metabólico/cardio, intervalos "(20s on/10s off)", pliometria de
  alto volume/baixo descanso (distinção de `Box Jump` vs `Jump Squat`/`Squat Jump`
  abaixo).
- **cooldown** — alongamento estático, respiração guiada, caminhada de
  desaceleração.

Onde a prescrição real diferenciava duas variantes do mesmo movimento (ex.: `Box Jump`
4×6/rest60 vs `Jump Squat` 4×15/rest20), a dosagem — não só o nome — decidiu o bloco:
baixo volume/alto descanso lê como força-potência; alto volume/baixo descanso lê como
condicionamento.

## 2 casos que precisam da sua decisão

1. **`Farmer's Walk`** (Full body, 4×null/rest60/high) — carregamento de carga é
   híbrido força/condicionamento por natureza. Classifiquei como `strength`
   (dosagem de baixo volume/alto descanso sugere acessório de força, não circuito
   metabólico), mas é defensável classificar como `conditioning`. **Decisão: aguardando.**
2. **`Easy Run`** (Cardio, sets1/reps null) — distinto de `Easy Run (cool-down)`, que já
   é claramente `cooldown`. Sem sufixo, presumi uso como bloco de cardio contínuo
   (`conditioning`), mas pode ter sido pensado como aquecimento alternativo a
   `Treadmill Walk (warm-up)`. Classifiquei como `conditioning`. **Decisão: aguardando.**

Ambos aplicados como classificados abaixo; qualquer correção é um `phase` de uma linha
no artefato final, sem impacto em outra parte do plano.

## Backfill de `duration_seconds`

Aplicado apenas às ~40 linhas onde `reps` também é nulo (holds, cardio contínuo,
intervalos nomeados, alongamentos estáticos). Intervalos nomeados "(Xs on/Ys off)"
usam o valor literal do nome. Os demais são estimativas conservadoras por categoria
(hold isométrico curto ≈20-30s, alongamento estático ≈20-30s, cardio contínuo por
bloco ≈3-10min) — servem ao modelo de ajuste de `sessionBudget.ts`, que já
trim/pad a sessão ao redor de qualquer estimativa inicial, então precisão absoluta
aqui é secundária à plausibilidade.

## Deny-list de contraindicação (nível conservador, achado 24)

Regiões: `knee`, `lower_back`, `shoulder`, `wrist`. Aplicado apenas a exercícios com
carga/impacto real sobre a região quando `intensity` é moderate/high ou o padrão é
claramente de impacto — **não** aos exercícios de mobilidade/reabilitação de baixa
carga que existem justamente para tratar essas regiões (ex.: `Quad Set`,
`Terminal Knee Extension (Band)`, `Clamshell` não são tagueados; são o "elenco seguro"
para essas queixas). Bloco `mobility` inteiro fica sem tags por desenho — é o bloco
que a lógica de substituição usa quando uma região é contraindicada em outro bloco.
Bloco `cooldown` fica quase todo sem tags, com 2 exceções de flexão profunda de quadril.

Tabela completa por exercício está embutida nas seções abaixo (coluna `Contra`).

---

## Bloco: mobility (27)

| Exercício | Grupo | Sets | Reps | Rest(s) | Dur(s) |
|---|---|---|---|---|---|
| Bird-Dog | Core | 3 | 8 | 15 | — |
| Dead Bug | Core | 3 | 6 | 30 | — |
| Pelvic Tilt (supine) | Core | 3 | 10 | 20 | — |
| Cat-Cow | Full body | 3 | 10 | 15 | — |
| Standing Cat-Cow | Full body | 3 | 10 | 15 | — |
| Chin Tuck (seated) | Full body | 3 | 10 | 20 | — |
| Downward Dog to Cobra | Full body | 3 | 8 | 15 | — |
| Prone Press-up (McKenzie) | Full body | 3 | 8 | 20 | — |
| World's Greatest Stretch | Full body | 3 | 5 | 20 | — |
| Clamshell | Legs | 3 | 15 | 20 | — |
| Glute Bridge | Legs | 3 | 12 | 30 | — |
| Hip Circle (standing) | Legs | 2 | 10 | 15 | — |
| Lateral Band Walk | Legs | 3 | 12 | 30 | — |
| Quad Set (isometric) | Legs | 3 | 10 | 30 | — |
| Short Arc Quad | Legs | 3 | 15 | 30 | — |
| Side-lying Hip Abduction | Legs | 3 | 12 | 20 | — |
| Standing Hip Circle | Legs | 3 | 10 | 20 | — |
| Supported Glute Bridge | Legs | 3 | 10 | 30 | — |
| Terminal Knee Extension (Band) | Legs | 3 | 15 | 30 | — |
| Band Pull-apart | Shoulders | 4 | 20 | 20 | — |
| Internal/External Rotation (Band) | Shoulders | 3 | 15 | 30 | — |
| Pendulum Exercise | Shoulders | 3 | — | 30 | 30 |
| Scapular Wall Slide | Shoulders | 3 | 10 | 30 | — |
| Shoulder Dislocate (Band) | Shoulders | 3 | 10 | 20 | — |
| Side-lying External Rotation | Shoulders | 3 | 15 | 30 | — |
| Wall Angel | Shoulders | 3 | 10 | 30 | — |
| Y-T-W Raises (prone) | Shoulders | 3 | 10 | 30 | — |

Sem contraindicações (bloco desenhado para ser o "elenco seguro").

## Bloco: warmup (4)

| Exercício | Grupo | Sets | Reps | Rest(s) | Dur(s) | Contra |
|---|---|---|---|---|---|---|
| A-Skip Drill | Cardio | 3 | — | 30 | 20 | knee |
| Treadmill Walk (warm-up) | Cardio | 1 | — | — | 180 | — |
| Dynamic Warm-up | Full body | 1 | — | — | 300 | — |
| Jumping Jacks | Full body | 2 | 30 | 30 | — | knee |

## Bloco: technique (6)

| Exercício | Grupo | Sets | Reps | Rest(s) | Dur(s) | Contra |
|---|---|---|---|---|---|---|
| Modified Push-up (Knees) | Chest | 3 | 10 | 45 | — | wrist |
| Plank Hold | Core | 3 | — | 30 | 20 | wrist |
| Turkish Get-up | Full body | 3 | 3 | 90 | — | shoulder, lower_back |
| Bodyweight Squat | Legs | 3 | 20 | 30 | — | knee |
| Breathing Squat (slow tempo) | Legs | 3 | 10 | 45 | — | knee |
| Step-down (eccentric) | Legs | 3 | 10 | 45 | — | knee |

## Bloco: strength (54)

| Exercício | Grupo | Sets | Reps | Rest(s) | Dur(s) | Contra |
|---|---|---|---|---|---|---|
| Barbell Curl | Arms | 3 | 10 | 60 | — | — |
| Cable Bicep Curl | Arms | 3 | 12 | 45 | — | — |
| Cable Pushdown | Arms | 3 | 15 | 45 | — | — |
| Diamond Push-up | Arms | 3 | 10 | 45 | — | wrist, shoulder |
| Dips | Arms | 3 | 10 | 60 | — | shoulder |
| Dips (superset with Inverted Row) | Arms | 3 | 10 | 45 | — | shoulder |
| Hammer Curl | Arms | 3 | 12 | 45 | — | — |
| Incline Dumbbell Curl | Arms | 3 | 12 | 60 | — | — |
| Skull Crusher (EZ Bar) | Arms | 4 | 12 | 60 | — | — |
| Tricep Dip (Chair) | Arms | 3 | 12 | 45 | — | shoulder, wrist |
| Tricep Pushdown | Arms | 3 | 15 | 45 | — | — |
| Barbell Row | Back | 3 | 8 | 90 | — | lower_back |
| Dumbbell Bent-over Row | Back | 3 | 12 | 45 | — | lower_back |
| Lat Pulldown | Back | 3 | 12 | 75 | — | — |
| Pull-up | Back | 4 | 8 | 90 | — | shoulder |
| Seated Cable Row | Back | 3 | 12 | 60 | — | — |
| Superman Hold | Back | 3 | 12 | 30 | — | lower_back |
| Weighted Pull-up | Back | 4 | 6 | 90 | — | shoulder |
| Bench Press | Chest | 4 | 8 | 90 | — | shoulder |
| Bench Press (superset with Pull-up) | Chest | 4 | 10 | 30 | — | shoulder |
| Cable Fly | Chest | 3 | 15 | 60 | — | shoulder |
| Competition Bench Press | Chest | 5 | 3 | 180 | — | shoulder |
| Dumbbell Bench Press | Chest | 3 | 10 | 60 | — | shoulder, wrist |
| Dumbbell Chest Press | Chest | 3 | 12 | 75 | — | shoulder, wrist |
| Dumbbell Fly (superset with Face Pull) | Chest | 3 | 15 | 30 | — | shoulder |
| Flat Bench Press | Chest | 4 | 10 | 90 | — | shoulder |
| Incline Dumbbell Press | Chest | 4 | 12 | 75 | — | shoulder, wrist |
| Incline Press (superset with Cable Row) | Chest | 4 | 12 | 30 | — | shoulder |
| Push-up | Chest | 3 | 12 | 30 | — | wrist, shoulder |
| Cable Crunch | Core | 4 | 15 | 45 | — | lower_back |
| Plank | Core | 3 | — | 20 | 30 | wrist |
| Russian Twist | Core | 3 | 20 | 30 | — | lower_back |
| Side Plank | Core | 3 | — | 30 | 25 | wrist |
| Competition Deadlift | Full body | 4 | 2 | 240 | — | lower_back |
| Deadlift | Full body | 4 | 6 | 120 | — | lower_back |
| Back Squat | Legs | 5 | 5 | 120 | — | knee, lower_back |
| Barbell Back Squat | Legs | 4 | 6 | 90 | — | knee, lower_back |
| Box Jump | Legs | 4 | 6 | 60 | — | knee |
| Bulgarian Split Squat | Legs | 3 | 10 | 90 | — | knee |
| Competition Squat | Legs | 5 | 3 | 180 | — | knee, lower_back |
| Goblet Squat | Legs | 4 | 15 | 30 | — | knee |
| Hip Thrust | Legs | 3 | 15 | 30 | — | lower_back |
| Leg Curl | Legs | 4 | 12 | 45 | — | — |
| Leg Extension | Legs | 4 | 15 | 45 | — | knee |
| Leg Press | Legs | 4 | 10 | 60 | — | knee |
| Reverse Lunge | Legs | 3 | 12 | 45 | — | knee |
| Romanian Deadlift | Legs | 4 | 12 | 75 | — | lower_back |
| Standing Calf Raise | Legs | 4 | 15 | 45 | — | — |
| Step-up | Legs | 4 | 15 | 45 | — | knee |
| Dumbbell Shoulder Press | Shoulders | 3 | 10 | 60 | — | shoulder |
| Face Pull | Shoulders | 4 | 15 | 45 | — | — |
| Lateral Raise | Shoulders | 4 | 15 | 45 | — | shoulder |
| Overhead Press | Shoulders | 3 | 8 | 90 | — | shoulder |
| Seated Dumbbell Press | Shoulders | 4 | 12 | 75 | — | shoulder |

## Bloco: conditioning (22)

| Exercício | Grupo | Sets | Reps | Rest(s) | Dur(s) | Contra |
|---|---|---|---|---|---|---|
| 400m Interval Run | Cardio | 6 | — | 90 | 90 | knee |
| Battle Rope Slam | Cardio | 4 | — | 30 | 30 | — |
| Battle Rope Waves | Cardio | 4 | — | 30 | 30 | — |
| Easy Run | Cardio | 1 | — | — | 600 | knee |
| Elliptical Trainer | Cardio | 1 | — | — | 600 | — |
| High Knees | Cardio | 4 | — | 15 | 20 | knee |
| Jump Rope | Cardio | 5 | — | 60 | 45 | knee |
| Jump Rope (20s on / 10s off) | Cardio | 8 | — | 10 | 20 | knee |
| Rowing Machine | Cardio | 2 | — | 60 | 300 | lower_back |
| Stationary Bike (moderate) | Cardio | 3 | — | 60 | 240 | — |
| Tempo Run (treadmill) | Cardio | 4 | — | 90 | 240 | knee |
| Treadmill Sprint (20s on / 10s off) | Cardio | 8 | — | 10 | 20 | knee |
| Plyo Push-up (20s on / 10s off) | Chest | 8 | — | 10 | 20 | wrist, shoulder |
| Mountain Climber | Core | 4 | 20 | 20 | — | wrist |
| Burpee | Full body | 4 | 10 | 20 | — | knee, wrist, shoulder |
| Burpee (20s on / 10s off) | Full body | 8 | — | 10 | 20 | knee, wrist, shoulder |
| Dumbbell Thruster | Full body | 4 | 12 | 30 | — | shoulder, knee |
| Farmer's Walk | Full body | 4 | — | 60 | 40 | lower_back |
| Kettlebell Swing | Full body | 4 | 15 | 60 | — | lower_back |
| Jump Squat | Legs | 4 | 15 | 20 | — | knee |
| Jump Squat (20s on / 10s off) | Legs | 8 | — | 10 | 20 | knee |
| Squat Jump | Legs | 3 | 15 | 45 | — | knee |

## Bloco: cooldown (16)

| Exercício | Grupo | Sets | Reps | Rest(s) | Dur(s) | Contra |
|---|---|---|---|---|---|---|
| Lat Stretch (overhead) | Back | 3 | — | — | 30 | — |
| Pec Stretch (doorway) | Chest | 3 | — | — | 25 | — |
| Cool-down Walk | Cardio | 1 | — | — | 180 | — |
| Easy Run (cool-down) | Cardio | 1 | — | — | 300 | — |
| Child's Pose | Full body | 3 | — | — | 30 | — |
| Child's Pose (restorative) | Full body | 3 | — | — | 45 | — |
| Standing Recovery Stretch | Full body | 1 | — | — | 120 | — |
| Cat-Cow (breath-led) | Full body | 3 | 10 | 15 | — | — |
| Cat-Cow with Breath (4-7-8) | Full body | 3 | 10 | 20 | — | — |
| 90/90 Hip Stretch | Legs | 2 | — | — | 30 | knee |
| Hamstring Stretch (supine) | Legs | 3 | — | — | 25 | — |
| Hip Flexor Lunge Stretch | Legs | 3 | — | — | 25 | knee |
| Knee-to-Chest Stretch | Legs | 3 | — | — | 20 | — |
| Piriformis Stretch (Figure-4) | Legs | 3 | — | — | 25 | — |
| Standing Quad Stretch | Legs | 3 | — | — | 20 | — |
| Shoulder Cross-body Stretch | Shoulders | 3 | — | — | 20 | — |

---

## Checagem de cobertura

- 129/129 exercícios classificados: mobility 27, warmup 4, technique 6, strength 54,
  conditioning 22, cooldown 16 = 129. ✓
- Nenhum bloco vazio. ✓
- Traduções: as 387 linhas curadas (`pt`/`es`/`de`, `curated=true`,
  `source_locale='en'`) cobrem os 129 nomes 1:1 — nenhuma divergência encontrada na
  consulta feita contra produção.

## Próximos passos

1. Sua decisão sobre os 2 casos acima (ou aprovação da classificação default).
2. Gerar o artefato TS/JSON versionado a partir desta tabela + as 387 traduções.
3. Medir e registrar o tamanho real do artefato (estimativa original: 30-50 KB).
4. Fechar checklist/aceitação/log de progresso da Fase 3 no plano mestre.
