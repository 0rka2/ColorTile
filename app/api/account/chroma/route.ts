import { auth } from "@/app/lib/auth";
import { getChromaBalance } from "@/app/lib/chroma-wallet";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    return Response.json({
      balance: await getChromaBalance(session.user.id),
    });
  } catch (error) {
    console.error("Chroma balance request failed.", error);
    return Response.json(
      { error: "The Chroma balance is temporarily unavailable." },
      { status: 503 },
    );
  }
}
