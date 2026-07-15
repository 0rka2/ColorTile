"use client";

import { useEffect, useState } from "react";

import type { DailyPuzzleRecord } from "../game-types";

const DAILY_PUZZLE_STORAGE_KEY = "colortile-daily-puzzle";

export function usePersistentDailyPuzzle() {
  const [dailyRecord, setDailyRecord] = useState<DailyPuzzleRecord | null>(null);

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

  return { dailyRecord, setDailyRecord };
}
