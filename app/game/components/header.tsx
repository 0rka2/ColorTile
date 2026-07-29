"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import Link from "next/link";
import { FaGem, FaRegUser } from "react-icons/fa";
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
import { resolveThemeMode } from "../settings-options";
import type { ThemeMode } from "../settings-options";
import {
  CHROMA_BALANCE_UPDATED_EVENT,
  formatChromaBalance,
} from "../chroma";

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
  const [chromaBalance, setChromaBalance] = useState<number | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] =
    useState<AccountAuthMode>("sign-in");
  const { data: session } = authClient.useSession();

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  useLayoutEffect(() => {
    try {
      const storedThemeMode = getCookieConsent() === "accepted"
        ? getCookie(THEME_MODE_COOKIE_NAME)
        : null;

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

  useEffect(() => {
    const userId = session?.user.id;
    setChromaBalance(null);

    if (!userId) {
      return;
    }

    const controller = new AbortController();

    const loadChromaBalance = async () => {
      try {
        const response = await fetch("/api/account/chroma", {
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as { balance?: unknown };
        if (
          typeof result.balance === "number" &&
          Number.isInteger(result.balance) &&
          result.balance >= 0
        ) {
          setChromaBalance(result.balance);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Chroma balance could not be loaded.", error);
        }
      }
    };

    const handleBalanceUpdate = (event: Event) => {
      const balance = (event as CustomEvent<unknown>).detail;
      if (
        typeof balance === "number" &&
        Number.isInteger(balance) &&
        balance >= 0
      ) {
        setChromaBalance(balance);
      }
    };

    void loadChromaBalance();
    window.addEventListener(
      CHROMA_BALANCE_UPDATED_EVENT,
      handleBalanceUpdate,
    );

    return () => {
      controller.abort();
      window.removeEventListener(
        CHROMA_BALANCE_UPDATED_EVENT,
        handleBalanceUpdate,
      );
    };
  }, [session?.user.id]);

  return (
    <>
      <header ref={ref} className="game-header flex min-h-11 items-center justify-between gap-1">
      <div className="flex min-w-0 flex-nowrap items-center gap-1 sm:gap-[clamp(1rem,2.6vw,2rem)]">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          className="theme-text-primary flex h-11 w-11 shrink-0 items-center justify-center text-xl leading-none sm:text-[clamp(1.5rem,1.98vw,1.595rem)]"
        >
          {"\u2630"}
        </button>

        <div className="relative min-w-0">
          <div className="game-logo-surface theme-header-surface flex min-h-11 items-center rounded-[clamp(0.935rem,1.65vw,1.43rem)] border px-1 backdrop-blur sm:px-[clamp(0.715rem,1.54vw,1.045rem)]">
            <button
              type="button"
              onClick={onLogoClick}
              aria-label="Go to ColorTile home"
              className="game-logo font-fredoka-display theme-text-primary flex min-h-11 min-w-0 items-center text-[1.55rem] font-black leading-none tracking-[-0.05em] sm:text-[clamp(2rem,2.5vw,2.5rem)]"
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

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-[0.875rem]">
        {session ? (
          <>
            <span
              aria-label={
                chromaBalance === null
                  ? "Chroma balance unavailable"
                  : `${chromaBalance} Chroma`
              }
              aria-live="polite"
              className="chroma-counter header-action-button theme-header-surface theme-text-primary font-fredoka-strong flex h-11 min-w-11 max-w-[3.5rem] shrink-0 items-center justify-center gap-1 rounded-full border px-1.5 text-[0.7rem] leading-none shadow-[0_14px_26px_rgba(15,23,42,0.16)] max-[400px]:gap-0.5 max-[400px]:px-1 max-[400px]:text-[0.62rem] sm:h-[3.3rem] sm:max-w-[9rem] sm:gap-2 sm:px-3 sm:text-sm"
            >
              <span
                aria-hidden="true"
                className="chroma-gem flex h-5 w-5 shrink-0 items-center justify-center rounded-lg text-[0.58rem] text-white max-[400px]:h-4 max-[400px]:w-4 sm:h-7 sm:w-7 sm:rounded-[0.65rem] sm:text-xs"
              >
                <FaGem />
              </span>
              <span className="sm:hidden">
                {chromaBalance === null
                  ? "—"
                  : formatChromaBalance(chromaBalance, true)}
              </span>
              <span className="hidden whitespace-nowrap sm:inline">
                {chromaBalance === null
                  ? "—"
                  : formatChromaBalance(chromaBalance)}
              </span>
            </span>
            <Link
              href="/account"
              aria-label={`Open ${session.user.name}'s account`}
              className="header-action-button account-action-button theme-header-surface theme-text-primary flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_14px_26px_rgba(15,23,42,0.16)] sm:h-[3.3rem] sm:w-auto sm:max-w-[12rem] sm:gap-2 sm:px-3.5"
            >
              <span
                aria-hidden="true"
                className="account-action-avatar font-fredoka-strong flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm uppercase leading-none sm:h-8 sm:w-8"
              >
                {session.user.name.trim().charAt(0) || "P"}
              </span>
              <span className="hidden truncate font-fredoka-strong text-sm sm:inline sm:text-base">
                {session.user.name}
              </span>
            </Link>
          </>
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
            className="header-action-button account-action-button theme-header-surface theme-text-primary flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_14px_26px_rgba(15,23,42,0.16)] sm:h-[3.3rem] sm:w-auto sm:gap-2 sm:px-3.5"
          >
            <FaRegUser
              aria-hidden="true"
              className="pointer-events-none h-[1.1rem] w-[1.1rem] shrink-0"
            />
            <span className="hidden font-fredoka-strong whitespace-nowrap text-sm sm:inline sm:text-base">
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
          className="header-action-button theme-header-surface theme-text-primary flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_14px_26px_rgba(15,23,42,0.16)] sm:h-[3.85rem] sm:w-[3.85rem]"
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
