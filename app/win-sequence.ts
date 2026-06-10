export type WinPhase = "idle" | "boardWave" | "confetti" | "modal";

export const WIN_TILE_WAVE_STAGGER_MS = 45;
export const WIN_TILE_POP_DURATION_MS = 240;
export const WIN_CONFETTI_LEAD_IN_MS = 320;

export function getWinWaveDuration(tileCount: number) {
  if (tileCount <= 0) {
    return 0;
  }

  return (tileCount - 1) * WIN_TILE_WAVE_STAGGER_MS + WIN_TILE_POP_DURATION_MS;
}

export function getWinSequenceDurations(tileCount: number) {
  const boardWaveDurationMs = getWinWaveDuration(tileCount);

  return {
    boardWaveDurationMs,
    confettiLeadInMs: WIN_CONFETTI_LEAD_IN_MS,
    modalDelayMs: boardWaveDurationMs + WIN_CONFETTI_LEAD_IN_MS,
  };
}
