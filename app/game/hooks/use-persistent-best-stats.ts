"use client";

import { useEffect, useState } from "react";

import type { BestStats } from "../game-types";
import { BEST_STATS_STORAGE_KEY } from "../player-progress";

export function usePersistentBestStats() {
  const [bestStats, setBestStats] = useState<BestStats>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(BEST_STATS_STORAGE_KEY);
      if (!stored) {
        return;
      }

      setBestStats(JSON.parse(stored) as BestStats);
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

    window.localStorage.setItem(BEST_STATS_STORAGE_KEY, JSON.stringify(bestStats));
  }, [bestStats]);

  return { bestStats, isLoaded, setBestStats };
}
