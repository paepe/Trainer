# TrAIner — D0.2: Sinal de Rede para Proteção Pré-Autenticação (rascunho)

**Estado:** proposta técnica para aprovação de Privacy, Security, Product e Engineering — não implementada nem ativada

## Decisão proposta

Usar um sinal de rede **pseudonimizado e efêmero** exclusivamente para atenuar rajadas anônimas antes da validação de JWT. O sinal não é identidade de conta, não é telemetria de produto e nunca fundamenta suspensão, encerramento ou alteração comercial.

## Dados e derivação

- Aceitar somente um endereço de origem fornecido por infraestrutura de borda comprovadamente confiável; nunca confiar em cabeçalho livremente enviado pelo cliente.
- Normalizar o endereço na memória da função e derivar `HMAC-SHA-256(epoch_secret, normalized_network_signal)`.
- Persistir, se necessário, apenas o HMAC, a época de rotação, endpoint e janela de expiração. IP bruto não entra em banco, log, evento de IA ou alerta.
- Não combinar o HMAC de rede com perfil, saúde, plano, e-mail, device fingerprint ou conteúdo de request.

## Rotação e retenção

- `epoch_secret` é derivado de segredo root exclusivo do servidor e de uma época de rotação diária; o segredo root fica apenas no cofre de produção.
- O bucket pré-auth expira em até 15 minutos; não há retenção histórica nem agregação longitudinal por rede.
- Rotacionar o segredo root por processo operacional documentado, invalidando buckets ativos de forma segura.

## Comportamento permitido

- Ação exclusiva: recusar temporariamente novas chamadas anônimas de uma rajada com `429` genérico e `Retry-After`.
- Nunca aplicar bloqueio de conta, downgrade, alteração de licença, notificação disciplinar ou alerta de fraude com base apenas nesse sinal.
- Acomodar NAT, redes corporativas, VPN, famílias e redes móveis: o limite é deliberadamente amplo e só protege o caminho anônimo.
- Após autenticação, o sinal de rede deixa de decidir; qualquer controle futuro usa ator HMAC + endpoint, em modo sombra e com evidência da Fase 2.

## Dependências antes de implementação

1. Security comprova qual cabeçalho de origem é confiável na borda Vercel e documenta a configuração de proxy.
2. Privacy aprova a finalidade, retenção máxima de 15 minutos, rotação e ausência de correlação com saúde/conta.
3. Engineering define armazenamento atômico compartilhado e indisponibilidade fail-closed para chamadas pagas.
4. Product aprova a mensagem UX genérica, sem threshold ou explicação que facilite evasão.

## Decisão conservadora até aprovação

Não derivar, registrar ou limitar por IP/rede. Endpoints anônimos continuam dependentes dos controles de transporte já existentes e das proteções de borda da plataforma; não se deve simular uma proteção pré-auth na memória local de funções serverless.
