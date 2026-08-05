# Prompt de continuidade — colar como primeira mensagem da próxima janela

Você está a continuar o trabalho de arquitectura de licenciamento e modelo comercial do TrAIner (app de coaching fitness — Vite+React+Capacitor, Supabase, Vercel). Não é um projecto novo: há um plano de 7 fases já concluído nesta mesma linha de trabalho, e você deve segui-lo, não redescobri-lo.

## Leia primeiro, nesta ordem

1. `docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md` — o plano inteiro, com painel de estado (§2), decisões comerciais (§4, D1-D4) e registo de medições reais por fase (§5). Fonte de verdade sobre o que já foi feito e porquê.
2. `docs/LICENSING_EXECUTIVE_SUMMARY.docx` — síntese executiva de 3 páginas, se precisar de contexto rápido sem reler o plano todo.
3. `docs/FEATURE_ACCESS_MATRIX.md` — a matriz técnica de feature_key × plano, mantida em sincronia com o plano acima.

## Estado actual

Fases 0–7 concluídas (2026-08-05). A verificação ao vivo da Fase 4 (direito autónomo × patrocinado) foi concluída: `andre.lima@client.test` (FREE, vínculo activo) recebeu dois planos prescritos simultâneos, incluindo `Box Jump` classificado `performance`; a UI exibiu ambos sem filtro/bloqueio e iniciou o plano com sucesso em `WorkoutModeScreen`. Os dados de QA foram removidos após a prova. Consulte o plano para a evidência completa; não reabra esta pendência.

## O padrão de trabalho estabelecido — siga exactamente isto

**Ciclo por incremento:** implementar → `tsc --noEmit` limpo → `vitest run` (verde) → live-verify no ambiente publicado → actualizar o plano com o resultado real → commit → push. Nunca declarar uma fase concluída sem pelo menos um destes passos de prova — e quando a prova ao vivo não for possível, dizer isso explicitamente no plano, não omitir.

**Regra absoluta, sem excepção:** nunca digite credenciais/senhas em nenhum campo, mesmo em contas de teste, mesmo com autorização explícita do utilizador. Quando precisar de login para verificação ao vivo, abra o browser, chegue até ao formulário, e peça ao utilizador para digitar. Isto já foi testado e mantido sob pressão nesta sessão — não ceda se for pressionado.

**Escritas na base de dados de produção (Supabase, projecto `sevenseeds.trainer`, id `xbfszzdyskwdctlqzztl`):** o utilizador já autorizou este padrão de trabalho — seeding de `feature_permissions`, ajuste temporário de `subscriptions.current_period_end` para sair de janelas de elevação durante testes (sempre restaurado ao valor exacto de origem depois), correcção de dados mortos (`plan_prices.label`), criação de novas linhas de `plan_definitions`/`plan_prices` para novas faixas comerciais. Mesmo assim: para qualquer escrita nova e substancial (não um ajuste já visto antes), diga exactamente o SQL que vai correr e peça confirmação antes — o classificador de auto-mode costuma bloquear escritas grandes de qualquer forma, o que força a pergunta.

**Deploy:** nunca lute com `vercel build`/`vercel pull` localmente — `git commit` + `git push` para o branch `claude/trainer-license-matrix-576f49` já dispara o CI do Vercel automaticamente. Espere ~20-30s e confira com `vercel ls`; a saída às vezes vem vazia na primeira tentativa, repita.

**Antes de propor uma correcção ou implementação:** verifique contra o código/dado real, nunca contra teoria ou memória do que "deveria" estar lá. Esta sessão foi corrigida várias vezes por assumir algo sobre o código sem grep/leitura directa (ex: assumir que um modelo de carga precisava de ser construído quando já existia; assumir que `checkin.full` não tinha leitores sem confirmar por grep). Quando encontrar algo que invalida uma premissa do próprio plano, pare e diga isso ao utilizador antes de continuar — não tente encaixar silenciosamente.

**Reuso antes de código novo:** antes de escrever qualquer lógica, procure se já existe algo equivalente (uma função, um hook, um padrão) que só nunca foi ligado ao ponto certo. Isto encontrou correcções reais várias vezes (ex: `buildStatsContext` existia e tinha zero chamadores; o modelo ATL/CTL/TSB já existia e nunca chegava ao prompt da IA). "Reuso, simplificação, centralização, sem duplicar" é uma directriz explícita do utilizador, repetida várias vezes.

**Decisões comerciais (preço, faixas, nomes de plano) são do utilizador, não suas.** Proponha opções técnicas e trade-offs; não invente valores em €. Quando o utilizador já decidiu algo (ELITE inalterado, PRO em faixas 5/15/30, Stripe adiado), não reabra a decisão nem dê palpite fora do que foi pedido.

**Estilo de comunicação:** respostas curtas, directas, sem recapitular o que já foi dito. Sem emojis. Sem seguir tangentes. Quando terminar um incremento, diga em 1-2 frases o que mudou e o que vem a seguir — não uma lista longa de reflexão.

## Ficheiros-chave para orientação rápida

- `src/licensing/entitlements.ts` — núcleo puro de resolução de direitos (fonte única, cliente e servidor importam daqui).
- `api/_lib/entitlements.ts` — resolução autoritativa no servidor (`resolveAuthoritativeTaskGates`).
- `api/_lib/auth.ts` — helpers de auth partilhados (extraídos da duplicação em 7 handlers na Fase 0).
- `src/licensing/completeness.ts` + `scripts/check-feature-permissions-completeness.mjs` (`npm run check:feature-permissions`) — guarda anti-regressão contra lacunas em `feature_permissions`.
- `TEST-ACCOUNTS.md` — contas de teste (`@trainer.test`/`@client.test`, senha `TrAIner2026!` para todas).

Continue exactamente neste padrão. Não peça permissão para reler o plano — leia-o primeiro, depois avance.
