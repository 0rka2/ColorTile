export const COSMETIC_SLOTS = [
  "tile-style",
  "board-theme",
  "confetti-style",
] as const;

export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];

export const COSMETIC_IDS = [
  "classic-tiles",
  "gem-tiles",
  "classic-board",
  "ocean-board",
  "rainbow-confetti",
  "starburst-confetti",
] as const;

export type CosmeticId = (typeof COSMETIC_IDS)[number];

export type CosmeticDefinition = {
  description: string;
  id: CosmeticId;
  label: string;
  price: number;
  slot: CosmeticSlot;
};

export type CosmeticLoadout = Record<CosmeticSlot, CosmeticId>;

export type ShopState = {
  balance: number;
  equipped: CosmeticLoadout;
  ownedItemIds: CosmeticId[];
};

export const DEFAULT_COSMETIC_LOADOUT: CosmeticLoadout = {
  "tile-style": "classic-tiles",
  "board-theme": "classic-board",
  "confetti-style": "rainbow-confetti",
};

export const SHOP_CATALOG: readonly CosmeticDefinition[] = [
  {
    description: "The original softly rounded ColorTile look.",
    id: "classic-tiles",
    label: "Classic Tiles",
    price: 0,
    slot: "tile-style",
  },
  {
    description: "Faceted tiles with a jewel-cut silhouette.",
    id: "gem-tiles",
    label: "Gem Tiles",
    price: 300,
    slot: "tile-style",
  },
  {
    description: "The clean original board frame.",
    id: "classic-board",
    label: "Classic Board",
    price: 0,
    slot: "board-theme",
  },
  {
    description: "A deep aqua frame with a soft ocean glow.",
    id: "ocean-board",
    label: "Ocean Board",
    price: 600,
    slot: "board-theme",
  },
  {
    description: "ColorTile's original rainbow celebration.",
    id: "rainbow-confetti",
    label: "Rainbow Confetti",
    price: 0,
    slot: "confetti-style",
  },
  {
    description: "A bright shower of colorful stars.",
    id: "starburst-confetti",
    label: "Starburst Confetti",
    price: 400,
    slot: "confetti-style",
  },
] as const;

const CATALOG_BY_ID = new Map(SHOP_CATALOG.map((item) => [item.id, item]));
const COSMETIC_SLOT_SET = new Set<string>(COSMETIC_SLOTS);

export function getCosmeticDefinition(value: unknown) {
  return typeof value === "string" ? CATALOG_BY_ID.get(value as CosmeticId) : undefined;
}

export function isCosmeticId(value: unknown): value is CosmeticId {
  return getCosmeticDefinition(value) !== undefined;
}

export function isCosmeticSlot(value: unknown): value is CosmeticSlot {
  return typeof value === "string" && COSMETIC_SLOT_SET.has(value);
}

export function isFreeCosmetic(itemId: CosmeticId) {
  return getCosmeticDefinition(itemId)?.price === 0;
}

export function normalizeCosmeticLoadout(
  value: Partial<Record<CosmeticSlot, unknown>> | null | undefined,
): CosmeticLoadout {
  const loadout = { ...DEFAULT_COSMETIC_LOADOUT };

  for (const slot of COSMETIC_SLOTS) {
    const item = getCosmeticDefinition(value?.[slot]);
    if (item?.slot === slot) {
      loadout[slot] = item.id;
    }
  }

  return loadout;
}
