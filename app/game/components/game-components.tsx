import { memo, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import Confetti from "react-confetti";
import { FiHeart } from "react-icons/fi";
import { hoverSound } from "../../lib/sounds";

import type { AppView } from "../../views/app-view";
import { getGradientQualityFill } from "../gradient-quality";
import { DIFFICULTY_LABELS, formatTime } from "../game-logic";
import { getConfettiViewportSize } from "../confetti-logic";
import type { PersonalBestStatus } from "../personal-best";
import type { ThemeMode } from "../settings-options";
import { DifficultyConfig, DifficultyKey, EndlessStats, Tile } from "../game-types";

const TILE_REST_SHADOW = "0 10px 24px rgba(148, 163, 184, 0.12)";
const TILE_HOVER_SHADOW = "0 20px 38px rgba(148, 163, 184, 0.24)";
const TILE_DRAG_SHADOW = "0 22px 44px rgba(148, 163, 184, 0.28)";
const TILE_TILT_MAX_DEGREES = 4;
const TILE_HOVER_SCALE = 1.015;
const TILE_PRESS_SCALE = 1.065;
const TILE_DRAG_SCALE = TILE_PRESS_SCALE;
const TILE_HOVER_LIFT_PX = -4;
const TILE_PRESS_LIFT_PX = -6;
const TILE_INTERACTION_SPRING = {
  type: "spring" as const,
  stiffness: 560,
  damping: 30,
  mass: 0.58,
};
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
  endlessInfo?: {
    puzzleNumber: number;
    swapBudget: number;
  };
  gradientQuality: number;
  moves: number;
  timeDisplay: string;
  timeWarning: boolean;
};

export function GameHud({
  bestMoves,
  bestTimeDisplay,
  endlessInfo,
  gradientQuality,
  moves,
  timeDisplay,
  timeWarning,
}: Readonly<HudProps>) {
  const [animatedQuality, setAnimatedQuality] = useState(gradientQuality);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = animatedQuality;
    const targetValue = gradientQuality;

    if (startValue === targetValue || typeof window === "undefined") {
      setAnimatedQuality(targetValue);
      return;
    }

    const durationMs = 520;
    const startTime = window.performance.now();

    const tick = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + (targetValue - startValue) * easedProgress);

      setAnimatedQuality(nextValue);

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
      } else {
        animationFrameRef.current = null;
      }
    };

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [gradientQuality]);

  const qualityFill = getGradientQualityFill(animatedQuality);
  const moveDisplay = endlessInfo ? `${moves}/${endlessInfo.swapBudget}` : moves;
  const moveLabel = endlessInfo ? "Swaps" : "Moves";
  const progressLabel = endlessInfo ? `Puzzle ${endlessInfo.puzzleNumber}` : "Progress";

  return (
    <section className="flex w-full max-w-none flex-col gap-[clamp(0.3rem,0.7vw,0.75rem)]">
      <div className="game-hud-compact theme-panel relative overflow-hidden rounded-[clamp(1rem,2vw,1.5rem)] border px-[clamp(0.65rem,1.25vw,1rem)] py-[clamp(0.45rem,1vw,0.8rem)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="theme-text-muted font-fredoka-strong text-[0.52rem] uppercase leading-none tracking-[0.16em]">
              Time
            </p>
            <p className={`mt-1 font-fredoka-display text-[1.3rem] leading-none tracking-tight ${timeWarning ? "theme-text-danger" : "theme-text-primary"}`}>
              {timeDisplay}
            </p>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <div className="text-center">
              <p className="theme-text-muted font-fredoka-strong text-[0.52rem] uppercase leading-none tracking-[0.16em]">
                {moveLabel}
              </p>
              <p className="theme-text-primary mt-1 font-fredoka-display text-[1.15rem] leading-none tracking-tight">
                {moveDisplay}
              </p>
            </div>
            <div className="h-9 w-px bg-[var(--border-soft)]" aria-hidden="true" />
            <div className="text-right">
              <p className="theme-text-muted font-fredoka-strong text-[0.52rem] uppercase leading-none tracking-[0.16em]">
                {progressLabel}
              </p>
              <p className="theme-text-primary mt-1 font-fredoka-display text-[1.15rem] leading-none tracking-[-0.05em]">
                {animatedQuality}%
              </p>
            </div>
          </div>
        </div>

        <div className="theme-progress-track relative z-10 mt-2 h-1.5 overflow-hidden rounded-full">
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,#ff5f6d_0%,#fbbf24_30%,#34d399_62%,#60a5fa_100%)] shadow-[0_8px_18px_rgba(96,165,250,0.26)]"
            animate={{ width: `${qualityFill}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <div className="game-hud-full flex flex-col gap-2">
  {!endlessInfo && (
  <div className="grid grid-cols-2 gap-2">
    <div className="theme-card rounded-xl border px-3 py-2 text-center backdrop-blur">
      <p className="theme-text-muted font-fredoka-strong text-[11px] uppercase leading-none tracking-[0.14em]">
        Time Record
      </p>
      <p className="theme-text-primary mt-0.5 font-fredoka-display text-xl leading-none tracking-tight">
        {bestTimeDisplay}
      </p>
    </div>

    <div className="theme-card rounded-xl border px-3 py-2 text-center backdrop-blur">
      <p className="theme-text-muted font-fredoka-strong text-[11px] uppercase leading-none tracking-[0.14em]">
        Move Record
      </p>
      <p className="theme-text-primary mt-0.5 font-fredoka-display text-xl leading-none tracking-tight">
        {bestMoves ?? "-"}
      </p>
    </div>
  </div>
  )}

  <div className="theme-panel relative overflow-hidden rounded-2xl border px-3 py-2 backdrop-blur">
    <div className="grid min-w-0 grid-cols-3 gap-2">
      <div className="min-w-0 text-left">
        <p className="theme-text-muted font-fredoka-strong text-[11px] uppercase leading-none tracking-[0.14em]">
          Time
        </p>
        <p
          className={`mt-0.5 font-fredoka-display text-[32px] leading-none tracking-tight ${
            timeWarning ? "theme-text-danger" : "theme-text-primary"
          }`}
        >
          {timeDisplay}
        </p>
      </div>

      <div className="min-w-0 text-center">
        <p className="theme-text-muted font-fredoka-strong text-[11px] uppercase leading-none tracking-[0.14em]">
          {moveLabel}
        </p>
        <p className="theme-text-primary mt-0.5 font-fredoka-display text-[32px] leading-none tracking-tight">
          {moveDisplay}
        </p>
      </div>

      <div className="min-w-0 text-right">
        <p className="theme-text-muted font-fredoka-strong text-[11px] uppercase leading-none tracking-[0.14em]">
          {progressLabel}
        </p>
        <p className="theme-text-primary mt-0.5 font-fredoka-display text-[30px] leading-none tracking-[-0.05em]">
          {animatedQuality}%
        </p>
      </div>
    </div>

    <div className="theme-progress-track relative z-10 mt-2 h-2 overflow-hidden rounded-full">
      <motion.div
        className="h-full rounded-full bg-[linear-gradient(90deg,#ff5f6d_0%,#fbbf24_30%,#34d399_62%,#60a5fa_100%)] shadow-[0_8px_18px_rgba(96,165,250,0.26)]"
        animate={{ width: `${qualityFill}%` }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
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
    grabX: number;
    height: number;
    index: number;
    isCorrect: boolean;
    offsetX: number;
    offsetY: number;
    pointerX: number;
    pointerY: number;
    pointerId: number;
    tileId: string;
    width: number;
  } | null;
  draggedIndex: number | null;
  confettiActive: boolean;
  getTileRef: (tileId: string) => (element: HTMLButtonElement | null) => void;
  setDragOverlayRef: (element: HTMLDivElement | null) => void;
  tileRadiusClass: string;
  winWaveActive: boolean;
  winState: boolean;
  loseState: boolean;
  isTileCorrect: (tile: Tile, index: number) => boolean;
  isTileLocked: (tile: Tile, index: number) => boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, index: number) => void;
  pressedTileIndex: number | null;
};

type TileButtonProps = {
  canDrag: boolean;
  canHover: boolean;
  index: number;
  isCorrect: boolean;
  isDragging: boolean;
  isPressed: boolean;
  tile: Tile;
  tileRadiusClass: string;
  winWaveActive: boolean;
  winWaveDelay: number;
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
  isPressed,
  tile,
  tileRadiusClass,
  winWaveActive,
  winWaveDelay,
  winState,
  loseState,
  tileRef,
  onPointerDown,
}: Readonly<TileButtonProps>) {
  const [isHovering, setIsHovering] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  const resetTilt = () => {
    setIsHovering(false);
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!canHover || isDragging) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) / bounds.width;
    const relativeY = (event.clientY - bounds.top) / bounds.height;
    const rotateY = (relativeX - 0.5) * TILE_TILT_MAX_DEGREES * 1.2;
    const rotateX = (0.5 - relativeY) * TILE_TILT_MAX_DEGREES * 1.2;

    setIsHovering(true);
    setTilt({ rotateX, rotateY });
  };

  return (
    <motion.button
      initial={false}
      ref={tileRef}
      type="button"

      onPointerEnter={() => {
  if (!isDragging && canHover) {
    hoverSound.play();
  }
}}

      data-tile-index={index}
      onPointerDown={(event) => onPointerDown(event, index)}
      disabled={winState || loseState}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onBlur={resetTilt}
      animate={{
        opacity: isDragging ? 0 : 1,
        rotateX: winWaveActive ? 0 : tilt.rotateX,
        rotateY: winWaveActive ? 0 : tilt.rotateY,
        scale: winWaveActive ? [1, 1.08, 1.03, 1] : isPressed ? TILE_PRESS_SCALE : isHovering && !isDragging ? TILE_HOVER_SCALE : 1,
        y: winWaveActive ? [0, -8, -3, 0] : isPressed ? TILE_PRESS_LIFT_PX : isHovering && !isDragging ? TILE_HOVER_LIFT_PX : 0,
        boxShadow: winWaveActive
          ? [TILE_REST_SHADOW, TILE_HOVER_SHADOW, TILE_DRAG_SHADOW, TILE_REST_SHADOW]
          : isPressed
            ? TILE_DRAG_SHADOW
          : isHovering && !isDragging
            ? TILE_HOVER_SHADOW
            : TILE_REST_SHADOW,
        filter: winWaveActive
          ? ["saturate(1) brightness(1)", "saturate(1.18) brightness(1.08)", "saturate(1.08) brightness(1.03)", "saturate(1) brightness(1)"]
          : isPressed
            ? "saturate(1.12) brightness(1.04)"
          : isHovering && !isDragging
            ? "saturate(1.04) brightness(1.02)"
            : "saturate(1) brightness(1)",
      }}
      transition={
        winWaveActive
          ? {
              duration: 0.46,
              ease: [0.22, 1, 0.36, 1],
              delay: winWaveDelay,
            }
          : {
              ...TILE_INTERACTION_SPRING,
            }
      }
      className={`tile-surface relative aspect-square border border-white/75 ${tileRadiusClass} ${
        isDragging ? "pointer-events-none" : ""
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
    previousProps.isPressed === nextProps.isPressed &&
    previousProps.tile === nextProps.tile &&
    previousProps.tileRadiusClass === nextProps.tileRadiusClass &&
    previousProps.winWaveActive === nextProps.winWaveActive &&
    previousProps.winWaveDelay === nextProps.winWaveDelay &&
    previousProps.winState === nextProps.winState &&
    previousProps.loseState === nextProps.loseState
  );
});

export const GameBoard = memo(function GameBoard({
  allowHoverWhenLocked,
  board,
  boardDensityClass,
  dragSession,
  draggedIndex,
  confettiActive,
  getTileRef,
  setDragOverlayRef,
  tileRadiusClass,
  winWaveActive,
  winState,
  loseState,
  isTileCorrect,
  isTileLocked,
  onPointerDown,
  pressedTileIndex,
}: Readonly<BoardProps>) {
  const size = Math.sqrt(board.length);
  const initialOverlayX = dragSession ? dragSession.pointerX - dragSession.offsetX : 0;
  const initialOverlayY = dragSession ? dragSession.pointerY - dragSession.offsetY : 0;
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
              transform: `translate3d(${initialOverlayX}px, ${initialOverlayY}px, 0) scale(${TILE_DRAG_SCALE}) rotate(0deg)`,
              transition: "transform 110ms cubic-bezier(0.22, 1, 0.36, 1)",
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
        className="theme-board-frame relative mx-auto aspect-square w-full rounded-[clamp(0.9rem,1.8vw,1.2rem)] p-px"
        initial={false}
        animate={
          confettiActive
            ? {
                scale: [1, 1.018, 1.006, 1],
              }
            : {
                scale: 1,
                boxShadow: "var(--board-frame-shadow)",
              }
        }
        transition={
          confettiActive
            ? { duration: 1.45, ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.2 }
        }
      >
        {confettiActive && (
          <motion.div
            aria-hidden="true"
            className="theme-board-glow pointer-events-none absolute -inset-5 rounded-[1.6rem] sm:-inset-6 sm:rounded-[1.9rem] md:-inset-7 md:rounded-[2.1rem] lg:-inset-8 lg:rounded-[2.5rem]"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: [0, 0.75, 0.9, 0.2], scale: [0.96, 1, 1.035, 1.04] }}
            transition={{ duration: 1.85, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
        <div className="theme-board-shell relative h-full w-full overflow-hidden rounded-[calc(clamp(0.9rem,1.8vw,1.2rem)-1px)] p-[clamp(0.2rem,0.45vw,0.4rem)] backdrop-blur-[20px]">
          {confettiActive && (
            <motion.div
              aria-hidden="true"
              className="theme-board-shine pointer-events-none absolute inset-y-0 -left-1/2 w-[72%]"
              initial={{ x: "-22%", opacity: 0 }}
              animate={{ x: "230%", opacity: [0, 1, 1, 0] }}
              transition={{ duration: 3, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
          <div
            className={`board-grid ${boardDensityClass} grid h-full w-full rounded-[clamp(0.9rem,1.6vw,1.35rem)]`}
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
              const columnIndex = index % size;

              return (
                <TileButton
                  key={tile.id}
                  canDrag={canDrag}
                  canHover={canHover}
                  index={index}
                  isCorrect={isCorrect}
                  isDragging={isDragging && dragSession !== null}
                  isPressed={pressedTileIndex === index}
                  tile={tile}
                  tileRadiusClass={tileRadiusClass}
                  winWaveActive={winWaveActive}
                  winWaveDelay={columnIndex * 0.045}
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
});

type ConfettiProps = {
  active: boolean;
};

export function WinConfetti({ active }: Readonly<ConfettiProps>) {
  const [viewportSize, setViewportSize] = useState(() =>
    typeof window === "undefined" ? { width: 0, height: 0 } : getConfettiViewportSize(window),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateViewportSize = () => {
      setViewportSize(getConfettiViewportSize(window));
    };

    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);

    return () => {
      window.removeEventListener("resize", updateViewportSize);
    };
  }, []);

  if (!active || typeof document === "undefined" || viewportSize.width === 0 || viewportSize.height === 0) {
    return null;
  }

  return createPortal(
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[12] overflow-hidden">
      <Confetti
        colors={["#ff2344", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"]}
        gravity={0.18}
        initialVelocityY={{ min: 10, max: 22 }}
        numberOfPieces={300}
        recycle={false}
        run={active}
        tweenDuration={8500}
        width={viewportSize.width}
        height={viewportSize.height}
      />
    </div>,
    document.body,
  );
}

type ModalProps = {
  activeConfig: DifficultyConfig;
  accuracy: number;
  completion: number;
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
            endlessResult ? (
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

          {!endlessResult && (
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
type ControlsProps = {
  onAutoSolve: () => void;
  showDevControls: boolean;
};

function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" />
    </svg>
  );
}

function PrivacyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" />
      <path d="M9.5 12l2 2 3-4" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.65rem] w-[1.65rem] pointer-events-none" // 👈 add this
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.65rem] w-[1.65rem] pointer-events-none" // 👈 add this
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export function ThemeToggle({
  onThemeModeChange,
  themeMode,
}: Readonly<{
  onThemeModeChange: (themeMode: ThemeMode) => void;
  themeMode: ThemeMode;
}>) {
  return (
    <button
      type="button"
      onClick={() => {
  // buttonClickSound.stop();
  // buttonClickSound.play();
  onThemeModeChange(themeMode === "light" ? "dark" : "light");
}}
      aria-label={`Switch to ${themeMode === "light" ? "dark" : "light"} theme`}
      className="theme-header-surface flex h-[3.3rem] w-[3.3rem] items-center justify-center rounded-full border shadow-[0_14px_26px_rgba(15,23,42,0.16)] sm:h-[3.85rem] sm:w-[3.85rem]"
    >
      <motion.span
        key={themeMode}
        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {themeMode === "dark" ? <MoonIcon /> : <SunIcon />}
      </motion.span>
    </button>
  );
}

type GameDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onNavigateView: (view: AppView) => void;
};

export function GameDrawer({
  isOpen,
  onClose,
  onNavigateView,
}: Readonly<GameDrawerProps>) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const handleNavigate = (view: AppView) => {
    onNavigateView(view);
    onClose();
  };

  return (
    <>
      {createPortal(
        <motion.div
          className="theme-overlay fixed inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          onClick={onClose}
          aria-hidden="true"
        />,
        document.body,
      )}
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
        className="theme-modal absolute left-0 top-full z-50 mt-2 w-[16.5rem] max-w-[calc(100vw-1.25rem)] rounded-[1.35rem] border p-4 shadow-[0_22px_48px_rgba(15,23,42,0.18)] sm:w-[17.5rem]"
        initial={{ opacity: 0, y: -10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <div className="flex flex-col gap-2">
           <a
  href="https://docs.google.com/forms/d/e/1FAIpQLSdp1wH5CwgKNMWrRGUOHGrHrMTOM2mpm2Q69OkaxSFPpn_8Ng/viewform"
  target="_blank"
  rel="noopener noreferrer"
  onClick={onClose}
  className="theme-button-secondary flex items-center gap-3 rounded-[1rem] px-4 py-3 text-left"
>
  <span className="theme-text-secondary">
    <MessageIcon />
  </span>
  <span className="font-fredoka-strong text-[1rem] leading-none">
    Give Feedback
  </span>
</a>


            <button
              type="button"
              onClick={() => handleNavigate("about")}
              className="theme-button-secondary flex items-center gap-3 rounded-[1rem] px-4 py-3 text-left"
            >
              <span className="theme-text-secondary">
                <InfoIcon />
              </span>
              <span className="font-fredoka-strong text-[1rem] leading-none">About</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigate("privacy")}
              className="theme-button-secondary flex items-center gap-3 rounded-[1rem] px-4 py-3 text-left"
            >
              <span className="theme-text-secondary">
                <PrivacyIcon />
              </span>
              <span className="font-fredoka-strong text-[1rem] leading-none">Privacy Policy</span>
            </button>

            


            <button
              type="button"
              onClick={() => handleNavigate("tutorial")}
              className="theme-button-secondary flex items-center gap-3 rounded-[1rem] px-4 py-3 text-left"
            >
              <span className="theme-text-secondary">
                <BookIcon />
              </span>
              <span className="font-fredoka-strong text-[1rem] leading-none">Tutorial</span>
            </button>

         <a
  href="https://ko-fi.com/orka67"
  target="_blank"
  rel="noopener noreferrer"
  className="theme-button-secondary flex items-center gap-3 rounded-[1rem] px-4 py-3 text-left"
>
  <span className="theme-text-secondary">
    <FiHeart />
  </span>
  <span className="font-fredoka-strong text-[1rem] leading-none">
    Buy me a coffee
  </span>
</a>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

type GameModeModalProps = {
  difficulty: DifficultyKey;
  isOpen: boolean;
  onClose: () => void;
  onDifficultyChange: (difficulty: DifficultyKey) => void;
};

export function GameModeModal({
  difficulty,
  isOpen,
  onClose,
  onDifficultyChange,
}: Readonly<GameModeModalProps>) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

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
        aria-label="Select game mode"
        className="theme-modal relative w-full max-w-[35rem] rounded-[1.5rem] border p-7 sm:rounded-[1.75rem] sm:p-8"
        initial={{ opacity: 0, y: 18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="theme-text-muted font-fredoka-strong text-[0.78rem] uppercase tracking-[0.2em] sm:text-sm sm:tracking-[0.24em]">
              Modes
            </p>
            <h2 className="theme-text-primary font-fredoka-display mt-2 text-[1.9rem] leading-none sm:text-[2.2rem]">
              Choose a mode
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modes window"
            className="theme-close-button font-fredoka-strong flex h-11 w-11 items-center justify-center rounded-full"
          >
            {"\u00D7"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-3.5">
          {(Object.keys(DIFFICULTY_LABELS) as DifficultyKey[]).map((key) => {
            const isActive = difficulty === key;
            const isEndless = key === "endless";

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onDifficultyChange(key);
                  onClose();
                }}
                className={`font-fredoka-strong rounded-[1rem] px-4 py-3.5 text-base leading-tight transition sm:rounded-2xl sm:px-4 ${
                  isEndless ? "col-span-2" : ""
                } ${
                  isActive ? "theme-button-primary" : "theme-button-secondary"
                }`}
              >
                {DIFFICULTY_LABELS[key]}
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

type ShopComingSoonModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ShopComingSoonModal({
  isOpen,
  onClose,
}: Readonly<ShopComingSoonModalProps>) {
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
        aria-label="Shop coming soon"
        className="theme-modal relative w-full max-w-[24rem] rounded-[1.5rem] border p-7 text-center sm:rounded-[1.75rem] sm:p-8"
        initial={{ opacity: 0, y: 18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close shop window"
          className="theme-close-button font-fredoka-strong absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full"
        >
          {"\u00D7"}
        </button>
        <h2 className="theme-text-primary font-fredoka-display mt-8 text-[2rem] leading-none sm:text-[2.35rem]">
          Coming soon..
        </h2>
        <p className="theme-text-muted font-fredoka-regular mt-4 text-base leading-6">
          The shop is not open yet.
        </p>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

type LeaderboardCategoryId = "fastest" | "moves" | "streaks";

type LeaderboardCategory = {
  id: LeaderboardCategoryId;
  label: string;
  title: string;
  metricLabel: string;
  modes: DifficultyKey[];
};

type LeaderboardApiRow = {
  created_at: string;
  difficulty: DifficultyKey;
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
    modes: ["normal", "hard", "expert", "extreme"],
  },
  {
    id: "moves",
    label: "Fewest moves",
    title: "Fewest moves",
    metricLabel: "Moves",
    modes: ["normal", "hard", "expert", "extreme"],
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
  const [selectedModes, setSelectedModes] = useState<Record<LeaderboardCategoryId, DifficultyKey>>({
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

export function GameControls({
  onAutoSolve,
  showDevControls,
}: Readonly<ControlsProps>) {
  return (
    <section className="flex w-full justify-center">
      <div className="flex w-full max-w-[42rem] flex-col gap-[clamp(0.5rem,1.2vw,0.85rem)] sm:flex-row sm:justify-center">
          {showDevControls && (
            <button
              type="button"
              onClick={onAutoSolve}
              className="theme-button-accent font-fredoka-strong flex min-h-[clamp(3rem,5vw,4rem)] w-full items-center justify-center rounded-[clamp(0.9rem,1.8vw,1.25rem)] px-[clamp(0.8rem,1.6vw,1.1rem)] py-[clamp(0.7rem,1.2vw,0.95rem)] text-center text-[clamp(0.8rem,1.35vw,0.92rem)] leading-tight transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto sm:min-w-[clamp(7.5rem,13vw,9.5rem)]"
            >
              Auto Solve
            </button>
          )}
      </div>
    </section>
  );
}

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
