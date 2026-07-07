"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "motion/react";
import { FaShoppingCart } from "react-icons/fa";
import { IoMdTrophy } from "react-icons/io";
import { VscStarFull } from "react-icons/vsc";

import {
  EndlessStartModal,
  GameBoard,
  GameControls,
  GameHud,
  GameModal,
  GameModeModal,
  LeaderboardModal,
  ShopComingSoonModal,
  WinConfetti,
} from "./game/components/game-components";
import { Header } from "./game/components/header";
import { useBoardDrag } from "./game/hooks/use-board-drag";
import { useBoardSize } from "./game/hooks/use-board-size";
import { usePersistentEndlessStats } from "./game/hooks/use-persistent-endless-stats";
import { usePersistentBestStats } from "./game/hooks/use-persistent-best-stats";
import { useWinSequence } from "./game/hooks/use-win-sequence";
import {
  checkCompletion,
  DIFFICULTY_LABELS,
  formatTime,
  generateCornerColors,
  generateSolvedBoard,
  getBoardDensityClass,
  getEndlessConfig,
  getEndlessSwapBudget,
  getEndlessThreeStarMoveLimit,
  getTileRadiusClass,
  isTileCorrect,
  isTileLocked,
  PRESET_DIFFICULTIES,
  scrambleBoard,
} from "./game/game-logic";
import type { BestStats, DifficultyConfig, DifficultyKey, Tile } from "./game/game-types";
import { getGradientQuality } from "./game/gradient-quality";
import { timeUpSound } from "./lib/sounds";
import { EMPTY_PERSONAL_BEST_STATUS, getPersonalBestStatus } from "./game/personal-best";
import type { PersonalBestStatus } from "./game/personal-best";
import TutorialGuide from "./tutorial/tutorial-guide";
import type { AppView } from "./views/app-view";
import { AboutView } from "./views/about-view";
import { PrivacyView } from "./views/privacy-view";

const HUD_FEEDBACK_EASE = [0.22, 1, 0.36, 1] as const;
const HUD_FEEDBACK_ANIMATION = {
  opacity: [0.2, 1],
  y: [35, 0],
  transition: {
    duration: 0.5,
    ease: HUD_FEEDBACK_EASE,
  },
};

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

export default function Home() {
  const [difficulty, setDifficulty] = useState<DifficultyKey>("normal");
  const [board, setBoard] = useState<Tile[]>([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [completion, setCompletion] = useState(0);
  const [winState, setWinState] = useState(false);
  const [loseState, setLoseState] = useState(false);
  const [endlessModalOpen, setEndlessModalOpen] = useState(false);
  const [endlessPuzzleNumber, setEndlessPuzzleNumber] = useState(1);
  const [endlessStreak, setEndlessStreak] = useState(0);
  const [endlessLastClear, setEndlessLastClear] = useState<{
    isThreeStar: boolean;
    puzzleNumber: number;
    swapBudget: number;
    threeStarMoveLimit: number;
  } | null>(null);
  const [modeModalOpen, setModeModalOpen] = useState(false);
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [timerStarted, setTimerStarted] = useState(true);
  const [personalBestStatus, setPersonalBestStatus] = useState<PersonalBestStatus>(EMPTY_PERSONAL_BEST_STATUS);
  const [boardResetKey, setBoardResetKey] = useState(0);
  const [activeView, setActiveView] = useState<AppView>("game");
  const [hudFeedbackKey, setHudFeedbackKey] = useState(0);
  const hudFeedbackControls = useAnimationControls();
  const clearDragSessionRef = useRef<() => void>(() => {});
  const resetWinSequenceRef = useRef<() => void>(() => {});

  const { bestStats, setBestStats } = usePersistentBestStats();
  const { endlessStats, setEndlessStats } = usePersistentEndlessStats();

  const activeConfig =
    difficulty === "endless"
      ? getEndlessConfig(endlessPuzzleNumber)
      : PRESET_DIFFICULTIES[difficulty];

  const tileRadiusClass = getTileRadiusClass(activeConfig.size);
  const boardDensityClass = getBoardDensityClass(activeConfig.size);
  const currentBest = bestStats[difficulty];
  const isEndlessMode = difficulty === "endless";
  const endlessSwapBudget = getEndlessSwapBudget(activeConfig.size, endlessStreak);
  const endlessThreeStarMoveLimit = getEndlessThreeStarMoveLimit(endlessSwapBudget);
  const bestSolveTime = getBestSolveTime(currentBest, activeConfig.time);
  const bestTimeDisplay = bestSolveTime === undefined ? "-" : formatTime(bestSolveTime);
  const solveTime = timeLeft;
  const accuracy = getAccuracyScore(activeConfig.size, moves);
  const gradientQuality = getGradientQuality(completion);
  const allowHoverWhenLocked = false;

  const {
    clearWinSequenceTimeouts,
    confettiActive,
    resetWinSequence,
    setWinPhase,
    winModalVisible,
    winWaveActive,
  } = useWinSequence({
    boardLength: board.length,
    setPersonalBestStatus,
  });

  const {
    clearDragSession,
    clearPendingSwapAnimation,
    dragSession,
    draggedIndex,
    getTileRef,
    handlePointerDown,
    pressedTileIndex,
    setDragOverlayRef,
    updateBoard,
  } = useBoardDrag({
    board,
    loseState,
    setBoard,
    setMoves,
    winState,
  });

  const {
    boardAreaWidth,
    contentRef,
    controlsRef,
    headerRef,
    hudRef,
    pageShellRef,
    restartRef,
  } = useBoardSize({
    activeConfigSize: activeConfig.size,
    activeConfigTime: activeConfig.time,
    activeView,
    boardLength: board.length,
    boardResetKey,
    completion,
    difficulty,
    loseState,
    moves,
    timeLeft,
    winState,
  });

  useEffect(() => {
    clearDragSessionRef.current = clearDragSession;
    resetWinSequenceRef.current = resetWinSequence;
  }, [clearDragSession, resetWinSequence]);

  useEffect(() => {
    if (activeView !== "game" || hudFeedbackKey === 0) {
      return;
    }

    void hudFeedbackControls.start(HUD_FEEDBACK_ANIMATION);
  }, [activeView, hudFeedbackControls, hudFeedbackKey]);

  const startGame = useCallback((config: DifficultyConfig) => {
    const corners = generateCornerColors(config.size);
    const nextSolvedBoard = generateSolvedBoard(config.size, corners);
    const nextBoard = scrambleBoard(nextSolvedBoard);

    clearDragSession();
    resetWinSequence();
    setBoardResetKey((currentKey) => currentKey + 1);
    clearPendingSwapAnimation();
    updateBoard(nextBoard);
    setMoves(0);
    setTimeLeft(0);
    setCompletion(checkCompletion(nextBoard));
    setWinState(false);
    setLoseState(false);
    setEndlessLastClear(null);
    setTimerStarted(true);
  }, [clearDragSession, clearPendingSwapAnimation, resetWinSequence, updateBoard]);

  useEffect(() => {
    if (difficulty === "endless") {
      return;
    }

    startGame(activeConfig);
  }, [difficulty, startGame]);

  useEffect(() => {
    if (!board.length || winState || loseState) {
      return;
    }

    const nextCompletion = checkCompletion(board);
    setCompletion(nextCompletion);

    if (nextCompletion === 100) {
      const finalSolveTime = timeLeft;

      if (isEndlessMode) {
        const completedPuzzleNumber = endlessPuzzleNumber;
        const completedSwapBudget = endlessSwapBudget;
        const completedThreeStarMoveLimit = endlessThreeStarMoveLimit;
        const isThreeStar = moves <= completedThreeStarMoveLimit;
        const nextStreak = endlessStreak + 1;

        setEndlessLastClear({
          isThreeStar,
          puzzleNumber: completedPuzzleNumber,
          swapBudget: completedSwapBudget,
          threeStarMoveLimit: completedThreeStarMoveLimit,
        });
        setEndlessStreak(nextStreak);
        setEndlessStats((currentStats) => ({
          clears: currentStats.clears + 1,
          threeStarClears: currentStats.threeStarClears + (isThreeStar ? 1 : 0),
          bestStreak: Math.max(currentStats.bestStreak, nextStreak),
        }));
        setWinState(true);
        setWinPhase("boardWave");
        clearDragSession();
        return;
      }

      const currentBestWithSolveTime = {
        ...currentBest,
        bestSolveTime: getBestSolveTime(currentBest, activeConfig.time),
      };

      setPersonalBestStatus(
        getPersonalBestStatus(currentBestWithSolveTime, {
          moves,
          solveTime: finalSolveTime,
        }),
      );
      setWinState(true);
      setWinPhase("boardWave");
      clearDragSession();

      setBestStats((current) => {
        const currentRecord = current[difficulty] ?? {};
        const currentBestSolveTime = getBestSolveTime(currentRecord, activeConfig.time);
        const nextRecord = {
          bestCompletion: Math.max(currentRecord.bestCompletion ?? 0, 100),
          bestSolveTime:
            currentBestSolveTime === undefined
              ? finalSolveTime
              : Math.min(currentBestSolveTime, finalSolveTime),
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
  }, [activeConfig.time, board, clearDragSession, currentBest, difficulty, endlessPuzzleNumber, endlessStreak, endlessSwapBudget, endlessThreeStarMoveLimit, isEndlessMode, loseState, moves, setBestStats, setEndlessStats, setWinPhase, timeLeft, winState]);

  useEffect(() => {
    if (!isEndlessMode || !board.length || winState || loseState || moves <= endlessSwapBudget || checkCompletion(board) === 100) {
      return;
    }

    setEndlessPuzzleNumber(1);
    setEndlessStreak(0);
    resetWinSequenceRef.current();
    setLoseState(false);
    timeUpSound.play();
    clearDragSessionRef.current();
    startGame(getEndlessConfig(1));
  }, [board, endlessSwapBudget, isEndlessMode, loseState, moves, startGame, winState]);

  useEffect(() => {
    if (activeView !== "game" || !board.length || winState || loseState || endlessModalOpen || !timerStarted) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimeLeft((current) => {
        return Math.round((current + 0.1) * 10) / 10;
      });
    }, 100);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeView, board.length, endlessModalOpen, loseState, timerStarted, winState]);

  useEffect(() => {
    if (!modeModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModeModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [modeModalOpen]);

  useEffect(() => {
    return () => {
      clearWinSequenceTimeouts();
    };
  }, [clearWinSequenceTimeouts]);

  const handleDifficultyChange = (nextDifficulty: DifficultyKey) => {
    if (nextDifficulty === "endless") {
      clearDragSession();
      resetWinSequence();
      setEndlessModalOpen(true);
      setTimerStarted(false);
      return;
    }

    setEndlessModalOpen(false);
    clearDragSession();
    resetWinSequence();
    setDifficulty(nextDifficulty);
  };

  const handleEndlessStart = () => {
    setDifficulty("endless");
    setEndlessPuzzleNumber(1);
    setEndlessStreak(0);
    setEndlessModalOpen(false);
    startGame(getEndlessConfig(1));
  };

  const handleEndlessClose = () => {
    setEndlessModalOpen(false);
    setTimerStarted(true);
    clearDragSession();
    resetWinSequence();
  };

  const handleEndlessReplay = () => {
    startGame(activeConfig);
  };

  const handleEndlessNextPuzzle = () => {
    const nextPuzzleNumber = endlessPuzzleNumber + 1;

    setEndlessPuzzleNumber(nextPuzzleNumber);
    startGame(getEndlessConfig(nextPuzzleNumber));
  };

  const handleEndlessBack = () => {
    resetWinSequence();
    setEndlessModalOpen(true);
    setTimerStarted(false);
  };

  const handleAutoSolve = useCallback(() => {
    clearDragSession();
    resetWinSequence();
    clearPendingSwapAnimation();
    updateBoard((currentBoard) =>
      [...currentBoard]
        .sort((firstTile, secondTile) => firstTile.correctIndex - secondTile.correctIndex)
        .map((tile, index) => ({ ...tile, currentIndex: index })),
    );
  }, [clearDragSession, clearPendingSwapAnimation, resetWinSequence, updateBoard]);

  const handleNavigateView = useCallback((nextView: AppView) => {
    if (nextView !== "game") {
      clearDragSession();
      setEndlessModalOpen(false);
      setModeModalOpen(false);
      setShopModalOpen(false);
      setLeaderboardModalOpen(false);
      setTimerStarted(true);
    }

    setActiveView(nextView);
  }, [clearDragSession]);

  const handleLogoClick = useCallback(() => {
    setHudFeedbackKey((currentKey) => currentKey + 1);
    handleNavigateView("game");
  }, [handleNavigateView]);

  const hudFeedbackMotion = {
    animate: hudFeedbackControls,
    initial: false,
  };

  return (
    <main className={`theme-page-bg min-h-dvh overflow-x-hidden px-[clamp(0.5rem,2vw,1.25rem)] py-0 ${activeView === "game" || activeView === "tutorial" ? "overflow-y-hidden" : "overflow-y-auto"}`}>
      <div ref={pageShellRef} className="mx-auto flex min-h-[100dvh] w-full max-w-[72rem] flex-col gap-[clamp(0.35rem,0.9vw,0.7rem)]">
        <Header ref={headerRef} onLogoClick={handleLogoClick} onNavigateView={handleNavigateView} />

        {activeView === "game" ? (
        <section ref={contentRef} className="relative flex flex-1 min-h-0 flex-col items-center justify-center gap-[clamp(0.25rem,0.65vw,0.5rem)] pb-[clamp(0.1rem,0.35vh,0.25rem)]">
          <div className="fixed left-[clamp(0.75rem,3vw,2rem)] top-1/2 z-10 -translate-y-1/2">
            <motion.div {...hudFeedbackMotion} className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setModeModalOpen(true)}
                aria-label="Open modes"
                className="side-action-button theme-card inline-flex aspect-square w-[clamp(4rem,6vw,5rem)] items-center justify-center rounded-[1.15rem] border px-2 text-center shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
              >
                <VscStarFull className="theme-text-primary text-[clamp(1.5rem,2.5vw,1.9rem)] leading-none" />
              </button>

              <button
                type="button"
                onClick={() => setShopModalOpen(true)}
                aria-label="Open shop"
                className="side-action-button theme-card inline-flex aspect-square w-[clamp(4rem,6vw,5rem)] items-center justify-center rounded-[1.15rem] border px-2 text-center shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
              >
                <FaShoppingCart className="theme-text-primary text-[clamp(1.5rem,2.5vw,1.9rem)] leading-none" />
              </button>

              <button
                type="button"
                onClick={() => setLeaderboardModalOpen(true)}
                aria-label="Open leaderboard"
                className="side-action-button theme-card inline-flex aspect-square w-[clamp(4rem,6vw,5rem)] items-center justify-center rounded-[1.15rem] border px-2 text-center shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
              >
                <IoMdTrophy className="theme-text-primary text-[clamp(1.5rem,2.5vw,1.9rem)] leading-none" />
              </button>
            </motion.div>
          </div>

          <motion.div
            {...hudFeedbackMotion}
            ref={hudRef}
            className="w-full max-w-full"
            style={{ width: boardAreaWidth }}
          >
            <GameHud
              bestMoves={currentBest?.fewestMoves ?? null}
              bestTimeDisplay={bestTimeDisplay}
              endlessInfo={isEndlessMode ? {
                puzzleNumber: endlessPuzzleNumber,
                swapBudget: endlessSwapBudget,
              } : undefined}
              gradientQuality={gradientQuality}
              moves={moves}
              timeDisplay={formatTime(timeLeft)}
              timeWarning={false}
            />
          </motion.div>

          <motion.div
            {...hudFeedbackMotion}
            className="flex w-full max-w-full justify-center"
            style={{ width: boardAreaWidth }}
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
          </motion.div>

          <motion.div
            {...hudFeedbackMotion}
            ref={controlsRef}
            className="w-full max-w-full"
            style={{ width: boardAreaWidth }}
          >
            <GameControls
              showDevControls={process.env.NODE_ENV !== "production"}
              onAutoSolve={handleAutoSolve}
            />
          </motion.div>

          <motion.div
            {...hudFeedbackMotion}
            ref={restartRef}
            className="relative z-10 flex w-full justify-center"
            style={{ width: boardAreaWidth }}
          >
            <button
              type="button"
              onClick={() => startGame(activeConfig)}
              aria-label="Restart game"
              className="theme-button-primary restart-button font-fredoka-strong flex h-14 w-full max-w-[20rem] items-center justify-center gap-2 rounded-full px-7 py-3 text-base shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
            >
              <span aria-hidden="true" className="text-[clamp(0.95rem,1.5vw,1.1rem)] leading-none">
                {"\u21BB"}
              </span>
              <span>Restart</span>
            </button>
          </motion.div>
        </section>
        ) : (
          <section className="relative flex min-h-0 flex-1 flex-col items-stretch justify-start py-6">
            {activeView === "about" && <AboutView onPlay={() => handleNavigateView("game")} />}
            {activeView === "privacy" && <PrivacyView />}
            {activeView === "tutorial" && <TutorialGuide onPlay={() => handleNavigateView("game")} />}
          </section>
        )}
      </div>

      {activeView === "game" && (
        <>
          <GameModal
            activeConfig={activeConfig}
            accuracy={accuracy}
            completion={completion}
            endlessResult={
              isEndlessMode && endlessLastClear
                ? {
                    ...endlessLastClear,
                    onBack: handleEndlessBack,
                    onNextPuzzle: handleEndlessNextPuzzle,
                    onReplay: handleEndlessReplay,
                  }
                : undefined
            }
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
          <EndlessStartModal
            currentStreak={endlessStreak}
            endlessStats={endlessStats}
            isOpen={endlessModalOpen}
            onClose={handleEndlessClose}
            onStart={handleEndlessStart}
          />
          <ShopComingSoonModal
            isOpen={shopModalOpen}
            onClose={() => setShopModalOpen(false)}
          />
          <LeaderboardModal
            isOpen={leaderboardModalOpen}
            onClose={() => setLeaderboardModalOpen(false)}
          />
        </>
      )}
    </main>
  );
}
