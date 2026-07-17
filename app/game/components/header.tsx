"use client";

import { forwardRef, useEffect, useLayoutEffect, useState } from "react";
import { HiOutlineSpeakerWave, HiOutlineSpeakerXMark } from "react-icons/hi2";

import type { AppView } from "../../views/app-view";
import { GradientText } from "../../../components/ui/gradient-text";
import { GameDrawer, ThemeToggle } from "./game-drawer";
import {
  getCookie,
  getCookieConsent,
  setCookie,
  THEME_MODE_COOKIE_NAME,
} from "../../lib/cookies";
import { getSoundEnabled, setSoundEnabled } from "../../lib/sounds";
import { resolveThemeMode, THEME_MODE_STORAGE_KEY } from "../settings-options";
import type { ThemeMode } from "../settings-options";

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
  const [soundIsEnabled, setSoundIsEnabled] = useState(true);

  useLayoutEffect(() => {
    try {
      const storedThemeMode =
        getCookie(THEME_MODE_COOKIE_NAME) ?? window.localStorage.getItem(THEME_MODE_STORAGE_KEY);

      setThemeMode(resolveThemeMode(storedThemeMode));
      setSoundIsEnabled(getSoundEnabled());
    } catch {
      setThemeMode("light");
      setSoundIsEnabled(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;

    if (getCookieConsent() === "accepted") {
      setCookie(THEME_MODE_COOKIE_NAME, themeMode);
    }
  }, [themeMode]);

  return (
    <header ref={ref} className="game-header flex items-start justify-between gap-[clamp(0.605rem,1.32vw,0.99rem)]">
      <div className="flex flex-nowrap items-center gap-[clamp(1rem,2.6vw,2rem)]">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          className="theme-text-primary shrink-0 text-[clamp(1.5rem,1.98vw,1.595rem)] leading-none"
        >
          {"\u2630"}
        </button>

        <div className="relative">
          <div className="game-logo-surface theme-header-surface flex items-center rounded-[clamp(0.935rem,1.65vw,1.43rem)] border px-[clamp(0.715rem,1.54vw,1.045rem)] py-[clamp(0.495rem,1.1vw,0.825rem)] backdrop-blur">
            <button
              type="button"
              onClick={onLogoClick}
              aria-label="Go to ColorTile home"
              className="game-logo font-fredoka-display theme-text-primary shrink-0 text-[clamp(2rem,2.5vw,2.5rem)] font-black leading-none tracking-[-0.05em]"
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

      <div className="flex shrink-0 items-center gap-[0.75rem] sm:gap-[0.875rem]">
        <button
          type="button"
          onClick={() => {
            const nextSoundIsEnabled = !soundIsEnabled;
            setSoundIsEnabled(nextSoundIsEnabled);
            setSoundEnabled(nextSoundIsEnabled);
          }}
          aria-label={`${soundIsEnabled ? "Turn off" : "Turn on"} sound`}
          aria-pressed={!soundIsEnabled}
          className="header-action-button theme-header-surface theme-text-primary flex h-[3.3rem] w-[3.3rem] items-center justify-center rounded-full border shadow-[0_14px_26px_rgba(15,23,42,0.16)] sm:h-[3.85rem] sm:w-[3.85rem]"
        >
          {soundIsEnabled ? (
            <HiOutlineSpeakerWave aria-hidden="true" className="pointer-events-none h-[1.65rem] w-[1.65rem]" />
          ) : (
            <HiOutlineSpeakerXMark aria-hidden="true" className="pointer-events-none h-[1.65rem] w-[1.65rem]" />
          )}
        </button>
        <ThemeToggle onThemeModeChange={setThemeMode} themeMode={themeMode} />
      </div>
    </header>
  );
});
