# TrAIner — Política de Uso Justo de Recursos de IA (rascunho interno)

**Estado:** rascunho para revisão de Product, Jurídico e Privacy — não publicado

**Escopo:** recursos de IA incluídos nos planos AI FITNESS e AI PERFORMANCE, incluindo geração de treinos, adaptações, interpretação de check-ins e recursos de voz quando contratualmente disponíveis.

## 1. Princípio comercial

Os recursos elegíveis são oferecidos como **ilimitados para uso pessoal normal**. A oferta não estabelece uma franquia comercial visível de sessões, exercícios, check-ins ou análises para o uso humano legítimo do assinante.

Esse uso permanece sujeito a esta Política de Uso Justo e aos mecanismos necessários para proteger a disponibilidade, a segurança, a privacidade e a sustentabilidade do serviço.

## 2. Uso pessoal normal

Exemplos de uso normal incluem:

- gerar ou adaptar treinos para a própria rotina;
- registrar check-ins, inclusive por voz quando o recurso estiver contratado;
- pedir nova sugestão quando houver alteração real de tempo, energia, dor, equipamento ou objetivo;
- consultar análises e recomendações dentro do fluxo normal do TrAIner.

O uso de um TRAINER em benefício de aluno vinculado segue as permissões da licença aplicável e não amplia os direitos de IA patrocinados do aluno.

## 3. Uso não permitido

Não é permitido, diretamente ou por terceiros:

- automatizar, programar ou simular chamadas ao serviço;
- enviar solicitações em volume ou cadência incompatíveis com uso humano normal;
- compartilhar, revender, alugar ou explorar comercialmente o acesso à IA;
- contornar controles técnicos, autenticação, licenciamento ou limites de segurança;
- usar contas múltiplas para evitar medidas de proteção;
- submeter conteúdo malicioso, ilegítimo ou destinado a degradar o serviço.

## 4. Medidas de proteção

Para prevenir abuso e preservar o serviço, o TrAIner pode aplicar controles técnicos proporcionais, incluindo proteção contra automação, limitação temporária de rajadas, prevenção de duplicidade, monitoramento agregado de consumo e revisão humana de padrões anormais.

Esses mecanismos não publicam thresholds internos, não transformam o produto em um plano de créditos e não devem interromper treino já iniciado, registro offline de séries ou outros fluxos críticos. Em indisponibilidade de proteção, o produto deve preferir uma degradação segura a uma chamada paga sem autoridade de controle.

## 5. Contenção e suporte

Quando houver indício razoável de abuso, o TrAIner pode limitar temporariamente um recurso de IA, solicitar esclarecimentos ou realizar revisão manual. Suspensão prolongada ou encerramento de conta exige revisão humana, registo do motivo e aplicação consistente dos Termos.

O assinante pode contactar o suporte para contestar uma limitação temporária. O suporte recebe apenas o contexto mínimo necessário para investigação, sem prompts, transcrições, respostas de IA ou outros dados de saúde.

## 6. Privacidade

Os mecanismos de proteção devem usar dados minimizados. Telemetria de uso não deve registrar prompts, transcrições, respostas, identificadores brutos, endereços IP ou dados de saúde. A resposta de uma solicitação pode ser mantida exclusivamente no cache efêmero de idempotência, sob RLS e acesso `service_role`, pelo tempo estritamente necessário para devolver o mesmo resultado a um retry de transporte; esse cache não é telemetria nem fonte de análise. Acesso administrativo e retenção devem seguir o contrato de telemetria e as políticas de privacidade aplicáveis.

## 7. Condições de publicação

Antes de publicar esta política ou referenciá-la nos Termos, concluir:

- revisão jurídica e de privacidade;
- verificação de consistência com a matriz de licenças e comunicação de marketing;
- textos UX localizados para limitação temporária e degradação;
- confirmação de que o rate limiting opera inicialmente em modo sombra e com revisão de falsos positivos.
