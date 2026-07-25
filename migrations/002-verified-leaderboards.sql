drop table if exists daily_leaderboard cascade;
drop table if exists endless_streak_leaderboard cascade;
drop table if exists leaderboard cascade;

create table leaderboard_endless_run (
  id text primary key,
  user_id text not null references "user" ("id") on delete cascade,
  verified_streak integer not null default 0 check (verified_streak >= 0),
  next_puzzle_number integer not null default 1 check (next_puzzle_number > 0),
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leaderboard_endless_run_user_idx
  on leaderboard_endless_run (user_id);
create unique index leaderboard_endless_run_active_user_idx
  on leaderboard_endless_run (user_id)
  where status = 'active';
create index leaderboard_endless_run_updated_idx
  on leaderboard_endless_run (updated_at);

create table leaderboard_attempt_rate_limit (
  limit_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now()
);

create index leaderboard_attempt_rate_limit_updated_idx
  on leaderboard_attempt_rate_limit (updated_at);

create table leaderboard_attempt (
  id text primary key,
  user_id text not null references "user" ("id") on delete cascade,
  kind text not null check (kind in ('preset', 'daily', 'endless')),
  difficulty text not null,
  date_key text,
  style text not null check (style in ('color', 'black-and-white')),
  seed text not null,
  size integer not null check (size > 0),
  puzzle_type text,
  puzzle_number integer,
  endless_run_id text references leaderboard_endless_run (id) on delete cascade,
  swap_budget integer check (swap_budget > 0),
  time_limit_seconds integer check (time_limit_seconds > 0),
  status text not null default 'prepared'
    check (status in ('prepared', 'started', 'completed', 'abandoned')),
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  check (
    (kind = 'preset' and date_key is null and endless_run_id is null and puzzle_number is null) or
    (kind = 'daily' and date_key is not null and endless_run_id is null and puzzle_number is null) or
    (kind = 'endless' and date_key is null and endless_run_id is not null and puzzle_number is not null)
  )
);

create index leaderboard_attempt_user_idx on leaderboard_attempt (user_id);
create index leaderboard_attempt_expiry_idx on leaderboard_attempt (expires_at);
create unique index leaderboard_attempt_run_puzzle_idx
  on leaderboard_attempt (endless_run_id, puzzle_number)
  where endless_run_id is not null;

create table leaderboard (
  id bigint generated always as identity primary key,
  attempt_id text unique references leaderboard_attempt (id) on delete set null,
  user_id text not null references "user" ("id") on delete cascade,
  difficulty text not null,
  moves integer not null check (moves > 0),
  solve_time double precision not null check (solve_time > 0),
  created_at timestamptz not null default now()
);

create index leaderboard_difficulty_time_idx
  on leaderboard (difficulty, solve_time, moves, created_at);
create index leaderboard_difficulty_moves_idx
  on leaderboard (difficulty, moves, solve_time, created_at);

create table daily_leaderboard (
  id bigint generated always as identity primary key,
  attempt_id text unique references leaderboard_attempt (id) on delete set null,
  user_id text not null references "user" ("id") on delete cascade,
  date_key text not null,
  style text not null check (style in ('color', 'black-and-white')),
  moves integer not null check (moves > 0),
  solve_time double precision not null check (solve_time > 0),
  created_at timestamptz not null default now()
);

create index daily_leaderboard_date_idx
  on daily_leaderboard (date_key, solve_time, moves, created_at);

create table endless_streak_leaderboard (
  id bigint generated always as identity primary key,
  run_id text not null unique references leaderboard_endless_run (id) on delete cascade,
  user_id text not null references "user" ("id") on delete cascade,
  difficulty text not null default 'endless',
  streak_count integer not null check (streak_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index endless_streak_rank_idx
  on endless_streak_leaderboard (difficulty, streak_count desc, created_at);
