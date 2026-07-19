"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
  "font-fredoka-regular h-14 w-full rounded-xl border border-white/45 bg-white/[0.04] px-4 pt-4 text-base text-[#fffaf2] outline-none transition placeholder:text-transparent focus:border-[#fffaf2] focus:ring-4 focus:ring-white/10";

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
        className="font-fredoka-strong pointer-events-none absolute left-4 top-2.5 text-[0.68rem] uppercase tracking-[0.12em] text-white/55"
      >
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/60 transition hover:text-white"
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
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setMode(initialMode);
    setError(null);
    setMessage(null);

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
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [initialMode, isOpen, onClose]);

  function changeMode(nextMode: AccountAuthMode) {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setMessage(null);
    window.setTimeout(() => emailInputRef.current?.focus(), 0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

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

        onClose();
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
      setMessage("Account created. Check your inbox to verify your email.");
      setPassword("");
      setConfirmPassword("");
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
          onClose();
        }
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-md sm:p-6"
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
        className={`font-fredoka-regular relative max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-[1.75rem] border border-white/10 bg-[#070707] px-5 py-8 text-[#fffaf2] shadow-[0_32px_100px_rgba(0,0,0,0.55)] sm:max-h-[calc(100dvh-3rem)] sm:px-10 sm:py-10 ${
          mode === "sign-up" ? "max-w-[46rem]" : "max-w-[38rem]"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close account dialog"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/75 transition hover:bg-white/15 hover:text-white sm:right-6 sm:top-6"
        >
          <HiXMark aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="mx-auto w-full max-w-[36rem]">
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
            className="mx-auto mb-6 flex h-2 w-24 overflow-hidden rounded-full"
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
          <p className="mx-auto mt-3 max-w-md text-center text-sm leading-6 text-white/55">
            {mode === "sign-in"
              ? "Continue your ColorTile progress on any device."
              : "Save your records, streaks, and daily puzzle progress."}
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
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
                className="font-fredoka-strong pointer-events-none absolute left-4 top-2.5 text-[0.68rem] uppercase tracking-[0.12em] text-white/55"
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
                  className="font-fredoka-strong pointer-events-none absolute left-4 top-2.5 text-[0.68rem] uppercase tracking-[0.12em] text-white/55"
                >
                  Player name
                </label>
              </div>
            )}

            <div
              className={
                mode === "sign-up" ? "grid gap-4 sm:grid-cols-2" : undefined
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
              <div className="font-fredoka-strong flex flex-wrap gap-2 text-xs text-white/55">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 ${
                    passwordIsLongEnough
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-white/5"
                  }`}
                >
                  <HiOutlineCheck aria-hidden="true" className="h-4 w-4" />
                  8+ characters
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 ${
                    passwordsMatch
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-white/5"
                  }`}
                >
                  <HiOutlineCheck aria-hidden="true" className="h-4 w-4" />
                  Passwords match
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 pt-1">
                <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-white/70">
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
                  onClick={onClose}
                  className="font-fredoka-strong text-sm text-emerald-300 transition hover:text-emerald-200"
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
            {message && (
              <p
                role="status"
                className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm leading-5 text-emerald-200"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="font-fredoka-strong flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl bg-[#fff8ed] px-6 text-base text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
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
            className="font-fredoka-strong mx-auto mt-6 block text-sm uppercase tracking-[0.08em] text-white/55 transition hover:text-white"
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
