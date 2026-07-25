import "server-only";

import { getSql } from "./db";
import {
  EMPTY_PLAYER_PROGRESS,
  mergePlayerProgress,
  normalizePlayerProgress,
  type PlayerProgress,
} from "../game/player-progress";

type ProgressRow = {
  best_stats: unknown;
  daily_record: unknown;
  endless_stats: unknown;
};

const MAX_SAVE_ATTEMPTS = 5;

async function getPlayerProgressRow(userId: string) {
  const sql = getSql();
  const rows = await sql`
    select best_stats, daily_record, endless_stats
    from player_progress
    where user_id = ${userId}
    limit 1
  `;

  return (rows as unknown as ProgressRow[])[0] ?? null;
}

function normalizeProgressRow(row: ProgressRow | null) {
  if (!row) {
    return EMPTY_PLAYER_PROGRESS;
  }

  return normalizePlayerProgress({
    bestStats: row.best_stats,
    dailyRecord: row.daily_record,
    endlessStats: row.endless_stats,
  });
}

export async function getPlayerProgress(userId: string): Promise<PlayerProgress> {
  return normalizeProgressRow(await getPlayerProgressRow(userId));
}

export async function mergeAndSavePlayerProgress(
  userId: string,
  incomingValue: unknown,
): Promise<PlayerProgress> {
  const sql = getSql();

  for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt += 1) {
    const currentRow = await getPlayerProgressRow(userId);
    const merged = mergePlayerProgress(
      normalizeProgressRow(currentRow),
      incomingValue,
    );
    const savedRows = currentRow
      ? await sql`
          update player_progress
          set
            best_stats = ${JSON.stringify(merged.bestStats)}::jsonb,
            daily_record = ${JSON.stringify(merged.dailyRecord)}::jsonb,
            endless_stats = ${JSON.stringify(merged.endlessStats)}::jsonb,
            updated_at = clock_timestamp()
          where user_id = ${userId}
            and best_stats = ${JSON.stringify(currentRow.best_stats)}::jsonb
            and daily_record is not distinct from ${
              currentRow.daily_record === null
                ? null
                : JSON.stringify(currentRow.daily_record)
            }::jsonb
            and endless_stats = ${JSON.stringify(currentRow.endless_stats)}::jsonb
          returning user_id
        `
      : await sql`
          insert into player_progress (
            user_id,
            best_stats,
            daily_record,
            endless_stats,
            updated_at
          )
          values (
            ${userId},
            ${JSON.stringify(merged.bestStats)}::jsonb,
            ${JSON.stringify(merged.dailyRecord)}::jsonb,
            ${JSON.stringify(merged.endlessStats)}::jsonb,
            clock_timestamp()
          )
          on conflict (user_id) do nothing
          returning user_id
        `;

    if (Array.isArray(savedRows) && savedRows.length > 0) {
      return merged;
    }
  }

  throw new Error("Player progress changed too frequently to save safely.");
}
