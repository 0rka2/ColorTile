import test from "node:test";
import assert from "node:assert/strict";

import {
  getWinSequenceDurations,
  getWinWaveDuration,
  WIN_CONFETTI_LEAD_IN_MS,
  WIN_MODAL_EXTRA_DELAY_MS,
  WIN_TILE_POP_DURATION_MS,
  WIN_TILE_WAVE_STAGGER_MS,
} from "../app/win-sequence";

test("getWinWaveDuration returns zero when there are no tiles", () => {
  assert.equal(getWinWaveDuration(0), 0);
});

test("getWinWaveDuration applies one pop plus stagger per additional column", () => {
  assert.equal(getWinWaveDuration(1), WIN_TILE_POP_DURATION_MS);
  assert.equal(
    getWinWaveDuration(4),
    WIN_TILE_POP_DURATION_MS + WIN_TILE_WAVE_STAGGER_MS,
  );
  assert.equal(
    getWinWaveDuration(16),
    WIN_TILE_POP_DURATION_MS + WIN_TILE_WAVE_STAGGER_MS * 3,
  );
  assert.equal(
    getWinWaveDuration(25),
    WIN_TILE_POP_DURATION_MS + WIN_TILE_WAVE_STAGGER_MS * 4,
  );
});

test("getWinSequenceDurations derives the modal delay from wave, confetti lead-in, and extra pause", () => {
  const durations = getWinSequenceDurations(16);

  assert.equal(durations.boardWaveDurationMs, getWinWaveDuration(16));
  assert.equal(durations.confettiLeadInMs, WIN_CONFETTI_LEAD_IN_MS);
  assert.equal(
    durations.modalDelayMs,
    durations.boardWaveDurationMs + WIN_CONFETTI_LEAD_IN_MS + WIN_MODAL_EXTRA_DELAY_MS,
  );
});
