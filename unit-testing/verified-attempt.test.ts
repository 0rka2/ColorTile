import test from "node:test";
import assert from "node:assert/strict";

import { isTileCorrect, swapTiles } from "../app/game/game-logic";
import type { Tile } from "../app/game/game-types";
import {
  createVerifiedBoard,
  normalizeVerifiedSwaps,
  validateVerifiedReplay,
  type VerifiedPuzzle,
  type VerifiedSwap,
} from "../app/game/verified-attempt";

const puzzle: VerifiedPuzzle = {
  dateKey: null,
  difficulty: "normal",
  endlessRunId: null,
  kind: "preset",
  puzzleNumber: null,
  puzzleType: null,
  seed: "verified-attempt-test",
  size: 4,
  style: "color",
  swapBudget: null,
  timeLimitSeconds: null,
};

function solveBoard(initialBoard: Tile[]) {
  let board = initialBoard;
  const swaps: VerifiedSwap[] = [];

  for (let targetIndex = 0; targetIndex < board.length; targetIndex += 1) {
    if (isTileCorrect(board[targetIndex], targetIndex)) {
      continue;
    }

    const sourceIndex = board.findIndex(
      (tile, index) => index !== targetIndex && tile.correctIndex === targetIndex,
    );
    assert.notEqual(sourceIndex, -1);
    swaps.push([sourceIndex, targetIndex]);
    board = swapTiles(board, sourceIndex, targetIndex);
  }

  return swaps;
}

test("verified board generation is deterministic", () => {
  assert.deepEqual(createVerifiedBoard(puzzle), createVerifiedBoard(puzzle));
});

test("verified replay accepts a legal solution", () => {
  const swaps = solveBoard(createVerifiedBoard(puzzle));
  const result = validateVerifiedReplay(puzzle, swaps);

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.moves, swaps.length);
  }
});

test("verified replay rejects locked corners and unsolved boards", () => {
  assert.deepEqual(validateVerifiedReplay(puzzle, [[0, 1]]), {
    error: "The replay contains an illegal swap.",
    valid: false,
  });

  const firstMovableIndex = createVerifiedBoard(puzzle).findIndex(
    (tile, index) => !tile.isCorner && !isTileCorrect(tile, index),
  );
  const secondMovableIndex = createVerifiedBoard(puzzle).findIndex(
    (tile, index) =>
      index !== firstMovableIndex &&
      !tile.isCorner &&
      !isTileCorrect(tile, index),
  );
  const result = validateVerifiedReplay(puzzle, [
    [firstMovableIndex, secondMovableIndex],
  ]);
  assert.equal(result.valid, false);
});

test("verified replay enforces the configured move budget", () => {
  const swaps = solveBoard(createVerifiedBoard(puzzle));
  const constrainedPuzzle = { ...puzzle, swapBudget: swaps.length - 1 };

  assert.deepEqual(validateVerifiedReplay(constrainedPuzzle, swaps), {
    error: "The move limit was exceeded.",
    valid: false,
  });
});

test("verified replay input rejects excessive swap histories", () => {
  const maximumReplay = Array.from({ length: 500 }, () => [1, 2]);
  const excessiveReplay = [...maximumReplay, [2, 3]];

  assert.equal(normalizeVerifiedSwaps(maximumReplay)?.length, 500);
  assert.equal(normalizeVerifiedSwaps(excessiveReplay), null);
});
