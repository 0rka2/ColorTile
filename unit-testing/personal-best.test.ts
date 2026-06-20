import test from "node:test";
import assert from "node:assert/strict";

import { EMPTY_PERSONAL_BEST_STATUS, getPersonalBestStatus } from "../app/personal-best";

test("getPersonalBestStatus treats a first win as a new best time", () => {
  assert.deepEqual(
    getPersonalBestStatus(undefined, { moves: 18, solveTime: 47 }),
    {
      hasNewPersonalBest: true,
      isNewBestMoves: true,
      isNewBestTime: true,
    },
  );
});

test("getPersonalBestStatus detects a better time only", () => {
  assert.deepEqual(
    getPersonalBestStatus({ bestSolveTime: 40, fewestMoves: 12 }, { moves: 14, solveTime: 35 }),
    {
      hasNewPersonalBest: true,
      isNewBestMoves: false,
      isNewBestTime: true,
    },
  );
});

test("getPersonalBestStatus detects better moves only", () => {
  assert.deepEqual(
    getPersonalBestStatus({ bestSolveTime: 62, fewestMoves: 16 }, { moves: 13, solveTime: 70 }),
    {
      hasNewPersonalBest: true,
      isNewBestMoves: true,
      isNewBestTime: false,
    },
  );
});

test("getPersonalBestStatus does not count ties or worse results as a new best", () => {
  assert.deepEqual(
    getPersonalBestStatus({ bestSolveTime: 30, fewestMoves: 20 }, { moves: 20, solveTime: 30 }),
    EMPTY_PERSONAL_BEST_STATUS,
  );
  assert.deepEqual(
    getPersonalBestStatus({ bestSolveTime: 30, fewestMoves: 20 }, { moves: 24, solveTime: 42 }),
    EMPTY_PERSONAL_BEST_STATUS,
  );
});
