"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { PlayerProgress } from "@/app/game/player-progress";
import {
  BEST_STATS_STORAGE_KEY,
  DAILY_PUZZLE_STORAGE_KEY,
  ENDLESS_STATS_STORAGE_KEY,
  PLAYER_NAME_MAX_LENGTH,
  PLAYER_NAME_STORAGE_KEY,
  sanitizePlayerName,
} from "@/app/game/player-progress";
import { authClient } from "@/app/lib/auth-client";

type AccountDashboardProps = {
  createdAt: string;
  email: string;
  emailVerified: boolean;
  name: string;
  progress: PlayerProgress;
};

function getLowestValue(values: Array<number | undefined>) {
  const available = values.filter(
    (value): value is number => value !== undefined,
  );
  return available.length > 0 ? Math.min(...available) : null;
}

function formatTime(seconds: number | null) {
  if (seconds === null) {
    return "--";
  }

  return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
}

export function AccountDashboard({
  createdAt,
  email,
  emailVerified,
  name: initialName,
  progress,
}: Readonly<AccountDashboardProps>) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailChangeMessage, setEmailChangeMessage] = useState<string | null>(
    null,
  );
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(
    null,
  );
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(
    null,
  );

  const bestRecords = Object.values(progress.bestStats);
  const fastestTime = getLowestValue(
    bestRecords.map((record) => record?.bestSolveTime),
  );
  const fewestMoves = getLowestValue(
    bestRecords.map((record) => record?.fewestMoves),
  );
  const dailyBest = progress.dailyRecord?.bestSolveTime ?? null;

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setProfileMessage(null);
    const sanitizedName = sanitizePlayerName(name);

    if (!sanitizedName) {
      setProfileError("Enter a player name.");
      return;
    }

    setIsSavingProfile(true);
    const result = await authClient.updateUser({ name: sanitizedName });
    setIsSavingProfile(false);

    if (result.error) {
      setProfileError(result.error.message ?? "Your player name could not be saved.");
      return;
    }

    setName(sanitizedName);
    setSavedName(sanitizedName);
    window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, sanitizedName);
    setProfileMessage("Player name saved.");
    setIsEditingName(false);
    router.refresh();
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSecurityError(null);
    setSecurityMessage(null);

    if (newPassword.length < 8) {
      setSecurityError("Use a password with at least eight characters.");
      return;
    }

    setIsSavingPassword(true);
    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setIsSavingPassword(false);

    if (result.error) {
      setSecurityError(result.error.message ?? "Your password could not be changed.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setIsChangingPassword(false);
    setSecurityMessage("Password changed. Other devices have been signed out.");
  }

  async function changeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailChangeError(null);
    setEmailChangeMessage(null);

    const normalizedEmail = newEmail.trim().toLowerCase();

    if (normalizedEmail === email.toLowerCase()) {
      setEmailChangeError("Enter a different email address.");
      return;
    }

    setIsSavingEmail(true);

    try {
      const result = await authClient.changeEmail({
        newEmail: normalizedEmail,
        callbackURL: "/account",
      });

      if (result.error) {
        setEmailChangeError(
          result.error.message ?? "Your email address could not be changed.",
        );
        return;
      }

      setNewEmail("");
      setIsChangingEmail(false);
      setEmailChangeMessage(
        `Check ${normalizedEmail} to confirm your new email address.`,
      );
    } catch {
      setEmailChangeError(
        "Your email address could not be changed. Please try again.",
      );
    } finally {
      setIsSavingEmail(false);
    }
  }

  async function sendVerificationEmail() {
    setVerificationError(null);
    setVerificationMessage(null);
    setIsSendingVerification(true);

    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/account",
      });

      if (result.error) {
        setVerificationError(
          result.error.message ?? "The verification email could not be sent.",
        );
        return;
      }

      setVerificationMessage("Verification email sent. Check your inbox.");
    } catch {
      setVerificationError(
        "The verification email could not be sent. Please try again.",
      );
    } finally {
      setIsSendingVerification(false);
    }
  }

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeleteAccountError(null);

    if (deleteConfirmation !== savedName) {
      setDeleteAccountError(`Type ${savedName} exactly to continue.`);
      return;
    }

    setIsDeletingAccount(true);

    try {
      const result = await authClient.deleteUser();

      if (result.error) {
        setDeleteAccountError(
          result.error.message ?? "Your account could not be deleted.",
        );
        return;
      }

      [
        PLAYER_NAME_STORAGE_KEY,
        BEST_STATS_STORAGE_KEY,
        DAILY_PUZZLE_STORAGE_KEY,
        ENDLESS_STATS_STORAGE_KEY,
      ].forEach((key) => window.localStorage.removeItem(key));

      router.replace("/");
      router.refresh();
    } catch {
      setDeleteAccountError(
        "Your account could not be deleted. Please try again.",
      );
    } finally {
      setIsDeletingAccount(false);
    }
  }

  return (
    <div className="py-10 sm:py-14">
      <div className="mb-8">
        <p className="theme-text-muted font-fredoka-strong text-sm uppercase tracking-[0.2em]">
          Player account
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="theme-text-primary font-fredoka-display text-4xl tracking-[-0.05em] sm:text-5xl">
            Hi, {savedName}
          </h1>
          {!isEditingName && (
            <button
              type="button"
              onClick={() => {
                setProfileError(null);
                setProfileMessage(null);
                setIsEditingName(true);
              }}
              className="theme-button-secondary font-fredoka-strong rounded-full border border-[var(--border-soft)] px-4 py-2 text-base"
            >
              Edit
            </button>
          )}
        </div>
        {isEditingName && (
          <form
            className="mt-4 flex max-w-md flex-wrap items-start gap-3"
            onSubmit={updateProfile}
          >
            <label className="min-w-56 flex-1">
              <span className="sr-only">Player name</span>
              <input
                required
                autoFocus
                type="text"
                autoComplete="nickname"
                maxLength={PLAYER_NAME_MAX_LENGTH}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="theme-input theme-text-primary h-12 w-full rounded-xl border px-4 text-base outline-none focus:border-slate-400"
              />
            </label>
            <button
              type="submit"
              disabled={isSavingProfile}
              className="theme-button-primary font-fredoka-strong rounded-full px-5 py-2.5 text-base disabled:opacity-60"
            >
              {isSavingProfile ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setName(savedName);
                setProfileError(null);
                setIsEditingName(false);
              }}
              className="theme-button-secondary font-fredoka-strong rounded-full px-5 py-2.5 text-base"
            >
              Cancel
            </button>
            {profileError && (
              <p role="alert" className="theme-text-danger w-full text-base">
                {profileError}
              </p>
            )}
          </form>
        )}
        {profileMessage && (
          <p role="status" className="mt-3 text-base text-emerald-600">
            {profileMessage}
          </p>
        )}
        <p className="theme-text-muted mt-3 text-base">
          Member since{" "}
          {new Intl.DateTimeFormat("en", {
            dateStyle: "medium",
          }).format(new Date(createdAt))}
        </p>
      </div>

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Player statistics
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            {
              title: "Leaderboard Stats",
              stats: [
                {
                  label: "Endless clears",
                  value: progress.endlessStats.clears,
                  valueClassName: "text-blue-500",
                },
                {
                  label: "Three-star clears",
                  value: progress.endlessStats.threeStarClears,
                  valueClassName: "text-amber-500",
                },
                {
                  label: "Most Endless clears in a row",
                  value: progress.endlessStats.bestStreak,
                  valueClassName: "text-violet-500",
                },
              ],
            },
            {
              title: "Personal Records",
              stats: [
                {
                  label: "Fastest solve across all modes",
                  value: formatTime(fastestTime),
                  valueClassName: "text-rose-500",
                },
                {
                  label: "Fewest moves across all modes",
                  value: fewestMoves ?? "--",
                  valueClassName: "text-emerald-500",
                },
                {
                  label: "Fastest daily puzzle solve",
                  value: formatTime(dailyBest),
                  valueClassName: "text-cyan-500",
                },
              ],
            },
          ].map(({ title, stats }) => (
            <div
              key={title}
              className="theme-modal overflow-hidden rounded-[1.5rem] border p-6 sm:p-7"
            >
              <h3 className="theme-text-primary font-fredoka-display text-2xl">
                {title}
              </h3>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center sm:gap-3">
                {stats.map(({ label, value, valueClassName }) => (
                  <div
                    key={label}
                    className="theme-card rounded-[1.1rem] border px-2 py-5 sm:px-3"
                  >
                    <p
                      className={`font-fredoka-display text-3xl leading-none sm:text-4xl ${valueClassName}`}
                    >
                      {value}
                    </p>
                    <p className="theme-text-muted font-fredoka-regular mt-3 text-sm leading-5 sm:text-base">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="theme-modal rounded-[1.75rem] border p-6 sm:p-8">
          <h2 className="theme-text-primary font-fredoka-display text-2xl">
            Achievements
          </h2>
        </section>

        <section className="theme-modal rounded-[1.75rem] border p-6 sm:p-8">
          <h2 className="theme-text-primary font-fredoka-display text-2xl">
            Privacy
          </h2>
          <div className="mt-6 space-y-5">
            <div>
              <p className="theme-text-primary font-fredoka-strong text-base">
                Email
              </p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="theme-text-muted min-w-0 break-all text-base">
                  {email}
                </p>
                {!isChangingEmail && (
                  <button
                    type="button"
                    aria-label="Change email address"
                    onClick={() => {
                      setEmailChangeError(null);
                      setEmailChangeMessage(null);
                      setIsChangingEmail(true);
                    }}
                    className="theme-button-secondary font-fredoka-strong shrink-0 rounded-full border border-[var(--border-soft)] px-4 py-2 text-base"
                  >
                    Change
                  </button>
                )}
              </div>
              <div className="theme-text-muted mt-3 flex flex-wrap items-center gap-2.5 text-sm">
                <span
                  className={`font-fredoka-strong ${
                    emailVerified
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {emailVerified ? "Verified" : "Unverified"}
                </span>
                {!emailVerified && (
                  <button
                    type="button"
                    onClick={sendVerificationEmail}
                    disabled={isSendingVerification}
                    className="theme-button-secondary font-fredoka-strong rounded-full border border-[var(--border-soft)] px-3.5 py-2 text-sm disabled:opacity-60"
                  >
                    {isSendingVerification ? "Sending..." : "Verify email"}
                  </button>
                )}
              </div>
              {isChangingEmail && (
                <form className="mt-4 space-y-3" onSubmit={changeEmail}>
                  <label className="block">
                    <span className="theme-text-primary font-fredoka-strong text-base">
                      New email
                    </span>
                    <input
                      required
                      autoFocus
                      type="email"
                      autoComplete="email"
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      className="theme-input theme-text-primary mt-2 h-12 w-full rounded-xl border px-4 text-base outline-none focus:border-slate-400"
                    />
                  </label>
                  {emailChangeError && (
                    <p role="alert" className="theme-text-danger text-base">
                      {emailChangeError}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={isSavingEmail}
                      className="theme-button-primary font-fredoka-strong rounded-full px-5 py-2.5 text-base disabled:opacity-60"
                    >
                      {isSavingEmail ? "Sending..." : "Confirm email"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewEmail("");
                        setEmailChangeError(null);
                        setIsChangingEmail(false);
                      }}
                      className="theme-button-secondary font-fredoka-strong rounded-full px-5 py-2.5 text-base"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
              {emailChangeMessage && (
                <p role="status" className="mt-3 text-base text-emerald-600">
                  {emailChangeMessage}
                </p>
              )}
              {verificationError && (
                <p role="alert" className="theme-text-danger mt-3 text-base">
                  {verificationError}
                </p>
              )}
              {verificationMessage && (
                <p role="status" className="mt-3 text-base text-emerald-600">
                  {verificationMessage}
                </p>
              )}
            </div>
            <div className="border-t border-[var(--border-soft)] pt-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="theme-text-primary font-fredoka-strong text-base">
                    Password
                  </p>
                  <p
                    className="theme-text-muted mt-2 text-base"
                    aria-label="Password hidden"
                  >
                    ••••••••
                  </p>
                </div>
                {!isChangingPassword && (
                  <button
                    type="button"
                    aria-label="Change password"
                    onClick={() => {
                      setSecurityError(null);
                      setSecurityMessage(null);
                      setIsChangingPassword(true);
                    }}
                    className="theme-button-secondary font-fredoka-strong shrink-0 rounded-full border border-[var(--border-soft)] px-4 py-2 text-base"
                  >
                    Change
                  </button>
                )}
              </div>
            </div>
            {isChangingPassword && (
              <form className="space-y-4" onSubmit={changePassword}>
                <label className="block">
                  <span className="theme-text-primary font-fredoka-strong text-base">
                    Current password
                  </span>
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="theme-input theme-text-primary mt-2 h-12 w-full rounded-xl border px-4 text-base outline-none focus:border-slate-400"
                  />
                </label>
                <label className="block">
                  <span className="theme-text-primary font-fredoka-strong text-base">
                    New password
                  </span>
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="theme-input theme-text-primary mt-2 h-12 w-full rounded-xl border px-4 text-base outline-none focus:border-slate-400"
                  />
                </label>
                {securityError && (
                  <p role="alert" className="theme-text-danger text-base">
                    {securityError}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="theme-button-primary font-fredoka-strong rounded-full px-6 py-3 disabled:opacity-60"
                  >
                    {isSavingPassword ? "Updating..." : "Save password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPassword("");
                      setNewPassword("");
                      setSecurityError(null);
                      setIsChangingPassword(false);
                    }}
                    className="theme-button-secondary font-fredoka-strong rounded-full px-6 py-3"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            {securityMessage && (
              <p role="status" className="text-base text-emerald-600">
                {securityMessage}
              </p>
            )}
            <div className="border-t border-[var(--border-soft)] pt-5">
              <button
                type="button"
                onClick={signOut}
                className="theme-button-secondary font-fredoka-strong rounded-full border border-[var(--border-soft)] px-6 py-3"
              >
                Sign out
              </button>
            </div>
          </div>
        </section>
      </div>

      <section
        aria-labelledby="delete-account-heading"
        className="mt-10 rounded-[1.75rem] border border-red-500/35 bg-red-500/5 p-6 sm:p-8"
      >
        <h2
          id="delete-account-heading"
          className="theme-text-danger font-fredoka-display text-2xl"
        >
          Delete account
        </h2>
        <p className="theme-text-muted mt-3 max-w-2xl text-base leading-7">
          Your sign-in, account profile, and synced game progress will be
          permanently deleted. This action cannot be undone.
        </p>

        {!isConfirmingDeletion ? (
          <button
            type="button"
            onClick={() => {
              setDeleteAccountError(null);
              setIsConfirmingDeletion(true);
            }}
            className="font-fredoka-strong mt-5 rounded-full bg-red-600 px-6 py-3 text-white transition-colors hover:bg-red-700"
          >
            Delete my account
          </button>
        ) : (
          <form className="mt-5 max-w-xl space-y-4" onSubmit={deleteAccount}>
            <label className="block">
              <span className="theme-text-primary font-fredoka-strong text-base">
                Type{" "}
                <span className="select-all text-red-600">{savedName}</span> to
                confirm
              </span>
              <input
                required
                autoFocus
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={deleteConfirmation}
                onChange={(event) => {
                  setDeleteConfirmation(event.target.value);
                  setDeleteAccountError(null);
                }}
                aria-describedby="delete-account-warning"
                className="theme-input theme-text-primary mt-2 h-12 w-full rounded-xl border border-red-500/40 px-4 text-base outline-none focus:border-red-500"
              />
            </label>
            <p
              id="delete-account-warning"
              className="theme-text-danger text-base"
            >
              This is permanent and cannot be reversed.
            </p>
            {deleteAccountError && (
              <p role="alert" className="theme-text-danger text-base">
                {deleteAccountError}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={
                  deleteConfirmation !== savedName || isDeletingAccount
                }
                className="font-fredoka-strong rounded-full bg-red-600 px-6 py-3 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isDeletingAccount
                  ? "Deleting account..."
                  : "Permanently delete account"}
              </button>
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => {
                  setDeleteConfirmation("");
                  setDeleteAccountError(null);
                  setIsConfirmingDeletion(false);
                }}
                className="theme-button-secondary font-fredoka-strong rounded-full border border-[var(--border-soft)] px-6 py-3 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
