# TrAIner — Limites Operacionais dos Endpoints de IA

**Estado:** baseline técnico; limites de abuso pós-auth ainda não definidos — 2026-08-06

| Endpoint | Limite de entrada atual | Timeout do provedor | Concorrência por request | Situação |
|---|---:|---:|---:|---|
| `generate-smart-workout` | 128.000 caracteres serializados | 28 s | 1 | Limite de transporte aplicado; limite de uso justo depende da Fase 2 |
| `generate-workout` | 128.000 caracteres serializados | 25 s | 1 | Limite de transporte aplicado; limite de uso justo depende da Fase 2 |
| `translate-exercise-content` | 300 itens × 300 caracteres | isolado por item | 8 chamadas ao provedor | Pool aplicado; lote é compatível com a biblioteca atual |
| `parse-voice` | body de 8.000; transcrição de 4.000 caracteres | 15 s | 1 | Teto global e de campo aplicados |
| `cleanup-voice-note` | body de 8.000; transcrição de 4.000 caracteres | 15 s | 1 | Teto global e de campo aplicados |
| `generate-amplified` | 8.000 caracteres serializados; perfil persistido minimizado | 22 s | 1 | Body legado limitado e ignorado como autoridade |
| `classify-exercises` | 50 itens; nome 200; grupo 80 caracteres | 15 s | 1 | Lote interno limitado |
| `send-welcome-message` | body de 2.000; `trainerId` até 128 caracteres | 28 s | 1 | Teto global e de campo aplicados |

## Decisões já tomadas

- Timeouts de fornecedor são limites de continuidade, não promessa comercial nem threshold de uso justo.
- O pool de tradução limita chamadas reais ao fornecedor por request; não usa `Promise.all` ilimitado.
- Os limites de geração evitam payload arbitrário antes da preparação de prompt.
- Valores de rajada, concorrência por ator e volume diário não serão definidos antes de evidência normal da Fase 2.

## Lacunas a fechar antes da Fase 4

1. Medir o tamanho real dos fluxos de voz e classificação sem registrar conteúdo.
2. Definir, após observação, janelas independentes por endpoint e o comportamento do armazenamento atômico compartilhado.
