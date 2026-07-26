"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  AchievementDefinition,
  AchievementEvent,
} from "../achievements";

type AchievementEventInput =
  | {
      kind: "preset";
      mode: Extract<AchievementEvent, { kind: "preset" }>["mode"];
      solveTime: number;
    }
  | {
      dateKey: string;
      kind: "daily";
    }
  | {
      isThreeStar: boolean;
      kind: "endless";
      streak: number;
    };

type AchievementEventResponse = {
  newlyUnlocked: AchievementDefinition[];
};

const QUEUE_STORAGE_KEY_PREFIX = "colortile-pending-achievements:";
const UNLOCK_ANNOUNCEMENT_DELAY_MS = 1100;

function getQueueStorageKey(userId: string) {
  return `${QUEUE_STORAGE_KEY_PREFIX}${userId}`;
}

export function clearPendingAchievementEvents(
  storage: Pick<Storage, "removeItem">,
  userId: string,
) {
  storage.removeItem(getQueueStorageKey(userId));
}

function readQueuedEvents(userId: string): AchievementEvent[] {
  try {
    const stored = window.localStorage.getItem(getQueueStorageKey(userId));
    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter(
          (event): event is AchievementEvent =>
            Boolean(event) &&
            typeof event === "object" &&
            typeof (event as { eventId?: unknown }).eventId === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function writeQueuedEvents(userId: string, events: AchievementEvent[]) {
  const storageKey = getQueueStorageKey(userId);
  if (events.length === 0) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(events));
}

async function submitAchievementEvent(event: AchievementEvent) {
  const response = await fetch("/api/account/achievements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    throw new Error("Achievement progress could not be saved.");
  }

  return (await response.json()) as AchievementEventResponse;
}

export function useAccountAchievements(userId: string | null) {
  const [announcements, setAnnouncements] = useState<AchievementDefinition[]>([]);
  const flushInProgressRef = useRef(false);
  const announcementTimeoutsRef = useRef<number[]>([]);

  const announceUnlocks = useCallback((achievements: AchievementDefinition[]) => {
    achievements.forEach((achievement, index) => {
      const timeoutId = window.setTimeout(() => {
        setAnnouncements((current) => [...current, achievement]);
      }, UNLOCK_ANNOUNCEMENT_DELAY_MS + index * 180);
      announcementTimeoutsRef.current.push(timeoutId);
    });
  }, []);

  const flushQueue = useCallback(async () => {
    if (!userId || flushInProgressRef.current) {
      return;
    }

    flushInProgressRef.current = true;

    try {
      while (true) {
        const event = readQueuedEvents(userId)[0];
        if (!event) {
          break;
        }

        try {
          const result = await submitAchievementEvent(event);
          const remainingEvents = readQueuedEvents(userId).filter(
            (queuedEvent) => queuedEvent.eventId !== event.eventId,
          );
          writeQueuedEvents(userId, remainingEvents);
          announceUnlocks(result.newlyUnlocked);
        } catch {
          break;
        }
      }
    } finally {
      flushInProgressRef.current = false;
    }
  }, [announceUnlocks, userId]);

  const recordAchievementEvent = useCallback(
    (input: AchievementEventInput) => {
      if (!userId) {
        return;
      }

      const event = {
        ...input,
        eventId: window.crypto.randomUUID(),
      } as AchievementEvent;
      const pendingEvents = readQueuedEvents(userId);
      writeQueuedEvents(userId, [...pendingEvents, event]);
      void flushQueue();
    },
    [flushQueue, userId],
  );

  const dismissAnnouncement = useCallback(() => {
    setAnnouncements((current) => current.slice(1));
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void flushQueue();
    const handleOnline = () => void flushQueue();
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [flushQueue, userId]);

  useEffect(() => {
    const timeoutIds = announcementTimeoutsRef.current;

    return () => {
      timeoutIds.forEach((timeoutId) =>
        window.clearTimeout(timeoutId),
      );
    };
  }, []);

  return {
    currentAnnouncement: announcements[0] ?? null,
    dismissAnnouncement,
    recordAchievementEvent,
  };
}
