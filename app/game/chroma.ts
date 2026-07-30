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
      status: "earned" | "sign-in-required";
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
      detail: `Balance: ${result.balance} Chroma`,
      title:
        result.status === "awarded"
          ? `+${result.awarded} Chroma`
          : "Reward already claimed",
    };
  }

  return result.status === "earned"
    ? {
        detail: "",
        title: `+${result.available} Chroma`,
      }
    : {
        detail: `This clear is worth ${result.available} Chroma when signed in.`,
        title: "Sign in to earn Chroma",
      };
}
