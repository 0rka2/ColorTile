"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { authClient } from "@/app/lib/auth-client";

type RecoveryMode = "forgot-password" | "reset-password";

type AuthCardProps = {
  mode: RecoveryMode;
  resetToken?: string;
};

const copy = {
  "forgot-password": {
    description: "We will email you a secure password-reset link.",
    submit: "Send reset link",
    title: "Reset your password",
  },
  "reset-password": {
    description: "Use at least eight characters for your new password.",
    submit: "Update password",
    title: "Choose a new password",
  },
} satisfies Record<
  RecoveryMode,
  { description: string; submit: string; title: string }
>;

export function AuthCard({ mode, resetToken }: Readonly<AuthCardProps>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(
    mode === "reset-password" && !resetToken
      ? "This password-reset link is invalid or has expired."
      : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pageCopy = copy[mode];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === "reset-password" && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    if (mode === "reset-password" && password.length < 8) {
      setError("Use a password with at least eight characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "forgot-password") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (result.error) {
          setError(result.error.message ?? "The reset email could not be sent.");
          return;
        }

        setMessage(
          "If an account exists for that email, a reset link is on its way.",
        );
        return;
      }

      if (!resetToken) {
        setError("This password-reset link is invalid or has expired.");
        return;
      }

      const result = await authClient.resetPassword({
        newPassword: password,
        token: resetToken,
      });

      if (result.error) {
        setError(result.error.message ?? "Your password could not be reset.");
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setMessage("Password updated. You can now sign in.");
    } catch {
      setError("ColorTile accounts are temporarily unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-md items-center py-10">
      <div className="theme-modal w-full rounded-[2rem] border p-6 shadow-[0_24px_70px_rgba(15,23,42,0.16)] sm:p-9">
        <p className="theme-text-muted font-fredoka-strong text-xs uppercase tracking-[0.24em]">
          Account recovery
        </p>
        <h1 className="theme-text-primary font-fredoka-display mt-3 text-3xl leading-tight tracking-[-0.04em]">
          {pageCopy.title}
        </h1>
        <p className="theme-text-muted mt-3 text-sm leading-6">
          {pageCopy.description}
        </p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          {mode === "forgot-password" ? (
            <label className="block">
              <span className="theme-text-primary font-fredoka-strong text-sm">
                Email
              </span>
              <input
                required
                autoFocus
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="theme-input theme-text-primary mt-2 h-12 w-full rounded-xl border px-4 outline-none focus:border-slate-400"
              />
            </label>
          ) : (
            <>
              <label className="block">
                <span className="theme-text-primary font-fredoka-strong text-sm">
                  New password
                </span>
                <input
                  required
                  autoFocus
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="theme-input theme-text-primary mt-2 h-12 w-full rounded-xl border px-4 outline-none focus:border-slate-400"
                />
              </label>
              <label className="block">
                <span className="theme-text-primary font-fredoka-strong text-sm">
                  Confirm password
                </span>
                <input
                  required
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="theme-input theme-text-primary mt-2 h-12 w-full rounded-xl border px-4 outline-none focus:border-slate-400"
                />
              </label>
            </>
          )}

          {error && (
            <p role="alert" className="theme-text-danger text-sm leading-5">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-sm leading-5 text-emerald-600">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || (mode === "reset-password" && !resetToken)}
            className="theme-button-primary font-fredoka-strong flex h-12 w-full items-center justify-center rounded-full px-6 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Please wait..." : pageCopy.submit}
          </button>
        </form>

        <Link
          href="/?auth=sign-in"
          className="theme-text-muted mx-auto mt-6 block w-fit text-sm underline underline-offset-4"
        >
          Return to sign in
        </Link>
      </div>
    </section>
  );
}
