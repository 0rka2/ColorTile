"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { FaShoppingCart } from "react-icons/fa";
import { IoMdTrophy } from "react-icons/io";
import { TbTargetArrow } from "react-icons/tb";
import { VscStarFull } from "react-icons/vsc";

import { GradientText } from "../components/ui/gradient-text";
import { GameBoard } from "./game/components/game-board";
import { CompactLeaderboardPanel } from "./game/components/compact-leaderboard-panel";
import { GameControls } from "./game/components/game-controls";
import { GameHud } from "./game/components/game-hud";
import { DailyPuzzleModal } from "./game/components/modals/daily-puzzle-modal";
import { GameModal } from "./game/components/modals/game-modal";
import { GameModeModal } from "./game/components/modals/game-mode-modal";
import { LeaderboardModal } from "./game/components/modals/leaderboard-modal";
import { ShopComingSoonModal } from "./game/components/modals/shop-coming-soon-modal";
import { WinConfetti } from "./game/components/win-confetti";
import { Header } from "./game/components/header";
import { useBoardDrag } from "./game/hooks/use-board-drag";
import { useBoardSize } from "./game/hooks/use-board-size";
import { usePersistentDailyPuzzle } from "./game/hooks/use-persistent-daily-puzzle";
import { usePersistentEndlessStats } from "./game/hooks/use-persistent-endless-stats";
import { usePersistentBestStats } from "./game/hooks/use-persistent-best-stats";
import { useWinSequence } from "./game/hooks/use-win-sequence";
import { LEADERBOARD_REFRESH_EVENT, type LeaderboardDifficulty } from "./game/leaderboard";
import {
  checkCompletion,
  createSeededRandom,
  formatTime,
  generateCornerColors,
  generateSolvedBoard,
  getBoardDensityClass,
  getDailyPuzzleConfig,
  getDailyPuzzleDateKey,
  getDailyPuzzleStyle,
  getEndlessCountdownDuration,
  getEndlessConfig,
  getEndlessPuzzleSwapBudget,
  getEndlessPuzzleType,
  getEndlessPuzzleTypeLabel,
  getEndlessSwapBudget,
  getEndlessThreeStarMoveLimit,
  getEndlessTypeStyle,
  getGameModeConfig,
  getTileRadiusClass,
  endlessTypeUsesCountdown,
  endlessTypeUsesSwapLimit,
  isBlackAndWhiteMode,
  isTileCorrect,
  isTileLocked,
  scrambleBoard,
} from "./game/game-logic";
import type { BestStats, DifficultyConfig, DifficultyKey, EndlessPuzzleType, ModeStyle, Tile } from "./game/game-types";
import { getGradientQuality } from "./game/gradient-quality";
import { countdownSound, timeUpSound } from "./lib/sounds";
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

const INTRO_COMPLETED_STORAGE_KEY = "colortile-intro-completed";
const LEADERBOARD_PLAYER_NAME_STORAGE_KEY = "colortile-leaderboard-player-name";
const PLAYER_NAME_MAX_LENGTH = 24;
const INTRO_WELCOME_DURATION_MS = 1400;
const BLACK_AND_WHITE_PREVIEW_DURATION_MS = 3000;

type IntroStep = "welcome" | "name";

function generateGuestPlayerName() {
  return `guest${Math.floor(100 + Math.random() * 900)}`;
}

function sanitizePlayerName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, PLAYER_NAME_MAX_LENGTH);
}

function getLeaderboardPlayerName() {
  if (typeof window === "undefined") {
    return "guest000";
  }

  const storedName = window.localStorage.getItem(LEADERBOARD_PLAYER_NAME_STORAGE_KEY);
  const sanitizedStoredName = storedName ? sanitizePlayerName(storedName) : "";

  if (sanitizedStoredName) {
    return sanitizedStoredName;
  }

  const fallbackName = generateGuestPlayerName();
  window.localStorage.setItem(LEADERBOARD_PLAYER_NAME_STORAGE_KEY, fallbackName);
  return fallbackName;
}

function notifyLeaderboardRefresh() {
  window.dispatchEvent(new Event(LEADERBOARD_REFRESH_EVENT));
}

async function submitLeaderboardScore(entry: {
  difficulty: LeaderboardDifficulty;
  moves: number;
  solveTime: number;
}) {
  const response = await fetch("/api/leaderboard", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...entry,
      playerName: getLeaderboardPlayerName(),
    }),
  });

  if (response.ok) {
    notifyLeaderboardRefresh();
  }
}

async function submitDailyLeaderboardScore(entry: {
  dateKey: string;
  moves: number;
  solveTime: number;
  style: ModeStyle;
}) {
  const response = await fetch("/api/leaderboard", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      category: "daily",
      dateKey: entry.dateKey,
      moves: entry.moves,
      playerName: getLeaderboardPlayerName(),
      solveTime: entry.solveTime,
      style: entry.style,
    }),
  });

  if (response.ok) {
    notifyLeaderboardRefresh();
  }
}

async function submitEndlessStreak(entry: {
  streakCount: number;
}) {
  const response = await fetch("/api/leaderboard", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      category: "streaks",
      difficulty: "endless",
      playerName: getLeaderboardPlayerName(),
      streakCount: entry.streakCount,
    }),
  });

  if (response.ok) {
    notifyLeaderboardRefresh();
  }
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

type IntroOnboardingProps = {
  introStep: IntroStep;
  nameError: string | null;
  onNameChange: (value: string) => void;
  onPlay: () => void;
  playerNameInput: string;
};

function IntroOnboarding({
  introStep,
  nameError,
  onNameChange,
  onPlay,
  playerNameInput,
}: Readonly<IntroOnboardingProps>) {
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (introStep !== "name") {
      return;
    }

    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, [introStep]);

  return (
    <div className="theme-page-bg fixed inset-0 z-[80] flex items-center justify-center px-6 py-10">
      <AnimatePresence mode="wait">
        {introStep === "welcome" ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -26 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[calc(100vw-2rem)] text-center"
          >
            <GradientText
              as="h1"
              className="gradient-text--intro whitespace-nowrap py-2 font-fredoka-display text-[2.35rem] leading-none tracking-[-0.05em] sm:text-[3.25rem]"
              showBlend={false}
            >
              welcome to ColorTile
            </GradientText>
          </motion.div>
        ) : (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -22 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full max-w-[22rem] flex-col items-center text-center"
          >
            <GradientText
              as="h2"
              className="gradient-text--intro py-2 font-fredoka-display text-[4.2rem] leading-none tracking-[-0.05em] sm:text-[5.4rem]"
              showBlend={false}
            >
              ColorTile
            </GradientText>

            <form
              className="mt-8 flex w-full flex-col items-center"
              onSubmit={(event) => {
                event.preventDefault();
                onPlay();
              }}
            >
              <label className="w-full" htmlFor="player-name">
                <input
                  id="player-name"
                  ref={nameInputRef}
                  type="text"
                  value={playerNameInput}
                  onChange={(event) => onNameChange(event.target.value)}
                  maxLength={PLAYER_NAME_MAX_LENGTH}
                  className="theme-input theme-text-primary h-14 w-full rounded-full border px-5 text-center font-fredoka-strong text-lg uppercase outline-none focus:border-slate-400"
                  autoComplete="nickname"
                  spellCheck={false}
                />
              </label>

              <p className={`mt-3 min-h-5 text-sm leading-5 ${nameError ? "theme-text-danger" : "theme-text-muted"}`}>
                {nameError ?? ""}
              </p>

              <button
                type="submit"
                className="theme-button-primary font-fredoka-strong mt-4 inline-flex h-12 min-w-[9rem] items-center justify-center rounded-full px-8 text-base shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
              >
                Play
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  const [difficulty, setDifficulty] = useState<DifficultyKey>("normal");
  const [board, setBoard] = useState<Tile[]>([]);
  const [boardVisualMode, setBoardVisualMode] = useState<"color" | "grayscale">("color");
  const [previewActive, setPreviewActive] = useState(false);
  const [previewCountdown, setPreviewCountdown] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [completion, setCompletion] = useState(0);
  const [winState, setWinState] = useState(false);
  const [loseState, setLoseState] = useState(false);
  const [isDailyMode, setIsDailyMode] = useState(true);
  const [dailyModalOpen, setDailyModalOpen] = useState(false);
  const [dailyAttemptFailed, setDailyAttemptFailed] = useState(false);
  const [dailyDateKey, setDailyDateKey] = useState(() => getDailyPuzzleDateKey());
  const [endlessPuzzleNumber, setEndlessPuzzleNumber] = useState(1);
  const [endlessPuzzleStyle, setEndlessPuzzleStyle] = useState<ModeStyle>("color");
  const [endlessPuzzleType, setEndlessPuzzleType] = useState<EndlessPuzzleType>("classic");
  const [endlessStreak, setEndlessStreak] = useState(0);
  const [endlessLastClear, setEndlessLastClear] = useState<{
    isThreeStar: boolean;
    puzzleNumber: number;
    swapBudget: number | null;
    threeStarMoveLimit: number;
    usesSwapLimit: boolean;
  } | null>(null);
  const [modeModalOpen, setModeModalOpen] = useState(false);
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [timerStarted, setTimerStarted] = useState(true);
  const [personalBestStatus, setPersonalBestStatus] = useState<PersonalBestStatus>(EMPTY_PERSONAL_BEST_STATUS);
  const [boardResetKey, setBoardResetKey] = useState(0);
  const [activeView, setActiveView] = useState<AppView>("game");
  const [hudFeedbackKey, setHudFeedbackKey] = useState(0);
  const [introStep, setIntroStep] = useState<IntroStep>("welcome");
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isOnboardingReady, setIsOnboardingReady] = useState(false);
  const [playerNameInput, setPlayerNameInput] = useState("");
  const [playerNameError, setPlayerNameError] = useState<string | null>(null);
  const hudFeedbackControls = useAnimationControls();
  const clearDragSessionRef = useRef<() => void>(() => {});
  const resetWinSequenceRef = useRef<() => void>(() => {});
  const blackAndWhitePreviewTimeoutRef = useRef<number | null>(null);
  const blackAndWhitePreviewIntervalRef = useRef<number | null>(null);

  const { bestStats, setBestStats } = usePersistentBestStats();
  const { dailyRecord, setDailyRecord } = usePersistentDailyPuzzle();
  const { endlessStats, setEndlessStats } = usePersistentEndlessStats();

  const dailyConfig = getDailyPuzzleConfig();
  const dailyPuzzleStyle = getDailyPuzzleStyle(createSeededRandom(`${dailyDateKey}:style`)());
  const dailyPuzzleStyleLabel = dailyPuzzleStyle === "black-and-white" ? "B&W" : "Classic";
  const dailySwapBudget = getEndlessSwapBudget(dailyConfig.size, 0);
  const dailyRecordForToday = dailyRecord?.dateKey === dailyDateKey ? dailyRecord : null;
  const activeConfig =
    isDailyMode
      ? dailyConfig
      : difficulty === "endless"
      ? getEndlessConfig(endlessPuzzleNumber)
      : getGameModeConfig(difficulty);

  const tileRadiusClass = getTileRadiusClass(activeConfig.size);
  const boardDensityClass = getBoardDensityClass(activeConfig.size);
  const currentBest = bestStats[difficulty];
  const isEndlessMode = !isDailyMode && difficulty === "endless";
  const isBlackAndWhiteRun = isDailyMode
    ? dailyPuzzleStyle === "black-and-white"
    : isBlackAndWhiteMode(difficulty) ||
      (isEndlessMode && endlessPuzzleStyle === "black-and-white");
  const endlessPuzzleStyleLabel = getEndlessPuzzleTypeLabel(endlessPuzzleType);
  const endlessUsesCountdown = isEndlessMode && endlessTypeUsesCountdown(endlessPuzzleType);
  const endlessUsesSwapLimit = isEndlessMode && endlessTypeUsesSwapLimit(endlessPuzzleType);
  const endlessCountdownDuration = getEndlessCountdownDuration(activeConfig.size);
  const endlessSwapBudget = getEndlessPuzzleSwapBudget(activeConfig.size, endlessStreak, endlessPuzzleType);
  const endlessThreeStarMoveLimit = getEndlessThreeStarMoveLimit(endlessSwapBudget);
  const bestSolveTime = getBestSolveTime(currentBest, activeConfig.time);
  const bestTimeDisplay = bestSolveTime === undefined ? "-" : formatTime(bestSolveTime);
  const solveTime = endlessUsesCountdown ? endlessCountdownDuration - timeLeft : timeLeft;
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
    if (typeof window === "undefined") {
      return;
    }

    const storedIntroCompleted =
      window.localStorage.getItem(INTRO_COMPLETED_STORAGE_KEY) === "true";
    const storedPlayerName = window.localStorage.getItem(LEADERBOARD_PLAYER_NAME_STORAGE_KEY);
    const nextPlayerName = sanitizePlayerName(storedPlayerName ?? "") || generateGuestPlayerName();

    setPlayerNameInput(nextPlayerName);
    setIsOnboardingComplete(storedIntroCompleted);
    setIntroStep(storedIntroCompleted ? "name" : "welcome");
    setIsOnboardingReady(true);
  }, []);

  useEffect(() => {
    if (!isOnboardingReady || isOnboardingComplete) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIntroStep("name");
    }, INTRO_WELCOME_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOnboardingComplete, isOnboardingReady]);

  useEffect(() => {
    if (!isOnboardingReady || isOnboardingComplete) {
      return;
    }

    setTimerStarted(false);
  }, [isOnboardingComplete, isOnboardingReady]);

  useEffect(() => {
    if (activeView !== "game" || hudFeedbackKey === 0) {
      return;
    }

    void hudFeedbackControls.start(HUD_FEEDBACK_ANIMATION);
  }, [activeView, hudFeedbackControls, hudFeedbackKey]);

  useEffect(() => {
    if (previewCountdown === null) {
      return;
    }

    countdownSound.play();
  }, [previewCountdown]);

  const clearBlackAndWhitePreview = useCallback(() => {
    if (blackAndWhitePreviewTimeoutRef.current !== null) {
      window.clearTimeout(blackAndWhitePreviewTimeoutRef.current);
      blackAndWhitePreviewTimeoutRef.current = null;
    }

    if (blackAndWhitePreviewIntervalRef.current !== null) {
      window.clearInterval(blackAndWhitePreviewIntervalRef.current);
      blackAndWhitePreviewIntervalRef.current = null;
    }

    setPreviewCountdown(null);
  }, []);

  const startGame = useCallback((config: DifficultyConfig, useBlackAndWhitePreview: boolean, random = Math.random, initialTime = 0) => {
    const corners = generateCornerColors(config.size, random);
    const nextSolvedBoard = generateSolvedBoard(config.size, corners);
    const nextBoard = scrambleBoard(nextSolvedBoard, random);

    clearBlackAndWhitePreview();
    clearDragSession();
    resetWinSequence();
    setBoardResetKey((currentKey) => currentKey + 1);
    clearPendingSwapAnimation();
    updateBoard(nextBoard);
    setMoves(0);
    setTimeLeft(initialTime);
    setCompletion(checkCompletion(nextBoard));
    setWinState(false);
    setLoseState(false);
    setEndlessLastClear(null);
    setBoardVisualMode("color");

    if (useBlackAndWhitePreview) {
      setPreviewActive(true);
      setPreviewCountdown(3);
      setTimerStarted(false);
      blackAndWhitePreviewIntervalRef.current = window.setInterval(() => {
        setPreviewCountdown((currentCountdown) =>
          currentCountdown === null ? null : Math.max(1, currentCountdown - 1),
        );
      }, 1000);
      blackAndWhitePreviewTimeoutRef.current = window.setTimeout(() => {
        if (blackAndWhitePreviewIntervalRef.current !== null) {
          window.clearInterval(blackAndWhitePreviewIntervalRef.current);
          blackAndWhitePreviewIntervalRef.current = null;
        }

        setBoardVisualMode("grayscale");
        setPreviewActive(false);
        setPreviewCountdown(null);
        setTimerStarted(true);
        blackAndWhitePreviewTimeoutRef.current = null;
      }, BLACK_AND_WHITE_PREVIEW_DURATION_MS);
      return;
    }

    setPreviewActive(false);
    setTimerStarted(true);
  }, [clearBlackAndWhitePreview, clearDragSession, clearPendingSwapAnimation, resetWinSequence, updateBoard]);

  useEffect(() => {
    if (isDailyMode || difficulty === "endless") {
      return;
    }

    startGame(getGameModeConfig(difficulty), isBlackAndWhiteMode(difficulty));
  }, [difficulty, isDailyMode, startGame]);

  const startEndlessPuzzle = useCallback((puzzleNumber: number) => {
    const nextConfig = getEndlessConfig(puzzleNumber);
    const nextType = getEndlessPuzzleType(nextConfig.size);
    const nextStyle = getEndlessTypeStyle(nextType);
    const initialTime = endlessTypeUsesCountdown(nextType)
      ? getEndlessCountdownDuration(nextConfig.size)
      : 0;

    setEndlessPuzzleNumber(puzzleNumber);
    setEndlessPuzzleType(nextType);
    setEndlessPuzzleStyle(nextStyle);
    startGame(nextConfig, nextStyle === "black-and-white", Math.random, initialTime);
  }, [startGame]);

  useEffect(() => {
    if (!board.length || winState || loseState) {
      return;
    }

    const nextCompletion = checkCompletion(board);
    setCompletion(nextCompletion);

    if (nextCompletion === 100) {
      const finalSolveTime = solveTime;

      if (isDailyMode) {
        setDailyRecord((currentRecord) => {
          const isSameDay = currentRecord?.dateKey === dailyDateKey;
          return {
            bestSolveTime:
              isSameDay && currentRecord.bestSolveTime !== undefined
                ? Math.min(currentRecord.bestSolveTime, finalSolveTime)
                : finalSolveTime,
            completed: true,
            dateKey: dailyDateKey,
            fewestMoves:
              isSameDay && currentRecord.fewestMoves !== undefined
                ? Math.min(currentRecord.fewestMoves, moves)
                : moves,
            style: dailyPuzzleStyle,
          };
        });
        setWinState(true);
        setWinPhase("boardWave");
        clearDragSession();

        void submitDailyLeaderboardScore({
          dateKey: dailyDateKey,
          moves,
          solveTime: finalSolveTime,
          style: dailyPuzzleStyle,
        }).catch(() => {
          // Ignore leaderboard submission failures so local progress still works.
        });

        return;
      }

      if (isEndlessMode) {
        const completedPuzzleNumber = endlessPuzzleNumber;
        const completedSwapBudget = endlessUsesSwapLimit ? endlessSwapBudget : null;
        const completedThreeStarMoveLimit = endlessThreeStarMoveLimit;
        const isThreeStar = moves <= completedThreeStarMoveLimit;
        const nextStreak = endlessStreak + 1;
        const shouldSubmitEndlessStreak = nextStreak > endlessStats.bestStreak;

        setEndlessLastClear({
          isThreeStar,
          puzzleNumber: completedPuzzleNumber,
          swapBudget: completedSwapBudget,
          threeStarMoveLimit: completedThreeStarMoveLimit,
          usesSwapLimit: endlessUsesSwapLimit,
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

        if (shouldSubmitEndlessStreak) {
          void submitEndlessStreak({
            streakCount: nextStreak,
          }).catch(() => {
            // Ignore leaderboard submission failures so local progress still works.
          });
        }

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

      void submitLeaderboardScore({
        difficulty,
        moves,
        solveTime: finalSolveTime,
      }).catch(() => {
        // Ignore leaderboard submission failures so local progress still works.
      });

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
  }, [activeConfig.time, board, clearDragSession, currentBest, dailyDateKey, dailyPuzzleStyle, difficulty, endlessPuzzleNumber, endlessStats.bestStreak, endlessStreak, endlessSwapBudget, endlessThreeStarMoveLimit, endlessUsesSwapLimit, isDailyMode, isEndlessMode, loseState, moves, setBestStats, setDailyRecord, setEndlessStats, setWinPhase, solveTime, winState]);

  useEffect(() => {
    if (!isEndlessMode || !endlessUsesSwapLimit || !board.length || winState || loseState || moves <= endlessSwapBudget || checkCompletion(board) === 100) {
      return;
    }

    setEndlessStreak(0);
    resetWinSequenceRef.current();
    setLoseState(false);
    timeUpSound.play();
    clearDragSessionRef.current();
    startEndlessPuzzle(1);
  }, [board, endlessSwapBudget, endlessUsesSwapLimit, isEndlessMode, loseState, moves, startEndlessPuzzle, winState]);

  useEffect(() => {
    if (!isDailyMode || !board.length || winState || loseState || moves <= dailySwapBudget || checkCompletion(board) === 100) {
      return;
    }

    resetWinSequenceRef.current();
    setLoseState(false);
    setDailyModalOpen(true);
    setDailyAttemptFailed(true);
    setTimerStarted(false);
    timeUpSound.play();
    clearDragSessionRef.current();
  }, [board, dailySwapBudget, isDailyMode, loseState, moves, winState]);

  useEffect(() => {
    if (
      !isEndlessMode ||
      !endlessUsesCountdown ||
      !board.length ||
      winState ||
      loseState ||
      timeLeft > 0 ||
      (endlessUsesSwapLimit && moves > endlessSwapBudget) ||
      checkCompletion(board) === 100
    ) {
      return;
    }

    setEndlessStreak(0);
    resetWinSequenceRef.current();
    setLoseState(false);
    timeUpSound.play();
    clearDragSessionRef.current();
    startEndlessPuzzle(1);
  }, [board, endlessSwapBudget, endlessUsesCountdown, endlessUsesSwapLimit, isEndlessMode, loseState, moves, startEndlessPuzzle, timeLeft, winState]);

  useEffect(() => {
    if (activeView !== "game" || !board.length || winState || loseState || !timerStarted) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimeLeft((current) => {
        if (endlessUsesCountdown) {
          return Math.max(0, Math.round((current - 0.1) * 10) / 10);
        }

        return Math.round((current + 0.1) * 10) / 10;
      });
    }, 100);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeView, board.length, endlessUsesCountdown, loseState, timerStarted, winState]);

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
      clearBlackAndWhitePreview();
      clearWinSequenceTimeouts();
    };
  }, [clearBlackAndWhitePreview, clearWinSequenceTimeouts]);

  const handleDifficultyChange = (nextDifficulty: DifficultyKey) => {
    clearBlackAndWhitePreview();
    setIsDailyMode(false);
    setDailyModalOpen(false);
    setDailyAttemptFailed(false);
    setDailyAttemptFailed(false);
    setPreviewActive(false);
    setBoardVisualMode(isBlackAndWhiteMode(nextDifficulty) ? "grayscale" : "color");

    if (nextDifficulty === "endless") {
      return;
    }

    clearDragSession();
    resetWinSequence();

    if (nextDifficulty === difficulty) {
      startGame(getGameModeConfig(nextDifficulty), isBlackAndWhiteMode(nextDifficulty));
      return;
    }

    setDifficulty(nextDifficulty);
  };

  const handleEndlessStart = () => {
    clearBlackAndWhitePreview();
    setIsDailyMode(false);
    setDailyModalOpen(false);
    setDailyAttemptFailed(false);
    setPreviewActive(false);
    setBoardVisualMode("color");
    setDifficulty("endless");
    setEndlessStreak(0);
    startEndlessPuzzle(1);
  };

  const startDailyPuzzle = useCallback((dateKey: string) => {
    const nextStyle = getDailyPuzzleStyle(createSeededRandom(`${dateKey}:style`)());
    const boardRandom = createSeededRandom(`${dateKey}:board`);

    clearBlackAndWhitePreview();
    setDailyDateKey(dateKey);
    setDailyModalOpen(false);
    setIsDailyMode(true);
    setPreviewActive(false);
    setBoardVisualMode("color");
    startGame(getDailyPuzzleConfig(), nextStyle === "black-and-white", boardRandom);
  }, [clearBlackAndWhitePreview, startGame]);

  useEffect(() => {
    if (!isOnboardingComplete || activeView !== "game" || !isDailyMode || board.length > 0) {
      return;
    }

    startDailyPuzzle(dailyDateKey);
  }, [activeView, board.length, dailyDateKey, isDailyMode, isOnboardingComplete, startDailyPuzzle]);

  const handleDailyOpen = () => {
    setDailyDateKey(getDailyPuzzleDateKey());
    setModeModalOpen(false);
    setShopModalOpen(false);
    setLeaderboardModalOpen(false);
    setDailyModalOpen(true);
  };

  const handleDailyStart = () => {
    startDailyPuzzle(dailyDateKey);
  };

  const handleDailyReplay = () => {
    startDailyPuzzle(dailyDateKey);
  };

  const handleDailyModes = () => {
    resetWinSequence();
    setModeModalOpen(true);
    setTimerStarted(false);
  };

  const handleRestartGame = () => {
    if (isDailyMode) {
      handleDailyReplay();
      return;
    }

    startGame(
      activeConfig,
      isBlackAndWhiteRun,
      Math.random,
      endlessUsesCountdown ? getEndlessCountdownDuration(activeConfig.size) : 0,
    );
  };

  const handleEndlessReplay = () => {
    startGame(
      activeConfig,
      endlessPuzzleStyle === "black-and-white",
      Math.random,
      endlessUsesCountdown ? getEndlessCountdownDuration(activeConfig.size) : 0,
    );
  };

  const handleEndlessNextPuzzle = () => {
    const nextPuzzleNumber = endlessPuzzleNumber + 1;
    startEndlessPuzzle(nextPuzzleNumber);
  };

  const handleEndlessBack = () => {
    resetWinSequence();
    setModeModalOpen(true);
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
      clearBlackAndWhitePreview();
      setPreviewActive(false);
      clearDragSession();
      setModeModalOpen(false);
      setShopModalOpen(false);
      setLeaderboardModalOpen(false);
      setDailyModalOpen(false);
      setTimerStarted(true);
    }

    setActiveView(nextView);
  }, [clearBlackAndWhitePreview, clearDragSession, previewActive]);

  const handleLogoClick = useCallback(() => {
    setHudFeedbackKey((currentKey) => currentKey + 1);
    handleNavigateView("game");
  }, [handleNavigateView]);

  const handlePlayerNameChange = useCallback((nextValue: string) => {
    setPlayerNameInput(nextValue.slice(0, PLAYER_NAME_MAX_LENGTH));
    setPlayerNameError(null);
  }, []);

  const handleIntroPlay = useCallback(() => {
    const sanitizedPlayerName = sanitizePlayerName(playerNameInput);

    window.localStorage.setItem(LEADERBOARD_PLAYER_NAME_STORAGE_KEY, sanitizedPlayerName);
    window.localStorage.setItem(INTRO_COMPLETED_STORAGE_KEY, "true");
    setPlayerNameInput(sanitizedPlayerName);
    setPlayerNameError(null);
    setIsOnboardingComplete(true);
    setActiveView("tutorial");
    setTimerStarted(true);
  }, [playerNameInput]);

  const hudFeedbackMotion = {
    animate: hudFeedbackControls,
    initial: false,
  };

  if (!isOnboardingReady) {
    return <main className="theme-page-bg min-h-dvh" />;
  }

  return (
    <main className={`theme-page-bg min-h-dvh overflow-x-hidden px-[clamp(0.5rem,2vw,1.25rem)] py-0 ${activeView === "game" || activeView === "tutorial" ? "overflow-y-hidden" : "overflow-y-auto"}`}>
      <div ref={pageShellRef} className="game-page-shell mx-auto flex h-[100dvh] min-h-0 w-full max-w-[72rem] flex-col gap-[clamp(0.35rem,0.9vw,0.7rem)]">
        <Header ref={headerRef} onLogoClick={handleLogoClick} onNavigateView={handleNavigateView} />

        {activeView === "game" ? (
        <section ref={contentRef} className="game-play-section relative flex flex-1 min-h-0 flex-col items-center justify-center gap-[clamp(0.25rem,0.65vw,0.5rem)] pb-[clamp(0.1rem,0.35vh,0.25rem)]">
          <motion.div
            {...hudFeedbackMotion}
            ref={hudRef}
            className="w-full max-w-full"
            style={{ width: boardAreaWidth }}
          >
            <GameHud
              bestMoves={currentBest?.fewestMoves ?? null}
              bestTimeDisplay={bestTimeDisplay}
              dailyInfo={
                isDailyMode
                  ? {
                      dateKey: dailyDateKey,
                      size: dailyConfig.size,
                      styleLabel: dailyPuzzleStyleLabel,
                      swapBudget: dailySwapBudget,
                    }
                  : undefined
              }
              endlessInfo={
                isDailyMode
                  ? {
                      label: `Daily ${dailyPuzzleStyleLabel}`,
                      puzzleNumber: 1,
                      styleLabel: dailyPuzzleStyleLabel,
                      swapBudget: dailySwapBudget,
                    }
                  : isEndlessMode
                    ? {
                        label: `Puzzle ${endlessPuzzleNumber} · ${endlessPuzzleStyleLabel}`,
                        puzzleNumber: endlessPuzzleNumber,
                        styleLabel: endlessPuzzleStyleLabel,
                        swapBudget: endlessUsesSwapLimit ? endlessSwapBudget : null,
                      }
                    : undefined
              }
              gradientQuality={gradientQuality}
              moves={moves}
              timeDisplay={formatTime(timeLeft)}
              timeWarning={endlessUsesCountdown && timeLeft <= 10}
            />
          </motion.div>

          <CompactLeaderboardPanel
            dailyDateKey={dailyDateKey}
            difficulty={difficulty}
            isDailyMode={isDailyMode}
          />

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
              interactionDisabled={previewActive || dailyAttemptFailed}
              previewCountdown={previewActive ? previewCountdown : null}
              setDragOverlayRef={setDragOverlayRef}
              tileRadiusClass={tileRadiusClass}
              visualMode={isBlackAndWhiteRun && !previewActive ? "grayscale" : boardVisualMode}
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
              onClick={handleRestartGame}
              aria-label="Restart game"
              className="theme-button-primary restart-button font-fredoka-strong flex h-14 w-full max-w-[20rem] items-center justify-center gap-2 rounded-full px-7 py-3 text-base shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
            >
              <span aria-hidden="true" className="text-[clamp(0.95rem,1.5vw,1.1rem)] leading-none">
                {"\u21BB"}
              </span>
              <span>Restart</span>
            </button>
          </motion.div>

          <div className="side-actions-rail">
            <motion.div {...hudFeedbackMotion} className="side-actions-list">
              <button
                type="button"
                onClick={handleDailyOpen}
                aria-label="Daily puzzle"
                className="side-action-button theme-card inline-flex aspect-square items-center justify-center rounded-[1.15rem] border px-2 text-center shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
              >
                <TbTargetArrow className="theme-text-primary text-[clamp(1.5rem,2.5vw,1.9rem)] leading-none" />
              </button>

              <button
                type="button"
                onClick={() => setModeModalOpen(true)}
                aria-label="Open modes"
                className="side-action-button theme-card inline-flex aspect-square items-center justify-center rounded-[1.15rem] border px-2 text-center shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
              >
                <VscStarFull className="theme-text-primary text-[clamp(1.5rem,2.5vw,1.9rem)] leading-none" />
              </button>

              <button
                type="button"
                onClick={() => setShopModalOpen(true)}
                aria-label="Open shop"
                className="side-action-button theme-card inline-flex aspect-square items-center justify-center rounded-[1.15rem] border px-2 text-center shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
              >
                <FaShoppingCart className="theme-text-primary text-[clamp(1.5rem,2.5vw,1.9rem)] leading-none" />
              </button>

              <button
                type="button"
                onClick={() => setLeaderboardModalOpen(true)}
                aria-label="Open leaderboard"
                className="side-action-button theme-card inline-flex aspect-square items-center justify-center rounded-[1.15rem] border px-2 text-center shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
              >
                <IoMdTrophy className="theme-text-primary text-[clamp(1.5rem,2.5vw,1.9rem)] leading-none" />
              </button>
            </motion.div>
          </div>
        </section>
        ) : (
          <section className={`relative flex min-h-0 flex-1 flex-col items-stretch justify-start ${activeView === "tutorial" ? "py-1" : "py-6"}`}>
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
            dailyResult={
              isDailyMode
                ? {
                    onModes: handleDailyModes,
                    onReplay: handleDailyReplay,
                    swapBudget: dailySwapBudget,
                  }
                : undefined
            }
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
            onRestart={handleRestartGame}
            personalBestStatus={personalBestStatus}
            timeDisplay={formatTime(solveTime)}
            winState={winModalVisible}
          />
          <WinConfetti active={confettiActive} />
          <GameModeModal
            currentStreak={endlessStreak}
            difficulty={difficulty}
            endlessStats={endlessStats}
            isOpen={modeModalOpen}
            onClose={() => setModeModalOpen(false)}
            onDifficultyChange={handleDifficultyChange}
            onEndlessStart={handleEndlessStart}
          />
          <ShopComingSoonModal
            isOpen={shopModalOpen}
            onClose={() => setShopModalOpen(false)}
          />
          <DailyPuzzleModal
            dateKey={dailyDateKey}
            isFailed={dailyAttemptFailed}
            isOpen={dailyModalOpen}
            onClose={() => setDailyModalOpen(false)}
            onStart={handleDailyStart}
            record={dailyRecordForToday}
            style={dailyPuzzleStyle}
            swapBudget={dailySwapBudget}
          />
          <LeaderboardModal
            isOpen={leaderboardModalOpen}
            onClose={() => setLeaderboardModalOpen(false)}
          />
        </>
      )}

      {activeView === "game" && !isOnboardingComplete && (
        <IntroOnboarding
          introStep={introStep}
          nameError={playerNameError}
          onNameChange={handlePlayerNameChange}
          onPlay={handleIntroPlay}
          playerNameInput={playerNameInput}
        />
      )}
    </main>
  );
}
