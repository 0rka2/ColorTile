import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

import { Client } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const migrationDirectory = resolve("migrations");
const migrationLockId = 1_128_550_404;
const migrationFiles = (await readdir(migrationDirectory))
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort((first, second) => first.localeCompare(second));

await client.connect();
let migrationLockAcquired = false;

try {
  await client.query("select pg_advisory_lock($1)", [migrationLockId]);
  migrationLockAcquired = true;
  await client.query(`
    create table if not exists schema_migration (
      file_name text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  for (const fileName of migrationFiles) {
    const appliedMigration = await client.query(
      "select 1 from schema_migration where file_name = $1",
      [fileName],
    );

    if (appliedMigration.rowCount) {
      continue;
    }

    const migration = await readFile(resolve(migrationDirectory, fileName), "utf8");
    await client.query("begin");

    try {
      await client.query(migration);
      await client.query(
        "insert into schema_migration (file_name) values ($1)",
        [fileName],
      );
      await client.query("commit");
      console.log(`Applied ${fileName}.`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
} catch (error) {
  throw error;
} finally {
  try {
    if (migrationLockAcquired) {
      await client.query("select pg_advisory_unlock($1)", [migrationLockId]);
    }
  } finally {
    await client.end();
  }
}
