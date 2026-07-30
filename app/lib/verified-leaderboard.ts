import "server-only";

import { createHmac } from "node:crypto";

import { auth } from "./auth";
import { getSql } from "./db";
import type { VerifiedPuzzle } from "../game/verified-attempt";

export const ATTEMPT_EXPIRY_HOURS = 24;
const ATTEMPT_RATE_LIMIT_WINDOW_MINUTES = 10;
const ATTEMPT_RATE_LIMITS = {
  create: {
    ip: 100,
    user: 30,
  },
  complete: {
    ip: 200,
    user: 60,
  },
} as const;

type AttemptRateLimitScope = keyof typeof ATTEMPT_RATE_LIMITS;

export async function getLeaderboardUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

export function leaderboardApiError(error: unknown) {
  console.error("Leaderboard request failed.", error);
  return Response.json(
    { error: "The leaderboard is temporarily unavailable." },
    { status: 503 },
  );
}

function getClientAddress(request: Request) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

function getRateLimitKey(
  scope: AttemptRateLimitScope,
  kind: "ip" | "user",
  value: string,
) {
  const secret = process.env.BETTER_AUTH_SECRET ?? "local-development-only";
  const identifierHash = createHmac("sha256", secret)
    .update(`${scope}:${kind}:${value}`)
    .digest("hex");

  return `${scope}:${kind}:${identifierHash}`;
}

export async function consumeAttemptRateLimit(
  request: Request,
  userId: string,
  scope: AttemptRateLimitScope = "create",
) {
  const sql = getSql();
  const clientAddress = getClientAddress(request);
  const limits = ATTEMPT_RATE_LIMITS[scope];
  const userKey = getRateLimitKey(scope, "user", userId);
  const ipKey = getRateLimitKey(
    scope,
    "ip",
    clientAddress ?? `unavailable:${userId}`,
  );
  const rows = readQueryRows(await sql`
    with requested_limits (limit_key, request_limit) as (
      values
        (${userKey}, ${limits.user}),
        (${ipKey}, ${limits.ip})
    ),
    updated_limits as (
      insert into leaderboard_attempt_rate_limit (
        limit_key,
        window_started_at,
        request_count,
        updated_at
      )
      select limit_key, now(), 1, now()
      from requested_limits
      on conflict (limit_key) do update set
        window_started_at = case
          when leaderboard_attempt_rate_limit.window_started_at <=
            now() - (${ATTEMPT_RATE_LIMIT_WINDOW_MINUTES} * interval '1 minute')
          then now()
          else leaderboard_attempt_rate_limit.window_started_at
        end,
        request_count = case
          when leaderboard_attempt_rate_limit.window_started_at <=
            now() - (${ATTEMPT_RATE_LIMIT_WINDOW_MINUTES} * interval '1 minute')
          then 1
          else leaderboard_attempt_rate_limit.request_count + 1
        end,
        updated_at = now()
      returning limit_key, request_count, window_started_at
    )
    select
      updated_limits.request_count,
      updated_limits.window_started_at::text,
      requested_limits.request_limit
    from updated_limits
    join requested_limits using (limit_key)
  `);

  const exceeded = rows.find(
    (row) => Number(row.request_count) > Number(row.request_limit),
  );

  if (!exceeded) {
    return null;
  }

  const windowStartedAt = Date.parse(String(exceeded.window_started_at));
  const retryAfterSeconds = Number.isFinite(windowStartedAt)
    ? Math.max(
        1,
        Math.ceil(
          (windowStartedAt + ATTEMPT_RATE_LIMIT_WINDOW_MINUTES * 60_000 - Date.now()) /
            1000,
        ),
      )
    : ATTEMPT_RATE_LIMIT_WINDOW_MINUTES * 60;

  return Response.json(
    { error: "Too many leaderboard attempts. Please wait and try again." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}

export function readQueryRows(result: unknown) {
  return result as Record<string, unknown>[];
}

export function readVerifiedPuzzle(row: Record<string, unknown>): VerifiedPuzzle {
  return {
    dateKey: typeof row.date_key === "string" ? row.date_key : null,
    difficulty: row.difficulty as VerifiedPuzzle["difficulty"],
    endlessRunId:
      typeof row.endless_run_id === "string" ? row.endless_run_id : null,
    kind: row.kind as VerifiedPuzzle["kind"],
    puzzleNumber:
      typeof row.puzzle_number === "number" ? row.puzzle_number : null,
    puzzleType:
      typeof row.puzzle_type === "string"
        ? (row.puzzle_type as VerifiedPuzzle["puzzleType"])
        : null,
    seed: String(row.seed),
    size: Number(row.size),
    style: row.style as VerifiedPuzzle["style"],
    swapBudget:
      typeof row.swap_budget === "number" ? row.swap_budget : null,
    timeLimitSeconds:
      typeof row.time_limit_seconds === "number"
        ? row.time_limit_seconds
        : null,
  };
}
