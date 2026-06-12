import type { BestRecord } from "./game-types";

export type PersonalBestStatus = {
  hasNewPersonalBest: boolean;
  isNewBestMoves: boolean;
  isNewBestTime: boolean;
};

export const EMPTY_PERSONAL_BEST_STATUS: PersonalBestStatus = {
  hasNewPersonalBest: false,
  isNewBestMoves: false,
  isNewBestTime: false,
};

export function getPersonalBestStatus(
  currentRecord: BestRecord | undefined,
  result: { moves: number; timeLeft: number },
): PersonalBestStatus {
  const isNewBestTime =
    currentRecord?.bestTimeLeft === undefined || result.timeLeft > currentRecord.bestTimeLeft;
  const isNewBestMoves =
    currentRecord?.fewestMoves === undefined || result.moves < currentRecord.fewestMoves;

  if (!isNewBestTime && !isNewBestMoves) {
    return EMPTY_PERSONAL_BEST_STATUS;
  }

  return {
    hasNewPersonalBest: true,
    isNewBestMoves,
    isNewBestTime,
  };
}
