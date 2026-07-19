import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

import { Client } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const migrationPath = resolve("migrations/001-player-accounts.sql");
const migration = await readFile(migrationPath, "utf8");

await client.connect();

try {
  await client.query("begin");
  await client.query(migration);
  await client.query("commit");
  console.log("Player account migration completed.");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
