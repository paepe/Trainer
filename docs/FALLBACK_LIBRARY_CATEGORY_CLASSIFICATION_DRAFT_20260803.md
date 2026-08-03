# Fase 2.5 — classificação `category` do espelho de fallback (rascunho revisável)

Fonte: `LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md`, Fase 2.5. Classifica os 129
exercícios de `src/data/fallbackExerciseLibrary.ts` em `category: 'fitness' |
'performance' | 'mobility'`, para substituir o proxy `intensity === 'high'`
usado hoje em `fallbackWorkoutGenerator.ts:99` — proxy medido como incorreto em
18 dos 19 casos do bloco `strength` (achado A7). **Ainda não é código.** Após
aprovação, `category` é adicionada a `FallbackLibraryExercise` e ao artefato
versionado; `intensity` é preservada, sem mudança de significado.

## Metodologia

Diferente do rascunho de Fase 3 (`FALLBACK_LIBRARY_MIRROR_CLASSIFICATION_DRAFT_20260802.md`),
que classificou por inspeção manual, aqui a fonte de verdade é o **próprio
endpoint de produção** `api/classify-exercises` — os 129 exercícios reais da
biblioteca foram submetidos a ele (3 chamadas, lote ≤50), nome + grupo
muscular, exatamente como o hook do treinador já faz. Não há inspeção manual
substituindo a IA: a IA classificou; isto documenta e revisa o resultado antes
dele virar código, como o directive exige (§4.10, §6.3).

Um rascunho manual foi feito primeiro, como hipótese de trabalho, e comparado
ao resultado da IA — **22 das 129 classificações (17%) divergiram** do
rascunho manual. Duas divergências já tinham sido sinalizadas como "caso de
fronteira" antes mesmo da chamada (`400m Interval Run`, `High Knees`); as
outras 20 revelaram um padrão que o rascunho manual não previa (ver abaixo).
Isto é o próprio argumento do plano em ação: **classificar por inspeção
textual — mesmo cuidadosa — é menos confiável do que perguntar ao classificador
canônico.** A versão final abaixo usa o resultado da IA, não o rascunho.

## 2 padrões que a comparação revelou (não decisões pendentes — já aplicados, para revisão)

1. **HIIT/intervalo/pliometria em `conditioning` pesa mais para `performance`
   do que o rascunho assumiu.** `Battle Rope Slam`, `Battle Rope Waves`,
   `Burpee (20s on/10s off)`, `Jump Rope (20s on/10s off)`, `Tempo Run
   (treadmill)`, `400m Interval Run`, `High Knees` — todos vieram
   `performance`, não `fitness`. O rascunho manual havia aplicado a regra
   textual "quando em dúvida, escolha fitness" (`classify-exercises.ts`) de
   forma mais conservadora do que o próprio modelo aplica na prática — o
   mesmo padrão de não-confiabilidade textual que motiva este plano inteiro,
   agora observado no classificador que o plano usa como fonte de verdade
   (ele segue a definição de `performance`, não a regra de desempate, quando
   o nome do exercício carrega vocabulário de treinamento atlético — "sprint",
   "interval", "pliometria"). Resultado: **12 dos 22 exercícios de
   `conditioning` (55%) são `performance`** — a maior concentração de
   qualquer bloco. Ainda sobram 10 `fitness` nesse bloco (`Burpee`, `Dumbbell
   Thruster`, `Easy Run`, `Elliptical Trainer`, `Farmer's Walk`, `Jump Rope`,
   `Kettlebell Swing`, `Mountain Climber`, `Rowing Machine`, `Stationary
   Bike`) — bloco não esvazia sob `fitnessOnly`.
2. **Exercícios de ativação/correção no bloco `mobility` vieram `fitness`, não
   `mobility`.** `Band Pull-apart`, `Bird-Dog`, `Clamshell`, `Dead Bug`,
   `Glute Bridge`, `Internal/External Rotation (Band)`, `Lateral Band Walk`,
   `Quad Set (isometric)`, `Short Arc Quad`, `Side-lying External Rotation`,
   `Side-lying Hip Abduction`, `Supported Glute Bridge`, `Terminal Knee
   Extension (Band)`, `Y-T-W Raises (prone)` — 14 dos 27 exercícios do bloco
   `mobility` da biblioteca. A definição canônica de `mobility`
   (`classify-exercises.ts`) é "dedicated range-of-motion, stretching, and
   joint health exercises" — o classificador aparentemente reserva
   `mobility` para alongamento/ROM passivo, e trata ativação/correção com
   resistência e repetição (mesmo de baixa carga) como `fitness` geral.
   Consequência prática: **o rótulo de bloco (`phase: 'mobility'`) não é um
   proxy confiável para `category: 'mobility'`** — exatamente o tipo de
   suposição não verificada que este plano existe para eliminar. `Dynamic
   Warm-up` teve o inverso: rascunho `fitness`, IA `mobility`.

Nenhum bloco de sessão fica sem exercícios `fitness`/`mobility` (não-`performance`)
disponíveis sob `fitnessOnly` com o critério novo — ver tabela por bloco abaixo.

## Distribuição final

| Categoria | Total | Blocos onde aparece |
|---|---|---|
| `fitness` | 87 | todos os 6 |
| `performance` | 14 | `conditioning` (12), `strength` (1 — `Box Jump`), `warmup` (1 — `A-Skip Drill`) |
| `mobility` | 28 | `cooldown` (14), `mobility` (13), `warmup` (1 — `Dynamic Warm-up`) |

| Bloco | Total | `fitness` disponível sob `fitnessOnly` | `performance` excluído |
|---|---|---|---|
| `mobility` | 27 | 27 (13 `mobility` + 14 `fitness`) | 0 |
| `warmup` | 4 | 3 (`Jumping Jacks`, `Treadmill Walk`, `Dynamic Warm-up`) | 1 (`A-Skip Drill`) |
| `technique` | 6 | 6 | 0 |
| `strength` | 54 | 53 | 1 (`Box Jump`) |
| `conditioning` | 22 | 10 | 12 |
| `cooldown` | 16 | 16 (2 `fitness` + 14 `mobility`) | 0 |

Todo bloco mantém pelo menos 3 exercícios não-`performance` sob `fitnessOnly` — nenhum risco de esvaziamento por este critério isoladamente. `conditioning` é o bloco mais afetado (perde 55% do seu volume sob `fitnessOnly`), consistente com ele ser o bloco onde a distinção fitness/performance é semanticamente mais relevante (é onde a maior parte do vocabulário atlético mora).

## Confirmação do achado A7 (comparação com o critério antigo)

Com o critério antigo (`intensity === 'high'`), 35/129 exercícios eram excluídos sob `fitnessOnly`, incluindo os 19 do bloco `strength` já documentados (Back Squat, Bench Press, Deadlift, Pull-up, Romanian Deadlift, Bulgarian Split Squat, etc.). Com o critério novo (`category === 'performance'`):

- **Todos os 19 exercícios de `strength` antes excluídos por engano voltam a ficar disponíveis** — exceto `Box Jump`, que continua excluído (agora corretamente, por `category`, não por `intensity`).
- O bloco `conditioning` passa a excluir **mais** exercícios do que antes (12 vs. a mistura antiga de `intensity=high`), porque a classificação por conteúdo semântico captura HIIT/pliometria que `intensity` sozinho não distinguia de condicionamento geral igualmente intenso (ex.: `Kettlebell Swing` é `intensity=high` mas `category=fitness`; `Battle Rope Slam` também é `intensity=high` mas `category=performance` — o proxy antigo tratava os dois igual, o novo critério os separa corretamente).

## Próximo passo

Após confirmação, `category` é adicionada a `FallbackLibraryExercise` (129 valores abaixo), `fallbackWorkoutGenerator.ts:99` passa a checar `category === 'performance'`, e os testes existentes do gerador (que assumem o critério antigo) são revistos.

## Tabela completa (129)

| Exercício | Bloco | `intensity` (antiga) | `category` (nova) |
|---|---|---|---|
| 400m Interval Run | conditioning | high | performance |
| Battle Rope Slam | conditioning | high | performance |
| Battle Rope Waves | conditioning | high | performance |
| Burpee | conditioning | high | fitness |
| Burpee (20s on / 10s off) | conditioning | high | performance |
| Dumbbell Thruster | conditioning | high | fitness |
| Easy Run | conditioning | low | fitness |
| Elliptical Trainer | conditioning | low | fitness |
| Farmer's Walk | conditioning | high | fitness |
| High Knees | conditioning | high | performance |
| Jump Rope | conditioning | moderate | fitness |
| Jump Rope (20s on / 10s off) | conditioning | high | performance |
| Jump Squat | conditioning | high | performance |
| Jump Squat (20s on / 10s off) | conditioning | high | performance |
| Kettlebell Swing | conditioning | high | fitness |
| Mountain Climber | conditioning | high | fitness |
| Plyo Push-up (20s on / 10s off) | conditioning | high | performance |
| Rowing Machine | conditioning | moderate | fitness |
| Squat Jump | conditioning | high | performance |
| Stationary Bike (moderate) | conditioning | moderate | fitness |
| Tempo Run (treadmill) | conditioning | moderate | performance |
| Treadmill Sprint (20s on / 10s off) | conditioning | high | performance |
| 90/90 Hip Stretch | cooldown | low | mobility |
| Cat-Cow (breath-led) | cooldown | low | mobility |
| Cat-Cow with Breath (4-7-8) | cooldown | low | mobility |
| Child's Pose | cooldown | low | mobility |
| Child's Pose (restorative) | cooldown | low | mobility |
| Cool-down Walk | cooldown | low | fitness |
| Easy Run (cool-down) | cooldown | low | fitness |
| Hamstring Stretch (supine) | cooldown | low | mobility |
| Hip Flexor Lunge Stretch | cooldown | low | mobility |
| Knee-to-Chest Stretch | cooldown | low | mobility |
| Lat Stretch (overhead) | cooldown | low | mobility |
| Pec Stretch (doorway) | cooldown | low | mobility |
| Piriformis Stretch (Figure-4) | cooldown | low | mobility |
| Shoulder Cross-body Stretch | cooldown | low | mobility |
| Standing Quad Stretch | cooldown | low | mobility |
| Standing Recovery Stretch | cooldown | low | mobility |
| Band Pull-apart | mobility | low | fitness |
| Bird-Dog | mobility | low | fitness |
| Cat-Cow | mobility | low | mobility |
| Chin Tuck (seated) | mobility | low | mobility |
| Clamshell | mobility | low | fitness |
| Dead Bug | mobility | low | fitness |
| Downward Dog to Cobra | mobility | low | mobility |
| Glute Bridge | mobility | low | fitness |
| Hip Circle (standing) | mobility | low | mobility |
| Internal/External Rotation (Band) | mobility | low | fitness |
| Lateral Band Walk | mobility | low | fitness |
| Pelvic Tilt (supine) | mobility | low | mobility |
| Pendulum Exercise | mobility | low | mobility |
| Prone Press-up (McKenzie) | mobility | low | mobility |
| Quad Set (isometric) | mobility | low | fitness |
| Scapular Wall Slide | mobility | low | mobility |
| Short Arc Quad | mobility | low | fitness |
| Shoulder Dislocate (Band) | mobility | low | mobility |
| Side-lying External Rotation | mobility | low | fitness |
| Side-lying Hip Abduction | mobility | low | fitness |
| Standing Cat-Cow | mobility | low | mobility |
| Standing Hip Circle | mobility | low | mobility |
| Supported Glute Bridge | mobility | low | fitness |
| Terminal Knee Extension (Band) | mobility | low | fitness |
| Wall Angel | mobility | low | mobility |
| World's Greatest Stretch | mobility | low | mobility |
| Y-T-W Raises (prone) | mobility | low | fitness |
| Back Squat | strength | high | fitness |
| Barbell Back Squat | strength | high | fitness |
| Barbell Curl | strength | moderate | fitness |
| Barbell Row | strength | moderate | fitness |
| Bench Press | strength | high | fitness |
| Bench Press (superset with Pull-up) | strength | high | fitness |
| Box Jump | strength | high | performance |
| Bulgarian Split Squat | strength | high | fitness |
| Cable Bicep Curl | strength | low | fitness |
| Cable Crunch | strength | moderate | fitness |
| Cable Fly | strength | moderate | fitness |
| Cable Pushdown | strength | moderate | fitness |
| Competition Bench Press | strength | high | fitness |
| Competition Deadlift | strength | high | fitness |
| Competition Squat | strength | high | fitness |
| Deadlift | strength | high | fitness |
| Diamond Push-up | strength | moderate | fitness |
| Dips | strength | high | fitness |
| Dips (superset with Inverted Row) | strength | high | fitness |
| Dumbbell Bench Press | strength | low | fitness |
| Dumbbell Bent-over Row | strength | low | fitness |
| Dumbbell Chest Press | strength | low | fitness |
| Dumbbell Fly (superset with Face Pull) | strength | moderate | fitness |
| Dumbbell Shoulder Press | strength | low | fitness |
| Face Pull | strength | moderate | fitness |
| Flat Bench Press | strength | high | fitness |
| Goblet Squat | strength | moderate | fitness |
| Hammer Curl | strength | moderate | fitness |
| Hip Thrust | strength | low | fitness |
| Incline Dumbbell Curl | strength | low | fitness |
| Incline Dumbbell Press | strength | high | fitness |
| Incline Press (superset with Cable Row) | strength | high | fitness |
| Lat Pulldown | strength | low | fitness |
| Lateral Raise | strength | moderate | fitness |
| Leg Curl | strength | moderate | fitness |
| Leg Extension | strength | moderate | fitness |
| Leg Press | strength | moderate | fitness |
| Overhead Press | strength | moderate | fitness |
| Plank | strength | moderate | fitness |
| Pull-up | strength | high | fitness |
| Push-up | strength | moderate | fitness |
| Reverse Lunge | strength | moderate | fitness |
| Romanian Deadlift | strength | high | fitness |
| Russian Twist | strength | moderate | fitness |
| Seated Cable Row | strength | low | fitness |
| Seated Dumbbell Press | strength | high | fitness |
| Side Plank | strength | low | fitness |
| Skull Crusher (EZ Bar) | strength | moderate | fitness |
| Standing Calf Raise | strength | moderate | fitness |
| Step-up | strength | moderate | fitness |
| Superman Hold | strength | low | fitness |
| Tricep Dip (Chair) | strength | moderate | fitness |
| Tricep Pushdown | strength | moderate | fitness |
| Weighted Pull-up | strength | high | fitness |
| Bodyweight Squat | technique | moderate | fitness |
| Breathing Squat (slow tempo) | technique | low | fitness |
| Modified Push-up (Knees) | technique | low | fitness |
| Plank Hold | technique | low | fitness |
| Step-down (eccentric) | technique | low | fitness |
| Turkish Get-up | technique | moderate | fitness |
| A-Skip Drill | warmup | moderate | performance |
| Dynamic Warm-up | warmup | low | mobility |
| Jumping Jacks | warmup | moderate | fitness |
| Treadmill Walk (warm-up) | warmup | low | fitness |
