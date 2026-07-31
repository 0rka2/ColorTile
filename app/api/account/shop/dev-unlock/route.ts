import { getCosmeticDefinition } from "@/app/game/shop-catalog";
import { auth } from "@/app/lib/auth";
import { devUnlockAndEquipCosmetic } from "@/app/lib/cosmetic-shop-store";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The unlock is invalid." }, { status: 400 });
  }

  const item =
    body && typeof body === "object" && "itemId" in body
      ? getCosmeticDefinition(body.itemId)
      : undefined;
  if (!item || item.price === 0) {
    return Response.json({ error: "The cosmetic is invalid." }, { status: 400 });
  }

  try {
    return Response.json(
      await devUnlockAndEquipCosmetic(session.user.id, item),
    );
  } catch (error) {
    console.error("Development cosmetic unlock failed.", error);
    return Response.json(
      { error: "The cosmetic could not be unlocked." },
      { status: 503 },
    );
  }
}
