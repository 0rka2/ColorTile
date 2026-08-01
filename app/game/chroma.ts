import type { PresetModeKey } from "./game-types";

export const DAILY_CHROMA_REWARD = 75;
export const ENDLESS_CHROMA_REWARD = 30;
export const CHROMA_BALANCE_UPDATED_EVENT = "colortile-chroma-balance-updated";

const PRESET_CHROMA_REWARDS: Readonly<Record<PresetModeKey, number>> = {
  normal: 25,
  hard: 30,
  expert: 35,
  extreme: 45,
  "black-and-white-normal": 35,
  "black-and-white-hard": 40,
  "black-and-white-expert": 45,
  "black-and-white-extreme": 55,
};

export type ChromaReward = {
  awarded: number;
  balance: number;
  status: "awarded" | "already-claimed";
};

export type ChromaCompletionResult =
  | ChromaReward
  | {
      available: number;
      status: "pending" | "sign-in-required" | "unavailable";
    };

export function getPresetChromaReward(difficulty: PresetModeKey) {
  return PRESET_CHROMA_REWARDS[difficulty];
}

export function formatChromaBalance(balance: number, compact = false) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(Math.max(0, Math.floor(balance)));
}

export function getChromaRewardCopy(result: ChromaCompletionResult) {
  if ("balance" in result) {
    return {
      detail: "",
      title:
        result.status === "awarded"
          ? `+${result.awarded} Chroma`
          : "Reward already claimed",
    };
  }

  if (result.status === "sign-in-required") {
    return {
      detail: `This clear is worth ${result.available} Chroma when signed in.`,
      title: "Sign in to earn Chroma",
    };
  }

  return result.status === "pending"
    ? {
        detail: "Your verified reward is being saved.",
        title: "Saving Chroma reward",
      }
    : {
        detail: "This clear could not be verified, so no Chroma was awarded.",
        title: "Reward unavailable",
      };
}
