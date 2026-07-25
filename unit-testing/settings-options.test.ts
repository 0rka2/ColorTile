import test from "node:test";
import assert from "node:assert/strict";

import { getThemeModeLabel, resolveThemeMode, THEME_MODES } from "../app/game/settings-options";

test("THEME_MODES exposes light and dark in a stable order", () => {
  assert.deepEqual(
    THEME_MODES,
    ["light", "dark"],
  );
});

test("getThemeModeLabel returns the expected switch labels", () => {
  assert.equal(getThemeModeLabel("light"), "Light");
  assert.equal(getThemeModeLabel("dark"), "Dark");
});

test("resolveThemeMode falls back to light for unknown stored values", () => {
  assert.equal(resolveThemeMode("light"), "light");
  assert.equal(resolveThemeMode("dark"), "dark");
  assert.equal(resolveThemeMode("system"), "light");
  assert.equal(resolveThemeMode(null), "light");
});
