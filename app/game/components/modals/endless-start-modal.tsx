import { createPortal } from "react-dom";

import type { EndlessStats } from "../../game-types";

type EndlessStartModalProps = {
  currentStreak: number;
  endlessStats: EndlessStats;
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
};

export function EndlessStartModal({
  currentStreak,
  endlessStats,
  isOpen,
  onClose,
  onStart,
}: Readonly<EndlessStartModalProps>) {
  if (!isOpen) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="theme-overlay fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="theme-modal w-full max-w-[40.5rem] rounded-[1.5rem] border p-7 sm:rounded-[1.75rem] sm:p-9">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="theme-text-primary font-fredoka-display text-[1.95rem] leading-none sm:text-[2.4rem]">Endless</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close endless window"
            className="theme-close-button font-fredoka-strong flex h-11 w-11 items-center justify-center rounded-full"
          >
            {"\u00D7"}
          </button>
        </div>

        <div className="theme-panel-muted mt-6 rounded-[1rem] p-4 sm:rounded-2xl">
          <p className="theme-text-primary font-fredoka-strong text-base">Progress</p>
          <p className="theme-text-primary font-fredoka-display mt-3 text-[1.25rem] leading-none">
            {endlessStats.threeStarClears} three-star clears
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="theme-text-primary font-fredoka-display text-xl leading-none">{endlessStats.clears}</p>
              <p className="theme-text-muted font-fredoka-regular mt-1 text-xs">clears</p>
            </div>
            <div>
              <p className="theme-text-primary font-fredoka-display text-xl leading-none">{currentStreak}</p>
              <p className="theme-text-muted font-fredoka-regular mt-1 text-xs">current streak</p>
            </div>
            <div>
              <p className="theme-text-primary font-fredoka-display text-xl leading-none">{endlessStats.bestStreak}</p>
              <p className="theme-text-muted font-fredoka-regular mt-1 text-xs">best streak</p>
            </div>
          </div>
        </div>

        <div className="theme-panel-muted mt-3 rounded-[1rem] p-4 sm:rounded-2xl">
          <p className="theme-text-primary font-fredoka-strong text-base">Next puzzle</p>
          <p className="theme-text-muted font-fredoka-regular mt-3 text-sm leading-5">
            Solve before the swap limit. Three-star clears need efficient routes, and failed challenges reset the run to puzzle one.
          </p>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={onStart}
            className="theme-button-primary font-fredoka-strong w-full rounded-full px-5 py-3 text-sm sm:text-base"
          >
            Start Puzzle
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
