# Decisão Operacional — Fan-out de Tradução por IA

**Decisão:** preservar chamadas isoladas por item para qualidade e cache, com pool máximo de oito chamadas ao provedor por request; não introduzir fila persistente nesta etapa.

**Justificativa:** o limite de payload aceita até 300 itens por motivos de biblioteca, mas o pool limita custo/conexões concorrentes. Uma fila adicionaria latência e estado operacional sem evidência atual de que a demanda normal excede o pool. A telemetria de endpoint e o relatório de observação decidirão se batching adicional ou fila se tornam necessários.

**Guardrails:** lote e caracteres já são limitados; cada falha parcial devolve conteúdo fonte; não há retry automático pago; futura alteração deve preservar cache, idempotência e degradação segura.
