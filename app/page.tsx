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
import { CustomGameModal, GameBoard, GameControls, GameDrawer, GameHud, GameModal, GameModeModal, ThemeToggle, WinConfetti } from "./game-components";
import { getGradientQuality } from "./gradient-quality";
import { EMPTY_PERSONAL_BEST_STATUS, getPersonalBestStatus } from "./personal-best";
import type { PersonalBestStatus } from "./personal-best";
import { resolveThemeMode, THEME_MODE_STORAGE_KEY } from "./settings-options";
import type { ThemeMode } from "./settings-options";
import type { BestStats, DifficultyConfig, DifficultyKey, Tile } from "./game-types";
import { getWinSequenceDurations } from "./win-sequence";
import type { WinPhase } from "./win-sequence";
import { GradientText } from "../components/ui/gradient-text";
import { boardCompleteSound, completeSound, swapSound, timeUpSound } from "./lib/sounds";


const BEST_STATS_STORAGE_KEY = "colortile-best-stats";
const TILE_SWAP_ANIMATION_DURATION_MS = 220;
const TILE_SWAP_ANIMATION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const DRAG_ROTATION_MAX_DEGREES = 3;
const DRAG_START_DISTANCE_PX = 6;
const TILE_DRAG_SCALE = 1.065;
const GAME_AREA_MAX_WIDTH_PX = 600;
const DROP_TARGET_RING_CLASSES = [
  "ring-2",
  "ring-slate-300/70",
  "ring-offset-2",
  "ring-offset-white/80",
];

function getResponsiveCustomSizeMax(viewportWidth: number) {
  if (viewportWidth < 480) {
    return 8;
  }

  if (viewportWidth < 768) {
    return 10;
  }

  if (viewportWidth < 1024) {
    return 12;
  }

  return 14;
}

function getAccuracyScore(size: number, moves: number) {
  const targetMoves = Math.max(1, Math.round(size * size * 0.58));
  const moveCount = Math.max(1, moves);
  const rawScore = Math.round((targetMoves / Math.max(targetMoves, moveCount)) * 100);
  return Math.max(75, Math.min(100, rawScore));
}

function getBestSolveTime(record: BestStats[DifficultyKey], totalTime: number) {
  if (record?.bestSolveTime !== undefined) {
    return record.bestSolveTime;
  }

  if (record?.bestTimeLeft !== undefined) {
    return Math.max(0, totalTime - record.bestTimeLeft);
  }

  return undefined;
}

type DragSession = {
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

export default function Home() {
  const pageShellRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const hudRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const restartRef = useRef<HTMLDivElement | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyKey>("normal");
  const [customSizeMax, setCustomSizeMax] = useState(14);
  const [customSize, setCustomSize] = useState(8);
  const [customTime, setCustomTime] = useState(60);
  const [customDraftSize, setCustomDraftSize] = useState(8);
  const [customDraftTime, setCustomDraftTime] = useState(35);
  const [board, setBoard] = useState<Tile[]>([]);
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [pressedTileIndex, setPressedTileIndex] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PRESET_DIFFICULTIES.normal.time);
  const [completion, setCompletion] = useState(0);
  const [winState, setWinState] = useState(false);
  const [winPhase, setWinPhase] = useState<WinPhase>("idle");
  const [loseState, setLoseState] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modeModalOpen, setModeModalOpen] = useState(false);
  const [timerStarted, setTimerStarted] = useState(true);
  const [bestStats, setBestStats] = useState<BestStats>({});
  const [personalBestStatus, setPersonalBestStatus] = useState<PersonalBestStatus>(EMPTY_PERSONAL_BEST_STATUS);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [boardResetKey, setBoardResetKey] = useState(0);
  const [boardSize, setBoardSize] = useState(0);
  const tileElementsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const pendingSwapAnimationRef = useRef<Map<string, DOMRect> | null>(null);
  const dragPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const dragPointerTargetRef = useRef<HTMLButtonElement | null>(null);
  const pendingDragStartRef = useRef<DragSession | null>(null);
  const dragOverlayElementRef = useRef<HTMLDivElement | null>(null);
  const dragAnimationFrameRef = useRef<number | null>(null);
  const hoveredTargetIndexRef = useRef<number | null>(null);
  const latestBoardRef = useRef<Tile[]>([]);
  const winSequenceTimeoutsRef = useRef<number[]>([]);
  const dragSessionActiveRef = useRef(false);
  const timerEffectRunCountRef = useRef(0);
  const clearDragSessionRef = useRef<() => void>(() => {});
  const resetWinSequenceRef = useRef<() => void>(() => {});
  const lastWinPhaseSoundRef = useRef<WinPhase>("idle");

  const activeConfig =
    difficulty === "custom"
      ? {
          label: DIFFICULTY_LABELS.custom,
          size: clamp(customSize, 4, customSizeMax),
          time: clamp(customTime, 10, 480),
        }
      : PRESET_DIFFICULTIES[difficulty];

  const tileRadiusClass = getTileRadiusClass(activeConfig.size);
  const boardDensityClass = getBoardDensityClass(activeConfig.size);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      setThemeMode(resolveThemeMode(window.localStorage.getItem(THEME_MODE_STORAGE_KEY)));
    } catch {
      setThemeMode("light");
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;

    try {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage failures and keep the in-memory theme.
    }
  }, [themeMode]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const measureBoardSize = () => {
      const shellElement = pageShellRef.current;
      const contentElement = contentRef.current;
      const headerElement = headerRef.current;
      const hudElement = hudRef.current;
      const controlsElement = controlsRef.current;
      const restartElement = restartRef.current;

      if (!shellElement || !contentElement || !headerElement || !hudElement || !controlsElement || !restartElement) {
        return;
      }

      const shellGap = Number.parseFloat(window.getComputedStyle(shellElement).rowGap || "0");
      const contentGap = Number.parseFloat(window.getComputedStyle(contentElement).rowGap || "0");
      const paddingLeft = Number.parseFloat(window.getComputedStyle(shellElement).paddingLeft || "0");
      const paddingRight = Number.parseFloat(window.getComputedStyle(shellElement).paddingRight || "0");
      const paddingTop = Number.parseFloat(window.getComputedStyle(shellElement).paddingTop || "0");
      const paddingBottom = Number.parseFloat(window.getComputedStyle(shellElement).paddingBottom || "0");
      const contentPaddingBottom = Number.parseFloat(window.getComputedStyle(contentElement).paddingBottom || "0");

      const availableWidth = window.innerWidth - paddingLeft - paddingRight;
      const reservedHeight =
        headerElement.getBoundingClientRect().height +
        hudElement.getBoundingClientRect().height +
        controlsElement.getBoundingClientRect().height +
        restartElement.getBoundingClientRect().height +
        shellGap +
        contentGap * 3 +
        paddingTop +
        paddingBottom +
        contentPaddingBottom;
      const availableHeight = window.innerHeight - reservedHeight;

      const measuredBoardSize = Math.max(0, Math.floor(Math.min(availableWidth, availableHeight)));
      const minimumBoardSize = window.innerWidth < 360 ? 240 : 280;
      const nextBoardSize = Math.min(availableWidth, GAME_AREA_MAX_WIDTH_PX, Math.max(minimumBoardSize, measuredBoardSize));
      setBoardSize(nextBoardSize);
    };

    measureBoardSize();

    const resizeObserver = new ResizeObserver(measureBoardSize);
    [pageShellRef.current, headerRef.current, contentRef.current, hudRef.current, controlsRef.current, restartRef.current].forEach((element) => {
      if (element) {
        resizeObserver.observe(element);
      }
    });

    window.addEventListener("resize", measureBoardSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureBoardSize);
    };
  }, [activeConfig.time, activeConfig.size, board.length, boardResetKey, completion, difficulty, loseState, moves, themeMode, timeLeft, winState]);
  const currentBest = bestStats[difficulty];
  const bestSolveTime = getBestSolveTime(currentBest, activeConfig.time);
  const bestTimeDisplay = bestSolveTime === undefined ? "-" : formatTime(bestSolveTime);
  const solveTime = Math.max(0, activeConfig.time - timeLeft);
  const draggedIndex = dragSession?.index ?? null;
  const accuracy = getAccuracyScore(activeConfig.size, moves);
  const gradientQuality = getGradientQuality(completion);
  const winWaveActive = winPhase === "boardWave";
  const confettiActive = winPhase === "confetti" || winPhase === "modal";
  const winModalVisible = winPhase === "modal";
  const allowHoverWhenLocked = false;

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

  const clearWinSequenceTimeouts = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    winSequenceTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    winSequenceTimeoutsRef.current = [];
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
    const rotate = clamp((pointerPosition.x - currentDragSession.grabX) / 14, -DRAG_ROTATION_MAX_DEGREES, DRAG_ROTATION_MAX_DEGREES);
    overlayElement.style.transform = `translate3d(${nextX}px, ${nextY}px, 0) scale(${TILE_DRAG_SCALE}) rotate(${rotate}deg)`;
  }, [dragSession]);

  const scheduleDragOverlayPositionUpdate = useCallback(() => {
    if (dragAnimationFrameRef.current !== null || typeof window === "undefined") {
      return;
    }

    dragAnimationFrameRef.current = window.requestAnimationFrame(updateDragOverlayPosition);
  }, [updateDragOverlayPosition]);

  const setDropTargetHighlight = useCallback((index: number | null, active: boolean) => {
    if (index === null) {
      return;
    }

    const tile = latestBoardRef.current[index];
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
  }, []);

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
        // Ignore stale capture cleanup errors.
      }
    }

    dragPointerTargetRef.current = null;
    dragPointerPositionRef.current = null;
    pendingDragStartRef.current = null;
    setPressedTileIndex(null);
    updateHoveredDropTarget(null);
    setDragSession(null);
  }, [cancelDragAnimationFrame, dragSession, updateHoveredDropTarget]);

  const resetWinSequence = useCallback(() => {
    clearWinSequenceTimeouts();
    lastWinPhaseSoundRef.current = "idle";
    setWinPhase("idle");
    setPersonalBestStatus(EMPTY_PERSONAL_BEST_STATUS);
  }, [clearWinSequenceTimeouts]);

  useEffect(() => {
    clearDragSessionRef.current = clearDragSession;
    resetWinSequenceRef.current = resetWinSequence;
  }, [clearDragSession, resetWinSequence]);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateCustomSizeMax = () => {
      const nextMax = getResponsiveCustomSizeMax(window.innerWidth);
      setCustomSizeMax(nextMax);
      setCustomSize((currentSize) => clamp(currentSize, 4, nextMax));
      setCustomDraftSize((currentSize) => clamp(currentSize, 4, nextMax));
    };

    updateCustomSizeMax();
    window.addEventListener("resize", updateCustomSizeMax);

    return () => {
      window.removeEventListener("resize", updateCustomSizeMax);
    };
  }, []);

  const startGame = (config: DifficultyConfig) => {
    const corners = generateCornerColors(config.size);
    const nextSolvedBoard = generateSolvedBoard(config.size, corners);
    const nextBoard = scrambleBoard(nextSolvedBoard);

    clearDragSession();
    resetWinSequence();
    setBoardResetKey((currentKey) => currentKey + 1);
    pendingSwapAnimationRef.current = null;
    updateBoard(nextBoard);
    setMoves(0);
    setTimeLeft(config.time);
    setCompletion(checkCompletion(nextBoard));
    setWinState(false);
    setLoseState(false);
    setTimerStarted(true);
  };

  useEffect(() => {
    dragSessionActiveRef.current = dragSession !== null;
    // #region agent log
    fetch("http://127.0.0.1:7759/ingest/373885ff-b644-4d4e-bd29-b3b11ded9295", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2cb712" },
      body: JSON.stringify({
        sessionId: "2cb712",
        runId: "pre-fix",
        hypothesisId: "A",
        location: "page.tsx:dragSession-effect",
        message: "dragSession changed",
        data: { dragActive: dragSession !== null, pressedTileIndex },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [dragSession, pressedTileIndex]);

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
      const solveTime = activeConfig.time - timeLeft;
      const currentBestWithSolveTime = {
        ...currentBest,
        bestSolveTime: getBestSolveTime(currentBest, activeConfig.time),
      };

      setPersonalBestStatus(
        getPersonalBestStatus(currentBestWithSolveTime, {
          moves,
          solveTime,
        }),
      );
      setWinState(true);
      setWinPhase("boardWave");
      completeSound.play();
      clearDragSession();

      setBestStats((current) => {
        const currentRecord = current[difficulty] ?? {};
        const currentBestSolveTime = getBestSolveTime(currentRecord, activeConfig.time);
        const nextRecord = {
          bestCompletion: Math.max(currentRecord.bestCompletion ?? 0, 100),
          bestSolveTime:
            currentBestSolveTime === undefined
              ? solveTime
              : Math.min(currentBestSolveTime, solveTime),
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
  }, [activeConfig.time, board, clearDragSession, currentBest, difficulty, moves, timeLeft, winState]);

  useEffect(() => {
    if (winPhase !== "boardWave" && winPhase !== "confetti") {
      return;
    }

    clearWinSequenceTimeouts();

    const { boardWaveDurationMs, modalDelayMs } = getWinSequenceDurations(board.length);

    if (winPhase === "boardWave") {
      if (lastWinPhaseSoundRef.current !== "boardWave") {
        boardCompleteSound.play();
        lastWinPhaseSoundRef.current = "boardWave";
      }

      winSequenceTimeoutsRef.current.push(
        window.setTimeout(() => {
          setWinPhase("confetti");
        }, boardWaveDurationMs),
      );
      return;
    }

    winSequenceTimeoutsRef.current.push(
      window.setTimeout(() => {
        setWinPhase("modal");
      }, modalDelayMs - boardWaveDurationMs),
    );

    return () => {
      clearWinSequenceTimeouts();
    };
  }, [board.length, clearWinSequenceTimeouts, winPhase]);

  useEffect(() => {
    if (!board.length || winState || loseState || customModalOpen || !timerStarted) {
      // #region agent log
      fetch("http://127.0.0.1:7759/ingest/373885ff-b644-4d4e-bd29-b3b11ded9295", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2cb712" },
        body: JSON.stringify({
          sessionId: "2cb712",
        runId: "post-fix",
        hypothesisId: "B",
        location: "page.tsx:timer-effect-guard",
          message: "Timer effect blocked",
          data: { boardLength: board.length, winState, loseState, customModalOpen, timerStarted, dragActive: dragSessionActiveRef.current },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return;
    }

    timerEffectRunCountRef.current += 1;
    const effectRunId = timerEffectRunCountRef.current;
    // #region agent log
    fetch("http://127.0.0.1:7759/ingest/373885ff-b644-4d4e-bd29-b3b11ded9295", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2cb712" },
      body: JSON.stringify({
        sessionId: "2cb712",
        runId: "post-fix",
        hypothesisId: "A",
        location: "page.tsx:timer-effect-setup",
        message: "Timer interval created",
        data: { effectRunId, timerStarted, dragActive: dragSessionActiveRef.current, timeLeft },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const interval = window.setInterval(() => {
      setTimeLeft((current) => {
        // #region agent log
        fetch("http://127.0.0.1:7759/ingest/373885ff-b644-4d4e-bd29-b3b11ded9295", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2cb712" },
          body: JSON.stringify({
            sessionId: "2cb712",
            runId: "post-fix",
            hypothesisId: "C",
            location: "page.tsx:timer-tick",
            message: "Timer tick fired",
            data: { effectRunId, current, next: current <= 1 ? 0 : current - 1, dragActive: dragSessionActiveRef.current },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
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
          resetWinSequenceRef.current();
          setLoseState(true);
          timeUpSound.play();
          clearDragSessionRef.current();
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      // #region agent log
      fetch("http://127.0.0.1:7759/ingest/373885ff-b644-4d4e-bd29-b3b11ded9295", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2cb712" },
        body: JSON.stringify({
          sessionId: "2cb712",
          runId: "post-fix",
          hypothesisId: "A",
          location: "page.tsx:timer-effect-cleanup",
          message: "Timer interval cleared",
          data: { effectRunId, dragActive: dragSessionActiveRef.current },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      window.clearInterval(interval);
    };
  }, [board.length, difficulty, winState, loseState, customModalOpen, timerStarted]);

  useEffect(() => {
    if (!drawerOpen && !modeModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setModeModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [drawerOpen, modeModalOpen]);

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

  useEffect(() => {
    return () => {
      clearWinSequenceTimeouts();
    };
  }, [clearWinSequenceTimeouts]);

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

  const handleDifficultyChange = (nextDifficulty: DifficultyKey) => {
    if (nextDifficulty === "custom") {
      clearDragSession();
      resetWinSequence();
      setCustomDraftSize(customSize);
      setCustomDraftTime(customTime);
      setCustomModalOpen(true);
      setTimerStarted(false);
      return;
    }

    setCustomModalOpen(false);
    clearDragSession();
    resetWinSequence();
    setDifficulty(nextDifficulty);
  };

  const handleCustomStart = () => {
    const nextConfig = {
      label: DIFFICULTY_LABELS.custom,
      size: clamp(customDraftSize, 4, customSizeMax),
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
    resetWinSequence();
  };

  const handleOpenCustomFromDrawer = () => {
    setDrawerOpen(false);
    clearDragSession();
    resetWinSequence();
    setCustomDraftSize(customSize);
    setCustomDraftTime(customTime);
    setCustomModalOpen(true);
    setTimerStarted(false);
  };

  const handleOpenModesFromDrawer = () => {
    setDrawerOpen(false);
    setModeModalOpen(true);
  };

  const handleAutoSolve = useCallback(() => {
    clearDragSession();
    resetWinSequence();
    pendingSwapAnimationRef.current = null;
    updateBoard((currentBoard) =>
      [...currentBoard]
        .sort((firstTile, secondTile) => firstTile.correctIndex - secondTile.correctIndex)
        .map((tile, index) => ({ ...tile, currentIndex: index })),
    );
  }, [clearDragSession, resetWinSequence, updateBoard]);

  return (
    <main className="theme-page-bg min-h-dvh overflow-x-hidden overflow-y-hidden px-[clamp(0.5rem,2vw,1.25rem)] py-0">
      <div ref={pageShellRef} className="mx-auto flex min-h-[100dvh] w-full max-w-[72rem] flex-col gap-[clamp(0.35rem,0.9vw,0.7rem)]">
        <header ref={headerRef} className="flex items-start justify-between gap-[clamp(0.55rem,1.2vw,0.9rem)]">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="relative">
              <div className="theme-header-surface rounded-[clamp(0.85rem,1.5vw,1.3rem)] border px-[clamp(0.65rem,1.4vw,0.95rem)] py-[clamp(0.45rem,1vw,0.75rem)] backdrop-blur">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open navigation menu"
                  aria-expanded={drawerOpen}
                  className="flex items-center gap-2 sm:gap-2.5"
                >
                  <span aria-hidden="true" className="theme-text-primary text-[clamp(1.1rem,1.8vw,1.45rem)] leading-none">
                    {"\u2630"}
                  </span>
                  <p className="font-fredoka-display theme-text-primary text-[clamp(1.35rem,2.4vw,2.1rem)] font-black leading-none tracking-[-0.05em]">
                    <GradientText className="px-1">ColorTile</GradientText>
                  </p>
                </button>
              </div>
              <GameDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onOpenCustom={handleOpenCustomFromDrawer}
                onOpenModes={handleOpenModesFromDrawer}
              />
            </div>
            <button
              type="button"
              onClick={() => setModeModalOpen(true)}
              aria-label="Open modes"
              className="theme-header-surface flex min-h-[clamp(2.55rem,4.8vw,3.25rem)] items-center gap-2 rounded-full border px-[clamp(0.8rem,1.8vw,1.15rem)] py-[clamp(0.45rem,1vw,0.75rem)] shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
            >
              <span className="theme-text-primary font-fredoka-strong text-[clamp(0.9rem,1.45vw,1.08rem)] leading-none">
                {activeConfig.label}
              </span>
              <span aria-hidden="true" className="theme-text-muted text-[clamp(0.75rem,1vw,0.9rem)] leading-none">
                {"\u25BE"}
              </span>
            </button>
          </div>

          <div className="shrink-0">
            <ThemeToggle onThemeModeChange={setThemeMode} themeMode={themeMode} />
          </div>
        </header>

        <section ref={contentRef} className="flex flex-1 min-h-0 flex-col items-center justify-start gap-[clamp(0.25rem,0.65vw,0.5rem)] pb-[clamp(0.1rem,0.35vh,0.25rem)] mt-[10vh]">
          <div
            ref={hudRef}
            className="w-full max-w-full"
            style={{ width: boardSize > 0 ? `min(100%, ${boardSize}px)` : `min(100%, ${GAME_AREA_MAX_WIDTH_PX}px)` }}
          >
            <GameHud
              bestMoves={currentBest?.fewestMoves ?? null}
              bestTimeDisplay={bestTimeDisplay}
              gradientQuality={gradientQuality}
              moves={moves}
              timeDisplay={formatTime(timeLeft)}
              timeWarning={timeLeft <= 5 && !winState && !loseState}
            />
          </div>

          <div
            className="flex w-full max-w-full justify-center"
            style={{ width: boardSize > 0 ? `min(100%, ${boardSize}px)` : `min(100%, ${GAME_AREA_MAX_WIDTH_PX}px)` }}
          >
            <GameBoard
              key={boardResetKey}
              allowHoverWhenLocked={allowHoverWhenLocked}
              board={board}
              boardDensityClass={boardDensityClass}
              dragSession={dragSession}
              draggedIndex={draggedIndex}
              getTileRef={getTileRef}
              setDragOverlayRef={setDragOverlayRef}
              tileRadiusClass={tileRadiusClass}
              confettiActive={confettiActive}
              winWaveActive={winWaveActive}
              winState={winState}
              loseState={loseState}
              isTileCorrect={isTileCorrect}
              isTileLocked={isTileLocked}
              onPointerDown={handlePointerDown}
              pressedTileIndex={pressedTileIndex}
            />
          </div>

          <div
            ref={controlsRef}
            className="w-full max-w-full"
            style={{ width: boardSize > 0 ? `min(100%, ${boardSize}px)` : `min(100%, ${GAME_AREA_MAX_WIDTH_PX}px)` }}
          >
            <GameControls
              showDevControls={process.env.NODE_ENV !== "production"}
              onAutoSolve={handleAutoSolve}
            />
          </div>

          <div
            ref={restartRef}
            className="relative z-10 flex w-full justify-center"
            style={{ width: boardSize > 0 ? `min(100%, ${boardSize}px)` : `min(100%, ${GAME_AREA_MAX_WIDTH_PX}px)` }}
          >
            <button
              type="button"
              onClick={() => startGame(activeConfig)}
              aria-label="Restart game"
              className="theme-button-primary restart-button font-fredoka-strong flex min-h-[clamp(2.5rem,4.5vw,3.2rem)] items-center justify-center gap-2 rounded-full px-[clamp(1rem,1.8vw,1.5rem)] py-[clamp(0.45rem,0.85vw,0.65rem)] text-[clamp(0.92rem,1.45vw,1.05rem)] shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
            >
              <span aria-hidden="true" className="text-[clamp(0.95rem,1.5vw,1.1rem)] leading-none">
                {"\u21BB"}
              </span>
              <span>Restart</span>
            </button>
          </div>
        </section>
      </div>

      <GameModal
        activeConfig={activeConfig}
        accuracy={accuracy}
        completion={completion}
        loseState={loseState}
        moves={moves}
        onRestart={() => startGame(activeConfig)}
        personalBestStatus={personalBestStatus}
        timeDisplay={formatTime(solveTime)}
        winState={winModalVisible}
      />
      <WinConfetti active={confettiActive} />
      <GameModeModal
        difficulty={difficulty}
        isOpen={modeModalOpen}
        onClose={() => setModeModalOpen(false)}
        onDifficultyChange={handleDifficultyChange}
      />
      <CustomGameModal
        draftSize={customDraftSize}
        draftTime={customDraftTime}
        isOpen={customModalOpen}
        maxSize={customSizeMax}
        onClose={handleCustomClose}
        onSizeChange={(value) => setCustomDraftSize(clamp(value, 4, customSizeMax))}
        onStart={handleCustomStart}
        onTimeChange={(value) => setCustomDraftTime(clamp(value, 10, 480))}
      />
    </main>
  );
}
