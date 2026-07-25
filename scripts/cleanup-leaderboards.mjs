import process from "node:process";

import { Client } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("begin");
  await client.query(`
    delete from daily_leaderboard
    where date_key < (now() at time zone 'UTC')::date::text
  `);
  await client.query(`
    delete from leaderboard
    where created_at < date_trunc('year', now() at time zone 'UTC') at time zone 'UTC'
  `);
  await client.query(`
    delete from endless_streak_leaderboard
    where created_at < date_trunc('year', now() at time zone 'UTC') at time zone 'UTC'
  `);
  await client.query(`
    delete from leaderboard_attempt as attempt
    where attempt.expires_at < now()
  `);
  await client.query(`
    delete from leaderboard_attempt_rate_limit
    where updated_at < now() - interval '24 hours'
  `);
  await client.query(`
    update leaderboard_endless_run as run
    set status = 'ended', updated_at = now()
    where run.status = 'active'
      and run.updated_at < now() - interval '24 hours'
      and not exists (
        select 1
        from leaderboard_attempt as attempt
        where attempt.endless_run_id = run.id
          and attempt.status in ('prepared', 'started')
          and attempt.expires_at > now()
      )
  `);
  await client.query(`
    delete from leaderboard_endless_run as run
    where run.status = 'ended'
      and run.updated_at < now() - interval '24 hours'
      and not exists (
        select 1
        from endless_streak_leaderboard as score
        where score.run_id = run.id
      )
  `);
  await client.query("commit");
  console.log("Leaderboard maintenance completed.");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
