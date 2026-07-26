import test from "node:test";
import assert from "node:assert/strict";

import {
  ACHIEVEMENT_IDS,
  EMPTY_ACHIEVEMENT_PROGRESS,
  getEligibleAchievementIds,
  type AchievementProgress,
} from "../app/game/achievements";

function createProgress(
  overrides: Partial<AchievementProgress> = {},
): AchievementProgress {
  return {
    ...EMPTY_ACHIEVEMENT_PROGRESS,
    bestColorTimes: { ...overrides.bestColorTimes },
    completedPresetModes: [...(overrides.completedPresetModes ?? [])],
    dailyClears: overrides.dailyClears ?? 0,
    endlessClears: overrides.endlessClears ?? 0,
    bestEndlessStreak: overrides.bestEndlessStreak ?? 0,
    threeStarClears: overrides.threeStarClears ?? 0,
  };
}

test("a complete account journey qualifies for all achievements", () => {
  const eligible = getEligibleAchievementIds(
    createProgress({
      completedPresetModes: [
        "normal",
        "hard",
        "expert",
        "extreme",
        "black-and-white-normal",
        "black-and-white-hard",
        "black-and-white-expert",
        "black-and-white-extreme",
      ],
      bestColorTimes: {
        normal: 59.9,
        hard: 149.9,
        expert: 239.9,
        extreme: 329.9,
      },
      dailyClears: 30,
      endlessClears: 25,
      threeStarClears: 10,
      bestEndlessStreak: 10,
    }),
  );

  assert.deepEqual(eligible, ACHIEVEMENT_IDS);
});

test("speed thresholds are strict", () => {
  const atThreshold = getEligibleAchievementIds(
    createProgress({
      completedPresetModes: ["normal", "hard", "expert", "extreme"],
      bestColorTimes: {
        normal: 60,
        hard: 150,
        expert: 240,
        extreme: 330,
      },
    }),
  );
  const belowThreshold = getEligibleAchievementIds(
    createProgress({
      completedPresetModes: ["normal", "hard", "expert", "extreme"],
      bestColorTimes: {
        normal: 59.999,
        hard: 149.999,
        expert: 239.999,
        extreme: 329.999,
      },
    }),
  );

  assert.equal(atThreshold.includes("quick-blend"), false);
  assert.equal(atThreshold.includes("fast-hands"), false);
  assert.equal(atThreshold.includes("expert-pace"), false);
  assert.equal(atThreshold.includes("extreme-focus"), false);
  assert.equal(belowThreshold.includes("quick-blend"), true);
  assert.equal(belowThreshold.includes("fast-hands"), true);
  assert.equal(belowThreshold.includes("expert-pace"), true);
  assert.equal(belowThreshold.includes("extreme-focus"), true);
});

test("black-and-white times do not qualify for color speed achievements", () => {
  const eligible = getEligibleAchievementIds(
    createProgress({
      completedPresetModes: ["black-and-white-expert"],
      bestColorTimes: {},
    }),
  );

  assert.deepEqual(eligible, ["into-the-shadows"]);
});

test("mastery achievements require the correct preset combinations", () => {
  const colorMastery = getEligibleAchievementIds(
    createProgress({
      completedPresetModes: ["normal", "hard", "expert", "extreme"],
    }),
  );
  const monochromeMastery = getEligibleAchievementIds(
    createProgress({
      completedPresetModes: [
        "black-and-white-normal",
        "black-and-white-hard",
        "black-and-white-expert",
        "black-and-white-extreme",
      ],
    }),
  );

  assert.equal(colorMastery.includes("full-spectrum"), true);
  assert.equal(colorMastery.includes("complete-collection"), false);
  assert.equal(monochromeMastery.includes("monochrome-master"), true);
  assert.equal(monochromeMastery.includes("complete-collection"), false);
});

test("daily and endless milestones unlock at their exact counts", () => {
  assert.deepEqual(
    getEligibleAchievementIds(createProgress({ dailyClears: 1 })),
    ["daily-debut"],
  );
  assert.deepEqual(
    getEligibleAchievementIds(createProgress({ dailyClears: 7 })),
    ["daily-debut", "week-of-color"],
  );
  assert.deepEqual(
    getEligibleAchievementIds(
      createProgress({
        dailyClears: 30,
        endlessClears: 25,
        threeStarClears: 10,
        bestEndlessStreak: 10,
      }),
    ),
    [
      "daily-debut",
      "week-of-color",
      "daily-devotee",
      "endless-explorer",
      "long-run",
      "star-collector",
      "unbreakable",
    ],
  );
});
