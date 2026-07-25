"use client";

import { useEffect, useState } from "react";

import {
  deleteCookie,
  getCookieConsent,
  setCookie,
  setCookieConsent,
  THEME_MODE_COOKIE_NAME,
} from "../lib/cookies";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(getCookieConsent() === null);
  }, []);

  const handleAccept = () => {
    setCookieConsent("accepted");
    setCookie(
      THEME_MODE_COOKIE_NAME,
      document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    );
    window.localStorage.removeItem(THEME_MODE_COOKIE_NAME);
    setIsVisible(false);
  };

  const handleDecline = () => {
    setCookieConsent("declined");
    deleteCookie(THEME_MODE_COOKIE_NAME);
    window.localStorage.removeItem(THEME_MODE_COOKIE_NAME);
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <aside className="theme-card fixed bottom-4 right-4 z-[90] w-[min(calc(100vw-2rem),21rem)] rounded-[1.15rem] border p-4 shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
      <p className="theme-text-primary font-fredoka-strong text-base leading-5">
        Cookie preferences
      </p>
      <p className="theme-text-secondary mt-2 font-fredoka-regular text-sm leading-5">
        ColorTile uses a necessary cookie to remember this choice and optional cookies for small preferences like theme.
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleDecline}
          className="theme-button-secondary font-fredoka-strong flex min-h-10 flex-1 items-center justify-center rounded-full px-4 text-sm"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={handleAccept}
          className="theme-button-primary font-fredoka-strong flex min-h-10 flex-1 items-center justify-center rounded-full px-4 text-sm"
        >
          Accept
        </button>
      </div>
    </aside>
  );
}
