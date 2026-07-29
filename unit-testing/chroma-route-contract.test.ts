import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(process.cwd(), "../..");

async function readSource(relativePath: string) {
  return readFile(resolve(repositoryRoot, relativePath), "utf8");
}

test("verified completions award Chroma through idempotent server claims", async () => {
  const route = await readSource(
    "app/api/leaderboard/attempts/[id]/complete/route.ts",
  );

  assert.match(route, /insert into chroma_reward_claim/g);
  assert.match(route, /insert into player_chroma_wallet/g);
  assert.match(route, /player_chroma_wallet\.balance \+ excluded\.balance/g);
  assert.match(route, /'preset:' \|\| id/);
  assert.match(route, /'daily:' \|\| date_key/);
  assert.match(route, /'endless:' \|\| puzzle_number/);
  assert.equal(route.match(/chroma: readChromaReward\(rows\[0\]\)/g)?.length, 3);
});

test("Chroma completion effects respect reduced-motion preferences", async () => {
  const card = await readSource(
    "app/game/components/chroma-reward-card.tsx",
  );
  const styles = await readSource("app/globals.css");

  assert.match(card, /useReducedMotion\(\)/);
  assert.match(card, /wasAwarded &&\s+!reduceMotion/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /\.chroma-reward-shimmer/);
});

test("the authenticated header loads and refreshes its Chroma counter", async () => {
  const route = await readSource("app/api/account/chroma/route.ts");
  const header = await readSource("app/game/components/header.tsx");
  const counterIndex = header.indexOf("chroma-counter");
  const profileIndex = header.indexOf('href="/account"');

  assert.match(route, /auth\.api\.getSession/);
  assert.match(route, /getChromaBalance\(session\.user\.id\)/);
  assert.match(header, /fetch\("\/api\/account\/chroma"/);
  assert.match(header, /CHROMA_BALANCE_UPDATED_EVENT/);
  assert.ok(counterIndex >= 0);
  assert.ok(profileIndex > counterIndex);
  assert.match(header, /sm:hidden/);
  assert.match(header, /formatChromaBalance\(chromaBalance, true\)/);
});
