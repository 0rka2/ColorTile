import {
  checkCompletion,
  createSeededRandom,
  generateCornerColors,
  generateSolvedBoard,
  isTileLocked,
  scrambleBoard,
  swapTiles,
} from "./game-logic";
import type {
  DailyPuzzleType,
  EndlessPuzzleType,
  ModeStyle,
  PresetModeKey,
  Tile,
} from "./game-types";
import { MAX_LEADERBOARD_MOVES } from "./leaderboard";

export type VerifiedAttemptKind = "daily" | "endless" | "preset";
export type VerifiedSwap = readonly [sourceIndex: number, targetIndex: number];

export type VerifiedPuzzle = {
  dateKey: string | null;
  difficulty: PresetModeKey | "endless";
  endlessRunId: string | null;
  kind: VerifiedAttemptKind;
  puzzleNumber: number | null;
  puzzleType: DailyPuzzleType | EndlessPuzzleType | null;
  seed: string;
  size: number;
  style: ModeStyle;
  swapBudget: number | null;
  timeLimitSeconds: number | null;
};

export type ReplayValidationResult =
  | { board: Tile[]; moves: number; valid: true }
  | { error: string; valid: false };

export function createVerifiedBoard(puzzle: Pick<VerifiedPuzzle, "seed" | "size">) {
  const random = createSeededRandom(puzzle.seed);
  const corners = generateCornerColors(puzzle.size, random);
  const solvedBoard = generateSolvedBoard(puzzle.size, corners);

  return scrambleBoard(solvedBoard, random);
}

export function validateVerifiedReplay(
  puzzle: VerifiedPuzzle,
  swaps: readonly VerifiedSwap[],
): ReplayValidationResult {
  if (swaps.length === 0 || swaps.length > MAX_LEADERBOARD_MOVES) {
    return { error: "Invalid replay length.", valid: false };
  }

  if (puzzle.swapBudget !== null && swaps.length > puzzle.swapBudget) {
    return { error: "The move limit was exceeded.", valid: false };
  }

  let board = createVerifiedBoard(puzzle);

  for (const swap of swaps) {
    if (
      !Array.isArray(swap) ||
      swap.length !== 2 ||
      !Number.isInteger(swap[0]) ||
      !Number.isInteger(swap[1])
    ) {
      return { error: "The replay contains an invalid swap.", valid: false };
    }

    const [sourceIndex, targetIndex] = swap;
    if (
      sourceIndex < 0 ||
      targetIndex < 0 ||
      sourceIndex >= board.length ||
      targetIndex >= board.length ||
      sourceIndex === targetIndex ||
      isTileLocked(board[sourceIndex], sourceIndex) ||
      isTileLocked(board[targetIndex], targetIndex)
    ) {
      return { error: "The replay contains an illegal swap.", valid: false };
    }

    board = swapTiles(board, sourceIndex, targetIndex);
  }

  if (checkCompletion(board) !== 100) {
    return { error: "The replay does not solve the puzzle.", valid: false };
  }

  return { board, moves: swaps.length, valid: true };
}

export function normalizeVerifiedSwaps(value: unknown): VerifiedSwap[] | null {
  if (!Array.isArray(value) || value.length > MAX_LEADERBOARD_MOVES) {
    return null;
  }

  const swaps: VerifiedSwap[] = [];
  for (const entry of value) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      !Number.isInteger(entry[0]) ||
      !Number.isInteger(entry[1])
    ) {
      return null;
    }

    swaps.push([entry[0], entry[1]]);
  }

  return swaps;
}
