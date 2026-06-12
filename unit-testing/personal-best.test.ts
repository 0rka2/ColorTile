import test from "node:test";
import assert from "node:assert/strict";

import { EMPTY_PERSONAL_BEST_STATUS, getPersonalBestStatus } from "../app/personal-best";

test("getPersonalBestStatus treats a first win as a new best time", () => {
  assert.deepEqual(
    getPersonalBestStatus(undefined, { timeLeft: 47 }),
    {
      hasNewPersonalBest: true,
      isNewBestTime: true,
    },
  );
});

test("getPersonalBestStatus detects a better time only", () => {
  assert.deepEqual(
    getPersonalBestStatus({ bestTimeLeft: 40 }, { timeLeft: 55 }),
    {
      hasNewPersonalBest: true,
      isNewBestTime: true,
    },
  );
});

test("getPersonalBestStatus ignores lower times", () => {
  assert.deepEqual(
    getPersonalBestStatus({ bestTimeLeft: 62 }, { timeLeft: 49 }),
    EMPTY_PERSONAL_BEST_STATUS,
  );
});

test("getPersonalBestStatus does not count ties or worse results as a new best", () => {
  assert.deepEqual(
    getPersonalBestStatus({ bestTimeLeft: 30 }, { timeLeft: 30 }),
    EMPTY_PERSONAL_BEST_STATUS,
  );
  assert.deepEqual(
    getPersonalBestStatus({ bestTimeLeft: 30 }, { timeLeft: 18 }),
    EMPTY_PERSONAL_BEST_STATUS,
  );
});
