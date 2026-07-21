import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

import {
  getLeaderboardDifficultyForFamily,
  LEADERBOARD_MODE_FAMILIES,
  LEADERBOARD_PRESET_DIFFICULTIES,
  LEADERBOARD_REFRESH_EVENT,
  type LeaderboardDifficulty,
  type LeaderboardModeFamily,
} from "../../leaderboard";
import { DIFFICULTY_LABELS, formatTime } from "../../game-logic";
import type { PresetDifficultyKey } from "../../game-types";

type LeaderboardCategoryId = "fastest" | "moves" | "streaks" | "daily";
type SolveLeaderboardCategoryId = Exclude<LeaderboardCategoryId, "streaks" | "daily">;

type LeaderboardCategory = {
  id: LeaderboardCategoryId;
  label: string;
  title: string;
  metricLabel: string;
};

type LeaderboardApiRow = {
  created_at: string;
  difficulty?: LeaderboardDifficulty;
  id: number;
  moves: number;
  player_name: string;
  solve_time: number;
  streak_count?: number;
};

const LEADERBOARD_CATEGORIES: LeaderboardCategory[] = [
  {
    id: "fastest",
    label: "Fastest solves",
    title: "Fastest solves",
    metricLabel: "Time",
  },
  {
    id: "moves",
    label: "Fewest moves",
    title: "Fewest moves",
    metricLabel: "Moves",
  },
  {
    id: "streaks",
    label: "Best streaks",
    title: "Best streaks",
    metricLabel: "Puzzles beaten",
  },
  {
    id: "daily",
    label: "Daily puzzle",
    title: "Daily puzzle",
    metricLabel: "Time",
  },
];

const LEADERBOARD_MODE_FAMILY_LABELS: Record<LeaderboardModeFamily, string> = {
  color: "Classic",
  "black-and-white": "B&W",
};

function isSolveCategoryId(
  categoryId: LeaderboardCategoryId,
): categoryId is SolveLeaderboardCategoryId {
  return categoryId !== "streaks" && categoryId !== "daily";
}

function getLeaderboardRank(position: number) {
  const value = position + 1;
  const remainder = value % 10;
  const teenValue = value % 100;

  if (teenValue >= 11 && teenValue <= 13) {
    return `${value}th`;
  }

  if (remainder === 1) {
    return `${value}st`;
  }

  if (remainder === 2) {
    return `${value}nd`;
  }

  if (remainder === 3) {
    return `${value}rd`;
  }

  return `${value}th`;
}

function getLeaderboardValue(categoryId: LeaderboardCategoryId, row: LeaderboardApiRow) {
  if (categoryId === "streaks") {
    return `${row.streak_count ?? 0} puzzles`;
  }

  if (categoryId === "moves") {
    return `${row.moves} moves`;
  }

  return `${formatTime(row.solve_time)}s`;
}

type LeaderboardModalProps = {
  dailyDateKey: string;
  isOpen: boolean;
  onClose: () => void;
};

export function LeaderboardModal({
  dailyDateKey,
  isOpen,
  onClose,
}: Readonly<LeaderboardModalProps>) {
  const [activeCategoryId, setActiveCategoryId] = useState<LeaderboardCategoryId>("fastest");
  const [selectedFamilies, setSelectedFamilies] = useState<Record<SolveLeaderboardCategoryId, LeaderboardModeFamily>>({
    fastest: "color",
    moves: "color",
  });
  const [selectedDifficulties, setSelectedDifficulties] = useState<Record<SolveLeaderboardCategoryId, PresetDifficultyKey>>({
    fastest: "normal",
    moves: "normal",
  });
  const [rows, setRows] = useState<LeaderboardApiRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryRequestId, setRetryRequestId] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const activeCategory =
    LEADERBOARD_CATEGORIES.find((category) => category.id === activeCategoryId) ??
    LEADERBOARD_CATEGORIES[0];
  const activeMode = isSolveCategoryId(activeCategory.id)
    ? getLeaderboardDifficultyForFamily(
        selectedFamilies[activeCategory.id],
        selectedDifficulties[activeCategory.id],
      )
    : "endless";
  const leaderboardQuery = activeCategory.id === "daily"
    ? `/api/leaderboard?category=daily&dateKey=${encodeURIComponent(dailyDateKey)}`
    : `/api/leaderboard?category=${activeCategory.id}&difficulty=${activeMode}`;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;

    async function loadLeaderboard() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(leaderboardQuery, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load leaderboard.");
        }

        const nextRows = (await response.json()) as LeaderboardApiRow[];

        if (!isCancelled) {
          setRows(nextRows);
        }
      } catch {
        if (!isCancelled) {
          setRows([]);
          setLoadError("Leaderboard is unavailable right now.");
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
  }, [isOpen, leaderboardQuery, retryRequestId]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <motion.div
      className="leaderboard-overlay theme-overlay fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex max-h-full w-full max-w-[48rem] flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <motion.nav
          aria-label="Leaderboard categories"
          className="theme-modal order-2 grid w-full shrink-0 grid-cols-2 gap-2 rounded-[1.35rem] border p-2 sm:order-1 sm:w-[11.5rem] sm:grid-cols-1 sm:p-3"
          initial={{ opacity: 0, x: -14, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {LEADERBOARD_CATEGORIES.map((category) => {
            const isActive = category.id === activeCategory.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
                className={`font-fredoka-strong min-w-0 rounded-[1rem] px-2 py-3 text-xs leading-tight sm:px-4 sm:text-sm ${
                  isActive ? "theme-button-primary" : "theme-button-secondary"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </motion.nav>

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Leaderboard"
          className="theme-modal order-1 relative flex min-h-0 w-full flex-col overflow-hidden rounded-[1.5rem] border p-[clamp(1rem,4vw,1.75rem)] sm:order-2"
          initial={{ opacity: 0, y: 18, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-start justify-between gap-4">
            <h2 className="theme-text-primary font-fredoka-display text-[1.65rem] leading-none sm:text-[2rem]">
              {activeCategory.title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close leaderboard window"
              className="theme-close-button font-fredoka-strong flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            >
              {"\u00D7"}
            </button>
          </div>

          {isSolveCategoryId(activeCategory.id) && (() => {
            const activeSolveCategoryId = activeCategory.id;

            return (
            <>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {LEADERBOARD_MODE_FAMILIES.map((family) => {
                  const isActive = selectedFamilies[activeSolveCategoryId] === family;

                  return (
                    <button
                      key={family}
                      type="button"
                      onClick={() =>
                        setSelectedFamilies((currentFamilies) => ({
                          ...currentFamilies,
                          [activeSolveCategoryId]: family,
                        }))
                      }
                      className={`font-fredoka-strong rounded-[1rem] border px-3 py-3 text-sm leading-tight ${
                        isActive ? "theme-button-primary" : "theme-button-secondary"
                      }`}
                    >
                      {LEADERBOARD_MODE_FAMILY_LABELS[family]}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                {LEADERBOARD_PRESET_DIFFICULTIES.map((difficulty) => {
                  const isActive = selectedDifficulties[activeSolveCategoryId] === difficulty;

                  return (
                    <button
                      key={difficulty}
                      type="button"
                      onClick={() =>
                        setSelectedDifficulties((currentDifficulties) => ({
                          ...currentDifficulties,
                          [activeSolveCategoryId]: difficulty,
                        }))
                      }
                      className={`font-fredoka-strong rounded-[1rem] border px-3 py-3 text-sm leading-tight ${
                        isActive ? "theme-button-primary" : "theme-button-secondary"
                      }`}
                    >
                      {DIFFICULTY_LABELS[difficulty]}
                    </button>
                  );
                })}
              </div>
            </>
            );
          })()}

          <div className="mt-5 flex min-h-0 max-h-[20rem] flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5">
            {isLoading && (
              <div className="theme-panel-muted theme-text-muted rounded-[0.95rem] px-4 py-5 text-sm">
                Loading leaderboard...
              </div>
            )}

            {!isLoading && loadError && (
              <div className="theme-panel-muted rounded-[0.95rem] px-4 py-5 text-sm">
                <p className="theme-text-muted">{loadError}</p>
                <button
                  type="button"
                  onClick={() => setRetryRequestId((currentId) => currentId + 1)}
                  className="theme-button-primary mt-3 rounded-full px-4 py-2 font-fredoka-strong text-sm"
                >
                  Try again
                </button>
              </div>
            )}

            {!isLoading && !loadError && rows.length === 0 && (
              <div className="theme-panel-muted theme-text-muted rounded-[0.95rem] px-4 py-5 text-sm leading-6">
                No scores have been recorded for this mode yet. Finish a run to create the first entry.
              </div>
            )}

            {!isLoading && !loadError && rows.map((row, index) => (
              <div
                key={`${activeCategory.id}-${row.id}`}
                className="theme-panel-muted theme-text-primary flex min-h-12 items-center gap-3 rounded-[0.95rem] px-4 py-3"
              >
                <span className="font-fredoka-strong w-10 shrink-0 text-sm text-teal-700">
                  {getLeaderboardRank(index)}
                </span>
                <span className="font-fredoka-strong min-w-0 flex-1 truncate text-sm">
                  {row.player_name}
                </span>
                <span className="font-fredoka-regular shrink-0 text-xs sm:text-sm theme-text-muted">
                  {getLeaderboardValue(activeCategory.id, row)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>,
    document.body,
  );
}
