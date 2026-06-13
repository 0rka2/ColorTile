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
  result: { moves: number; solveTime: number },
): PersonalBestStatus {
  const isNewBestTime =
    currentRecord?.bestSolveTime === undefined || result.solveTime < currentRecord.bestSolveTime;
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
