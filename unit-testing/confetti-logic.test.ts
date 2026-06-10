import test from "node:test";
import assert from "node:assert/strict";

import { getConfettiViewportSize } from "../app/confetti-logic";

test("getConfettiViewportSize returns zero dimensions when viewport is missing", () => {
  assert.deepEqual(getConfettiViewportSize(), { width: 0, height: 0 });
  assert.deepEqual(getConfettiViewportSize(null), { width: 0, height: 0 });
});

test("getConfettiViewportSize normalizes viewport dimensions", () => {
  assert.deepEqual(
    getConfettiViewportSize({ innerWidth: 1280.9, innerHeight: 719.2 }),
    { width: 1280, height: 719 },
  );
  assert.deepEqual(
    getConfettiViewportSize({ innerWidth: -12, innerHeight: 45.7 }),
    { width: 0, height: 45 },
  );
});
