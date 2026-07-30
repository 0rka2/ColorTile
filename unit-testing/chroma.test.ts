import assert from "node:assert/strict";
import test from "node:test";

import {
  DAILY_CHROMA_REWARD,
  ENDLESS_CHROMA_REWARD,
  formatChromaBalance,
  getChromaRewardCopy,
  getPresetChromaReward,
} from "../app/game/chroma";

test("preset completions use the configured Chroma rewards", () => {
  assert.equal(getPresetChromaReward("normal"), 25);
  assert.equal(getPresetChromaReward("hard"), 30);
  assert.equal(getPresetChromaReward("expert"), 35);
  assert.equal(getPresetChromaReward("extreme"), 45);
  assert.equal(getPresetChromaReward("black-and-white-normal"), 35);
  assert.equal(getPresetChromaReward("black-and-white-hard"), 40);
  assert.equal(getPresetChromaReward("black-and-white-expert"), 45);
  assert.equal(getPresetChromaReward("black-and-white-extreme"), 55);
});

test("daily and endless completions use their configured Chroma rewards", () => {
  assert.equal(DAILY_CHROMA_REWARD, 75);
  assert.equal(ENDLESS_CHROMA_REWARD, 30);
});

test("Chroma balances use full desktop and compact mobile formatting", () => {
  assert.equal(formatChromaBalance(12_345), "12,345");
  assert.equal(formatChromaBalance(12_345, true), "12.3K");
  assert.equal(formatChromaBalance(-10), "0");
});

test("completion reward copy covers every Chroma state", () => {
  assert.deepEqual(
    getChromaRewardCopy({
      awarded: 45,
      balance: 120,
      status: "awarded",
    }),
    {
      detail: "Balance: 120 Chroma",
      title: "+45 Chroma",
    },
  );
  assert.equal(
    getChromaRewardCopy({
      awarded: 0,
      balance: 120,
      status: "already-claimed",
    }).title,
    "Reward already claimed",
  );
  assert.equal(
    getChromaRewardCopy({
      available: 75,
      status: "sign-in-required",
    }).title,
    "Sign in to earn Chroma",
  );
  assert.equal(
    getChromaRewardCopy({
      available: 30,
      status: "earned",
    }).title,
    "+30 Chroma",
  );
});
