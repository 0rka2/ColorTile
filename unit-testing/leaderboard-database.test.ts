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

async function claimChromaReward(
  client: Client,
  schema: string,
  {
    amount,
    attemptId,
    rewardKey,
    sourceKind,
  }: {
    amount: number;
    attemptId: string;
    rewardKey: string;
    sourceKind: "preset" | "daily" | "endless";
  },
) {
  return queryInSchema<{ awarded: number; balance: number }>(
    client,
    schema,
    `
      with reward_claim as (
        insert into chroma_reward_claim (
          user_id,
          reward_key,
          attempt_id,
          source_kind,
          amount
        )
        values ('user-1', $1, $2, $3, $4)
        on conflict do nothing
        returning user_id, amount
      ),
      updated_wallet as (
        insert into player_chroma_wallet (user_id, balance, updated_at)
        select user_id, amount, now()
        from reward_claim
        on conflict (user_id) do update set
          balance = player_chroma_wallet.balance + excluded.balance,
          updated_at = now()
        returning balance
      )
      select
        coalesce((select amount from reward_claim), 0)::integer as awarded,
        coalesce(
          (select balance from updated_wallet),
          (select balance from player_chroma_wallet where user_id = 'user-1'),
          0
        )::integer as balance
    `,
    [rewardKey, attemptId, sourceKind, amount],
  );
}

async function purchaseCosmetic(
  client: Client,
  schema: string,
  {
    itemId,
    price,
    slot,
  }: {
    itemId: string;
    price: number;
    slot: string;
  },
) {
  return queryInSchema<{ balance: number; purchased: boolean }>(
    client,
    schema,
    `
      with purchase as (
        insert into player_cosmetic_ownership (
          user_id, item_id, purchase_price
        )
        select 'user-1', $1, $2
        where exists (
          select 1
          from player_chroma_wallet
          where user_id = 'user-1' and balance >= $2
        )
        on conflict (user_id, item_id) do nothing
        returning item_id
      ),
      debit as (
        update player_chroma_wallet
        set balance = player_chroma_wallet.balance - $2
        where user_id = 'user-1'
          and exists (select 1 from purchase)
        returning balance
      ),
      equip as (
        insert into player_cosmetic_loadout (user_id, slot, item_id)
        select 'user-1', $3, $1
        from debit
        on conflict (user_id, slot) do update
        set item_id = excluded.item_id, updated_at = now()
      )
      select
        exists (select 1 from purchase) as purchased,
        coalesce(
          (select balance from debit),
          (select balance from player_chroma_wallet where user_id = 'user-1'),
          0
        )::integer as balance
    `,
    [itemId, price, slot],
  );
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
      const chromaMigration = await readFile(
        resolve(repositoryRoot, "migrations/005-chroma-rewards.sql"),
        "utf8",
      );
      await queryInSchema(clients[0], schema, chromaMigration);
      const cosmeticShopMigration = await readFile(
        resolve(repositoryRoot, "migrations/006-cosmetic-shop.sql"),
        "utf8",
      );
      await queryInSchema(clients[0], schema, cosmeticShopMigration);
      await queryInSchema(clients[0], schema, `
        insert into "user" (id, name)
        values ('user-1', 'One'), ('user-2', 'Two')
      `);

      await queryInSchema(clients[0], schema, `
        insert into leaderboard_attempt (
          id, user_id, kind, difficulty, date_key, style, seed, size,
          puzzle_number, endless_run_id, expires_at
        ) values
          ('reward-preset-1', 'user-1', 'preset', 'normal', null, 'color', 'p-1', 3, null, null, now() + interval '1 hour'),
          ('reward-preset-2', 'user-1', 'preset', 'hard', null, 'color', 'p-2', 4, null, null, now() + interval '1 hour'),
          ('reward-daily-1', 'user-1', 'daily', 'normal', '2026-07-29', 'color', 'd-1', 3, null, null, now() + interval '1 hour'),
          ('reward-daily-2', 'user-1', 'daily', 'normal', '2026-07-29', 'color', 'd-2', 3, null, null, now() + interval '1 hour'),
          ('reward-endless-1', 'user-1', 'preset', 'normal', null, 'color', 'e-1', 3, null, null, now() + interval '1 hour'),
          ('reward-endless-2', 'user-1', 'preset', 'normal', null, 'color', 'e-2', 3, null, null, now() + interval '1 hour'),
          ('reward-endless-next', 'user-1', 'preset', 'normal', null, 'color', 'e-3', 3, null, null, now() + interval '1 hour')
      `);

      const firstPresetReward = await claimChromaReward(clients[0], schema, {
        amount: 25,
        attemptId: "reward-preset-1",
        rewardKey: "preset:reward-preset-1",
        sourceKind: "preset",
      });
      const secondPresetReward = await claimChromaReward(clients[0], schema, {
        amount: 30,
        attemptId: "reward-preset-2",
        rewardKey: "preset:reward-preset-2",
        sourceKind: "preset",
      });
      assert.deepEqual(firstPresetReward.rows[0], { awarded: 25, balance: 25 });
      assert.deepEqual(secondPresetReward.rows[0], { awarded: 30, balance: 55 });

      const concurrentDailyRewards = await Promise.all([
        claimChromaReward(clients[0], schema, {
          amount: 75,
          attemptId: "reward-daily-1",
          rewardKey: "daily:2026-07-29",
          sourceKind: "daily",
        }),
        claimChromaReward(clients[1], schema, {
          amount: 75,
          attemptId: "reward-daily-2",
          rewardKey: "daily:2026-07-29",
          sourceKind: "daily",
        }),
      ]);
      assert.equal(
        concurrentDailyRewards.reduce(
          (total, result) => total + result.rows[0].awarded,
          0,
        ),
        75,
      );

      const firstEndlessReward = await claimChromaReward(clients[0], schema, {
        amount: 30,
        attemptId: "reward-endless-1",
        rewardKey: "endless:1",
        sourceKind: "endless",
      });
      const repeatedEndlessReward = await claimChromaReward(clients[0], schema, {
        amount: 30,
        attemptId: "reward-endless-2",
        rewardKey: "endless:1",
        sourceKind: "endless",
      });
      const nextEndlessReward = await claimChromaReward(clients[0], schema, {
        amount: 30,
        attemptId: "reward-endless-next",
        rewardKey: "endless:2",
        sourceKind: "endless",
      });
      assert.equal(firstEndlessReward.rows[0].awarded, 30);
      assert.equal(repeatedEndlessReward.rows[0].awarded, 0);
      assert.equal(nextEndlessReward.rows[0].awarded, 30);
      assert.equal(nextEndlessReward.rows[0].balance, 190);

      await queryInSchema(clients[0], schema, `
        update player_chroma_wallet
        set balance = 1000
        where user_id = 'user-1'
      `);
      const duplicatePurchases = await Promise.all([
        purchaseCosmetic(clients[0], schema, {
          itemId: "gem-tiles",
          price: 300,
          slot: "tile-style",
        }),
        purchaseCosmetic(clients[1], schema, {
          itemId: "gem-tiles",
          price: 300,
          slot: "tile-style",
        }),
      ]);
      assert.equal(
        duplicatePurchases.filter((result) => result.rows[0].purchased).length,
        1,
      );

      const cosmeticState = await queryInSchema<{
        balance: number;
        equipped_item: string;
        owned_count: number;
      }>(clients[0], schema, `
        select
          (select balance from player_chroma_wallet where user_id = 'user-1')::integer
            as balance,
          (
            select item_id
            from player_cosmetic_loadout
            where user_id = 'user-1' and slot = 'tile-style'
          ) as equipped_item,
          (
            select count(*)::integer
            from player_cosmetic_ownership
            where user_id = 'user-1' and item_id = 'gem-tiles'
          ) as owned_count
      `);
      assert.deepEqual(cosmeticState.rows[0], {
        balance: 700,
        equipped_item: "gem-tiles",
        owned_count: 1,
      });

      const insufficientPurchase = await purchaseCosmetic(clients[0], schema, {
        itemId: "ocean-board",
        price: 800,
        slot: "board-theme",
      });
      assert.equal(insufficientPurchase.rows[0].purchased, false);
      assert.equal(insufficientPurchase.rows[0].balance, 700);

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
        "chroma_reward_claim",
        "player_chroma_wallet",
        "player_cosmetic_ownership",
        "player_cosmetic_loadout",
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
