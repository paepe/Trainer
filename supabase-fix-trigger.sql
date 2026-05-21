-- Fix 1: política de INSERT em falta na tabela profiles
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Fix 2: recriar a trigger function com search_path correto
-- (sem isto, o PostgreSQL não encontra a tabela profiles no contexto da função)
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
