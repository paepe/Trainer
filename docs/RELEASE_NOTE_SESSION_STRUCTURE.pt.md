# O que mudou no gerador de treinos — nota para o treinador

**Data:** 2026-07-31 · **Em produção** · Origem: relato do Kamil (2026-07-30)

## O que você relatou

Que a IA entregava **exercícios avulsos, não uma sessão**. Uma lista de movimentos principais, sem aquecimento, sem técnica e sem volta à calma, que não ocupava os 45 minutos do aluno.

Você estava certo. E eram três problemas distintos, não um.

## O que encontramos

**1. A sessão não tinha estrutura.** O gerador nunca foi instruído a montar uma sessão — só a sugerir exercícios. No treino que você mostrou: agachamento, supino, remada, desenvolvimento, prancha e esteira. Seis movimentos principais, nada preparatório, nada de recuperação.

**2. A sessão não ocupava o tempo do aluno.** Aquele mesmo treino somava cerca de **26 dos 45 minutos** disponíveis. O aluno reservava 45 e recebia prescrição para 26. A causa era uma divergência de contas: o gerador estimava a duração de cada série de um jeito, o aplicativo de outro.

**3. A sua metodologia estava registrada e sendo ignorada.** No Coach DNA você já tinha definido a ordem da sua sessão — *aquecimento → mobilidade → técnica → força → condicionamento → volta à calma*. O gerador nunca leu isso. A informação existia no sistema e não chegava à IA.

## O que mudou

**A IA agora monta a sessão na SUA ordem.** Não numa estrutura genérica — na sequência que você declarou no Coach DNA, incluindo o bloco de **técnica** que você mencionou.

Medido em produção, no seu idioma, três gerações para 45 minutos:

| Exercícios | Sequência produzida | Tempo prescrito |
|---|---|---|
| 14 | aquecimento → mobilidade → técnica → força → condicionamento → volta à calma | 43 min |
| 13 | aquecimento → mobilidade → técnica → força → condicionamento → volta à calma | 48 min |
| 9 | aquecimento → mobilidade → técnica → força → condicionamento → volta à calma | 42 min |

Comparando com o seu print: de 6 movimentos e 26 minutos para 9–14 movimentos cobrindo a janela inteira, na sua sequência.

**O tempo do aluno virou o alvo.** A sessão fica entre 90% e 110% da disponibilidade. Se sobrar tempo, a IA acrescenta trabalho; se passar, o sistema corta — e corta apenas dos blocos de trabalho. Aquecimento, mobilidade, técnica e volta à calma são prescritivos: o ajuste de tempo nunca os remove, e nunca elimina um bloco inteiro que você declarou.

**Você e a IA trabalham juntos.** Se você montar 3 exercícios somando 20 minutos e pedir para a IA completar, ela recebe exatamente os 25 restantes — e completa só os blocos de trabalho, sem enfiar um aquecimento no meio do que você já prescreveu.

**Aviso de tempo na tela.** Se o treino ficar bem abaixo da disponibilidade do aluno, ou passar dela, aparece um aviso com os números. É informativo, não bloqueia. A decisão é sua.

**Prescrição por tempo.** Dá para prescrever segundos de sustentação em vez de repetições, para prancha, isometrias e respiração.

**O tempo disponível agora aparece sempre.** Antes, se o aluno não tivesse informado o tempo no check-in do dia, a tela não mostrava nada — mesmo o sistema já usando o valor habitual do perfil dele. Agora o número aparece, e indica de onde veio.

**Erros deixaram de ser silenciosos.** Antes, se o envio do treino ao aluno falhasse, a tela simplesmente não fazia nada. Agora o erro aparece, e um treino não chega ao aluno pela metade.

## Atualização (2026-08-01)

**Agora existem divisórias visuais — no seu editor.** Quando você monta ou edita um plano, os exercícios aparecem agrupados por bloco, com título, ícone e cor (Mobilidade, Aquecimento, Técnica, Força, Condicionamento, Volta à Calma) — na ordem que você declarou no Coach DNA, independente da ordem em que você foi adicionando os exercícios. Na tela do aluno durante o treino ao vivo isso ainda não aparece — só no seu editor, por enquanto.

**Você já pode anexar uma observação a cada exercício manualmente.** Antes, isso só acontecia quando a IA gerava o exercício. Agora, ao adicionar um exercício à mão, há um campo de observação visível para o aluno.

**As observações e nomes de exercício digitados por você são traduzidos para o aluno.** Se você escreve em português e o aluno tem o app configurado em outro idioma, ele já vê o nome do exercício e sua observação no idioma dele — não mais em português. Antes disso não existia: qualquer coisa que você digitasse manualmente chegava sem tradução nenhuma.

## O que ainda não mudou

**Não há divisórias visuais na tela do aluno durante o treino.** Você já vê isso no seu editor (acima); a tela do aluno ainda mostra a sessão como lista, sem títulos de bloco. É uma trilha separada, ainda não priorizada.

**A estimativa de tempo é uma convenção.** O sistema calcula cada série por uma média padrão mais o descanso que você prescreveu. Uma série de 8 agachamentos pesados e uma de 20 repetições leves são contadas de forma parecida. Serve para dimensionar a sessão, não para cronometrar a execução.

## O que pedimos de você

Gere alguns treinos e diga se o volume e a divisão fazem sentido do ponto de vista de prescrição. O sistema garante que a sessão é completa, segue a sua ordem e cabe no tempo — **se é bem prescrita, quem julga é você.**

Interessa especialmente: a proporção entre preparação, parte principal e volta à calma está adequada? A escolha de exercícios preparatórios faz sentido para o trabalho que vem depois? E se a sua ordem no Coach DNA mudar, o gerador acompanha — vale testar.
