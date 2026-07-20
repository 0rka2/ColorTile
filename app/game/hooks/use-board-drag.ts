"use client";

import { Dispatch, PointerEvent as ReactPointerEvent, SetStateAction, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { clamp, isTileCorrect, isTileLocked, swapTiles } from "../game-logic";
import { findNearestTileIndex } from "../drop-target";
import type { DropTargetRect } from "../drop-target";
import type { Tile } from "../game-types";
import { swapSound } from "../../lib/sounds";

const TILE_SWAP_ANIMATION_DURATION_MS = 220;
const TILE_SWAP_ANIMATION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const DRAG_ROTATION_MAX_DEGREES = 3;
const DRAG_START_DISTANCE_PX = 6;
const TILE_DRAG_SCALE = 1.065;
export type DragSession = {
  color: string;
  grabX: number;
  height: number;
  index: number;
  isCorrect: boolean;
  pointerX: number;
  pointerY: number;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  tileId: string;
  width: number;
};

type BoardStateUpdater = Tile[] | ((currentBoard: Tile[]) => Tile[]);

type BoardDragOptions = {
  board: Tile[];
  loseState: boolean;
  setBoard: Dispatch<SetStateAction<Tile[]>>;
  setMoves: Dispatch<SetStateAction<number>>;
  winState: boolean;
};

export function useBoardDrag({
  board,
  loseState,
  setBoard,
  setMoves,
  winState,
}: BoardDragOptions) {
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [pressedTileIndex, setPressedTileIndex] = useState<number | null>(null);
  const [dropTargetRect, setDropTargetRect] = useState<DropTargetRect | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const tileElementsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const pendingSwapAnimationRef = useRef<Map<string, DOMRect> | null>(null);
  const dragPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const dragPointerTargetRef = useRef<HTMLButtonElement | null>(null);
  const pendingDragStartRef = useRef<DragSession | null>(null);
  const dragOverlayElementRef = useRef<HTMLDivElement | null>(null);
  const dragAnimationFrameRef = useRef<number | null>(null);
  const hoveredTargetIndexRef = useRef<number | null>(null);
  const latestBoardRef = useRef<Tile[]>([]);

  const getTileRef = useCallback(
    (tileId: string) => (element: HTMLButtonElement | null) => {
      tileElementsRef.current[tileId] = element;
    },
    [],
  );

  const setDragOverlayRef = useCallback((element: HTMLDivElement | null) => {
    dragOverlayElementRef.current = element;
  }, []);

  const updateBoard = useCallback((nextBoardOrUpdater: BoardStateUpdater) => {
    setBoard((currentBoard) => {
      const nextBoard =
        typeof nextBoardOrUpdater === "function"
          ? nextBoardOrUpdater(currentBoard)
          : nextBoardOrUpdater;

      latestBoardRef.current = nextBoard;
      return nextBoard;
    });
  }, [setBoard]);

  const clearPendingSwapAnimation = useCallback(() => {
    pendingSwapAnimationRef.current = null;
  }, []);

  const cancelDragAnimationFrame = useCallback(() => {
    if (dragAnimationFrameRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(dragAnimationFrameRef.current);
      dragAnimationFrameRef.current = null;
    }
  }, []);

  const updateDragOverlayPosition = useCallback(() => {
    dragAnimationFrameRef.current = null;

    const overlayElement = dragOverlayElementRef.current;
    const pointerPosition = dragPointerPositionRef.current;
    const currentDragSession = dragSessionRef.current;

    if (!overlayElement || !pointerPosition || !currentDragSession) {
      return;
    }

    const nextX = pointerPosition.x - currentDragSession.offsetX;
    const nextY = pointerPosition.y - currentDragSession.offsetY;
    const rotate = clamp((pointerPosition.x - currentDragSession.grabX) / 14, -DRAG_ROTATION_MAX_DEGREES, DRAG_ROTATION_MAX_DEGREES);
    overlayElement.style.transform = `translate3d(${nextX}px, ${nextY}px, 0) scale(${TILE_DRAG_SCALE}) rotate(${rotate}deg)`;

  }, []);

  const scheduleDragOverlayPositionUpdate = useCallback(() => {
    if (dragAnimationFrameRef.current !== null || typeof window === "undefined") {
      return;
    }

    dragAnimationFrameRef.current = window.requestAnimationFrame(updateDragOverlayPosition);
  }, [updateDragOverlayPosition]);

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

    const tile = latestBoardRef.current[nextIndex];
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
  }, []);

  const clearDragSession = useCallback(() => {
    cancelDragAnimationFrame();

    const currentPointerTarget = dragPointerTargetRef.current;
    const activePointerId = dragSessionRef.current?.pointerId ?? pendingDragStartRef.current?.pointerId;
    if (currentPointerTarget && activePointerId !== undefined) {
      try {
        if (currentPointerTarget.hasPointerCapture(activePointerId)) {
          currentPointerTarget.releasePointerCapture(activePointerId);
        }
      } catch {
        // Ignore stale capture cleanup errors.
      }
    }

    dragPointerTargetRef.current = null;
    dragPointerPositionRef.current = null;
    pendingDragStartRef.current = null;
    setPressedTileIndex(null);
    updateHoveredDropTarget(null);
    setDragSession(null);
  }, [cancelDragAnimationFrame, updateHoveredDropTarget]);

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

  useEffect(() => {
    latestBoardRef.current = board;
  }, [board]);

  useEffect(() => {
    dragSessionRef.current = dragSession;
  }, [dragSession]);

  useLayoutEffect(() => {
    const previousPositions = pendingSwapAnimationRef.current;
    if (!previousPositions) {
      return;
    }

    pendingSwapAnimationRef.current = null;
    swapSound.play();
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
      const targetTile = rawTargetIndex === null ? null : latestBoardRef.current[rawTargetIndex];
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
        !winState &&
        !loseState &&
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

        updateBoard((currentBoard) => swapTiles(currentBoard, sourceIndex, targetIndex));
        setMoves((currentMoves) => currentMoves + 1);
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
  }, [board, clearDragSession, dragSession, loseState, resolveDropTargetIndex, scheduleDragOverlayPositionUpdate, setMoves, updateBoard, updateHoveredDropTarget, winState]);

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
    return () => {
      cancelDragAnimationFrame();
    };
  }, [cancelDragAnimationFrame]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>, index: number) => {
    if (winState || loseState) {
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
  }, [board, loseState, winState]);

  return {
    clearDragSession,
    clearPendingSwapAnimation,
    dragSession,
    draggedIndex: dragSession?.index ?? null,
    dropTargetRect,
    getTileRef,
    handlePointerDown,
    latestBoardRef,
    pressedTileIndex,
    setDragOverlayRef,
    updateBoard,
  };
}
