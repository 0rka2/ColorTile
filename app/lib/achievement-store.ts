import "server-only";

import {
  getBestPlayStreak,
  getEligibleAchievementIds,
  isAchievementId,
  type AchievementEvent,
  type AchievementId,
  type AchievementProgress,
  type AchievementSummary,
} from "@/app/game/achievements";
import type {
  PresetDifficultyKey,
  PresetModeKey,
} from "@/app/game/game-types";
import {
  getEndlessPuzzleDefinition,
  PRESET_MODE_KEYS,
} from "@/app/game/game-logic";

import { getSql } from "./db";

type ProgressRow = {
  best_color_times: unknown;
  best_endless_streak: unknown;
  completed_preset_modes: unknown;
  daily_clears: unknown;
  endless_clears: unknown;
  lifetime_swaps: unknown;
  played_dates: unknown;
  three_star_clears: unknown;
};

type UnlockRow = {
  achievement_id: unknown;
  unlocked_at: unknown;
};

type VerifiedCompletionRow = {
  completed_at: unknown;
  date_key: unknown;
  difficulty: unknown;
  kind: unknown;
  puzzle_number: unknown;
  solve_time: unknown;
  verified_moves: unknown;
};

const COLOR_MODES = new Set<PresetDifficultyKey>([
  "normal",
  "hard",
  "expert",
  "extreme",
]);

function readCount(value: unknown) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : 0;
}

function normalizeProgress(row: ProgressRow): AchievementProgress {
  const completedPresetModes = Array.isArray(row.completed_preset_modes)
    ? row.completed_preset_modes.filter(
        (mode): mode is PresetModeKey => typeof mode === "string",
      )
    : [];
  const bestColorTimes =
    row.best_color_times && typeof row.best_color_times === "object"
      ? Object.entries(row.best_color_times).reduce<
          Partial<Record<PresetDifficultyKey, number>>
        >((times, [mode, value]) => {
          const solveTime = Number(value);
          if (COLOR_MODES.has(mode as PresetDifficultyKey) && solveTime > 0) {
            times[mode as PresetDifficultyKey] = solveTime;
          }
          return times;
        }, {})
      : {};

  return {
    bestColorTimes,
    completedPresetModes,
    dailyClears: readCount(row.daily_clears),
    endlessClears: readCount(row.endless_clears),
    bestEndlessStreak: readCount(row.best_endless_streak),
    threeStarClears: readCount(row.three_star_clears),
    lifetimeSwaps: readCount(row.lifetime_swaps),
    bestPlayStreak: Array.isArray(row.played_dates)
      ? getBestPlayStreak(
          row.played_dates.filter(
            (dateKey): dateKey is string => typeof dateKey === "string",
          ),
        )
      : 0,
  };
}

async function getAchievementProgress(userId: string) {
  const sql = getSql();
  const rows = await sql`
    with preset_times as (
      select preset_mode, min(solve_time) as best_time
      from player_achievement_event
      where user_id = ${userId}
        and kind = 'preset'
      group by preset_mode
    )
    select
      coalesce(
        (
          select array_agg(preset_mode order by preset_mode)
          from preset_times
        ),
        array[]::text[]
      ) as completed_preset_modes,
      coalesce(
        (
          select jsonb_object_agg(preset_mode, best_time)
          from preset_times
          where preset_mode in ('normal', 'hard', 'expert', 'extreme')
        ),
        '{}'::jsonb
      ) as best_color_times,
      count(distinct daily_date) filter (where kind = 'daily') as daily_clears,
      count(*) filter (where kind = 'endless') as endless_clears,
      count(*) filter (
        where kind = 'endless' and is_three_star = true
      ) as three_star_clears,
      coalesce(max(endless_streak) filter (where kind = 'endless'), 0)
        as best_endless_streak,
      coalesce(sum(swap_count) filter (where kind = 'swap'), 0)
        as lifetime_swaps,
      coalesce(
        array_agg(distinct played_date::text order by played_date::text)
          filter (where played_date is not null),
        array[]::text[]
      ) as played_dates
    from player_achievement_event
    where user_id = ${userId}
  `;

  return normalizeProgress((rows as unknown as ProgressRow[])[0]);
}

async function getAchievementUnlocks(userId: string) {
  const sql = getSql();
  const rows = await sql`
    select achievement_id, unlocked_at
    from player_achievement_unlock
    where user_id = ${userId}
    order by unlocked_at desc, achievement_id asc
  `;

  return (rows as unknown as UnlockRow[]).flatMap((row) => {
    if (!isAchievementId(row.achievement_id)) {
      return [];
    }

    const unlockedAt = new Date(String(row.unlocked_at));
    if (Number.isNaN(unlockedAt.getTime())) {
      return [];
    }

    return [
      {
        id: row.achievement_id,
        unlockedAt: unlockedAt.toISOString(),
      },
    ];
  });
}

export async function getAchievementSummary(
  userId: string,
): Promise<AchievementSummary> {
  const progress = await getAchievementProgress(userId);
  await unlockEligibleAchievements(
    userId,
    getEligibleAchievementIds(progress),
  );
  const unlocked = await getAchievementUnlocks(userId);

  return { progress, unlocked };
}

async function insertAchievementEvent(userId: string, event: AchievementEvent) {
  const sql = getSql();

  if (event.kind === "preset") {
    return sql`
      insert into player_achievement_event (
        user_id, event_id, kind, preset_mode, solve_time, played_date
      )
      values (
        ${userId},
        ${event.eventId},
        'preset',
        ${event.mode},
        ${event.solveTime},
        ${event.playedDate}
      )
      on conflict (user_id, event_id) do nothing
      returning event_id
    `;
  }

  if (event.kind === "daily") {
    return sql`
      insert into player_achievement_event (
        user_id, event_id, kind, daily_date, played_date
      )
      values (
        ${userId},
        ${event.eventId},
        'daily',
        ${event.dateKey},
        ${event.playedDate}
      )
      on conflict (user_id, event_id) do nothing
      returning event_id
    `;
  }

  if (event.kind === "endless") {
    return sql`
    insert into player_achievement_event (
      user_id, event_id, kind, is_three_star, endless_streak, played_date
    )
    values (
      ${userId},
      ${event.eventId},
      'endless',
      ${event.isThreeStar},
      ${event.streak},
      ${event.playedDate}
    )
    on conflict (user_id, event_id) do nothing
    returning event_id
    `;
  }

  return sql`
    insert into player_achievement_event (
      user_id, event_id, kind, swap_count
    )
    values (${userId}, ${event.eventId}, 'swap', ${event.count})
    on conflict (user_id, event_id) do nothing
    returning event_id
  `;
}

async function unlockEligibleAchievements(
  userId: string,
  eligibleIds: AchievementId[],
) {
  if (eligibleIds.length === 0) {
    return [];
  }

  const sql = getSql();
  const rows = await sql`
    insert into player_achievement_unlock (user_id, achievement_id)
    select ${userId}, achievement_id
    from jsonb_array_elements_text(
      ${JSON.stringify(eligibleIds)}::jsonb
    ) as eligible (achievement_id)
    on conflict (user_id, achievement_id) do nothing
    returning achievement_id
  `;

  return (rows as unknown as Array<{ achievement_id: unknown }>).flatMap(
    (row) => isAchievementId(row.achievement_id) ? [row.achievement_id] : [],
  );
}

export async function recordVerifiedAchievementCompletion(
  userId: string,
  attemptId: string,
) {
  const sql = getSql();
  const rows = await sql`
    select
      attempt.completed_at::text,
      attempt.date_key,
      attempt.difficulty,
      attempt.kind,
      attempt.puzzle_number,
      attempt.verified_moves,
      coalesce(preset_score.solve_time, daily_score.solve_time) as solve_time
    from leaderboard_attempt as attempt
    left join leaderboard as preset_score
      on preset_score.attempt_id = attempt.id
    left join daily_leaderboard as daily_score
      on daily_score.attempt_id = attempt.id
    where attempt.id = ${attemptId}
      and attempt.user_id = ${userId}
      and attempt.status = 'completed'
    limit 1
  `;
  const completion = (rows as unknown as VerifiedCompletionRow[])[0];

  if (!completion) {
    throw new Error("Verified achievement completion was not found.");
  }

  // Endless attempts completed before verified move storage cannot be
  // reconstructed safely. Preserve their idempotent completion response
  // without creating achievement progress from unknown moves.
  if (
    completion.kind === "endless" &&
    completion.verified_moves === null
  ) {
    return [];
  }

  const completedAt = new Date(String(completion.completed_at));
  const moves = Number(completion.verified_moves);
  if (
    Number.isNaN(completedAt.getTime()) ||
    !Number.isInteger(moves) ||
    moves <= 0
  ) {
    throw new Error("Verified achievement completion is incomplete.");
  }

  const completionEventId = `verified:${attemptId}:completion`;
  const playedDate = completedAt.toISOString().slice(0, 10);

  if (
    completion.kind === "preset" &&
    typeof completion.difficulty === "string" &&
    (PRESET_MODE_KEYS as readonly string[]).includes(completion.difficulty)
  ) {
    const solveTime = Number(completion.solve_time);
    if (!Number.isFinite(solveTime) || solveTime <= 0) {
      throw new Error("Verified preset completion is incomplete.");
    }

    await insertAchievementEvent(userId, {
      eventId: completionEventId,
      kind: "preset",
      mode: completion.difficulty as PresetModeKey,
      playedDate,
      solveTime,
    });
  } else if (
    completion.kind === "daily" &&
    typeof completion.date_key === "string"
  ) {
    await insertAchievementEvent(userId, {
      dateKey: completion.date_key,
      eventId: completionEventId,
      kind: "daily",
      playedDate,
    });
  } else if (completion.kind === "endless") {
    const puzzleNumber = Number(completion.puzzle_number);
    if (!Number.isInteger(puzzleNumber) || puzzleNumber <= 0) {
      throw new Error("Verified endless completion is incomplete.");
    }

    await insertAchievementEvent(userId, {
      eventId: completionEventId,
      isThreeStar:
        moves <= getEndlessPuzzleDefinition(puzzleNumber).threeStarMoveLimit,
      kind: "endless",
      playedDate,
      streak: puzzleNumber,
    });
  } else {
    throw new Error("Verified achievement completion has an invalid kind.");
  }

  const swapBatches = Array.from(
    { length: Math.ceil(moves / 25) },
    (_, batchIndex) => ({
      event_id: `verified:${attemptId}:swaps:${batchIndex}`,
      swap_count: Math.min(25, moves - batchIndex * 25),
    }),
  );

  await sql`
    insert into player_achievement_event (
      user_id, event_id, kind, swap_count
    )
    select ${userId}, batch.event_id, 'swap', batch.swap_count
    from jsonb_to_recordset(${JSON.stringify(swapBatches)}::jsonb)
      as batch (event_id text, swap_count integer)
    on conflict (user_id, event_id) do nothing
  `;

  const progress = await getAchievementProgress(userId);
  return unlockEligibleAchievements(
    userId,
    getEligibleAchievementIds(progress),
  );
}
