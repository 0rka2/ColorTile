import { memo, PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

import { DIFFICULTY_LABELS } from "./game-logic";
import { DifficultyConfig, DifficultyKey, Tile } from "./game-types";

const TILE_REST_SHADOW = "0 10px 24px rgba(148, 163, 184, 0.12)";
const TILE_HOVER_SHADOW = "0 20px 38px rgba(148, 163, 184, 0.24)";
const TILE_DRAG_SHADOW = "0 16px 34px rgba(148, 163, 184, 0.22)";
const CELEBRATION_CONFETTI = [
  { left: "8%", top: "12%", color: "#fb7185", delay: 0 },
  { left: "19%", top: "6%", color: "#fbbf24", delay: 0.08 },
  { left: "32%", top: "16%", color: "#34d399", delay: 0.16 },
  { left: "68%", top: "9%", color: "#60a5fa", delay: 0.04 },
  { left: "82%", top: "14%", color: "#a78bfa", delay: 0.12 },
  { left: "91%", top: "24%", color: "#f472b6", delay: 0.2 },
];
const TIME_UP_QUOTES = [
  "Almost there!",
  "That gradient was fighting back.",
  "Only a few swaps from perfection.",
  "The colors aren't blending yet.",
  "So close. Try one more run.",
];

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
  bestMoves: number | null;
  bestTimeDisplay: string;
  completion: number;
  difficultyLabel: string;
  moves: number;
  timeDisplay: string;
  timeWarning: boolean;
};

export function GameHud({
  bestMoves,
  bestTimeDisplay,
  completion,
  difficultyLabel,
  moves,
  timeDisplay,
  timeWarning,
}: Readonly<HudProps>) {
  return (
    <section className="mb-5 flex w-full max-w-[36rem] items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center justify-between rounded-[1.75rem] border border-slate-200/90 bg-white/95 px-5 py-3 shadow-[0_16px_44px_rgba(148,163,184,0.12)] backdrop-blur">
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
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-[6.25rem] rounded-[1.15rem] border border-slate-200/90 bg-white/95 px-3 py-2 text-center shadow-[0_12px_28px_rgba(148,163,184,0.10)] backdrop-blur">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-slate-400">Best Time</p>
          <p className="mt-1 text-xl font-black leading-none text-slate-800">{bestTimeDisplay}</p>
        </div>
        <div className="min-w-[6.25rem] rounded-[1.15rem] border border-slate-200/90 bg-white/95 px-3 py-2 text-center shadow-[0_12px_28px_rgba(148,163,184,0.10)] backdrop-blur">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-slate-400">Fewest Moves</p>
          <p className="mt-1 text-xl font-black leading-none text-slate-800">{bestMoves ?? "-"}</p>
        </div>
      </div>
    </section>
  );
}

type BoardProps = {
  allowHoverWhenLocked: boolean;
  board: Tile[];
  boardDensityClass: string;
  dragSession: {
    color: string;
    height: number;
    index: number;
    isCorrect: boolean;
    offsetX: number;
    offsetY: number;
    pointerId: number;
    tileId: string;
    width: number;
  } | null;
  draggedIndex: number | null;
  getTileRef: (tileId: string) => (element: HTMLButtonElement | null) => void;
  hoveredTargetIndex: number | null;
  setDragOverlayRef: (element: HTMLDivElement | null) => void;
  tileRadiusClass: string;
  winCelebrationActive: boolean;
  winState: boolean;
  loseState: boolean;
  isTileCorrect: (tile: Tile, index: number) => boolean;
  isTileLocked: (tile: Tile, index: number) => boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, index: number) => void;
};

type TileButtonProps = {
  canDrag: boolean;
  canHover: boolean;
  index: number;
  isCorrect: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  tile: Tile;
  tileRadiusClass: string;
  winState: boolean;
  loseState: boolean;
  tileRef: (element: HTMLButtonElement | null) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, index: number) => void;
};

const TileButton = memo(function TileButton({
  canDrag,
  canHover,
  index,
  isCorrect,
  isDragging,
  isDropTarget,
  tile,
  tileRadiusClass,
  winState,
  loseState,
  tileRef,
  onPointerDown,
}: Readonly<TileButtonProps>) {
  return (
    <motion.button
      initial={false}
      ref={tileRef}
      type="button"
      data-tile-index={index}
      onPointerDown={(event) => onPointerDown(event, index)}
      disabled={winState || loseState}
      transition={{
        duration: 0.18,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      animate={{
        opacity: isDragging ? 0 : 1,
        scale: 1,
        y: 0,
        boxShadow: TILE_REST_SHADOW,
        filter: "saturate(1) brightness(1)",
      }}
      whileHover={
        canHover && !isDragging
          ? {
              y: -5,
              scale: 1.02,
              boxShadow: TILE_HOVER_SHADOW,
              filter: "saturate(1.04) brightness(1.02)",
            }
          : undefined
      }
      whileTap={
        canDrag && !isDragging
          ? {
              scale: 0.99,
              boxShadow: TILE_DRAG_SHADOW,
              filter: "saturate(1.08) brightness(1.04)",
            }
          : undefined
      }
      className={`tile-surface relative aspect-square border border-white/75 ${tileRadiusClass} ${
        isDragging ? "pointer-events-none" : isDropTarget ? "ring-2 ring-slate-300/70 ring-offset-2 ring-offset-white/80" : ""
      } ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
      style={{ backgroundColor: tile.color, touchAction: "none" }}
      aria-label={`Tile ${index + 1}${tile.isCorner ? ", fixed corner tile" : ""}${isCorrect ? ", correct position" : ""}${!canDrag && !tile.isCorner ? ", locked" : ""}`}
    >
      <span aria-hidden="true" className="tile-glass-sheen" />
      {isCorrect && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <CheckMark />
        </span>
      )}
      <span className="sr-only">{tile.color}</span>
    </motion.button>
  );
}, (previousProps, nextProps) => {
  return (
    previousProps.canHover === nextProps.canHover &&
    previousProps.canDrag === nextProps.canDrag &&
    previousProps.index === nextProps.index &&
    previousProps.isCorrect === nextProps.isCorrect &&
    previousProps.isDragging === nextProps.isDragging &&
    previousProps.isDropTarget === nextProps.isDropTarget &&
    previousProps.tile === nextProps.tile &&
    previousProps.tileRadiusClass === nextProps.tileRadiusClass &&
    previousProps.winState === nextProps.winState &&
    previousProps.loseState === nextProps.loseState
  );
});

export function GameBoard({
  allowHoverWhenLocked,
  board,
  boardDensityClass,
  dragSession,
  draggedIndex,
  getTileRef,
  hoveredTargetIndex,
  setDragOverlayRef,
  tileRadiusClass,
  winCelebrationActive,
  winState,
  loseState,
  isTileCorrect,
  isTileLocked,
  onPointerDown,
}: Readonly<BoardProps>) {
  const size = Math.sqrt(board.length);
  const dragOverlay =
    dragSession && typeof document !== "undefined"
      ? createPortal(
          <div
            aria-hidden="true"
            ref={setDragOverlayRef}
            className={`tile-drag-overlay pointer-events-none fixed flex items-center justify-center border border-white/75 ${tileRadiusClass}`}
            style={{
              backgroundColor: dragSession.color,
              boxShadow: TILE_DRAG_SHADOW,
              height: `${dragSession.height}px`,
              left: 0,
              opacity: 1,
              top: 0,
              transform: "translate3d(0, 0, 0) scale(0.985)",
              width: `${dragSession.width}px`,
              zIndex: 50,
            }}
          >
            <span aria-hidden="true" className="tile-glass-sheen" />
            {dragSession.isCorrect && <CheckMark />}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <motion.div
        className="mx-auto aspect-square w-full max-w-[58rem] rounded-[1.2rem] bg-gradient-to-br from-white/85 via-slate-100/70 to-sky-100/65 p-px shadow-[0_28px_80px_rgba(15,23,42,0.12),0_12px_28px_rgba(15,23,42,0.07)]"
        initial={false}
        animate={
          winCelebrationActive
            ? {
                scale: [1, 1.01, 1],
                boxShadow: [
                  "0 28px 80px rgba(15,23,42,0.12), 0 12px 28px rgba(15,23,42,0.07)",
                  "0 34px 96px rgba(96,165,250,0.18), 0 18px 34px rgba(52,211,153,0.12)",
                  "0 28px 80px rgba(15,23,42,0.12), 0 12px 28px rgba(15,23,42,0.07)",
                ],
              }
            : {
                scale: 1,
                boxShadow: "0 28px 80px rgba(15,23,42,0.12), 0 12px 28px rgba(15,23,42,0.07)",
              }
        }
        transition={
          winCelebrationActive
            ? { duration: 1.2, ease: [0.22, 1, 0.36, 1], repeat: Infinity, repeatDelay: 0.25 }
            : { duration: 0.2 }
        }
      >
        <div className="relative h-full w-full overflow-hidden rounded-[calc(1.2rem-1px)] bg-[rgba(255,255,255,0.85)] p-2 backdrop-blur-[20px] sm:p-2.5">
          {winCelebrationActive && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent"
              initial={{ x: "-30%" }}
              animate={{ x: "260%" }}
              transition={{ duration: 1.4, ease: "linear", repeat: Infinity, repeatDelay: 0.3 }}
            />
          )}
          <div
            className={`board-grid ${boardDensityClass} grid h-full w-full rounded-[1.5rem]`}
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            }}
          >
            {board.map((tile, index) => {
              const isCorrect = isTileCorrect(tile, index);
              const isDragging = draggedIndex === index;
              const isLocked = isTileLocked(tile, index);
              const canDrag = !isLocked && !winState && !loseState;
              const canHover = allowHoverWhenLocked || (!winState && !loseState && (canDrag || isCorrect));
              const isDropTarget =
                hoveredTargetIndex === index && draggedIndex !== null && draggedIndex !== index && !isLocked;

              return (
                <TileButton
                  key={tile.id}
                  canDrag={canDrag}
                  canHover={canHover}
                  index={index}
                  isCorrect={isCorrect}
                  isDragging={isDragging && dragSession !== null}
                  isDropTarget={isDropTarget}
                  tile={tile}
                  tileRadiusClass={tileRadiusClass}
                  winState={winState}
                  loseState={loseState}
                  tileRef={getTileRef(tile.id)}
                  onPointerDown={onPointerDown}
                />
              );
            })}
          </div>
        </div>
      </motion.div>
      {dragOverlay}
    </>
  );
}

type ModalProps = {
  activeConfig: DifficultyConfig;
  accuracy: number;
  bestCompletion: number | null;
  bestTimeDisplay: string;
  completion: number;
  isDismissed: boolean;
  loseState: boolean;
  moves: number;
  onClose: () => void;
  onRestart: () => void;
  timeDisplay: string;
  winState: boolean;
};

export function GameModal({
  activeConfig,
  accuracy,
  bestCompletion,
  bestTimeDisplay,
  completion,
  isDismissed,
  loseState,
  moves,
  onClose,
  onRestart,
  timeDisplay,
  winState,
}: Readonly<ModalProps>) {
  if ((!winState && !loseState) || isDismissed) {
    return null;
  }

  const timeUpQuote = TIME_UP_QUOTES[(moves + completion + activeConfig.size) % TIME_UP_QUOTES.length];
  const timeUpStars = getTimeUpStars(completion);

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/34 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,248,255,0.92))] p-7 text-center shadow-[0_32px_90px_rgba(15,23,42,0.24),0_14px_34px_rgba(15,23,42,0.12)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-[0_10px_24px_rgba(148,163,184,0.14)] transition hover:bg-white hover:text-slate-700"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ×
          </span>
        </button>

        {winState &&
          CELEBRATION_CONFETTI.map((piece, index) => (
            <motion.span
              key={`${piece.left}-${piece.top}`}
              aria-hidden="true"
              className="absolute h-3 w-3 rounded-sm"
              style={{ backgroundColor: piece.color, left: piece.left, top: piece.top }}
              initial={{ opacity: 0, y: -8, rotate: -18 }}
              animate={{ opacity: [0, 1, 1, 0], y: [0, 8, 22, 34], rotate: [-18, 12, 28] }}
              transition={{ duration: 1.5, delay: piece.delay, repeat: Infinity, repeatDelay: 0.4 + index * 0.03 }}
            />
          ))}

        <div className="relative z-10">
          {winState ? (
            <>
              <p className="text-xs uppercase tracking-[0.34em] text-slate-400">Perfect Gradient</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-900">Gradient Complete!</h2>
              <div className="mt-4 text-sm font-black uppercase tracking-[0.34em] text-amber-500">
                {renderStars(3)}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">
                You restored the gradient with a clean finish on {activeConfig.label.toLowerCase()}.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-[1.4rem] border border-white/80 bg-white/80 px-3 py-3 shadow-[0_16px_34px_rgba(148,163,184,0.12)]">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-slate-400">Time</p>
                  <p className="mt-2 text-xl font-black leading-none text-slate-900">{timeDisplay}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/80 bg-white/80 px-3 py-3 shadow-[0_16px_34px_rgba(148,163,184,0.12)]">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-slate-400">Moves</p>
                  <p className="mt-2 text-xl font-black leading-none text-slate-900">{moves}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/80 bg-white/80 px-3 py-3 shadow-[0_16px_34px_rgba(148,163,184,0.12)]">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-slate-400">Accuracy</p>
                  <p className="mt-2 text-xl font-black leading-none text-slate-900">{accuracy}%</p>
                </div>
              </div>
            </>
          ) : (
            <div className="mx-auto mt-2 max-w-sm">
              <h2 className="text-3xl font-black tracking-[-0.04em] text-slate-900">Time&apos;s up</h2>
              {timeUpStars > 0 && (
                <p className="mt-4 text-base font-black tracking-[0.24em] text-amber-500">{renderStars(timeUpStars)}</p>
              )}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-[1.4rem] border border-white/80 bg-white/80 px-3 py-3 shadow-[0_16px_34px_rgba(148,163,184,0.12)]">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-slate-400">Gradient Completion</p>
                  <p className="mt-2 text-xl font-black leading-none text-slate-900">{completion}%</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/80 bg-white/80 px-3 py-3 shadow-[0_16px_34px_rgba(148,163,184,0.12)]">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-slate-400">Moves</p>
                  <p className="mt-2 text-xl font-black leading-none text-slate-900">{moves}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">{timeUpQuote}</p>
              {completion < 100 && (
                <p className="mt-3 text-sm font-medium text-slate-600">You were only {100 - completion}% away!</p>
              )}
              <div className="mx-auto mt-6 h-px w-full max-w-xs bg-slate-200/90" />
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[1.4rem] border border-white/80 bg-white/70 px-3 py-3 shadow-[0_12px_28px_rgba(148,163,184,0.1)]">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-slate-400">Best Completion</p>
                  <p className="mt-2 text-xl font-black leading-none text-slate-900">{bestCompletion === null ? "-" : `${bestCompletion}%`}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/80 bg-white/70 px-3 py-3 shadow-[0_12px_28px_rgba(148,163,184,0.1)]">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-slate-400">Best Time</p>
                  <p className="mt-2 text-xl font-black leading-none text-slate-900">{bestTimeDisplay}</p>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onRestart}
            className="mt-7 rounded-full bg-slate-800 px-6 py-3 text-sm font-medium text-white shadow-[0_18px_34px_rgba(15,23,42,0.2)] transition hover:bg-slate-700"
          >
            Play Again
          </button>
        </div>
      </motion.div>
    </div>
  );
}
type ControlsProps = {
  difficulty: DifficultyKey;
  onAutoSolve: () => void;
  onDifficultyChange: (difficulty: DifficultyKey) => void;
  onRestart: () => void;
  showDevControls: boolean;
};

export function GameControls({
  difficulty,
  onAutoSolve,
  onDifficultyChange,
  onRestart: onShuffle,
  showDevControls,
}: Readonly<ControlsProps>) {
  return (
    <section className="mt-5 flex w-full max-w-[42rem] flex-col gap-3">
      <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/90 p-3 shadow-[0_16px_40px_rgba(148,163,184,0.1)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {(Object.keys(DIFFICULTY_LABELS) as DifficultyKey[]).map((key) => {
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
                {DIFFICULTY_LABELS[key]}
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

          {showDevControls && (
            <button
              type="button"
              onClick={onAutoSolve}
              className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-200"
            >
              Auto Solve
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

type CustomGameModalProps = {
  draftSize: number;
  draftTime: number;
  isOpen: boolean;
  onClose: () => void;
  onSizeChange: (value: number) => void;
  onStart: () => void;
  onTimeChange: (value: number) => void;
};

export function CustomGameModal({
  draftSize,
  draftTime,
  isOpen,
  onClose,
  onSizeChange,
  onStart,
  onTimeChange,
}: Readonly<CustomGameModalProps>) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/18 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200/90 bg-white p-6 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Custom Game</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-800">Build your board</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Choose your grid size and timer, then press Start when you are ready. The countdown waits for you.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
            <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">
              Grid Size
            </span>
            <input
              type="number"
              min={4}
              max={16}
              value={draftSize}
              onChange={(event) => onSizeChange(Number(event.target.value) || 4)}
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
              max={480}
              value={draftTime}
              onChange={(event) => onTimeChange(Number(event.target.value) || 10)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onStart}
            className="rounded-full bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}

