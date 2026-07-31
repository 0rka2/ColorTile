export type WinPhase = "idle" | "boardWave" | "confetti" | "modal";

export const WIN_TILE_WAVE_STAGGER_MS = 45;
export const WIN_TILE_POP_DURATION_MS = 460;
export const WIN_CONFETTI_LEAD_IN_MS = 320;
export const WIN_MODAL_TOTAL_DELAY_MS = 1000;

export function getWinWaveDuration(tileCount: number) {
  if (tileCount <= 0) {
    return 0;
  }

  const columnCount = Math.max(1, Math.round(Math.sqrt(tileCount)));
  return (columnCount - 1) * WIN_TILE_WAVE_STAGGER_MS + WIN_TILE_POP_DURATION_MS;
}

export function getWinSequenceDurations(
  tileCount: number,
  completionEffect: CosmeticId = "classic-completion",
) {
  const boardWaveDurationMs = getWinWaveDuration(tileCount);
  const completionEffectDurationMs = getCompletionEffectDurationMs(
    completionEffect,
    boardWaveDurationMs,
  );

  return {
    boardWaveDurationMs: completionEffectDurationMs,
    confettiLeadInMs: WIN_CONFETTI_LEAD_IN_MS,
    modalDelayMs: Math.max(
      WIN_MODAL_TOTAL_DELAY_MS,
      completionEffectDurationMs + WIN_CONFETTI_LEAD_IN_MS,
    ),
  };
}
import { getCompletionEffectDurationMs } from "./cosmetic-effects";
import type { CosmeticId } from "./shop-catalog";
