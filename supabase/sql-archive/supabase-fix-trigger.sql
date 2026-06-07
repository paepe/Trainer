-- Fix 1: missing INSERT policy on profiles table
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Fix 2: recreate the trigger function with correct search_path
-- (without this, PostgreSQL can't find the profiles table in the function context)
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
