import test from "node:test";
import assert from "node:assert/strict";

import {
  checkCompletion,
  clamp,
  formatTime,
  generateSolvedBoard,
  getBoardDensityClass,
  getTileRadiusClass,
  hexToRgb,
  hslToHex,
  interpolateHue,
  isSolved,
  isTileLocked,
  scrambleBoard,
  swapTiles,
} from "../app/game-logic";
import type { Tile } from "../app/game-types";

function buildSolvedBoard(size = 4) {
  return generateSolvedBoard(size, ["#ff0000", "#00ff00", "#0000ff", "#ffffff"]);
}

function withMockedRandom(values: number[], callback: () => void) {
  const originalRandom = Math.random;
  let index = 0;

  Math.random = () => {
    const nextValue = values[index];
    index += 1;
    return nextValue ?? values[values.length - 1] ?? 0;
  };

  try {
    callback();
  } finally {
    Math.random = originalRandom;
  }
}

test("clamp keeps values within the given range", () => {
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(4, 0, 10), 4);
  assert.equal(clamp(11, 0, 10), 10);
});

test("hslToHex and hexToRgb convert a known color correctly", () => {
  const hex = hslToHex(0, 100, 50);

  assert.equal(hex, "#ff0000");
  assert.deepEqual(hexToRgb(hex), { r: 255, g: 0, b: 0 });
});

test("interpolateHue follows the shortest wraparound path", () => {
  assert.equal(interpolateHue(350, 10, 0.5), 0);
  assert.equal(interpolateHue(10, 350, 0.5), 0);
});

test("generateSolvedBoard creates a full board with fixed corners", () => {
  const board = buildSolvedBoard(4);
  const cornerIndexes = [0, 3, 12, 15];

  assert.equal(board.length, 16);

  board.forEach((tile, index) => {
    assert.equal(tile.id, `tile-${index}`);
    assert.equal(tile.correctIndex, index);
    assert.equal(tile.currentIndex, index);
    assert.equal(tile.color.startsWith("#"), true);
    assert.equal(tile.isCorner, cornerIndexes.includes(index));
  });
});

test("scrambleBoard keeps corners fixed and preserves the movable tile set", () => {
  const solvedBoard = buildSolvedBoard(4);
  let scrambledBoard: Tile[] = [];

  withMockedRandom([0.1, 0.7, 0.2, 0.9, 0.3, 0.8, 0.4, 0.6, 0.5, 0.15], () => {
    scrambledBoard = scrambleBoard(solvedBoard);
  });

  assert.equal(scrambledBoard.length, solvedBoard.length);

  solvedBoard.forEach((tile, index) => {
    if (tile.isCorner) {
      assert.equal(scrambledBoard[index].id, tile.id);
      assert.equal(scrambledBoard[index].currentIndex, index);
    }
  });

  const solvedMovableIds = solvedBoard
    .filter((tile) => !tile.isCorner)
    .map((tile) => tile.id)
    .sort();
  const scrambledMovableIds = scrambledBoard
    .filter((tile) => !tile.isCorner)
    .map((tile) => tile.id)
    .sort();

  assert.deepEqual(scrambledMovableIds, solvedMovableIds);
  assert.equal(scrambledBoard.some((tile, index) => !tile.isCorner && tile.correctIndex === index), false);
});

test("swapTiles swaps positions and updates current indexes", () => {
  const solvedBoard = buildSolvedBoard(4);
  const swappedBoard = swapTiles(solvedBoard, 1, 2);

  assert.equal(swappedBoard[1].id, solvedBoard[2].id);
  assert.equal(swappedBoard[1].currentIndex, 1);
  assert.equal(swappedBoard[2].id, solvedBoard[1].id);
  assert.equal(swappedBoard[2].currentIndex, 2);
  assert.equal(solvedBoard[1].id, "tile-1");
});

test("completion and solved helpers reflect board state", () => {
  const solvedBoard = buildSolvedBoard(4);
  const swappedBoard = swapTiles(solvedBoard, 1, 2);

  assert.equal(checkCompletion(solvedBoard), 100);
  assert.equal(isSolved(solvedBoard), true);
  assert.equal(checkCompletion(swappedBoard), 88);
  assert.equal(isSolved(swappedBoard), false);
});

test("isTileLocked only locks corners and correct tiles", () => {
  const solvedBoard = buildSolvedBoard(4);
  const movableTile = solvedBoard[1];
  const swappedBoard = swapTiles(solvedBoard, 1, 2);

  assert.equal(isTileLocked(solvedBoard[0], 0), true);
  assert.equal(isTileLocked(movableTile, 1), true);
  assert.equal(isTileLocked(swappedBoard[1], 1), false);
});

test("formatTime never returns negative time and keeps leading zeroes", () => {
  assert.equal(formatTime(-4), "0:00");
  assert.equal(formatTime(9), "0:09");
  assert.equal(formatTime(125), "2:05");
});

test("tile radius and board density classes change at the expected thresholds", () => {
  assert.equal(getTileRadiusClass(4), "rounded-[1.35rem]");
  assert.equal(getTileRadiusClass(6), "rounded-xl");
  assert.equal(getTileRadiusClass(9), "rounded-lg");
  assert.equal(getTileRadiusClass(12), "rounded-md");

  assert.equal(getBoardDensityClass(4), "board-grid--default");
  assert.equal(getBoardDensityClass(10), "board-grid--compact");
  assert.equal(getBoardDensityClass(18), "board-grid--dense");
});
