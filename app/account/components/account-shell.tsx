import Link from "next/link";

import { GradientText } from "@/components/ui/gradient-text";

type AccountShellProps = {
  children: React.ReactNode;
};

export function AccountShell({ children }: Readonly<AccountShellProps>) {
  return (
    <main className="theme-page-bg min-h-dvh px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Return to ColorTile"
            className="theme-header-surface rounded-2xl border px-4 py-3 shadow-[0_14px_26px_rgba(15,23,42,0.12)]"
          >
            <GradientText className="font-fredoka-display text-3xl leading-none tracking-[-0.05em]">
              ColorTile
            </GradientText>
          </Link>
          <Link
            href="/"
            className="theme-button-secondary font-fredoka-strong rounded-full px-5 py-2.5 text-sm"
          >
            Back to game
          </Link>
        </header>
        {children}
      </div>
    </main>
  );
}
