"use client";

import { Header } from "@/app/game/components/header";
import type { AppView } from "@/app/views/app-view";

type AccountShellProps = {
  children: React.ReactNode;
};

export function AccountShell({ children }: Readonly<AccountShellProps>) {
  function navigateToGameView(view: AppView) {
    const destination = view === "game" ? "/" : `/?view=${view}`;
    window.location.assign(destination);
  }

  return (
    <main className="theme-page-bg h-dvh overflow-x-hidden overflow-y-auto px-[clamp(0.5rem,2vw,1.25rem)]">
      <div className="mx-auto w-full max-w-[72rem]">
        <Header
          onLogoClick={() => navigateToGameView("game")}
          onNavigateView={navigateToGameView}
        />
        <div className="mx-auto w-full max-w-5xl px-2 sm:px-4">{children}</div>
      </div>
    </main>
  );
}
