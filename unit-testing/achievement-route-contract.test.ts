import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const route = readFileSync(
  resolve("../../app/api/account/achievements/route.ts"),
  "utf8",
);
const store = readFileSync(
  resolve("../../app/lib/achievement-store.ts"),
  "utf8",
);
const migration = readFileSync(
  resolve("../../migrations/003-player-achievements.sql"),
  "utf8",
);
const achievementCollection = readFileSync(
  resolve("../../app/account/components/achievement-collection.tsx"),
  "utf8",
);

test("achievement events require an authenticated account", () => {
  assert.match(route, /if \(!session\)/);
  assert.match(route, /Sign in is required\./);
});

test("achievement event retries are idempotent", () => {
  assert.match(
    migration,
    /primary key \(user_id, event_id\)/,
  );
  assert.match(
    store,
    /on conflict \(user_id, event_id\) do nothing/,
  );
});

test("locked achievement cards reveal their requirements in grayscale", () => {
  const lockedBranch =
    achievementCollection.match(
      /if \(!unlockedAt\) \{([\s\S]*?)\n\s+\}\n\n\s+return/,
    )?.[1] ?? "";

  assert.match(lockedBranch, /grayscale/);
  assert.match(lockedBranch, /achievement\.title/);
  assert.match(lockedBranch, /achievement\.description/);
  assert.match(lockedBranch, /achievement\.badgePath/);
  assert.doesNotMatch(lockedBranch, /LOCKED_ACHIEVEMENT_BADGE_PATH/);
});
