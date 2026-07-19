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

export async function getPlayerProgress(userId: string): Promise<PlayerProgress> {
  const sql = getSql();
  const rows = await sql`
    select best_stats, daily_record, endless_stats
    from player_progress
    where user_id = ${userId}
    limit 1
  `;
  const [row] = rows as unknown as ProgressRow[];

  if (!row) {
    return EMPTY_PLAYER_PROGRESS;
  }

  return normalizePlayerProgress({
    bestStats: row.best_stats,
    dailyRecord: row.daily_record,
    endlessStats: row.endless_stats,
  });
}

export async function mergeAndSavePlayerProgress(
  userId: string,
  incomingValue: unknown,
): Promise<PlayerProgress> {
  const current = await getPlayerProgress(userId);
  const merged = mergePlayerProgress(current, incomingValue);
  const sql = getSql();

  await sql`
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
      now()
    )
    on conflict (user_id) do update set
      best_stats = excluded.best_stats,
      daily_record = excluded.daily_record,
      endless_stats = excluded.endless_stats,
      updated_at = now()
  `;

  return merged;
}
