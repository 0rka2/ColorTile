import { GAME_START_PREVIEW_SECONDS } from "@/app/game/game-logic";
import {
  normalizeVerifiedSwaps,
  validateVerifiedReplay,
} from "@/app/game/verified-attempt";
import { MAX_LEADERBOARD_STREAK } from "@/app/game/leaderboard";
import { getSql } from "@/app/lib/db";
import {
  consumeAttemptRateLimit,
  getLeaderboardUser,
  leaderboardApiError,
  readQueryRows,
  readVerifiedPuzzle,
} from "@/app/lib/verified-leaderboard";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function completeAttempt(request: Request, context: RouteContext) {
  const user = await getLeaderboardUser(request);
  if (!user) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  const rateLimitResponse = await consumeAttemptRateLimit(
    request,
    user.id,
    "complete",
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id } = await context.params;
  const sql = getSql();
  const attemptRows = readQueryRows(await sql`
    select
      *,
      (
        status = 'started' and
        started_at is not null and
        expires_at > now()
      ) as is_active
    from leaderboard_attempt
    where id = ${id} and user_id = ${user.id}
    limit 1
  `);
  const attempt = attemptRows[0] as Record<string, unknown> | undefined;

  if (!attempt) {
    return Response.json({ error: "Attempt not found." }, { status: 404 });
  }

  if (attempt.is_active !== true) {
    return Response.json(
      { error: "This attempt is no longer active." },
      { status: 409 },
    );
  }

  let body: { swaps?: unknown };
  try {
    body = (await request.json()) as { swaps?: unknown };
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const swaps = normalizeVerifiedSwaps(body.swaps);
  if (!swaps) {
    return Response.json({ error: "Invalid replay." }, { status: 400 });
  }

  const puzzle = readVerifiedPuzzle(attempt);
  const replay = validateVerifiedReplay(puzzle, swaps);
  if (!replay.valid) {
    return Response.json({ error: replay.error }, { status: 400 });
  }

  if (puzzle.kind === "preset") {
    const rows = readQueryRows(await sql`
      with completed as (
        update leaderboard_attempt as attempt
        set status = 'completed', completed_at = now()
        where attempt.id = ${id}
          and attempt.user_id = ${user.id}
          and attempt.status = 'started'
          and attempt.started_at is not null
          and attempt.expires_at > now()
        returning
          attempt.id,
          attempt.user_id,
          attempt.difficulty,
          greatest(
            0.1,
            round(extract(epoch from (now() - attempt.started_at))::numeric, 1)::double precision
          ) as solve_time
      ),
      saved_score as (
        insert into leaderboard (attempt_id, user_id, difficulty, moves, solve_time)
        select id, user_id, difficulty, ${replay.moves}, solve_time
        from completed
        returning moves, solve_time
      )
      select moves, solve_time from saved_score
    `);

    if (!rows[0]) {
      return Response.json({ error: "This attempt is no longer active." }, { status: 409 });
    }

    return Response.json({
      moves: Number(rows[0].moves),
      solveTime: Number(rows[0].solve_time),
    });
  }

  if (puzzle.kind === "daily") {
    const rows = readQueryRows(await sql`
      with completed as (
        update leaderboard_attempt as attempt
        set status = 'completed', completed_at = now()
        where attempt.id = ${id}
          and attempt.user_id = ${user.id}
          and attempt.status = 'started'
          and attempt.started_at is not null
          and attempt.expires_at > now()
          and (
            attempt.time_limit_seconds is null or
            attempt.started_at + (
              (attempt.time_limit_seconds + ${GAME_START_PREVIEW_SECONDS}) *
              interval '1 second'
            ) >= now()
          )
        returning
          attempt.id,
          attempt.user_id,
          attempt.date_key,
          attempt.style,
          greatest(
            0.1,
            round(extract(epoch from (now() - attempt.started_at))::numeric, 1)::double precision
          ) as solve_time
      ),
      saved_score as (
        insert into daily_leaderboard (
          attempt_id, user_id, date_key, style, moves, solve_time
        )
        select id, user_id, date_key, style, ${replay.moves}, solve_time
        from completed
        returning moves, solve_time
      )
      select moves, solve_time from saved_score
    `);

    if (!rows[0]) {
      return Response.json({ error: "This attempt is no longer active." }, { status: 409 });
    }

    return Response.json({
      moves: Number(rows[0].moves),
      solveTime: Number(rows[0].solve_time),
    });
  }

  const rows = readQueryRows(await sql`
    with completed as (
      update leaderboard_attempt as attempt
      set status = 'completed', completed_at = now()
      where attempt.id = ${id}
        and attempt.user_id = ${user.id}
        and attempt.status = 'started'
        and attempt.started_at is not null
        and attempt.expires_at > now()
        and (
          attempt.time_limit_seconds is null or
          attempt.started_at + (
            (attempt.time_limit_seconds + ${GAME_START_PREVIEW_SECONDS}) *
            interval '1 second'
          ) >= now()
        )
        and exists (
          select 1
          from leaderboard_endless_run as run
          where run.id = attempt.endless_run_id
            and run.user_id = ${user.id}
            and run.status = 'active'
            and run.next_puzzle_number = attempt.puzzle_number
            and run.verified_streak < ${MAX_LEADERBOARD_STREAK}
        )
      returning attempt.endless_run_id, attempt.puzzle_number
    ),
    advanced_run as (
      update leaderboard_endless_run as run
      set
        verified_streak = run.verified_streak + 1,
        next_puzzle_number = run.next_puzzle_number + 1,
        updated_at = now()
      from completed
      where run.id = completed.endless_run_id
        and run.next_puzzle_number = completed.puzzle_number
      returning run.id, run.user_id, run.verified_streak
    ),
    saved_streak as (
      insert into endless_streak_leaderboard (
        run_id, user_id, difficulty, streak_count
      )
      select id, user_id, 'endless', verified_streak
      from advanced_run
      on conflict (run_id) do update set
        streak_count = excluded.streak_count,
        updated_at = now()
      returning streak_count
    )
    select streak_count from saved_streak
  `);

  if (!rows[0]) {
    return Response.json(
      { error: "This attempt is no longer active or exceeded its limit." },
      { status: 409 },
    );
  }

  return Response.json({
    moves: replay.moves,
    streakCount: Number(rows[0].streak_count),
  });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    return await completeAttempt(request, context);
  } catch (error) {
    return leaderboardApiError(error);
  }
}
