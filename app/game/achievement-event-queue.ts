import {
  isUtcDateKey,
  type AchievementEvent,
} from "./achievements";
import { PRESET_MODE_KEYS } from "./game-logic";
import type { PresetModeKey } from "./game-types";

export type QueuedAchievementEvent = AchievementEvent & {
  sealed?: boolean;
};

export const SWAP_BATCH_SIZE = 25;

const EVENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUEUE_STORAGE_KEY_PREFIX = "colortile-pending-achievements:";
const queueLockTails = new Map<string, Promise<unknown>>();

type QueueLockManager = {
  request<T>(name: string, callback: () => T | Promise<T>): Promise<T>;
};

export type AchievementFlushToken = {
  generation: number;
  userId: string;
};

export function createAchievementFlushCoordinator(
  initialUserId: string | null,
) {
  let activeUserId = initialUserId;
  let generation = 0;
  const activeFlushes = new Map<string, number>();

  return {
    activate(userId: string | null) {
      activeUserId = userId;
      generation += 1;
    },
    finish(token: AchievementFlushToken) {
      if (activeFlushes.get(token.userId) === token.generation) {
        activeFlushes.delete(token.userId);
      }
    },
    isActive(token: AchievementFlushToken) {
      return (
        activeUserId === token.userId &&
        generation === token.generation
      );
    },
    isUserActive(userId: string) {
      return activeUserId === userId;
    },
    start(userId: string): AchievementFlushToken | null {
      if (activeUserId !== userId) {
        return null;
      }

      const activeGeneration = activeFlushes.get(userId);
      if (activeGeneration === generation) {
        return null;
      }

      activeFlushes.set(userId, generation);
      return { generation, userId };
    },
  };
}

function isPresetMode(value: unknown): value is PresetModeKey {
  return (
    typeof value === "string" &&
    (PRESET_MODE_KEYS as readonly string[]).includes(value)
  );
}

function readSealed(value: unknown) {
  return value === true ? true : undefined;
}

export function normalizeQueuedEvent(
  value: unknown,
  fallbackPlayedDate: string,
): QueuedAchievementEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const event = value as Record<string, unknown>;
  if (
    typeof event.eventId !== "string" ||
    !EVENT_ID_PATTERN.test(event.eventId)
  ) {
    return null;
  }

  const sealed = readSealed(event.sealed);

  if (
    event.kind === "swap" &&
    typeof event.count === "number" &&
    Number.isInteger(event.count) &&
    event.count > 0 &&
    event.count <= SWAP_BATCH_SIZE
  ) {
    return {
      count: event.count,
      eventId: event.eventId,
      kind: "swap",
      sealed,
    };
  }

  const playedDate = isUtcDateKey(event.playedDate)
    ? event.playedDate
    : fallbackPlayedDate;
  if (!isUtcDateKey(playedDate)) {
    return null;
  }

  if (
    event.kind === "preset" &&
    isPresetMode(event.mode) &&
    typeof event.solveTime === "number" &&
    Number.isFinite(event.solveTime) &&
    event.solveTime > 0
  ) {
    return {
      eventId: event.eventId,
      kind: "preset",
      mode: event.mode,
      playedDate,
      sealed,
      solveTime: event.solveTime,
    };
  }

  if (event.kind === "daily" && isUtcDateKey(event.dateKey)) {
    return {
      dateKey: event.dateKey,
      eventId: event.eventId,
      kind: "daily",
      playedDate: isUtcDateKey(event.playedDate)
        ? event.playedDate
        : event.dateKey,
      sealed,
    };
  }

  if (
    event.kind === "endless" &&
    typeof event.isThreeStar === "boolean" &&
    typeof event.streak === "number" &&
    Number.isInteger(event.streak) &&
    event.streak > 0
  ) {
    return {
      eventId: event.eventId,
      isThreeStar: event.isThreeStar,
      kind: "endless",
      playedDate,
      sealed,
      streak: event.streak,
    };
  }

  return null;
}

export function getAchievementQueueStorageKey(userId: string) {
  return `${QUEUE_STORAGE_KEY_PREFIX}${userId}`;
}

export function readAchievementQueue(
  storage: Pick<Storage, "getItem">,
  userId: string,
  fallbackPlayedDate: string,
): QueuedAchievementEvent[] {
  try {
    const stored = storage.getItem(getAchievementQueueStorageKey(userId));
    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.flatMap((event) => {
          const normalizedEvent = normalizeQueuedEvent(
            event,
            fallbackPlayedDate,
          );
          return normalizedEvent ? [normalizedEvent] : [];
        })
      : [];
  } catch {
    return [];
  }
}

export function writeAchievementQueue(
  storage: Pick<Storage, "removeItem" | "setItem">,
  userId: string,
  events: QueuedAchievementEvent[],
) {
  const storageKey = getAchievementQueueStorageKey(userId);
  if (events.length === 0) {
    storage.removeItem(storageKey);
    return;
  }

  storage.setItem(storageKey, JSON.stringify(events));
}

export function clearPendingAchievementEvents(
  storage: Pick<Storage, "removeItem">,
  userId: string,
) {
  storage.removeItem(getAchievementQueueStorageKey(userId));
}

export function appendSwapToQueue(
  events: readonly QueuedAchievementEvent[],
  eventId: string,
) {
  const nextEvents = [...events];
  let draftIndex = -1;

  for (let index = nextEvents.length - 1; index >= 0; index -= 1) {
    const event = nextEvents[index];
    if (
      event.kind === "swap" &&
      !event.sealed &&
      event.count < SWAP_BATCH_SIZE
    ) {
      draftIndex = index;
      break;
    }
  }

  const draftEvent = draftIndex >= 0 ? nextEvents[draftIndex] : null;
  const count = draftEvent?.kind === "swap" ? draftEvent.count + 1 : 1;

  if (draftEvent?.kind === "swap") {
    nextEvents[draftIndex] = { ...draftEvent, count };
  } else {
    nextEvents.push({ count, eventId, kind: "swap" });
  }

  return { count, events: nextEvents };
}

export function sealNextQueuedEvent(
  events: readonly QueuedAchievementEvent[],
) {
  const event = events[0];
  if (!event) {
    return { event: null, events: [...events] };
  }

  if (event.kind !== "swap" || event.sealed) {
    return { event, events: [...events] };
  }

  const sealedEvent = { ...event, sealed: true };
  return {
    event: sealedEvent,
    events: [sealedEvent, ...events.slice(1)],
  };
}

export function removeQueuedEvent(
  events: readonly QueuedAchievementEvent[],
  eventId: string,
) {
  return events.filter((event) => event.eventId !== eventId);
}

async function runWithProcessLock<T>(
  lockName: string,
  callback: () => T | Promise<T>,
) {
  const previousTail = queueLockTails.get(lockName) ?? Promise.resolve();
  const result = previousTail.catch(() => undefined).then(callback);
  queueLockTails.set(lockName, result);

  try {
    return await result;
  } finally {
    if (queueLockTails.get(lockName) === result) {
      queueLockTails.delete(lockName);
    }
  }
}

export function withAchievementQueueLock<T>(
  userId: string,
  callback: () => T | Promise<T>,
  lockManager?: QueueLockManager | null,
) {
  const lockName = `colortile-achievements:${userId}`;
  const availableLockManager =
    lockManager === undefined && typeof navigator !== "undefined"
      ? navigator.locks
      : lockManager;

  return runWithProcessLock(lockName, () =>
    availableLockManager
      ? availableLockManager.request(lockName, callback)
      : callback(),
  );
}

export function shouldDiscardSubmission(status: number) {
  return status === 400;
}
