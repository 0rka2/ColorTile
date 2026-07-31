export const COSMETIC_SLOTS = [
  "tile-style",
  "board-theme",
  "background-style",
  "swap-effect",
  "completion-effect",
] as const;

export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];

export const COSMETIC_IDS = [
  "classic-tiles",
  "gem-tiles",
  "frosted-glass-tiles",
  "marble-tiles",
  "chrome-tiles",
  "jelly-tiles",
  "classic-board",
  "ocean-board",
  "neon-board",
  "pastel-board",
  "forest-board",
  "candy-board",
  "classic-background",
  "aurora-background",
  "starfield-background",
  "clouds-background",
  "retro-grid-background",
  "no-swap-effect",
  "rainbow-swap-trail",
  "comet-swap-trail",
  "electric-swap-arc",
  "classic-completion",
  "board-wave-completion",
  "color-explosion-completion",
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
  "background-style": "classic-background",
  "swap-effect": "no-swap-effect",
  "completion-effect": "classic-completion",
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
    description: "Soft translucent tiles with a misted glass finish.",
    id: "frosted-glass-tiles",
    label: "Frosted Glass",
    price: 350,
    slot: "tile-style",
  },
  {
    description: "Polished stone tiles traced with subtle natural veins.",
    id: "marble-tiles",
    label: "Marble",
    price: 350,
    slot: "tile-style",
  },
  {
    description: "Reflective metallic tiles with sweeping highlights.",
    id: "chrome-tiles",
    label: "Chrome",
    price: 350,
    slot: "tile-style",
  },
  {
    description: "Juicy translucent tiles with a soft inner glow.",
    id: "jelly-tiles",
    label: "Jelly",
    price: 350,
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
    description: "Electric cyan and magenta with a vivid arcade glow.",
    id: "neon-board",
    label: "Neon",
    price: 600,
    slot: "board-theme",
  },
  {
    description: "A calm blend of powder blue, lilac, and blush.",
    id: "pastel-board",
    label: "Pastel",
    price: 600,
    slot: "board-theme",
  },
  {
    description: "Layered greens with a quiet woodland glow.",
    id: "forest-board",
    label: "Forest",
    price: 600,
    slot: "board-theme",
  },
  {
    description: "Bright candy colors with a playful glossy frame.",
    id: "candy-board",
    label: "Candy",
    price: 600,
    slot: "board-theme",
  },
  {
    description: "The original clean ColorTile page background.",
    id: "classic-background",
    label: "Classic Background",
    price: 0,
    slot: "background-style",
  },
  {
    description: "Slow ribbons of cyan, violet, and emerald light.",
    id: "aurora-background",
    label: "Aurora Sky",
    price: 500,
    slot: "background-style",
  },
  {
    description: "A deep, quiet sky scattered with tiny stars.",
    id: "starfield-background",
    label: "Starfield",
    price: 500,
    slot: "background-style",
  },
  {
    description: "Soft clouds drifting through a bright blue sky.",
    id: "clouds-background",
    label: "Floating Clouds",
    price: 500,
    slot: "background-style",
  },
  {
    description: "A playful glowing grid inspired by classic arcades.",
    id: "retro-grid-background",
    label: "Retro Grid",
    price: 500,
    slot: "background-style",
  },
  {
    description: "No additional visual trail after a swap.",
    id: "no-swap-effect",
    label: "No Swap Effect",
    price: 0,
    slot: "swap-effect",
  },
  {
    description: "A bright spectrum streak connects swapped tiles.",
    id: "rainbow-swap-trail",
    label: "Rainbow Trail",
    price: 500,
    slot: "swap-effect",
  },
  {
    description: "A glowing comet races along the completed swap.",
    id: "comet-swap-trail",
    label: "Comet Trail",
    price: 500,
    slot: "swap-effect",
  },
  {
    description: "A sharp electric bolt flashes between swapped tiles.",
    id: "electric-swap-arc",
    label: "Electric Arc",
    price: 500,
    slot: "swap-effect",
  },
  {
    description: "The subtle original completion response.",
    id: "classic-completion",
    label: "Classic Completion",
    price: 0,
    slot: "completion-effect",
  },
  {
    description: "A stronger tile wave rolls across the solved board.",
    id: "board-wave-completion",
    label: "Board Wave",
    price: 550,
    slot: "completion-effect",
  },
  {
    description: "Expanding rings of color burst from the board center.",
    id: "color-explosion-completion",
    label: "Color Explosion",
    price: 550,
    slot: "completion-effect",
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
