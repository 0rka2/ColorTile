import { DifficultyConfig, DifficultyKey, PresetDifficultyKey, Tile } from "./game-types";

export const PRESET_DIFFICULTIES: Record<PresetDifficultyKey, DifficultyConfig> = {
  normal: { label: "Normal", size: 4, time:  120},
  hard: { label: "Hard", size: 5, time: 240},
  expert: { label: "Expert", size: 6, time: 360 },
  extreme: { label: "Extreme", size: 7, time: 420 },
};

export const DIFFICULTY_LABELS: Record<DifficultyKey, string> = {
  normal: PRESET_DIFFICULTIES.normal.label,
  hard: PRESET_DIFFICULTIES.hard.label,
  expert: PRESET_DIFFICULTIES.expert.label,
  extreme: PRESET_DIFFICULTIES.extreme.label,
  custom: "Custom",
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function getGradientContrastBoost(size: number) {
  return clamp((size - 4) / 16, 0, 0.45);
}

function remapCenteredRatio(value: number, strength: number) {
  const centered = value - 0.5;
  return clamp(0.5 + centered * (1 + strength), 0, 1);
}

export function generateCornerColors(size: number): [string, string, string, string] {
  const hue = Math.random() * 360;
  const contrastBoost = getGradientContrastBoost(size);
  const topRightOffset = 45 + contrastBoost * 6;
  const bottomLeftOffset = 190 + contrastBoost * 4;
  const bottomRightOffset = 235 + contrastBoost * 8;
  const build = (offset: number) =>
    hslToHex(
      (hue + offset) % 360,
      clamp(78 + contrastBoost * 12 + Math.random() * 5, 74, 88),
      clamp(74 - contrastBoost * 11 + (Math.random() - 0.5) * (18 + contrastBoost * 10), 40, 78),
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

export function scrambleBoard(solvedBoard: Tile[]): Tile[] {
  const movableTiles = solvedBoard.filter((tile) => !tile.isCorner);
  const shuffled = [...movableTiles];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
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

export function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
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
