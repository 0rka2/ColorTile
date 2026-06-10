import { memo, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import Confetti from "react-confetti";

import { GradientText } from "../components/ui/gradient-text";
import { getGradientQualityFill } from "./gradient-quality";
import { DIFFICULTY_LABELS } from "./game-logic";
import { getConfettiViewportSize } from "./confetti-logic";
import { DifficultyConfig, DifficultyKey, Tile } from "./game-types";

const TILE_REST_SHADOW = "0 10px 24px rgba(148, 163, 184, 0.12)";
const TILE_HOVER_SHADOW = "0 20px 38px rgba(148, 163, 184, 0.24)";
const TILE_DRAG_SHADOW = "0 22px 44px rgba(148, 163, 184, 0.28)";
const TILE_TILT_MAX_DEGREES = 4;
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
  difficultyLabel: string;
  gradientQuality: number;
  moves: number;
  timeDisplay: string;
  timeWarning: boolean;
};

export function GameHud({
  bestMoves,
  bestTimeDisplay,
  difficultyLabel,
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

  return (
    <section className="flex w-full max-w-[42rem] flex-col gap-1.5 sm:gap-2 md:gap-2.5">
      <div className="relative overflow-hidden rounded-[1.15rem] border border-slate-200/90 bg-white/95 px-3 py-2.5 shadow-[0_16px_44px_rgba(148,163,184,0.12)] backdrop-blur sm:rounded-[1.35rem] sm:px-4 sm:py-3 md:px-4.5 md:py-3.5 lg:rounded-[1.75rem] lg:px-5 lg:py-4">
        <div className="flex min-w-0 items-end justify-between gap-2.5 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className={`font-fredoka-display text-[2rem] leading-none tracking-tight sm:text-[2.35rem] md:text-[2.75rem] lg:text-5xl ${timeWarning ? "text-rose-500" : "text-slate-800"}`}>
              {timeDisplay}
            </p>
          </div>

          <div className="flex items-end gap-2 sm:gap-3">
            <div className="max-w-[7rem] text-right sm:max-w-[8.5rem] md:max-w-none">
              <p className="font-fredoka-strong text-[0.88rem] leading-none text-slate-500 sm:text-[0.98rem] md:text-[1.05rem]">{difficultyLabel}</p>
              <div className="mt-1.5 inline-flex rounded-full bg-slate-100 px-2.5 py-1 shadow-inner shadow-white/60 sm:px-3 sm:py-1.5">
                <p className="font-fredoka-strong text-[0.88rem] leading-none text-slate-700 sm:text-[0.98rem] md:text-[1.08rem]">{moves} moves</p>
              </div>
            </div>

            <div className="pb-0.5 text-right">
              <p className="font-fredoka-display text-[1.95rem] leading-none tracking-[-0.05em] text-slate-900 sm:text-[2.25rem] md:text-[2.6rem] lg:text-[3rem]">
                {animatedQuality}%
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-100 sm:mt-3 md:h-3 lg:mt-4">
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,#ff5f6d_0%,#fbbf24_30%,#34d399_62%,#60a5fa_100%)] shadow-[0_8px_18px_rgba(96,165,250,0.26)]"
            animate={{ width: `${qualityFill}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 self-stretch sm:gap-2 md:gap-2.5">
        <div className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-[0.95rem] border border-slate-200/90 bg-white/95 px-2.5 py-2.5 text-center shadow-[0_12px_28px_rgba(148,163,184,0.10)] backdrop-blur sm:gap-1.5 sm:rounded-[1rem] sm:px-3 sm:py-3 md:rounded-[1.1rem] md:px-3.5 md:py-3.5">
          <p className="font-fredoka-strong text-[0.82rem] leading-tight text-slate-500 sm:text-[0.92rem] md:text-[1rem] sm:leading-none">Best Time</p>
          <p className="font-fredoka-display text-[1.35rem] leading-none text-slate-800 sm:text-[1.55rem] md:text-[1.72rem]">{bestTimeDisplay}</p>
        </div>
        <div className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-[0.95rem] border border-slate-200/90 bg-white/95 px-2.5 py-2.5 text-center shadow-[0_12px_28px_rgba(148,163,184,0.10)] backdrop-blur sm:gap-1.5 sm:rounded-[1rem] sm:px-3 sm:py-3 md:rounded-[1.1rem] md:px-3.5 md:py-3.5">
          <p className="font-fredoka-strong text-[0.82rem] leading-tight text-slate-500 sm:text-[0.92rem] md:text-[1rem] sm:leading-none">Fewest Moves</p>
          <p className="font-fredoka-display text-[1.35rem] leading-none text-slate-800 sm:text-[1.55rem] md:text-[1.72rem]">{bestMoves ?? "-"}</p>
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
};

type TileButtonProps = {
  canDrag: boolean;
  canHover: boolean;
  index: number;
  isCorrect: boolean;
  isDragging: boolean;
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
    const rotateY = (relativeX - 0.5) * TILE_TILT_MAX_DEGREES * 2;
    const rotateX = (0.5 - relativeY) * TILE_TILT_MAX_DEGREES * 2;

    setIsHovering(true);
    setTilt({ rotateX, rotateY });
  };

  return (
    <motion.button
      initial={false}
      ref={tileRef}
      type="button"
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
        scale: winWaveActive ? [1, 1.06, 1.015, 0.992, 1] : isHovering && !isDragging ? 1.02 : 1,
        y: winWaveActive ? [0, -5, -2, 0.5, 0] : isHovering && !isDragging ? -5 : 0,
        boxShadow: winWaveActive
          ? [TILE_REST_SHADOW, TILE_HOVER_SHADOW, TILE_DRAG_SHADOW, TILE_HOVER_SHADOW, TILE_REST_SHADOW]
          : isHovering && !isDragging
            ? TILE_HOVER_SHADOW
            : TILE_REST_SHADOW,
        filter: isHovering && !isDragging ? "saturate(1.04) brightness(1.02)" : "saturate(1) brightness(1)",
      }}
      transition={
        winWaveActive
          ? {
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
              delay: winWaveDelay,
            }
          : {
              type: "spring",
              stiffness: 360,
              damping: 24,
              mass: 0.85,
            }
      }
      whileTap={
        canDrag && !isDragging
          ? {
              scale: 1.01,
              boxShadow: TILE_DRAG_SHADOW,
              filter: "saturate(1.08) brightness(1.04)",
            }
          : undefined
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
              transform: `translate3d(${initialOverlayX}px, ${initialOverlayY}px, 0) scale(1.04) rotate(0deg)`,
              transition: "transform 160ms cubic-bezier(0.22, 1, 0.36, 1)",
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
        className="mx-auto aspect-square w-full max-w-[42rem] rounded-[0.95rem] bg-gradient-to-br from-white/85 via-slate-100/70 to-sky-100/65 p-px shadow-[0_18px_42px_rgba(15,23,42,0.10),0_8px_20px_rgba(15,23,42,0.06)] sm:rounded-[1rem] md:rounded-[1.08rem] lg:max-w-[58rem] lg:rounded-[1.2rem] lg:shadow-[0_28px_80px_rgba(15,23,42,0.12),0_12px_28px_rgba(15,23,42,0.07)]"
        initial={false}
        animate={
          confettiActive
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
          confettiActive
            ? { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.2 }
        }
      >
        <div className="relative h-full w-full overflow-hidden rounded-[calc(0.95rem-1px)] bg-[rgba(255,255,255,0.85)] p-1 backdrop-blur-[20px] sm:rounded-[calc(1rem-1px)] sm:p-1.25 md:rounded-[calc(1.08rem-1px)] md:p-1.5 lg:rounded-[calc(1.2rem-1px)] lg:p-2.5">
          {confettiActive && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent"
              initial={{ x: "-30%" }}
              animate={{ x: "260%" }}
              transition={{ duration: 1.1, ease: "linear" }}
            />
          )}
          <div
            className={`board-grid ${boardDensityClass} grid h-full w-full rounded-[0.95rem] sm:rounded-[1.05rem] md:rounded-[1.12rem] lg:rounded-[1.5rem]`}
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

              return (
                <TileButton
                  key={tile.id}
                  canDrag={canDrag}
                  canHover={canHover}
                  index={index}
                  isCorrect={isCorrect}
                  isDragging={isDragging && dragSession !== null}
                  tile={tile}
                  tileRadiusClass={tileRadiusClass}
                  winWaveActive={winWaveActive}
                  winWaveDelay={index * 0.045}
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
  loseState: boolean;
  moves: number;
  onRestart: () => void;
  timeDisplay: string;
  winState: boolean;
};

export function GameModal({
  activeConfig,
  accuracy,
  completion,
  loseState,
  moves,
  onRestart,
  timeDisplay,
  winState,
}: Readonly<ModalProps>) {
  if (!winState && !loseState) {
    return null;
  }

  const timeUpQuote = TIME_UP_QUOTES[(moves + completion + activeConfig.size) % TIME_UP_QUOTES.length];
  const timeUpStars = getTimeUpStars(completion);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/28 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[40.5rem] overflow-hidden rounded-[2rem] border border-white/80 bg-white p-8 text-center shadow-[0_32px_90px_rgba(15,23,42,0.24),0_14px_34px_rgba(15,23,42,0.12)] sm:p-10"
      >
        <div className="relative z-10">
          {winState ? (
            <>
              <p className="font-fredoka-strong text-sm uppercase tracking-[0.3em] text-slate-400">Perfect Gradient</p>
              <GradientText
                as="h2"
                className="font-fredoka-display mt-3 text-[2rem] leading-none tracking-[-0.05em] sm:mt-4 sm:text-[2.35rem]"
              >
                Gradient Complete!
              </GradientText>
              <div className="font-fredoka-strong mt-4 text-base leading-none tracking-[0.24em] text-amber-500 sm:mt-5 sm:text-lg">
                {renderStars(3)}
              </div>
              <p className="font-fredoka-regular mt-4 text-[0.98rem] leading-6 text-slate-500 sm:mt-5 sm:text-[1.05rem] sm:leading-7">
                You restored the gradient with a clean finish on {activeConfig.label.toLowerCase()}.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-4">
                <div className="rounded-[1rem] border border-slate-100 bg-white px-2 py-3.5 shadow-[0_16px_34px_rgba(148,163,184,0.12)] sm:rounded-[1.4rem] sm:px-4 sm:py-5">
                  <p className="font-fredoka-strong text-[0.72rem] uppercase tracking-[0.16em] text-slate-400 sm:text-[0.78rem] sm:tracking-[0.22em]">Time</p>
                  <p className="font-fredoka-strong mt-2 text-[1.3rem] leading-none text-slate-900 sm:mt-3 sm:text-[1.7rem]">{timeDisplay}</p>
                </div>
                <div className="rounded-[1rem] border border-slate-100 bg-white px-2 py-3.5 shadow-[0_16px_34px_rgba(148,163,184,0.12)] sm:rounded-[1.4rem] sm:px-4 sm:py-5">
                  <p className="font-fredoka-strong text-[0.72rem] uppercase tracking-[0.16em] text-slate-400 sm:text-[0.78rem] sm:tracking-[0.22em]">Moves</p>
                  <p className="font-fredoka-strong mt-2 text-[1.3rem] leading-none text-slate-900 sm:mt-3 sm:text-[1.7rem]">{moves}</p>
                </div>
                <div className="rounded-[1rem] border border-slate-100 bg-white px-2 py-3.5 shadow-[0_16px_34px_rgba(148,163,184,0.12)] sm:rounded-[1.4rem] sm:px-4 sm:py-5">
                  <p className="font-fredoka-strong text-[0.72rem] uppercase tracking-[0.16em] text-slate-400 sm:text-[0.78rem] sm:tracking-[0.22em]">Accuracy</p>
                  <p className="font-fredoka-strong mt-2 text-[1.3rem] leading-none text-slate-900 sm:mt-3 sm:text-[1.7rem]">{accuracy}%</p>
                </div>
              </div>
            </>
          ) : (
              <div className="mx-auto mt-3 max-w-lg">
              <h2 className="font-fredoka-display text-[2.35rem] leading-none tracking-[-0.05em] text-slate-900">Time&apos;s up</h2>
              {timeUpStars > 0 && (
                <p className="font-fredoka-strong mt-6 text-lg leading-none tracking-[0.24em] text-amber-500">{renderStars(timeUpStars)}</p>
              )}
              <div className="mt-7 grid grid-cols-2 gap-4 sm:mt-8 sm:gap-5">
                <div className="rounded-[1.3rem] border border-slate-100 bg-white px-4 py-4 shadow-[0_16px_34px_rgba(148,163,184,0.12)] sm:rounded-[1.4rem] sm:px-5 sm:py-5">
                  <p className="font-fredoka-strong text-[0.78rem] uppercase tracking-[0.22em] text-slate-400">Gradient Completion</p>
                  <p className="font-fredoka-strong mt-3 text-[1.7rem] leading-none text-slate-900 sm:mt-4 sm:text-[1.9rem]">{completion}%</p>
                </div>
                <div className="rounded-[1.3rem] border border-slate-100 bg-white px-4 py-4 shadow-[0_16px_34px_rgba(148,163,184,0.12)] sm:rounded-[1.4rem] sm:px-5 sm:py-5">
                  <p className="font-fredoka-strong text-[0.78rem] uppercase tracking-[0.22em] text-slate-400">Moves</p>
                  <p className="font-fredoka-strong mt-3 text-[1.7rem] leading-none text-slate-900 sm:mt-4 sm:text-[1.9rem]">{moves}</p>
                </div>
              </div>
              <p className="font-fredoka-regular mt-6 text-[1.02rem] leading-7 text-slate-500 sm:mt-7 sm:text-[1.08rem] sm:leading-8">{timeUpQuote}</p>
            </div>
          )}

          <button
            type="button"
            onClick={onRestart}
            className="font-fredoka-strong mt-8 rounded-full bg-slate-800 px-6 py-3 text-base text-white shadow-[0_18px_34px_rgba(15,23,42,0.2)] transition hover:bg-slate-700 sm:mt-10 sm:px-7 sm:py-3.5"
          >
            Play Again
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
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
  const [isModesOpen, setIsModesOpen] = useState(false);

  useEffect(() => {
    if (!isModesOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModesOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isModesOpen]);

  const handleModeSelect = (nextDifficulty: DifficultyKey) => {
    onDifficultyChange(nextDifficulty);
    setIsModesOpen(false);
  };

  return (
    <section className="flex w-full justify-center lg:w-auto">
      <div className="grid w-full max-w-[42rem] grid-cols-3 gap-1.5 sm:gap-2 md:gap-2.5 lg:flex lg:w-auto lg:max-w-none lg:flex-col">
          <button
            type="button"
            onClick={() => setIsModesOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isModesOpen}
            aria-label="Open modes"
            className="font-fredoka-strong flex min-h-[3.8rem] w-full items-center justify-center rounded-[0.95rem] bg-slate-800 px-2 py-2.5 text-center text-[0.84rem] leading-tight text-white shadow-[0_14px_26px_rgba(15,23,42,0.16)] transition hover:bg-slate-700 sm:min-h-[4rem] sm:rounded-[1rem] sm:text-[0.88rem] md:min-h-[4.25rem] md:text-[0.92rem] lg:h-24 lg:w-24 lg:rounded-[1.4rem] lg:px-3 lg:py-3 lg:text-[0.95rem]"
          >
            Modes
          </button>

          <button
            type="button"
            onClick={onShuffle}
            className="font-fredoka-strong flex min-h-[3.8rem] w-full items-center justify-center rounded-[0.95rem] bg-slate-800 px-2 py-2.5 text-center text-[0.84rem] leading-tight text-white transition hover:bg-slate-700 sm:min-h-[4rem] sm:rounded-[1rem] sm:text-[0.88rem] md:min-h-[4.25rem] md:text-[0.92rem] lg:h-24 lg:w-24 lg:rounded-[1.4rem] lg:px-3 lg:py-3 lg:text-[0.95rem]"
          >
            Shuffle
          </button>

          {showDevControls && (
            <button
              type="button"
              onClick={onAutoSolve}
              className="font-fredoka-strong flex min-h-[3.8rem] w-full items-center justify-center rounded-[0.95rem] bg-amber-100 px-2 py-2.5 text-center text-[0.84rem] leading-tight text-amber-900 transition hover:bg-amber-200 sm:min-h-[4rem] sm:rounded-[1rem] sm:text-[0.88rem] md:min-h-[4.25rem] md:text-[0.92rem] lg:h-24 lg:w-24 lg:rounded-[1.4rem] lg:px-3 lg:py-3 lg:text-[0.95rem]"
            >
              Auto Solve
            </button>
          )}
      </div>

      {isModesOpen && typeof document !== "undefined" &&
        createPortal(
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/18 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute inset-0" onClick={() => setIsModesOpen(false)} aria-hidden="true" />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Select game mode"
              className="relative w-full max-w-[35rem] rounded-[1.5rem] border border-slate-200/90 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.16)] sm:rounded-[1.75rem] sm:p-8"
              initial={{ opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-fredoka-strong text-[0.78rem] uppercase tracking-[0.2em] text-slate-400 sm:text-sm sm:tracking-[0.24em]">Modes</p>
                  <h2 className="font-fredoka-display mt-2 text-[1.9rem] leading-none text-slate-800 sm:text-[2.2rem]">Choose a mode</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModesOpen(false)}
                  aria-label="Close modes window"
                  className="font-fredoka-strong flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                >
                  {"\u00D7"}
                </button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-3.5">
                {(Object.keys(DIFFICULTY_LABELS) as DifficultyKey[]).map((key) => {
                  const isActive = difficulty === key;
                  const isCustom = key === "custom";

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleModeSelect(key)}
                      className={`font-fredoka-strong rounded-[1rem] px-4 py-3.5 text-base leading-tight transition sm:rounded-2xl sm:px-4 ${
                        isCustom ? "col-span-2" : ""
                      } ${
                        isActive
                          ? "bg-slate-800 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
        )}
    </section>
  );
}

type CustomGameModalProps = {
  draftSize: number;
  draftTime: number;
  isOpen: boolean;
  maxSize: number;
  onClose: () => void;
  onSizeChange: (value: number) => void;
  onStart: () => void;
  onTimeChange: (value: number) => void;
};

export function CustomGameModal({
  draftSize,
  draftTime,
  isOpen,
  maxSize,
  onClose,
  onSizeChange,
  onStart,
  onTimeChange,
}: Readonly<CustomGameModalProps>) {
  if (!isOpen) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/18 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[40.5rem] rounded-[1.5rem] border border-slate-200/90 bg-white p-7 shadow-2xl sm:rounded-[1.75rem] sm:p-9">
        <p className="font-fredoka-strong text-[0.78rem] uppercase tracking-[0.2em] text-slate-400 sm:text-sm sm:tracking-[0.28em]">Custom Game</p>
        <h2 className="font-fredoka-display mt-3 text-[1.95rem] leading-none text-slate-800 sm:text-[2.4rem]">Build your board</h2>
        <p className="font-fredoka-regular mt-4 text-[0.98rem] leading-6 text-slate-500 sm:text-[1.05rem] sm:leading-7">
          Choose your grid size and timer, then press Start when you are ready. The countdown waits for you.
        </p>

        <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
          <label className="rounded-[1rem] bg-slate-50 p-4 text-base text-slate-600 sm:rounded-2xl">
            <span className="font-fredoka-strong mb-3 block text-[0.78rem] uppercase tracking-[0.2em] text-slate-400 sm:text-[0.82rem] sm:tracking-[0.24em]">
              Grid Size
            </span>
            <input
              type="number"
              min={4}
              max={maxSize}
              value={draftSize}
              onChange={(event) => onSizeChange(Number(event.target.value) || 4)}
              className="font-fredoka-regular w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-800 outline-none sm:text-[1.05rem]"
            />
            <span className="font-fredoka-regular mt-2 block text-sm text-slate-500">
              Max for this screen: {maxSize} x {maxSize}
            </span>
          </label>

          <label className="rounded-[1rem] bg-slate-50 p-4 text-base text-slate-600 sm:rounded-2xl">
            <span className="font-fredoka-strong mb-3 block text-[0.78rem] uppercase tracking-[0.2em] text-slate-400 sm:text-[0.82rem] sm:tracking-[0.24em]">
              Time Limit
            </span>
            <input
              type="number"
              min={10}
              max={480}
              value={draftTime}
              onChange={(event) => onTimeChange(Number(event.target.value) || 10)}
              className="font-fredoka-regular w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-800 outline-none sm:text-[1.05rem]"
            />
          </label>
        </div>

        <div className="mt-7 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-fredoka-regular rounded-full bg-slate-100 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-200 sm:px-5 sm:text-base"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onStart}
            className="font-fredoka-strong rounded-full bg-slate-800 px-5 py-3 text-sm text-white transition hover:bg-slate-700 sm:px-6 sm:text-base"
          >
            Start
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
