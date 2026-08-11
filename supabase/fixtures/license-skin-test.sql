-- Local-only fixtures for manual verification of CLIENT license skins.
-- Never apply to the linked Supabase project.

do $$
declare
  fixture_password text := crypt('TrAIner2026!', gen_salt('bf', 6));
  fixture_instance uuid := '00000000-0000-0000-0000-000000000000';
  fixture_email text;
  fixture_name text;
  fixture_plan text;
  fixture_user_id uuid;
begin
  for fixture_email, fixture_name, fixture_plan in
    values
      ('skin.free@client.test', 'Skin Free', 'free'),
      ('skin.fitness@client.test', 'Skin AI Fitness', 'ai_fitness'),
      ('skin.performance@client.test', 'Skin AI Performance', 'ai_performance')
  loop
    select id into fixture_user_id from auth.users where email = fixture_email;

    if fixture_user_id is null then
      insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        gen_random_uuid(), fixture_instance, 'authenticated', 'authenticated',
        fixture_email, fixture_password, now(),
        jsonb_build_object('name', fixture_name, 'role', 'client'),
        now(), now(), '', '', '', ''
      ) returning id into fixture_user_id;
    else
      update auth.users
        set encrypted_password = fixture_password,
            email_confirmed_at = now(),
            raw_user_meta_data = jsonb_build_object('name', fixture_name, 'role', 'client'),
            email_change = '',
            updated_at = now()
        where id = fixture_user_id;
    end if;

    update public.profiles set name = fixture_name, role = 'client' where id = fixture_user_id;

    insert into public.subscriptions (user_id, plan_key, status, billing_cycle, current_period_end)
    values (fixture_user_id, fixture_plan, 'active', 'monthly', now() + interval '30 days')
    on conflict (user_id) do update
      set plan_key = excluded.plan_key,
          status = excluded.status,
          billing_cycle = excluded.billing_cycle,
          current_period_end = excluded.current_period_end,
          updated_at = now();
  end loop;
end;
$$;
