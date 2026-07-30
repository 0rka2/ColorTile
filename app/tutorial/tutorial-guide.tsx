"use client";

import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";

import { GameBoard } from "../game/components/game-board";
import { GameHud } from "../game/components/game-hud";
import {
  checkCompletion,
  getBoardDensityClass,
  getTileRadiusClass,
  formatTime,
  isTileCorrect,
  isTileLocked,
  RESERVED_PRESET_TIME_LIMIT_SECONDS,
  swapTiles,
} from "../game/game-logic";
import { findNearestTileIndex } from "../game/drop-target";
import type { DropTargetRect } from "../game/drop-target";

const BOARD_SIZE = 4;
const DRAG_ROTATION_MAX_DEGREES = 3;
const DRAG_START_DISTANCE_PX = 6;
const TILE_DRAG_SCALE = 1.065;
const TILE_SWAP_ANIMATION_DURATION_MS = 220;
const TILE_SWAP_ANIMATION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const STEP_COMPLETION_DELAY_MS = 600;
const MODAL_GAP_MIN_PX = 8;
const MODAL_GAP_MAX_PX = 18;
const MODAL_WIDTH_PX = 480;
const MODAL_ESTIMATED_HEIGHT_PX = 216;
const VIEWPORT_MARGIN_PX = 16;
const TUTORIAL_TIME_SECONDS = RESERVED_PRESET_TIME_LIMIT_SECONDS.normal;
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
    title: "Swap the two out of place tiles.",
    highlight: "board",
  },
  {
    eyebrow: "Timer",
    title: "Finish as fast as you can. Use fewer moves to improve your score.",
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

type SpotlightRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type ModalPosition = {
  left: number;
  top: number;
};

type ModalSize = {
  height: number;
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

function getElementRect(element: HTMLElement): SpotlightRect {
  const rect = element.getBoundingClientRect();

  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
}

function getClampedModalLeft(centeredLeft: number, modalWidth: number) {
  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft ?? 0;
  const viewportWidth = viewport?.width ?? window.innerWidth;

  return Math.max(
    viewportLeft + VIEWPORT_MARGIN_PX,
    Math.min(centeredLeft, viewportLeft + viewportWidth - modalWidth - VIEWPORT_MARGIN_PX),
  );
}

function getTutorialModalPosition(spotlightRect: SpotlightRect, modalSize: ModalSize): ModalPosition {
  const viewport = window.visualViewport;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportWidth = viewport?.width ?? window.innerWidth;
  const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
  const modalWidth = Math.min(modalSize.width, viewportWidth - VIEWPORT_MARGIN_PX * 2);
  const modalHeight = modalSize.height;
  const centeredLeft = spotlightRect.left + spotlightRect.width / 2 - modalWidth / 2;
  const spotlightBottom = spotlightRect.top + spotlightRect.height;
  const preferredGap = Math.min(
    MODAL_GAP_MAX_PX,
    Math.max(MODAL_GAP_MIN_PX, viewportWidth * 0.02),
  );
  const availableSpaceBelow = viewportBottom - spotlightBottom - modalHeight;
  const bottomMargin = Math.min(
    VIEWPORT_MARGIN_PX,
    Math.max(0, availableSpaceBelow),
  );
  const availableGapBelow = availableSpaceBelow - bottomMargin;
  const belowGap = Math.max(0, Math.min(preferredGap, availableGapBelow));
  const belowTop = spotlightBottom + belowGap;
  const aboveTop = spotlightRect.top - modalHeight - preferredGap;
  const maxTop = viewportBottom - modalHeight - VIEWPORT_MARGIN_PX;
  const hasRoomBelow = availableSpaceBelow >= 0;
  const hasRoomAbove = aboveTop >= viewportTop + VIEWPORT_MARGIN_PX;
  const preferredTop = !hasRoomBelow && hasRoomAbove ? aboveTop : belowTop;
  const maximumTop = hasRoomBelow
    ? viewportBottom - modalHeight - bottomMargin
    : maxTop;

  return {
    left: getClampedModalLeft(centeredLeft, modalWidth),
    top: Math.max(
      viewportTop + VIEWPORT_MARGIN_PX,
      Math.min(preferredTop, maximumTop),
    ),
  };
}

type TutorialGuideProps = {
  onPlay: () => void;
};

export default function TutorialGuide({ onPlay }: Readonly<TutorialGuideProps>) {
  const [stageIndex, setStageIndex] = useState(0);
  const [board, setBoard] = useState(() => getSolvedTutorialBoard("goal"));
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [pressedTileIndex, setPressedTileIndex] = useState<number | null>(null);
  const [dropTargetRect, setDropTargetRect] = useState<DropTargetRect | null>(null);
  const [stepCompletionPending, setStepCompletionPending] = useState(false);
  const [readyModalOpen, setReadyModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState<ModalPosition | null>(null);
  const [modalSize, setModalSize] = useState<ModalSize>({
    height: MODAL_ESTIMATED_HEIGHT_PX,
    width: MODAL_WIDTH_PX,
  });

  const hudSpotlightRef = useRef<HTMLDivElement | null>(null);
  const boardSpotlightRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const tileElementsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const dragOverlayElementRef = useRef<HTMLDivElement | null>(null);
  const dragPointerTargetRef = useRef<HTMLButtonElement | null>(null);
  const dragPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const pendingDragStartRef = useRef<DragSession | null>(null);
  const dragAnimationFrameRef = useRef<number | null>(null);
  const hoveredTargetIndexRef = useRef<number | null>(null);
  const pendingSwapAnimationRef = useRef<Map<string, DOMRect> | null>(null);
  const stepCompletionTimeoutRef = useRef<number | null>(null);

  const stage = stageCopy[stageIndex];
  const canInteractWithBoard = stageIndex === 1 && !readyModalOpen && !stepCompletionPending;
  const completion = stageIndex === 1 ? checkCompletion(board) : 100;
  const hudProgress = stageIndex === 1 && completion < 100 ? 90 : completion;
  const tutorialMoves = stageIndex >= 2 || stepCompletionPending ? 1 : 0;
  const tutorialTimeDisplay = stageIndex >= 2 || stepCompletionPending
    ? formatTime(TUTORIAL_TIME_SECONDS - 3)
    : formatTime(TUTORIAL_TIME_SECONDS);
  const draggedIndex = dragSession?.index ?? null;
  const tutorialModalMounted = !readyModalOpen && modalPosition !== null;
  const tileRadiusClass = getTileRadiusClass(BOARD_SIZE);
  const boardDensityClass = getBoardDensityClass(BOARD_SIZE);
  const activeSpotlightClass =
    "relative z-40 drop-shadow-[0_22px_42px_rgba(255,255,255,0.28)]";
  const inactiveSpotlightClass = "relative z-20 opacity-45";

  const updateSpotlight = useCallback(() => {
    if (readyModalOpen) {
      setModalPosition(null);
      return;
    }

    const positionTargetElement = boardSpotlightRef.current;
    if (!positionTargetElement) {
      return;
    }

    const nextSpotlightRect = getElementRect(positionTargetElement);
    setModalPosition(getTutorialModalPosition(nextSpotlightRect, modalSize));
  }, [modalSize, readyModalOpen]);

  const getTileRef = useCallback(
    (tileId: string) => (element: HTMLButtonElement | null) => {
      tileElementsRef.current[tileId] = element;
    },
    [],
  );

  const setDragOverlayRef = useCallback((element: HTMLDivElement | null) => {
    dragOverlayElementRef.current = element;
  }, []);

  const clearStepCompletionTimeout = useCallback(() => {
    if (stepCompletionTimeoutRef.current === null || typeof window === "undefined") {
      return;
    }

    window.clearTimeout(stepCompletionTimeoutRef.current);
    stepCompletionTimeoutRef.current = null;
  }, []);

  const resetTileRefs = useCallback(() => {
    tileElementsRef.current = {};
    pendingSwapAnimationRef.current = null;
  }, []);

  const goToStage = useCallback((nextStageIndex: number) => {
    clearStepCompletionTimeout();
    resetTileRefs();
    setStepCompletionPending(false);
    setStageIndex(nextStageIndex);
    setReadyModalOpen(nextStageIndex === 3);

    if (nextStageIndex === 1) {
      setBoard(getPracticeBoard());
      return;
    }

    setBoard(getSolvedTutorialBoard(`stage-${nextStageIndex}`));
  }, [clearStepCompletionTimeout, resetTileRefs]);

  useLayoutEffect(() => {
    updateSpotlight();

    if (typeof window === "undefined") {
      return;
    }

    const updateOnNextFrame = () => {
      window.requestAnimationFrame(updateSpotlight);
    };

    window.addEventListener("resize", updateOnNextFrame);
    window.addEventListener("scroll", updateOnNextFrame, true);
    window.visualViewport?.addEventListener("resize", updateOnNextFrame);
    window.visualViewport?.addEventListener("scroll", updateOnNextFrame);

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateOnNextFrame);
    const hudElement = hudSpotlightRef.current;
    const boardElement = boardSpotlightRef.current;
    const modalElement = modalRef.current;

    if (resizeObserver) {
      if (hudElement) {
        resizeObserver.observe(hudElement);
      }

      if (boardElement) {
        resizeObserver.observe(boardElement);
      }

      if (modalElement) {
        resizeObserver.observe(modalElement);
      }
    }

    return () => {
      window.removeEventListener("resize", updateOnNextFrame);
      window.removeEventListener("scroll", updateOnNextFrame, true);
      window.visualViewport?.removeEventListener("resize", updateOnNextFrame);
      window.visualViewport?.removeEventListener("scroll", updateOnNextFrame);
      resizeObserver?.disconnect();
    };
  }, [board.length, readyModalOpen, stageIndex, updateSpotlight]);

  useLayoutEffect(() => {
    const modalElement = modalRef.current;
    if (!modalElement || readyModalOpen) {
      return;
    }

    const updateModalSize = () => {
      setModalSize({
        height: modalElement.offsetHeight || MODAL_ESTIMATED_HEIGHT_PX,
        width: modalElement.offsetWidth || MODAL_WIDTH_PX,
      });
    };

    updateModalSize();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(updateModalSize);
    resizeObserver.observe(modalElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [readyModalOpen, stageIndex, tutorialModalMounted]);

  useEffect(() => {
    return () => {
      clearStepCompletionTimeout();
    };
  }, [clearStepCompletionTimeout]);

  const cancelDragAnimationFrame = useCallback(() => {
    if (dragAnimationFrameRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(dragAnimationFrameRef.current);
      dragAnimationFrameRef.current = null;
    }
  }, []);

  const updateHoveredDropTarget = useCallback((nextIndex: number | null) => {
    const previousIndex = hoveredTargetIndexRef.current;
    if (previousIndex === nextIndex) {
      return;
    }

    hoveredTargetIndexRef.current = nextIndex;

    if (nextIndex === null) {
      setDropTargetRect(null);
      return;
    }

    const tile = board[nextIndex];
    const element = tile ? tileElementsRef.current[tile.id] : null;
    if (!element) {
      setDropTargetRect(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    setDropTargetRect({
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    });
  }, [board]);

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

    if (rawIndex !== undefined) {
      const targetIndex = Number.parseInt(rawIndex, 10);
      if (!Number.isNaN(targetIndex)) {
        return targetIndex;
      }
    }

    return findNearestTileIndex(
      clientX,
      clientY,
      board.flatMap((tile, index) => {
        const tileElement = tileElementsRef.current[tile.id];
        if (!tileElement) {
          return [];
        }

        const rect = tileElement.getBoundingClientRect();
        return [{
          bottom: rect.bottom,
          index,
          left: rect.left,
          right: rect.right,
          top: rect.top,
        }];
      }),
    );
  }, [board]);

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
    if (stageIndex !== 1 || stepCompletionPending || checkCompletion(board) !== 100) {
      return;
    }

    clearDragSession();
    setStepCompletionPending(true);

    if (typeof window === "undefined") {
      goToStage(2);
      return;
    }

    stepCompletionTimeoutRef.current = window.setTimeout(() => {
      stepCompletionTimeoutRef.current = null;
      goToStage(2);
    }, STEP_COMPLETION_DELAY_MS);
  }, [board, clearDragSession, goToStage, stageIndex, stepCompletionPending]);

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
    <section className="tutorial-guide relative flex min-h-0 w-full flex-1 flex-col items-center justify-start gap-[clamp(0.35rem,1.2vw,1rem)] overflow-visible text-center">
      {!readyModalOpen && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-10 bg-slate-950/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        />
      )}

      <div
        ref={hudSpotlightRef}
        className={`w-full max-w-[min(100%,34rem)] transition-all [&_.backdrop-blur]:backdrop-blur-none ${
          stage.highlight === "hud" && !readyModalOpen ? activeSpotlightClass : inactiveSpotlightClass
        }`}
      >
        <GameHud
          bestMoves={19}
          bestTimeDisplay={formatTime(TUTORIAL_TIME_SECONDS - 5)}
          gradientQuality={hudProgress}
          moves={tutorialMoves}
          timeDisplay={tutorialTimeDisplay}
          timeWarning={false}
        />
      </div>

      <div
        ref={boardSpotlightRef}
        className={`tutorial-board w-full max-w-[min(92vw,34rem)] transition-all [&_.theme-board-shell]:backdrop-blur-none ${
          stage.highlight === "board" && !readyModalOpen ? activeSpotlightClass : inactiveSpotlightClass
        }`}
      >
        <GameBoard
          key={`tutorial-board-${stageIndex}`}
          allowHoverWhenLocked={false}
          board={board}
          boardDensityClass={boardDensityClass}
          boardTheme="classic-board"
          confettiActive={false}
          dragSession={dragSession}
          draggedIndex={draggedIndex}
          dropTargetRect={dropTargetRect}
          getTileRef={getTileRef}
          interactionDisabled={!canInteractWithBoard}
          isTileCorrect={isTileCorrect}
          isTileLocked={isTileLocked}
          onPointerDown={handlePointerDown}
          pressedTileIndex={pressedTileIndex}
          setDragOverlayRef={setDragOverlayRef}
          tileRadiusClass={tileRadiusClass}
          tileStyle="classic-tiles"
          visualMode="color"
          winState={!canInteractWithBoard}
          winWaveActive={stepCompletionPending}
        />
      </div>

      <div className={`${inactiveSpotlightClass} flex w-full max-w-[min(92vw,34rem)] justify-center`}>
        <button
          type="button"
          disabled
          className="theme-button-primary restart-button font-fredoka-strong flex min-h-[3rem] w-full max-w-[18rem] cursor-not-allowed items-center justify-center rounded-full px-5 py-3 text-sm opacity-80"
        >
          Restart
        </button>
      </div>

      {!readyModalOpen && modalPosition && (
        <motion.div
          ref={modalRef}
          className="tutorial-message theme-modal fixed z-50 w-[min(88vw,30rem)] overflow-y-auto rounded-[clamp(1rem,min(4vw,4dvh),1.5rem)] border p-[clamp(0.75rem,min(3.5vw,3.5dvh),1.5rem)] text-left"
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          style={{
            left: modalPosition.left,
            pointerEvents: "auto",
            top: modalPosition.top,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="tutorial-message-header flex items-center gap-[clamp(0.75rem,3vw,1rem)]">
            <span className="tutorial-message-chip theme-chip rounded-full px-[clamp(0.75rem,4vw,1.25rem)] py-[clamp(0.375rem,1.5dvh,0.5rem)] font-fredoka-strong text-[clamp(0.875rem,min(4vw,4dvh),1rem)] text-emerald-700">
              {stageIndex + 1} / 4
            </span>
            <span className="tutorial-message-label theme-text-muted font-fredoka-regular text-[clamp(0.875rem,min(4vw,4dvh),1rem)]">
              {stage.eyebrow}
            </span>
          </div>

          <p className="tutorial-message-title theme-text-primary font-fredoka-strong mt-[clamp(0.5rem,2dvh,1.25rem)] text-[clamp(1rem,min(5vw,5dvh),1.5rem)] leading-[1.35]">
            {stage.title}
          </p>

          <div className="tutorial-message-actions mt-[clamp(0.625rem,2dvh,1.5rem)] grid grid-cols-3 items-center gap-[clamp(0.35rem,2vw,0.75rem)]">
            <button
              type="button"
              onClick={onPlay}
              className="tutorial-message-button theme-button-secondary rounded-full px-2 py-[clamp(0.5rem,2dvh,0.75rem)] font-fredoka-strong text-[clamp(0.8rem,min(4vw,4dvh),1.125rem)]"
            >
              Skip
            </button>

            <button
              type="button"
              onClick={handleBack}
              disabled={stageIndex === 0}
              className="tutorial-message-button theme-button-secondary rounded-full px-2 py-[clamp(0.5rem,2dvh,0.75rem)] font-fredoka-strong text-[clamp(0.8rem,min(4vw,4dvh),1.125rem)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Back
            </button>

            {stageIndex === 1 ? (
              <button
                type="button"
                disabled
                className="tutorial-message-button theme-button-secondary rounded-full px-2 py-[clamp(0.5rem,2dvh,0.75rem)] font-fredoka-strong text-[clamp(0.7rem,min(3.4vw,4dvh),1.125rem)] opacity-70"
              >
                Swap first
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="tutorial-message-button theme-button-primary rounded-full px-2 py-[clamp(0.5rem,2dvh,0.75rem)] font-fredoka-strong text-[clamp(0.8rem,min(4vw,4dvh),1.125rem)]"
              >
                Next
              </button>
            )}
          </div>
        </motion.div>
      )}

      {readyModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4">
          <motion.div
            className="theme-modal max-h-[calc(100dvh-2rem)] w-full max-w-[32rem] overflow-y-auto rounded-[clamp(1.25rem,5vw,1.75rem)] border p-[clamp(1.25rem,6vw,2.25rem)] text-center"
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="theme-text-muted font-fredoka-strong text-sm uppercase tracking-[0.24em]">
              Tutorial complete
            </p>
            <h2 className="theme-text-primary font-fredoka-display mt-4 text-[3rem] leading-none">
              You&apos;re ready
            </h2>
            <p className="theme-text-secondary mx-auto mt-5 max-w-[24rem] text-lg leading-8">
              Blend it, solve it, clear it!
            </p>
            <button
              type="button"
              onClick={onPlay}
              className="theme-button-primary mt-8 inline-flex w-full items-center justify-center rounded-full px-7 py-4 font-fredoka-strong text-lg"
            >
              Play
            </button>
          </motion.div>
        </div>
      )}
    </section>
  );
}
