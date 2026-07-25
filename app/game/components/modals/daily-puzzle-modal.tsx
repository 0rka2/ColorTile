import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

import { formatDailyResetTime, formatTime, getDailyResetSeconds } from "../../game-logic";
import type {
  DailyFailureReason,
  DailyPuzzleDefinition,
  DailyPuzzleRecord,
} from "../../game-types";

type DailyPuzzleModalProps = {
  challengeLabel: string;
  dateKey: string;
  difficulty: DailyPuzzleDefinition["difficulty"];
  failureReason: DailyFailureReason | null;
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  record: DailyPuzzleRecord | null;
  size: number;
  swapBudget: number | null;
  timeLimitSeconds: number | null;
};

export function DailyPuzzleModal({
  challengeLabel,
  dateKey,
  difficulty,
  failureReason,
  isOpen,
  onClose,
  onStart,
  record,
  size,
  swapBudget,
  timeLimitSeconds,
}: Readonly<DailyPuzzleModalProps>) {
  const [resetSeconds, setResetSeconds] = useState(getDailyResetSeconds);

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setResetSeconds(getDailyResetSeconds());
    const intervalId = window.setInterval(() => {
      setResetSeconds(getDailyResetSeconds());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const todaysRecord = record?.dateKey === dateKey ? record : null;
  const difficultyLabel = difficulty === "normal" ? "Normal" : "Hard";
  const actionLabel = failureReason
    ? "Try Again"
    : todaysRecord?.completed
      ? "Replay Today"
      : "Start Puzzle";

  return createPortal(
    <motion.div
      className="theme-overlay fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Daily puzzle"
        className="theme-modal relative max-h-[calc(100dvh-1.5rem)] w-full max-w-[38rem] overflow-y-auto rounded-[1.5rem] border p-[clamp(1.25rem,4vw,2.5rem)] sm:rounded-[1.75rem]"
        initial={{ opacity: 0, y: 18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close daily puzzle window"
          className="theme-close-button font-fredoka-strong absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full"
        >
          {"\u00D7"}
        </button>

        <div className="pr-14">
          <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.24em] sm:text-[0.8rem]">
            {dateKey}
          </p>
          <p className="theme-text-muted font-fredoka-regular mt-2 text-sm leading-5 sm:text-base">
            Next in {formatDailyResetTime(resetSeconds)}
          </p>
          <h2 className="theme-text-primary font-fredoka-display mt-4 text-[2.35rem] leading-none sm:text-[3rem]">
            Daily Puzzle
          </h2>
        </div>

        <div className="mt-7 grid grid-cols-3 gap-3 text-center sm:mt-8 sm:gap-4">
          <div className="theme-card rounded-[1rem] border px-3 py-4 sm:rounded-[1.25rem] sm:px-4 sm:py-5">
            <p className="theme-text-primary font-fredoka-display text-2xl leading-none sm:text-[1.75rem]">{difficultyLabel}</p>
            <p className="theme-text-muted font-fredoka-regular mt-2 text-xs sm:text-sm">{size}x{size}</p>
          </div>
          <div className="theme-card rounded-[1rem] border px-3 py-4 sm:rounded-[1.25rem] sm:px-4 sm:py-5">
            <p className="theme-text-primary font-fredoka-display text-2xl leading-none sm:text-[1.75rem]">{challengeLabel}</p>
            <p className="theme-text-muted font-fredoka-regular mt-2 text-xs sm:text-sm">challenge</p>
          </div>
          <div className="theme-card rounded-[1rem] border px-3 py-4 sm:rounded-[1.25rem] sm:px-4 sm:py-5">
            <p className="theme-text-primary font-fredoka-display text-2xl leading-none sm:text-[1.75rem]">
              {timeLimitSeconds === null ? swapBudget ?? "None" : formatTime(timeLimitSeconds)}
            </p>
            <p className="theme-text-muted font-fredoka-regular mt-2 text-xs sm:text-sm">
              {timeLimitSeconds === null ? "swap limit" : "time limit"}
            </p>
          </div>
        </div>

        <div className="theme-panel-muted mt-5 rounded-[1.15rem] p-5 sm:mt-6 sm:rounded-[1.35rem] sm:p-6">
          {failureReason ? (
            <>
              <p className="theme-text-primary font-fredoka-strong text-lg">
                {failureReason === "time-limit" ? "Time limit reached" : "Swap limit reached"}
              </p>
              <p className="theme-text-muted font-fredoka-regular mt-3 text-base leading-7">
                Today&apos;s puzzle is ready to replay with the same board.
              </p>
            </>
          ) : todaysRecord?.completed ? (
            <>
              <p className="theme-text-primary font-fredoka-strong text-lg">Completed today</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:gap-4">
                <div className="theme-card rounded-[1rem] border px-3 py-4 sm:px-4">
                  <p className="theme-text-primary font-fredoka-display text-2xl leading-none sm:text-[1.75rem]">
                    {formatTime(todaysRecord.bestSolveTime ?? 0)}s
                  </p>
                  <p className="theme-text-muted font-fredoka-regular mt-2 text-xs sm:text-sm">best time</p>
                </div>
                <div className="theme-card rounded-[1rem] border px-3 py-4 sm:px-4">
                  <p className="theme-text-primary font-fredoka-display text-2xl leading-none sm:text-[1.75rem]">
                    {todaysRecord.fewestMoves ?? "-"}
                  </p>
                  <p className="theme-text-muted font-fredoka-regular mt-2 text-xs sm:text-sm">fewest moves</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="theme-text-primary font-fredoka-strong text-lg">Today&apos;s challenge</p>
              <p className="theme-text-muted font-fredoka-regular mt-3 text-base leading-7">
                {timeLimitSeconds !== null
                  ? `One puzzle for the day. Solve it before the ${formatTime(timeLimitSeconds)} timer reaches zero.`
                  : swapBudget === null
                  ? "One puzzle for the day. Complete it at your own pace and come back tomorrow for a new challenge."
                  : `One puzzle for the day. Solve it in ${swapBudget} swaps or fewer and come back tomorrow for a new challenge.`}
              </p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onStart}
          className="theme-button-primary font-fredoka-strong mt-6 flex min-h-14 w-full items-center justify-center rounded-full px-6 py-3 text-base sm:min-h-16 sm:text-lg"
        >
          {actionLabel}
        </button>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
