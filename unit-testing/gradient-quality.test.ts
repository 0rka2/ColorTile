import test from "node:test";
import assert from "node:assert/strict";

import { getGradientQuality, getGradientQualityFill } from "../app/game/gradient-quality";

test("getGradientQuality preserves exact endpoints", () => {
  assert.equal(getGradientQuality(0), 0);
  assert.equal(getGradientQuality(100), 100);
});

test("getGradientQuality eases intermediate progress upward", () => {
  assert.equal(getGradientQuality(25), 38);
  assert.equal(getGradientQuality(50), 62);
  assert.equal(getGradientQuality(75), 82);
});

test("getGradientQuality stays monotonic across increasing completion", () => {
  const values = [0, 5, 15, 30, 45, 60, 80, 100].map(getGradientQuality);

  for (let index = 1; index < values.length; index += 1) {
    assert.equal(values[index] >= values[index - 1], true);
  }
});

test("getGradientQualityFill clamps to a valid percentage", () => {
  assert.equal(getGradientQualityFill(-4), 0);
  assert.equal(getGradientQualityFill(64), 64);
  assert.equal(getGradientQualityFill(140), 100);
});
