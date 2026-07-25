import { getSql } from "@/app/lib/db";
import {
  getLeaderboardUser,
  leaderboardApiError,
  readQueryRows,
  readVerifiedPuzzle,
} from "@/app/lib/verified-leaderboard";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function startAttempt(request: Request, context: RouteContext) {
  const user = await getLeaderboardUser(request);
  if (!user) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  const { id } = await context.params;
  const sql = getSql();
  const rows = readQueryRows(await sql`
    update leaderboard_attempt
    set status = 'started', started_at = now()
    where id = ${id}
      and user_id = ${user.id}
      and status = 'prepared'
      and expires_at > now()
    returning *, started_at::text as authoritative_started_at, expires_at::text
  `);

  if (!rows[0]) {
    return Response.json(
      { error: "This attempt cannot be started." },
      { status: 409 },
    );
  }

  return Response.json({
    attemptId: id,
    expiresAt: String(rows[0].expires_at),
    puzzle: readVerifiedPuzzle(rows[0]),
    startedAt: String(rows[0].authoritative_started_at),
  });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    return await startAttempt(request, context);
  } catch (error) {
    return leaderboardApiError(error);
  }
}
