# TrAIner — Runbook de Resposta a Uso Anômalo de IA (rascunho interno)

**Estado:** rascunho operacional; não autoriza bloqueio automático, suspensão ou alteração de limites

**Proprietários:** Engineering / Product / Privacy / Support

**Escopo:** alertas e revisão de uso anômalo dos endpoints de IA, sem incluir telemetria de treino, check-in, voz, saúde, ciclo, prompts, transcrições ou respostas do modelo.

## 1. Princípios inegociáveis

- O uso comercial continua apresentado como ilimitado para uso pessoal normal; este processo não introduz crédito ou contador comercial.
- Um treino em execução, o registo offline de séries e dados locais nunca são interrompidos por controles de custo.
- Endereço IP, origem de rede e um único sinal automatizado nunca são motivo suficiente para suspender uma conta.
- O evento investigado contém somente identificador pseudonimizado, endpoint, resultado, plano efetivo, data/hora, uso/custo quando fornecidos pelo provedor e categoria técnica de falha.
- Não copiar para ticket, chat, e-mail ou ferramenta de alerta prompts, transcrições, respostas de IA, IDs brutos, dados de saúde ou credenciais.
- Suspensão prolongada, encerramento ou qualquer exceção de conta exige revisão humana e registro de decisão.

## 2. Pré-condições de operação

Não ativar alertas acionáveis nem contenção pós-auth antes de todos os itens abaixo:

- [ ] Fase 2 contém uma amostra aprovada de uso humano normal, concorrência e custo por coorte.
- [ ] Product, Engineering e Privacy aprovam sinais, thresholds, falso-positivo aceitável e janela de observação.
- [ ] A Fase 3 publica Termos e Política de Uso Justo consistentes com a UX.
- [ ] O limitador pós-auth passou por modo sombra e testes de múltiplas instâncias.
- [ ] O canal de alerta possui acesso mínimo, retenção definida e responsável de plantão.

Até lá, registrar somente evidência agregada e tratar falhas do fornecedor como incidentes de disponibilidade, não como abuso.

## 3. Níveis de resposta

| Nível | Sinal necessário | Ação permitida | Proibido |
|---|---|---|---|
| 0 — Observação | Métrica fora do baseline, sem decisão | Registrar agregado e reavaliar baseline | Contactar ou limitar o assinante |
| 1 — Suspeita técnica | Padrão repetido + corroborado por mais de uma dimensão aprovada | Criar caso pseudonimizado para revisão humana | Suspender, expor threshold ou assumir má-fé |
| 2 — Contenção temporária | Automação/rajada confirmada pela regra aprovada | `429` temporário por endpoint, com `Retry-After` e UX localizada | Atingir treino iniciado, bloqueio por IP isolado |
| 3 — Revisão de conta | Recorrência após contenção e evidência suficiente | Solicitar esclarecimento, aplicar exceção temporária auditada ou encaminhar a Product/Privacy | Encerrar conta automaticamente |
| 4 — Decisão humana | Abuso confirmado, revisão documentada | Suspensão limitada ou outra medida prevista nos Termos | Retenção excessiva de dados ou decisão opaca |

## 4. Procedimento de investigação

1. Confirmar se o evento é falha do provedor, indisponibilidade do controle ou possível abuso. Falha do fornecedor não é abuso.
2. Consultar apenas os agregados autorizados por ator HMAC, endpoint, plano e intervalo; verificar duplicidade, concorrência, resultado e custo declarado.
3. Comparar com baseline aprovado para a mesma coorte. Sem baseline, manter no Nível 0.
4. Verificar se houve proteção pré-auth WAF, sem tentar correlacionar IP com identidade nem exportar dados da WAF.
5. Registrar: motivo técnico, período, endpoint, impacto, decisão, aprovador, expiração e plano de reversão. Não registrar conteúdo de IA.
6. Aplicar a menor resposta proporcional. Encerrar a contenção ao expirar ou quando a revisão demonstrar falso positivo.
7. Se houver impacto no fluxo crítico, priorizar a continuidade: plano local seguro, check-in manual ou operação offline conforme a política de degradação.

## 5. Exceção operacional temporária

Uma exceção só pode ser criada após aprovação humana de Engineering e Product; Privacy participa quando o caso envolver acesso, retenção ou compartilhamento de telemetria.

O registro deve conter identificador HMAC, justificativa, endpoints, início, expiração automática, aprovadores e mecanismo de reversão. Não permitir exceção sem expiração, nem exceção global por rede.

## 6. Comunicação ao assinante

- Para contenção temporária, usar o texto UX localizado e informar nova tentativa posterior ou suporte.
- Não informar thresholds, modelo de detecção, sinais de rede, volume observado nem dados internos.
- Para revisão manual ou suspensão, usar apenas os canais e fundamentos aprovados nos Termos publicados.
- Solicitações de suporte recebem o mínimo necessário: momento aproximado, recurso e resultado. Nunca o conteúdo processado.

## 7. Revisão e encerramento

Cada caso deve encerrar com uma das classificações: falso positivo, falha de fornecedor, falha do controle, uso normal, abuso confirmado ou evidência insuficiente. Engineering atualiza a confiabilidade técnica; Product revisa impacto comercial; Privacy revisa minimização e retenção quando aplicável.

Revisar este runbook trimestralmente e sempre que houver alteração de provedor, política de privacidade, telemetria, limitador ou Termos.
