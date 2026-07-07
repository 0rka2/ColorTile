export type ThemeMode = "light" | "dark";

export const THEME_MODE_STORAGE_KEY = "colortile-theme-mode";
export const THEME_MODES: ThemeMode[] = ["light", "dark"];

export function getThemeModeLabel(mode: ThemeMode) {
  return mode === "light" ? "Light" : "Dark";
}

export function resolveThemeMode(value: string | null | undefined): ThemeMode {
  return value === "dark" ? "dark" : "light";
}
