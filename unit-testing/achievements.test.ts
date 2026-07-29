import test from "node:test";
import assert from "node:assert/strict";

import {
  ACHIEVEMENT_IDS,
  EMPTY_ACHIEVEMENT_PROGRESS,
  getBestPlayStreak,
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
    lifetimeSwaps: overrides.lifetimeSwaps ?? 0,
    bestPlayStreak: overrides.bestPlayStreak ?? 0,
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
      lifetimeSwaps: 5_000,
      bestPlayStreak: 30,
    }),
  );

  assert.deepEqual(eligible, ACHIEVEMENT_IDS);
});

test("swap milestones unlock at their exact lifetime totals", () => {
  assert.deepEqual(
    getEligibleAchievementIds(createProgress({ lifetimeSwaps: 499 })),
    [],
  );
  assert.deepEqual(
    getEligibleAchievementIds(createProgress({ lifetimeSwaps: 500 })),
    ["tile-turner"],
  );
  assert.deepEqual(
    getEligibleAchievementIds(createProgress({ lifetimeSwaps: 1_000 })),
    ["tile-turner", "swap-specialist"],
  );
  assert.deepEqual(
    getEligibleAchievementIds(createProgress({ lifetimeSwaps: 5_000 })),
    ["tile-turner", "swap-specialist", "master-mover"],
  );
});

test("play streaks handle duplicates, gaps, boundaries, and unordered dates", () => {
  assert.equal(
    getBestPlayStreak([
      "2026-02-02",
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-01",
      "2026-02-05",
    ]),
    4,
  );
  assert.equal(
    getBestPlayStreak(["2025-12-31", "2026-01-01", "2026-01-02"]),
    3,
  );
  assert.equal(getBestPlayStreak(["invalid", "2026-02-30"]), 0);
});

test("consecutive-play achievements unlock at 7, 14, and 30 days", () => {
  assert.deepEqual(
    getEligibleAchievementIds(createProgress({ bestPlayStreak: 6 })),
    [],
  );
  assert.deepEqual(
    getEligibleAchievementIds(createProgress({ bestPlayStreak: 7 })),
    ["steady-start"],
  );
  assert.deepEqual(
    getEligibleAchievementIds(createProgress({ bestPlayStreak: 14 })),
    ["steady-start", "fortnight-flow"],
  );
  assert.deepEqual(
    getEligibleAchievementIds(createProgress({ bestPlayStreak: 30 })),
    ["steady-start", "fortnight-flow", "monthly-momentum"],
  );
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
