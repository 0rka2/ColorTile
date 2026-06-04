"use client";

import { DragEvent, useEffect, useState } from "react";

import {
  checkCompletion,
  clamp,
  DIFFICULTIES,
  formatTime,
  generateCornerColors,
  generateSolvedBoard,
  getBoardSpacing,
  getTileRadiusClass,
  isSolved,
  isTileCorrect,
  isTileLocked,
  scrambleBoard,
  swapTiles,
} from "./game-logic";
import { GameBoard, GameControls, GameHud, GameModal } from "./game-components";
import { DifficultyConfig, DifficultyKey, Tile } from "./game-types";

export default function Home() {
  const [difficulty, setDifficulty] = useState<DifficultyKey>("normal");
  const [customSize, setCustomSize] = useState(8);
  const [customTime, setCustomTime] = useState(35);
  const [board, setBoard] = useState<Tile[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DIFFICULTIES.normal.time);
  const [completion, setCompletion] = useState(0);
  const [winState, setWinState] = useState(false);
  const [loseState, setLoseState] = useState(false);

  const activeConfig =
    difficulty === "custom"
      ? {
          label: DIFFICULTIES.custom.label,
          size: clamp(customSize, 3, 12),
          time: clamp(customTime, 10, 180),
        }
      : DIFFICULTIES[difficulty];

  const tileRadiusClass = getTileRadiusClass(activeConfig.size);
  const { gap: boardGap, padding: boardPadding } = getBoardSpacing(activeConfig.size);

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
  };

  useEffect(() => {
    startGame(activeConfig);
  }, [difficulty, customSize, customTime]);

  useEffect(() => {
    if (!board.length) {
      return;
    }

    const nextCompletion = checkCompletion(board);
    setCompletion(nextCompletion);

    if (isSolved(board)) {
      setWinState(true);
      setDraggedIndex(null);
    }
  }, [board]);

  useEffect(() => {
    if (!board.length || winState || loseState) {
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
  }, [board.length, winState, loseState]);

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

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[72rem] flex-col items-center justify-center">
        <GameHud
          completion={completion}
          difficultyLabel={activeConfig.label}
          moves={moves}
          timeDisplay={formatTime(timeLeft)}
          timeWarning={timeLeft <= 5 && !winState && !loseState}
        />

        <section className="relative w-full">
          <GameBoard
            board={board}
            boardGap={boardGap}
            boardPadding={boardPadding}
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
          customSize={customSize}
          customTime={customTime}
          difficulty={difficulty}
          onCustomSizeChange={(value) => setCustomSize(clamp(value, 3, 12))}
          onCustomTimeChange={(value) => setCustomTime(clamp(value, 10, 180))}
          onDifficultyChange={setDifficulty}
          onRestart={() => startGame(activeConfig)}
        />
      </div>
    </main>
  );
}
