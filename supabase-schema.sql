-- TrAIner · Supabase Schema
-- Corre isto no SQL Editor do teu projeto Supabase

-- ─── PROFILES ───────────────────────────────────────────────
create table profiles (
  id          uuid references auth.users on delete cascade primary key,
  name        text,
  email       text,
  phone       text,
  dob         date,
  location    text,
  gender      text,
  role        text default 'client' check (role in ('client', 'trainer')),
  avatar_url  text,
  created_at  timestamptz default now()
);

-- ─── PREFERENCES ────────────────────────────────────────────
create table preferences (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references profiles on delete cascade unique,
  notifications       bool default true,
  goals               bool default true,
  alerts              bool default true,
  analysis            bool default true,
  behaviour           bool default true,
  sounds              bool default false,
  cycle_tracking      bool default true,
  ai_personalization  bool default true,
  dark_mode           bool default true,
  default_location         text    default 'gym',
  default_duration_min     int     default 45,
  preferred_intensity      text    default 'moderate',
  plan_expiry_days         int     default 10,
  workout_ready_expiry_min int     default 30,
  light_palette            text    default 'arctic',
  ai_focus_strength        int     default 5,
  ai_focus_endurance       int     default 5,
  ai_focus_mobility        int     default 5,
  session_history_limit    int     default 50,
  trainer_dashboard_limit  int     default 10,
  language                 text    default 'en',
  white_label              boolean default false,
  updated_at          timestamptz default now()
);

-- ─── DAILY CHECK-INS ────────────────────────────────────────
create table checkins (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references profiles on delete cascade,
  date      date default current_date,
  energy    int  check (energy between 1 and 10),
  soreness  text[],
  minutes   int,
  goal      text,
  created_at timestamptz default now(),
  unique (user_id, date)
);

-- ─── WORKOUTS ───────────────────────────────────────────────
create table workouts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references profiles on delete cascade,
  date             date default current_date,
  type             text,
  duration_minutes int,
  intensity        text check (intensity in ('Recovery', 'Moderate', 'High intensity')),
  notes            text,
  completed        bool default false,
  created_at       timestamptz default now()
);

-- ─── CYCLE CONFIG ───────────────────────────────────────────
create table cycle_config (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references profiles on delete cascade unique,
  cycle_length   int  default 28,
  period_length  int  default 5,
  last_start_date date,
  updated_at     timestamptz default now()
);

-- ─── TRAINER ↔ CLIENT ───────────────────────────────────────
create table trainer_clients (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid references profiles on delete cascade,
  client_id   uuid references profiles on delete cascade,
  created_at  timestamptz default now(),
  unique (trainer_id, client_id)
);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
alter table profiles        enable row level security;
alter table preferences     enable row level security;
alter table checkins        enable row level security;
alter table workouts        enable row level security;
alter table cycle_config    enable row level security;
alter table trainer_clients enable row level security;

-- profiles
create policy "own profile read"   on profiles for select using (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);

-- preferences
create policy "own preferences" on preferences for all using (auth.uid() = user_id);

-- checkins
create policy "own checkins" on checkins for all using (auth.uid() = user_id);

-- workouts: owner reads/writes; trainer reads their clients'
create policy "own workouts" on workouts for all using (auth.uid() = user_id);
create policy "trainer reads client workouts" on workouts for select using (
  exists (
    select 1 from trainer_clients
    where trainer_id = auth.uid() and client_id = workouts.user_id
  )
);

-- cycle_config
create policy "own cycle config" on cycle_config for all using (auth.uid() = user_id);

-- trainer_clients
create policy "trainer views clients" on trainer_clients for select using (auth.uid() = trainer_id);

-- ─── AUTO-CREATE PROFILE ON SIGNUP ──────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
