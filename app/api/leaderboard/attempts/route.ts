import { randomUUID } from "node:crypto";

import {
  getDailyPuzzleDefinition,
  getDailyPuzzleDateKey,
  getEndlessPuzzleDefinition,
  getGameModeConfig,
  getModeStyle,
  isPresetMode,
} from "@/app/game/game-logic";
import {
  isDailyLeaderboardDateKey,
  isLeaderboardDifficulty,
} from "@/app/game/leaderboard";
import type {
  PresetModeKey,
} from "@/app/game/game-types";
import type {
  VerifiedAttemptKind,
  VerifiedPuzzle,
} from "@/app/game/verified-attempt";
import { getSql } from "@/app/lib/db";
import {
  ATTEMPT_EXPIRY_HOURS,
  consumeAttemptRateLimit,
  getLeaderboardUser,
  leaderboardApiError,
  readQueryRows,
} from "@/app/lib/verified-leaderboard";

type CreateAttemptBody = {
  dateKey?: string;
  difficulty?: string;
  endlessRunId?: string;
  kind?: VerifiedAttemptKind;
};

function unauthorized() {
  return Response.json(
    { error: "Sign in is required for verified leaderboard attempts." },
    { status: 401 },
  );
}

async function createEndlessRun(userId: string) {
  const sql = getSql();
  const runId = randomUUID();
  let rows: Record<string, unknown>[];

  try {
    rows = readQueryRows(await sql`
      with ended_runs as (
        update leaderboard_endless_run
        set status = 'ended', updated_at = now()
        where user_id = ${userId} and status = 'active'
      )
      insert into leaderboard_endless_run (id, user_id)
      values (${runId}, ${userId})
      returning id, next_puzzle_number
    `);
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "23505"
    ) {
      throw error;
    }

    const activeRows = readQueryRows(await sql`
      select id, next_puzzle_number
      from leaderboard_endless_run
      where user_id = ${userId} and status = 'active'
      limit 1
    `);

    if (!activeRows[0]) {
      throw error;
    }

    return activeRows[0] as Record<string, unknown>;
  }

  return rows[0] as Record<string, unknown>;
}

async function getEndlessRun(userId: string, runId: string) {
  const sql = getSql();
  const rows = readQueryRows(await sql`
    select id, next_puzzle_number
    from leaderboard_endless_run
    where id = ${runId} and user_id = ${userId} and status = 'active'
    limit 1
  `);

  return (rows[0] as Record<string, unknown> | undefined) ?? null;
}

async function insertAttempt(
  userId: string,
  puzzle: VerifiedPuzzle,
) {
  const sql = getSql();
  const attemptId = randomUUID();
  const rows = readQueryRows(await sql`
    insert into leaderboard_attempt (
      id,
      user_id,
      kind,
      difficulty,
      date_key,
      style,
      seed,
      size,
      puzzle_type,
      puzzle_number,
      endless_run_id,
      swap_budget,
      time_limit_seconds,
      expires_at
    ) values (
      ${attemptId},
      ${userId},
      ${puzzle.kind},
      ${puzzle.difficulty},
      ${puzzle.dateKey},
      ${puzzle.style},
      ${puzzle.seed},
      ${puzzle.size},
      ${puzzle.puzzleType},
      ${puzzle.puzzleNumber},
      ${puzzle.endlessRunId},
      ${puzzle.swapBudget},
      ${puzzle.timeLimitSeconds},
      now() + (${ATTEMPT_EXPIRY_HOURS} * interval '1 hour')
    )
    on conflict (endless_run_id, puzzle_number)
      where endless_run_id is not null
      do nothing
    returning *, expires_at::text
  `);

  if (rows[0]) {
    return rows[0] as Record<string, unknown>;
  }

  if (!puzzle.endlessRunId || puzzle.puzzleNumber === null) {
    throw new Error("A non-endless attempt unexpectedly conflicted.");
  }

  const existingRows = readQueryRows(await sql`
    select *, expires_at::text
    from leaderboard_attempt
    where endless_run_id = ${puzzle.endlessRunId}
      and puzzle_number = ${puzzle.puzzleNumber}
      and user_id = ${userId}
    limit 1
  `);

  if (!existingRows[0]) {
    throw new Error("The endless attempt could not be created.");
  }

  return existingRows[0] as Record<string, unknown>;
}

function attemptResponse(row: Record<string, unknown>) {
  return Response.json(
    {
      attemptId: String(row.id),
      expiresAt: String(row.expires_at),
    },
    { status: 201 },
  );
}

async function createAttempt(request: Request) {
  const user = await getLeaderboardUser(request);
  if (!user) {
    return unauthorized();
  }

  let body: CreateAttemptBody;
  try {
    body = (await request.json()) as CreateAttemptBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.kind !== "preset" && body.kind !== "daily" && body.kind !== "endless") {
    return Response.json({ error: "Invalid attempt kind." }, { status: 400 });
  }

  const rateLimitResponse = await consumeAttemptRateLimit(request, user.id);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (body.kind === "preset") {
    const requestedDifficulty = body.difficulty ?? null;
    if (
      !isLeaderboardDifficulty(requestedDifficulty) ||
      !isPresetMode(requestedDifficulty)
    ) {
      return Response.json({ error: "Invalid preset difficulty." }, { status: 400 });
    }

    const difficulty = requestedDifficulty as PresetModeKey;
    const config = getGameModeConfig(difficulty);
    const row = await insertAttempt(user.id, {
      dateKey: null,
      difficulty,
      endlessRunId: null,
      kind: "preset",
      puzzleNumber: null,
      puzzleType: null,
      seed: randomUUID(),
      size: config.size,
      style: getModeStyle(difficulty),
      swapBudget: null,
      timeLimitSeconds: null,
    });

    return attemptResponse(row);
  }

  if (body.kind === "daily") {
    const currentDateKey = getDailyPuzzleDateKey();
    if (
      !isDailyLeaderboardDateKey(body.dateKey ?? null) ||
      body.dateKey !== currentDateKey
    ) {
      return Response.json({ error: "Invalid daily puzzle date." }, { status: 400 });
    }

    const definition = getDailyPuzzleDefinition(currentDateKey);
    const row = await insertAttempt(user.id, {
      dateKey: currentDateKey,
      difficulty: definition.difficulty,
      endlessRunId: null,
      kind: "daily",
      puzzleNumber: null,
      puzzleType: definition.type,
      seed: `${currentDateKey}:board`,
      size: definition.size,
      style: definition.style,
      swapBudget: definition.swapBudget,
      timeLimitSeconds: definition.timeLimitSeconds,
    });

    return attemptResponse(row);
  }

  if (body.kind === "endless") {
    const run = body.endlessRunId
      ? await getEndlessRun(user.id, body.endlessRunId)
      : await createEndlessRun(user.id);

    if (!run) {
      return Response.json({ error: "The endless run is no longer active." }, { status: 409 });
    }

    const runId = String(run.id);
    const puzzleNumber = Number(run.next_puzzle_number);
    const definition = getEndlessPuzzleDefinition(puzzleNumber);
    const seed = randomUUID();
    const row = await insertAttempt(user.id, {
      dateKey: null,
      difficulty: "endless",
      endlessRunId: runId,
      kind: "endless",
      puzzleNumber,
      puzzleType: definition.type,
      seed,
      size: definition.size,
      style: definition.style,
      swapBudget: definition.swapBudget,
      timeLimitSeconds: definition.timeLimitSeconds,
    });

    return attemptResponse(row);
  }

  return Response.json({ error: "Invalid attempt kind." }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    return await createAttempt(request);
  } catch (error) {
    return leaderboardApiError(error);
  }
}
