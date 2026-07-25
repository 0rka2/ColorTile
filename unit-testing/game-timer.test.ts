import test from "node:test";
import assert from "node:assert/strict";

import {
  getCountdownDeadline,
  getGameTimerSeconds,
  getMonotonicStartedAt,
} from "../app/game/game-timer";

test("countdown deadline includes the pre-start preview", () => {
  assert.equal(
    getCountdownDeadline({
      durationSeconds: 180,
      previewSeconds: 3,
      startedAt: 1_000,
    }),
    184_000,
  );
  assert.equal(
    getCountdownDeadline({
      durationSeconds: 0,
      previewSeconds: 3,
      startedAt: 1_000,
    }),
    null,
  );
});

test("server start time includes response and setup delay", () => {
  assert.equal(
    getMonotonicStartedAt({
      authoritativeStartedAt: 10_000,
      monotonicNow: 5_000,
      wallClockNow: 12_250,
    }),
    2_750,
  );
});

test("stopwatch time follows elapsed timestamps instead of tick count", () => {
  assert.equal(
    getGameTimerSeconds({
      countdownDeadline: null,
      now: 12_450,
      startedAt: 1_000,
    }),
    11.5,
  );
});

test("countdown time follows its deadline and clamps at zero", () => {
  assert.equal(
    getGameTimerSeconds({
      countdownDeadline: 20_000,
      now: 12_450,
      startedAt: 1_000,
    }),
    7.6,
  );
  assert.equal(
    getGameTimerSeconds({
      countdownDeadline: 20_000,
      now: 25_000,
      startedAt: 1_000,
    }),
    0,
  );
});
