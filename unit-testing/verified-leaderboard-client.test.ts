import assert from "node:assert/strict";
import test from "node:test";

import {
  isRetryableVerifiedLeaderboardError,
  retryVerifiedCompletionRequest,
  VERIFIED_COMPLETION_RETRY_DELAYS_MS,
  VerifiedLeaderboardRequestError,
} from "../app/game/verified-leaderboard-client";

test("temporary leaderboard failures remain retryable", () => {
  assert.equal(isRetryableVerifiedLeaderboardError(new Error("offline")), true);
  assert.equal(
    isRetryableVerifiedLeaderboardError(
      new VerifiedLeaderboardRequestError(503),
    ),
    true,
  );
});

test("definitive leaderboard rejections are not retryable", () => {
  assert.equal(
    isRetryableVerifiedLeaderboardError(
      new VerifiedLeaderboardRequestError(429),
    ),
    false,
  );
  assert.equal(
    isRetryableVerifiedLeaderboardError(
      new VerifiedLeaderboardRequestError(400),
    ),
    false,
  );
  assert.equal(
    isRetryableVerifiedLeaderboardError(
      new VerifiedLeaderboardRequestError(409),
    ),
    false,
  );
});

test("completion requests retry twice with the configured delays", async () => {
  const observedDelays: number[] = [];
  let requestCount = 0;

  const result = await retryVerifiedCompletionRequest(
    async () => {
      requestCount += 1;
      if (requestCount < 3) {
        throw new VerifiedLeaderboardRequestError(503);
      }
      return "saved";
    },
    async (delayMs) => {
      observedDelays.push(delayMs);
    },
  );

  assert.equal(result, "saved");
  assert.equal(requestCount, 3);
  assert.deepEqual(observedDelays, [...VERIFIED_COMPLETION_RETRY_DELAYS_MS]);
});

test("completion requests do not retry client errors", async () => {
  let requestCount = 0;

  await assert.rejects(
    retryVerifiedCompletionRequest(
      async () => {
        requestCount += 1;
        throw new VerifiedLeaderboardRequestError(400);
      },
      async () => {
        throw new Error("A client error must not wait for a retry.");
      },
    ),
    VerifiedLeaderboardRequestError,
  );

  assert.equal(requestCount, 1);
});
