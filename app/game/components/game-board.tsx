import { memo, PointerEvent as ReactPointerEvent, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

import { hoverSound } from "../../lib/sounds";
import {
  getBlackAndWhiteRevealStainEdges,
  hexToRgb,
  isBlackAndWhiteTileInRevealSplash,
} from "../game-logic";
import type { RevealStainEdge, Tile } from "../game-types";

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
const STAIN_CLASS_NAMES: Record<RevealStainEdge, string> = {
  top: "inset-x-0 top-0 h-[68%]",
  right: "inset-y-0 right-0 w-[68%]",
  bottom: "inset-x-0 bottom-0 h-[68%]",
  left: "inset-y-0 left-0 w-[68%]",
};
const STAIN_GRADIENT_SHAPES: Record<RevealStainEdge, string> = {
  top: "ellipse 92% 112% at top",
  right: "ellipse 112% 92% at right",
  bottom: "ellipse 92% 112% at bottom",
  left: "ellipse 112% 92% at left",
};

function CheckMark() {
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

function withVisualModeFilter(baseFilter: string, visualMode: "color" | "grayscale") {
  return baseFilter;
}

function getVisualModeBackgroundColor(color: string, visualMode: "color" | "grayscale") {
  if (visualMode === "color") {
    return color;
  }

  const { r, g, b } = hexToRgb(color);
  const luminance = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
  const gentleGray = Math.round(luminance * 0.72 + 255 * 0.28);
  return `rgb(${gentleGray}, ${gentleGray}, ${gentleGray})`;
}

function getRgbText(color: string) {
  const { r, g, b } = hexToRgb(color);
  return `${r}, ${g}, ${b}`;
}

function getStainBackground(edge: RevealStainEdge, rgbText: string) {
  return `radial-gradient(${STAIN_GRADIENT_SHAPES[edge]}, rgba(${rgbText}, 0.88) 0%, rgba(${rgbText}, 0.5) 46%, rgba(${rgbText}, 0.18) 72%, transparent 96%)`;
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
  interactionDisabled: boolean;
  previewCountdown?: number | null;
  setDragOverlayRef: (element: HTMLDivElement | null) => void;
  tileRadiusClass: string;
  visualMode: "color" | "grayscale";
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
  interactionDisabled: boolean;
  isCorrect: boolean;
  isDragging: boolean;
  isPressed: boolean;
  tile: Tile;
  tileRadiusClass: string;
  stainEdges: RevealStainEdge[];
  visualMode: BoardProps["visualMode"];
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
  interactionDisabled,
  isCorrect,
  isDragging,
  isPressed,
  tile,
  tileRadiusClass,
  stainEdges,
  visualMode,
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

  const tileRgbText = getRgbText(tile.color);

  return (
    <motion.button
      initial={false}
      ref={tileRef}
      type="button"

      onPointerEnter={() => {
        if (!interactionDisabled && !isDragging && canHover) {
          hoverSound.play();
        }
      }}

      data-tile-index={index}
      onPointerDown={(event) => {
        if (interactionDisabled) {
          return;
        }

        onPointerDown(event, index);
      }}
      disabled={winState || loseState || interactionDisabled}
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
          ? [
              withVisualModeFilter("saturate(1) brightness(1)", visualMode),
              withVisualModeFilter("saturate(1.18) brightness(1.08)", visualMode),
              withVisualModeFilter("saturate(1.08) brightness(1.03)", visualMode),
              withVisualModeFilter("saturate(1) brightness(1)", visualMode),
            ]
          : isPressed
            ? withVisualModeFilter("saturate(1.12) brightness(1.04)", visualMode)
          : isHovering && !isDragging
            ? withVisualModeFilter("saturate(1.04) brightness(1.02)", visualMode)
            : withVisualModeFilter("saturate(1) brightness(1)", visualMode),
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
      } ${canDrag && !interactionDisabled ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
      style={{
        backgroundColor: getVisualModeBackgroundColor(tile.color, visualMode),
        touchAction: "none",
      }}
      aria-label={`Tile ${index + 1}${tile.isCorner ? ", fixed corner tile" : ""}${isCorrect ? ", correct position" : ""}${!canDrag && !tile.isCorner ? ", locked" : ""}`}
    >
      {stainEdges.length > 0 && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          {stainEdges.map((edge) => (
            <span
              key={edge}
              className={`absolute ${STAIN_CLASS_NAMES[edge]}`}
              style={{
                background: getStainBackground(edge, tileRgbText),
              }}
            />
          ))}
        </span>
      )}
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
    previousProps.interactionDisabled === nextProps.interactionDisabled &&
    previousProps.isCorrect === nextProps.isCorrect &&
    previousProps.isDragging === nextProps.isDragging &&
    previousProps.isPressed === nextProps.isPressed &&
    previousProps.stainEdges.join(",") === nextProps.stainEdges.join(",") &&
    previousProps.tile === nextProps.tile &&
    previousProps.tileRadiusClass === nextProps.tileRadiusClass &&
    previousProps.visualMode === nextProps.visualMode &&
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
  interactionDisabled,
  previewCountdown,
  setDragOverlayRef,
  tileRadiusClass,
  visualMode,
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
  const dragTile = dragSession ? board[dragSession.index] : undefined;
  const dragOverlayVisualMode =
    visualMode === "grayscale" &&
    dragSession &&
    dragTile &&
    isTileCorrect(dragTile, dragSession.index)
      ? "color"
      : visualMode;
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
              transition: "transform 110ms cubic-bezier(0.22, 1, 0.36, 1), filter 240ms ease",
              filter: dragOverlayVisualMode === "grayscale" ? "grayscale(1)" : "none",
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
              const canDrag = !interactionDisabled && !isLocked && !winState && !loseState;
              const canHover =
                !interactionDisabled &&
                (allowHoverWhenLocked || (!winState && !loseState && (canDrag || isCorrect)));
              const columnIndex = index % size;
              const hasRevealSplash =
                visualMode === "grayscale" && isBlackAndWhiteTileInRevealSplash(board, index, size);
              const stainEdges =
                visualMode === "grayscale"
                  ? getBlackAndWhiteRevealStainEdges(board, index, size)
                  : [];
              const tileVisualMode =
                hasRevealSplash && isCorrect
                  ? "color"
                  : visualMode;

              return (
                <TileButton
                  key={tile.id}
                  canDrag={canDrag}
                  canHover={canHover}
                  index={index}
                  interactionDisabled={interactionDisabled}
                  isCorrect={isCorrect}
                  isDragging={isDragging && dragSession !== null}
                  isPressed={pressedTileIndex === index}
                  tile={tile}
                  tileRadiusClass={tileRadiusClass}
                  stainEdges={stainEdges}
                  visualMode={tileVisualMode}
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
          <AnimatePresence mode="popLayout">
            {previewCountdown !== null && (
              <motion.div
                key={previewCountdown}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center font-fredoka-display text-[clamp(5.4rem,26vw,12rem)] leading-none text-white/65 drop-shadow-[0_14px_34px_rgba(15,23,42,0.55)] [text-shadow:0_3px_20px_rgba(15,23,42,0.48)]"
                initial={{ opacity: 0, scale: 1.22, y: -70, rotate: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.82, y: 70, rotate: 5 }}
                transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
              >
                {previewCountdown}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      {dragOverlay}
    </>
  );
});
