import {
  getAchievementDefinition,
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
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
    typeof event.solveTime === "number" &&
    Number.isFinite(event.solveTime) &&
    event.solveTime > 0
  ) {
    return {
      eventId: event.eventId,
      kind: "preset",
      mode: event.mode,
      solveTime: event.solveTime,
    };
  }

  if (
    event.kind === "daily" &&
    typeof event.dateKey === "string" &&
    DATE_KEY_PATTERN.test(event.dateKey)
  ) {
    return {
      dateKey: event.dateKey,
      eventId: event.eventId,
      kind: "daily",
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
      streak: event.streak,
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
