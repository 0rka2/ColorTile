"use client";

import { forwardRef, useEffect, useLayoutEffect, useState } from "react";

import type { AppView } from "./app-view";
import { GradientText } from "../components/ui/gradient-text";
import { GameDrawer, ThemeToggle } from "./game-components";
import { resolveThemeMode, THEME_MODE_STORAGE_KEY } from "./settings-options";
import type { ThemeMode } from "./settings-options";

type HeaderProps = {
  onLogoClick: () => void;
  onNavigateView: (view: AppView) => void;
};

export const Header = forwardRef<HTMLElement, HeaderProps>(function Header(
  { onLogoClick, onNavigateView },
  ref,
) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");

  useLayoutEffect(() => {
    try {
      setThemeMode(resolveThemeMode(window.localStorage.getItem(THEME_MODE_STORAGE_KEY)));
    } catch {
      setThemeMode("light");
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;

    try {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
    } catch {
      // Keep the selected theme in memory if storage is unavailable.
    }
  }, [themeMode]);

  return (
    <header ref={ref} className="flex items-start justify-between gap-[clamp(0.55rem,1.2vw,0.9rem)]">
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="relative">
          <div className="theme-header-surface flex items-center gap-2 rounded-[clamp(0.85rem,1.5vw,1.3rem)] border px-[clamp(0.65rem,1.4vw,0.95rem)] py-[clamp(0.45rem,1vw,0.75rem)] backdrop-blur sm:gap-2.5">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              className="theme-text-primary text-[clamp(1.1rem,1.8vw,1.45rem)] leading-none"
            >
              {"\u2630"}
            </button>

            <button
              type="button"
              onClick={onLogoClick}
              aria-label="Go to ColorTile home"
              className="font-fredoka-display theme-text-primary text-[clamp(1.35rem,2.4vw,2.1rem)] font-black leading-none tracking-[-0.05em]"
            >
              <GradientText className="px-1">ColorTile</GradientText>
            </button>
          </div>
          <GameDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onNavigateView={onNavigateView}
          />
        </div>
      </div>

      <div className="shrink-0">
        <ThemeToggle onThemeModeChange={setThemeMode} themeMode={themeMode} />
      </div>
    </header>
  );
});
