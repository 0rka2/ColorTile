import { createPortal } from "react-dom";
import type { CSSProperties } from "react";

import type { SwapEffectEvent } from "../cosmetic-effects";
import type { CosmeticId } from "../shop-catalog";

type SwapEffectOverlayProps = {
  effect: CosmeticId;
  event: SwapEffectEvent | null;
};

export function SwapEffectOverlay({
  effect,
  event,
}: Readonly<SwapEffectOverlayProps>) {
  if (
    !event ||
    effect === "no-swap-effect" ||
    typeof document === "undefined"
  ) {
    return null;
  }

  const boardEffectsLayer = document.querySelector<HTMLElement>(
    "[data-game-board-effects]",
  );
  if (!boardEffectsLayer) {
    return null;
  }

  const boardBounds = boardEffectsLayer.getBoundingClientRect();
  const deltaX = event.to.x - event.from.x;
  const deltaY = event.to.y - event.from.y;
  const distance = Math.hypot(deltaX, deltaY);
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

  return createPortal(
    <div
      key={event.id}
      aria-hidden="true"
      className={`swap-effect-overlay swap-effect-overlay--${effect}`}
      style={{
        left: event.from.x - boardBounds.left,
        top: event.from.y - boardBounds.top,
        transform: `translateY(-50%) rotate(${angle}deg)`,
        width: distance,
      } as CSSProperties}
    >
      <span className="swap-effect-line" />
    </div>,
    boardEffectsLayer,
  );
}
