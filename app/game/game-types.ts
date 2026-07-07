export type Tile = {
  id: string;
  correctIndex: number;
  currentIndex: number;
  color: string;
  isCorner: boolean;
};

export type DifficultyKey = "normal" | "hard" | "expert" | "extreme" | "endless";

export type DifficultyConfig = {
  label: string;
  size: number;
  time: number;
};

export type PresetDifficultyKey = Exclude<DifficultyKey, "endless">;

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
