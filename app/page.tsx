"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { FaShoppingCart } from "react-icons/fa";
import { IoMdTrophy } from "react-icons/io";
import { TbTargetArrow } from "react-icons/tb";
import { VscStarFull } from "react-icons/vsc";
import { Analytics } from "@vercel/analytics/next"

import { GradientText } from "../components/ui/gradient-text";
import {
  AccountAuthModal,
  type AccountAuthMode,
} from "./account/components/account-auth-modal";
import { AchievementToast } from "./game/components/achievement-toast";
import { GameBoard } from "./game/components/game-board";
import { CompactLeaderboardPanel } from "./game/components/compact-leaderboard-panel";
import { GameControls } from "./game/components/game-controls";
import { GameHud } from "./game/components/game-hud";
import { DailyPuzzleModal } from "./game/components/modals/daily-puzzle-modal";
import { GameModal } from "./game/components/modals/game-modal";
import { GameModeModal } from "./game/components/modals/game-mode-modal";
import { LeaderboardModal } from "./game/components/modals/leaderboard-modal";
import { ShopComingSoonModal } from "./game/components/modals/shop-coming-soon-modal";
import { VerificationRetryModal } from "./game/components/modals/verification-retry-modal";
import { WinConfetti } from "./game/components/win-confetti";
import { Header } from "./game/components/header";
import { useBoardDrag } from "./game/hooks/use-board-drag";
import { useBoardSize } from "./game/hooks/use-board-size";
import { useAccountAchievements } from "./game/hooks/use-account-achievements";
import { useAccountProgressSync } from "./game/hooks/use-account-progress-sync";
import { usePersistentDailyPuzzle } from "./game/hooks/use-persistent-daily-puzzle";
import { usePersistentEndlessStats } from "./game/hooks/use-persistent-endless-stats";
import { usePersistentBestStats } from "./game/hooks/use-persistent-best-stats";
import { useWinSequence } from "./game/hooks/use-win-sequence";
import { LEADERBOARD_REFRESH_EVENT } from "./game/leaderboard";
import {
  checkCompletion,
  createSeededRandom,
  formatTime,
  GAME_START_PREVIEW_SECONDS,
  generateCornerColors,
  generateSolvedBoard,
  getBoardDensityClass,
  getDailyPuzzleDefinition,
  getDailyPuzzleDateKey,
  getEndlessPuzzleDefinition,
  getGameModeConfig,
  getReservedPresetTimeLimit,
  getTileRadiusClass,
  isEndlessPuzzleType,
  isBlackAndWhiteMode,
  isTileCorrect,
  isTileLocked,
  scrambleBoard,
} from "./game/game-logic";
import type { BestStats, DailyFailureReason, DifficultyConfig, DifficultyKey, EndlessPuzzleDefinition, Tile } from "./game/game-types";
import {
  completeVerifiedAttempt,
  createVerifiedAttempt,
  isRetryableVerifiedLeaderboardError,
  startVerifiedAttempt,
  type VerifiedAttempt,
  type VerifiedAttemptResult,
} from "./game/verified-leaderboard-client";
import type { VerifiedSwap } from "./game/verified-attempt";
import { isVerifiedGameContextCurrent } from "./game/verified-session";
import { getGradientQuality } from "./game/gradient-quality";
import {
  getCountdownDeadline,
  getGameTimerSeconds,
  getMonotonicStartedAt,
} from "./game/game-timer";
import {
  clearStoredPlayerData,
  PLAYER_NAME_MAX_LENGTH,
  PLAYER_NAME_STORAGE_KEY,
  sanitizePlayerName,
} from "./game/player-progress";
import { authClient } from "./lib/auth-client";
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
const INTRO_WELCOME_DURATION_MS = 1400;
const GAME_START_PREVIEW_DURATION_MS = GAME_START_PREVIEW_SECONDS * 1000;
const INTRO_ACCOUNT_ACTION_CLASS_NAME =
  "theme-button-secondary font-fredoka-strong inline-flex h-12 items-center justify-center rounded-full border border-[var(--border-soft)] px-6 text-base transition disabled:cursor-not-allowed disabled:opacity-50 sm:px-7 sm:text-lg";

type IntroStep = "welcome" | "name";

type VerificationOutcome =
  | { result: VerifiedAttemptResult; status: "verified" }
  | { status: "rejected" | "unavailable" | "unranked" };

type PendingVerifiedCompletion = {
  attempt: VerifiedAttempt;
  gameSessionId: number;
  swaps: VerifiedSwap[];
  userId: string;
};

function generateGuestPlayerName() {
  return `guest${Math.floor(100 + Math.random() * 900)}`;
}

function notifyLeaderboardRefresh() {
  window.dispatchEvent(new Event(LEADERBOARD_REFRESH_EVENT));
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
  accountName: string;
  introStep: IntroStep;
  isSigningOut: boolean;
  isSignedIn: boolean;
  nameError: string | null;
  onAccountAction: (mode: AccountAuthMode) => void;
  onNameChange: (value: string) => void;
  onPlay: () => void;
  onSignOut: () => void;
  playerNameInput: string;
};

function IntroOnboarding({
  accountName,
  introStep,
  isSigningOut,
  isSignedIn,
  nameError,
  onAccountAction,
  onNameChange,
  onPlay,
  onSignOut,
  playerNameInput,
}: Readonly<IntroOnboardingProps>) {
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (introStep !== "name" || isSignedIn) {
      return;
    }

    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, [introStep, isSignedIn]);

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
                  value={isSignedIn ? accountName : playerNameInput}
                  onChange={(event) => onNameChange(event.target.value)}
                  readOnly={isSignedIn}
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

              {isSignedIn ? (
                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={onSignOut}
                  className={`mt-6 ${INTRO_ACCOUNT_ACTION_CLASS_NAME}`}
                >
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </button>
              ) : (
                <div className="mt-6 flex items-center justify-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => onAccountAction("sign-in")}
                    className={INTRO_ACCOUNT_ACTION_CLASS_NAME}
                  >
                    Sign in
                  </button>
                  <span aria-hidden="true" className="theme-text-muted text-sm">
                    or
                  </span>
                  <button
                    type="button"
                    onClick={() => onAccountAction("sign-up")}
                    className={INTRO_ACCOUNT_ACTION_CLASS_NAME}
                  >
                    Create account
                  </button>
                </div>
              )}
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
  const [isDailyMode, setIsDailyMode] = useState(true);
  const [dailyModalOpen, setDailyModalOpen] = useState(false);
  const [dailyFailureReason, setDailyFailureReason] = useState<DailyFailureReason | null>(null);
  const [dailyDateKey, setDailyDateKey] = useState(() => getDailyPuzzleDateKey());
  const [endlessPuzzleNumber, setEndlessPuzzleNumber] = useState(1);
  const [endlessPuzzle, setEndlessPuzzle] = useState(() =>
    getEndlessPuzzleDefinition(1),
  );
  const [endlessStreak, setEndlessStreak] = useState(0);
  const [endlessLastClear, setEndlessLastClear] = useState<{
    challengeLabel: string;
    isThreeStar: boolean;
    levelName: string;
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

  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get("view");

    if (
      requestedView === "about" ||
      requestedView === "privacy" ||
      requestedView === "tutorial"
    ) {
      setActiveView(requestedView);
    }
  }, []);
  const [hudFeedbackKey, setHudFeedbackKey] = useState(0);
  const [introStep, setIntroStep] = useState<IntroStep>("welcome");
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isIntroVisible, setIsIntroVisible] = useState(true);
  const [isOnboardingReady, setIsOnboardingReady] = useState(false);
  const [playerNameInput, setPlayerNameInput] = useState("");
  const [playerNameError, setPlayerNameError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AccountAuthMode>("sign-in");
  const { data: session, isPending: sessionIsPending } = authClient.useSession();
  const accountPlayerName = sanitizePlayerName(session?.user.name ?? "");
  const {
    currentAnnouncement,
    dismissAnnouncement,
    recordAchievementEvent,
    recordSwap,
  } = useAccountAchievements(session?.user.id ?? null);
  const hudFeedbackControls = useAnimationControls();
  const clearDragSessionRef = useRef<() => void>(() => {});
  const resetWinSequenceRef = useRef<() => void>(() => {});
  const gameStartPreviewTimeoutRef = useRef<number | null>(null);
  const gameStartPreviewIntervalRef = useRef<number | null>(null);
  const activeVerifiedAttemptRef = useRef<VerifiedAttempt | null>(null);
  const verifiedSwapsRef = useRef<VerifiedSwap[]>([]);
  const verifiedCompletionRef = useRef<Promise<VerificationOutcome> | null>(null);
  const pendingVerifiedCompletionRef = useRef<PendingVerifiedCompletion | null>(null);
  const verificationOutcomeHandlerRef = useRef<
    ((outcome: VerificationOutcome) => void) | null
  >(null);
  const activeVerifiedGameSessionIdRef = useRef<number | null>(null);
  const activeVerifiedUserIdRef = useRef<string | null>(null);
  const verificationPendingGameSessionIdRef = useRef<number | null>(null);
  const [verificationRetryStatus, setVerificationRetryStatus] = useState<
    "hidden" | "ready" | "retrying"
  >("hidden");
  const endlessRunIdRef = useRef<string | null>(null);
  const gameRequestIdRef = useRef(0);
  const gameSessionIdRef = useRef(0);
  const timerStartedAtRef = useRef<number | null>(null);
  const countdownDeadlineRef = useRef<number | null>(null);
  const observedSessionUserIdRef = useRef<string | null | undefined>(undefined);
  const sessionUserIdRef = useRef<string | null>(session?.user.id ?? null);
  sessionUserIdRef.current = session?.user.id ?? null;

  const {
    bestStats,
    isLoaded: bestStatsAreLoaded,
    setBestStats,
  } = usePersistentBestStats();
  const {
    dailyRecord,
    isLoaded: dailyRecordIsLoaded,
    setDailyRecord,
  } = usePersistentDailyPuzzle();
  const {
    endlessStats,
    isLoaded: endlessStatsAreLoaded,
    setEndlessStats,
  } = usePersistentEndlessStats();

  useAccountProgressSync({
    bestStats,
    dailyRecord,
    endlessStats,
    isLoaded:
      bestStatsAreLoaded &&
      dailyRecordIsLoaded &&
      endlessStatsAreLoaded,
    setBestStats,
    setDailyRecord,
    setEndlessStats,
  });

  const dailyPuzzle = getDailyPuzzleDefinition(dailyDateKey);
  const dailyConfig: DifficultyConfig = dailyPuzzle;
  const dailyPuzzleStyle = dailyPuzzle.style;
  const dailyPuzzleStyleLabel = dailyPuzzle.challengeLabel;
  const dailySwapBudget = dailyPuzzle.swapBudget;
  const dailyUsesCountdown = isDailyMode && dailyPuzzle.timeLimitSeconds !== null;
  const dailyRecordForToday = dailyRecord?.dateKey === dailyDateKey ? dailyRecord : null;
  const activeConfig =
    isDailyMode
      ? dailyConfig
      : difficulty === "endless"
      ? endlessPuzzle
      : getGameModeConfig(difficulty);

  const tileRadiusClass = getTileRadiusClass(activeConfig.size);
  const boardDensityClass = getBoardDensityClass(activeConfig.size);
  const currentBest = bestStats[difficulty];
  const isEndlessMode = !isDailyMode && difficulty === "endless";
  const isBlackAndWhiteRun = isDailyMode
    ? dailyPuzzleStyle === "black-and-white"
    : isBlackAndWhiteMode(difficulty) ||
      (isEndlessMode && endlessPuzzle.style === "black-and-white");
  const endlessPuzzleStyleLabel = endlessPuzzle.challengeLabel;
  const endlessUsesCountdown = isEndlessMode && endlessPuzzle.usesCountdown;
  const activeUsesCountdown = dailyUsesCountdown || endlessUsesCountdown;
  const endlessUsesSwapLimit = isEndlessMode && endlessPuzzle.usesSwapLimit;
  const activeCountdownDuration = dailyUsesCountdown
    ? dailyPuzzle.timeLimitSeconds ?? 0
    : endlessPuzzle.timeLimitSeconds ?? 0;
  const endlessSwapBudget = endlessPuzzle.swapBudget;
  const endlessThreeStarMoveLimit = endlessPuzzle.threeStarMoveLimit;
  const reservedPresetTimeLimit = getReservedPresetTimeLimit(difficulty);
  const bestSolveTime = getBestSolveTime(currentBest, reservedPresetTimeLimit);
  const bestTimeDisplay = bestSolveTime === undefined ? "-" : formatTime(bestSolveTime);
  const solveTime = activeUsesCountdown ? activeCountdownDuration - timeLeft : timeLeft;
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

  const handleSwap = useCallback((sourceIndex: number, targetIndex: number) => {
    recordSwap();
    if (activeVerifiedAttemptRef.current) {
      verifiedSwapsRef.current.push([sourceIndex, targetIndex]);
    }
  }, [recordSwap]);

  const submitVerifiedCompletion = useCallback((
    pendingCompletion: PendingVerifiedCompletion,
  ) => {
    const completion = completeVerifiedAttempt(
      pendingCompletion.attempt.attemptId,
      pendingCompletion.swaps,
    )
      .then((result) => {
        if (pendingVerifiedCompletionRef.current === pendingCompletion) {
          pendingVerifiedCompletionRef.current = null;
        }
        if (sessionUserIdRef.current === pendingCompletion.userId) {
          notifyLeaderboardRefresh();
        }
        return { result, status: "verified" } as const;
      })
      .catch((error: unknown) => {
        if (!isRetryableVerifiedLeaderboardError(error)) {
          if (pendingVerifiedCompletionRef.current === pendingCompletion) {
            pendingVerifiedCompletionRef.current = null;
          }
          if (
            pendingCompletion.attempt.puzzle.kind === "endless" &&
            isVerifiedGameContextCurrent(
              {
                gameSessionId: pendingCompletion.gameSessionId,
                userId: pendingCompletion.userId,
              },
              {
                gameSessionId: gameSessionIdRef.current,
                userId: sessionUserIdRef.current ?? "",
              },
            )
          ) {
            endlessRunIdRef.current = null;
          }
          return { status: "rejected" } as const;
        }

        return { status: "unavailable" } as const;
      });

    verifiedCompletionRef.current = completion;
    return completion;
  }, []);

  const completeCurrentVerifiedAttempt = useCallback(() => {
    const attempt = activeVerifiedAttemptRef.current;
    const attemptGameSessionId = activeVerifiedGameSessionIdRef.current;
    const attemptUserId = activeVerifiedUserIdRef.current;
    if (!attempt || attemptGameSessionId === null || !attemptUserId) {
      verifiedCompletionRef.current = null;
      return null;
    }

    const pendingCompletion: PendingVerifiedCompletion = {
      attempt,
      gameSessionId: attemptGameSessionId,
      swaps: [...verifiedSwapsRef.current],
      userId: attemptUserId,
    };
    activeVerifiedAttemptRef.current = null;
    activeVerifiedGameSessionIdRef.current = null;
    activeVerifiedUserIdRef.current = null;
    verifiedSwapsRef.current = [];
    pendingVerifiedCompletionRef.current = pendingCompletion;

    return submitVerifiedCompletion(pendingCompletion);
  }, [submitVerifiedCompletion]);

  const retryPendingVerifiedCompletion = useCallback(() => {
    const pendingCompletion = pendingVerifiedCompletionRef.current;
    return pendingCompletion
      ? submitVerifiedCompletion(pendingCompletion)
      : null;
  }, [submitVerifiedCompletion]);

  const handleVerificationRetry = useCallback(() => {
    const completion = retryPendingVerifiedCompletion();
    if (!completion) {
      setVerificationRetryStatus("hidden");
      return;
    }

    setVerificationRetryStatus("retrying");
    void completion.then((outcome) => {
      verificationOutcomeHandlerRef.current?.(outcome);
    });
  }, [retryPendingVerifiedCompletion]);

  const handleContinueUnranked = useCallback(() => {
    const pendingCompletion = pendingVerifiedCompletionRef.current;
    const handleOutcome = verificationOutcomeHandlerRef.current;
    if (!pendingCompletion || !handleOutcome) {
      setVerificationRetryStatus("hidden");
      return;
    }

    if (pendingCompletion.attempt.puzzle.kind === "endless") {
      endlessRunIdRef.current = null;
    }
    pendingVerifiedCompletionRef.current = null;
    verifiedCompletionRef.current = null;
    handleOutcome({ status: "unranked" });
  }, []);

  const {
    clearDragSession,
    clearPendingSwapAnimation,
    dragSession,
    draggedIndex,
    dropTargetRect,
    getTileRef,
    handlePointerDown,
    pressedTileIndex,
    setDragOverlayRef,
    updateBoard,
  } = useBoardDrag({
    board,
    onSwap: handleSwap,
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
    activeView,
    boardLength: board.length,
    boardResetKey,
    difficulty,
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
    const storedPlayerName = window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY);
    const nextPlayerName = sanitizePlayerName(storedPlayerName ?? "") || generateGuestPlayerName();

    setPlayerNameInput(nextPlayerName);
    setHasCompletedOnboarding(storedIntroCompleted);
    setIntroStep(storedIntroCompleted ? "name" : "welcome");
    setIsOnboardingReady(true);
  }, []);

  useEffect(() => {
    if (!isOnboardingReady || hasCompletedOnboarding) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIntroStep("name");
    }, INTRO_WELCOME_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasCompletedOnboarding, isOnboardingReady]);

  useEffect(() => {
    if (!isOnboardingReady || !isIntroVisible) {
      return;
    }

    setTimerStarted(false);
  }, [isIntroVisible, isOnboardingReady]);

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

  const clearGameStartPreview = useCallback(() => {
    if (gameStartPreviewTimeoutRef.current !== null) {
      window.clearTimeout(gameStartPreviewTimeoutRef.current);
      gameStartPreviewTimeoutRef.current = null;
    }

    if (gameStartPreviewIntervalRef.current !== null) {
      window.clearInterval(gameStartPreviewIntervalRef.current);
      gameStartPreviewIntervalRef.current = null;
    }

    setPreviewCountdown(null);
  }, []);

  const startGame = useCallback((
    config: DifficultyConfig,
    useBlackAndWhitePreview: boolean,
    random = Math.random,
    initialTime = 0,
    verifiedAttempt: VerifiedAttempt | null = null,
    verifiedUserId: string | null = null,
  ) => {
    const corners = generateCornerColors(config.size, random);
    const nextSolvedBoard = generateSolvedBoard(config.size, corners);
    const nextBoard = scrambleBoard(nextSolvedBoard, random);
    const gameSessionId = gameSessionIdRef.current + 1;
    gameSessionIdRef.current = gameSessionId;
    activeVerifiedAttemptRef.current = verifiedAttempt;
    activeVerifiedGameSessionIdRef.current = verifiedAttempt ? gameSessionId : null;
    activeVerifiedUserIdRef.current = verifiedAttempt ? verifiedUserId : null;
    verifiedSwapsRef.current = [];
    verifiedCompletionRef.current = null;
    pendingVerifiedCompletionRef.current = null;
    verificationOutcomeHandlerRef.current = null;
    verificationPendingGameSessionIdRef.current = null;
    setVerificationRetryStatus("hidden");

    const authoritativeStartedAt = verifiedAttempt
      ? Date.parse(verifiedAttempt.startedAt)
      : Number.NaN;
    const startedAt = getMonotonicStartedAt({
      authoritativeStartedAt: Number.isFinite(authoritativeStartedAt)
        ? authoritativeStartedAt
        : Date.now(),
      monotonicNow: performance.now(),
      wallClockNow: Date.now(),
    });
    timerStartedAtRef.current = startedAt;
    const showStartPreview = useBlackAndWhitePreview || initialTime > 0;
    countdownDeadlineRef.current = getCountdownDeadline({
      durationSeconds: initialTime,
      previewSeconds: showStartPreview ? GAME_START_PREVIEW_SECONDS : 0,
      startedAt,
    });

    clearGameStartPreview();
    clearDragSession();
    resetWinSequence();
    setBoardResetKey((currentKey) => currentKey + 1);
    clearPendingSwapAnimation();
    updateBoard(nextBoard);
    setMoves(0);
    setTimeLeft(initialTime);
    setCompletion(checkCompletion(nextBoard));
    setWinState(false);
    setEndlessLastClear(null);
    setBoardVisualMode("color");
    setTimerStarted(false);

    if (showStartPreview) {
      setPreviewActive(true);
      setPreviewCountdown(GAME_START_PREVIEW_SECONDS);
      setTimerStarted(false);
      gameStartPreviewIntervalRef.current = window.setInterval(() => {
        setPreviewCountdown((currentCountdown) =>
          currentCountdown === null ? null : Math.max(1, currentCountdown - 1),
        );
      }, 1000);
      gameStartPreviewTimeoutRef.current = window.setTimeout(() => {
        if (gameStartPreviewIntervalRef.current !== null) {
          window.clearInterval(gameStartPreviewIntervalRef.current);
          gameStartPreviewIntervalRef.current = null;
        }

        setBoardVisualMode("grayscale");
        setPreviewActive(false);
        setPreviewCountdown(null);
        setTimerStarted(true);
        gameStartPreviewTimeoutRef.current = null;
      }, GAME_START_PREVIEW_DURATION_MS);
      return;
    }

    setPreviewActive(false);
    setTimerStarted(true);
  }, [clearDragSession, clearGameStartPreview, clearPendingSwapAnimation, resetWinSequence, updateBoard]);

  const startPresetGame = useCallback(async (nextDifficulty: Exclude<DifficultyKey, "endless">) => {
    const requestId = gameRequestIdRef.current + 1;
    gameRequestIdRef.current = requestId;
    const requestUserId = sessionUserIdRef.current;
    let verifiedAttempt: VerifiedAttempt | null = null;

    if (requestUserId) {
      try {
        const preparedAttempt = await createVerifiedAttempt({
          difficulty: nextDifficulty,
          kind: "preset",
        });

        if (
          gameRequestIdRef.current !== requestId ||
          sessionUserIdRef.current !== requestUserId
        ) {
          return;
        }

        verifiedAttempt = await startVerifiedAttempt(preparedAttempt.attemptId);
      } catch {
        verifiedAttempt = null;
      }
    }

    if (
      gameRequestIdRef.current !== requestId ||
      sessionUserIdRef.current !== requestUserId
    ) {
      return;
    }

    startGame(
      getGameModeConfig(nextDifficulty),
      isBlackAndWhiteMode(nextDifficulty),
      verifiedAttempt
        ? createSeededRandom(verifiedAttempt.puzzle.seed)
        : Math.random,
      0,
      verifiedAttempt,
      verifiedAttempt ? requestUserId : null,
    );
  }, [startGame]);

  useEffect(() => {
    if (isIntroVisible || isDailyMode || difficulty === "endless") {
      return;
    }

    void startPresetGame(difficulty);
  }, [difficulty, isDailyMode, isIntroVisible, startPresetGame]);

  const startEndlessPuzzle = useCallback(async (
    requestedPuzzleNumber: number,
    startNewVerifiedRun = false,
  ) => {
    const requestId = gameRequestIdRef.current + 1;
    gameRequestIdRef.current = requestId;
    const requestUserId = sessionUserIdRef.current;
    let verifiedAttempt: VerifiedAttempt | null = null;

    if (startNewVerifiedRun) {
      endlessRunIdRef.current = null;
    }

    if (
      requestUserId &&
      (startNewVerifiedRun || endlessRunIdRef.current)
    ) {
      try {
        const preparedAttempt = await createVerifiedAttempt({
          endlessRunId: startNewVerifiedRun ? null : endlessRunIdRef.current,
          kind: "endless",
        });

        if (
          gameRequestIdRef.current !== requestId ||
          sessionUserIdRef.current !== requestUserId
        ) {
          return;
        }

        verifiedAttempt = await startVerifiedAttempt(preparedAttempt.attemptId);
      } catch {
        verifiedAttempt = null;
        if (gameRequestIdRef.current === requestId) {
          endlessRunIdRef.current = null;
        }
      }
    }

    if (
      gameRequestIdRef.current !== requestId ||
      sessionUserIdRef.current !== requestUserId
    ) {
      return;
    }

    const puzzleNumber = verifiedAttempt?.puzzle.puzzleNumber ?? requestedPuzzleNumber;
    const verifiedPuzzleType = isEndlessPuzzleType(
      verifiedAttempt?.puzzle.puzzleType,
    )
      ? verifiedAttempt.puzzle.puzzleType
      : null;
    const scheduledPuzzle = getEndlessPuzzleDefinition(
      puzzleNumber,
      verifiedPuzzleType,
    );
    const nextPuzzle: EndlessPuzzleDefinition = verifiedAttempt
      ? {
          ...scheduledPuzzle,
          size: verifiedAttempt.puzzle.size,
          style: verifiedAttempt.puzzle.style,
          swapBudget: verifiedAttempt.puzzle.swapBudget,
          timeLimitSeconds: verifiedAttempt.puzzle.timeLimitSeconds,
          usesCountdown: verifiedAttempt.puzzle.timeLimitSeconds !== null,
          usesSwapLimit: verifiedAttempt.puzzle.swapBudget !== null,
        }
      : scheduledPuzzle;

    endlessRunIdRef.current = verifiedAttempt?.puzzle.endlessRunId ?? null;

    setEndlessPuzzleNumber(puzzleNumber);
    setEndlessPuzzle(nextPuzzle);
    startGame(
      nextPuzzle,
      nextPuzzle.style === "black-and-white",
      verifiedAttempt
        ? createSeededRandom(verifiedAttempt.puzzle.seed)
        : Math.random,
      nextPuzzle.timeLimitSeconds ?? 0,
      verifiedAttempt,
      verifiedAttempt ? requestUserId : null,
    );
  }, [startGame]);

  useEffect(() => {
    const currentGameSessionId = gameSessionIdRef.current;
    if (
      !board.length ||
      winState ||
      verificationPendingGameSessionIdRef.current === currentGameSessionId
    ) {
      return;
    }

    const nextCompletion = checkCompletion(board);
    setCompletion(nextCompletion);

    if (nextCompletion !== 100) {
      return;
    }

    const exceededSwapLimit =
      (isDailyMode && dailySwapBudget !== null && moves > dailySwapBudget) ||
      (
        isEndlessMode &&
        endlessUsesSwapLimit &&
        endlessSwapBudget !== null &&
        moves > endlessSwapBudget
      );
    const missedCountdownDeadline =
      activeUsesCountdown &&
      countdownDeadlineRef.current !== null &&
      performance.now() > countdownDeadlineRef.current;

    if (exceededSwapLimit || missedCountdownDeadline) {
      return;
    }

    const finalSolveTime = solveTime;

    const awardDailyClear = (outcome?: VerificationOutcome) => {
      const verifiedResult = outcome?.status === "verified" ? outcome.result : null;
      const awardedMoves = verifiedResult?.moves ?? moves;
      const awardedSolveTime = verifiedResult?.solveTime ?? finalSolveTime;

      setDailyRecord((currentRecord) => {
        const isSameDay = currentRecord?.dateKey === dailyDateKey;
        return {
          bestSolveTime:
            isSameDay && currentRecord.bestSolveTime !== undefined
              ? Math.min(currentRecord.bestSolveTime, awardedSolveTime)
              : awardedSolveTime,
          completed: true,
          dateKey: dailyDateKey,
          fewestMoves:
            isSameDay && currentRecord.fewestMoves !== undefined
              ? Math.min(currentRecord.fewestMoves, awardedMoves)
              : awardedMoves,
          style: dailyPuzzleStyle,
        };
      });
      recordAchievementEvent({
        dateKey: dailyDateKey,
        kind: "daily",
        playedDate: getDailyPuzzleDateKey(),
      });
      setWinState(true);
      setWinPhase("boardWave");
      clearDragSession();
    };

    const awardEndlessClear = (outcome?: VerificationOutcome) => {
      const completedSwapBudget = endlessUsesSwapLimit ? endlessSwapBudget : null;
      const isThreeStar = moves <= endlessThreeStarMoveLimit;
      const verifiedStreak = outcome?.status === "verified"
        ? outcome.result.streakCount
        : undefined;
      const nextStreak = verifiedStreak ?? endlessStreak + 1;

      setEndlessLastClear({
        challengeLabel: endlessPuzzle.challengeLabel,
        isThreeStar,
        levelName: endlessPuzzle.name,
        puzzleNumber: endlessPuzzleNumber,
        swapBudget: completedSwapBudget,
        threeStarMoveLimit: endlessThreeStarMoveLimit,
        usesSwapLimit: endlessUsesSwapLimit,
      });
      setEndlessStreak(nextStreak);
      setEndlessStats((currentStats) => ({
        clears: currentStats.clears + 1,
        threeStarClears: currentStats.threeStarClears + (isThreeStar ? 1 : 0),
        bestStreak: Math.max(currentStats.bestStreak, nextStreak),
      }));
      recordAchievementEvent({
        isThreeStar,
        kind: "endless",
        playedDate: getDailyPuzzleDateKey(),
        streak: nextStreak,
      });
      setWinState(true);
      setWinPhase("boardWave");
      clearDragSession();
    };

    if (isDailyMode || isEndlessMode) {
      const verificationUserId = activeVerifiedUserIdRef.current;
      const verifiedCompletion = completeCurrentVerifiedAttempt();
      if (!verifiedCompletion) {
        if (isDailyMode) {
          awardDailyClear();
        } else {
          awardEndlessClear();
        }
        return;
      }

      verificationPendingGameSessionIdRef.current = currentGameSessionId;
      setTimerStarted(false);
      clearDragSession();

      const handleVerificationOutcome = (outcome: VerificationOutcome) => {
        if (
          !verificationUserId ||
          !isVerifiedGameContextCurrent(
            {
              gameSessionId: currentGameSessionId,
              userId: verificationUserId,
            },
            {
              gameSessionId: gameSessionIdRef.current,
              userId: sessionUserIdRef.current ?? "",
            },
          )
        ) {
          return;
        }

        if (outcome.status === "unavailable") {
          verificationOutcomeHandlerRef.current = handleVerificationOutcome;
          setVerificationRetryStatus("ready");
          return;
        }

        verificationOutcomeHandlerRef.current = null;
        setVerificationRetryStatus("hidden");
        verificationPendingGameSessionIdRef.current = null;

        if (outcome.status === "rejected") {
          if (isDailyMode) {
            resetWinSequenceRef.current();
            setDailyModalOpen(true);
            setDailyFailureReason(dailyUsesCountdown ? "time-limit" : "swap-limit");
            timeUpSound.play();
          } else {
            setEndlessStreak(0);
            resetWinSequenceRef.current();
            timeUpSound.play();
            void startEndlessPuzzle(1, true);
          }
          return;
        }

        if (isDailyMode) {
          awardDailyClear(outcome);
        } else {
          awardEndlessClear(outcome);
        }
      };

      void verifiedCompletion.then(handleVerificationOutcome);
      return;
    }

    const currentBestWithSolveTime = {
      ...currentBest,
      bestSolveTime: getBestSolveTime(currentBest, reservedPresetTimeLimit),
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

    void completeCurrentVerifiedAttempt();
    if (difficulty !== "endless") {
      recordAchievementEvent({
        kind: "preset",
        mode: difficulty,
        playedDate: getDailyPuzzleDateKey(),
        solveTime: finalSolveTime,
      });
    }

    setBestStats((current) => {
      const currentRecord = current[difficulty] ?? {};
      const currentBestSolveTime = getBestSolveTime(
        currentRecord,
        reservedPresetTimeLimit,
      );
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
  }, [activeUsesCountdown, board, clearDragSession, completeCurrentVerifiedAttempt, currentBest, dailyDateKey, dailyPuzzleStyle, dailySwapBudget, dailyUsesCountdown, difficulty, endlessPuzzle, endlessPuzzleNumber, endlessStreak, endlessSwapBudget, endlessThreeStarMoveLimit, endlessUsesSwapLimit, isDailyMode, isEndlessMode, moves, recordAchievementEvent, reservedPresetTimeLimit, setBestStats, setDailyRecord, setEndlessStats, setWinPhase, solveTime, startEndlessPuzzle, winState]);

  useEffect(() => {
    if (
      !isEndlessMode ||
      !endlessUsesSwapLimit ||
      endlessSwapBudget === null ||
      !board.length ||
      winState ||
      moves <= endlessSwapBudget
    ) {
      return;
    }

    setEndlessStreak(0);
    resetWinSequenceRef.current();
    timeUpSound.play();
    clearDragSessionRef.current();
    void startEndlessPuzzle(1, true);
  }, [board, endlessSwapBudget, endlessUsesSwapLimit, isEndlessMode, moves, startEndlessPuzzle, winState]);

  useEffect(() => {
    if (
      !isDailyMode ||
      dailySwapBudget === null ||
      !board.length ||
      winState ||
      moves <= dailySwapBudget
    ) {
      return;
    }

    resetWinSequenceRef.current();
    setDailyModalOpen(true);
    setDailyFailureReason("swap-limit");
    setTimerStarted(false);
    timeUpSound.play();
    clearDragSessionRef.current();
  }, [board, dailySwapBudget, isDailyMode, moves, winState]);

  useEffect(() => {
    if (
      !dailyUsesCountdown ||
      !board.length ||
      winState ||
      timeLeft > 0
    ) {
      return;
    }

    resetWinSequenceRef.current();
    setDailyModalOpen(true);
    setDailyFailureReason("time-limit");
    setTimerStarted(false);
    timeUpSound.play();
    clearDragSessionRef.current();
  }, [board, dailyUsesCountdown, timeLeft, winState]);

  useEffect(() => {
    if (
      !isEndlessMode ||
      !endlessUsesCountdown ||
      !board.length ||
      winState ||
      timeLeft > 0 ||
      (
        endlessUsesSwapLimit &&
        endlessSwapBudget !== null &&
        moves > endlessSwapBudget
      )
    ) {
      return;
    }

    setEndlessStreak(0);
    resetWinSequenceRef.current();
    timeUpSound.play();
    clearDragSessionRef.current();
    void startEndlessPuzzle(1, true);
  }, [board, endlessSwapBudget, endlessUsesCountdown, endlessUsesSwapLimit, isEndlessMode, moves, startEndlessPuzzle, timeLeft, winState]);

  useEffect(() => {
    if (
      activeView !== "game" ||
      isIntroVisible ||
      !board.length ||
      winState ||
      !timerStarted
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      const now = performance.now();
      const startedAt = timerStartedAtRef.current;
      if (startedAt === null) {
        return;
      }

      setTimeLeft(getGameTimerSeconds({
        countdownDeadline: activeUsesCountdown
          ? countdownDeadlineRef.current
          : null,
        now,
        startedAt,
      }));
    }, 100);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeUsesCountdown, activeView, board.length, isIntroVisible, timerStarted, winState]);

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
      clearGameStartPreview();
      clearWinSequenceTimeouts();
    };
  }, [clearGameStartPreview, clearWinSequenceTimeouts]);

  const handleDifficultyChange = (nextDifficulty: DifficultyKey) => {
    clearGameStartPreview();
    setIsDailyMode(false);
    setDailyModalOpen(false);
    setDailyFailureReason(null);
    setPreviewActive(false);
    setBoardVisualMode(isBlackAndWhiteMode(nextDifficulty) ? "grayscale" : "color");

    if (nextDifficulty === "endless") {
      return;
    }

    clearDragSession();
    resetWinSequence();

    if (nextDifficulty === difficulty) {
      void startPresetGame(nextDifficulty);
      return;
    }

    setDifficulty(nextDifficulty);
  };

  const handleEndlessStart = () => {
    clearGameStartPreview();
    setIsDailyMode(false);
    setDailyModalOpen(false);
    setDailyFailureReason(null);
    setPreviewActive(false);
    setBoardVisualMode("color");
    setDifficulty("endless");
    setEndlessStreak(0);
    void startEndlessPuzzle(1, true);
  };

  const startDailyPuzzle = useCallback(async (dateKey: string) => {
    const requestId = gameRequestIdRef.current + 1;
    gameRequestIdRef.current = requestId;
    const requestUserId = sessionUserIdRef.current;
    let verifiedAttempt: VerifiedAttempt | null = null;

    if (requestUserId) {
      try {
        const preparedAttempt = await createVerifiedAttempt({ dateKey, kind: "daily" });

        if (
          gameRequestIdRef.current !== requestId ||
          sessionUserIdRef.current !== requestUserId
        ) {
          return;
        }

        verifiedAttempt = await startVerifiedAttempt(preparedAttempt.attemptId);
      } catch {
        verifiedAttempt = null;
      }
    }

    if (
      gameRequestIdRef.current !== requestId ||
      sessionUserIdRef.current !== requestUserId
    ) {
      return;
    }

    const definition = getDailyPuzzleDefinition(dateKey);
    const nextStyle = verifiedAttempt?.puzzle.style ?? definition.style;
    const nextConfig: DifficultyConfig = {
      label: definition.label,
      size: verifiedAttempt?.puzzle.size ?? definition.size,
    };
    const boardRandom = createSeededRandom(
      verifiedAttempt?.puzzle.seed ?? `${dateKey}:board`,
    );

    clearGameStartPreview();
    setDailyDateKey(dateKey);
    setDailyModalOpen(false);
    setDailyFailureReason(null);
    setIsDailyMode(true);
    setPreviewActive(false);
    setBoardVisualMode("color");
    startGame(
      nextConfig,
      nextStyle === "black-and-white",
      boardRandom,
      verifiedAttempt?.puzzle.timeLimitSeconds ?? definition.timeLimitSeconds ?? 0,
      verifiedAttempt,
      verifiedAttempt ? requestUserId : null,
    );
  }, [clearGameStartPreview, startGame]);

  useEffect(() => {
    if (sessionIsPending) {
      return;
    }

    const nextUserId = session?.user.id ?? null;
    const previousUserId = observedSessionUserIdRef.current;
    observedSessionUserIdRef.current = nextUserId;

    if (previousUserId === undefined || previousUserId === nextUserId) {
      return;
    }

    gameRequestIdRef.current += 1;
    gameSessionIdRef.current += 1;
    activeVerifiedAttemptRef.current = null;
    activeVerifiedGameSessionIdRef.current = null;
    activeVerifiedUserIdRef.current = null;
    verifiedSwapsRef.current = [];
    verifiedCompletionRef.current = null;
    pendingVerifiedCompletionRef.current = null;
    verificationOutcomeHandlerRef.current = null;
    verificationPendingGameSessionIdRef.current = null;
    setVerificationRetryStatus("hidden");
    endlessRunIdRef.current = null;

    if (
      !hasCompletedOnboarding ||
      isIntroVisible ||
      activeView !== "game" ||
      board.length === 0
    ) {
      return;
    }

    if (isDailyMode) {
      void startDailyPuzzle(dailyDateKey);
      return;
    }

    if (isEndlessMode) {
      setEndlessStreak(0);
      void startEndlessPuzzle(1, true);
      return;
    }

    void startPresetGame(difficulty as Exclude<DifficultyKey, "endless">);
  }, [
    activeView,
    board.length,
    dailyDateKey,
    difficulty,
    hasCompletedOnboarding,
    isDailyMode,
    isEndlessMode,
    isIntroVisible,
    session?.user.id,
    sessionIsPending,
    startDailyPuzzle,
    startEndlessPuzzle,
    startPresetGame,
  ]);

  useEffect(() => {
    if (
      !hasCompletedOnboarding ||
      isIntroVisible ||
      activeView !== "game" ||
      !isDailyMode ||
      board.length > 0
    ) {
      return;
    }

    void startDailyPuzzle(dailyDateKey);
  }, [activeView, board.length, dailyDateKey, hasCompletedOnboarding, isDailyMode, isIntroVisible, startDailyPuzzle]);

  const handleDailyOpen = () => {
    setDailyDateKey(getDailyPuzzleDateKey());
    setModeModalOpen(false);
    setShopModalOpen(false);
    setLeaderboardModalOpen(false);
    setDailyModalOpen(true);
  };

  const handleDailyStart = () => {
    void startDailyPuzzle(dailyDateKey);
  };

  const handleDailyReplay = () => {
    void startDailyPuzzle(dailyDateKey);
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

    if (isEndlessMode) {
      setEndlessStreak(0);
      void startEndlessPuzzle(1, true);
      return;
    }

    void startPresetGame(difficulty as Exclude<DifficultyKey, "endless">);
  };

  const handleEndlessReplay = () => {
    setEndlessStreak(0);
    void startEndlessPuzzle(1, true);
  };

  const handleEndlessNextPuzzle = async () => {
    await verifiedCompletionRef.current;
    const nextPuzzleNumber = endlessPuzzleNumber + 1;
    await startEndlessPuzzle(nextPuzzleNumber);
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
      clearGameStartPreview();
      setPreviewActive(false);
      clearDragSession();
      setModeModalOpen(false);
      setShopModalOpen(false);
      setLeaderboardModalOpen(false);
      setDailyModalOpen(false);
      setTimerStarted(true);
    }

    setActiveView(nextView);
  }, [clearDragSession, clearGameStartPreview]);

  const handleLogoClick = useCallback(() => {
    setHudFeedbackKey((currentKey) => currentKey + 1);
    handleNavigateView("game");
  }, [handleNavigateView]);

  const handlePlayerNameChange = useCallback((nextValue: string) => {
    setPlayerNameInput(nextValue.slice(0, PLAYER_NAME_MAX_LENGTH));
    setPlayerNameError(null);
  }, []);

  const handleIntroAccountAction = useCallback((mode: AccountAuthMode) => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const handleIntroSignOut = useCallback(async () => {
    setIsSigningOut(true);
    setPlayerNameError(null);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setPlayerNameError(result.error.message ?? "Your account could not be signed out.");
        return;
      }

      const guestPlayerName = generateGuestPlayerName();
      clearStoredPlayerData(window.localStorage);
      window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, guestPlayerName);
      setPlayerNameInput(guestPlayerName);
    } catch {
      setPlayerNameError("Your account could not be signed out.");
    } finally {
      setIsSigningOut(false);
    }
  }, []);

  const handleIntroPlay = useCallback(() => {
    const sanitizedPlayerName = session ? accountPlayerName : sanitizePlayerName(playerNameInput);

    if (!sanitizedPlayerName) {
      setPlayerNameError("Enter a player name.");
      return;
    }

    window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, sanitizedPlayerName);
    window.localStorage.setItem(INTRO_COMPLETED_STORAGE_KEY, "true");
    setPlayerNameInput(sanitizedPlayerName);
    setPlayerNameError(null);
    setHasCompletedOnboarding(true);
    setIsIntroVisible(false);
    setActiveView(hasCompletedOnboarding ? "game" : "tutorial");
    setTimerStarted(true);
  }, [accountPlayerName, hasCompletedOnboarding, playerNameInput, session]);

  const hudFeedbackMotion = {
    animate: hudFeedbackControls,
    initial: false,
  };

  if (!isOnboardingReady || sessionIsPending) {
    return <main className="theme-page-bg min-h-dvh" />;
  }

  return (
    <main className={`theme-page-bg min-h-dvh overflow-x-hidden px-[clamp(0.5rem,2vw,1.25rem)] py-0 ${activeView === "game" || activeView === "tutorial" ? "overflow-y-hidden" : "overflow-y-auto"}`}>
      <div ref={pageShellRef} className="game-page-shell mx-auto flex h-[100dvh] min-h-0 w-full max-w-[72rem] flex-col gap-[clamp(0.35rem,0.9vw,0.7rem)]">
        <Header ref={headerRef} onLogoClick={handleLogoClick} onNavigateView={handleNavigateView} />
        <Analytics />
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
                    }
                  : undefined
              }
              endlessInfo={
                isDailyMode
                  ? {
                      label: `Daily ${dailyPuzzle.difficulty === "normal" ? "Normal" : "Hard"} · ${dailyPuzzleStyleLabel}`,
                      puzzleNumber: 1,
                      styleLabel: dailyPuzzleStyleLabel,
                      swapBudget: dailySwapBudget,
                    }
                  : isEndlessMode
                    ? {
                        label: `Puzzle ${endlessPuzzleNumber} · ${endlessPuzzle.name} · ${endlessPuzzleStyleLabel}`,
                        puzzleNumber: endlessPuzzleNumber,
                        styleLabel: endlessPuzzleStyleLabel,
                        swapBudget: endlessSwapBudget,
                      }
                    : undefined
              }
              gradientQuality={gradientQuality}
              moves={moves}
              timeDisplay={formatTime(timeLeft)}
              timeWarning={activeUsesCountdown && timeLeft <= 10}
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
              dropTargetRect={dropTargetRect}
              getTileRef={getTileRef}
              interactionDisabled={previewActive || dailyFailureReason !== null || !timerStarted}
              previewCountdown={previewActive ? previewCountdown : null}
              setDragOverlayRef={setDragOverlayRef}
              tileRadiusClass={tileRadiusClass}
              visualMode={isBlackAndWhiteRun && !previewActive ? "grayscale" : boardVisualMode}
              confettiActive={confettiActive}
              winWaveActive={winWaveActive}
              winState={winState}
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
            className="restart-area relative z-10 flex w-full justify-center"
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
            moves={moves}
            onRestart={handleRestartGame}
            personalBestStatus={personalBestStatus}
            timeDisplay={formatTime(solveTime)}
            winState={winModalVisible}
          />
          <VerificationRetryModal
            isOpen={verificationRetryStatus !== "hidden"}
            isRetrying={verificationRetryStatus === "retrying"}
            onContinueUnranked={handleContinueUnranked}
            onRetry={handleVerificationRetry}
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
            failureReason={dailyFailureReason}
            isOpen={dailyModalOpen}
            onClose={() => setDailyModalOpen(false)}
            onStart={handleDailyStart}
            record={dailyRecordForToday}
            challengeLabel={dailyPuzzle.challengeLabel}
            difficulty={dailyPuzzle.difficulty}
            size={dailyPuzzle.size}
            swapBudget={dailySwapBudget}
            timeLimitSeconds={dailyPuzzle.timeLimitSeconds}
          />
          <LeaderboardModal
            dailyDateKey={dailyDateKey}
            isOpen={leaderboardModalOpen}
            onClose={() => setLeaderboardModalOpen(false)}
          />
        </>
      )}

      {activeView === "game" && isIntroVisible && (
        <IntroOnboarding
          accountName={accountPlayerName}
          introStep={introStep}
          isSigningOut={isSigningOut}
          isSignedIn={Boolean(session)}
          nameError={playerNameError}
          onAccountAction={handleIntroAccountAction}
          onNameChange={handlePlayerNameChange}
          onPlay={handleIntroPlay}
          onSignOut={handleIntroSignOut}
          playerNameInput={playerNameInput}
        />
      )}
      <AccountAuthModal
        initialMode={authModalMode}
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
      <AchievementToast
        key={session?.user.id ?? "guest"}
        achievement={currentAnnouncement}
        onDismiss={dismissAnnouncement}
      />
    </main>
  );
}
