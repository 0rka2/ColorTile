import {
  getCosmeticDefinition,
  isCosmeticSlot,
} from "@/app/game/shop-catalog";
import { auth } from "@/app/lib/auth";
import {
  equipCosmetic,
  getCosmeticShopState,
} from "@/app/lib/cosmetic-shop-store";

export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The equipment is invalid." }, { status: 400 });
  }

  const item =
    body && typeof body === "object" && "itemId" in body
      ? getCosmeticDefinition(body.itemId)
      : undefined;
  const slot =
    body && typeof body === "object" && "slot" in body ? body.slot : undefined;
  if (!item || !isCosmeticSlot(slot) || item.slot !== slot) {
    return Response.json({ error: "The cosmetic is invalid." }, { status: 400 });
  }

  try {
    const equipped = await equipCosmetic(session.user.id, slot, item.id);
    if (!equipped) {
      return Response.json(
        { error: "You do not own this cosmetic." },
        { status: 409 },
      );
    }

    return Response.json(await getCosmeticShopState(session.user.id));
  } catch (error) {
    console.error("Cosmetic equipment update failed.", error);
    return Response.json(
      { error: "The cosmetic could not be equipped." },
      { status: 503 },
    );
  }
}
