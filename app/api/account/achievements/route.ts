import { getAchievementSummary } from "@/app/lib/achievement-store";
import { auth } from "@/app/lib/auth";

async function getSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
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

export function POST() {
  return Response.json(
    { error: "Achievement events are recorded by verified game completions." },
    { status: 405, headers: { Allow: "GET" } },
  );
}
