import { DragEvent } from "react";

import { DIFFICULTIES } from "./game-logic";
import { DifficultyConfig, DifficultyKey, Tile } from "./game-types";

export function CheckMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-9 w-9 text-slate-900/35 sm:h-10 sm:w-10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12.5 9.5 17 19 7.5" />
    </svg>
  );
}

type HudProps = {
  completion: number;
  difficultyLabel: string;
  moves: number;
  timeDisplay: string;
  timeWarning: boolean;
};

export function GameHud({
  completion,
  difficultyLabel,
  moves,
  timeDisplay,
  timeWarning,
}: HudProps) {
  return (
    <section className="mb-5 flex w-full max-w-[28rem] items-center justify-between rounded-[1.75rem] border border-slate-200/90 bg-white/95 px-5 py-3 shadow-[0_16px_44px_rgba(148,163,184,0.12)] backdrop-blur">
      <div>
        <p className={`text-4xl font-black leading-none tracking-tight ${timeWarning ? "text-rose-500" : "text-slate-800"}`}>
          {timeDisplay}
        </p>
      </div>

      <div className="text-right">
        <p className="text-sm font-medium leading-none text-slate-500">{difficultyLabel}</p>
        <p className="mt-2 text-base font-semibold leading-none text-slate-800">
          {moves} moves | {completion}%
        </p>
      </div>
    </section>
  );
}

type BoardProps = {
  board: Tile[];
  boardGap: string;
  boardPadding: string;
  draggedIndex: number | null;
  tileRadiusClass: string;
  winState: boolean;
  loseState: boolean;
  isTileCorrect: (tile: Tile, index: number) => boolean;
  isTileLocked: (tile: Tile, index: number) => boolean;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>, index: number) => void;
  onDrop: (event: DragEvent<HTMLButtonElement>, index: number) => void;
};

export function GameBoard({
  board,
  boardGap,
  boardPadding,
  draggedIndex,
  tileRadiusClass,
  winState,
  loseState,
  isTileCorrect,
  isTileLocked,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
}: BoardProps) {
  const size = Math.sqrt(board.length);

  return (
    <div className="mx-auto aspect-square w-full max-w-[42rem] rounded-[2rem] border border-slate-200/90 bg-white/95 p-2.5 shadow-[0_22px_56px_rgba(148,163,184,0.14)] backdrop-blur sm:p-3">
      <div
        className="grid h-full w-full rounded-[1.5rem]"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gap: boardGap,
          padding: boardPadding,
        }}
      >
        {board.map((tile, index) => {
          const isCorrect = isTileCorrect(tile, index);
          const isDragging = draggedIndex === index;
          const isLocked = isTileLocked(tile, index);
          const canDrag = !isLocked && !winState && !loseState;

          return (
            <button
              key={tile.id}
              type="button"
              draggable={canDrag}
              onDragStart={(event) => onDragStart(event, index)}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={(event) => onDrop(event, index)}
              disabled={winState || loseState}
              className={`relative aspect-square border border-white/75 transition duration-150 ${tileRadiusClass} ${
                isLocked ? "cursor-default" : "cursor-grab active:cursor-grabbing"
              } ${!isLocked ? "hover:-translate-y-0.5 hover:shadow-lg" : ""} ${
                isDragging ? "scale-[0.98] opacity-80 shadow-lg" : "shadow-[0_10px_24px_rgba(148,163,184,0.12)]"
              }`}
              style={{ backgroundColor: tile.color }}
              aria-label={`Tile ${index + 1}${tile.isCorner ? ", fixed corner tile" : ""}${isCorrect ? ", correct position" : ""}${isLocked && !tile.isCorner ? ", locked" : ""}`}
            >
              {isCorrect && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <CheckMark />
                </span>
              )}
              <span className="sr-only">{tile.color}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type ModalProps = {
  activeConfig: DifficultyConfig;
  completion: number;
  loseState: boolean;
  moves: number;
  onRestart: () => void;
  timeDisplay: string;
  winState: boolean;
};

export function GameModal({
  activeConfig,
  completion,
  loseState,
  moves,
  onRestart,
  timeDisplay,
  winState,
}: ModalProps) {
  if (!winState && !loseState) {
    return null;
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-[2rem] bg-slate-900/18 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[1.75rem] border border-slate-200/80 bg-white p-6 text-center shadow-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          {winState ? "Puzzle Solved" : "Time's Up"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-800">
          {winState ? "You restored the gradient." : "The board needs another pass."}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {winState
            ? `Finished in ${moves} moves with ${timeDisplay} left.`
            : `You reached ${completion}% completion on ${activeConfig.label.toLowerCase()}.`}
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-5 rounded-full bg-slate-800 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}

type ControlsProps = {
  customSize: number;
  customTime: number;
  difficulty: DifficultyKey;
  onCustomSizeChange: (value: number) => void;
  onCustomTimeChange: (value: number) => void;
  onDifficultyChange: (difficulty: DifficultyKey) => void;
  onRestart: () => void;
};

export function GameControls({
  customSize,
  customTime,
  difficulty,
  onCustomSizeChange,
  onCustomTimeChange,
  onDifficultyChange,
  onRestart: onShuffle,
}: ControlsProps) {
  return (
    <section className="mt-5 flex w-full max-w-[42rem] flex-col gap-3">
      <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/90 p-3 shadow-[0_16px_40px_rgba(148,163,184,0.1)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {(Object.keys(DIFFICULTIES) as DifficultyKey[]).map((key) => {
            const isActive = difficulty === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onDifficultyChange(key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {DIFFICULTIES[key].label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onShuffle}
            className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Shuffle
          </button>
        </div>

        {difficulty === "custom" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">
                Grid Size
              </span>
              <input
                type="number"
                min={3}
                max={12}
                value={customSize}
                onChange={(event) => onCustomSizeChange(Number(event.target.value) || 3)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
              />
            </label>

            <label className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">
                Time Limit
              </span>
              <input
                type="number"
                min={10}
                max={180}
                value={customTime}
                onChange={(event) => onCustomTimeChange(Number(event.target.value) || 10)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
              />
            </label>
          </div>
        )}
      </div>
    </section>
  );
}
