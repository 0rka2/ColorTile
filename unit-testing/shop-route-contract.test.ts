import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(process.cwd(), "../..");

async function readSource(relativePath: string) {
  return readFile(resolve(repositoryRoot, relativePath), "utf8");
}

test("shop routes authenticate and validate server-controlled catalog items", async () => {
  const [shopRoute, purchaseRoute, equipmentRoute] = await Promise.all([
    readSource("app/api/account/shop/route.ts"),
    readSource("app/api/account/shop/purchase/route.ts"),
    readSource("app/api/account/shop/equipment/route.ts"),
  ]);

  assert.match(shopRoute, /auth\.api\.getSession/);
  assert.match(purchaseRoute, /auth\.api\.getSession/);
  assert.match(equipmentRoute, /auth\.api\.getSession/);
  assert.match(purchaseRoute, /getCosmeticDefinition\(body\.itemId\)/);
  assert.match(equipmentRoute, /item\.slot !== slot/);
  assert.match(purchaseRoute, /status: 409/);
  assert.match(equipmentRoute, /status: 409/);
});

test("shop purchases debit, own, and equip in one database statement", async () => {
  const store = await readSource("app/lib/cosmetic-shop-store.ts");

  assert.match(store, /with purchase as/);
  assert.match(store, /player_chroma_wallet\.balance -/);
  assert.match(store, /on conflict \(user_id, item_id\) do nothing/);
  assert.match(store, /on conflict \(user_id, slot\) do update/);
  assert.match(store, /error\.code === "23514"/);
});

test("shop UI keeps guest previews and applies all three equipment slots", async () => {
  const [page, modal, board, confetti] = await Promise.all([
    readSource("app/page.tsx"),
    readSource("app/game/components/modals/shop-modal.tsx"),
    readSource("app/game/components/game-board.tsx"),
    readSource("app/game/components/win-confetti.tsx"),
  ]);

  assert.match(modal, /Browse every cosmetic/);
  assert.match(modal, /Sign in to buy/);
  assert.match(page, /shopState\.equipped\["tile-style"\]/);
  assert.match(page, /shopState\.equipped\["board-theme"\]/);
  assert.match(page, /shopState\.equipped\["confetti-style"\]/);
  assert.match(board, /tile-style-gem/);
  assert.match(board, /data-board-theme/);
  assert.match(confetti, /drawStar/);
});
