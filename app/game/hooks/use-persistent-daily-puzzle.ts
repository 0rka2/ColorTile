"use client";

import { useEffect, useState } from "react";

import type { DailyPuzzleRecord } from "../game-types";
import { DAILY_PUZZLE_STORAGE_KEY } from "../player-progress";

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

      setDailyRecord(JSON.parse(stored) as DailyPuzzleRecord);
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

    if (!dailyRecord) {
      return;
    }

    window.localStorage.setItem(DAILY_PUZZLE_STORAGE_KEY, JSON.stringify(dailyRecord));
  }, [dailyRecord]);

  return { dailyRecord, isLoaded, setDailyRecord };
}
