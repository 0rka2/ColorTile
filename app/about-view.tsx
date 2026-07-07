type AboutViewProps = {
  onPlay: () => void;
};

export function AboutView({ onPlay }: Readonly<AboutViewProps>) {
  return (
    <section className="theme-card mx-auto flex w-full max-w-[42rem] flex-col gap-6 rounded-2xl p-6 text-center">
      <div>
        <p className="theme-text-muted font-fredoka-strong text-[0.7rem] uppercase tracking-[0.3em]">
          About
        </p>

        <h1 className="theme-text-primary font-fredoka-display mt-2 text-[2.2rem] leading-none tracking-[-0.04em] sm:text-[2.8rem]">
          ColorTile
        </h1>

        <p className="theme-text-muted mt-3 text-sm sm:text-base">
          A fast-paced puzzle game where you match and swap tiles to clear the board.
          Easy to learn, challenging to master.
        </p>
      </div>

      <div className="flex flex-col gap-4 text-left text-sm sm:text-base">
        <p className="theme-text-secondary">
          <span className="font-semibold">Addictive Gameplay</span>
          <br />
          Smooth swapping, satisfying combos, quick rounds.
        </p>

        <p className="theme-text-secondary">
          <span className="font-semibold">Progression</span>
          <br />
          Earn XP and improve your skills over time.
        </p>

        <p className="theme-text-secondary">
          <span className="font-semibold">Game Modes</span>
          <br />
          Play casual or push for extreme difficulty.
        </p>

        <p className="theme-text-secondary">
          <span className="font-semibold">Skill-Based</span>
          <br />
          No luck, just speed and strategy.
        </p>
      </div>

      <button
        type="button"
        onClick={onPlay}
        className="theme-button-primary rounded-full px-6 py-3 font-fredoka-strong text-sm"
      >
        Play Game
      </button>
    </section>
  );
}
