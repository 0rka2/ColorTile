import assert from "node:assert/strict";
import test from "node:test";

import { isVerifiedGameContextCurrent } from "../app/game/verified-session";

test("verified context requires the same game session and account", () => {
  const expected = { gameSessionId: 12, userId: "user-a" };

  assert.equal(
    isVerifiedGameContextCurrent(expected, {
      gameSessionId: 12,
      userId: "user-a",
    }),
    true,
  );
  assert.equal(
    isVerifiedGameContextCurrent(expected, {
      gameSessionId: 13,
      userId: "user-a",
    }),
    false,
  );
  assert.equal(
    isVerifiedGameContextCurrent(expected, {
      gameSessionId: 12,
      userId: "user-b",
    }),
    false,
  );
});
