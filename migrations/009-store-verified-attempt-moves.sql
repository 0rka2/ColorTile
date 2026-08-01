alter table leaderboard_attempt
  add column if not exists verified_moves integer check (verified_moves > 0);

update leaderboard_attempt as attempt
set verified_moves = score.moves
from leaderboard as score
where score.attempt_id = attempt.id
  and attempt.verified_moves is null;

update leaderboard_attempt as attempt
set verified_moves = score.moves
from daily_leaderboard as score
where score.attempt_id = attempt.id
  and attempt.verified_moves is null;
