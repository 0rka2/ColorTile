"use client";

import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  checkCompletion,
  clamp,
  DIFFICULTY_LABELS,
  formatTime,
  generateCornerColors,
  generateSolvedBoard,
  getBoardDensityClass,
  getTileRadiusClass,
  isTileCorrect,
  isTileLocked,
  PRESET_DIFFICULTIES,
  scrambleBoard,
  swapTiles,
} from "./game-logic";
import { CustomGameModal, GameBoard, GameControls, GameHud, GameModal } from "./game-components";
import { BestStats, DifficultyConfig, DifficultyKey, Tile } from "./game-types";
import { GradientText } from "../components/ui/gradient-text";

const BEST_STATS_STORAGE_KEY = "colortile-best-stats";
const TILE_SWAP_ANIMATION_DURATION_MS = 180;
const TILE_SWAP_ANIMATION_EASING = "cubic-bezier(0.25, 0.1, 0.25, 1)";

function getAccuracyScore(size: number, moves: number) {
  const targetMoves = Math.max(1, Math.round(size * size * 0.58));
  const moveCount = Math.max(1, moves);
  const rawScore = Math.round((targetMoves / Math.max(targetMoves, moveCount)) * 100);
  return Math.max(75, Math.min(100, rawScore));
}

type DragSession = {
  color: string;
  height: number;
  index: number;
  isCorrect: boolean;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  tileId: string;
  width: number;
};

type BoardStateUpdater = Tile[] | ((currentBoard: Tile[]) => Tile[]);

export default function Home() {
  const [difficulty, setDifficulty] = useState<DifficultyKey>("normal");
  const [customSize, setCustomSize] = useState(8);
  const [customTime, setCustomTime] = useState(60);
  const [customDraftSize, setCustomDraftSize] = useState(8);
  const [customDraftTime, setCustomDraftTime] = useState(35);
  const [board, setBoard] = useState<Tile[]>([]);
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [hoveredTargetIndex, setHoveredTargetIndex] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PRESET_DIFFICULTIES.normal.time);
  const [completion, setCompletion] = useState(0);
  const [winState, setWinState] = useState(false);
  const [loseState, setLoseState] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [timerStarted, setTimerStarted] = useState(true);
  const [bestStats, setBestStats] = useState<BestStats>({});
  const [boardResetKey, setBoardResetKey] = useState(0);
  const tileElementsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const pendingSwapAnimationRef = useRef<Map<string, DOMRect> | null>(null);
  const dragPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const dragPointerTargetRef = useRef<HTMLButtonElement | null>(null);
  const dragOverlayElementRef = useRef<HTMLDivElement | null>(null);
  const dragAnimationFrameRef = useRef<number | null>(null);
  const latestBoardRef = useRef<Tile[]>([]);

  const activeConfig =
    difficulty === "custom"
      ? {
          label: DIFFICULTY_LABELS.custom,
          size: clamp(customSize, 4, 14),
          time: clamp(customTime, 10, 480),
        }
      : PRESET_DIFFICULTIES[difficulty];

  const tileRadiusClass = getTileRadiusClass(activeConfig.size);
  const boardDensityClass = getBoardDensityClass(activeConfig.size);
  const currentBest = bestStats[difficulty];
  const bestTimeDisplay = currentBest?.bestTimeLeft === undefined ? "-" : formatTime(currentBest.bestTimeLeft);
  const draggedIndex = dragSession?.index ?? null;
  const accuracy = getAccuracyScore(activeConfig.size, moves);
  const winCelebrationActive = winState && !modalDismissed;
  const allowHoverWhenLocked = modalDismissed && (winState || loseState);

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
    const currentDragSession = dragSession;

    if (!overlayElement || !pointerPosition || !currentDragSession) {
      return;
    }

    const nextX = pointerPosition.x - currentDragSession.offsetX;
    const nextY = pointerPosition.y - currentDragSession.offsetY;
    overlayElement.style.transform = `translate3d(${nextX}px, ${nextY}px, 0) scale(0.985)`;
  }, [dragSession]);

  const scheduleDragOverlayPositionUpdate = useCallback(() => {
    if (dragAnimationFrameRef.current !== null || typeof window === "undefined") {
      return;
    }

    dragAnimationFrameRef.current = window.requestAnimationFrame(updateDragOverlayPosition);
  }, [updateDragOverlayPosition]);

  const clearDragSession = useCallback(() => {
    cancelDragAnimationFrame();

    const currentPointerTarget = dragPointerTargetRef.current;
    const currentDragSession = dragSession;
    if (currentPointerTarget && currentDragSession?.pointerId !== undefined) {
      try {
        if (currentPointerTarget.hasPointerCapture(currentDragSession.pointerId)) {
          currentPointerTarget.releasePointerCapture(currentDragSession.pointerId);
        }
      } catch {
        // Ignore stale capture cleanup errors.
      }
    }

    dragPointerTargetRef.current = null;
    dragPointerPositionRef.current = null;
    setDragSession(null);
    setHoveredTargetIndex(null);
  }, [cancelDragAnimationFrame, dragSession]);

  const resolveDropTargetIndex = useCallback((clientX: number, clientY: number) => {
    if (typeof document === "undefined") {
      return null;
    }

    const element = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const target = element?.closest<HTMLElement>("[data-tile-index]");
    if (!target) {
      return null;
    }

    const rawIndex = target.dataset.tileIndex;
    if (!rawIndex) {
      return null;
    }

    const nextIndex = Number.parseInt(rawIndex, 10);
    return Number.isNaN(nextIndex) ? null : nextIndex;
  }, []);

  useLayoutEffect(() => {
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(BEST_STATS_STORAGE_KEY);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as BestStats;
      setBestStats(parsed);
    } catch {
      // Ignore malformed local storage and start fresh.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(BEST_STATS_STORAGE_KEY, JSON.stringify(bestStats));
  }, [bestStats]);

  const startGame = (config: DifficultyConfig) => {
    const corners = generateCornerColors(config.size);
    const nextSolvedBoard = generateSolvedBoard(config.size, corners);
    const nextBoard = scrambleBoard(nextSolvedBoard);

    clearDragSession();
    setBoardResetKey((currentKey) => currentKey + 1);
    pendingSwapAnimationRef.current = null;
    updateBoard(nextBoard);
    setMoves(0);
    setTimeLeft(config.time);
    setCompletion(checkCompletion(nextBoard));
    setWinState(false);
    setLoseState(false);
    setModalDismissed(false);
    setTimerStarted(true);
  };

  useEffect(() => {
    if (difficulty === "custom") {
      return;
    }

    startGame(activeConfig);
  }, [difficulty]);

  useEffect(() => {
    if (!board.length || winState || loseState) {
      return;
    }

    const nextCompletion = checkCompletion(board);
    setCompletion(nextCompletion);

    if (nextCompletion === 100) {
      setWinState(true);
      clearDragSession();

      setBestStats((current) => {
        const currentRecord = current[difficulty] ?? {};
        const nextRecord = {
          bestCompletion: Math.max(currentRecord.bestCompletion ?? 0, 100),
          bestTimeLeft:
            currentRecord.bestTimeLeft === undefined
              ? timeLeft
              : Math.max(currentRecord.bestTimeLeft, timeLeft),
          fewestMoves:
            currentRecord.fewestMoves === undefined
              ? moves
              : Math.min(currentRecord.fewestMoves, moves),
        };

        return {
          ...current,
          [difficulty]: nextRecord,
        };
      });
    }
  }, [board, clearDragSession, difficulty, moves, timeLeft]);

  useEffect(() => {
    if (!board.length || winState || loseState || customModalOpen || !timerStarted) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          const finalBoard = latestBoardRef.current;
          const finalCompletion = finalBoard.length ? checkCompletion(finalBoard) : 0;

          setBestStats((currentStats) => {
            const currentRecord = currentStats[difficulty] ?? {};

            return {
              ...currentStats,
              [difficulty]: {
                ...currentRecord,
                bestCompletion: Math.max(currentRecord.bestCompletion ?? 0, finalCompletion),
              },
            };
          });
          setCompletion(finalCompletion);
          setLoseState(true);
          clearDragSession();
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [board.length, clearDragSession, difficulty, winState, loseState, customModalOpen, timerStarted]);

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

      const nextHoveredTargetIndex = resolveDropTargetIndex(event.clientX, event.clientY);
      setHoveredTargetIndex((currentIndex) => (currentIndex === nextHoveredTargetIndex ? currentIndex : nextHoveredTargetIndex));
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
  }, [board, clearDragSession, dragSession, loseState, resolveDropTargetIndex, scheduleDragOverlayPositionUpdate, updateBoard, winState]);

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

    setDragSession({
      color: tile.color,
      height: tileRect.height,
      index,
      isCorrect: isTileCorrect(tile, index),
      offsetX: event.clientX - tileRect.left,
      offsetY: event.clientY - tileRect.top,
      pointerId: event.pointerId,
      tileId: tile.id,
      width: tileRect.width,
    });
    setHoveredTargetIndex(index);
  }, [board, loseState, winState]);

  const handleDifficultyChange = (nextDifficulty: DifficultyKey) => {
    if (nextDifficulty === "custom") {
      clearDragSession();
      setCustomDraftSize(customSize);
      setCustomDraftTime(customTime);
      setCustomModalOpen(true);
      setTimerStarted(false);
      return;
    }

    setCustomModalOpen(false);
    clearDragSession();
    setDifficulty(nextDifficulty);
  };

  const handleCustomStart = () => {
    const nextConfig = {
      label: DIFFICULTY_LABELS.custom,
      size: clamp(customDraftSize, 4, 14),
      time: clamp(customDraftTime, 10, 480),
    };

    setCustomSize(nextConfig.size);
    setCustomTime(nextConfig.time);
    setDifficulty("custom");
    setCustomModalOpen(false);
    startGame(nextConfig);
  };

  const handleCustomClose = () => {
    setCustomModalOpen(false);
    setTimerStarted(true);
    clearDragSession();
  };

  const handleAutoSolve = useCallback(() => {
    clearDragSession();
    pendingSwapAnimationRef.current = null;
    updateBoard((currentBoard) =>
      [...currentBoard]
        .sort((firstTile, secondTile) => firstTile.correctIndex - secondTile.correctIndex)
        .map((tile, index) => ({ ...tile, currentIndex: index })),
    );
  }, [clearDragSession, updateBoard]);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
     
      <header className="fixed left-6 top-5 z-20 sm:left-8 sm:top-6 lg:left-10">
        <div className="rounded-[1.4rem] border border-white/90 bg-white px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.10),0_6px_18px_rgba(15,23,42,0.05)] backdrop-blur">
          <p className="font-fredoka-display text-4xl font-black leading-none tracking-[-0.05em] text-slate-800 sm:text-5xl">
            <GradientText className="px-1">ColorTile</GradientText>
          </p>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[72rem] flex-col">
        <div className="flex flex-1 flex-col items-center justify-center">
        <GameHud
          bestMoves={currentBest?.fewestMoves ?? null}
          bestTimeDisplay={
            currentBest?.bestTimeLeft === undefined ? "-" : formatTime(currentBest.bestTimeLeft)
          }
          completion={completion}
          difficultyLabel={activeConfig.label}
          moves={moves}
          timeDisplay={formatTime(timeLeft)}
          timeWarning={timeLeft <= 5 && !winState && !loseState}
        />

        <section className="relative w-full">
          <GameBoard
            key={boardResetKey}
            allowHoverWhenLocked={allowHoverWhenLocked}
            board={board}
            boardDensityClass={boardDensityClass}
            dragSession={dragSession}
            draggedIndex={draggedIndex}
            getTileRef={getTileRef}
            hoveredTargetIndex={hoveredTargetIndex}
            setDragOverlayRef={setDragOverlayRef}
            tileRadiusClass={tileRadiusClass}
            winCelebrationActive={winCelebrationActive}
            winState={winState}
            loseState={loseState}
            isTileCorrect={isTileCorrect}
            isTileLocked={isTileLocked}
            onPointerDown={handlePointerDown}
          />

          <GameModal
            activeConfig={activeConfig}
            accuracy={accuracy}
            completion={completion}
            loseState={loseState}
            isDismissed={modalDismissed}
            moves={moves}
            onClose={() => setModalDismissed(true)}
            onRestart={() => startGame(activeConfig)}
            timeDisplay={formatTime(timeLeft)}
            winState={winState}
          />
        </section>

        <GameControls
          difficulty={difficulty}
          showDevControls={process.env.NODE_ENV !== "production"}
          onAutoSolve={handleAutoSolve}
          onDifficultyChange={handleDifficultyChange}
          onRestart={() => startGame(activeConfig)}
        />
        </div>
      </div>

      <CustomGameModal
        draftSize={customDraftSize}
        draftTime={customDraftTime}
        isOpen={customModalOpen}
        onClose={handleCustomClose}
        onSizeChange={(value) => setCustomDraftSize(clamp(value, 4, 14))}
        onStart={handleCustomStart}
        onTimeChange={(value) => setCustomDraftTime(clamp(value, 10, 480))}
      />
    </main>
  );
}
