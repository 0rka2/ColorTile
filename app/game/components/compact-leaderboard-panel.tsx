"use client";

import { useEffect, useState } from "react";
import { IoMdTrophy } from "react-icons/io";

import { formatTime } from "../game-logic";
import { LEADERBOARD_REFRESH_EVENT } from "../leaderboard";
import type { DifficultyKey } from "../game-types";

type CompactLeaderboardRow = {
  created_at: string;
  id: number;
  moves?: number;
  player_name: string;
  solve_time?: number;
  streak_count?: number;
};

type CompactLeaderboardPanelProps = {
  dailyDateKey: string;
  difficulty: DifficultyKey;
  isDailyMode: boolean;
};

function getRankLabel(index: number) {
  return `#${index + 1}`;
}

function getRowValue(row: CompactLeaderboardRow, isStreakBoard: boolean) {
  if (isStreakBoard) {
    return `${row.streak_count ?? 0}`;
  }

  return row.solve_time === undefined ? "-" : formatTime(row.solve_time);
}

function useLargeScreen() {
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1450px)");
    const updateLargeScreen = () => setIsLargeScreen(mediaQuery.matches);

    updateLargeScreen();
    mediaQuery.addEventListener("change", updateLargeScreen);

    return () => mediaQuery.removeEventListener("change", updateLargeScreen);
  }, []);

  return isLargeScreen;
}

export function CompactLeaderboardPanel({
  dailyDateKey,
  difficulty,
  isDailyMode,
}: Readonly<CompactLeaderboardPanelProps>) {
  const isLargeScreen = useLargeScreen();
  const [rows, setRows] = useState<CompactLeaderboardRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isStreakBoard = !isDailyMode && difficulty === "endless";
  const title = isDailyMode
    ? "Today"
    : isStreakBoard
      ? "Endless"
      : "Fastest";
  const subtitle = isDailyMode
    ? "Daily puzzle"
    : isStreakBoard
      ? "Best streaks"
      : "Current mode";
  const metricLabel = isStreakBoard ? "Streak" : "Time";
  const query = isDailyMode
    ? `/api/leaderboard?category=daily&dateKey=${encodeURIComponent(dailyDateKey)}`
    : isStreakBoard
      ? "/api/leaderboard?category=streaks&difficulty=endless"
      : `/api/leaderboard?category=fastest&difficulty=${encodeURIComponent(difficulty)}`;

  useEffect(() => {
    if (!isLargeScreen) {
      return;
    }

    let isCancelled = false;

    async function loadLeaderboard() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(query, { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Unable to load leaderboard.");
        }

        const nextRows = (await response.json()) as CompactLeaderboardRow[];

        if (!isCancelled) {
          setRows(nextRows.slice(0, 10));
        }
      } catch {
        if (!isCancelled) {
          setRows([]);
          setLoadError("Unavailable");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    const refreshLeaderboard = () => {
      void loadLeaderboard();
    };

    refreshLeaderboard();
    window.addEventListener(LEADERBOARD_REFRESH_EVENT, refreshLeaderboard);

    return () => {
      isCancelled = true;
      window.removeEventListener(LEADERBOARD_REFRESH_EVENT, refreshLeaderboard);
    };
  }, [isLargeScreen, query]);

  if (!isLargeScreen) {
    return null;
  }

  return (
    <aside
      aria-label="Current leaderboard"
      className="theme-panel fixed right-[clamp(1rem,4vw,4rem)] top-1/2 z-10 hidden w-[22rem] -translate-y-1/2 rounded-[1.35rem] border p-5 shadow-[0_18px_42px_rgba(15,23,42,0.12)] xl:block"
    >
      <div className="flex items-center gap-4">
        <div className="theme-button-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
          <IoMdTrophy aria-hidden="true" className="text-2xl" />
        </div>
        <div className="min-w-0">
          <h2 className="theme-text-primary font-fredoka-display text-[1.7rem] leading-none">
            {title}
          </h2>
          <p className="theme-text-muted mt-1.5 font-fredoka-strong text-xs uppercase leading-none tracking-[0.14em]">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="theme-text-muted mt-5 grid grid-cols-[3.25rem_1fr_4.75rem] gap-3 px-3 font-fredoka-strong text-xs uppercase tracking-[0.12em]">
        <span>Rank</span>
        <span>Name</span>
        <span className="text-right">{metricLabel}</span>
      </div>

      <div className="mt-2.5 flex max-h-[32rem] flex-col gap-2.5 overflow-hidden">
        {isLoading && (
          <div className="theme-panel-muted theme-text-muted rounded-xl px-4 py-5 text-center text-base">
            Loading...
          </div>
        )}

        {!isLoading && loadError && (
          <div className="theme-panel-muted theme-text-muted rounded-xl px-4 py-5 text-center text-base">
            {loadError}
          </div>
        )}

        {!isLoading && !loadError && rows.length === 0 && (
          <div className="theme-panel-muted theme-text-muted rounded-xl px-4 py-5 text-center text-base leading-6">
            No scores yet.
          </div>
        )}

        {!isLoading && !loadError && rows.map((row, index) => (
          <div
            key={row.id}
            className="theme-panel-muted theme-text-primary grid min-h-12 grid-cols-[3.25rem_1fr_4.75rem] items-center gap-3 rounded-xl px-3 py-2.5"
          >
            <span className="font-fredoka-strong text-sm text-teal-700">
              {getRankLabel(index)}
            </span>
            <span className="font-fredoka-strong min-w-0 truncate text-base">
              {row.player_name}
            </span>
            <span className="font-fredoka-regular theme-text-muted text-right text-sm">
              {getRowValue(row, isStreakBoard)}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
