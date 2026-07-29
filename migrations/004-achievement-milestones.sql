alter table player_achievement_event
  add column if not exists played_date date,
  add column if not exists swap_count integer;

update player_achievement_event
set played_date = (created_at at time zone 'UTC')::date
where kind in ('preset', 'daily', 'endless')
  and played_date is null;

alter table player_achievement_event
  drop constraint if exists player_achievement_event_kind_check,
  drop constraint if exists player_achievement_event_check;

alter table player_achievement_event
  add constraint player_achievement_event_kind_check
    check (kind in ('preset', 'daily', 'endless', 'swap')),
  add constraint player_achievement_event_shape_check
    check (
      (
        kind = 'preset'
        and preset_mode is not null
        and solve_time is not null
        and solve_time > 0
        and daily_date is null
        and is_three_star is null
        and endless_streak is null
        and played_date is not null
        and swap_count is null
      )
      or (
        kind = 'daily'
        and preset_mode is null
        and solve_time is null
        and daily_date is not null
        and is_three_star is null
        and endless_streak is null
        and played_date is not null
        and swap_count is null
      )
      or (
        kind = 'endless'
        and preset_mode is null
        and solve_time is null
        and daily_date is null
        and is_three_star is not null
        and endless_streak is not null
        and endless_streak > 0
        and played_date is not null
        and swap_count is null
      )
      or (
        kind = 'swap'
        and preset_mode is null
        and solve_time is null
        and daily_date is null
        and is_three_star is null
        and endless_streak is null
        and played_date is null
        and swap_count is not null
        and swap_count between 1 and 25
      )
    );

create index if not exists player_achievement_event_user_played_date_idx
  on player_achievement_event (user_id, played_date)
  where played_date is not null;
