import {
  BlackAndWhiteModeKey,
  DifficultyConfig,
  DifficultyKey,
  EndlessPuzzleType,
  ModeStyle,
  PresetDifficultyKey,
  PresetModeKey,
  Tile,
} from "./game-types";

type RandomSource = () => number;

export const PRESET_DIFFICULTIES: Record<PresetDifficultyKey, DifficultyConfig> = {
  normal: { label: "Normal", size: 4, time: 120 },
  hard: { label: "Hard", size: 5, time: 240 },
  expert: { label: "Expert", size: 6, time: 360 },
  extreme: { label: "Extreme", size: 7, time: 420 },
};

export const PRESET_MODE_DIFFICULTIES: PresetDifficultyKey[] = [
  "normal",
  "hard",
  "expert",
  "extreme",
];

export const COLOR_PRESET_MODE_KEYS: PresetDifficultyKey[] = [...PRESET_MODE_DIFFICULTIES];

export const BLACK_AND_WHITE_PRESET_MODE_KEYS: BlackAndWhiteModeKey[] = [
  "black-and-white-normal",
  "black-and-white-hard",
  "black-and-white-expert",
  "black-and-white-extreme",
];

export const PRESET_MODE_KEYS: PresetModeKey[] = [
  ...COLOR_PRESET_MODE_KEYS,
  ...BLACK_AND_WHITE_PRESET_MODE_KEYS,
];

export type GameModeDefinition = DifficultyConfig & {
  baseDifficulty: PresetDifficultyKey | null;
  isEndless: boolean;
  key: DifficultyKey;
  leaderboardDifficulty: DifficultyKey;
  style: ModeStyle | "endless";
};

export const GAME_MODE_DEFINITIONS: Record<DifficultyKey, GameModeDefinition> = {
  normal: {
    ...PRESET_DIFFICULTIES.normal,
    baseDifficulty: "normal",
    isEndless: false,
    key: "normal",
    leaderboardDifficulty: "normal",
    style: "color",
  },
  hard: {
    ...PRESET_DIFFICULTIES.hard,
    baseDifficulty: "hard",
    isEndless: false,
    key: "hard",
    leaderboardDifficulty: "hard",
    style: "color",
  },
  expert: {
    ...PRESET_DIFFICULTIES.expert,
    baseDifficulty: "expert",
    isEndless: false,
    key: "expert",
    leaderboardDifficulty: "expert",
    style: "color",
  },
  extreme: {
    ...PRESET_DIFFICULTIES.extreme,
    baseDifficulty: "extreme",
    isEndless: false,
    key: "extreme",
    leaderboardDifficulty: "extreme",
    style: "color",
  },
  "black-and-white-normal": {
    ...PRESET_DIFFICULTIES.normal,
    baseDifficulty: "normal",
    isEndless: false,
    key: "black-and-white-normal",
    label: "B&W Normal",
    leaderboardDifficulty: "black-and-white-normal",
    style: "black-and-white",
  },
  "black-and-white-hard": {
    ...PRESET_DIFFICULTIES.hard,
    baseDifficulty: "hard",
    isEndless: false,
    key: "black-and-white-hard",
    label: "B&W Hard",
    leaderboardDifficulty: "black-and-white-hard",
    style: "black-and-white",
  },
  "black-and-white-expert": {
    ...PRESET_DIFFICULTIES.expert,
    baseDifficulty: "expert",
    isEndless: false,
    key: "black-and-white-expert",
    label: "B&W Expert",
    leaderboardDifficulty: "black-and-white-expert",
    style: "black-and-white",
  },
  "black-and-white-extreme": {
    ...PRESET_DIFFICULTIES.extreme,
    baseDifficulty: "extreme",
    isEndless: false,
    key: "black-and-white-extreme",
    label: "B&W Extreme",
    leaderboardDifficulty: "black-and-white-extreme",
    style: "black-and-white",
  },
  endless: {
    baseDifficulty: null,
    isEndless: true,
    key: "endless",
    label: "Endless",
    leaderboardDifficulty: "endless",
    size: 0,
    style: "endless",
    time: 0,
  },
};

export const DIFFICULTY_LABELS: Record<DifficultyKey, string> = Object.fromEntries(
  Object.entries(GAME_MODE_DEFINITIONS).map(([key, mode]) => [key, mode.label]),
) as Record<DifficultyKey, string>;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function getEndlessPuzzleSize(puzzleNumber: number) {
  if (puzzleNumber <= 5) {
    return 4;
  }

  if (puzzleNumber <= 10) {
    return 5;
  }

  if (puzzleNumber <= 15) {
    return 6;
  }

  return 7;
}

export function getEndlessSwapBudget(size: number, streak: number) {
  return Math.max(size + 4, size * size - 1 - Math.floor(streak / 3));
}

export function getEndlessThreeStarMoveLimit(swapBudget: number) {
  return Math.ceil(swapBudget * 0.7);
}

export function getEndlessCountdownDuration(size: number) {
  if (size === PRESET_DIFFICULTIES.normal.size) {
    return 150;
  }

  if (size === PRESET_DIFFICULTIES.hard.size) {
    return 210;
  }

  return 0;
}

export function getEndlessPuzzleType(size: number, randomValue = Math.random()): EndlessPuzzleType {
  if (size === PRESET_DIFFICULTIES.normal.size) {
    if (randomValue < 0.35) {
      return "countdown";
    }

    if (randomValue < 0.65) {
      return "countdown-swaps";
    }

    return "classic";
  }

  if (size === PRESET_DIFFICULTIES.hard.size) {
    if (randomValue < 0.3) {
      return "black-and-white";
    }

    if (randomValue < 0.55) {
      return "countdown";
    }

    if (randomValue < 0.8) {
      return "countdown-swaps";
    }
  }

  return "classic";
}

export function getEndlessPuzzleStyle(size: number, randomValue = Math.random()): ModeStyle {
  if (size !== PRESET_DIFFICULTIES.hard.size) {
    return "color";
  }

  return randomValue < 0.3 ? "black-and-white" : "color";
}

export function getEndlessTypeStyle(type: EndlessPuzzleType): ModeStyle {
  return type === "black-and-white" ? "black-and-white" : "color";
}

export function getEndlessPuzzleTypeLabel(type: EndlessPuzzleType) {
  switch (type) {
    case "black-and-white":
      return "B&W";
    case "countdown":
      return "Countdown";
    case "countdown-swaps":
      return "Countdown + Swaps";
    default:
      return "Classic";
  }
}

export function endlessTypeUsesCountdown(type: EndlessPuzzleType) {
  return type === "countdown" || type === "countdown-swaps";
}

export function endlessTypeUsesSwapLimit(type: EndlessPuzzleType) {
  return type === "classic" || type === "black-and-white" || type === "countdown-swaps";
}

export function getEndlessPuzzleSwapBudget(size: number, streak: number, type: EndlessPuzzleType) {
  const baseBudget = getEndlessSwapBudget(size, streak);

  if (type === "countdown-swaps") {
    return baseBudget + 3;
  }

  return baseBudget;
}

export function getDailyPuzzleDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function createSeededRandom(seed: string): RandomSource {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function getDailyPuzzleStyle(randomValue: number): ModeStyle {
  return getEndlessPuzzleStyle(PRESET_DIFFICULTIES.hard.size, randomValue);
}

export function getDailyPuzzleConfig(): DifficultyConfig {
  return {
    label: "Daily Puzzle",
    size: PRESET_DIFFICULTIES.hard.size,
    time: 0,
  };
}

export function getEndlessConfig(puzzleNumber: number): DifficultyConfig {
  const size = getEndlessPuzzleSize(puzzleNumber);

  return {
    label: "Endless",
    size,
    time: 0,
  };
}

export function getModeStyle(modeKey: DifficultyKey): ModeStyle {
  return GAME_MODE_DEFINITIONS[modeKey].style === "black-and-white"
    ? "black-and-white"
    : "color";
}

export function isBlackAndWhiteMode(modeKey: DifficultyKey) {
  return GAME_MODE_DEFINITIONS[modeKey].style === "black-and-white";
}

export function isPresetMode(modeKey: DifficultyKey): modeKey is PresetModeKey {
  return modeKey !== "endless";
}

export function getPresetModeKey(
  style: ModeStyle,
  difficulty: PresetDifficultyKey,
): PresetModeKey {
  if (style === "color") {
    return difficulty;
  }

  return `black-and-white-${difficulty}` as BlackAndWhiteModeKey;
}

export function getGameModeConfig(
  modeKey: DifficultyKey,
  options?: { endlessPuzzleNumber?: number },
): DifficultyConfig {
  if (modeKey === "endless") {
    return getEndlessConfig(options?.endlessPuzzleNumber ?? 1);
  }

  const mode = GAME_MODE_DEFINITIONS[modeKey];
  return {
    label: mode.label,
    size: mode.size,
    time: mode.time,
  };
}

function getGradientContrastBoost(size: number) {
  return clamp((size - 4) / 16, 0, 0.45);
}

function remapCenteredRatio(value: number, strength: number) {
  const centered = value - 0.5;
  return clamp(0.5 + centered * (1 + strength), 0, 1);
}

export function generateCornerColors(size: number, random: RandomSource = Math.random): [string, string, string, string] {
  const hue = random() * 360;
  const contrastBoost = getGradientContrastBoost(size);
  const topRightOffset = 45 + contrastBoost * 6;
  const bottomLeftOffset = 190 + contrastBoost * 4;
  const bottomRightOffset = 235 + contrastBoost * 8;
  const build = (offset: number) =>
    hslToHex(
      (hue + offset) % 360,
      clamp(78 + contrastBoost * 12 + random() * 5, 74, 88),
      clamp(74 - contrastBoost * 11 + (random() - 0.5) * (18 + contrastBoost * 10), 40, 78),
    );

  return [build(0), build(topRightOffset), build(bottomLeftOffset), build(bottomRightOffset)];
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));

  return `#${[f(0), f(8), f(4)].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgb(hex: string) {
  const sanitized = hex.replace("#", "");
  return {
    r: Number.parseInt(sanitized.slice(0, 2), 16),
    g: Number.parseInt(sanitized.slice(2, 4), 16),
    b: Number.parseInt(sanitized.slice(4, 6), 16),
  };
}

export function rgbToHsl(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness * 100 };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue: number;

  switch (max) {
    case red:
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
      break;
    case green:
      hue = (blue - red) / delta + 2;
      break;
    default:
      hue = (red - green) / delta + 4;
      break;
  }

  return {
    h: hue * 60,
    s: saturation * 100,
    l: lightness * 100,
  };
}

export function hexToHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

export function interpolateHue(start: number, end: number, amount: number) {
  const shortestPath = ((end - start + 540) % 360) - 180;
  return (start + shortestPath * amount + 360) % 360;
}

export function interpolateColors(
  topLeft: string,
  topRight: string,
  bottomLeft: string,
  bottomRight: string,
  xRatio: number,
  yRatio: number,
  contrastBoost = 0,
): string {
  const tl = hexToHsl(topLeft);
  const tr = hexToHsl(topRight);
  const bl = hexToHsl(bottomLeft);
  const br = hexToHsl(bottomRight);
  const mappedXRatio = remapCenteredRatio(xRatio, contrastBoost * 0.05);
  const mappedYRatio = remapCenteredRatio(yRatio, contrastBoost * 0.05);

  const blend = (start: number, end: number, amount: number) => start + (end - start) * amount;
  const mixHueAxis = (top: number, bottom: number) => interpolateHue(top, bottom, mappedYRatio);
  const mixAxis = (top: number, bottom: number) => blend(top, bottom, mappedYRatio);

  const leftHue = mixHueAxis(tl.h, bl.h);
  const rightHue = mixHueAxis(tr.h, br.h);
  const hue = interpolateHue(leftHue, rightHue, mappedXRatio);

  const baseSaturation = blend(mixAxis(tl.s, bl.s), mixAxis(tr.s, br.s), mappedXRatio);
  const saturation = clamp(baseSaturation + 6 + contrastBoost * 10, 50, 88);
  const baseLightness = blend(mixAxis(tl.l, bl.l), mixAxis(tr.l, br.l), mappedXRatio);
  const lightness = clamp(
    58 + (baseLightness - 58) * (1 + contrastBoost * 0.44),
    34,
    76,
  );

  return hslToHex(hue, saturation, lightness);
}

export function generateSolvedBoard(size: number, corners: [string, string, string, string]): Tile[] {
  const [topLeft, topRight, bottomLeft, bottomRight] = corners;
  const lastIndex = size - 1;
  const contrastBoost = getGradientContrastBoost(size);

  return Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size);
    const column = index % size;
    const xRatio = size === 1 ? 0 : column / lastIndex;
    const yRatio = size === 1 ? 0 : row / lastIndex;
    const isCorner =
      (row === 0 && column === 0) ||
      (row === 0 && column === lastIndex) ||
      (row === lastIndex && column === 0) ||
      (row === lastIndex && column === lastIndex);

    return {
      id: `tile-${index}`,
      correctIndex: index,
      currentIndex: index,
      color: interpolateColors(
        topLeft,
        topRight,
        bottomLeft,
        bottomRight,
        xRatio,
        yRatio,
        contrastBoost,
      ),
      isCorner,
    };
  });
}

export function scrambleBoard(solvedBoard: Tile[], random: RandomSource = Math.random): Tile[] {
  const movableTiles = solvedBoard.filter((tile) => !tile.isCorner);
  const shuffled = [...movableTiles];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  for (let index = 0; index < shuffled.length; index += 1) {
    if (shuffled[index].id !== movableTiles[index].id) {
      continue;
    }

    const swapIndex = index === shuffled.length - 1 ? index - 1 : index + 1;
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  let movablePointer = 0;

  return solvedBoard.map((tile, index) => {
    if (tile.isCorner) {
      return { ...tile, currentIndex: index };
    }

    const nextTile = shuffled[movablePointer];
    movablePointer += 1;
    return { ...nextTile, currentIndex: index };
  });
}

export function swapTiles(board: Tile[], firstIndex: number, secondIndex: number): Tile[] {
  const nextBoard = [...board];
  const firstTile = nextBoard[firstIndex];
  const secondTile = nextBoard[secondIndex];

  nextBoard[firstIndex] = { ...secondTile, currentIndex: firstIndex };
  nextBoard[secondIndex] = { ...firstTile, currentIndex: secondIndex };

  return nextBoard;
}

export function checkCompletion(board: Tile[]): number {
  const correctTiles = board.filter((tile, index) => tile.correctIndex === index).length;
  return Math.round((correctTiles / board.length) * 100);
}

export function isSolved(board: Tile[]): boolean {
  return board.every((tile, index) => tile.correctIndex === index);
}

export function isTileCorrect(tile: Tile, index: number): boolean {
  return tile.correctIndex === index;
}

export function isTileLocked(tile: Tile, index: number): boolean {
  return tile.isCorner || isTileCorrect(tile, index);
}

export function formatTime(seconds: number, options?: { roundUp?: boolean }) {
  const safeSeconds = Math.max(0, seconds);
  const displaySeconds = options?.roundUp ? Math.ceil(safeSeconds) : Math.floor(safeSeconds);

  if (safeSeconds < 60) {
    return safeSeconds.toFixed(1);
  }

  const minutes = Math.floor(displaySeconds / 60);
  const remainder = displaySeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function getTileRadiusClass(size: number) {
  if (size >= 12) {
    return "rounded-md";
  }

  if (size >= 9) {
    return "rounded-lg";
  }

  if (size >= 6) {
    return "rounded-xl";
  }

  return "rounded-[1.35rem]";
}

export function getBoardDensityClass(size: number) {
  if (size >= 18) {
    return "board-grid--dense";
  }

  if (size >= 10) {
    return "board-grid--compact";
  }

  return "board-grid--default";
}
