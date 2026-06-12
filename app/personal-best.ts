import type { BestRecord } from "./game-types";

export type PersonalBestStatus = {
  hasNewPersonalBest: boolean;
  isNewBestTime: boolean;
};

export const EMPTY_PERSONAL_BEST_STATUS: PersonalBestStatus = {
  hasNewPersonalBest: false,
  isNewBestTime: false,
};

export function getPersonalBestStatus(
  currentRecord: BestRecord | undefined,
  result: { timeLeft: number },
): PersonalBestStatus {
  const isNewBestTime =
    currentRecord?.bestTimeLeft === undefined || result.timeLeft > currentRecord.bestTimeLeft;

  if (!isNewBestTime) {
    return EMPTY_PERSONAL_BEST_STATUS;
  }

  return {
    hasNewPersonalBest: true,
    isNewBestTime,
  };
}
