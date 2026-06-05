import { DifficultyConfig, DifficultyKey, PresetDifficultyKey, Tile } from "./game-types";

export const PRESET_DIFFICULTIES: Record<PresetDifficultyKey, DifficultyConfig> = {
  normal: { label: "Normal", size: 4, time: 35 },
  hard: { label: "Hard", size: 6, time: 30 },
  expert: { label: "Expert", size: 7, time: 30 },
  extreme: { label: "Extreme", size: 12, time: 30 },
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

export function generateCornerColors(): [string, string, string, string] {
  const hue = Math.random() * 360;
  const build = (offset: number) =>
    hslToHex((hue + offset) % 360, 72, 78 - Math.random() * 12);

  return [build(0), build(45), build(190), build(235)];
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
): string {
  const tl = hexToHsl(topLeft);
  const tr = hexToHsl(topRight);
  const bl = hexToHsl(bottomLeft);
  const br = hexToHsl(bottomRight);

  const blend = (start: number, end: number, amount: number) => start + (end - start) * amount;
  const mixHueAxis = (top: number, bottom: number) => interpolateHue(top, bottom, yRatio);
  const mixAxis = (top: number, bottom: number) => blend(top, bottom, yRatio);

  const leftHue = mixHueAxis(tl.h, bl.h);
  const rightHue = mixHueAxis(tr.h, br.h);
  const hue = interpolateHue(leftHue, rightHue, xRatio);

  const saturation = Math.max(42, blend(mixAxis(tl.s, bl.s), mixAxis(tr.s, br.s), xRatio));
  const lightness = clamp(blend(mixAxis(tl.l, bl.l), mixAxis(tr.l, br.l), xRatio), 42, 72);

  return hslToHex(hue, saturation, lightness);
}

export function generateSolvedBoard(size: number, corners: [string, string, string, string]): Tile[] {
  const [topLeft, topRight, bottomLeft, bottomRight] = corners;
  const lastIndex = size - 1;

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
      color: interpolateColors(topLeft, topRight, bottomLeft, bottomRight, xRatio, yRatio),
      isCorner,
    };
  });
}

export function scrambleBoard(solvedBoard: Tile[]): Tile[] {
  const movableTiles = solvedBoard.filter((tile) => !tile.isCorner);
  const shuffled = [...movableTiles];
  let isValidShuffle = false;

  while (!isValidShuffle) {
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    isValidShuffle = shuffled.every((tile, index) => tile.id !== movableTiles[index].id);
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
  if (size >= 10) {
    return "rounded-lg";
  }

  if (size >= 7) {
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
