"use client";

import { DragEvent, useEffect, useState } from "react";

import {
  checkCompletion,
  clamp,
  DIFFICULTY_LABELS,
  formatTime,
  generateCornerColors,
  generateSolvedBoard,
  getBoardDensityClass,
  getTileRadiusClass,
  isSolved,
  isTileCorrect,
  isTileLocked,
  PRESET_DIFFICULTIES,
  scrambleBoard,
  swapTiles,
} from "./game-logic";
import { CustomGameModal, GameBoard, GameControls, GameHud, GameModal } from "./game-components";
import { BestStats, DifficultyConfig, DifficultyKey, Tile } from "./game-types";

const BEST_STATS_STORAGE_KEY = "colortile-best-stats";

export default function Home() {
  const [difficulty, setDifficulty] = useState<DifficultyKey>("normal");
  const [customSize, setCustomSize] = useState(8);
  const [customTime, setCustomTime] = useState(60);
  const [customDraftSize, setCustomDraftSize] = useState(8);
  const [customDraftTime, setCustomDraftTime] = useState(35);
  const [board, setBoard] = useState<Tile[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PRESET_DIFFICULTIES.normal.time);
  const [completion, setCompletion] = useState(0);
  const [winState, setWinState] = useState(false);
  const [loseState, setLoseState] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [timerStarted, setTimerStarted] = useState(true);
  const [bestStats, setBestStats] = useState<BestStats>({});

  const activeConfig =
    difficulty === "custom"
      ? {
          label: DIFFICULTY_LABELS.custom,
          size: clamp(customSize, 4, 25),
          time: clamp(customTime, 10, 180),
        }
      : PRESET_DIFFICULTIES[difficulty];

  const tileRadiusClass = getTileRadiusClass(activeConfig.size);
  const boardDensityClass = getBoardDensityClass(activeConfig.size);
  const currentBest = bestStats[difficulty];

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
    const corners = generateCornerColors();
    const nextSolvedBoard = generateSolvedBoard(config.size, corners);
    const nextBoard = scrambleBoard(nextSolvedBoard);

    setBoard(nextBoard);
    setDraggedIndex(null);
    setMoves(0);
    setTimeLeft(config.time);
    setCompletion(checkCompletion(nextBoard));
    setWinState(false);
    setLoseState(false);
    setTimerStarted(true);
  };

  useEffect(() => {
    if (difficulty === "custom") {
      return;
    }

    startGame(activeConfig);
  }, [difficulty]);

  useEffect(() => {
    if (!board.length) {
      return;
    }

    const nextCompletion = checkCompletion(board);
    setCompletion(nextCompletion);

    if (isSolved(board)) {
      setWinState(true);
      setDraggedIndex(null);

      setBestStats((current) => {
        const currentRecord = current[difficulty] ?? {};
        const nextRecord = {
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
  }, [board, difficulty, moves, timeLeft]);

  useEffect(() => {
    if (!board.length || winState || loseState || customModalOpen || !timerStarted) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setLoseState(true);
          setDraggedIndex(null);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [board.length, winState, loseState, customModalOpen, timerStarted]);

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, index: number) => {
    if (winState || loseState) {
      event.preventDefault();
      return;
    }

    const tile = board[index];
    if (!tile || isTileLocked(tile, index)) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
    setDraggedIndex(index);
  };

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    if (!winState && !loseState) {
      event.preventDefault();
    }
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>, targetIndex: number) => {
    event.preventDefault();

    if (draggedIndex === null || draggedIndex === targetIndex || winState || loseState) {
      setDraggedIndex(null);
      return;
    }

    const draggedTile = board[draggedIndex];
    const targetTile = board[targetIndex];

    if (
      !draggedTile ||
      !targetTile ||
      isTileLocked(draggedTile, draggedIndex) ||
      isTileLocked(targetTile, targetIndex)
    ) {
      setDraggedIndex(null);
      return;
    }

    setBoard((currentBoard) => swapTiles(currentBoard, draggedIndex, targetIndex));
    setMoves((currentMoves) => currentMoves + 1);
    setDraggedIndex(null);
  };

  const handleDifficultyChange = (nextDifficulty: DifficultyKey) => {
    if (nextDifficulty === "custom") {
      setCustomDraftSize(customSize);
      setCustomDraftTime(customTime);
      setCustomModalOpen(true);
      setTimerStarted(false);
      return;
    }

    setCustomModalOpen(false);
    setDifficulty(nextDifficulty);
  };

  const handleCustomStart = () => {
    const nextConfig = {
      label: DIFFICULTY_LABELS.custom,
      size: clamp(customDraftSize, 4, 25),
      time: clamp(customDraftTime, 10, 180),
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
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <header className="fixed left-6 top-5 z-20 sm:left-8 sm:top-6 lg:left-10">
        <div className="rounded-[1.4rem] border border-white/80 bg-white/72 px-4 py-3 shadow-[0_14px_34px_rgba(148,163,184,0.10)] backdrop-blur">
          <p className="text-4xl font-black leading-none tracking-[-0.05em] text-slate-800 sm:text-5xl">
            ColorTile
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
            board={board}
            boardDensityClass={boardDensityClass}
            draggedIndex={draggedIndex}
            tileRadiusClass={tileRadiusClass}
            winState={winState}
            loseState={loseState}
            isTileCorrect={isTileCorrect}
            isTileLocked={isTileLocked}
            onDragEnd={() => setDraggedIndex(null)}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />

          <GameModal
            activeConfig={activeConfig}
            completion={completion}
            loseState={loseState}
            moves={moves}
            onRestart={() => startGame(activeConfig)}
            timeDisplay={formatTime(timeLeft)}
            winState={winState}
          />
        </section>

        <GameControls
          difficulty={difficulty}
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
        onSizeChange={(value) => setCustomDraftSize(clamp(value, 4, 25))}
        onStart={handleCustomStart}
        onTimeChange={(value) => setCustomDraftTime(clamp(value, 10, 180))}
      />
    </main>
  );
}
