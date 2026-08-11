-- Local-only fixture: clients eligible for the FREE weekly workout-limit flow.
-- It is intentionally never applied to the linked Supabase project.

-- The checked-in local baseline predates the lifecycle column that the app
-- already reads in the deployed schema. Keep the fixture executable locally.
alter table public.workout_sessions
  add column if not exists status text not null default 'completed';

do $$
declare
  fixture_password text := crypt('TrAIner2026!', gen_salt('bf', 6));
  fixture_instance uuid := '00000000-0000-0000-0000-000000000000';
  fixture_email text;
  fixture_name text;
  fixture_user_id uuid;
begin
  for fixture_email, fixture_name in
    values
      ('free.limit.alpha@client.test', 'Free Limit Alpha'),
      ('free.limit.bravo@client.test', 'Free Limit Bravo'),
      ('free.limit.charlie@client.test', 'Free Limit Charlie')
  loop
    select id into fixture_user_id
      from auth.users
      where email = fixture_email;

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
      )
      returning id into fixture_user_id;
    else
      update auth.users
        set encrypted_password = fixture_password,
            email_confirmed_at = now(),
            raw_user_meta_data = jsonb_build_object('name', fixture_name, 'role', 'client'),
            email_change = '',
            updated_at = now()
        where id = fixture_user_id;
    end if;

    update public.profiles
      set name = fixture_name,
          role = 'client'
      where id = fixture_user_id;

    insert into public.subscriptions (
      user_id, plan_key, status, billing_cycle, current_period_end
    ) values (
      fixture_user_id, 'free', 'active', null, now() - interval '1 day'
    )
    on conflict (user_id) do update
      set plan_key = 'free',
          status = 'active',
          billing_cycle = null,
          current_period_end = now() - interval '1 day',
          updated_at = now();

    delete from public.workout_sessions
      where user_id = fixture_user_id;

    insert into public.workout_sessions (
      user_id, status, created_at, started_at, completed_at, duration_minutes,
      feedback_notes
    ) values (
      fixture_user_id, 'completed', now(), now(), now(), 30,
      'Local FREE weekly-limit test fixture'
    );
  end loop;
end;
$$;
