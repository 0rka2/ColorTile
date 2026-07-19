import { auth } from "@/app/lib/auth";
import {
  getPlayerProgress,
  mergeAndSavePlayerProgress,
} from "@/app/lib/player-progress-store";

async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function GET(request: Request) {
  const session = await getSession(request);

  if (!session) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    return Response.json(await getPlayerProgress(session.user.id));
  } catch (error) {
    console.error("Player progress request failed.", error);
    return Response.json(
      { error: "Player progress is temporarily unavailable." },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request) {
  const session = await getSession(request);

  if (!session) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const progress = await mergeAndSavePlayerProgress(session.user.id, body);
    return Response.json(progress);
  } catch (error) {
    console.error("Player progress update failed.", error);
    return Response.json(
      { error: "Player progress could not be saved." },
      { status: 503 },
    );
  }
}
