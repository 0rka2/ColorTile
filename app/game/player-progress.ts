import type {
  BestRecord,
  BestStats,
  DailyPuzzleRecord,
  DifficultyKey,
  EndlessStats,
  ModeStyle,
} from "./game-types";

export const BEST_STATS_STORAGE_KEY = "colortile-best-stats";
export const DAILY_PUZZLE_STORAGE_KEY = "colortile-daily-puzzle";
export const ENDLESS_STATS_STORAGE_KEY = "colortile-endless-stats";
export const PLAYER_NAME_STORAGE_KEY = "colortile-leaderboard-player-name";
export const PLAYER_DATA_OWNER_STORAGE_KEY = "colortile-player-data-owner";
export const PLAYER_NAME_MAX_LENGTH = 24;
export const PLAYER_DATA_STORAGE_KEYS = [
  PLAYER_NAME_STORAGE_KEY,
  BEST_STATS_STORAGE_KEY,
  DAILY_PUZZLE_STORAGE_KEY,
  ENDLESS_STATS_STORAGE_KEY,
  PLAYER_DATA_OWNER_STORAGE_KEY,
] as const;

export type PlayerProgress = {
  bestStats: BestStats;
  dailyRecord: DailyPuzzleRecord | null;
  endlessStats: EndlessStats;
};

export const EMPTY_ENDLESS_STATS: EndlessStats = {
  clears: 0,
  threeStarClears: 0,
  bestStreak: 0,
};

export const EMPTY_PLAYER_PROGRESS: PlayerProgress = {
  bestStats: {},
  dailyRecord: null,
  endlessStats: EMPTY_ENDLESS_STATS,
};

export function sanitizePlayerName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, PLAYER_NAME_MAX_LENGTH);
}

export function clearStoredPlayerData(
  storage: Pick<Storage, "removeItem">,
) {
  PLAYER_DATA_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
}

export function shouldClearStoredPlayerData(
  previousUserId: string | null | undefined,
  nextUserId: string | null,
) {
  return (
    previousUserId !== undefined &&
    previousUserId !== null &&
    previousUserId !== nextUserId
  );
}

const DIFFICULTIES: DifficultyKey[] = [
  "normal",
  "hard",
  "expert",
  "extreme",
  "black-and-white-normal",
  "black-and-white-hard",
  "black-and-white-expert",
  "black-and-white-extreme",
  "endless",
];

function readFiniteNumber(value: unknown, minimum = 0) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum
    ? value
    : undefined;
}

function readPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

function normalizeBestRecord(value: unknown): BestRecord | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const normalized: BestRecord = {
    bestCompletion: readFiniteNumber(record.bestCompletion),
    bestSolveTime: readFiniteNumber(record.bestSolveTime, Number.EPSILON),
    bestTimeLeft: readFiniteNumber(record.bestTimeLeft),
    fewestMoves: readPositiveInteger(record.fewestMoves),
  };

  return Object.values(normalized).some((field) => field !== undefined)
    ? normalized
    : undefined;
}

function normalizeBestStats(value: unknown): BestStats {
  if (!value || typeof value !== "object") {
    return {};
  }

  const source = value as Record<string, unknown>;

  return DIFFICULTIES.reduce<BestStats>((stats, difficulty) => {
    const record = normalizeBestRecord(source[difficulty]);

    if (record) {
      stats[difficulty] = record;
    }

    return stats;
  }, {});
}

function normalizeEndlessStats(value: unknown): EndlessStats {
  if (!value || typeof value !== "object") {
    return EMPTY_ENDLESS_STATS;
  }

  const source = value as Record<string, unknown>;

  return {
    bestStreak: readFiniteNumber(source.bestStreak) ?? 0,
    clears: readFiniteNumber(source.clears) ?? 0,
    threeStarClears: readFiniteNumber(source.threeStarClears) ?? 0,
  };
}

function isModeStyle(value: unknown): value is ModeStyle {
  return value === "color" || value === "black-and-white";
}

function normalizeDailyRecord(value: unknown): DailyPuzzleRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;

  if (
    typeof source.dateKey !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(source.dateKey) ||
    typeof source.completed !== "boolean" ||
    !isModeStyle(source.style)
  ) {
    return null;
  }

  return {
    bestSolveTime: readFiniteNumber(source.bestSolveTime, Number.EPSILON),
    completed: source.completed,
    dateKey: source.dateKey,
    fewestMoves: readPositiveInteger(source.fewestMoves),
    style: source.style,
  };
}

function minimumDefined(first?: number, second?: number) {
  if (first === undefined) {
    return second;
  }

  if (second === undefined) {
    return first;
  }

  return Math.min(first, second);
}

function maximumDefined(first?: number, second?: number) {
  if (first === undefined) {
    return second;
  }

  if (second === undefined) {
    return first;
  }

  return Math.max(first, second);
}

function mergeBestRecord(first?: BestRecord, second?: BestRecord): BestRecord | undefined {
  if (!first) {
    return second;
  }

  if (!second) {
    return first;
  }

  return {
    bestCompletion: maximumDefined(first.bestCompletion, second.bestCompletion),
    bestSolveTime: minimumDefined(first.bestSolveTime, second.bestSolveTime),
    bestTimeLeft: maximumDefined(first.bestTimeLeft, second.bestTimeLeft),
    fewestMoves: minimumDefined(first.fewestMoves, second.fewestMoves),
  };
}

function mergeDailyRecord(
  first: DailyPuzzleRecord | null,
  second: DailyPuzzleRecord | null,
) {
  if (!first) {
    return second;
  }

  if (!second) {
    return first;
  }

  if (first.dateKey !== second.dateKey) {
    return first.dateKey > second.dateKey ? first : second;
  }

  return {
    bestSolveTime: minimumDefined(first.bestSolveTime, second.bestSolveTime),
    completed: first.completed || second.completed,
    dateKey: first.dateKey,
    fewestMoves: minimumDefined(first.fewestMoves, second.fewestMoves),
    style: first.style,
  };
}

export function normalizePlayerProgress(value: unknown): PlayerProgress {
  if (!value || typeof value !== "object") {
    return EMPTY_PLAYER_PROGRESS;
  }

  const source = value as Record<string, unknown>;

  return {
    bestStats: normalizeBestStats(source.bestStats),
    dailyRecord: normalizeDailyRecord(source.dailyRecord),
    endlessStats: normalizeEndlessStats(source.endlessStats),
  };
}

export function mergePlayerProgress(
  firstValue: unknown,
  secondValue: unknown,
): PlayerProgress {
  const first = normalizePlayerProgress(firstValue);
  const second = normalizePlayerProgress(secondValue);
  const bestStats = DIFFICULTIES.reduce<BestStats>((stats, difficulty) => {
    const record = mergeBestRecord(first.bestStats[difficulty], second.bestStats[difficulty]);

    if (record) {
      stats[difficulty] = record;
    }

    return stats;
  }, {});

  return {
    bestStats,
    dailyRecord: mergeDailyRecord(first.dailyRecord, second.dailyRecord),
    endlessStats: {
      bestStreak: Math.max(first.endlessStats.bestStreak, second.endlessStats.bestStreak),
      clears: Math.max(first.endlessStats.clears, second.endlessStats.clears),
      threeStarClears: Math.max(
        first.endlessStats.threeStarClears,
        second.endlessStats.threeStarClears,
      ),
    },
  };
}
