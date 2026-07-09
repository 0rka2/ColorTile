import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

import {
  LEADERBOARD_DIFFICULTIES,
  type LeaderboardDifficulty,
} from "../../leaderboard";
import { DIFFICULTY_LABELS, formatTime } from "../../game-logic";

type LeaderboardCategoryId = "fastest" | "moves" | "streaks";

type LeaderboardCategory = {
  id: LeaderboardCategoryId;
  label: string;
  title: string;
  metricLabel: string;
  modes: LeaderboardDifficulty[];
};

type LeaderboardApiRow = {
  created_at: string;
  difficulty: LeaderboardDifficulty;
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
    modes: LEADERBOARD_DIFFICULTIES.filter((difficulty) => difficulty !== "endless"),
  },
  {
    id: "moves",
    label: "Fewest moves",
    title: "Fewest moves",
    metricLabel: "Moves",
    modes: LEADERBOARD_DIFFICULTIES.filter((difficulty) => difficulty !== "endless"),
  },
  {
    id: "streaks",
    label: "Best streaks",
    title: "Best streaks",
    metricLabel: "Puzzles beaten",
    modes: ["endless"],
  },
];

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
  isOpen: boolean;
  onClose: () => void;
};

export function LeaderboardModal({
  isOpen,
  onClose,
}: Readonly<LeaderboardModalProps>) {
  const [activeCategoryId, setActiveCategoryId] = useState<LeaderboardCategoryId>("fastest");
  const [selectedModes, setSelectedModes] = useState<Record<LeaderboardCategoryId, LeaderboardDifficulty>>({
    fastest: "normal",
    moves: "normal",
    streaks: "endless",
  });
  const [rows, setRows] = useState<LeaderboardApiRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
  const activeMode = selectedModes[activeCategory.id];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;

    async function loadLeaderboard() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(
          `/api/leaderboard?category=${activeCategory.id}&difficulty=${activeMode}`,
          {
            cache: "no-store",
          },
        );

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

    void loadLeaderboard();

    return () => {
      isCancelled = true;
    };
  }, [activeCategory.id, activeMode, isOpen]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <motion.div
      className="theme-overlay fixed inset-0 z-40 flex items-center justify-center p-3 backdrop-blur-sm sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex w-full max-w-[48rem] flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <motion.nav
          aria-label="Leaderboard categories"
          className="theme-modal order-2 flex w-full gap-2 overflow-x-auto rounded-[1.35rem] border p-3 sm:order-1 sm:w-[11.5rem] sm:flex-col sm:overflow-visible"
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
                className={`font-fredoka-strong min-w-[9.5rem] rounded-[1rem] px-4 py-3 text-sm leading-tight sm:min-w-0 ${
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
          className="theme-modal order-1 relative w-full rounded-[1.5rem] border p-5 sm:order-2 sm:p-7"
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

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {activeCategory.modes.map((mode) => {
              const isActive = selectedModes[activeCategory.id] === mode;

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    setSelectedModes((currentModes) => ({
                      ...currentModes,
                      [activeCategory.id]: mode,
                    }))
                  }
                  className={`font-fredoka-strong rounded-[1rem] border px-3 py-3 text-sm leading-tight ${
                    isActive ? "theme-button-primary" : "theme-button-secondary"
                  }`}
                >
                  {DIFFICULTY_LABELS[mode]}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex max-h-[20rem] flex-col gap-2 overflow-hidden">
            {isLoading && (
              <div className="theme-panel-muted theme-text-muted rounded-[0.95rem] px-4 py-5 text-sm">
                Loading leaderboard...
              </div>
            )}

            {!isLoading && loadError && (
              <div className="theme-panel-muted theme-text-muted rounded-[0.95rem] px-4 py-5 text-sm">
                {loadError}
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
