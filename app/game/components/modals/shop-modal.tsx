import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

import {
  COSMETIC_SLOTS,
  SHOP_CATALOG,
  type CosmeticDefinition,
  type CosmeticId,
  type CosmeticSlot,
  type ShopState,
} from "../../shop-catalog";
import { formatChromaBalance } from "../../chroma";
import { ChromaIcon } from "../chroma-icon";

const SLOT_LABELS: Record<CosmeticSlot, string> = {
  "tile-style": "Tiles",
  "board-theme": "Boards",
  "confetti-style": "Confetti",
};

type ShopModalProps = {
  busyItemId: CosmeticId | null;
  error: string | null;
  isLoading: boolean;
  isOpen: boolean;
  isSignedIn: boolean;
  onClose: () => void;
  onEquip: (slot: CosmeticSlot, itemId: CosmeticId) => void;
  onPurchase: (itemId: CosmeticId) => void;
  onRetry: () => void;
  onSignIn: () => void;
  shopState: ShopState;
};

function CosmeticPreview({ item }: Readonly<{ item: CosmeticDefinition }>) {
  if (item.slot === "tile-style") {
    return (
      <div className="shop-preview-grid" aria-hidden="true">
        {["#fb7185", "#fbbf24", "#34d399", "#60a5fa"].map((color) => (
          <span
            key={color}
            className={item.id === "gem-tiles" ? "shop-preview-gem" : ""}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    );
  }

  if (item.slot === "board-theme") {
    return (
      <div
        aria-hidden="true"
        className={`shop-preview-board ${
          item.id === "ocean-board" ? "shop-preview-board-ocean" : ""
        }`}
      >
        <div>
          {["#38bdf8", "#2dd4bf", "#818cf8", "#34d399"].map((color) => (
            <span key={color} style={{ backgroundColor: color }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="shop-preview-confetti" aria-hidden="true">
      {["#fb7185", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa"].map(
        (color, index) => (
          <span
            key={color}
            className={item.id === "starburst-confetti" ? "shop-preview-star" : ""}
            style={{
              backgroundColor: color,
              left: `${12 + index * 18}%`,
              top: `${index % 2 === 0 ? 24 : 48}%`,
              transform: `rotate(${index * 18}deg)`,
            }}
          />
        ),
      )}
    </div>
  );
}

export function ShopModal({
  busyItemId,
  error,
  isLoading,
  isOpen,
  isSignedIn,
  onClose,
  onEquip,
  onPurchase,
  onRetry,
  onSignIn,
  shopState,
}: Readonly<ShopModalProps>) {
  const [activeSlot, setActiveSlot] = useState<CosmeticSlot>("tile-style");
  const visibleItems = useMemo(
    () => SHOP_CATALOG.filter((item) => item.slot === activeSlot),
    [activeSlot],
  );

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
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-title"
        className="theme-modal relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[48rem] flex-col overflow-hidden rounded-[1.5rem] border sm:max-h-[calc(100dvh-3rem)] sm:rounded-[1.75rem]"
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="flex items-center justify-between gap-4 px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
          <div>
            <p className="theme-text-muted font-fredoka-strong text-xs uppercase tracking-[0.2em]">
              Cosmetic collection
            </p>
            <h2 id="shop-title" className="theme-text-primary font-fredoka-display mt-1 text-3xl">
              Chroma Shop
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
          aria-label="Shop categories"
          className="grid grid-cols-3 gap-2 border-y border-[var(--border-soft)] px-4 py-3 sm:px-7"
        >
          {COSMETIC_SLOTS.map((slot) => (
            <button
              type="button"
              key={slot}
              onClick={() => setActiveSlot(slot)}
              aria-current={activeSlot === slot ? "page" : undefined}
              className={`font-fredoka-strong min-h-11 rounded-xl px-3 text-sm sm:text-base ${
                activeSlot === slot
                  ? "theme-button-primary"
                  : "theme-button-secondary"
              }`}
            >
              {SLOT_LABELS[slot]}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-7">
          {!isSignedIn && (
            <p className="theme-panel-muted theme-text-muted mb-4 rounded-xl border px-4 py-3 text-sm">
              Browse every cosmetic. Sign in to buy and equip items with Chroma.
            </p>
          )}

          {error && (
            <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-500">
              <span>{error}</span>
              <button type="button" onClick={onRetry} className="font-fredoka-strong shrink-0 underline">
                Retry
              </button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {visibleItems.map((item) => {
              const isEquipped = shopState.equipped[item.slot] === item.id;
              const isOwned =
                item.price === 0 || shopState.ownedItemIds.includes(item.id);
              const isBusy = busyItemId === item.id;
              const cannotAfford = isSignedIn && !isOwned && shopState.balance < item.price;

              let actionLabel = "Equip";
              if (isEquipped) {
                actionLabel = "Equipped";
              } else if (!isSignedIn) {
                actionLabel = item.price === 0 ? "Sign in to equip" : "Sign in to buy";
              } else if (!isOwned) {
                actionLabel = cannotAfford
                  ? `Need ${formatChromaBalance(item.price - shopState.balance)} more`
                  : `Buy for ${formatChromaBalance(item.price)}`;
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
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="theme-text-primary font-fredoka-display text-xl">
                          {item.label}
                        </h3>
                        <p className="theme-text-muted mt-1 text-sm leading-5">
                          {item.description}
                        </p>
                      </div>
                      {item.price === 0 && (
                        <span className="theme-chip theme-text-muted font-fredoka-strong rounded-full px-2.5 py-1 text-xs">
                          Free
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isLoading || isBusy || isEquipped || cannotAfford}
                      onClick={() => {
                        if (!isSignedIn) {
                          onSignIn();
                        } else if (isOwned) {
                          onEquip(item.slot, item.id);
                        } else {
                          onPurchase(item.id);
                        }
                      }}
                      className={`font-fredoka-strong mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm disabled:cursor-not-allowed ${
                        isEquipped
                          ? "theme-button-secondary opacity-70"
                          : "theme-button-primary disabled:opacity-55"
                      }`}
                    >
                      {isBusy ? "Updating..." : actionLabel}
                      {!isOwned && item.price > 0 && !cannotAfford && (
                        <ChromaIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </motion.section>
    </motion.div>,
    document.body,
  );
}
