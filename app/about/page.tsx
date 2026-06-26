import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="theme-page-bg min-h-dvh px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[42rem] flex-col">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="theme-button-secondary rounded-full px-4 py-2 font-fredoka-strong text-sm"
          >
            Back
          </Link>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center text-center">
  <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.3em]">
    About
  </p>

  <h1 className="theme-text-primary font-fredoka-display mt-3 text-[2.25rem] leading-none tracking-[-0.05em] sm:text-[3rem]">
    ColorTile
  </h1>

  <p className="theme-text-muted mt-4 max-w-[32rem] text-sm sm:text-base">
    ColorTile is a fast-paced puzzle game where you match and swap tiles to clear the board.
    It’s simple to learn, but gets challenging as you push for higher scores and faster times.
  </p>

  <div className="mt-6 max-w-[34rem] space-y-4 text-sm sm:text-base">
    <p className="theme-text-secondary">
      🎮 <span className="font-semibold">Addictive Gameplay</span><br />
      Smooth tile swapping, satisfying combos, and quick rounds make it easy to keep playing “just one more game.”
    </p>

    <p className="theme-text-secondary">
      ⚡ <span className="font-semibold">Progression System</span><br />
      Earn XP, improve your skills, and unlock new challenges as you play.
    </p>

    <p className="theme-text-secondary">
      🔥 <span className="font-semibold">Game Modes</span><br />
      From relaxing play to extreme difficulty, choose how intense you want the experience to be.
    </p>

    <p className="theme-text-secondary">
      🧠 <span className="font-semibold">Skill-Based Fun</span><br />
      The better you get, the faster and smarter you’ll play — no luck, just skill.
    </p>
  </div>

  <div className="mt-6">
    <Link
      href="/"
      className="theme-button-primary rounded-full px-6 py-3 font-fredoka-strong text-sm"
    >
      Play Game
    </Link>
  </div>
</section>
      </div>
    </main>
  );
}
