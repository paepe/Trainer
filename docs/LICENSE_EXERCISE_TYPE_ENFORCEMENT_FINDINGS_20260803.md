# Achados — Fidelidade de Aplicação de Tipo de Exercício por Licença (FREE / AI_FITNESS / AI_PERFORMANCE)

**Data:** 2026-08-03
**Origem:** revisão de conversação sobre o teto de exercícios do Free (`WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md`), que levou a uma pergunta mais ampla: a segmentação comercial "fitness" vs. "performance" está sendo realmente entregue pela IA, ou é só texto de prompt?
**Método:** chamadas reais a `POST /api/generate-smart-workout` (produção, JWT de usuário real), sob condição **adversarial deliberada** — perfil de treinador exigente (`archetype: performance`, intensidade alta, foco atlético 9/10) com favoritos explicitamente de performance (Sprint, Box Jump, Clean and Jerk, Agility Ladder, Sled Push, Medicine Ball Throw). O objetivo foi forçar o sistema a resolver um conflito real entre a preferência do treinador e o gate da licença — não um teste de caminho feliz.
**Escopo:** só o caminho de IA real (`useSmart=true`). O gerador local de contingência (`fallbackWorkoutGenerator.ts`) já é mecanicamente correto e coberto por 75 testes automatizados — não repetido aqui.

---

## Contexto — por que isso é possível de falhar

Existem **três mecanismos independentes** no código para "fitness vs. performance", nunca reconciliados entre si:

1. **`exercise_category`** (`fitness`/`performance`/`mobility`) — classificação real por IA dedicada (`api/classify-exercises.ts`). É o único critério com definição operacional clara. **Nunca é aplicado a planos autogerados por IA** — só filtra planos atribuídos pelo treinador (100% das 418 linhas `plan_exercises` com `source='ai_generated'` têm `exercise_category = null`, confirmado em produção).
2. **`intensity`** (`low`/`moderate`/`high`) — usado só no gerador local de fallback. Proxy impreciso (agachamento e supino pesados contam como `high`, mas a própria definição de `exercise_category` os classifica como `fitness`).
3. **Instrução textual no prompt** (`task.fitnessOnly` → linha `PLAN LIMIT` em `api/generate-smart-workout.ts:711`) — o único mecanismo que toca o caminho de IA real. **Nunca validado contra a resposta do modelo.** Mesmo padrão já comprovado falho para `task.maxExercises` (pedido: 6, entregue: 10, em produção real).

`library.favoriteExercises` (favoritos do treinador) **nunca é cruzado** contra `fitnessOnly` antes de entrar no prompt — as duas instruções competem no mesmo texto, sem arbitragem em código.

---

## AI_FITNESS (`workout.exercise_type = 0` → `fitnessOnly = true`)

| Teste | Duração | Resultado |
|---|---|---|
| 1 | 45 min | Limpo — nenhum exercício de performance |
| 2 | 60 min | **Vazou `Box Jump`** no bloco de conditioning |
| 3 | 30 min | Limpo |

**1 vazamento em 3 tentativas adversariais.** O vazamento (`Box Jump`) é literalmente o exemplo textual que o próprio `classify-exercises.ts` usa para definir "performance".

**Efeito do treinador exigente:** a exigência virou volume e intensidade dentro do padrão fitness (agachamento pesado, supino, remada, thruster, kettlebell swing, mountain climber) — não modalidade. A fuga não veio do arquétipo/tom do treinador, veio de um exercício **nomeado explicitamente** nos favoritos, que passou sem filtro.

**Conclusão:** parcialmente aderente. Falha ocasional e real, não sistemática — mas não é garantia.

---

## AI_PERFORMANCE (`workout.exercise_type = null` → sem restrição)

| Teste | Treinador | Resultado |
|---|---|---|
| 1 | Exigente (performance, favoritos de performance) | `Box Jump`, `Broad Jump`, `40m Sprint`, `Dumbbell Clean` |
| 2 | Exigente | `Sprint Intervals`, `Plyo Box Jump`, `Shuttle Run` |
| 3 | Exigente | `Agility Ladder Drill`, `Medicine Ball Throw`, `Sled Push Sprint` |
| Controle | **Neutro** (`archetype: motivator`, sem favoritos) | Kettlebell Swing, Burpees, Mountain Climber — **essencialmente idêntico a um AI_FITNESS** |

**3 de 3 com treinador exigente — conteúdo de performance genuíno em todas.** Mas o teste de controle é o achado real: **a licença por si só não entrega performance, ela só remove o bloqueio.** Sem um treinador com Coach DNA orientado a performance, o cliente `ai_performance` recebe o mesmo tipo de treino que um `ai_fitness` receberia.

**Confirmado com dado real de produção:** 7 planos de IA genuínos do cliente `ai_performance` `tiago.moreira@client.test` — zero exercícios de performance em todos, porque seu treinador real (Carlos Silva) tem favoritos puramente fitness (Back Squat, Plank, Bench Press). Não é falha do sistema, é o comportamento correto dado o perfil do treinador — mas revela que o diferencial comercial de "AI Performance" depende de algo que a licença do **cliente** não controla.

**Conclusão:** o mecanismo funciona quando acionado, mas não é autônomo — a entrega real depende do Coach DNA do treinador vinculado, que pode nem existir.

---

## FREE (`fitnessOnly = true` **+** `maxExercises = 6` **+** sem calibração diária — as três restrições reais do tier, empilhadas no mesmo prompt)

| Teste | Duração | Exercícios (teto=6) | Vazamento de performance |
|---|---|---|---|
| 1 | 45 min | **6** ✅ | Nenhum ✅ |
| 2 | 60 min | **9** ❌ (+3) | `Shuttle Run` ❌ |
| 3 | 30 min | **8** ❌ (+2) | `Sled Push Sprint` ❌ |

**2 de 3 testes violaram as duas restrições simultaneamente.** Padrão relevante: nos dois casos em que o teto de exercícios estourou, o vazamento de performance também ocorreu junto — quando o modelo cede à pressão do treinador exigente, cede nas duas regras ao mesmo tempo, não em uma isolada. No único teste limpo, ambas as restrições foram respeitadas juntas.

**Conclusão:** Free é a licença menos protegida das três — não por regra diferente (usa o mesmo mecanismo do AI_FITNESS), mas por empilhar duas instruções `PLAN LIMIT` no mesmo prompt, o que medimos ser **menos confiável** que testar uma restrição isolada (2/3 falhas combinadas vs. 1/3 falha isolada do AI_FITNESS, mesmo treinador, mesmo desenho de teste).

---

## Quadro comparativo

| Licença | Restrição enviada à IA | Taxa de falha observada (n=3, adversarial) | Causa raiz |
|---|---|---|---|
| **AI_FITNESS** | `fitnessOnly` | 1/3 (vazamento pontual) | Instrução textual não validada |
| **AI_PERFORMANCE** | nenhuma | 0/3 com treinador exigente — **mas conteúdo depende do treinador, não da licença** | Ausência de mecanismo positivo de injeção |
| **FREE** | `fitnessOnly` + `maxExercises=6` | 2/3 (falha dupla e correlacionada) | Mesma causa do AI_FITNESS, agravada por empilhamento de restrições |

Amostra pequena (n=3 por tier) — suficiente para provar que a falha é real e nada teórica, não para estabelecer uma taxa precisa.

---

## Já registrado, não corrigido nesta sessão

- `docs/WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md`, seção "Fora de escopo": problema de engenharia de licenças (Free-com-treinador é a maioria real, não exceção; teto de 6 colide com a estrutura de 6 blocos do Coach DNA).
- Este documento estende o mesmo achado: a causa raiz (`task.fitnessOnly`/`task.maxExercises` como texto de prompt, nunca validados na resposta) é comum às três licenças — a diferença entre elas é só o número de restrições empilhadas, não a confiabilidade do mecanismo em si.

**Correção estrutural, se decidido:** validação server-side pós-resposta — cruzar os exercícios devolvidos pela IA contra `exercise_category` (já existe, `classify-exercises.ts`, hoje só usado em planos do treinador) e contra a contagem, cortando o que vazar antes de persistir. Decisão de produto/engenharia pendente, não executada.
