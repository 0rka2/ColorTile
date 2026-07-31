import type { CosmeticId } from "./shop-catalog";

const COLOR_EXPLOSION_MIN_TRAVEL_PX = 18;
const COLOR_EXPLOSION_MAX_TRAVEL_PX = 52;
const COLOR_EXPLOSION_MAX_STAGGER_SECONDS = 0.14;

export type SwapEffectPoint = {
  x: number;
  y: number;
};

export type SwapEffectEvent = {
  from: SwapEffectPoint;
  id: number;
  to: SwapEffectPoint;
};

export type ColorExplosionTileMotion = {
  delaySeconds: number;
  x: number;
  y: number;
};

export function getColorExplosionTileMotion(
  tileIndex: number,
  tileCount: number,
): ColorExplosionTileMotion {
  const size = Math.round(Math.sqrt(tileCount));
  if (size <= 0 || tileIndex < 0 || tileIndex >= tileCount) {
    return { delaySeconds: 0, x: 0, y: 0 };
  }

  const center = (size - 1) / 2;
  const column = tileIndex % size;
  const row = Math.floor(tileIndex / size);
  const offsetX = column - center;
  const offsetY = row - center;
  const distanceFromCenter = Math.hypot(offsetX, offsetY);
  const nearestTileDistance = Number.isInteger(center) ? 0 : Math.SQRT1_2;
  const furthestTileDistance = Math.hypot(center, center);
  const distanceRange = furthestTileDistance - nearestTileDistance;
  const distanceProgress =
    distanceRange > 0
      ? (distanceFromCenter - nearestTileDistance) / distanceRange
      : 0;
  const normalizedProgress = Math.min(1, Math.max(0, distanceProgress));

  if (distanceFromCenter === 0) {
    return { delaySeconds: 0, x: 0, y: 0 };
  }

  const travelDistance =
    COLOR_EXPLOSION_MIN_TRAVEL_PX +
    (COLOR_EXPLOSION_MAX_TRAVEL_PX - COLOR_EXPLOSION_MIN_TRAVEL_PX) *
      normalizedProgress;

  return {
    delaySeconds: COLOR_EXPLOSION_MAX_STAGGER_SECONDS * normalizedProgress,
    x: (offsetX / distanceFromCenter) * travelDistance,
    y: (offsetY / distanceFromCenter) * travelDistance,
  };
}

export function getCompletionEffectDurationMs(
  completionEffect: CosmeticId,
  boardWaveDurationMs: number,
) {
  switch (completionEffect) {
    case "board-wave-completion":
      return boardWaveDurationMs;
    case "color-explosion-completion":
      return 820;
    default:
      return boardWaveDurationMs;
  }
}
