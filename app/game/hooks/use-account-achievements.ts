"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ACHIEVEMENT_USER_ID_HEADER,
  type AchievementDefinition,
  type AchievementEvent,
} from "../achievements";
import {
  appendSwapToQueue,
  createAchievementFlushCoordinator,
  readAchievementQueue,
  removeQueuedEvent,
  sealNextQueuedEvent,
  shouldDiscardSubmission,
  SWAP_BATCH_SIZE,
  withAchievementQueueLock,
  writeAchievementQueue,
} from "../achievement-event-queue";

export { clearPendingAchievementEvents } from "../achievement-event-queue";

type AchievementEventInput =
  | {
      kind: "preset";
      mode: Extract<AchievementEvent, { kind: "preset" }>["mode"];
      playedDate: string;
      solveTime: number;
    }
  | {
      dateKey: string;
      kind: "daily";
      playedDate: string;
    }
  | {
      isThreeStar: boolean;
      kind: "endless";
      playedDate: string;
      streak: number;
    };

type AchievementEventResponse = {
  newlyUnlocked: AchievementDefinition[];
};

type AchievementAnnouncement = {
  achievement: AchievementDefinition;
  userId: string;
};

const UNLOCK_ANNOUNCEMENT_DELAY_MS = 1100;

class AchievementSubmissionError extends Error {
  status: number;

  constructor(status: number) {
    super("Achievement progress could not be saved.");
    this.name = "AchievementSubmissionError";
    this.status = status;
  }
}

async function submitAchievementEvent(
  event: AchievementEvent,
  userId: string,
) {
  const response = await fetch("/api/account/achievements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [ACHIEVEMENT_USER_ID_HEADER]: userId,
    },
    body: JSON.stringify(event),
    keepalive: true,
  });

  if (!response.ok) {
    throw new AchievementSubmissionError(response.status);
  }

  return (await response.json()) as AchievementEventResponse;
}

export function useAccountAchievements(userId: string | null) {
  const [announcements, setAnnouncements] =
    useState<AchievementAnnouncement[]>([]);
  const announcementTimeoutsRef = useRef<number[]>([]);
  const flushCoordinatorRef = useRef<ReturnType<
    typeof createAchievementFlushCoordinator
  > | null>(null);
  if (flushCoordinatorRef.current === null) {
    flushCoordinatorRef.current = createAchievementFlushCoordinator(userId);
  }
  const flushCoordinator = flushCoordinatorRef.current;

  const getPlayedDate = useCallback(
    () => new Date().toISOString().slice(0, 10),
    [],
  );

  const announceUnlocks = useCallback(
    (
      achievements: AchievementDefinition[],
      announcementUserId: string,
      isStillActive: () => boolean,
    ) => {
      achievements.forEach((achievement, index) => {
        const timeoutId = window.setTimeout(() => {
          if (isStillActive()) {
            setAnnouncements((current) => [
              ...current,
              { achievement, userId: announcementUserId },
            ]);
          }
        }, UNLOCK_ANNOUNCEMENT_DELAY_MS + index * 180);
        announcementTimeoutsRef.current.push(timeoutId);
      });
    },
    [],
  );

  const clearAnnouncementTimeouts = useCallback(() => {
    announcementTimeoutsRef.current.forEach((timeoutId) =>
      window.clearTimeout(timeoutId),
    );
    announcementTimeoutsRef.current = [];
  }, []);

  const clearAnnouncements = useCallback(() => {
    clearAnnouncementTimeouts();
    setAnnouncements([]);
  }, [clearAnnouncementTimeouts]);

  const flushQueue = useCallback(async () => {
    if (!userId) {
      return;
    }

    const flushToken = flushCoordinator.start(userId);
    if (!flushToken) {
      return;
    }

    try {
      while (true) {
        const event = await withAchievementQueueLock(userId, () => {
          if (!flushCoordinator.isActive(flushToken)) {
            return null;
          }
          const queuedEvents = readAchievementQueue(
            window.localStorage,
            userId,
            getPlayedDate(),
          );
          const sealed = sealNextQueuedEvent(queuedEvents);
          writeAchievementQueue(window.localStorage, userId, sealed.events);
          return sealed.event;
        });
        if (!flushCoordinator.isActive(flushToken)) {
          return;
        }
        if (!event) {
          break;
        }

        try {
          if (!flushCoordinator.isActive(flushToken)) {
            return;
          }
          const result = await submitAchievementEvent(event, flushToken.userId);
          if (!flushCoordinator.isActive(flushToken)) {
            return;
          }
          const removed = await withAchievementQueueLock(userId, () => {
            if (!flushCoordinator.isActive(flushToken)) {
              return false;
            }
            const queuedEvents = readAchievementQueue(
              window.localStorage,
              userId,
              getPlayedDate(),
            );
            writeAchievementQueue(
              window.localStorage,
              userId,
              removeQueuedEvent(queuedEvents, event.eventId),
            );
            return true;
          });
          if (!removed || !flushCoordinator.isActive(flushToken)) {
            return;
          }
          announceUnlocks(
            result.newlyUnlocked,
            flushToken.userId,
            () => flushCoordinator.isActive(flushToken),
          );
        } catch (error) {
          if (
            error instanceof AchievementSubmissionError &&
            shouldDiscardSubmission(error.status)
          ) {
            if (!flushCoordinator.isActive(flushToken)) {
              return;
            }
            const removed = await withAchievementQueueLock(userId, () => {
              if (!flushCoordinator.isActive(flushToken)) {
                return false;
              }
              const queuedEvents = readAchievementQueue(
                window.localStorage,
                userId,
                getPlayedDate(),
              );
              writeAchievementQueue(
                window.localStorage,
                userId,
                removeQueuedEvent(queuedEvents, event.eventId),
              );
              return true;
            });
            if (!removed) {
              return;
            }
            continue;
          }
          break;
        }
      }
    } finally {
      flushCoordinator.finish(flushToken);
    }
  }, [
    announceUnlocks,
    flushCoordinator,
    getPlayedDate,
    userId,
  ]);

  const recordAchievementEvent = useCallback(
    (input: AchievementEventInput) => {
      if (!userId) {
        return;
      }

      const event = {
        ...input,
        eventId: window.crypto.randomUUID(),
      } as AchievementEvent;
      void withAchievementQueueLock(userId, () => {
        const pendingEvents = readAchievementQueue(
          window.localStorage,
          userId,
          getPlayedDate(),
        );
        writeAchievementQueue(window.localStorage, userId, [
          ...pendingEvents,
          event,
        ]);
      }).then(() => {
        if (flushCoordinator.isUserActive(userId)) {
          void flushQueue();
        }
      });
    },
    [flushCoordinator, flushQueue, getPlayedDate, userId],
  );

  const recordSwap = useCallback(() => {
    if (!userId) {
      return;
    }

    void withAchievementQueueLock(userId, () => {
      const queuedEvents = readAchievementQueue(
        window.localStorage,
        userId,
        getPlayedDate(),
      );
      const result = appendSwapToQueue(
        queuedEvents,
        window.crypto.randomUUID(),
      );
      writeAchievementQueue(window.localStorage, userId, result.events);
      return result.count;
    }).then((count) => {
      if (
        count >= SWAP_BATCH_SIZE &&
        flushCoordinator.isUserActive(userId)
      ) {
        void flushQueue();
      }
    });
  }, [flushCoordinator, flushQueue, getPlayedDate, userId]);

  const dismissAnnouncement = useCallback(() => {
    setAnnouncements((current) => current.slice(1));
  }, []);

  useEffect(() => {
    clearAnnouncements();
    flushCoordinator.activate(userId);

    if (!userId) {
      return () => flushCoordinator.activate(null);
    }

    void flushQueue();
    const handleOnline = () => void flushQueue();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushQueue();
      }
    };
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      flushCoordinator.activate(null);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clearAnnouncements, flushCoordinator, flushQueue, userId]);

  useEffect(() => {
    return clearAnnouncementTimeouts;
  }, [clearAnnouncementTimeouts]);

  const currentAnnouncement = announcements[0];

  return {
    currentAnnouncement:
      currentAnnouncement?.userId === userId
        ? currentAnnouncement.achievement
        : null,
    dismissAnnouncement,
    recordAchievementEvent,
    recordSwap,
  };
}
