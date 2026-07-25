create table if not exists "user" (
  "id" text primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null default false,
  "image" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "session" (
  "id" text primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id") on delete cascade
);

create index if not exists session_user_id_idx on "session" ("userId");

create table if not exists "account" (
  "id" text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists account_user_id_idx on "account" ("userId");

create table if not exists "verification" (
  "id" text primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists verification_identifier_idx
  on "verification" ("identifier");

create table if not exists player_progress (
  user_id text primary key references "user" ("id") on delete cascade,
  best_stats jsonb not null default '{}'::jsonb,
  daily_record jsonb,
  endless_stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists leaderboard (
  id bigint generated always as identity primary key,
  player_name text not null,
  difficulty text not null,
  moves integer not null check (moves > 0),
  solve_time double precision not null check (solve_time > 0),
  created_at timestamptz not null default now()
);

create table if not exists endless_streak_leaderboard (
  id bigint generated always as identity primary key,
  player_name text not null,
  difficulty text not null,
  streak_count integer not null check (streak_count > 0),
  created_at timestamptz not null default now()
);

create table if not exists daily_leaderboard (
  id bigint generated always as identity primary key,
  player_name text not null,
  date_key text not null,
  style text not null,
  moves integer not null check (moves > 0),
  solve_time double precision not null check (solve_time > 0),
  created_at timestamptz not null default now()
);

alter table leaderboard add column if not exists user_id text;
alter table endless_streak_leaderboard add column if not exists user_id text;
alter table daily_leaderboard add column if not exists user_id text;

create index if not exists leaderboard_user_id_idx on leaderboard (user_id);
create index if not exists endless_streak_user_id_idx
  on endless_streak_leaderboard (user_id);
create index if not exists daily_leaderboard_user_id_idx
  on daily_leaderboard (user_id);
create index if not exists leaderboard_created_at_idx
  on leaderboard (created_at);
create index if not exists endless_streak_created_at_idx
  on endless_streak_leaderboard (created_at);
create index if not exists daily_leaderboard_created_at_idx
  on daily_leaderboard (created_at);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leaderboard_user_id_fkey'
  ) then
    alter table leaderboard
      add constraint leaderboard_user_id_fkey
      foreign key (user_id) references "user" ("id") on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'endless_streak_leaderboard_user_id_fkey'
  ) then
    alter table endless_streak_leaderboard
      add constraint endless_streak_leaderboard_user_id_fkey
      foreign key (user_id) references "user" ("id") on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_leaderboard_user_id_fkey'
  ) then
    alter table daily_leaderboard
      add constraint daily_leaderboard_user_id_fkey
      foreign key (user_id) references "user" ("id") on delete set null;
  end if;
end
$$;
