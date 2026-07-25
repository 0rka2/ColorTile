import test from "node:test";
import assert from "node:assert/strict";

import {
  BLACK_AND_WHITE_PRESET_MODE_KEYS,
  COLOR_PRESET_MODE_KEYS,
  DIFFICULTY_LABELS,
  GAME_MODE_DEFINITIONS,
  PRESET_DIFFICULTIES,
  RESERVED_PRESET_TIME_LIMIT_SECONDS,
  checkCompletion,
  clamp,
  createSeededRandom,
  formatTime,
  generateCornerColors,
  generateSolvedBoard,
  getCountdownDuration,
  getDailyPuzzleDefinition,
  getDailyPuzzleDateKey,
  getDailyPuzzleTypeLabel,
  getGameModeConfig,
  getBoardDensityClass,
  getEndlessPuzzleDefinition,
  getEndlessPuzzleSwapBudget,
  getEndlessPuzzleSize,
  getEndlessPuzzleTypeLabel,
  getEndlessSwapBudget,
  getModeStyle,
  getPresetModeKey,
  getEndlessThreeStarMoveLimit,
  getTileRadiusClass,
  hexToRgb,
  hslToHex,
  interpolateHue,
  isEndlessPuzzleType,
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

function buildSeededBoard(dateKey: string) {
  const definition = getDailyPuzzleDefinition(dateKey);
  const random = createSeededRandom(`${dateKey}:board`);
  const corners = generateCornerColors(definition.size, random);
  return scrambleBoard(generateSolvedBoard(definition.size, corners), random);
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

test("endless puzzles follow the authored twenty-level ladder", () => {
  const expectedLevels = [
    ["First Steps", "classic"],
    ["Clean Moves", "limited-swaps"],
    ["Quick Start", "countdown"],
    ["Faded Colors", "black-and-white"],
    ["Double Trouble", "countdown-swaps"],
    ["Bigger Canvas", "classic"],
    ["Memory Fade", "black-and-white"],
    ["Precision Grid", "limited-swaps"],
    ["Against the Clock", "countdown"],
    ["Pressure Check", "black-and-white-countdown"],
    ["Wide Open", "classic"],
    ["Gray Area", "black-and-white"],
    ["Careful Hands", "limited-swaps"],
    ["Rush Hour", "countdown-swaps"],
    ["Blind Sprint", "black-and-white-countdown"],
    ["Final Size", "classic"],
    ["Monochrome Maze", "black-and-white"],
    ["Master Precision", "limited-swaps"],
    ["Lasting Clock", "black-and-white-countdown"],
    ["ColorTile Gauntlet", "black-and-white-countdown-swaps"],
  ];

  assert.deepEqual(
    expectedLevels.map((_, index) => {
      const definition = getEndlessPuzzleDefinition(index + 1);
      return [definition.name, definition.type];
    }),
    expectedLevels,
  );
});

test("late endless cycles are deterministic, balanced, and avoid adjacent repeats", () => {
  const expectedTypes = [
    "black-and-white",
    "black-and-white-countdown-swaps",
    "classic",
    "countdown",
    "limited-swaps",
  ];
  const firstPass = Array.from({ length: 20 }, (_, index) =>
    getEndlessPuzzleDefinition(index + 21),
  );
  const repeatedPass = Array.from({ length: 20 }, (_, index) =>
    getEndlessPuzzleDefinition(index + 21),
  );

  assert.deepEqual(repeatedPass, firstPass);
  assert.notEqual(
    getEndlessPuzzleDefinition(20).type,
    getEndlessPuzzleDefinition(21).type,
  );

  for (let cycleStart = 0; cycleStart < firstPass.length; cycleStart += 5) {
    assert.deepEqual(
      firstPass
        .slice(cycleStart, cycleStart + 5)
        .map((definition) => definition.type)
        .sort(),
      expectedTypes,
    );
  }

  for (let index = 1; index < firstPass.length; index += 1) {
    assert.notEqual(firstPass[index].type, firstPass[index - 1].type);
  }
});

test("countdown durations scale by size and combined challenge modifiers", () => {
  assert.equal(getCountdownDuration(PRESET_DIFFICULTIES.normal.size), 180);
  assert.equal(getCountdownDuration(PRESET_DIFFICULTIES.hard.size), 300);
  assert.equal(getCountdownDuration(PRESET_DIFFICULTIES.expert.size), 420);
  assert.equal(getCountdownDuration(PRESET_DIFFICULTIES.extreme.size), 540);
  assert.equal(
    getCountdownDuration(PRESET_DIFFICULTIES.normal.size, { includesSwapLimit: true }),
    240,
  );
  assert.equal(
    getCountdownDuration(PRESET_DIFFICULTIES.hard.size, { includesSwapLimit: true }),
    360,
  );
  assert.equal(
    getCountdownDuration(PRESET_DIFFICULTIES.extreme.size, {
      includesSwapLimit: true,
      isBlackAndWhite: true,
    }),
    660,
  );
});

test("endless constrained puzzles use safe budgets for every board size", () => {
  const sizes = [4, 5, 6, 7];
  const limitedBudgets = [17, 26, 37, 50];
  const combinedBudgets = [20, 29, 40, 53];
  const worstCaseMinimums = [11, 20, 31, 44];

  sizes.forEach((size, index) => {
    assert.equal(
      getEndlessPuzzleSwapBudget(size, "limited-swaps"),
      limitedBudgets[index],
    );
    assert.equal(
      getEndlessPuzzleSwapBudget(size, "countdown-swaps"),
      combinedBudgets[index],
    );
    assert.ok(limitedBudgets[index] > worstCaseMinimums[index]);
    assert.ok(combinedBudgets[index] > worstCaseMinimums[index]);
  });

  assert.equal(getEndlessPuzzleSwapBudget(7, "classic"), null);
  assert.equal(getEndlessPuzzleSwapBudget(7, "black-and-white"), null);
});

test("combined endless rules expose matching labels, styles, and limits", () => {
  const definition = getEndlessPuzzleDefinition(20);

  assert.equal(definition.challengeLabel, "B&W + Time Limit + Swaps");
  assert.equal(definition.style, "black-and-white");
  assert.equal(definition.swapBudget, 53);
  assert.equal(definition.threeStarMoveLimit, 44);
  assert.equal(definition.timeLimitSeconds, 660);
  assert.equal(definition.usesCountdown, true);
  assert.equal(definition.usesSwapLimit, true);
  assert.equal(getEndlessPuzzleTypeLabel(definition.type), definition.challengeLabel);
  assert.equal(isEndlessPuzzleType(definition.type), true);
  assert.equal(isEndlessPuzzleType("time-limit"), false);
});

test("daily puzzle date key uses UTC dates", () => {
  assert.equal(getDailyPuzzleDateKey(new Date("2026-07-13T23:59:59.000Z")), "2026-07-13");
});

test("daily puzzle roster is stable for a date", () => {
  assert.deepEqual(
    getDailyPuzzleDefinition("2026-07-25"),
    getDailyPuzzleDefinition("2026-07-25"),
  );
});

test("daily puzzle roster includes both difficulties and all challenge types", () => {
  const difficulties = new Set<string>();
  const types = new Set<string>();

  for (let day = 1; day <= 120; day += 1) {
    const dateKey = new Date(Date.UTC(2026, 0, day)).toISOString().slice(0, 10);
    const definition = getDailyPuzzleDefinition(dateKey);

    difficulties.add(definition.difficulty);
    types.add(definition.type);
  }

  assert.deepEqual([...difficulties].sort(), ["hard", "normal"]);
  assert.deepEqual(
    [...types].sort(),
    ["black-and-white", "classic", "limited-swaps", "time-limit"],
  );
});

test("daily puzzle definitions apply the selected difficulty and challenge rules", () => {
  for (let day = 1; day <= 120; day += 1) {
    const dateKey = new Date(Date.UTC(2026, 0, day)).toISOString().slice(0, 10);
    const definition = getDailyPuzzleDefinition(dateKey);
    const expectedSize = PRESET_DIFFICULTIES[definition.difficulty].size;

    assert.equal(definition.size, expectedSize);
    assert.equal(definition.challengeLabel, getDailyPuzzleTypeLabel(definition.type));

    if (definition.type === "limited-swaps") {
      assert.equal(definition.style, "color");
      assert.equal(definition.swapBudget, getEndlessSwapBudget(expectedSize));
      assert.equal(definition.timeLimitSeconds, null);
    } else if (definition.type === "time-limit") {
      assert.equal(definition.style, "color");
      assert.equal(definition.swapBudget, null);
      assert.equal(definition.timeLimitSeconds, getCountdownDuration(expectedSize));
    } else {
      assert.equal(
        definition.style,
        definition.type === "black-and-white" ? "black-and-white" : "color",
      );
      assert.equal(definition.swapBudget, null);
      assert.equal(definition.timeLimitSeconds, null);
    }
  }
});

test("seeded daily board generation is stable for a date and changes across dates", () => {
  const firstBoard = buildSeededBoard("2026-07-13");
  const repeatedBoard = buildSeededBoard("2026-07-13");
  const nextDayBoard = buildSeededBoard("2026-07-14");
  const summarizeBoard = (board: Tile[]) =>
    board.map((tile) => `${tile.id}:${tile.currentIndex}:${tile.color}`);

  assert.deepEqual(summarizeBoard(repeatedBoard), summarizeBoard(firstBoard));
  assert.notDeepEqual(summarizeBoard(nextDayBoard), summarizeBoard(firstBoard));
});

test("board random helpers still use Math.random by default", () => {
  let defaultCorners: [string, string, string, string] = ["", "", "", ""];
  let injectedCorners: [string, string, string, string] = ["", "", "", ""];
  const randomValues = [0.25, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];

  withMockedRandom(randomValues, () => {
    defaultCorners = generateCornerColors(5);
  });

  let randomIndex = 0;
  const injectedRandom = () => {
    const nextValue = randomValues[randomIndex];
    randomIndex += 1;
    return nextValue ?? randomValues[randomValues.length - 1];
  };

  injectedCorners = generateCornerColors(5, injectedRandom);

  assert.deepEqual(defaultCorners, injectedCorners);
});

test("endless swap budget stays between 30 and 32 based on board difficulty", () => {
  assert.equal(getEndlessSwapBudget(4), 30);
  assert.equal(getEndlessSwapBudget(5), 31);
  assert.equal(getEndlessSwapBudget(6), 32);
  assert.equal(getEndlessSwapBudget(7), 32);
});

test("endless three-star limits match efficient solutions by board size", () => {
  assert.equal(getEndlessThreeStarMoveLimit(4), 11);
  assert.equal(getEndlessThreeStarMoveLimit(5), 20);
  assert.equal(getEndlessThreeStarMoveLimit(6), 31);
  assert.equal(getEndlessThreeStarMoveLimit(7), 44);
});

test("tile radius and board density classes change at the expected thresholds", () => {
  assert.equal(getTileRadiusClass(4), "rounded-[18%]");
  assert.equal(getTileRadiusClass(6), "rounded-xl");
  assert.equal(getTileRadiusClass(9), "rounded-lg");
  assert.equal(getTileRadiusClass(12), "rounded-md");

  assert.equal(getBoardDensityClass(4), "board-grid--default");
  assert.equal(getBoardDensityClass(10), "board-grid--compact");
  assert.equal(getBoardDensityClass(18), "board-grid--dense");
});

test("black and white modes mirror preset board sizes and reserved limits", () => {
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
  });
  assert.deepEqual(getGameModeConfig("black-and-white-extreme"), {
    label: "B&W Extreme",
    size: PRESET_DIFFICULTIES.extreme.size,
  });
  assert.equal(RESERVED_PRESET_TIME_LIMIT_SECONDS.normal, 120);
  assert.equal(RESERVED_PRESET_TIME_LIMIT_SECONDS.extreme, 420);
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
