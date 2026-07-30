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
    "confetti-style",
  ]);
  assert.deepEqual(DEFAULT_COSMETIC_LOADOUT, {
    "tile-style": "classic-tiles",
    "board-theme": "classic-board",
    "confetti-style": "rainbow-confetti",
  });
  assert.equal(getCosmeticDefinition("gem-tiles")?.price, 300);
  assert.equal(getCosmeticDefinition("ocean-board")?.price, 600);
  assert.equal(getCosmeticDefinition("starburst-confetti")?.price, 400);
  assert.equal(SHOP_CATALOG.filter((item) => item.price === 0).length, 3);
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
      "board-theme": "starburst-confetti",
      "confetti-style": "unknown",
    }),
    {
      "tile-style": "gem-tiles",
      "board-theme": "classic-board",
      "confetti-style": "rainbow-confetti",
    },
  );
});
