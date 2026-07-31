import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(process.cwd(), "../..");

async function readSource(relativePath: string) {
  return readFile(resolve(repositoryRoot, relativePath), "utf8");
}

test("shop routes authenticate and validate server-controlled catalog items", async () => {
  const [shopRoute, purchaseRoute, equipmentRoute, devUnlockRoute] = await Promise.all([
    readSource("app/api/account/shop/route.ts"),
    readSource("app/api/account/shop/purchase/route.ts"),
    readSource("app/api/account/shop/equipment/route.ts"),
    readSource("app/api/account/shop/dev-unlock/route.ts"),
  ]);

  assert.match(shopRoute, /auth\.api\.getSession/);
  assert.match(purchaseRoute, /auth\.api\.getSession/);
  assert.match(equipmentRoute, /auth\.api\.getSession/);
  assert.match(devUnlockRoute, /process\.env\.NODE_ENV !== "development"/);
  assert.match(devUnlockRoute, /status: 404/);
  assert.match(devUnlockRoute, /auth\.api\.getSession/);
  assert.match(devUnlockRoute, /getCosmeticDefinition\(body\.itemId\)/);
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

test("development unlocks grant and equip without debiting Chroma", async () => {
  const store = await readSource("app/lib/cosmetic-shop-store.ts");
  const devUnlock = store.slice(
    store.indexOf("export async function devUnlockAndEquipCosmetic"),
    store.indexOf("export async function equipCosmetic"),
  );

  assert.match(devUnlock, /purchase_price[\s\S]*0/);
  assert.match(devUnlock, /on conflict \(user_id, item_id\) do nothing/);
  assert.match(devUnlock, /on conflict \(user_id, slot\) do update/);
  assert.doesNotMatch(devUnlock, /player_chroma_wallet/);
});

test("removed cosmetic categories are cleaned from stored player data", async () => {
  const migration = await readSource(
    "migrations/007-remove-correct-confetti-cosmetics.sql",
  );

  assert.match(migration, /delete from player_cosmetic_loadout/);
  assert.match(migration, /delete from player_cosmetic_ownership/);
  assert.match(migration, /'correct-tile-effect'/);
  assert.match(migration, /'confetti-style'/);
  assert.match(migration, /'starburst-confetti'/);
});

test("Light Sweep is cleaned from stored player data", async () => {
  const migration = await readSource(
    "migrations/008-remove-light-sweep-cosmetic.sql",
  );

  assert.match(migration, /delete from player_cosmetic_loadout/);
  assert.match(migration, /delete from player_cosmetic_ownership/);
  assert.match(migration, /'light-sweep-completion'/);
});

test("shop UI applies the supported cosmetic loadouts", async () => {
  const [
    page,
    modal,
    shopHook,
    board,
    confetti,
    swapOverlay,
    starfield,
    clouds,
    styles,
  ] = await Promise.all([
    readSource("app/page.tsx"),
    readSource("app/game/components/modals/shop-modal.tsx"),
    readSource("app/game/hooks/use-shop-cosmetics.ts"),
    readSource("app/game/components/game-board.tsx"),
    readSource("app/game/components/win-confetti.tsx"),
    readSource("app/game/components/swap-effect-overlay.tsx"),
    readSource("app/game/components/starfield-twinkles.tsx"),
    readSource("app/game/components/floating-clouds.tsx"),
    readSource("app/globals.css"),
  ]);

  assert.match(modal, /Browse every cosmetic/);
  assert.match(modal, /Sign in to buy/);
  assert.match(page, /shopState\.equipped\["tile-style"\]/);
  assert.match(page, /shopState\.equipped\["board-theme"\]/);
  assert.match(page, /shopState\.equipped\["background-style"\]/);
  assert.match(page, /shopState\.equipped\["swap-effect"\]/);
  assert.match(page, /shopState\.equipped\["completion-effect"\]/);
  assert.match(modal, /item\.price > 0/);
  assert.match(modal, /Purchased/);
  assert.match(modal, /process\.env\.NODE_ENV === "development"/);
  assert.match(modal, /Dev unlock/);
  assert.match(page, /onDevUnlock=\{devUnlockCosmetic\}/);
  assert.match(shopHook, /\/api\/account\/shop\/dev-unlock/);
  assert.match(board, /data-board-theme/);
  assert.match(board, /data-game-board-effects/);
  assert.match(board, /getColorExplosionTileMotion/);
  assert.match(swapOverlay, /no-swap-effect/);
  assert.doesNotMatch(swapOverlay, /useReducedMotion/);
  assert.match(swapOverlay, /swap-effect-line/);
  assert.match(swapOverlay, /Math\.atan2\(deltaY, deltaX\)/);
  assert.match(swapOverlay, /boardEffectsLayer/);
  assert.doesNotMatch(confetti, /confettiStyle|drawStar/);
  assert.match(confetti, /colors=\{/);
  assert.match(starfield, /MIN_STAR_DURATION_SECONDS = 4/);
  assert.match(starfield, /MAX_STAR_DURATION_SECONDS = 45/);
  assert.match(starfield, /animationDuration/);
  assert.match(styles, /@keyframes starfield-star-twinkle/);
  assert.match(clouds, /CLOUD_COUNT = 12/);
  assert.match(clouds, /animationDuration/);
  assert.match(styles, /@keyframes floating-cloud-drift/);
  assert.match(styles, /@keyframes shop-preview-color-explosion-tile/);
  assert.match(styles, /@keyframes game-swap-trail/);
  assert.match(styles, /--header-bg:/);
  assert.match(styles, /\.game-logo \.gradient-text\s*\{\s*background: transparent/);
  assert.match(
    styles,
    /html\[data-theme="dark"\] \.game-logo \.gradient-text\s*\{\s*background: transparent/,
  );

  for (const background of [
    "aurora-background",
    "starfield-background",
    "clouds-background",
    "retro-grid-background",
  ]) {
    assert.doesNotMatch(
      styles,
      new RegExp(
        `html\\[data-theme="dark"\\][\\s\\S]{0,180}data-page-background="${background}"`,
      ),
    );
  }

  for (const board of [
    "ocean-board",
    "neon-board",
    "pastel-board",
    "forest-board",
    "candy-board",
  ]) {
    assert.doesNotMatch(
      styles,
      new RegExp(
        `html\\[data-theme="dark"\\] \\.theme-board-frame\\[data-board-theme="${board}"\\]`,
      ),
    );
    assert.doesNotMatch(
      styles,
      new RegExp(
        `html\\[data-theme="dark"\\] \\.shop-preview-board\\[data-preview-board-theme="${board}"\\]`,
      ),
    );
  }
});
