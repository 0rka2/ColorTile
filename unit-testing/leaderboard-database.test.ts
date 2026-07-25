import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { Client, type QueryResult, type QueryResultRow } from "pg";

const databaseUrl = process.env.TEST_DATABASE_URL;
const repositoryRoot = resolve(process.cwd(), "../..");

async function queryInSchema<Row extends QueryResultRow = QueryResultRow>(
  client: Client,
  schema: string,
  text: string,
  values?: unknown[],
): Promise<QueryResult<Row>> {
  await client.query("begin");

  try {
    await client.query(`set local search_path to ${schema}`);
    const result = await client.query<Row>(text, values);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

test(
  "verified leaderboard database lifecycle and ranking contracts",
  { skip: databaseUrl ? false : "Set TEST_DATABASE_URL to run database tests." },
  async () => {
    assert.ok(databaseUrl);

    const schema = `colortile_test_${randomBytes(8).toString("hex")}`;
    const clients = [new Client({ connectionString: databaseUrl }), new Client({ connectionString: databaseUrl })];
    let schemaCreated = false;

    try {
      await Promise.all(clients.map((client) => client.connect()));
      await clients[0].query(`create schema ${schema}`);
      schemaCreated = true;

      await queryInSchema(clients[0], schema, `
        create table "user" (
          id text primary key,
          name text not null
        )
      `);
      const migration = await readFile(
        resolve(repositoryRoot, "migrations/002-verified-leaderboards.sql"),
        "utf8",
      );
      await queryInSchema(clients[0], schema, migration);
      await queryInSchema(clients[0], schema, `
        insert into "user" (id, name)
        values ('user-1', 'One'), ('user-2', 'Two')
      `);

      const concurrentRuns = await Promise.allSettled([
        queryInSchema(clients[0], schema, `
          insert into leaderboard_endless_run (id, user_id)
          values ('run-1', 'user-1')
        `),
        queryInSchema(clients[1], schema, `
          insert into leaderboard_endless_run (id, user_id)
          values ('run-2', 'user-1')
        `),
      ]);
      assert.equal(
        concurrentRuns.filter((result) => result.status === "fulfilled").length,
        1,
      );
      assert.equal(
        concurrentRuns.filter((result) => result.status === "rejected").length,
        1,
      );

      await queryInSchema(clients[0], schema, `
        insert into leaderboard_attempt (
          id, user_id, kind, difficulty, style, seed, size, expires_at
        ) values
          ('attempt-active', 'user-1', 'preset', 'easy', 'color', 'seed-a', 3, now() + interval '1 hour'),
          ('attempt-expired', 'user-1', 'preset', 'easy', 'color', 'seed-b', 3, now() - interval '1 hour')
      `);

      const wrongOwnerStart = await queryInSchema(clients[0], schema, `
        update leaderboard_attempt
        set status = 'started', started_at = now()
        where id = 'attempt-active'
          and user_id = 'user-2'
          and status = 'prepared'
          and expires_at > now()
      `);
      assert.equal(wrongOwnerStart.rowCount, 0);

      const firstStart = await queryInSchema(clients[0], schema, `
        update leaderboard_attempt
        set status = 'started', started_at = now()
        where id = 'attempt-active'
          and user_id = 'user-1'
          and status = 'prepared'
          and expires_at > now()
      `);
      const repeatedStart = await queryInSchema(clients[0], schema, `
        update leaderboard_attempt
        set status = 'started', started_at = now()
        where id = 'attempt-active'
          and user_id = 'user-1'
          and status = 'prepared'
          and expires_at > now()
      `);
      const expiredStart = await queryInSchema(clients[0], schema, `
        update leaderboard_attempt
        set status = 'started', started_at = now()
        where id = 'attempt-expired'
          and user_id = 'user-1'
          and status = 'prepared'
          and expires_at > now()
      `);
      assert.equal(firstStart.rowCount, 1);
      assert.equal(repeatedStart.rowCount, 0);
      assert.equal(expiredStart.rowCount, 0);

      const firstCompletion = await queryInSchema(clients[0], schema, `
        update leaderboard_attempt
        set status = 'completed', completed_at = now()
        where id = 'attempt-active'
          and user_id = 'user-1'
          and status = 'started'
          and expires_at > now()
      `);
      const repeatedCompletion = await queryInSchema(clients[1], schema, `
        update leaderboard_attempt
        set status = 'completed', completed_at = now()
        where id = 'attempt-active'
          and user_id = 'user-1'
          and status = 'started'
          and expires_at > now()
      `);
      assert.equal(firstCompletion.rowCount, 1);
      assert.equal(repeatedCompletion.rowCount, 0);

      await queryInSchema(clients[0], schema, `
        insert into leaderboard (attempt_id, user_id, difficulty, moves, solve_time)
        values ('attempt-active', 'user-1', 'easy', 10, 20)
      `);
      await queryInSchema(clients[0], schema, `delete from leaderboard_attempt where id = 'attempt-active'`);
      const retainedScore = await queryInSchema(clients[0], schema, `
        select attempt_id from leaderboard where user_id = 'user-1'
      `);
      assert.equal(retainedScore.rows[0].attempt_id, null);

      await queryInSchema(clients[0], schema, `
        insert into leaderboard (user_id, difficulty, moves, solve_time)
        values
          ('user-1', 'easy', 20, 10),
          ('user-2', 'easy', 12, 12)
      `);
      const fastest = await queryInSchema(clients[0], schema, `
        select distinct on (user_id) user_id, moves, solve_time
        from leaderboard
        where difficulty = 'easy'
        order by user_id, solve_time, moves
      `);
      const fewestMoves = await queryInSchema(clients[0], schema, `
        select distinct on (user_id) user_id, moves, solve_time
        from leaderboard
        where difficulty = 'easy'
        order by user_id, moves, solve_time
      `);
      assert.deepEqual(
        fastest.rows.find((row) => row.user_id === "user-1"),
        { user_id: "user-1", moves: 20, solve_time: 10 },
      );
      assert.deepEqual(
        fewestMoves.rows.find((row) => row.user_id === "user-1"),
        { user_id: "user-1", moves: 10, solve_time: 20 },
      );

      const activeRun = await queryInSchema(clients[0], schema, `
        select id from leaderboard_endless_run where user_id = 'user-1'
      `);
      await queryInSchema(
        clients[0],
        schema,
        `insert into endless_streak_leaderboard (run_id, user_id, streak_count) values ($1, 'user-1', 1)`,
        [activeRun.rows[0].id],
      );
      await queryInSchema(clients[0], schema, `delete from "user" where id = 'user-1'`);

      for (const table of [
        "leaderboard_attempt",
        "leaderboard_endless_run",
        "leaderboard",
        "endless_streak_leaderboard",
      ]) {
        const rows = await queryInSchema(
          clients[0],
          schema,
          `select count(*)::integer as count from ${table} where user_id = 'user-1'`,
        );
        assert.equal(rows.rows[0].count, 0);
      }
    } finally {
      if (schemaCreated && /^colortile_test_[a-f0-9]{16}$/.test(schema)) {
        await clients[0].query(`drop schema ${schema} cascade`);
      }
      await Promise.allSettled(clients.map((client) => client.end()));
    }
  },
);
