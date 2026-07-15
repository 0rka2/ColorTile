import test from "node:test";
import assert from "node:assert/strict";

import {
  COOKIE_CONSENT_COOKIE_NAME,
  parseCookieHeader,
  serializeCookie,
  THEME_MODE_COOKIE_NAME,
} from "../app/lib/cookies";

test("parseCookieHeader reads named cookie values", () => {
  assert.deepEqual(
    parseCookieHeader("colortile-cookie-consent=accepted; colortile-theme-mode=dark"),
    {
      [COOKIE_CONSENT_COOKIE_NAME]: "accepted",
      [THEME_MODE_COOKIE_NAME]: "dark",
    },
  );
});

test("parseCookieHeader decodes escaped cookie values", () => {
  assert.deepEqual(
    parseCookieHeader("player=Color%20Tile; mode=light"),
    {
      player: "Color Tile",
      mode: "light",
    },
  );
});

test("serializeCookie writes stable browser cookie attributes", () => {
  assert.equal(
    serializeCookie(COOKIE_CONSENT_COOKIE_NAME, "declined"),
    "colortile-cookie-consent=declined; Path=/; Max-Age=31536000; SameSite=Lax",
  );
});
