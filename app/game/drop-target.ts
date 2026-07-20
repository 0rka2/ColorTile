export type TileBounds = {
  bottom: number;
  index: number;
  left: number;
  right: number;
  top: number;
};

export type DropTargetRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export const DROP_TARGET_SNAP_DISTANCE_PX = 12;

export function findNearestTileIndex(
  clientX: number,
  clientY: number,
  tiles: TileBounds[],
  maxDistance = DROP_TARGET_SNAP_DISTANCE_PX,
): number | null {
  let nearestTileIndex: number | null = null;
  let nearestCenterDistance = Number.POSITIVE_INFINITY;

  for (const tile of tiles) {
    const horizontalDistance = Math.max(tile.left - clientX, 0, clientX - tile.right);
    const verticalDistance = Math.max(tile.top - clientY, 0, clientY - tile.bottom);
    const distanceFromTile = Math.hypot(horizontalDistance, verticalDistance);
    if (distanceFromTile > maxDistance) {
      continue;
    }

    const centerX = (tile.left + tile.right) / 2;
    const centerY = (tile.top + tile.bottom) / 2;
    const centerDistance = Math.hypot(clientX - centerX, clientY - centerY);

    if (centerDistance < nearestCenterDistance) {
      nearestCenterDistance = centerDistance;
      nearestTileIndex = tile.index;
    }
  }

  return nearestTileIndex;
}
