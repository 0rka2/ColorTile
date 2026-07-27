import {
  ACHIEVEMENT_USER_ID_HEADER,
  getAchievementDefinition,
  isUtcDateKey,
  type AchievementEvent,
} from "@/app/game/achievements";
import {
  PRESET_MODE_KEYS,
} from "@/app/game/game-logic";
import type { PresetModeKey } from "@/app/game/game-types";
import {
  getAchievementSummary,
  recordAchievementEvent,
} from "@/app/lib/achievement-store";
import { auth } from "@/app/lib/auth";

const EVENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SWAP_BATCH_SIZE = 25;

async function getSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

function isPresetMode(value: unknown): value is PresetModeKey {
  return (
    typeof value === "string" &&
    (PRESET_MODE_KEYS as readonly string[]).includes(value)
  );
}

function parseAchievementEvent(value: unknown): AchievementEvent | null {
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

  if (
    event.kind === "preset" &&
    isPresetMode(event.mode) &&
    isUtcDateKey(event.playedDate) &&
    typeof event.solveTime === "number" &&
    Number.isFinite(event.solveTime) &&
    event.solveTime > 0
  ) {
    return {
      eventId: event.eventId,
      kind: "preset",
      mode: event.mode,
      playedDate: event.playedDate,
      solveTime: event.solveTime,
    };
  }

  if (
    event.kind === "daily" &&
    isUtcDateKey(event.dateKey) &&
    isUtcDateKey(event.playedDate)
  ) {
    return {
      dateKey: event.dateKey,
      eventId: event.eventId,
      kind: "daily",
      playedDate: event.playedDate,
    };
  }

  if (
    event.kind === "endless" &&
    typeof event.isThreeStar === "boolean" &&
    isUtcDateKey(event.playedDate) &&
    typeof event.streak === "number" &&
    Number.isInteger(event.streak) &&
    event.streak > 0
  ) {
    return {
      eventId: event.eventId,
      isThreeStar: event.isThreeStar,
      kind: "endless",
      playedDate: event.playedDate,
      streak: event.streak,
    };
  }

  if (
    event.kind === "swap" &&
    typeof event.count === "number" &&
    Number.isInteger(event.count) &&
    event.count > 0 &&
    event.count <= MAX_SWAP_BATCH_SIZE
  ) {
    return {
      count: event.count,
      eventId: event.eventId,
      kind: "swap",
    };
  }

  return null;
}

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    return Response.json(await getAchievementSummary(session.user.id));
  } catch (error) {
    console.error("Achievement request failed.", error);
    return Response.json(
      { error: "Achievements are temporarily unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }
  if (request.headers.get(ACHIEVEMENT_USER_ID_HEADER) !== session.user.id) {
    return Response.json(
      { error: "The active account changed before this event was saved." },
      { status: 409 },
    );
  }

  try {
    const event = parseAchievementEvent(await request.json());
    if (!event) {
      return Response.json(
        { error: "The achievement event is invalid." },
        { status: 400 },
      );
    }

    const result = await recordAchievementEvent(session.user.id, event);
    return Response.json({
      ...result,
      newlyUnlocked: result.newlyUnlocked.flatMap((id) => {
        const definition = getAchievementDefinition(id);
        return definition ? [definition] : [];
      }),
    });
  } catch (error) {
    console.error("Achievement event failed.", error);
    return Response.json(
      { error: "Achievement progress could not be saved." },
      { status: 503 },
    );
  }
}
