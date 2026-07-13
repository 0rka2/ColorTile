import { createPortal } from "react-dom";
import { motion } from "motion/react";

import type { DifficultyConfig } from "../../game-types";
import type { PersonalBestStatus } from "../../personal-best";

const TIME_UP_QUOTES = [
  "Almost there!",
  "That gradient was fighting back.",
  "Only a few swaps from perfection.",
  "The colors aren't blending yet.",
  "So close. Try one more run.",
];
const COMPLETE_TITLE_RAINBOW = [
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#3b82f6",
  "#4f46e5",
  "#a855f7",
];

//logic
function getTimeUpStars(completion: number) {
  if (completion >= 100) {
    return 3;
  }

  if (completion >= 90) {
    return 2;
  }

  if (completion >= 85) {
    return 1;
  }

  return 0;
}

function renderStars(count: number) {
  return "⭐".repeat(count);
}

function interpolateColor(start: string, end: string, progress: number) {
  const startValue = Number.parseInt(start.slice(1), 16);
  const endValue = Number.parseInt(end.slice(1), 16);
  const startRgb = [(startValue >> 16) & 255, (startValue >> 8) & 255, startValue & 255];
  const endRgb = [(endValue >> 16) & 255, (endValue >> 8) & 255, endValue & 255];
  const mixedRgb = startRgb.map((channel, index) => Math.round(channel + (endRgb[index] - channel) * progress));

  return `rgb(${mixedRgb.join(" ")})`;
}

function getCompleteTitleColor(position: number, total: number) {
  const progress = total > 1 ? position / (total - 1) : 0;
  const scaledProgress = progress * (COMPLETE_TITLE_RAINBOW.length - 1);
  const colorIndex = Math.min(Math.floor(scaledProgress), COMPLETE_TITLE_RAINBOW.length - 2);
  const colorProgress = scaledProgress - colorIndex;

  return interpolateColor(
    COMPLETE_TITLE_RAINBOW[colorIndex],
    COMPLETE_TITLE_RAINBOW[colorIndex + 1],
    colorProgress,
  );
}

function renderWaveText(text: string) {
  const characters = Array.from(text);
  const letterCount = characters.filter((character) => character !== " ").length;
  let letterPosition = 0;

  return characters.map((character, index) => {
    const isSpace = character === " ";
    const color = isSpace ? undefined : getCompleteTitleColor(letterPosition, letterCount);

    if (!isSpace) {
      letterPosition += 1;
    }

    return (
      <span
        key={`${character}-${index}`}
        className="gradient-complete-wave mr-[0.02em]"
        style={{ animationDelay: `${index * 0.035}s`, color }}
      >
        {isSpace ? "\u00A0" : character}
      </span>
    );
  });
}

type ModalProps = {
  activeConfig: DifficultyConfig;
  accuracy: number;
  completion: number;
  dailyResult?: {
    onBack: () => void;
    onReplay: () => void;
    swapBudget: number;
  };
  endlessResult?: {
    isThreeStar: boolean;
    onBack: () => void;
    onNextPuzzle: () => void;
    onReplay: () => void;
    puzzleNumber: number;
    swapBudget: number;
    threeStarMoveLimit: number;
  };
  loseState: boolean;
  moves: number;
  onRestart: () => void;
  personalBestStatus: PersonalBestStatus;
  timeDisplay: string;
  winState: boolean;
};

export function GameModal({
  activeConfig,
  accuracy,
  completion,
  dailyResult,
  endlessResult,
  loseState,
  moves,
  onRestart,
  personalBestStatus,
  timeDisplay,
  winState,
}: Readonly<ModalProps>) {
  if (!winState && !loseState) {
    return null;
  }

  const timeUpQuote = TIME_UP_QUOTES[(moves + completion + activeConfig.size) % TIME_UP_QUOTES.length];
  const timeUpStars = getTimeUpStars(completion);
  const personalBestLabel = personalBestStatus.hasNewPersonalBest ? "New Personal Best!" : null;

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="theme-overlay fixed inset-0 z-20 flex items-center justify-center p-3 backdrop-blur-sm sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="theme-modal relative w-full max-w-[40.5rem] max-h-[calc(100dvh-1.5rem)] overflow-y-auto overflow-x-hidden rounded-[clamp(1.25rem,3vw,2rem)] border p-[clamp(1rem,3vw,2rem)] text-center sm:max-h-[calc(100dvh-2rem)] sm:p-10"
      >
        <div className="relative z-10 flex flex-col">
          {winState ? (
            dailyResult ? (
              <div className="mx-auto max-w-lg">
                <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.3em] sm:text-sm">Daily Puzzle</p>
                <h2 className="theme-text-primary font-fredoka-display mt-3 text-[2rem] leading-none sm:text-[2.4rem]">
                  Cleared
                </h2>
                <div className="font-fredoka-strong mt-4 text-base leading-none tracking-[0.18em] text-emerald-500 sm:mt-5 sm:text-lg">
                  {renderStars(3)}
                </div>
                <p className="theme-text-muted font-fredoka-regular mt-4 text-[0.95rem] leading-6 sm:text-[1.05rem] sm:leading-7">
                  Today&apos;s puzzle cleared in {moves} swaps.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-4">
                  <div className="theme-card rounded-[1rem] border px-2 py-3.5 sm:rounded-[1.4rem] sm:px-4 sm:py-5">
                    <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.16em] sm:text-[0.78rem] sm:tracking-[0.22em]">Time</p>
                    <p className="theme-text-primary font-fredoka-strong mt-2 text-[1.3rem] leading-none sm:mt-3 sm:text-[1.7rem]">{timeDisplay}</p>
                  </div>
                  <div className="theme-card rounded-[1rem] border px-2 py-3.5 sm:rounded-[1.4rem] sm:px-4 sm:py-5">
                    <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.16em] sm:text-[0.78rem] sm:tracking-[0.22em]">Swaps</p>
                    <p className="theme-text-primary font-fredoka-strong mt-2 text-[1.3rem] leading-none sm:mt-3 sm:text-[1.7rem]">{moves}/{dailyResult.swapBudget}</p>
                  </div>
                  <div className="theme-card rounded-[1rem] border px-2 py-3.5 sm:rounded-[1.4rem] sm:px-4 sm:py-5">
                    <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.16em] sm:text-[0.78rem] sm:tracking-[0.22em]">Progress</p>
                    <p className="theme-text-primary font-fredoka-strong mt-2 text-[1.3rem] leading-none sm:mt-3 sm:text-[1.7rem]">{completion}%</p>
                  </div>
                </div>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={dailyResult.onBack}
                    className="theme-button-secondary font-fredoka-strong rounded-full px-5 py-3 text-sm sm:text-base"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={dailyResult.onReplay}
                    className="theme-button-primary font-fredoka-strong rounded-full px-5 py-3 text-sm shadow-[0_18px_34px_rgba(15,23,42,0.2)] sm:text-base"
                  >
                    Replay Today
                  </button>
                </div>
              </div>
            ) : endlessResult ? (
              <div className="mx-auto max-w-lg">
                <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.3em] sm:text-sm">Endless</p>
                <h2 className="theme-text-primary font-fredoka-display mt-3 text-[2rem] leading-none sm:text-[2.4rem]">
                  Cleared
                </h2>
                <div className="font-fredoka-strong mt-4 text-base leading-none tracking-[0.18em] text-emerald-500 sm:mt-5 sm:text-lg">
                  {renderStars(endlessResult.isThreeStar ? 3 : 1)}
                </div>
                <p className="theme-text-muted font-fredoka-regular mt-4 text-[0.95rem] leading-6 sm:text-[1.05rem] sm:leading-7">
                  Puzzle {endlessResult.puzzleNumber} cleared in {moves} swaps. Three-star clears need {endlessResult.threeStarMoveLimit} swaps or fewer.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-4">
                  <div className="theme-card rounded-[1rem] border px-2 py-3.5 sm:rounded-[1.4rem] sm:px-4 sm:py-5">
                    <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.16em] sm:text-[0.78rem] sm:tracking-[0.22em]">Time</p>
                    <p className="theme-text-primary font-fredoka-strong mt-2 text-[1.3rem] leading-none sm:mt-3 sm:text-[1.7rem]">{timeDisplay}</p>
                  </div>
                  <div className="theme-card rounded-[1rem] border px-2 py-3.5 sm:rounded-[1.4rem] sm:px-4 sm:py-5">
                    <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.16em] sm:text-[0.78rem] sm:tracking-[0.22em]">Swaps</p>
                    <p className="theme-text-primary font-fredoka-strong mt-2 text-[1.3rem] leading-none sm:mt-3 sm:text-[1.7rem]">{moves}/{endlessResult.swapBudget}</p>
                  </div>
                  <div className="theme-card rounded-[1rem] border px-2 py-3.5 sm:rounded-[1.4rem] sm:px-4 sm:py-5">
                    <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.16em] sm:text-[0.78rem] sm:tracking-[0.22em]">Progress</p>
                    <p className="theme-text-primary font-fredoka-strong mt-2 text-[1.3rem] leading-none sm:mt-3 sm:text-[1.7rem]">{completion}%</p>
                  </div>
                </div>
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={endlessResult.onReplay}
                    className="theme-button-secondary font-fredoka-strong rounded-full px-5 py-3 text-sm sm:text-base"
                  >
                    Replay
                  </button>
                  <button
                    type="button"
                    onClick={endlessResult.onBack}
                    className="theme-button-secondary font-fredoka-strong rounded-full px-5 py-3 text-sm sm:text-base"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={endlessResult.onNextPuzzle}
                    className="theme-button-primary font-fredoka-strong rounded-full px-5 py-3 text-sm shadow-[0_18px_34px_rgba(15,23,42,0.2)] sm:text-base"
                  >
                    Next Puzzle
                  </button>
                </div>
              </div>
            ) : (
            <>
              <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.3em] sm:text-sm">Perfect Gradient</p>
              <motion.h2
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="font-fredoka-display mt-3 text-[1.9rem] leading-none tracking-[-0.05em] sm:mt-4 sm:text-[2.35rem]"
              >
                <span className="theme-text-primary px-1">{renderWaveText("Gradient Complete!")}</span>
              </motion.h2>
              <div className="font-fredoka-strong mt-4 text-base leading-none tracking-[0.24em] text-amber-500 sm:mt-5 sm:text-lg">
                {renderStars(3)}
              </div>
              <p className="theme-text-muted font-fredoka-regular mt-4 text-[0.95rem] leading-6 sm:mt-5 sm:text-[1.05rem] sm:leading-7">
                You restored the gradient with a clean finish on {activeConfig.label.toLowerCase()}.
              </p>
              {personalBestStatus.hasNewPersonalBest && personalBestLabel && (
                <p className="font-fredoka-strong mt-5 text-[0.82rem] uppercase tracking-[0.22em] text-amber-600 sm:mt-6 sm:text-[0.88rem]">
                  {personalBestLabel}
                </p>
              )}
              <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-4">
                <div className="theme-card rounded-[1rem] border px-2 py-3.5 sm:rounded-[1.4rem] sm:px-4 sm:py-5">
                  <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.16em] sm:text-[0.78rem] sm:tracking-[0.22em]">Time</p>
                  <p className="theme-text-primary font-fredoka-strong mt-2 text-[1.3rem] leading-none sm:mt-3 sm:text-[1.7rem]">{timeDisplay}</p>
                </div>
                <div className="theme-card rounded-[1rem] border px-2 py-3.5 sm:rounded-[1.4rem] sm:px-4 sm:py-5">
                  <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.16em] sm:text-[0.78rem] sm:tracking-[0.22em]">Moves</p>
                  <p className="theme-text-primary font-fredoka-strong mt-2 text-[1.3rem] leading-none sm:mt-3 sm:text-[1.7rem]">{moves}</p>
                </div>
                <div className="theme-card rounded-[1rem] border px-2 py-3.5 sm:rounded-[1.4rem] sm:px-4 sm:py-5">
                  <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.16em] sm:text-[0.78rem] sm:tracking-[0.22em]">Accuracy</p>
                  <p className="theme-text-primary font-fredoka-strong mt-2 text-[1.3rem] leading-none sm:mt-3 sm:text-[1.7rem]">{accuracy}%</p>
                </div>
              </div>
            </>
            )
          ) : (
            <div className="mx-auto mt-3 max-w-lg">
              <h2 className="theme-text-primary font-fredoka-display text-[2rem] leading-none tracking-[-0.05em] sm:text-[2.35rem]">
                Time&apos;s up
              </h2>
              {timeUpStars > 0 && (
                <p className="font-fredoka-strong mt-5 text-base leading-none tracking-[0.24em] text-amber-500 sm:mt-6 sm:text-lg">
                  {renderStars(timeUpStars)}
                </p>
              )}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5">
                <div className="theme-card rounded-[1.2rem] border px-3 py-3 sm:rounded-[1.4rem] sm:px-5 sm:py-5">
                  <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.22em] sm:text-[0.78rem]">Gradient Completion</p>
                  <p className="theme-text-primary font-fredoka-strong mt-2.5 text-[1.5rem] leading-none sm:mt-4 sm:text-[1.9rem]">{completion}%</p>
                </div>
                <div className="theme-card rounded-[1.2rem] border px-3 py-3 sm:rounded-[1.4rem] sm:px-5 sm:py-5">
                  <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.22em] sm:text-[0.78rem]">Moves</p>
                  <p className="theme-text-primary font-fredoka-strong mt-2.5 text-[1.5rem] leading-none sm:mt-4 sm:text-[1.9rem]">{moves}</p>
                </div>
              </div>
              <p className="theme-text-muted font-fredoka-regular mt-5 text-[0.98rem] leading-7 sm:mt-7 sm:text-[1.08rem] sm:leading-8">
                {timeUpQuote}
              </p>
            </div>
          )}

          {!dailyResult && !endlessResult && (
            <button
              type="button"
              onClick={onRestart}
              className="theme-button-primary font-fredoka-strong mt-8 rounded-full px-6 py-3 text-base shadow-[0_18px_34px_rgba(15,23,42,0.2)] sm:mt-10 sm:px-7 sm:py-3.5"
            >
              Play Again
            </button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
