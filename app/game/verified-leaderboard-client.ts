import type { LeaderboardDifficulty } from "./leaderboard";
import type { ChromaReward } from "./chroma";
import type { VerifiedPuzzle, VerifiedSwap } from "./verified-attempt";

export type PreparedVerifiedAttempt = {
  attemptId: string;
  expiresAt: string;
};

export type VerifiedAttempt = PreparedVerifiedAttempt & {
  puzzle: VerifiedPuzzle;
  startedAt: string;
};

export type VerifiedAttemptResult = {
  chroma: ChromaReward;
  moves: number;
  solveTime?: number;
  streakCount?: number;
};

type CreateAttemptInput =
  | { difficulty: LeaderboardDifficulty; kind: "preset" }
  | { dateKey: string; kind: "daily" }
  | { endlessRunId: string | null; kind: "endless" };

export class VerifiedLeaderboardRequestError extends Error {
  status: number;

  constructor(status: number) {
    super(`Verified leaderboard request failed with ${status}.`);
    this.name = "VerifiedLeaderboardRequestError";
    this.status = status;
  }
}

export function isRetryableVerifiedLeaderboardError(error: unknown) {
  return (
    !(error instanceof VerifiedLeaderboardRequestError) ||
    error.status === 429 ||
    error.status >= 500
  );
}

async function readSuccessfulResponse<T>(response: Response) {
  if (!response.ok) {
    throw new VerifiedLeaderboardRequestError(response.status);
  }

  return (await response.json()) as T;
}

export async function createVerifiedAttempt(input: CreateAttemptInput) {
  const response = await fetch("/api/leaderboard/attempts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return readSuccessfulResponse<PreparedVerifiedAttempt>(response);
}

export async function startVerifiedAttempt(attemptId: string) {
  const response = await fetch(
    `/api/leaderboard/attempts/${encodeURIComponent(attemptId)}/start`,
    { method: "POST" },
  );

  return readSuccessfulResponse<VerifiedAttempt>(response);
}

export async function completeVerifiedAttempt(
  attemptId: string,
  swaps: readonly VerifiedSwap[],
) {
  const response = await fetch(
    `/api/leaderboard/attempts/${encodeURIComponent(attemptId)}/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ swaps }),
    },
  );

  return readSuccessfulResponse<VerifiedAttemptResult>(response);
}
