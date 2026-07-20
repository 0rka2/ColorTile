"use client";

import { useEffect, useRef } from "react";

import { authClient } from "@/app/lib/auth-client";

import type {
  BestStats,
  DailyPuzzleRecord,
  EndlessStats,
} from "../game-types";
import {
  normalizePlayerProgress,
  type PlayerProgress,
} from "../player-progress";

type AccountProgressSyncOptions = {
  bestStats: BestStats;
  dailyRecord: DailyPuzzleRecord | null;
  endlessStats: EndlessStats;
  isLoaded: boolean;
  setBestStats: React.Dispatch<React.SetStateAction<BestStats>>;
  setDailyRecord: React.Dispatch<React.SetStateAction<DailyPuzzleRecord | null>>;
  setEndlessStats: React.Dispatch<React.SetStateAction<EndlessStats>>;
};

async function saveProgress(progress: PlayerProgress) {
  const response = await fetch("/api/account/progress", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(progress),
  });

  if (!response.ok) {
    throw new Error("Player progress could not be synchronized.");
  }

  return normalizePlayerProgress(await response.json());
}

export function useAccountProgressSync({
  bestStats,
  dailyRecord,
  endlessStats,
  isLoaded,
  setBestStats,
  setDailyRecord,
  setEndlessStats,
}: AccountProgressSyncOptions) {
  const { data: session } = authClient.useSession();
  const startedForUserRef = useRef<string | null>(null);
  const readyForUserRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user.id;

    if (!userId) {
      startedForUserRef.current = null;
      readyForUserRef.current = null;
      return;
    }

    if (!isLoaded || startedForUserRef.current === userId) {
      return;
    }

    startedForUserRef.current = userId;

    void saveProgress({ bestStats, dailyRecord, endlessStats })
      .then((merged) => {
        setBestStats(merged.bestStats);
        setDailyRecord(merged.dailyRecord);
        setEndlessStats(merged.endlessStats);
        readyForUserRef.current = userId;
      })
      .catch((error: unknown) => {
        startedForUserRef.current = null;
        console.error(error);
      });
  }, [
    bestStats,
    dailyRecord,
    endlessStats,
    isLoaded,
    session?.user.id,
    setBestStats,
    setDailyRecord,
    setEndlessStats,
  ]);

  useEffect(() => {
    const userId = session?.user.id;

    if (!userId || readyForUserRef.current !== userId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveProgress({ bestStats, dailyRecord, endlessStats }).catch(
        (error: unknown) => {
          console.error(error);
        },
      );
    }, 600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [bestStats, dailyRecord, endlessStats, session?.user.id]);
}
