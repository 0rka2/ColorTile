import { getDailyPuzzleDateKey } from "@/app/game/game-logic";
import {
  canUseLeaderboardCategory,
  isDailyLeaderboardDateKey,
  isLeaderboardCategory,
  isLeaderboardDifficulty,
} from "@/app/game/leaderboard";
import { getSql } from "@/app/lib/db";

function leaderboardUnavailable(error: unknown) {
  console.error("Leaderboard database request failed.", error);
  return Response.json(
    { error: "Leaderboard is temporarily unavailable." },
    { status: 503 },
  );
}

async function getLeaderboard(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty");
  const dateKey = searchParams.get("dateKey");

  if (!isLeaderboardCategory(category)) {
    return Response.json({ error: "Invalid leaderboard query." }, { status: 400 });
  }

  const sql = getSql();

  if (category === "daily") {
    if (
      !isDailyLeaderboardDateKey(dateKey) ||
      dateKey !== getDailyPuzzleDateKey()
    ) {
      return Response.json(
        { error: "Invalid daily leaderboard date." },
        { status: 400 },
      );
    }

    const rows = await sql`
      with personal_scores as (
        select
          score.id,
          account.name as player_name,
          score.date_key,
          score.style,
          score.moves,
          score.solve_time,
          score.created_at,
          row_number() over (
            partition by score.user_id
            order by score.solve_time asc, score.moves asc, score.created_at asc
          ) as personal_rank
        from daily_leaderboard as score
        join "user" as account on account.id = score.user_id
        where score.date_key = ${dateKey}
      )
      select id, player_name, date_key, style, moves, solve_time, created_at
      from personal_scores
      where personal_rank = 1
      order by solve_time asc, moves asc, created_at asc
      limit 10
    `;

    return Response.json(rows);
  }

  if (
    !isLeaderboardDifficulty(difficulty) ||
    !canUseLeaderboardCategory(category, difficulty)
  ) {
    return Response.json({ error: "Invalid leaderboard query." }, { status: 400 });
  }

  if (category === "streaks") {
    const rows = await sql`
      with personal_scores as (
        select
          score.id,
          account.name as player_name,
          score.difficulty,
          score.streak_count,
          score.created_at,
          row_number() over (
            partition by score.user_id
            order by score.streak_count desc, score.created_at asc
          ) as personal_rank
        from endless_streak_leaderboard as score
        join "user" as account on account.id = score.user_id
        where score.difficulty = ${difficulty}
      )
      select id, player_name, difficulty, streak_count, created_at
      from personal_scores
      where personal_rank = 1
      order by streak_count desc, created_at asc
      limit 10
    `;

    return Response.json(rows);
  }

  const rows =
    category === "moves"
      ? await sql`
          with personal_scores as (
            select
              score.id,
              account.name as player_name,
              score.difficulty,
              score.moves,
              score.solve_time,
              score.created_at,
              row_number() over (
                partition by score.user_id
                order by score.moves asc, score.solve_time asc, score.created_at asc
              ) as personal_rank
            from leaderboard as score
            join "user" as account on account.id = score.user_id
            where score.difficulty = ${difficulty}
          )
          select id, player_name, difficulty, moves, solve_time, created_at
          from personal_scores
          where personal_rank = 1
          order by moves asc, solve_time asc, created_at asc
          limit 10
        `
      : await sql`
          with personal_scores as (
            select
              score.id,
              account.name as player_name,
              score.difficulty,
              score.moves,
              score.solve_time,
              score.created_at,
              row_number() over (
                partition by score.user_id
                order by score.solve_time asc, score.moves asc, score.created_at asc
              ) as personal_rank
            from leaderboard as score
            join "user" as account on account.id = score.user_id
            where score.difficulty = ${difficulty}
          )
          select id, player_name, difficulty, moves, solve_time, created_at
          from personal_scores
          where personal_rank = 1
          order by solve_time asc, moves asc, created_at asc
          limit 10
        `;

  return Response.json(rows);
}

export async function GET(request: Request) {
  try {
    return await getLeaderboard(request);
  } catch (error) {
    return leaderboardUnavailable(error);
  }
}

export function POST() {
  return Response.json(
    { error: "Direct score submissions are no longer accepted." },
    { status: 405, headers: { Allow: "GET" } },
  );
}
