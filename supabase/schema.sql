-- =============================================================
-- Fitness app — Supabase schema.
-- Run this in the Supabase SQL editor, then put your project URL
-- and anon key in .env to switch the app from localStorage to sync.
-- =============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------- profiles
create table if not exists profiles (
  id          uuid primary key references auth.users on delete cascade,
  username    text unique not null,
  weight_goal double precision,
  gender      text default 'unspecified',
  theme       text default 'dark',
  units       text default 'kg',
  dist_units  text default 'km',
  created_at  timestamptz default now()
);

-- --------------------------------------------------------- weight_logs
create table if not exists weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  weight_kg  double precision not null,
  logged_at  date not null,
  created_at timestamptz default now(),
  unique (user_id, logged_at)
);

-- ---------------------------------------------------- workout_templates
create table if not exists workout_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now()
);

-- --------------------------------------------------- template_exercises
create table if not exists template_exercises (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references workout_templates(id) on delete cascade,
  exercise_id   text not null,
  exercise_name text not null,
  sets          int  not null default 3,
  -- Text, not int: holds a single target ("10") or a range ("10-12").
  reps          text not null default '8-12',
  weight_kg     double precision,
  order_index   int  not null default 0,
  created_at    timestamptz default now()
);

-- ---------------------------------------------------- custom_exercises
-- Exercises the user added themselves when the catalogue was missing one.
create table if not exists custom_exercises (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  name         text not null,
  body_part    text not null default 'chest',
  target       text,
  equipment    text not null default 'barbell',
  instructions text,
  created_at   timestamptz default now()
);

-- ----------------------------------------------------- workout_sessions
create table if not exists workout_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  template_id     uuid references workout_templates(id) on delete set null,
  template_name   text not null,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  duration_s      int,
  total_volume_kg double precision,
  sets_done       int,
  created_at      timestamptz default now()
);

-- --------------------------------------------------------- session_sets
create table if not exists session_sets (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references workout_sessions(id) on delete cascade,
  exercise_id   text not null,
  exercise_name text not null,
  set_num       int not null,
  reps_done     int not null,
  weight_kg     double precision,
  created_at    timestamptz default now()
);

-- --------------------------------------------------- scheduled_workouts
create table if not exists scheduled_workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  date          date not null,
  template_id   uuid references workout_templates(id) on delete cascade,
  template_name text not null,
  kind          text not null default 'workout',   -- workout | rest
  created_at    timestamptz default now()
);

-- --------------------------------------------------------- run_sessions
create table if not exists run_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  source      text not null default 'manual',      -- health-connect | garmin | manual
  external_id text,
  title       text,
  started_at  timestamptz not null,
  distance_km double precision not null default 0,
  duration_s  int not null default 0,
  avg_pace_s  double precision,
  hr_avg      int,
  hr_max      int,
  calories    int,
  synced_at   timestamptz default now(),
  created_at  timestamptz default now(),
  unique (user_id, source, external_id)
);

-- --------------------------------------------------------------- indexes
create index if not exists idx_weight_user   on weight_logs(user_id, logged_at);
create index if not exists idx_tpl_user      on workout_templates(user_id);
create index if not exists idx_tplex_tpl     on template_exercises(template_id, order_index);
create index if not exists idx_sess_user     on workout_sessions(user_id, started_at desc);
create index if not exists idx_sets_session  on session_sets(session_id);
create index if not exists idx_sched_user    on scheduled_workouts(user_id, date);
create index if not exists idx_runs_user     on run_sessions(user_id, started_at desc);
create index if not exists idx_customex_user  on custom_exercises(user_id);

-- =============================================================
-- Row Level Security — every row is private to its owner.
-- =============================================================
alter table profiles            enable row level security;
alter table weight_logs         enable row level security;
alter table workout_templates   enable row level security;
alter table template_exercises  enable row level security;
alter table workout_sessions    enable row level security;
alter table session_sets        enable row level security;
alter table scheduled_workouts  enable row level security;
alter table run_sessions        enable row level security;
alter table custom_exercises    enable row level security;

-- profiles: a user reads/writes only their own row.
-- (Username lookup at login happens through auth, not a public read.)
create policy "own profile read"   on profiles for select using (auth.uid() = id);
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);

-- Tables keyed directly by user_id.
do $$
declare t text;
begin
  foreach t in array array[
    'weight_logs', 'workout_templates', 'workout_sessions',
    'scheduled_workouts', 'run_sessions', 'custom_exercises'
  ] loop
    execute format(
      'create policy "own rows" on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Child tables inherit ownership through their parent.
create policy "own template exercises" on template_exercises for all
  using (exists (
    select 1 from workout_templates t
    where t.id = template_exercises.template_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from workout_templates t
    where t.id = template_exercises.template_id and t.user_id = auth.uid()
  ));

create policy "own session sets" on session_sets for all
  using (exists (
    select 1 from workout_sessions s
    where s.id = session_sets.session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from workout_sessions s
    where s.id = session_sets.session_id and s.user_id = auth.uid()
  ));

-- =============================================================
-- Migration note for databases created before rep ranges existed:
--   alter table template_exercises alter column reps type text using reps::text;
-- =============================================================
