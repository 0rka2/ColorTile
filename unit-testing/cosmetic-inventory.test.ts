import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(process.cwd(), "../..");

async function readSource(relativePath: string) {
  return readFile(resolve(repositoryRoot, relativePath), "utf8");
}

test("the account inventory lists owned cosmetics and manages equipment", async () => {
  const [dashboard, inventory, preview, shopModal] = await Promise.all([
    readSource("app/account/components/account-dashboard.tsx"),
    readSource("app/account/components/cosmetic-inventory.tsx"),
    readSource("app/game/components/cosmetic-preview.tsx"),
    readSource("app/game/components/modals/shop-modal.tsx"),
  ]);

  assert.match(dashboard, /\["inventory", "Inventory"\]/);
  assert.match(dashboard, /<CosmeticInventory userId=\{userId\}/);
  assert.match(inventory, /useShopCosmetics\(userId\)/);
  assert.match(inventory, /item\.price === 0 \|\| ownedItemIds\.has\(item\.id\)/);
  assert.match(inventory, /DEFAULT_COSMETIC_LOADOUT\[slot\]/);
  assert.match(inventory, /actionLabel = "Unequip"/);
  assert.match(inventory, /await equip\(slot, itemId\)/);
  assert.match(preview, /export function CosmeticPreview/);
  assert.match(shopModal, /import \{ CosmeticPreview \}/);
  assert.match(shopModal, /aria-label="Shop sections"/);
  assert.match(shopModal, />\s*Inventory\s*</);
  assert.match(
    shopModal,
    /item\.price === 0 \|\| shopState\.ownedItemIds\.includes\(item\.id\)/,
  );
  assert.match(shopModal, /DEFAULT_COSMETIC_LOADOUT\[item\.slot\]/);
});
