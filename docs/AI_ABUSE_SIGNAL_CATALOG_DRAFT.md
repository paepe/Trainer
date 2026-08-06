# Catálogo de Sinais de Uso Anômalo de IA

**Estado:** rascunho para calibragem após observação; não contém thresholds ativos.

| Sinal | Dimensões minimizadas | Interpretação permitida | Não pode justificar sozinho |
|---|---|---|---|
| Rajada por endpoint | ator HMAC, endpoint, janela, contador | possível automação ou retry excessivo | suspensão de conta |
| Concorrência repetida | ator HMAC, endpoint, operações simultâneas | duplicidade ou automação | conclusão de má-fé |
| Repetição de falha | endpoint, resultado, status técnico | incidente de fornecedor/cliente | contenção de conta |
| Custo fora da coorte | plano, endpoint, tokens/custo agregados | anomalia econômica a revisar | cobrança ou redução comercial |
| Uso distribuído | agregados de conta/rede gerenciada | possível abuso coordenado | associação de IP a identidade |
| Bypass/retry | chave idempotente HMAC e resultado | falha de integração ou automação | sanção sem revisão humana |

## Calibragem

Após a observação, Engineering calcula baseline por plano/endpoint/coorte; Product avalia impacto no uso humano; Privacy revisa minimização e risco de falso positivo. Somente sinais corroborados, com modo sombra aprovado, podem gerar contenção temporária. Nenhum sinal de rede é fundamento isolado para ação contra uma conta.
