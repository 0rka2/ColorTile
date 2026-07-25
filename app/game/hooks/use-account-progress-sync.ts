"use client";

import { useEffect, useRef } from "react";

import { authClient } from "@/app/lib/auth-client";

import type {
  BestStats,
  DailyPuzzleRecord,
  EndlessStats,
} from "../game-types";
import {
  clearStoredPlayerData,
  EMPTY_ENDLESS_STATS,
  normalizePlayerProgress,
  PLAYER_DATA_OWNER_STORAGE_KEY,
  shouldClearStoredPlayerData,
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
  const { data: session, isPending: sessionIsPending } = authClient.useSession();
  const activeUserRef = useRef<string | null | undefined>(undefined);
  const startedForUserRef = useRef<string | null>(null);
  const readyForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (sessionIsPending) {
      return;
    }

    const userId = session?.user.id;
    const nextActiveUser = userId ?? null;
    const previousActiveUser = activeUserRef.current;
    const storedOwnerId = window.localStorage.getItem(
      PLAYER_DATA_OWNER_STORAGE_KEY,
    );

    if (previousActiveUser === undefined) {
      activeUserRef.current = nextActiveUser;
    } else if (previousActiveUser !== nextActiveUser) {
      activeUserRef.current = nextActiveUser;
      startedForUserRef.current = null;
      readyForUserRef.current = null;
    }

    if (
      shouldClearStoredPlayerData(previousActiveUser, nextActiveUser) ||
      (storedOwnerId !== null && storedOwnerId !== nextActiveUser)
    ) {
      clearStoredPlayerData(window.localStorage);
      if (userId) {
        window.localStorage.setItem(PLAYER_DATA_OWNER_STORAGE_KEY, userId);
      }
      setBestStats({});
      setDailyRecord(null);
      setEndlessStats(EMPTY_ENDLESS_STATS);
      return;
    }

    if (userId && storedOwnerId !== userId) {
      window.localStorage.setItem(PLAYER_DATA_OWNER_STORAGE_KEY, userId);
    }

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
        if (activeUserRef.current !== userId) {
          return;
        }

        setBestStats(merged.bestStats);
        setDailyRecord(merged.dailyRecord);
        setEndlessStats(merged.endlessStats);
        readyForUserRef.current = userId;
      })
      .catch((error: unknown) => {
        if (activeUserRef.current === userId) {
          startedForUserRef.current = null;
        }
        console.error(error);
      });
  }, [
    bestStats,
    dailyRecord,
    endlessStats,
    isLoaded,
    session?.user.id,
    sessionIsPending,
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
