import test from "node:test";
import assert from "node:assert/strict";

import {
  DROP_TARGET_SNAP_DISTANCE_PX,
  findNearestTileIndex,
  type TileBounds,
} from "../app/game/drop-target";

const tiles: TileBounds[] = [
  { bottom: 40, index: 0, left: 0, right: 40, top: 0 },
  { bottom: 40, index: 1, left: 44, right: 84, top: 0 },
  { bottom: 84, index: 2, left: 0, right: 40, top: 44 },
  { bottom: 84, index: 3, left: 44, right: 84, top: 44 },
];

test("findNearestTileIndex selects the nearest tile in an internal gap", () => {
  assert.equal(findNearestTileIndex(42.5, 20, tiles), 1);
  assert.equal(findNearestTileIndex(20, 42.5, tiles), 2);
});

test("findNearestTileIndex returns the tile nearest a board intersection", () => {
  assert.equal(findNearestTileIndex(41, 41, tiles), 0);
  assert.equal(findNearestTileIndex(43, 43, tiles), 3);
});

test("findNearestTileIndex snaps to tiles within twelve pixels", () => {
  assert.equal(DROP_TARGET_SNAP_DISTANCE_PX, 12);
  assert.equal(findNearestTileIndex(-12, 20, tiles), 0);
  assert.equal(findNearestTileIndex(20, 96, tiles), 2);
});

test("findNearestTileIndex ignores points beyond the snap distance", () => {
  assert.equal(findNearestTileIndex(-12.1, 20, tiles), null);
  assert.equal(findNearestTileIndex(20, 96.1, tiles), null);
});

test("findNearestTileIndex handles an empty tile list", () => {
  assert.equal(findNearestTileIndex(20, 20, []), null);
});
