-- Enforce that subscriptions.plan_key matches the user's role family.
-- CHECK constraints can't reference other tables, so this is a trigger:
-- client roles may only hold 'free' | 'ai_fitness' | 'ai_performance';
-- trainer-family roles (trainer, studio_*, internal_trainer,
-- technical_coordinator, studio_manager) may only hold
-- 'free' | 'trial' | 'pro' | 'elite'. 'free' is valid for both, since it's
-- the default before any tier is chosen.

create or replace function check_subscription_plan_key_matches_role()
returns trigger as $$
declare
  user_role text;
  client_plans   text[] := array['free', 'ai_fitness', 'ai_performance'];
  trainer_plans  text[] := array['free', 'trial', 'pro', 'elite'];
begin
  select role into user_role from profiles where id = new.user_id;

  if user_role = 'client' then
    if not (new.plan_key = any(client_plans)) then
      raise exception 'plan_key % is not valid for role client', new.plan_key;
    end if;
  else
    if not (new.plan_key = any(trainer_plans)) then
      raise exception 'plan_key % is not valid for role %', new.plan_key, user_role;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security invoker set search_path = public;

create trigger trg_subscription_plan_key_matches_role
  before insert or update on subscriptions
  for each row execute function check_subscription_plan_key_matches_role();
