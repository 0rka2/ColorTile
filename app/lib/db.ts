import { neon } from "@neondatabase/serverless";

import { assertServerEnvironment } from "./server-env";

assertServerEnvironment();

let sqlClient: ReturnType<typeof neon> | null = null;

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  if (sqlClient) {
    return sqlClient;
  }

  sqlClient = neon(databaseUrl);
  return sqlClient;
}
