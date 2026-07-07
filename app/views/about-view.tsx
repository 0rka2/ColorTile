type AboutViewProps = {
  onPlay: () => void;
};

const aboutItems = [
  {
    title: "Objective",
    copy: "Restore the color gradient before the timer reaches zero.",
  },
  {
    title: "Records",
    copy: "Track your best solve time and fewest moves for each difficulty.",
  },
  {
    title: "Difficulty",
    copy: "Choose a preset challenge or build a streak in Endless mode.",
  },
  {
    title: "Skill",
    copy: "Success depends on pattern recognition, planning, and efficient swaps.",
  },
];

export function AboutView({ onPlay }: Readonly<AboutViewProps>) {
  return (
    <section className="mx-auto flex w-full max-w-[42rem] flex-col gap-4 text-center sm:gap-5">
      <div className="theme-panel rounded-[1.5rem] border px-5 py-6 sm:rounded-[1.75rem] sm:px-8 sm:py-8">
        <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.28em] sm:text-sm">
          About
        </p>

        <h1 className="theme-text-primary font-fredoka-display mt-3 text-[2.35rem] leading-none tracking-[-0.04em] sm:text-[3rem]">
          ColorTile
        </h1>

        <p className="theme-text-muted mx-auto mt-4 max-w-[32rem] font-fredoka-regular text-sm leading-6 sm:text-base sm:leading-7">
          ColorTile is a timed gradient puzzle where every swap matters. Arrange the
          tiles until the board blends smoothly from corner to corner.
        </p>
      </div>

      <div className="grid gap-3 text-left sm:grid-cols-2">
        {aboutItems.map((item) => (
          <article key={item.title} className="theme-card rounded-[1rem] border px-4 py-4 sm:rounded-[1.25rem] sm:px-5 sm:py-5">
            <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.18em]">
              {item.title}
            </p>
            <p className="theme-text-secondary mt-2 font-fredoka-regular text-sm leading-6 sm:text-base sm:leading-7">
              {item.copy}
            </p>
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={onPlay}
        className="theme-button-primary mx-auto inline-flex min-h-12 items-center justify-center rounded-full px-7 py-3 font-fredoka-strong text-base shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
      >
        Play Game
      </button>
    </section>
  );
}
