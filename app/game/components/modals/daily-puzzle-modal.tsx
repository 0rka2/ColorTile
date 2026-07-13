import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

import { formatTime } from "../../game-logic";
import type { DailyPuzzleRecord, ModeStyle } from "../../game-types";

type DailyPuzzleModalProps = {
  dateKey: string;
  isFailed: boolean;
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  record: DailyPuzzleRecord | null;
  style: ModeStyle;
  swapBudget: number;
};

export function DailyPuzzleModal({
  dateKey,
  isFailed,
  isOpen,
  onClose,
  onStart,
  record,
  style,
  swapBudget,
}: Readonly<DailyPuzzleModalProps>) {
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

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const todaysRecord = record?.dateKey === dateKey ? record : null;
  const styleLabel = style === "black-and-white" ? "B&W" : "Classic";
  const actionLabel = isFailed
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
        className="theme-modal relative w-full max-w-[30rem] rounded-[1.5rem] border p-6 sm:rounded-[1.75rem] sm:p-8"
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

        <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.24em]">
          {dateKey}
        </p>
        <h2 className="theme-text-primary font-fredoka-display mt-3 text-[2rem] leading-none sm:text-[2.35rem]">
          Daily Puzzle
        </h2>

        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          <div className="theme-card rounded-[1rem] border px-2 py-3">
            <p className="theme-text-primary font-fredoka-display text-xl leading-none">5x5</p>
            <p className="theme-text-muted font-fredoka-regular mt-1 text-xs">size</p>
          </div>
          <div className="theme-card rounded-[1rem] border px-2 py-3">
            <p className="theme-text-primary font-fredoka-display text-xl leading-none">{styleLabel}</p>
            <p className="theme-text-muted font-fredoka-regular mt-1 text-xs">mode</p>
          </div>
          <div className="theme-card rounded-[1rem] border px-2 py-3">
            <p className="theme-text-primary font-fredoka-display text-xl leading-none">{swapBudget}</p>
            <p className="theme-text-muted font-fredoka-regular mt-1 text-xs">swaps</p>
          </div>
        </div>

        <div className="theme-panel-muted mt-4 rounded-[1rem] p-4">
          {isFailed ? (
            <>
              <p className="theme-text-primary font-fredoka-strong text-base">Swap limit reached</p>
              <p className="theme-text-muted font-fredoka-regular mt-2 text-sm leading-6">
                Today&apos;s puzzle is ready to replay with the same board.
              </p>
            </>
          ) : todaysRecord?.completed ? (
            <>
              <p className="theme-text-primary font-fredoka-strong text-base">Completed today</p>
              <p className="theme-text-muted font-fredoka-regular mt-2 text-sm leading-6">
                Best time {formatTime(todaysRecord.bestSolveTime ?? 0)}s | Fewest moves {todaysRecord.fewestMoves ?? "-"}.
              </p>
            </>
          ) : (
            <>
              <p className="theme-text-primary font-fredoka-strong text-base">Today&apos;s challenge</p>
              <p className="theme-text-muted font-fredoka-regular mt-2 text-sm leading-6">
                One puzzle for the day. Solve it before the swap limit and come back tomorrow for a new one.
              </p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onStart}
          className="theme-button-primary font-fredoka-strong mt-5 w-full rounded-full px-5 py-3 text-sm sm:text-base"
        >
          {actionLabel}
        </button>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
