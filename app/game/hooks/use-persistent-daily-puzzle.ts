"use client";

import { useEffect, useState } from "react";

import type { DailyPuzzleRecord } from "../game-types";
import {
  DAILY_PUZZLE_STORAGE_KEY,
  normalizePlayerProgress,
} from "../player-progress";

export function usePersistentDailyPuzzle() {
  const [dailyRecord, setDailyRecord] = useState<DailyPuzzleRecord | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(DAILY_PUZZLE_STORAGE_KEY);
      if (!stored) {
        return;
      }

      setDailyRecord(
        normalizePlayerProgress({ dailyRecord: JSON.parse(stored) }).dailyRecord,
      );
    } catch {
      // Ignore malformed local storage and start fresh.
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) {
      return;
    }

    if (!dailyRecord) {
      return;
    }

    window.localStorage.setItem(DAILY_PUZZLE_STORAGE_KEY, JSON.stringify(dailyRecord));
  }, [dailyRecord, isLoaded]);

  return { dailyRecord, isLoaded, setDailyRecord };
}
