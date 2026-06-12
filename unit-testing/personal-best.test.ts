import test from "node:test";
import assert from "node:assert/strict";

import { EMPTY_PERSONAL_BEST_STATUS, getPersonalBestStatus } from "../app/personal-best";

test("getPersonalBestStatus treats a first win as a new best time", () => {
  assert.deepEqual(
    getPersonalBestStatus(undefined, { moves: 18, timeLeft: 47 }),
    {
      hasNewPersonalBest: true,
      isNewBestMoves: true,
      isNewBestTime: true,
    },
  );
});

test("getPersonalBestStatus detects a better time only", () => {
  assert.deepEqual(
    getPersonalBestStatus({ bestTimeLeft: 40, fewestMoves: 12 }, { moves: 14, timeLeft: 55 }),
    {
      hasNewPersonalBest: true,
      isNewBestMoves: false,
      isNewBestTime: true,
    },
  );
});

test("getPersonalBestStatus detects better moves only", () => {
  assert.deepEqual(
    getPersonalBestStatus({ bestTimeLeft: 62, fewestMoves: 16 }, { moves: 13, timeLeft: 49 }),
    {
      hasNewPersonalBest: true,
      isNewBestMoves: true,
      isNewBestTime: false,
    },
  );
});

test("getPersonalBestStatus does not count ties or worse results as a new best", () => {
  assert.deepEqual(
    getPersonalBestStatus({ bestTimeLeft: 30, fewestMoves: 20 }, { moves: 20, timeLeft: 30 }),
    EMPTY_PERSONAL_BEST_STATUS,
  );
  assert.deepEqual(
    getPersonalBestStatus({ bestTimeLeft: 30, fewestMoves: 20 }, { moves: 24, timeLeft: 18 }),
    EMPTY_PERSONAL_BEST_STATUS,
  );
});
