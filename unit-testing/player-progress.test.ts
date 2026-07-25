import test from "node:test";
import assert from "node:assert/strict";

import {
  clearStoredPlayerData,
  EMPTY_PLAYER_PROGRESS,
  mergePlayerProgress,
  normalizePlayerProgress,
  PLAYER_DATA_STORAGE_KEYS,
  shouldClearStoredPlayerData,
} from "../app/game/player-progress";

test("clearStoredPlayerData removes every account-owned browser value", () => {
  const removedKeys: string[] = [];

  clearStoredPlayerData({
    removeItem(key) {
      removedKeys.push(key);
    },
  });

  assert.deepEqual(removedKeys, PLAYER_DATA_STORAGE_KEYS);
});

test("stored player data is cleared only when leaving an account identity", () => {
  assert.equal(shouldClearStoredPlayerData(undefined, null), false);
  assert.equal(shouldClearStoredPlayerData(null, "user-a"), false);
  assert.equal(shouldClearStoredPlayerData("user-a", "user-a"), false);
  assert.equal(shouldClearStoredPlayerData("user-a", null), true);
  assert.equal(shouldClearStoredPlayerData("user-a", "user-b"), true);
});

test("normalizePlayerProgress rejects malformed account data", () => {
  assert.deepEqual(normalizePlayerProgress(null), EMPTY_PLAYER_PROGRESS);
  assert.deepEqual(
    normalizePlayerProgress({
      bestStats: {
        unknown: {
          bestSolveTime: -5,
        },
      },
      dailyRecord: {
        completed: true,
        dateKey: "not-a-date",
        style: "color",
      },
      endlessStats: {
        bestStreak: "10",
      },
    }),
    EMPTY_PLAYER_PROGRESS,
  );
});

test("mergePlayerProgress keeps the strongest records from both devices", () => {
  const merged = mergePlayerProgress(
    {
      bestStats: {
        normal: {
          bestCompletion: 92,
          bestSolveTime: 44,
          fewestMoves: 18,
        },
      },
      dailyRecord: {
        bestSolveTime: 38,
        completed: true,
        dateKey: "2026-07-18",
        fewestMoves: 21,
        style: "color",
      },
      endlessStats: {
        bestStreak: 5,
        clears: 8,
        threeStarClears: 3,
      },
    },
    {
      bestStats: {
        normal: {
          bestCompletion: 100,
          bestSolveTime: 51,
          fewestMoves: 14,
        },
      },
      dailyRecord: {
        bestSolveTime: 42,
        completed: true,
        dateKey: "2026-07-18",
        fewestMoves: 19,
        style: "color",
      },
      endlessStats: {
        bestStreak: 7,
        clears: 6,
        threeStarClears: 4,
      },
    },
  );

  assert.deepEqual(merged.bestStats.normal, {
    bestCompletion: 100,
    bestSolveTime: 44,
    bestTimeLeft: undefined,
    fewestMoves: 14,
  });
  assert.deepEqual(merged.dailyRecord, {
    bestSolveTime: 38,
    completed: true,
    dateKey: "2026-07-18",
    fewestMoves: 19,
    style: "color",
  });
  assert.deepEqual(merged.endlessStats, {
    bestStreak: 7,
    clears: 8,
    threeStarClears: 4,
  });
});

test("mergePlayerProgress keeps the newest daily puzzle date", () => {
  const merged = mergePlayerProgress(
    {
      dailyRecord: {
        completed: true,
        dateKey: "2026-07-17",
        style: "black-and-white",
      },
    },
    {
      dailyRecord: {
        completed: false,
        dateKey: "2026-07-18",
        style: "color",
      },
    },
  );

  assert.equal(merged.dailyRecord?.dateKey, "2026-07-18");
  assert.equal(merged.dailyRecord?.style, "color");
});
