export type Tile = {
  id: string;
  correctIndex: number;
  currentIndex: number;
  color: string;
  isCorner: boolean;
};

export type PresetDifficultyKey = "normal" | "hard" | "expert" | "extreme";

export type ModeStyle = "color" | "black-and-white";

export type RevealStainEdge = "top" | "right" | "bottom" | "left";

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
  time: number;
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
