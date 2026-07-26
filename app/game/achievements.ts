import type { PresetDifficultyKey, PresetModeKey } from "./game-types";

export const ACHIEVEMENT_IDS = [
  "first-blend",
  "full-spectrum",
  "into-the-shadows",
  "monochrome-master",
  "complete-collection",
  "quick-blend",
  "fast-hands",
  "expert-pace",
  "extreme-focus",
  "daily-debut",
  "week-of-color",
  "daily-devotee",
  "endless-explorer",
  "long-run",
  "star-collector",
  "unbreakable",
] as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];
export type AchievementCategory = "mastery" | "speed" | "daily" | "endless";

export type AchievementDefinition = {
  badgePath: string;
  category: AchievementCategory;
  description: string;
  id: AchievementId;
  title: string;
};

export type AchievementProgress = {
  bestColorTimes: Partial<Record<PresetDifficultyKey, number>>;
  completedPresetModes: PresetModeKey[];
  dailyClears: number;
  endlessClears: number;
  bestEndlessStreak: number;
  threeStarClears: number;
};

export type AchievementUnlock = {
  id: AchievementId;
  unlockedAt: string;
};

export type AchievementSummary = {
  progress: AchievementProgress;
  unlocked: AchievementUnlock[];
};

export type AchievementEvent =
  | {
      eventId: string;
      kind: "preset";
      mode: PresetModeKey;
      solveTime: number;
    }
  | {
      dateKey: string;
      eventId: string;
      kind: "daily";
    }
  | {
      eventId: string;
      isThreeStar: boolean;
      kind: "endless";
      streak: number;
    };

export const EMPTY_ACHIEVEMENT_PROGRESS: AchievementProgress = {
  bestColorTimes: {},
  completedPresetModes: [],
  dailyClears: 0,
  endlessClears: 0,
  bestEndlessStreak: 0,
  threeStarClears: 0,
};

export const EMPTY_ACHIEVEMENT_SUMMARY: AchievementSummary = {
  progress: EMPTY_ACHIEVEMENT_PROGRESS,
  unlocked: [],
};

export const LOCKED_ACHIEVEMENT_BADGE_PATH = "/achievements/locked.webp";

export const ACHIEVEMENT_CATEGORIES: ReadonlyArray<{
  id: AchievementCategory;
  label: string;
}> = [
  { id: "mastery", label: "Mastery" },
  { id: "speed", label: "Speed" },
  { id: "daily", label: "Daily" },
  { id: "endless", label: "Endless" },
];

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: "first-blend",
    category: "mastery",
    title: "First Blend",
    description: "Complete any color preset.",
    badgePath: "/achievements/first-blend.webp",
  },
  {
    id: "full-spectrum",
    category: "mastery",
    title: "Full Spectrum",
    description: "Complete every color difficulty.",
    badgePath: "/achievements/full-spectrum.webp",
  },
  {
    id: "into-the-shadows",
    category: "mastery",
    title: "Into the Shadows",
    description: "Complete any black-and-white preset.",
    badgePath: "/achievements/into-the-shadows.webp",
  },
  {
    id: "monochrome-master",
    category: "mastery",
    title: "Monochrome Master",
    description: "Complete every black-and-white difficulty.",
    badgePath: "/achievements/monochrome-master.webp",
  },
  {
    id: "complete-collection",
    category: "mastery",
    title: "Complete Collection",
    description: "Complete all eight preset modes.",
    badgePath: "/achievements/complete-collection.webp",
  },
  {
    id: "quick-blend",
    category: "speed",
    title: "Quick Blend",
    description: "Complete Normal in under one minute.",
    badgePath: "/achievements/quick-blend.webp",
  },
  {
    id: "fast-hands",
    category: "speed",
    title: "Fast Hands",
    description: "Complete Hard in under two minutes and thirty seconds.",
    badgePath: "/achievements/fast-hands.webp",
  },
  {
    id: "expert-pace",
    category: "speed",
    title: "Expert Pace",
    description: "Complete Expert in under four minutes.",
    badgePath: "/achievements/expert-pace.webp",
  },
  {
    id: "extreme-focus",
    category: "speed",
    title: "Extreme Focus",
    description: "Complete Extreme in under five minutes and thirty seconds.",
    badgePath: "/achievements/extreme-focus.webp",
  },
  {
    id: "daily-debut",
    category: "daily",
    title: "Daily Debut",
    description: "Complete your first daily puzzle.",
    badgePath: "/achievements/daily-debut.webp",
  },
  {
    id: "week-of-color",
    category: "daily",
    title: "Week of Color",
    description: "Complete daily puzzles on seven different days.",
    badgePath: "/achievements/week-of-color.webp",
  },
  {
    id: "daily-devotee",
    category: "daily",
    title: "Daily Devotee",
    description: "Complete daily puzzles on thirty different days.",
    badgePath: "/achievements/daily-devotee.webp",
  },
  {
    id: "endless-explorer",
    category: "endless",
    title: "Endless Explorer",
    description: "Clear your first endless puzzle.",
    badgePath: "/achievements/endless-explorer.webp",
  },
  {
    id: "long-run",
    category: "endless",
    title: "Long Run",
    description: "Clear twenty-five endless puzzles.",
    badgePath: "/achievements/long-run.webp",
  },
  {
    id: "star-collector",
    category: "endless",
    title: "Star Collector",
    description: "Earn ten three-star endless clears.",
    badgePath: "/achievements/star-collector.webp",
  },
  {
    id: "unbreakable",
    category: "endless",
    title: "Unbreakable",
    description: "Reach an endless streak of ten.",
    badgePath: "/achievements/unbreakable.webp",
  },
];

const COLOR_MODES: PresetModeKey[] = ["normal", "hard", "expert", "extreme"];
const BLACK_AND_WHITE_MODES: PresetModeKey[] = [
  "black-and-white-normal",
  "black-and-white-hard",
  "black-and-white-expert",
  "black-and-white-extreme",
];

export function getAchievementDefinition(id: AchievementId) {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id);
}

export function getEligibleAchievementIds(
  progress: AchievementProgress,
): AchievementId[] {
  const completedModes = new Set(progress.completedPresetModes);
  const hasEveryColorMode = COLOR_MODES.every((mode) => completedModes.has(mode));
  const hasEveryBlackAndWhiteMode = BLACK_AND_WHITE_MODES.every((mode) =>
    completedModes.has(mode),
  );

  return [
    completedModes.has("normal") ||
    completedModes.has("hard") ||
    completedModes.has("expert") ||
    completedModes.has("extreme")
      ? "first-blend"
      : null,
    hasEveryColorMode ? "full-spectrum" : null,
    BLACK_AND_WHITE_MODES.some((mode) => completedModes.has(mode))
      ? "into-the-shadows"
      : null,
    hasEveryBlackAndWhiteMode ? "monochrome-master" : null,
    hasEveryColorMode && hasEveryBlackAndWhiteMode
      ? "complete-collection"
      : null,
    (progress.bestColorTimes.normal ?? Number.POSITIVE_INFINITY) < 60
      ? "quick-blend"
      : null,
    (progress.bestColorTimes.hard ?? Number.POSITIVE_INFINITY) < 150
      ? "fast-hands"
      : null,
    (progress.bestColorTimes.expert ?? Number.POSITIVE_INFINITY) < 240
      ? "expert-pace"
      : null,
    (progress.bestColorTimes.extreme ?? Number.POSITIVE_INFINITY) < 330
      ? "extreme-focus"
      : null,
    progress.dailyClears >= 1 ? "daily-debut" : null,
    progress.dailyClears >= 7 ? "week-of-color" : null,
    progress.dailyClears >= 30 ? "daily-devotee" : null,
    progress.endlessClears >= 1 ? "endless-explorer" : null,
    progress.endlessClears >= 25 ? "long-run" : null,
    progress.threeStarClears >= 10 ? "star-collector" : null,
    progress.bestEndlessStreak >= 10 ? "unbreakable" : null,
  ].filter((id): id is AchievementId => id !== null);
}

export function isAchievementId(value: unknown): value is AchievementId {
  return (
    typeof value === "string" &&
    (ACHIEVEMENT_IDS as readonly string[]).includes(value)
  );
}
