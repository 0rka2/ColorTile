import test from "node:test";
import assert from "node:assert/strict";

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
  type QueuedAchievementEvent,
} from "../app/game/achievement-event-queue";

const USER_ID = "user-1";
const FIRST_EVENT_ID = "00000000-0000-4000-8000-000000000001";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

test("swap batches persist through reload and seal at the exact batch size", () => {
  const storage = new MemoryStorage();
  let events: QueuedAchievementEvent[] = [];

  for (let count = 1; count < SWAP_BATCH_SIZE; count += 1) {
    const result = appendSwapToQueue(events, FIRST_EVENT_ID);
    events = result.events;
    assert.equal(result.count, count);
  }

  writeAchievementQueue(storage, USER_ID, events);
  const reloaded = readAchievementQueue(storage, USER_ID, "2026-07-27");
  assert.equal(reloaded.length, 1);
  assert.equal(reloaded[0].kind, "swap");
  assert.equal(reloaded[0].kind === "swap" ? reloaded[0].count : 0, 24);

  const fullBatch = appendSwapToQueue(reloaded, FIRST_EVENT_ID);
  assert.equal(fullBatch.count, SWAP_BATCH_SIZE);
  const sealed = sealNextQueuedEvent(fullBatch.events);
  assert.equal(sealed.event?.kind, "swap");
  assert.equal(sealed.event?.sealed, true);
});

test("sealed swap batches remain immutable while later swaps form a new batch", () => {
  const sealedBatch: QueuedAchievementEvent = {
    count: SWAP_BATCH_SIZE,
    eventId: FIRST_EVENT_ID,
    kind: "swap",
    sealed: true,
  };
  const nextEventId = "00000000-0000-4000-8000-000000000002";
  const result = appendSwapToQueue([sealedBatch], nextEventId);

  assert.deepEqual(result.events, [
    sealedBatch,
    {
      count: 1,
      eventId: nextEventId,
      kind: "swap",
    },
  ]);
});

test("legacy completion events gain valid play dates and malformed events are removed", () => {
  const storage = new MemoryStorage();
  const validEventId = "00000000-0000-4000-8000-000000000003";
  storage.setItem(
    "colortile-pending-achievements:user-1",
    JSON.stringify([
      {
        eventId: validEventId,
        kind: "preset",
        mode: "normal",
        solveTime: 45,
      },
      {
        eventId: "not-a-uuid",
        kind: "swap",
        count: 1,
      },
    ]),
  );

  const events = readAchievementQueue(storage, USER_ID, "2026-07-27");
  assert.deepEqual(events, [
    {
      eventId: validEventId,
      kind: "preset",
      mode: "normal",
      playedDate: "2026-07-27",
      sealed: undefined,
      solveTime: 45,
    },
  ]);
});

test("queue locking serializes interleaved updates", async () => {
  let count = 0;

  await Promise.all(
    Array.from({ length: 20 }, () =>
      withAchievementQueueLock(
        USER_ID,
        async () => {
          const current = count;
          await new Promise<void>((resolve) => setImmediate(resolve));
          count = current + 1;
        },
        null,
      ),
    ),
  );

  assert.equal(count, 20);
});

test("a flush stops when its user changes while waiting", async () => {
  const coordinator = createAchievementFlushCoordinator(USER_ID);
  const token = coordinator.start(USER_ID);
  assert.ok(token);

  let releaseLock!: () => void;
  const lock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  let submissionCount = 0;
  const pendingFlush = (async () => {
    await lock;
    if (coordinator.isActive(token)) {
      submissionCount += 1;
    }
  })();

  coordinator.activate("user-2");
  releaseLock();
  await pendingFlush;

  assert.equal(submissionCount, 0);
});

test("each active identity can start without waiting for an older flush", () => {
  const coordinator = createAchievementFlushCoordinator(USER_ID);
  const firstUserToken = coordinator.start(USER_ID);
  assert.ok(firstUserToken);
  assert.equal(coordinator.start(USER_ID), null);

  coordinator.activate("user-2");
  const secondUserToken = coordinator.start("user-2");
  assert.ok(secondUserToken);
  assert.equal(coordinator.isActive(firstUserToken), false);
  assert.equal(coordinator.isActive(secondUserToken), true);

  coordinator.finish(firstUserToken);
  assert.equal(coordinator.isActive(secondUserToken), true);
});

test("an in-flight event remains queued until its account retries", async () => {
  const coordinator = createAchievementFlushCoordinator(USER_ID);
  const staleToken = coordinator.start(USER_ID);
  assert.ok(staleToken);
  let events: QueuedAchievementEvent[] = [
    {
      count: SWAP_BATCH_SIZE,
      eventId: FIRST_EVENT_ID,
      kind: "swap",
      sealed: true,
    },
  ];
  let announced = false;
  let finishRequest!: () => void;
  const request = new Promise<void>((resolve) => {
    finishRequest = resolve;
  });
  const inFlightSubmission = (async () => {
    await request;
    if (coordinator.isActive(staleToken)) {
      events = removeQueuedEvent(events, FIRST_EVENT_ID);
      announced = true;
    }
  })();

  coordinator.activate("user-2");
  finishRequest();
  await inFlightSubmission;

  assert.equal(events.length, 1);
  assert.equal(announced, false);

  coordinator.activate(USER_ID);
  const retryToken = coordinator.start(USER_ID);
  assert.ok(retryToken);
  assert.notEqual(retryToken.generation, staleToken.generation);
  assert.equal(coordinator.isActive(retryToken), true);

  events = removeQueuedEvent(events, FIRST_EVENT_ID);
  coordinator.finish(staleToken);
  assert.equal(coordinator.isActive(retryToken), true);
  coordinator.finish(retryToken);
  assert.equal(events.length, 0);
});

test("only permanent invalid requests are discarded", () => {
  assert.equal(shouldDiscardSubmission(400), true);
  assert.equal(shouldDiscardSubmission(401), false);
  assert.equal(shouldDiscardSubmission(409), false);
  assert.equal(shouldDiscardSubmission(429), false);
  assert.equal(shouldDiscardSubmission(503), false);
});

test("removing a rejected event preserves later queued progress", () => {
  const events: QueuedAchievementEvent[] = [
    {
      count: 1,
      eventId: FIRST_EVENT_ID,
      kind: "swap",
      sealed: true,
    },
    {
      count: 2,
      eventId: "00000000-0000-4000-8000-000000000004",
      kind: "swap",
    },
  ];

  assert.deepEqual(removeQueuedEvent(events, FIRST_EVENT_ID), [events[1]]);
});
