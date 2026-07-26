create table if not exists player_achievement_event (
  user_id text not null references "user" ("id") on delete cascade,
  event_id text not null,
  kind text not null check (kind in ('preset', 'daily', 'endless')),
  preset_mode text,
  solve_time double precision,
  daily_date text,
  is_three_star boolean,
  endless_streak integer,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id),
  check (
    (
      kind = 'preset'
      and preset_mode is not null
      and solve_time > 0
      and daily_date is null
      and is_three_star is null
      and endless_streak is null
    )
    or (
      kind = 'daily'
      and preset_mode is null
      and solve_time is null
      and daily_date is not null
      and is_three_star is null
      and endless_streak is null
    )
    or (
      kind = 'endless'
      and preset_mode is null
      and solve_time is null
      and daily_date is null
      and is_three_star is not null
      and endless_streak > 0
    )
  )
);

create index if not exists player_achievement_event_user_kind_idx
  on player_achievement_event (user_id, kind);

create table if not exists player_achievement_unlock (
  user_id text not null references "user" ("id") on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
