# Rollback — proveniência de treino autónomo

**Estado:** Procedimento operacional interno  
**Última revisão:** 2026-08-11  
**Escopo:** `20260811220000_autonomous_workout_provenance.sql` e `20260811234000_authoritative_timeout_workout_origin.sql`

## Princípio

O rollback não pode deixar o browser publicado escrevendo colunas removidas. A ordem obrigatória é: publicar o commit anterior compatível, confirmar a ausência de geração em andamento e só então reverter o schema.

## Passos

1. Publicar o commit imediatamente anterior à mudança de schema ou uma versão que não envie `timeout_notification_id`.
2. Confirmar no pre-release que uma geração autónoma e um plano manual iniciam normalmente.
3. Executar o SQL abaixo com credencial administrativa, em uma janela de manutenção curta.
4. Verificar `workout_plans`, `notification_log` e o fluxo normal de Workout. Planos já criados permanecem legíveis; o histórico trata campos de proveniência ausentes/nulos como legado.

```sql
drop trigger if exists set_autonomous_workout_provenance on public.workout_plans;
drop function if exists public.set_autonomous_workout_provenance();

alter table public.workout_plans
  drop constraint if exists workout_plans_timeout_notification_id_fkey;
drop index if exists public.workout_plans_timeout_notification_id_idx;
alter table public.workout_plans
  drop column if exists timeout_notification_id;

-- Restaurar a função/trigger da migração 20260811220000 e a função
-- consume_workout_timeout_notification da migração 20260811213000.
-- Não remover autonomous_origin ou coach_dna_applied enquanto a UI de
-- histórico ainda os puder ler; ambos aceitam NULL e são retrocompatíveis.
```

## Critérios de reversão bem-sucedida

- Nenhuma tela envia coluna inexistente ao Supabase.
- O aluno continua iniciando Workout normal conforme entitlement.
- O plano manual e o realtime de check-in do TRAINER permanecem inalterados.
- Nenhum dado de check-in, voz, ciclo ou Coach DNA é copiado para o rollback.
