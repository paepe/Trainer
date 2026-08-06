# TrAIner — D0.2: Sinal de Rede para Proteção Pré-Autenticação

**Estado:** aplicada como controle técnico conservador em 2026-08-06; revisão contínua de Privacy, Security, Product e Engineering

## Decisão proposta

Usar o bucket efêmero gerenciado pela Vercel exclusivamente para atenuar rajadas sem autenticação válida. O sinal não é identidade de conta, não é telemetria de produto e nunca fundamenta suspensão, encerramento ou alteração comercial.

## Dados e derivação

- A Vercel determina a chave de IP exclusivamente na WAF; o TrAIner não lê, normaliza, transmite, persiste ou registra o endereço.
- O backend só chama o identificador programático `ai-preauth-burst` depois de falha de autenticação; chamadas autenticadas não entram no bucket.
- A regra gerenciada usa janela fixa de 60 segundos, limite amplo de 120 tentativas por IP e responde `429` com `Retry-After: 60` quando excedida.
- Não combinar o sinal de rede com perfil, saúde, plano, e-mail, device fingerprint ou conteúdo de request.

## Rotação e retenção

- A retenção e rotação do bucket são geridas pela WAF da Vercel; o aplicativo não possui segredo, tabela ou histórico de rede.
- A janela configurada é de 60 segundos; não há agregação longitudinal do TrAIner por rede.

## Comportamento permitido

- Ação exclusiva: recusar temporariamente novas chamadas anônimas de uma rajada com `429` genérico e `Retry-After`.
- Nunca aplicar bloqueio de conta, downgrade, alteração de licença, notificação disciplinar ou alerta de fraude com base apenas nesse sinal.
- Acomodar NAT, redes corporativas, VPN, famílias e redes móveis: o limite é deliberadamente amplo e só protege o caminho anônimo.
- Após autenticação, o sinal de rede deixa de decidir; qualquer controle futuro usa ator HMAC + endpoint, em modo sombra e com evidência da Fase 2.

## Controles aplicados

1. A WAF da Vercel é a única responsável pela chave de IP; não há cabeçalho de origem processado pelo aplicativo.
2. A implementação não persiste nem correlaciona rede com dados de saúde ou conta.
3. O armazenamento é compartilhado/atômico da WAF; se a regra programática estiver ausente ou indisponível em produção, a tentativa sem autenticação válida falha fechada com `503`.
4. A resposta ao limite é genérica (`429`), sem expor threshold ou regras de evasão.

## Limite de escopo

Não derivar, registrar ou limitar por IP/rede dentro do aplicativo. O único controle de rede é a WAF gerenciada; não se deve introduzir simulação em memória local, tabela própria ou telemetria de IP.
