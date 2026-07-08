import { getSql } from "@/app/lib/db";

const LEADERBOARD_CATEGORIES = ["fastest", "moves", "streaks"] as const;
const LEADERBOARD_DIFFICULTIES = ["normal", "hard", "expert", "extreme", "endless"] as const;

type LeaderboardCategory = (typeof LEADERBOARD_CATEGORIES)[number];
type LeaderboardDifficulty = (typeof LEADERBOARD_DIFFICULTIES)[number];

function isLeaderboardCategory(value: string | null): value is LeaderboardCategory {
  return value !== null && LEADERBOARD_CATEGORIES.includes(value as LeaderboardCategory);
}

function isLeaderboardDifficulty(value: string | null): value is LeaderboardDifficulty {
  return value !== null && LEADERBOARD_DIFFICULTIES.includes(value as LeaderboardDifficulty);
}

async function ensureLeaderboardTable() {
  const sql = getSql();

  await sql`
    create table if not exists leaderboard (
      id bigint generated always as identity primary key,
      player_name text not null,
      difficulty text not null,
      moves integer not null check (moves > 0),
      solve_time double precision not null check (solve_time > 0),
      created_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists endless_streak_leaderboard (
      id bigint generated always as identity primary key,
      player_name text not null,
      difficulty text not null,
      streak_count integer not null check (streak_count > 0),
      created_at timestamptz not null default now()
    )
  `;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category");
  const difficultyParam = searchParams.get("difficulty");

  if (!isLeaderboardCategory(categoryParam) || !isLeaderboardDifficulty(difficultyParam)) {
    return Response.json(
      { error: "Invalid leaderboard query." },
      { status: 400 },
    );
  }

  if (categoryParam === "streaks" && difficultyParam !== "endless") {
    return Response.json(
      { error: "Best streaks is only available for endless mode." },
      { status: 400 },
    );
  }

  if (categoryParam !== "streaks" && difficultyParam === "endless") {
    return Response.json(
      { error: "This leaderboard category is not available for endless mode." },
      { status: 400 },
    );
  }

  await ensureLeaderboardTable();
  const sql = getSql();

  if (categoryParam === "streaks") {
    const rows = await sql`
      select id, player_name, difficulty, streak_count, created_at
      from endless_streak_leaderboard
      where difficulty = ${difficultyParam}
      order by streak_count desc, created_at asc
      limit 10
    `;

    return Response.json(rows);
  }

  const rows =
    categoryParam === "moves"
      ? await sql`
          select id, player_name, difficulty, moves, solve_time, created_at
          from leaderboard
          where difficulty = ${difficultyParam}
          order by moves asc, solve_time asc, created_at asc
          limit 10
        `
      : await sql`
          select id, player_name, difficulty, moves, solve_time, created_at
          from leaderboard
          where difficulty = ${difficultyParam}
          order by solve_time asc, moves asc, created_at asc
          limit 10
        `;

  return Response.json(rows);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<{
    category: string;
    difficulty: string;
    moves: number;
    playerName: string;
    solveTime: number;
    streakCount: number;
  }>;

  if (!isLeaderboardDifficulty(body.difficulty ?? null)) {
    return Response.json({ error: "Invalid difficulty." }, { status: 400 });
  }

  const playerName = body.playerName?.trim();
  const moves = body.moves;
  const solveTime = body.solveTime;

  if (!playerName || playerName.length > 24) {
    return Response.json({ error: "Player name is required." }, { status: 400 });
  }

  if (body.category === "streaks") {
    const streakCount = body.streakCount;

    if (body.difficulty !== "endless") {
      return Response.json({ error: "Best streaks must use endless difficulty." }, { status: 400 });
    }

    if (typeof streakCount !== "number" || !Number.isInteger(streakCount) || streakCount <= 0) {
      return Response.json({ error: "Streak count must be a positive integer." }, { status: 400 });
    }

    await ensureLeaderboardTable();
    const sql = getSql();
    await sql`
      insert into endless_streak_leaderboard (player_name, difficulty, streak_count)
      values (${playerName}, ${body.difficulty}, ${streakCount})
    `;

    return Response.json({ ok: true }, { status: 201 });
  }

  if (typeof moves !== "number" || !Number.isInteger(moves) || moves <= 0) {
    return Response.json({ error: "Moves must be a positive integer." }, { status: 400 });
  }

  if (typeof solveTime !== "number" || !Number.isFinite(solveTime) || solveTime <= 0) {
    return Response.json({ error: "Solve time must be a positive number." }, { status: 400 });
  }

  await ensureLeaderboardTable();
  const sql = getSql();
  await sql`
    insert into leaderboard (player_name, difficulty, moves, solve_time)
    values (${playerName}, ${body.difficulty}, ${moves}, ${solveTime})
  `;

  return Response.json({ ok: true }, { status: 201 });
}
