import {
  BLACK_AND_WHITE_PRESET_MODE_KEYS,
  COLOR_PRESET_MODE_KEYS,
} from "./game-logic";
import type { DifficultyKey } from "./game-types";

export const LEADERBOARD_CATEGORIES = ["fastest", "moves", "streaks"] as const;
export type LeaderboardCategory = (typeof LEADERBOARD_CATEGORIES)[number];

export const LEADERBOARD_DIFFICULTIES = [
  ...COLOR_PRESET_MODE_KEYS,
  ...BLACK_AND_WHITE_PRESET_MODE_KEYS,
  "endless",
] as const satisfies readonly DifficultyKey[];

export type LeaderboardDifficulty = (typeof LEADERBOARD_DIFFICULTIES)[number];

export function isLeaderboardCategory(value: string | null): value is LeaderboardCategory {
  return value !== null && LEADERBOARD_CATEGORIES.includes(value as LeaderboardCategory);
}

export function isLeaderboardDifficulty(value: string | null): value is LeaderboardDifficulty {
  return value !== null && LEADERBOARD_DIFFICULTIES.includes(value as LeaderboardDifficulty);
}

export function canUseLeaderboardCategory(
  category: LeaderboardCategory,
  difficulty: LeaderboardDifficulty,
) {
  if (category === "streaks") {
    return difficulty === "endless";
  }

  return difficulty !== "endless";
}
