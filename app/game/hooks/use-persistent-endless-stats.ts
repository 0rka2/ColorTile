"use client";

import { useEffect, useState } from "react";

import type { EndlessStats } from "../game-types";
import {
  EMPTY_ENDLESS_STATS,
  ENDLESS_STATS_STORAGE_KEY,
} from "../player-progress";

export { EMPTY_ENDLESS_STATS } from "../player-progress";

export function usePersistentEndlessStats() {
  const [endlessStats, setEndlessStats] = useState<EndlessStats>(EMPTY_ENDLESS_STATS);
  const [isLoaded, setIsLoaded] = useState(false);

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
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ENDLESS_STATS_STORAGE_KEY, JSON.stringify(endlessStats));
  }, [endlessStats]);

  return { endlessStats, isLoaded, setEndlessStats };
}
