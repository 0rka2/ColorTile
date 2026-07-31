import assert from "node:assert/strict";
import test from "node:test";

import {
  COSMETIC_SLOTS,
  DEFAULT_COSMETIC_LOADOUT,
  SHOP_CATALOG,
  getCosmeticDefinition,
  isCosmeticId,
  isCosmeticSlot,
  normalizeCosmeticLoadout,
} from "../app/game/shop-catalog";

test("the starter shop catalog exposes stable defaults and prices", () => {
  assert.deepEqual(COSMETIC_SLOTS, [
    "tile-style",
    "board-theme",
    "background-style",
    "swap-effect",
    "completion-effect",
  ]);
  assert.deepEqual(DEFAULT_COSMETIC_LOADOUT, {
    "tile-style": "classic-tiles",
    "board-theme": "classic-board",
    "background-style": "classic-background",
    "swap-effect": "no-swap-effect",
    "completion-effect": "classic-completion",
  });
  assert.equal(getCosmeticDefinition("gem-tiles")?.price, 300);
  assert.equal(getCosmeticDefinition("ocean-board")?.price, 600);
  assert.equal(SHOP_CATALOG.filter((item) => item.price === 0).length, 5);
  assert.equal(SHOP_CATALOG.filter((item) => item.price > 0).length, 19);
});

test("expanded cosmetics use their category prices", () => {
  const expectedPrices = {
    "frosted-glass-tiles": 350,
    "marble-tiles": 350,
    "chrome-tiles": 350,
    "jelly-tiles": 350,
    "rainbow-swap-trail": 500,
    "comet-swap-trail": 500,
    "electric-swap-arc": 500,
    "board-wave-completion": 550,
    "color-explosion-completion": 550,
    "neon-board": 600,
    "pastel-board": 600,
    "forest-board": 600,
    "candy-board": 600,
    "aurora-background": 500,
    "starfield-background": 500,
    "clouds-background": 500,
    "retro-grid-background": 500,
  } as const;

  for (const [itemId, price] of Object.entries(expectedPrices)) {
    assert.equal(getCosmeticDefinition(itemId)?.price, price);
  }
});

test("cosmetic identifiers and slots reject unknown values", () => {
  assert.equal(isCosmeticId("gem-tiles"), true);
  assert.equal(isCosmeticId("unknown"), false);
  assert.equal(isCosmeticSlot("board-theme"), true);
  assert.equal(isCosmeticSlot("profile-border"), false);
});

test("loadouts preserve valid same-slot items and fall back safely", () => {
  assert.deepEqual(
    normalizeCosmeticLoadout({
      "tile-style": "gem-tiles",
      "board-theme": "removed-cosmetic",
    }),
    {
      "tile-style": "gem-tiles",
      "board-theme": "classic-board",
      "background-style": "classic-background",
      "swap-effect": "no-swap-effect",
      "completion-effect": "classic-completion",
    },
  );
});
