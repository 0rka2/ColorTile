"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  HiOutlineArrowRight,
  HiOutlineCheck,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiXMark,
} from "react-icons/hi2";

import {
  PLAYER_NAME_MAX_LENGTH,
  PLAYER_NAME_STORAGE_KEY,
  sanitizePlayerName,
} from "@/app/game/player-progress";
import { authClient } from "@/app/lib/auth-client";

export type AccountAuthMode = "sign-in" | "sign-up";

type AccountAuthModalProps = {
  initialMode?: AccountAuthMode;
  isOpen: boolean;
  onClose: () => void;
};

const inputClassName =
  "theme-input font-fredoka-strong h-14 w-full rounded-xl border px-4 pt-4 text-[1.05rem] outline-none transition placeholder:text-transparent focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 sm:h-16 sm:px-5 sm:pt-5";

function PasswordField({
  autoComplete,
  id,
  label,
  onChange,
  value,
}: {
  autoComplete: "current-password" | "new-password";
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        required
        type={isVisible ? "text" : "password"}
        minLength={8}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        className={`${inputClassName} pr-12`}
      />
      <label
        htmlFor={id}
        className="theme-text-muted font-fredoka-strong pointer-events-none absolute left-4 top-2 text-xs uppercase tracking-[0.1em] sm:left-5 sm:top-2.5"
      >
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        className="theme-text-muted absolute inset-y-0 right-0 flex w-12 items-center justify-center transition hover:opacity-75 sm:w-14"
      >
        {isVisible ? (
          <HiOutlineEyeSlash aria-hidden="true" className="h-5 w-5" />
        ) : (
          <HiOutlineEye aria-hidden="true" className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

export function AccountAuthModal({
  initialMode = "sign-in",
  isOpen,
  onClose,
}: Readonly<AccountAuthModalProps>) {
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<AccountAuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeModal = useCallback(() => {
    setMode("sign-in");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setMode(initialMode);
    setError(null);

    setName(
      (currentName) =>
        currentName ||
        window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ||
        "",
    );

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => emailInputRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeModal, initialMode, isOpen]);

  function changeMode(nextMode: AccountAuthMode) {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setError(null);
    window.setTimeout(() => emailInputRef.current?.focus(), 0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const sanitizedName = sanitizePlayerName(name);

    if (mode === "sign-up" && !sanitizedName) {
      setError("Enter a player name.");
      return;
    }

    if (password.length < 8) {
      setError("Use a password with at least eight characters.");
      return;
    }

    if (mode === "sign-up" && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "sign-in") {
        const result = await authClient.signIn.email({
          callbackURL: "/",
          email,
          password,
          rememberMe,
        });

        if (result.error) {
          setError(result.error.message ?? "Email or password is incorrect.");
          return;
        }

        closeModal();
        router.refresh();
        return;
      }

      const result = await authClient.signUp.email({
        callbackURL: "/",
        email,
        name: sanitizedName,
        password,
      });

      if (result.error) {
        setError(result.error.message ?? "Your account could not be created.");
        return;
      }

      window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, sanitizedName);
      closeModal();
      router.refresh();
    } catch {
      setError("ColorTile accounts are temporarily unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const passwordIsLongEnough = password.length >= 8;
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  return createPortal(
    <motion.div
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
      className="theme-overlay fixed inset-0 z-[100] flex items-center justify-center p-3 backdrop-blur-md sm:p-6"
    >
      <motion.section
        layout
        layoutDependency={mode}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-auth-title"
        initial={{ opacity: 0, y: 18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className={`theme-modal theme-text-primary font-fredoka-regular relative max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-[1.75rem] border px-5 py-8 sm:max-h-[calc(100dvh-3rem)] sm:px-12 sm:py-12 ${
          mode === "sign-up" ? "max-w-[52rem]" : "max-w-[44rem]"
        }`}
      >
        <button
          type="button"
          onClick={closeModal}
          aria-label="Close account dialog"
          className="theme-close-button absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border transition sm:right-6 sm:top-6"
        >
          <HiXMark aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="mx-auto w-full max-w-[42rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{
                opacity: 0,
                x: mode === "sign-up" ? 18 : -18,
                scale: 0.985,
              }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{
                opacity: 0,
                x: mode === "sign-up" ? 18 : -18,
                scale: 0.985,
              }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
          <div
            aria-hidden="true"
            className="mx-auto mb-7 flex h-2 w-24 overflow-hidden rounded-full sm:mb-8 sm:w-28"
          >
            {["#fb7185", "#f59e0b", "#facc15", "#34d399", "#60a5fa", "#a78bfa"].map(
              (color) => (
                <span
                  key={color}
                  className="flex-1"
                  style={{ backgroundColor: color }}
                />
              ),
            )}
          </div>

          <h2
            id="account-auth-title"
            className="font-fredoka-display text-center text-[2rem] leading-none tracking-[-0.045em] sm:text-[2.5rem]"
          >
            {mode === "sign-in" ? "Sign in" : "Create your account"}
          </h2>
          <p className="theme-text-muted font-fredoka-light mx-auto mt-4 max-w-lg text-center text-base leading-7">
            {mode === "sign-in"
              ? "Continue your ColorTile progress on any device."
              : "Save your records, streaks, and daily puzzle progress."}
          </p>

          <form className="mt-9 space-y-5 sm:mt-10 sm:space-y-6" onSubmit={handleSubmit}>
            <div className="relative">
              <input
                id={`${mode}-email`}
                ref={emailInputRef}
                required
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                className={inputClassName}
              />
              <label
                htmlFor={`${mode}-email`}
                className="theme-text-muted font-fredoka-strong pointer-events-none absolute left-4 top-2 text-xs uppercase tracking-[0.1em] sm:left-5 sm:top-2.5"
              >
                Email
              </label>
            </div>

            {mode === "sign-up" && (
              <div className="relative">
                <input
                  id="sign-up-player-name"
                  required
                  type="text"
                  autoComplete="nickname"
                  maxLength={PLAYER_NAME_MAX_LENGTH}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Player name"
                  className={inputClassName}
                />
                <label
                  htmlFor="sign-up-player-name"
                  className="theme-text-muted font-fredoka-strong pointer-events-none absolute left-4 top-2 text-xs uppercase tracking-[0.1em] sm:left-5 sm:top-2.5"
                >
                  Player name
                </label>
              </div>
            )}

            <div
              className={
                mode === "sign-up" ? "grid gap-5 sm:grid-cols-2 sm:gap-6" : undefined
              }
            >
              <PasswordField
                id={`${mode}-password`}
                label="Password"
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                value={password}
                onChange={setPassword}
              />

              {mode === "sign-up" && (
                <PasswordField
                  id="sign-up-confirm-password"
                  label="Confirm password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
              )}
            </div>

            {mode === "sign-up" ? (
              <div className="theme-text-muted font-fredoka-strong flex flex-wrap gap-2 text-sm">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 ${
                    passwordIsLongEnough
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "theme-chip"
                  }`}
                >
                  <HiOutlineCheck aria-hidden="true" className="h-4 w-4" />
                  8+ characters
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 ${
                    passwordsMatch
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "theme-chip"
                  }`}
                >
                  <HiOutlineCheck aria-hidden="true" className="h-4 w-4" />
                  Passwords match
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-5 pt-1 sm:pt-2">
                <label className="theme-text-secondary font-fredoka-strong inline-flex cursor-pointer items-center gap-2.5 text-base">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 accent-emerald-400"
                  />
                  Keep me signed in
                </label>
                <Link
                  href="/forgot-password"
                  onClick={closeModal}
                  className="font-fredoka-strong text-base text-emerald-300 transition hover:text-emerald-200"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm leading-5 text-red-200"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="theme-button-primary font-fredoka-strong flex h-14 w-full items-center justify-center gap-2 rounded-xl px-6 text-base transition disabled:cursor-not-allowed disabled:opacity-60 sm:h-16 sm:text-lg"
            >
              <span>
                {isSubmitting
                  ? "Please wait..."
                  : mode === "sign-in"
                    ? "Sign in"
                    : "Create account"}
              </span>
              {!isSubmitting && (
                <HiOutlineArrowRight aria-hidden="true" className="h-5 w-5" />
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={() =>
              changeMode(mode === "sign-in" ? "sign-up" : "sign-in")
            }
            className="theme-text-muted font-fredoka-strong mx-auto mt-8 block text-base uppercase tracking-[0.06em] transition hover:opacity-75 sm:mt-10"
          >
            {mode === "sign-in"
              ? "New to ColorTile? Create an account"
              : "Already have an account? Sign in"}
          </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.section>
    </motion.div>,
    document.body,
  );
}
