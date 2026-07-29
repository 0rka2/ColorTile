import "server-only";

import { getSql } from "./db";
import { readQueryRows } from "./verified-leaderboard";

export async function getChromaBalance(userId: string) {
  const sql = getSql();
  const rows = readQueryRows(await sql`
    select balance
    from player_chroma_wallet
    where user_id = ${userId}
    limit 1
  `);

  return rows[0] ? Number(rows[0].balance) : 0;
}
