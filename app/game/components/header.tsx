"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import Link from "next/link";
import { FaRegUser } from "react-icons/fa";
import { HiOutlineSpeakerWave, HiOutlineSpeakerXMark } from "react-icons/hi2";

import { authClient } from "../../lib/auth-client";
import {
  AccountAuthModal,
  type AccountAuthMode,
} from "../../account/components/account-auth-modal";
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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] =
    useState<AccountAuthMode>("sign-in");
  const { data: session } = authClient.useSession();

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

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

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const requestedMode = searchParams.get("auth");

    if (requestedMode !== "sign-in" && requestedMode !== "sign-up") {
      return;
    }

    setAuthModalMode(requestedMode);
    setAuthModalOpen(true);
    searchParams.delete("auth");

    const nextQuery = searchParams.toString();
    const nextUrl = `${window.location.pathname}${
      nextQuery ? `?${nextQuery}` : ""
    }${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, []);

  return (
    <>
      <header ref={ref} className="game-header flex items-center justify-between gap-1.5 pt-2 sm:gap-[clamp(0.605rem,1.32vw,0.99rem)]">
      <div className="flex flex-nowrap items-center gap-2 sm:gap-[clamp(1rem,2.6vw,2rem)]">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          className="theme-text-primary shrink-0 text-xl leading-none sm:text-[clamp(1.5rem,1.98vw,1.595rem)]"
        >
          {"\u2630"}
        </button>

        <div className="relative">
          <div className="game-logo-surface theme-header-surface flex items-center rounded-[clamp(0.935rem,1.65vw,1.43rem)] border px-1 py-2 backdrop-blur sm:px-[clamp(0.715rem,1.54vw,1.045rem)] sm:py-[clamp(0.495rem,1.1vw,0.825rem)]">
            <button
              type="button"
              onClick={onLogoClick}
              aria-label="Go to ColorTile home"
              className="game-logo font-fredoka-display theme-text-primary shrink-0 text-2xl font-black leading-none tracking-[-0.05em] sm:text-[clamp(2rem,2.5vw,2.5rem)]"
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

      <div className="flex shrink-0 items-center gap-1 sm:gap-[0.875rem]">
        {session ? (
          <Link
            href="/account"
            aria-label={`Open ${session.user.name}'s account`}
            className="header-action-button account-action-button theme-header-surface theme-text-primary flex h-10 max-w-[6.5rem] items-center gap-1 rounded-full border px-2 shadow-[0_14px_26px_rgba(15,23,42,0.16)] sm:h-[3.3rem] sm:max-w-[12rem] sm:gap-2 sm:px-3.5"
          >
            <span
              aria-hidden="true"
              className="account-action-avatar font-fredoka-strong flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm uppercase leading-none"
            >
              {session.user.name.trim().charAt(0) || "P"}
            </span>
            <span className="truncate font-fredoka-strong text-sm sm:text-base">
              {session.user.name}
            </span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAuthModalMode("sign-in");
              setAuthModalOpen(true);
            }}
            aria-label="Sign in or create an account"
            aria-haspopup="dialog"
            aria-expanded={authModalOpen}
            className="header-action-button account-action-button theme-header-surface theme-text-primary flex h-10 items-center gap-1 rounded-full border px-2 shadow-[0_14px_26px_rgba(15,23,42,0.16)] sm:h-[3.3rem] sm:gap-2 sm:px-3.5"
          >
            <FaRegUser
              aria-hidden="true"
              className="pointer-events-none h-[1.1rem] w-[1.1rem] shrink-0"
            />
            <span className="font-fredoka-strong whitespace-nowrap text-sm sm:text-base">
              Sign in
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            const nextSoundIsEnabled = !soundIsEnabled;
            setSoundIsEnabled(nextSoundIsEnabled);
            setSoundEnabled(nextSoundIsEnabled);
          }}
          aria-label={`${soundIsEnabled ? "Turn off" : "Turn on"} sound`}
          aria-pressed={!soundIsEnabled}
          className="header-action-button theme-header-surface theme-text-primary flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_14px_26px_rgba(15,23,42,0.16)] sm:h-[3.85rem] sm:w-[3.85rem]"
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
      <AccountAuthModal
        initialMode={authModalMode}
        isOpen={authModalOpen}
        onClose={closeAuthModal}
      />
    </>
  );
});
