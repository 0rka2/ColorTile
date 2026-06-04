export type Tile = {
  id: string;
  correctIndex: number;
  currentIndex: number;
  color: string;
  isCorner: boolean;
};

export type DifficultyKey = "normal" | "hard" | "expert" | "extreme" | "custom";

export type DifficultyConfig = {
  label: string;
  size: number;
  time: number;
};
