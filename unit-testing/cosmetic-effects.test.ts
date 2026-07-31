import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import {
  getColorExplosionTileMotion,
  getCompletionEffectDurationMs,
} from "../app/game/cosmetic-effects";

const repositoryRoot = resolve(__dirname, "../../..");

test("completion effects expose bounded pre-confetti durations", () => {
  assert.equal(getCompletionEffectDurationMs("classic-completion", 375), 375);
  assert.equal(
    getCompletionEffectDurationMs("board-wave-completion", 375),
    375,
  );
  assert.equal(
    getCompletionEffectDurationMs("color-explosion-completion", 375),
    820,
  );
});

test("color explosion motion starts at the center and points tiles outward", () => {
  const upperLeftCenterTile = getColorExplosionTileMotion(5, 16);
  const upperRightCenterTile = getColorExplosionTileMotion(6, 16);
  const cornerTile = getColorExplosionTileMotion(0, 16);

  assert.equal(upperLeftCenterTile.delaySeconds, 0);
  assert.ok(upperLeftCenterTile.x < 0);
  assert.ok(upperLeftCenterTile.y < 0);
  assert.ok(upperRightCenterTile.x > 0);
  assert.ok(upperRightCenterTile.y < 0);
  assert.ok(cornerTile.delaySeconds > upperLeftCenterTile.delaySeconds);
  assert.ok(
    Math.hypot(cornerTile.x, cornerTile.y) >
      Math.hypot(upperLeftCenterTile.x, upperLeftCenterTile.y),
  );
});

test("color explosion keeps an odd board's exact center tile stationary", () => {
  assert.deepEqual(
    getColorExplosionTileMotion(12, 25),
    { delaySeconds: 0, x: 0, y: 0 },
  );
});

test("every finish cosmetic selects its own completion sound", async () => {
  const [winSequenceHook, sounds] = await Promise.all([
    readFile(
      resolve(repositoryRoot, "app/game/hooks/use-win-sequence.ts"),
      "utf8",
    ),
    readFile(resolve(repositoryRoot, "app/lib/sounds.ts"), "utf8"),
  ]);

  for (const soundName of [
    "classicCompleteSound",
    "boardWaveCompleteSound",
    "colorExplosionCompleteSound",
  ]) {
    assert.match(sounds, new RegExp(`export const ${soundName}`));
    assert.match(winSequenceHook, new RegExp(`return ${soundName}`));
  }
});

test("finish cosmetics remain animated when reduced motion is enabled", async () => {
  const [board, styles] = await Promise.all([
    readFile(
      resolve(repositoryRoot, "app/game/components/game-board.tsx"),
      "utf8",
    ),
    readFile(resolve(repositoryRoot, "app/globals.css"), "utf8"),
  ]);
  const reducedMotionStyles =
    styles.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*$/)?.[0] ??
    "";

  assert.doesNotMatch(board, /useReducedMotion|shouldReduceMotion/);
  assert.doesNotMatch(
    reducedMotionStyles,
    /completion-(?:board-ripple|color-explosion)/,
  );
  assert.doesNotMatch(
    reducedMotionStyles,
    /shop-preview-(?:board-wave|color-explosion)/,
  );
});
