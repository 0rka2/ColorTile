"use client";

import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";

import { GameBoard, GameHud } from "../game-components";
import {
  checkCompletion,
  getBoardDensityClass,
  getTileRadiusClass,
  isTileCorrect,
  isTileLocked,
  swapTiles,
} from "../game-logic";

const BOARD_SIZE = 4;
const DRAG_ROTATION_MAX_DEGREES = 3;
const DRAG_START_DISTANCE_PX = 6;
const TILE_DRAG_SCALE = 1.065;
const TILE_SWAP_ANIMATION_DURATION_MS = 220;
const TILE_SWAP_ANIMATION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const DROP_TARGET_RING_CLASSES = [
  "ring-2",
  "ring-slate-300/70",
  "ring-offset-2",
  "ring-offset-white/80",
];

const tutorialCorners: [string, string, string, string] = [
  "#38bdf8",
  "#7c3aed",
  "#f87171",
  "#84cc16",
];

const stageCopy = [
  {
    eyebrow: "Goal",
    title: "Make the board blend smoothly.",
    highlight: "board",
  },
  {
    eyebrow: "Try it",
    title: "Swap the two out-of-place tiles.",
    highlight: "board",
  },
  {
    eyebrow: "Timer",
    title: "Finish before time runs out. Fewer moves improves your score.",
    highlight: "hud",
  },
  {
    eyebrow: "Done",
    title: "You're ready.",
    highlight: "board",
  },
] as const;

type DragSession = {
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
};

function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function blendColor(start: number, end: number, amount: number) {
  return Math.round(start + (end - start) * amount);
}

function interpolateRgb(startHex: string, endHex: string, amount: number) {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);

  return {
    r: blendColor(start.r, end.r, amount),
    g: blendColor(start.g, end.g, amount),
    b: blendColor(start.b, end.b, amount),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function getTutorialTileColor(row: number, column: number) {
  const [topLeft, topRight, bottomLeft, bottomRight] = tutorialCorners;
  const xRatio = column / (BOARD_SIZE - 1);
  const yRatio = row / (BOARD_SIZE - 1);
  const top = interpolateRgb(topLeft, topRight, xRatio);
  const bottom = interpolateRgb(bottomLeft, bottomRight, xRatio);

  return rgbToHex({
    r: blendColor(top.r, bottom.r, yRatio),
    g: blendColor(top.g, bottom.g, yRatio),
    b: blendColor(top.b, bottom.b, yRatio),
  });
}

function getSolvedTutorialBoard(stageId: string) {
  return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
    const row = Math.floor(index / BOARD_SIZE);
    const column = index % BOARD_SIZE;
    const isCorner =
      (row === 0 && column === 0) ||
      (row === 0 && column === BOARD_SIZE - 1) ||
      (row === BOARD_SIZE - 1 && column === 0) ||
      (row === BOARD_SIZE - 1 && column === BOARD_SIZE - 1);

    return {
      id: `tutorial-${stageId}-${index}`,
      correctIndex: index,
      currentIndex: index,
      color: getTutorialTileColor(row, column),
      isCorner,
    };
  });
}

function getPracticeBoard() {
  return swapTiles(getSolvedTutorialBoard("practice"), 5, 6);
}

type TutorialGuideProps = {
  onPlay: () => void;
};

export default function TutorialGuide({ onPlay }: Readonly<TutorialGuideProps>) {
  const [stageIndex, setStageIndex] = useState(0);
  const [board, setBoard] = useState(() => getSolvedTutorialBoard("goal"));
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [pressedTileIndex, setPressedTileIndex] = useState<number | null>(null);
  const [readyModalOpen, setReadyModalOpen] = useState(false);

  const tileElementsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const dragOverlayElementRef = useRef<HTMLDivElement | null>(null);
  const dragPointerTargetRef = useRef<HTMLButtonElement | null>(null);
  const dragPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const pendingDragStartRef = useRef<DragSession | null>(null);
  const dragAnimationFrameRef = useRef<number | null>(null);
  const hoveredTargetIndexRef = useRef<number | null>(null);
  const pendingSwapAnimationRef = useRef<Map<string, DOMRect> | null>(null);

  const stage = stageCopy[stageIndex];
  const canInteractWithBoard = stageIndex === 1 && !readyModalOpen;
  const completion = stageIndex === 1 ? checkCompletion(board) : 100;
  const hudProgress = stageIndex === 1 && completion < 100 ? 90 : completion;
  const draggedIndex = dragSession?.index ?? null;
  const tileRadiusClass = getTileRadiusClass(BOARD_SIZE);
  const boardDensityClass = getBoardDensityClass(BOARD_SIZE);

  const getTileRef = useCallback(
    (tileId: string) => (element: HTMLButtonElement | null) => {
      tileElementsRef.current[tileId] = element;
    },
    [],
  );

  const setDragOverlayRef = useCallback((element: HTMLDivElement | null) => {
    dragOverlayElementRef.current = element;
  }, []);

  const resetTileRefs = () => {
    tileElementsRef.current = {};
    pendingSwapAnimationRef.current = null;
  };

  const goToStage = (nextStageIndex: number) => {
    resetTileRefs();
    setStageIndex(nextStageIndex);
    setReadyModalOpen(nextStageIndex === 3);

    if (nextStageIndex === 1) {
      setBoard(getPracticeBoard());
      return;
    }

    setBoard(getSolvedTutorialBoard(`stage-${nextStageIndex}`));
  };

  const cancelDragAnimationFrame = useCallback(() => {
    if (dragAnimationFrameRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(dragAnimationFrameRef.current);
      dragAnimationFrameRef.current = null;
    }
  }, []);

  const setDropTargetHighlight = useCallback((index: number | null, active: boolean) => {
    if (index === null) {
      return;
    }

    const tile = board[index];
    if (!tile) {
      return;
    }

    const element = tileElementsRef.current[tile.id];
    if (!element) {
      return;
    }

    if (active) {
      element.classList.add(...DROP_TARGET_RING_CLASSES);
      return;
    }

    element.classList.remove(...DROP_TARGET_RING_CLASSES);
  }, [board]);

  const updateHoveredDropTarget = useCallback((nextIndex: number | null) => {
    const previousIndex = hoveredTargetIndexRef.current;
    if (previousIndex === nextIndex) {
      return;
    }

    setDropTargetHighlight(previousIndex, false);
    hoveredTargetIndexRef.current = nextIndex;
    setDropTargetHighlight(nextIndex, true);
  }, [setDropTargetHighlight]);

  const clearDragSession = useCallback(() => {
    cancelDragAnimationFrame();

    const currentPointerTarget = dragPointerTargetRef.current;
    const activePointerId = dragSession?.pointerId ?? pendingDragStartRef.current?.pointerId;

    if (currentPointerTarget && activePointerId !== undefined) {
      try {
        if (currentPointerTarget.hasPointerCapture(activePointerId)) {
          currentPointerTarget.releasePointerCapture(activePointerId);
        }
      } catch {
        // Ignore stale pointer capture cleanup.
      }
    }

    dragPointerTargetRef.current = null;
    dragPointerPositionRef.current = null;
    pendingDragStartRef.current = null;
    setPressedTileIndex(null);
    updateHoveredDropTarget(null);
    setDragSession(null);
  }, [cancelDragAnimationFrame, dragSession, updateHoveredDropTarget]);

  const resolveDropTargetIndex = useCallback((clientX: number, clientY: number) => {
    if (typeof document === "undefined") {
      return null;
    }

    const element = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const target = element?.closest<HTMLElement>("[data-tile-index]");
    const rawIndex = target?.dataset.tileIndex;

    if (!rawIndex) {
      return null;
    }

    const nextIndex = Number.parseInt(rawIndex, 10);
    return Number.isNaN(nextIndex) ? null : nextIndex;
  }, []);

  const updateDragOverlayPosition = useCallback(() => {
    dragAnimationFrameRef.current = null;

    const overlayElement = dragOverlayElementRef.current;
    const pointerPosition = dragPointerPositionRef.current;
    const currentDragSession = dragSession;

    if (!overlayElement || !pointerPosition || !currentDragSession) {
      return;
    }

    const nextX = pointerPosition.x - currentDragSession.offsetX;
    const nextY = pointerPosition.y - currentDragSession.offsetY;
    const rotate = Math.max(
      -DRAG_ROTATION_MAX_DEGREES,
      Math.min(DRAG_ROTATION_MAX_DEGREES, (pointerPosition.x - currentDragSession.grabX) / 14),
    );

    overlayElement.style.transform = `translate3d(${nextX}px, ${nextY}px, 0) scale(${TILE_DRAG_SCALE}) rotate(${rotate}deg)`;
  }, [dragSession]);

  const scheduleDragOverlayPositionUpdate = useCallback(() => {
    if (dragAnimationFrameRef.current !== null || typeof window === "undefined") {
      return;
    }

    dragAnimationFrameRef.current = window.requestAnimationFrame(updateDragOverlayPosition);
  }, [updateDragOverlayPosition]);

  useEffect(() => {
    if (stageIndex !== 1 || checkCompletion(board) !== 100) {
      return;
    }

    clearDragSession();
    goToStage(2);
  }, [board, clearDragSession, stageIndex]);

  useEffect(() => {
    if (!dragSession) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragSession.pointerId) {
        return;
      }

      dragPointerPositionRef.current = { x: event.clientX, y: event.clientY };
      scheduleDragOverlayPositionUpdate();

      const rawTargetIndex = resolveDropTargetIndex(event.clientX, event.clientY);
      const targetTile = rawTargetIndex === null ? null : board[rawTargetIndex];
      const nextHoveredTargetIndex =
        rawTargetIndex === null ||
        rawTargetIndex === dragSession.index ||
        !targetTile ||
        isTileLocked(targetTile, rawTargetIndex)
          ? null
          : rawTargetIndex;

      updateHoveredDropTarget(nextHoveredTargetIndex);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== dragSession.pointerId) {
        return;
      }

      const sourceIndex = dragSession.index;
      const targetIndex = resolveDropTargetIndex(event.clientX, event.clientY);
      const draggedTile = board[sourceIndex];
      const targetTile = targetIndex === null ? null : board[targetIndex];

      if (
        targetIndex !== null &&
        targetIndex !== sourceIndex &&
        draggedTile &&
        targetTile &&
        canInteractWithBoard &&
        !isTileLocked(draggedTile, sourceIndex) &&
        !isTileLocked(targetTile, targetIndex)
      ) {
        const draggedTileElement = tileElementsRef.current[draggedTile.id];
        const targetTileElement = tileElementsRef.current[targetTile.id];

        if (draggedTileElement && targetTileElement) {
          pendingSwapAnimationRef.current = new Map([
            [draggedTile.id, draggedTileElement.getBoundingClientRect()],
            [targetTile.id, targetTileElement.getBoundingClientRect()],
          ]);
        } else {
          pendingSwapAnimationRef.current = null;
        }

        setBoard((currentBoard) => swapTiles(currentBoard, sourceIndex, targetIndex));
      } else {
        pendingSwapAnimationRef.current = null;
      }

      clearDragSession();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [
    board,
    canInteractWithBoard,
    clearDragSession,
    dragSession,
    resolveDropTargetIndex,
    scheduleDragOverlayPositionUpdate,
    updateHoveredDropTarget,
  ]);

  useEffect(() => {
    if (dragSession || pressedTileIndex === null) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const pendingDragStart = pendingDragStartRef.current;
      if (!pendingDragStart || event.pointerId !== pendingDragStart.pointerId) {
        return;
      }

      dragPointerPositionRef.current = { x: event.clientX, y: event.clientY };

      const distance = Math.hypot(
        event.clientX - pendingDragStart.pointerX,
        event.clientY - pendingDragStart.pointerY,
      );

      if (distance < DRAG_START_DISTANCE_PX) {
        return;
      }

      pendingDragStartRef.current = null;
      setPressedTileIndex(null);
      setDragSession({
        ...pendingDragStart,
        pointerX: event.clientX,
        pointerY: event.clientY,
      });
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const pendingDragStart = pendingDragStartRef.current;
      if (!pendingDragStart || event.pointerId !== pendingDragStart.pointerId) {
        return;
      }

      clearDragSession();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [clearDragSession, dragSession, pressedTileIndex]);

  useEffect(() => {
    if (!dragSession) {
      cancelDragAnimationFrame();
      return;
    }

    scheduleDragOverlayPositionUpdate();

    return () => {
      cancelDragAnimationFrame();
    };
  }, [cancelDragAnimationFrame, dragSession, scheduleDragOverlayPositionUpdate]);

  useEffect(() => {
    return () => {
      cancelDragAnimationFrame();
    };
  }, [cancelDragAnimationFrame]);

  useEffect(() => {
    const previousPositions = pendingSwapAnimationRef.current;
    if (!previousPositions) {
      return;
    }

    pendingSwapAnimationRef.current = null;

    previousPositions.forEach((previousRect, tileId) => {
      const element = tileElementsRef.current[tileId];
      if (!element) {
        return;
      }

      const nextRect = element.getBoundingClientRect();
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;

      if (deltaX === 0 && deltaY === 0) {
        return;
      }

      element.style.zIndex = "20";

      const animation = element.animate(
        [
          { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
          { transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration: TILE_SWAP_ANIMATION_DURATION_MS,
          easing: TILE_SWAP_ANIMATION_EASING,
        },
      );

      const resetStacking = () => {
        element.style.zIndex = "";
      };

      animation.addEventListener("finish", resetStacking, { once: true });
      animation.addEventListener("cancel", resetStacking, { once: true });
    });
  }, [board]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>, index: number) => {
    if (!canInteractWithBoard) {
      return;
    }

    const tile = board[index];
    if (!tile || isTileLocked(tile, index)) {
      return;
    }

    const tileElement = tileElementsRef.current[tile.id];
    if (!tileElement) {
      return;
    }

    const tileRect = tileElement.getBoundingClientRect();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragPointerTargetRef.current = event.currentTarget;
    dragPointerPositionRef.current = { x: event.clientX, y: event.clientY };

    pendingDragStartRef.current = {
      color: tile.color,
      grabX: event.clientX,
      height: tileRect.height,
      index,
      isCorrect: isTileCorrect(tile, index),
      offsetX: event.clientX - tileRect.left,
      offsetY: event.clientY - tileRect.top,
      pointerX: event.clientX,
      pointerY: event.clientY,
      pointerId: event.pointerId,
      tileId: tile.id,
      width: tileRect.width,
    };
    setPressedTileIndex(index);
  }, [board, canInteractWithBoard]);

  const handleBack = () => {
    clearDragSession();
    goToStage(Math.max(0, stageIndex - 1));
  };

  const handleNext = () => {
    clearDragSession();

    if (stageIndex === 0) {
      goToStage(1);
      return;
    }

    if (stageIndex === 2) {
      goToStage(3);
    }
  };

  return (
    <section className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-start gap-[clamp(0.6rem,1.5vw,1rem)] overflow-hidden text-center">
      <div className="theme-overlay pointer-events-none fixed inset-0 z-10" />

      <div
        className={`w-full max-w-[min(100%,34rem)] transition-all ${
          stage.highlight === "hud" ? "relative z-20 scale-[1.02]" : "relative z-0 opacity-60"
        }`}
      >
        <GameHud
          bestMoves={19}
          bestTimeDisplay="0:55"
          gradientQuality={hudProgress}
          moves={stageIndex >= 2 ? 1 : 0}
          timeDisplay="0:57"
          timeWarning={false}
        />
      </div>

      <div
        className={`w-full max-w-[min(92vw,34rem)] transition-all ${
          stage.highlight === "board" ? "relative z-20 scale-[1.01]" : "relative z-0 opacity-60"
        }`}
      >
        <GameBoard
          key={`tutorial-board-${stageIndex}`}
          allowHoverWhenLocked={false}
          board={board}
          boardDensityClass={boardDensityClass}
          confettiActive={false}
          dragSession={dragSession}
          draggedIndex={draggedIndex}
          getTileRef={getTileRef}
          isTileCorrect={isTileCorrect}
          isTileLocked={isTileLocked}
          loseState={false}
          onPointerDown={handlePointerDown}
          pressedTileIndex={pressedTileIndex}
          setDragOverlayRef={setDragOverlayRef}
          tileRadiusClass={tileRadiusClass}
          winState={!canInteractWithBoard}
          winWaveActive={false}
        />
      </div>

      <div className="relative z-0 flex w-full max-w-[min(92vw,34rem)] justify-center opacity-60">
        <button
          type="button"
          disabled
          className="theme-button-primary restart-button font-fredoka-strong flex min-h-[3rem] w-full max-w-[18rem] cursor-not-allowed items-center justify-center rounded-full px-5 py-3 text-sm opacity-80"
        >
          Restart
        </button>
      </div>

      {!readyModalOpen && (
        <div className={`theme-modal fixed z-30 w-[min(92vw,24rem)] rounded-[1.25rem] border p-4 text-left ${
          stage.highlight === "hud"
            ? "left-1/2 top-[clamp(5.5rem,16vh,8rem)] -translate-x-1/2"
            : "bottom-[clamp(1rem,5vh,3rem)] left-1/2 -translate-x-1/2"
        }`}>
          <div className="flex items-center gap-3">
            <span className="theme-chip rounded-full px-4 py-1.5 font-fredoka-strong text-xs text-emerald-700">
              {stageIndex + 1} / 4
            </span>
            <span className="theme-text-muted font-fredoka-regular text-xs">
              {stage.eyebrow}
            </span>
          </div>

          <p className="theme-text-primary font-fredoka-strong mt-3 text-base leading-6">
            {stage.title}
          </p>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={stageIndex === 0}
              className="theme-button-secondary rounded-full px-4 py-2.5 font-fredoka-strong text-sm disabled:cursor-not-allowed disabled:opacity-45"
            >
              Back
            </button>

            {stageIndex === 1 ? (
              <button
                type="button"
                disabled
                className="theme-button-secondary rounded-full px-4 py-2.5 font-fredoka-strong text-sm opacity-70"
              >
                Swap first
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="theme-button-primary rounded-full px-5 py-2.5 font-fredoka-strong text-sm"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}

      {readyModalOpen && (
        <div className="theme-overlay fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="theme-modal w-full max-w-[26rem] rounded-[1.5rem] border p-7 text-center">
            <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.24em]">
              Tutorial complete
            </p>
            <h2 className="theme-text-primary font-fredoka-display mt-3 text-[2.35rem] leading-none">
              You&apos;re ready
            </h2>
            <p className="theme-text-secondary mx-auto mt-4 max-w-[19rem] text-sm leading-6">
              Keep matching the gradient and clear the board before time runs out.
            </p>
            <button
              type="button"
              onClick={onPlay}
              className="theme-button-primary mt-7 inline-flex w-full items-center justify-center rounded-full px-6 py-3 font-fredoka-strong text-base"
            >
              Play
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
