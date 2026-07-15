const privacyItems = [
  {
    title: "No Account",
    copy:
      "ColorTile does not require an account and does not ask for your name, email address, payment information, or other personal details inside the game.",
  },
  {
    title: "Necessary Cookie",
    copy:
      "ColorTile uses one necessary cookie to remember whether you accepted or declined optional cookies.",
  },
  {
    title: "Preference Cookie",
    copy:
      "If you accept cookies, ColorTile may use a small preference cookie to remember your selected theme.",
  },
  {
    title: "Local Records",
    copy:
      "The game stores gameplay records, such as best times, fewest moves, and endless stats, in your browser's local storage.",
  },
  {
    title: "Your Device",
    copy:
      "This local data remains on your device unless you clear your browser storage or reset site data for ColorTile.",
  },
  {
    title: "External Links",
    copy:
      "Links to the feedback form and support page open third-party services, including Google Forms and Ko-fi. Those services are governed by their own privacy policies.",
  },
  {
    title: "No Analytics",
    copy: "ColorTile does not add analytics tracking in the current app code.",
  },
];

export function PrivacyView() {
  return (
    <section className="mx-auto flex w-full max-w-[42rem] flex-col gap-4 sm:gap-5">
      <div className="theme-panel rounded-[1.5rem] border px-5 py-6 text-center sm:rounded-[1.75rem] sm:px-8 sm:py-8">
        <p className="theme-text-muted font-fredoka-strong text-[0.72rem] uppercase tracking-[0.28em] sm:text-sm">
          Privacy
        </p>

        <h1 className="theme-text-primary font-fredoka-display mt-3 text-[2.25rem] leading-none tracking-[-0.04em] sm:text-[2.85rem]">
          Privacy Policy
        </h1>
      </div>

      <div className="grid gap-3 text-left">
        {privacyItems.map((item) => (
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
    </section>
  );
}
