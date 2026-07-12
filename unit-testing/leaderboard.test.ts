import test from "node:test";
import assert from "node:assert/strict";

import {
  canUseLeaderboardCategory,
  getLeaderboardDifficultyForFamily,
  isLeaderboardDifficulty,
} from "../app/game/leaderboard";

test("leaderboard accepts black and white preset difficulties", () => {
  assert.equal(isLeaderboardDifficulty("black-and-white-normal"), true);
  assert.equal(isLeaderboardDifficulty("black-and-white-expert"), true);
});

test("black and white modes are valid for solve leaderboards and invalid for streaks", () => {
  assert.equal(canUseLeaderboardCategory("fastest", "black-and-white-hard"), true);
  assert.equal(canUseLeaderboardCategory("moves", "black-and-white-extreme"), true);
  assert.equal(canUseLeaderboardCategory("streaks", "black-and-white-hard"), false);
  assert.equal(canUseLeaderboardCategory("streaks", "endless"), true);
});

test("leaderboard mode family helper resolves preset difficulty keys", () => {
  assert.equal(getLeaderboardDifficultyForFamily("color", "hard"), "hard");
  assert.equal(
    getLeaderboardDifficultyForFamily("black-and-white", "hard"),
    "black-and-white-hard",
  );
});
