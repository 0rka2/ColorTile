import { getCosmeticDefinition } from "@/app/game/shop-catalog";
import { auth } from "@/app/lib/auth";
import {
  CosmeticPurchaseError,
  purchaseAndEquipCosmetic,
} from "@/app/lib/cosmetic-shop-store";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The purchase is invalid." }, { status: 400 });
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
      await purchaseAndEquipCosmetic(session.user.id, item),
    );
  } catch (error) {
    if (error instanceof CosmeticPurchaseError) {
      const message =
        error.reason === "already-owned"
          ? "You already own this cosmetic."
          : "You do not have enough Chroma.";
      return Response.json(
        { code: error.reason, error: message },
        { status: 409 },
      );
    }

    console.error("Cosmetic purchase failed.", error);
    return Response.json(
      { error: "The purchase could not be completed." },
      { status: 503 },
    );
  }
}
