# TrAIner — Política de Consumo de IA por TRAINER e Aluno (rascunho interno)

**Estado:** proposta para aprovação de Product, Jurídico e Privacy — não publicada

## Princípio

Uma licença TRAINER não patrocina recursos de IA individuais do aluno. O vínculo profissional libera colaboração e dados operacionais previstos na matriz de licenças; não cria crédito, franquia ou direito transferível de voz, interpretação de check-in ou ajuste por IA.

## Atribuição de consumo

| Situação | Autoridade comercial | Atribuição de custo/telemetria | Regra proposta |
|---|---|---|---|
| Aluno gera ou adapta treino autônomo | Plano efetivo do aluno | Plano do aluno; ator HMAC do aluno | Permitido somente pelos entitlements do aluno. |
| TRAINER solicita treino autônomo para aluno vinculado | Plano efetivo do aluno | Plano do aluno; ator HMAC do TRAINER | O vínculo é verificado, mas não eleva nem patrocina a licença do aluno. |
| TRAINER usa IA no próprio contexto profissional | Plano efetivo do TRAINER | Plano do TRAINER; ator HMAC do TRAINER | Requer endpoint e entitlement profissional específicos; não deve ser cobrado ao aluno por inferência. |
| Aluno FREE patrocinado registra check-in manual detalhado | Regra de patrocínio operacional | Sem inferência paga de IA | Permitido conforme matriz; sem voz, interpretação ou ajuste por IA patrocinados. |
| Aluno com AI FITNESS/PERFORMANCE usa voz ou interpretação | Plano efetivo do aluno | Plano do aluno; ator HMAC do aluno | Permitido pelos direitos próprios do aluno, inclusive quando um TRAINER visualiza os resultados autorizados. |

## Sem franquia implícita

Enquanto o TrAIner comercializar uso pessoal normal como ilimitado, não há “franquia de IA do TRAINER” a transferir, revender ou consumir em nome de alunos. Qualquer futura oferta B2B com crédito, custo compartilhado ou pagamento por uso exige decisão comercial e alteração explícita da matriz, dos Termos, da telemetria e do consentimento aplicável.

## Proteções

- O backend resolve o plano do sujeito da funcionalidade; o cliente nunca declara a licença que deve ser aplicada.
- Telemetria registra somente dimensões minimizadas: plano, endpoint, resultado, custo e ator HMAC.
- Alertas e contenção não podem converter o vínculo TRAINER–aluno em presunção de abuso nem expor dados de saúde ao profissional.
- Uma sessão de treino já iniciada permanece independente de contenção sobre uma nova chamada de IA.

## Aprovação necessária

Product deve confirmar que não existe patrocínio de IA além do acesso operacional documentado. Jurídico e Privacy devem aprovar a redação antes de publicação em Termos, marketing ou matriz comercial.
