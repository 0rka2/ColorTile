import type { LeaderboardDifficulty } from "./leaderboard";
import type { ChromaReward } from "./chroma";
import type { VerifiedPuzzle, VerifiedSwap } from "./verified-attempt";

export type VerifiedAttempt = {
  attemptId: string;
  expiresAt: string;
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
    error.status >= 500
  );
}

export const VERIFIED_COMPLETION_RETRY_DELAYS_MS = [500, 1_500] as const;

function wait(delayMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

export async function retryVerifiedCompletionRequest<T>(
  request: () => Promise<T>,
  waitForRetry: (delayMs: number) => Promise<void> = wait,
) {
  for (
    let requestIndex = 0;
    requestIndex <= VERIFIED_COMPLETION_RETRY_DELAYS_MS.length;
    requestIndex += 1
  ) {
    try {
      return await request();
    } catch (error) {
      const retryDelay = VERIFIED_COMPLETION_RETRY_DELAYS_MS[requestIndex];
      if (
        retryDelay === undefined ||
        !isRetryableVerifiedLeaderboardError(error)
      ) {
        throw error;
      }

      await waitForRetry(retryDelay);
    }
  }

  throw new Error("The leaderboard completion retry loop ended unexpectedly.");
}

async function readSuccessfulResponse<T>(response: Response) {
  if (!response.ok) {
    throw new VerifiedLeaderboardRequestError(response.status);
  }

  return (await response.json()) as T;
}

export async function createAndStartVerifiedAttempt(input: CreateAttemptInput) {
  const response = await fetch("/api/leaderboard/attempts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, start: true }),
  });

  return readSuccessfulResponse<VerifiedAttempt>(response);
}

export async function completeVerifiedAttempt(
  attemptId: string,
  swaps: readonly VerifiedSwap[],
) {
  return retryVerifiedCompletionRequest(async () => {
    const response = await fetch(
      `/api/leaderboard/attempts/${encodeURIComponent(attemptId)}/complete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swaps }),
      },
    );

    return readSuccessfulResponse<VerifiedAttemptResult>(response);
  });
}
