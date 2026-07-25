export type Tile = {
  id: string;
  correctIndex: number;
  currentIndex: number;
  color: string;
  isCorner: boolean;
};

export type PresetDifficultyKey = "normal" | "hard" | "expert" | "extreme";

export type ModeStyle = "color" | "black-and-white";

export type DailyPuzzleType =
  | "classic"
  | "black-and-white"
  | "limited-swaps"
  | "time-limit";

export type DailyFailureReason = "swap-limit" | "time-limit";

export type EndlessPuzzleType =
  | "classic"
  | "limited-swaps"
  | "black-and-white"
  | "countdown"
  | "countdown-swaps"
  | "black-and-white-countdown"
  | "black-and-white-countdown-swaps";

export type BlackAndWhiteModeKey =
  | "black-and-white-normal"
  | "black-and-white-hard"
  | "black-and-white-expert"
  | "black-and-white-extreme";

export type PresetModeKey = PresetDifficultyKey | BlackAndWhiteModeKey;

export type DifficultyKey = PresetModeKey | "endless";

export type DifficultyConfig = {
  label: string;
  size: number;
};

export type DailyPuzzleDefinition = DifficultyConfig & {
  challengeLabel: string;
  difficulty: Extract<PresetDifficultyKey, "normal" | "hard">;
  style: ModeStyle;
  swapBudget: number | null;
  timeLimitSeconds: number | null;
  type: DailyPuzzleType;
};

export type EndlessPuzzleDefinition = DifficultyConfig & {
  challengeLabel: string;
  name: string;
  style: ModeStyle;
  swapBudget: number | null;
  threeStarMoveLimit: number;
  timeLimitSeconds: number | null;
  type: EndlessPuzzleType;
  usesCountdown: boolean;
  usesSwapLimit: boolean;
};

export type BestRecord = {
  bestCompletion?: number;
  bestSolveTime?: number;
  bestTimeLeft?: number;
  fewestMoves?: number;
};

export type BestStats = Partial<Record<DifficultyKey, BestRecord>>;

export type EndlessStats = {
  clears: number;
  threeStarClears: number;
  bestStreak: number;
};

export type DailyPuzzleRecord = {
  bestSolveTime?: number;
  completed: boolean;
  dateKey: string;
  fewestMoves?: number;
  style: ModeStyle;
};
