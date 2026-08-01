import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolve } from "node:path";

const repositoryRoot = resolve(process.cwd(), "../..");

async function readSource(relativePath: string) {
  return readFile(resolve(repositoryRoot, relativePath), "utf8");
}

test("attempt creation withholds puzzle data until the attempt starts", async () => {
  const createRoute = await readSource("app/api/leaderboard/attempts/route.ts");
  const startRoute = await readSource(
    "app/api/leaderboard/attempts/[id]/start/route.ts",
  );
  const creationResponse = createRoute.slice(
    createRoute.indexOf("function attemptResponse"),
    createRoute.indexOf("async function startCreatedAttempt"),
  );

  assert.match(
    creationResponse,
    /attemptId: String\(row\.id\)/,
  );
  assert.doesNotMatch(creationResponse, /\b(seed|puzzle)\b/);
  assert.match(startRoute, /puzzle: readVerifiedPuzzle\(rows\[0\]\)/);
  assert.match(startRoute, /startedAt: String\(rows\[0\]\.authoritative_started_at\)/);
});

test("the game creates and starts verified attempts in one request", async () => {
  const page = await readSource("app/page.tsx");
  const client = await readSource("app/game/verified-leaderboard-client.ts");
  const createRoute = await readSource("app/api/leaderboard/attempts/route.ts");

  assert.match(page, /createAndStartVerifiedAttempt/);
  assert.doesNotMatch(page, /\bstartVerifiedAttempt\b/);
  assert.match(client, /JSON\.stringify\(\{ \.\.\.input, start: true \}\)/);
  assert.match(createRoute, /body\.start === true/);
  assert.match(createRoute, /set status = 'started', started_at = now\(\)/);
});

test("attempt routes enforce ownership and one-time state transitions", async () => {
  const startRoute = await readSource(
    "app/api/leaderboard/attempts/[id]/start/route.ts",
  );
  const completeRoute = await readSource(
    "app/api/leaderboard/attempts/[id]/complete/route.ts",
  );

  for (const source of [startRoute, completeRoute]) {
    assert.match(source, /user_id = \$\{user\.id\}/);
    assert.match(source, /expires_at > now\(\)/);
  }

  assert.match(startRoute, /status = 'prepared'/);
  assert.match(completeRoute, /attempt\.status = 'started'/);
  assert.match(completeRoute, /set\s+status = 'completed'/);
});

test("leaderboard GET handling contains no database mutations", async () => {
  const route = await readSource("app/api/leaderboard/route.ts");
  const getHandler = route.slice(
    route.indexOf("async function getLeaderboard"),
    route.indexOf("export async function GET"),
  );

  assert.doesNotMatch(getHandler, /\b(insert|update|delete|alter|drop)\b/i);
  assert.match(getHandler, /join "user" as account/);
  assert.match(getHandler, /partition by score\.user_id/);
});

test("attempt creation applies the account and address rate limiter", async () => {
  const route = await readSource("app/api/leaderboard/attempts/route.ts");

  assert.match(route, /consumeAttemptRateLimit\(request, user\.id\)/);
});

test("attempt completion is rate limited before replay validation", async () => {
  const route = await readSource(
    "app/api/leaderboard/attempts/[id]/complete/route.ts",
  );
  const rateLimitIndex = route.indexOf('"complete"');
  const activeAttemptIndex = route.indexOf("attempt.is_active !== true");
  const replayValidationIndex = route.indexOf(
    "normalizeVerifiedSwaps(body.swaps)",
  );

  assert.notEqual(rateLimitIndex, -1);
  assert.ok(replayValidationIndex > rateLimitIndex);
  assert.ok(activeAttemptIndex > replayValidationIndex);
});

test("completed score submissions return their stored result", async () => {
  const route = await readSource(
    "app/api/leaderboard/attempts/[id]/complete/route.ts",
  );
  const completedResultIndex = route.indexOf(
    "readCompletedAttemptResult",
    route.indexOf("async function completeAttempt"),
  );
  const activeAttemptIndex = route.indexOf("attempt.is_active !== true");

  assert.match(route, /attempt\.status === "completed"/);
  assert.ok(completedResultIndex > 0);
  assert.ok(completedResultIndex < activeAttemptIndex);
  assert.match(route, /score\.attempt_id = \$\{attemptId\}/);
  assert.match(route, /recordVerifiedAchievementCompletion/);
  assert.match(route, /newlyUnlocked/);
});

test("local completion starts before the background score response", async () => {
  const page = await readSource("app/page.tsx");
  const completionFlow = page.slice(
    page.indexOf("const verificationUserId"),
    page.indexOf("void verifiedCompletion.then") + 100,
  );
  const localAwardIndex = completionFlow.indexOf("awardDailyClear()");
  const responseHandlerIndex = completionFlow.indexOf(
    "void verifiedCompletion.then",
  );

  assert.ok(localAwardIndex >= 0);
  assert.ok(responseHandlerIndex > localAwardIndex);
  assert.doesNotMatch(
    completionFlow,
    /status: "(verified|unverified|unranked)"/,
  );
});

test("verified daily and endless countdowns include the start preview allowance", async () => {
  const createRoute = await readSource("app/api/leaderboard/attempts/route.ts");
  const completeRoute = await readSource(
    "app/api/leaderboard/attempts/[id]/complete/route.ts",
  );
  const deadlineChecks = completeRoute.match(
    /attempt\.time_limit_seconds \+ \$\{GAME_START_PREVIEW_SECONDS\}/g,
  );

  assert.match(createRoute, /timeLimitSeconds: definition\.timeLimitSeconds/);
  assert.equal(deadlineChecks?.length, 2);
});

test("production startup validates every required service setting", async () => {
  const environmentGuard = await readSource("app/lib/server-env.ts");

  for (const variableName of [
    "BETTER_AUTH_SECRET",
    "DATABASE_URL",
  ]) {
    assert.match(environmentGuard, new RegExp(`"${variableName}"`));
  }

  assert.match(environmentGuard, /process\.env\.NODE_ENV !== "production"/);
  assert.match(environmentGuard, /throw new Error/);

  for (const entryPoint of ["app/layout.tsx", "app/lib/auth.ts", "app/lib/db.ts"]) {
    const source = await readSource(entryPoint);
    assert.match(source, /assertServerEnvironment\(\)/);
  }
});
