"use client";

import { useEffect, useState } from "react";

import type { EndlessStats } from "../game-types";

const ENDLESS_STATS_STORAGE_KEY = "colortile-endless-stats";

export const EMPTY_ENDLESS_STATS: EndlessStats = {
  clears: 0,
  threeStarClears: 0,
  bestStreak: 0,
};

export function usePersistentEndlessStats() {
  const [endlessStats, setEndlessStats] = useState<EndlessStats>(EMPTY_ENDLESS_STATS);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(ENDLESS_STATS_STORAGE_KEY);
      if (!stored) {
        return;
      }

      setEndlessStats({
        ...EMPTY_ENDLESS_STATS,
        ...(JSON.parse(stored) as Partial<EndlessStats>),
      });
    } catch {
      // Ignore malformed local storage and start fresh.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ENDLESS_STATS_STORAGE_KEY, JSON.stringify(endlessStats));
  }, [endlessStats]);

  return { endlessStats, setEndlessStats };
}
