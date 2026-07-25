import assert from "node:assert/strict";
import test from "node:test";

import {
  isRetryableVerifiedLeaderboardError,
  VerifiedLeaderboardRequestError,
} from "../app/game/verified-leaderboard-client";

test("temporary leaderboard failures remain retryable", () => {
  assert.equal(isRetryableVerifiedLeaderboardError(new Error("offline")), true);
  assert.equal(
    isRetryableVerifiedLeaderboardError(
      new VerifiedLeaderboardRequestError(429),
    ),
    true,
  );
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
