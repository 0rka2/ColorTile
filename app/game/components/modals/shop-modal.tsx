import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

import {
  COSMETIC_SLOTS,
  DEFAULT_COSMETIC_LOADOUT,
  SHOP_CATALOG,
  type CosmeticId,
  type CosmeticSlot,
  type ShopState,
} from "../../shop-catalog";
import { formatChromaBalance } from "../../chroma";
import { ChromaIcon } from "../chroma-icon";
import { CosmeticPreview } from "../cosmetic-preview";

const SLOT_LABELS: Record<CosmeticSlot, string> = {
  "tile-style": "Tiles",
  "board-theme": "Boards",
  "background-style": "Backgrounds",
  "swap-effect": "Swap",
  "completion-effect": "Finish",
};

const SHOP_CATEGORY_SLOTS: readonly CosmeticSlot[] = COSMETIC_SLOTS;

type ShopView = "shop" | "inventory";

type ShopModalProps = {
  busyItemId: CosmeticId | null;
  error: string | null;
  isLoading: boolean;
  isOpen: boolean;
  isSignedIn: boolean;
  onClose: () => void;
  onDevUnlock: (itemId: CosmeticId) => void;
  onEquip: (slot: CosmeticSlot, itemId: CosmeticId) => void;
  onPurchase: (itemId: CosmeticId) => void;
  onRetry: () => void;
  onSignIn: () => void;
  shopState: ShopState;
};

export function ShopModal({
  busyItemId,
  error,
  isLoading,
  isOpen,
  isSignedIn,
  onClose,
  onDevUnlock,
  onEquip,
  onPurchase,
  onRetry,
  onSignIn,
  shopState,
}: Readonly<ShopModalProps>) {
  const [activeView, setActiveView] = useState<ShopView>("shop");
  const [activeSlot, setActiveSlot] = useState<CosmeticSlot>("tile-style");
  const categorySlots = SHOP_CATEGORY_SLOTS;
  const visibleItems = useMemo(
    () => SHOP_CATALOG.filter(
      (item) =>
        item.slot === activeSlot &&
        (activeView === "inventory"
          ? item.price === 0 || shopState.ownedItemIds.includes(item.id)
          : item.price > 0),
    ),
    [activeSlot, activeView, shopState.ownedItemIds],
  );

  function selectView(nextView: ShopView) {
    setActiveView(nextView);
    if (!SHOP_CATEGORY_SLOTS.includes(activeSlot)) {
      setActiveSlot("tile-style");
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <motion.div
      className="theme-overlay fixed inset-0 z-40 flex items-center justify-center p-3 backdrop-blur-sm sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative z-10 flex max-h-full w-full max-w-[60rem] flex-col items-stretch gap-3 sm:flex-row sm:items-start">
        <motion.nav
          aria-label="Shop sections"
          className="theme-modal order-2 grid w-full shrink-0 grid-cols-2 gap-2 rounded-[1.35rem] border p-2 sm:order-1 sm:w-[11.5rem] sm:self-start sm:grid-cols-1 sm:p-3"
          initial={{ opacity: 0, x: -14, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            type="button"
            onClick={() => selectView("shop")}
            aria-current={activeView === "shop" ? "page" : undefined}
            className={`font-fredoka-strong rounded-[1rem] px-4 py-3 text-sm ${
              activeView === "shop"
                ? "theme-button-primary"
                : "theme-button-secondary"
            }`}
          >
            Shop
          </button>
          <button
            type="button"
            onClick={() => selectView("inventory")}
            aria-current={activeView === "inventory" ? "page" : undefined}
            className={`font-fredoka-strong rounded-[1rem] px-4 py-3 text-sm ${
              activeView === "inventory"
                ? "theme-button-primary"
                : "theme-button-secondary"
            }`}
          >
            Inventory
          </button>
        </motion.nav>

        <motion.section
          role="dialog"
          aria-modal="true"
          aria-labelledby="shop-title"
          className="theme-modal order-1 relative flex max-h-[calc(100dvh-6.5rem)] min-h-0 w-full flex-col overflow-hidden rounded-[1.5rem] border sm:order-2 sm:h-[54rem] sm:min-w-0 sm:flex-1 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[1.75rem]"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className="flex shrink-0 items-center justify-between gap-4 px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
            <div>
              <p className="theme-text-muted font-fredoka-strong text-xs uppercase tracking-[0.2em]">
                Cosmetic collection
              </p>
              <h2 id="shop-title" className="theme-text-primary font-fredoka-display mt-1 text-3xl">
                {activeView === "shop" ? "Chroma Shop" : "Your Inventory"}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {isSignedIn ? (
                <div className="theme-chip theme-text-primary font-fredoka-strong flex h-11 items-center gap-2 rounded-full px-4">
                  <ChromaIcon className="h-5 w-5" />
                  {isLoading ? "..." : formatChromaBalance(shopState.balance)}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="theme-button-secondary font-fredoka-strong h-11 rounded-full px-4 text-sm"
                >
                  Sign in
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close shop"
                className="theme-close-button font-fredoka-strong flex h-11 w-11 items-center justify-center rounded-full"
              >
                {"\u00D7"}
              </button>
            </div>
          </header>

          <nav
            aria-label={`${activeView === "shop" ? "Shop" : "Inventory"} categories`}
            className="shop-category-nav shrink-0 touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain border-y border-[var(--border-soft)] px-4 py-3 sm:px-7"
          >
            <div className="shop-category-grid grid gap-2">
              {categorySlots.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  onClick={() => setActiveSlot(slot)}
                  aria-current={activeSlot === slot ? "page" : undefined}
                  className={`font-fredoka-strong min-h-11 rounded-xl px-1 text-xs sm:px-3 sm:text-base ${
                    activeSlot === slot
                      ? "theme-button-primary"
                      : "theme-button-secondary"
                  }`}
                >
                  {SLOT_LABELS[slot]}
                </button>
              ))}
            </div>
          </nav>

          <div className="shop-items-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:overflow-y-scroll sm:p-5">
            {!isSignedIn && (
              <div className="theme-panel-muted theme-text-muted mb-4 rounded-xl border px-4 py-3 text-sm">
                <p>
                  {activeView === "shop"
                    ? "Browse every cosmetic. Sign in to buy and equip items with Chroma."
                    : "Sign in to view and equip the cosmetics in your inventory."}
                </p>
                {activeView === "inventory" && (
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="theme-button-primary mt-3 rounded-full px-4 py-2 font-fredoka-strong text-sm"
                  >
                    Sign in
                  </button>
                )}
              </div>
            )}

            {error && (
              <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-500">
                <span>{error}</span>
                <button type="button" onClick={onRetry} className="font-fredoka-strong shrink-0 underline">
                  Retry
                </button>
              </div>
            )}

            {(activeView === "shop" || isSignedIn) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleItems.map((item) => {
                  const isEquipped = shopState.equipped[item.slot] === item.id;
                  const isOwned =
                    item.price === 0 || shopState.ownedItemIds.includes(item.id);
                  const inventoryActionId =
                    isEquipped && item.id !== DEFAULT_COSMETIC_LOADOUT[item.slot]
                      ? DEFAULT_COSMETIC_LOADOUT[item.slot]
                      : item.id;
                  const actionItemId =
                    activeView === "inventory" ? inventoryActionId : item.id;
                  const isBusy = busyItemId === actionItemId;
                  const cannotAfford =
                    isSignedIn && !isOwned && shopState.balance < item.price;

                  let actionLabel = "Equip";
                  if (activeView === "inventory" && isEquipped) {
                    actionLabel =
                      item.id === DEFAULT_COSMETIC_LOADOUT[item.slot]
                        ? "Equipped"
                        : "Unequip";
                  } else if (isEquipped) {
                    actionLabel = "Equipped";
                  } else if (!isSignedIn) {
                    actionLabel = "Sign in to buy";
                  } else if (!isOwned) {
                    actionLabel = cannotAfford
                      ? `Need ${formatChromaBalance(item.price - shopState.balance)} more`
                      : `Buy for ${formatChromaBalance(item.price)}`;
                  }

                  const actionDisabled =
                    isLoading ||
                    isBusy ||
                    cannotAfford ||
                    (isEquipped &&
                      (activeView === "shop" ||
                        item.id === DEFAULT_COSMETIC_LOADOUT[item.slot]));

                  return (
                    <article
                      key={item.id}
                      className={`theme-card overflow-hidden rounded-[1.25rem] border ${
                        isEquipped ? "shop-item-equipped" : ""
                      }`}
                    >
                      <CosmeticPreview item={item} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="theme-text-primary font-fredoka-display text-xl">
                              {item.label}
                            </h3>
                            <p className="theme-text-muted mt-1 text-sm leading-5">
                              {item.description}
                            </p>
                          </div>
                          {activeView === "shop" && isOwned && (
                            <span className="theme-chip font-fredoka-strong rounded-full px-2.5 py-1 text-xs text-emerald-600">
                              Purchased
                            </span>
                          )}
                        </div>
                        <div className="mt-4 grid gap-2">
                          <button
                            type="button"
                            disabled={actionDisabled}
                            onClick={() => {
                              if (!isSignedIn) {
                                onSignIn();
                              } else if (activeView === "inventory" || isOwned) {
                                onEquip(item.slot, actionItemId);
                              } else {
                                onPurchase(item.id);
                              }
                            }}
                            className={`font-fredoka-strong flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm disabled:cursor-not-allowed ${
                              isEquipped
                                ? "theme-button-secondary opacity-70"
                                : "theme-button-primary disabled:opacity-55"
                            }`}
                          >
                            {isBusy ? "Updating..." : actionLabel}
                            {activeView === "shop" &&
                              !isOwned &&
                              item.price > 0 &&
                              !cannotAfford && (
                                <ChromaIcon className="h-4 w-4" />
                              )}
                          </button>
                          {activeView === "shop" &&
                            process.env.NODE_ENV === "development" &&
                            !isOwned && (
                              <button
                                type="button"
                                disabled={isLoading || isBusy}
                                onClick={() => {
                                  if (isSignedIn) {
                                    onDevUnlock(item.id);
                                  } else {
                                    onSignIn();
                                  }
                                }}
                                className="theme-button-secondary font-fredoka-strong flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                {isBusy ? "Unlocking..." : "Dev unlock"}
                              </button>
                            )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </motion.div>,
    document.body,
  );
}
