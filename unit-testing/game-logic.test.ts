import test from "node:test";
import assert from "node:assert/strict";

import {
  BLACK_AND_WHITE_PRESET_MODE_KEYS,
  COLOR_PRESET_MODE_KEYS,
  DIFFICULTY_LABELS,
  GAME_MODE_DEFINITIONS,
  PRESET_DIFFICULTIES,
  checkCompletion,
  clamp,
  formatTime,
  generateSolvedBoard,
  getBlackAndWhiteRevealStainEdges,
  getGameModeConfig,
  getBoardDensityClass,
  getEndlessPuzzleSize,
  getEndlessSwapBudget,
  getModeStyle,
  getPresetModeKey,
  getEndlessThreeStarMoveLimit,
  getTileRadiusClass,
  hexToRgb,
  hslToHex,
  interpolateHue,
  isBlackAndWhiteTileInRevealSplash,
  isBlackAndWhiteMode,
  isSolved,
  isTileLocked,
  scrambleBoard,
  swapTiles,
} from "../app/game/game-logic";
import type { Tile } from "../app/game/game-types";

function buildSolvedBoard(size = 4) {
  return generateSolvedBoard(size, ["#ff0000", "#00ff00", "#0000ff", "#ffffff"]);
}

function buildBoardWithCorrectIndexes(size: number, correctIndexes: number[]): Tile[] {
  return Array.from({ length: size * size }, (_, index) => ({
    id: `tile-${index}`,
    color: "#000000",
    correctIndex: correctIndexes.includes(index) ? index : -1,
    currentIndex: index,
    isCorner: false,
  }));
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

test("black and white reveal splash includes a correct center tile and its side neighbors", () => {
  const board = buildBoardWithCorrectIndexes(4, [5]);

  assert.equal(isBlackAndWhiteTileInRevealSplash(board, 5, 4), true);
  assert.equal(isBlackAndWhiteTileInRevealSplash(board, 1, 4), true);
  assert.equal(isBlackAndWhiteTileInRevealSplash(board, 4, 4), true);
  assert.equal(isBlackAndWhiteTileInRevealSplash(board, 6, 4), true);
  assert.equal(isBlackAndWhiteTileInRevealSplash(board, 9, 4), true);
  assert.equal(isBlackAndWhiteTileInRevealSplash(board, 0, 4), false);
});

test("black and white reveal splash includes only valid side neighbors for a correct corner tile", () => {
  const board = buildBoardWithCorrectIndexes(4, [0]);

  assert.equal(isBlackAndWhiteTileInRevealSplash(board, 0, 4), true);
  assert.equal(isBlackAndWhiteTileInRevealSplash(board, 1, 4), true);
  assert.equal(isBlackAndWhiteTileInRevealSplash(board, 4, 4), true);
  assert.equal(isBlackAndWhiteTileInRevealSplash(board, 3, 4), false);
  assert.equal(isBlackAndWhiteTileInRevealSplash(board, 5, 4), false);
});

test("black and white reveal splash does not wrap across row edges", () => {
  const board = buildBoardWithCorrectIndexes(4, [3]);

  assert.equal(isBlackAndWhiteTileInRevealSplash(board, 3, 4), true);
  assert.equal(isBlackAndWhiteTileInRevealSplash(board, 2, 4), true);
  assert.equal(isBlackAndWhiteTileInRevealSplash(board, 7, 4), true);
  assert.equal(isBlackAndWhiteTileInRevealSplash(board, 4, 4), false);
});

test("black and white reveal stains point toward correct neighbor tiles", () => {
  const board = buildBoardWithCorrectIndexes(4, [1, 4, 6, 9]);

  assert.deepEqual(getBlackAndWhiteRevealStainEdges(board, 5, 4), [
    "top",
    "bottom",
    "left",
    "right",
  ]);
});

test("black and white reveal stains do not appear on correct tiles", () => {
  const board = buildBoardWithCorrectIndexes(4, [5]);

  assert.deepEqual(getBlackAndWhiteRevealStainEdges(board, 5, 4), []);
});

test("black and white reveal splash reaches every position on a solved board", () => {
  const board = buildSolvedBoard(4);

  board.forEach((_, index) => {
    assert.equal(isBlackAndWhiteTileInRevealSplash(board, index, 4), true);
  });
});

test("formatTime uses compact stopwatch formatting", () => {
  assert.equal(formatTime(-4), "0.0");
  assert.equal(formatTime(0.9), "0.9");
  assert.equal(formatTime(7.1), "7.1");
  assert.equal(formatTime(9.9), "9.9");
  assert.equal(formatTime(10), "10.0");
  assert.equal(formatTime(59.9), "59.9");
  assert.equal(formatTime(60), "1:00");
  assert.equal(formatTime(119.9), "1:59");
  assert.equal(formatTime(119.9, { roundUp: true }), "2:00");
  assert.equal(formatTime(125), "2:05");
});

test("endless puzzle sizes increase at the planned puzzle thresholds", () => {
  assert.equal(getEndlessPuzzleSize(1), 4);
  assert.equal(getEndlessPuzzleSize(5), 4);
  assert.equal(getEndlessPuzzleSize(6), 5);
  assert.equal(getEndlessPuzzleSize(10), 5);
  assert.equal(getEndlessPuzzleSize(11), 6);
  assert.equal(getEndlessPuzzleSize(15), 6);
  assert.equal(getEndlessPuzzleSize(16), 7);
});

test("endless swap budget tightens with streak but keeps a minimum", () => {
  assert.equal(getEndlessSwapBudget(4, 0), 15);
  assert.equal(getEndlessSwapBudget(4, 3), 14);
  assert.equal(getEndlessSwapBudget(4, 99), 8);
  assert.equal(getEndlessSwapBudget(7, 0), 48);
});

test("endless three-star limit is seventy percent rounded up", () => {
  assert.equal(getEndlessThreeStarMoveLimit(15), 11);
  assert.equal(getEndlessThreeStarMoveLimit(14), 10);
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

test("black and white modes mirror preset board sizes and times", () => {
  assert.deepEqual(COLOR_PRESET_MODE_KEYS, ["normal", "hard", "expert", "extreme"]);
  assert.deepEqual(BLACK_AND_WHITE_PRESET_MODE_KEYS, [
    "black-and-white-normal",
    "black-and-white-hard",
    "black-and-white-expert",
    "black-and-white-extreme",
  ]);

  assert.deepEqual(getGameModeConfig("black-and-white-normal"), {
    label: "B&W Normal",
    size: PRESET_DIFFICULTIES.normal.size,
    time: PRESET_DIFFICULTIES.normal.time,
  });
  assert.deepEqual(getGameModeConfig("black-and-white-extreme"), {
    label: "B&W Extreme",
    size: PRESET_DIFFICULTIES.extreme.size,
    time: PRESET_DIFFICULTIES.extreme.time,
  });
});

test("mode helpers resolve style and keys for black and white runs", () => {
  assert.equal(getPresetModeKey("color", "hard"), "hard");
  assert.equal(getPresetModeKey("black-and-white", "hard"), "black-and-white-hard");
  assert.equal(getModeStyle("expert"), "color");
  assert.equal(getModeStyle("black-and-white-expert"), "black-and-white");
  assert.equal(isBlackAndWhiteMode("black-and-white-normal"), true);
  assert.equal(isBlackAndWhiteMode("normal"), false);
  assert.equal(DIFFICULTY_LABELS["black-and-white-hard"], "B&W Hard");
  assert.equal(GAME_MODE_DEFINITIONS.endless.isEndless, true);
});
