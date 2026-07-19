"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { PlayerProgress } from "@/app/game/player-progress";
import {
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
    return "—";
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
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const bestRecords = Object.values(progress.bestStats);
  const fastestTime = getLowestValue(
    bestRecords.map((record) => record?.bestSolveTime),
  );
  const fewestMoves = getLowestValue(
    bestRecords.map((record) => record?.fewestMoves),
  );

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
    window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, sanitizedName);
    setProfileMessage("Player name saved.");
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
    setSecurityMessage("Password changed. Other devices have been signed out.");
  }

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="py-10 sm:py-14">
      <div className="mb-8">
        <p className="theme-text-muted font-fredoka-strong text-xs uppercase tracking-[0.24em]">
          Player account
        </p>
        <h1 className="theme-text-primary font-fredoka-display mt-3 text-4xl tracking-[-0.05em] sm:text-5xl">
          Hi, {initialName}
        </h1>
        <p className="theme-text-muted mt-3 text-sm">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Fastest solve", formatTime(fastestTime)],
            ["Fewest moves", fewestMoves ?? "—"],
            ["Endless clears", progress.endlessStats.clears],
            ["Best streak", progress.endlessStats.bestStreak],
          ].map(([label, value]) => (
            <div
              key={label}
              className="theme-card rounded-2xl border p-5 shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
            >
              <p className="theme-text-muted font-fredoka-strong text-xs uppercase tracking-[0.18em]">
                {label}
              </p>
              <p className="theme-text-primary font-fredoka-display mt-3 text-3xl">
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="theme-modal rounded-[1.75rem] border p-6 sm:p-8">
          <h2 className="theme-text-primary font-fredoka-display text-2xl">
            Profile
          </h2>
          <form className="mt-6 space-y-4" onSubmit={updateProfile}>
            <label className="block">
              <span className="theme-text-primary font-fredoka-strong text-sm">
                Player name
              </span>
              <input
                required
                type="text"
                autoComplete="nickname"
                maxLength={PLAYER_NAME_MAX_LENGTH}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="theme-input theme-text-primary mt-2 h-12 w-full rounded-xl border px-4 outline-none focus:border-slate-400"
              />
            </label>
            <div>
              <p className="theme-text-primary font-fredoka-strong text-sm">
                Email
              </p>
              <p className="theme-text-muted mt-2 break-all text-sm">{email}</p>
              <p className="mt-1 text-xs text-emerald-600">
                {emailVerified ? "Verified" : "Verification pending"}
              </p>
            </div>
            {profileError && (
              <p role="alert" className="theme-text-danger text-sm">
                {profileError}
              </p>
            )}
            {profileMessage && (
              <p role="status" className="text-sm text-emerald-600">
                {profileMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={isSavingProfile}
              className="theme-button-primary font-fredoka-strong rounded-full px-6 py-3 disabled:opacity-60"
            >
              {isSavingProfile ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>

        <section className="theme-modal rounded-[1.75rem] border p-6 sm:p-8">
          <h2 className="theme-text-primary font-fredoka-display text-2xl">
            Security
          </h2>
          <form className="mt-6 space-y-4" onSubmit={changePassword}>
            <label className="block">
              <span className="theme-text-primary font-fredoka-strong text-sm">
                Current password
              </span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="theme-input theme-text-primary mt-2 h-12 w-full rounded-xl border px-4 outline-none focus:border-slate-400"
              />
            </label>
            <label className="block">
              <span className="theme-text-primary font-fredoka-strong text-sm">
                New password
              </span>
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="theme-input theme-text-primary mt-2 h-12 w-full rounded-xl border px-4 outline-none focus:border-slate-400"
              />
            </label>
            {securityError && (
              <p role="alert" className="theme-text-danger text-sm">
                {securityError}
              </p>
            )}
            {securityMessage && (
              <p role="status" className="text-sm text-emerald-600">
                {securityMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={isSavingPassword}
              className="theme-button-primary font-fredoka-strong rounded-full px-6 py-3 disabled:opacity-60"
            >
              {isSavingPassword ? "Updating..." : "Change password"}
            </button>
          </form>
        </section>
      </div>

      <button
        type="button"
        onClick={signOut}
        className="theme-button-secondary font-fredoka-strong mt-6 rounded-full px-6 py-3"
      >
        Sign out
      </button>
    </div>
  );
}
