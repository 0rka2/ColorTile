import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { EMPTY_PLAYER_PROGRESS } from "@/app/game/player-progress";
import { auth } from "@/app/lib/auth";
import { getPlayerProgress } from "@/app/lib/player-progress-store";

import { AccountDashboard } from "./components/account-dashboard";
import { AccountShell } from "./components/account-shell";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/?auth=sign-in");
  }

  let progress = EMPTY_PLAYER_PROGRESS;

  try {
    progress = await getPlayerProgress(session.user.id);
  } catch (error) {
    console.error("Account progress could not be loaded.", error);
  }

  return (
    <AccountShell>
      <AccountDashboard
        createdAt={new Date(session.user.createdAt).toISOString()}
        email={session.user.email}
        emailVerified={session.user.emailVerified}
        name={session.user.name}
        progress={progress}
      />
    </AccountShell>
  );
}
