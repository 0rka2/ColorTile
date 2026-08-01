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
const milestoneMigration = readFileSync(
  resolve("../../migrations/004-achievement-milestones.sql"),
  "utf8",
);
const achievementHook = readFileSync(
  resolve("../../app/game/hooks/use-account-achievements.ts"),
  "utf8",
);
const gamePage = readFileSync(
  resolve("../../app/page.tsx"),
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

test("client-authored achievement submissions are rejected", () => {
  assert.match(route, /export function POST\(\)/);
  assert.match(route, /status: 405/);
  assert.match(route, /verified game completions/);
  assert.doesNotMatch(route, /recordAchievementEvent/);
});

test("achievement announcements are cleared and owned by the active account", () => {
  assert.match(achievementHook, /clearAnnouncements\(\);/);
  assert.match(achievementHook, /setAnnouncements\(\[\]\);/);
  assert.match(
    achievementHook,
    /currentAnnouncement\?\.userId === userId/,
  );
  assert.match(
    gamePage,
    /<AchievementToast\s+key=\{session\?\.user\.id \?\? "guest"\}/,
  );
});

test("verified completions record idempotent swap batches on the server", () => {
  assert.match(store, /attempt\.verified_moves/);
  assert.match(
    store,
    /completion\.kind === "endless" &&\s+completion\.verified_moves === null/,
  );
  assert.match(store, /verified:\$\{attemptId\}:swaps:\$\{batchIndex\}/);
  assert.match(store, /jsonb_to_recordset/);
  assert.match(store, /on conflict \(user_id, event_id\) do nothing/);
});

test("achievement summaries reconcile unlocks with one bulk insert", () => {
  assert.match(
    store,
    /await unlockEligibleAchievements\(\s*userId,\s*getEligibleAchievementIds\(progress\)/,
  );
  assert.match(store, /jsonb_array_elements_text/);
  assert.doesNotMatch(store, /for \(const achievementId of eligibleIds\)/);
});

test("milestone migration backfills UTC play dates and stores swap batches", () => {
  assert.match(
    milestoneMigration,
    /created_at at time zone 'UTC'/,
  );
  assert.match(milestoneMigration, /swap_count integer/);
  assert.match(milestoneMigration, /kind = 'swap'/);
  assert.match(milestoneMigration, /played_date is not null/);
  assert.match(milestoneMigration, /solve_time is not null/);
  assert.match(milestoneMigration, /endless_streak is not null/);
  assert.match(milestoneMigration, /swap_count is not null/);
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
