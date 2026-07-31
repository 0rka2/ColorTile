"use client";

import { useState } from "react";

import { CosmeticPreview } from "@/app/game/components/cosmetic-preview";
import { useShopCosmetics } from "@/app/game/hooks/use-shop-cosmetics";
import {
  COSMETIC_SLOTS,
  DEFAULT_COSMETIC_LOADOUT,
  SHOP_CATALOG,
  type CosmeticId,
  type CosmeticSlot,
} from "@/app/game/shop-catalog";

const SLOT_LABELS: Record<CosmeticSlot, string> = {
  "tile-style": "Tiles",
  "board-theme": "Boards",
  "background-style": "Backgrounds",
  "swap-effect": "Swap effects",
  "completion-effect": "Completion effects",
};

type CosmeticInventoryProps = {
  userId: string;
};

export function CosmeticInventory({
  userId,
}: Readonly<CosmeticInventoryProps>) {
  const {
    equip,
    error,
    isLoading,
    retry,
    shopState,
  } = useShopCosmetics(userId);
  const [updatingSlot, setUpdatingSlot] = useState<CosmeticSlot | null>(null);
  const ownedItemIds = new Set<CosmeticId>(shopState.ownedItemIds);

  async function updateEquipment(
    slot: CosmeticSlot,
    itemId: CosmeticId,
  ) {
    setUpdatingSlot(slot);
    try {
      await equip(slot, itemId);
    } finally {
      setUpdatingSlot(null);
    }
  }

  if (isLoading) {
    return (
      <div
        className="theme-card rounded-[1.5rem] border p-8 text-center"
        role="status"
      >
        <p className="theme-text-muted text-base">Loading your inventory...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="theme-text-primary font-fredoka-display text-3xl">
          Cosmetic inventory
        </h2>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-500"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={retry}
            className="font-fredoka-strong shrink-0 underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="space-y-8">
        {COSMETIC_SLOTS.map((slot) => {
          const items = SHOP_CATALOG.filter(
            (item) =>
              item.slot === slot &&
              (item.price === 0 || ownedItemIds.has(item.id)),
          );

          return (
            <section key={slot} aria-labelledby={`inventory-${slot}`}>
              <h3
                id={`inventory-${slot}`}
                className="theme-text-primary font-fredoka-display mb-3 text-2xl"
              >
                {SLOT_LABELS[slot]}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((item) => {
                  const isDefault =
                    DEFAULT_COSMETIC_LOADOUT[slot] === item.id;
                  const isEquipped = shopState.equipped[slot] === item.id;
                  const isUpdating = updatingSlot === slot;

                  let actionLabel = "Equip";
                  let actionItemId = item.id;
                  if (isEquipped && isDefault) {
                    actionLabel = "Equipped";
                  } else if (isEquipped) {
                    actionLabel = "Unequip";
                    actionItemId = DEFAULT_COSMETIC_LOADOUT[slot];
                  }

                  return (
                    <article
                      key={item.id}
                      className={`theme-card overflow-hidden rounded-[1.25rem] border ${
                        isEquipped ? "shop-item-equipped" : ""
                      }`}
                    >
                      <CosmeticPreview item={item} />
                      <div className="p-4">
                        <h4 className="theme-text-primary font-fredoka-display text-xl">
                          {item.label}
                        </h4>
                        <p className="theme-text-muted mt-1 text-sm leading-5">
                          {item.description}
                        </p>
                        <button
                          type="button"
                          disabled={
                            updatingSlot !== null ||
                            (isEquipped && isDefault)
                          }
                          onClick={() =>
                            void updateEquipment(slot, actionItemId)
                          }
                          className={`font-fredoka-strong mt-4 flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm disabled:cursor-not-allowed ${
                            isEquipped
                              ? "theme-button-secondary"
                              : "theme-button-primary"
                          } disabled:opacity-60`}
                        >
                          {isUpdating ? "Updating..." : actionLabel}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
