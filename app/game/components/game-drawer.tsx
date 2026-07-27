import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { FiHeart } from "react-icons/fi";

import type { AppView } from "../../views/app-view";
import type { ThemeMode } from "../settings-options";

function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" />
    </svg>
  );
}

function PrivacyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" />
      <path d="M9.5 12l2 2 3-4" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.65rem] w-[1.65rem] pointer-events-none" // 👈 add this
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.65rem] w-[1.65rem] pointer-events-none" // 👈 add this
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export function ThemeToggle({
  onThemeModeChange,
  themeMode,
}: Readonly<{
  onThemeModeChange: (themeMode: ThemeMode) => void;
  themeMode: ThemeMode;
}>) {
  return (
    <button
      type="button"
      onClick={() => {
  // buttonClickSound.stop();
  // buttonClickSound.play();
  onThemeModeChange(themeMode === "light" ? "dark" : "light");
}}
      aria-label={`Switch to ${themeMode === "light" ? "dark" : "light"} theme`}
      className="header-action-button theme-header-surface flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_14px_26px_rgba(15,23,42,0.16)] sm:h-[3.85rem] sm:w-[3.85rem]"
    >
      <motion.span
        key={themeMode}
        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {themeMode === "dark" ? <MoonIcon /> : <SunIcon />}
      </motion.span>
    </button>
  );
}

type GameDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onNavigateView: (view: AppView) => void;
};

export function GameDrawer({
  isOpen,
  onClose,
  onNavigateView,
}: Readonly<GameDrawerProps>) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const handleNavigate = (view: AppView) => {
    onNavigateView(view);
    onClose();
  };

  return (
    <>
      {createPortal(
        <motion.div
          className="theme-overlay fixed inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          onClick={onClose}
          aria-hidden="true"
        />,
        document.body,
      )}
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
        className="theme-modal absolute left-0 top-full z-50 mt-2 w-[16.5rem] max-w-[calc(100vw-1.25rem)] rounded-[1.35rem] border p-4 shadow-[0_22px_48px_rgba(15,23,42,0.18)] sm:w-[17.5rem]"
        initial={{ opacity: 0, y: -10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <div className="flex flex-col gap-2">
           <a
  href="https://docs.google.com/forms/d/e/1FAIpQLSdp1wH5CwgKNMWrRGUOHGrHrMTOM2mpm2Q69OkaxSFPpn_8Ng/viewform"
  target="_blank"
  rel="noopener noreferrer"
  onClick={onClose}
  className="theme-button-secondary flex items-center gap-3 rounded-[1rem] px-4 py-3 text-left"
>
  <span className="theme-text-secondary">
    <MessageIcon />
  </span>
  <span className="font-fredoka-strong text-[1rem] leading-none">
    Give Feedback
  </span>
</a>


            <button
              type="button"
              onClick={() => handleNavigate("about")}
              className="theme-button-secondary flex items-center gap-3 rounded-[1rem] px-4 py-3 text-left"
            >
              <span className="theme-text-secondary">
                <InfoIcon />
              </span>
              <span className="font-fredoka-strong text-[1rem] leading-none">About</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigate("privacy")}
              className="theme-button-secondary flex items-center gap-3 rounded-[1rem] px-4 py-3 text-left"
            >
              <span className="theme-text-secondary">
                <PrivacyIcon />
              </span>
              <span className="font-fredoka-strong text-[1rem] leading-none">Privacy Policy</span>
            </button>

            


            <button
              type="button"
              onClick={() => handleNavigate("tutorial")}
              className="theme-button-secondary flex items-center gap-3 rounded-[1rem] px-4 py-3 text-left"
            >
              <span className="theme-text-secondary">
                <BookIcon />
              </span>
              <span className="font-fredoka-strong text-[1rem] leading-none">Tutorial</span>
            </button>

         <a
  href="https://ko-fi.com/orka67"
  target="_blank"
  rel="noopener noreferrer"
  className="theme-button-secondary flex items-center gap-3 rounded-[1rem] px-4 py-3 text-left"
>
  <span className="theme-text-secondary">
    <FiHeart />
  </span>
  <span className="font-fredoka-strong text-[1rem] leading-none">
    Buy me a coffee
  </span>
</a>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
