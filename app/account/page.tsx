import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { EMPTY_PLAYER_PROGRESS } from "@/app/game/player-progress";
import { EMPTY_ACHIEVEMENT_SUMMARY } from "@/app/game/achievements";
import { getAchievementSummary } from "@/app/lib/achievement-store";
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
  let achievements = EMPTY_ACHIEVEMENT_SUMMARY;

  try {
    progress = await getPlayerProgress(session.user.id);
  } catch (error) {
    console.error("Account progress could not be loaded.", error);
  }

  try {
    achievements = await getAchievementSummary(session.user.id);
  } catch (error) {
    console.error("Account achievements could not be loaded.", error);
  }

  return (
    <AccountShell>
      <AccountDashboard
        createdAt={new Date(session.user.createdAt).toISOString()}
        achievements={achievements}
        email={session.user.email}
        name={session.user.name}
        progress={progress}
        userId={session.user.id}
      />
    </AccountShell>
  );
}
