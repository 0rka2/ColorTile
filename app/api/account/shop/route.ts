import { auth } from "@/app/lib/auth";
import { getCosmeticShopState } from "@/app/lib/cosmetic-shop-store";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    return Response.json(await getCosmeticShopState(session.user.id));
  } catch (error) {
    console.error("Cosmetic shop request failed.", error);
    return Response.json(
      { error: "The shop is temporarily unavailable." },
      { status: 503 },
    );
  }
}
