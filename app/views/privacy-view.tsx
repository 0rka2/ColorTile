const privacyItems = [
  {
    title: "Optional Accounts",
    copy:
      "You can play ColorTile without an account. If you create one, ColorTile stores your name, email address, sign-in credentials, and account settings so you can sign in and manage your profile.",
  },
  {
    title: "Game Progress",
    copy:
      "Guest progress is stored in your browser. When you sign in, best times, move records, daily progress, endless statistics, and account-only achievement events are also synchronized to ColorTile's PostgreSQL database.",
  },
  {
    title: "Public Leaderboards",
    copy:
      "Leaderboard scores and endless streaks may appear publicly with your current account name. Score attempts temporarily store puzzle and timing data, and short-lived pseudonymous counters help limit abusive attempt creation.",
  },
  {
    title: "Retention and Deletion",
    copy:
      "Score attempts expire after 24 hours and are removed by maintenance without deleting completed scores. Daily rankings keep the current day, and other rankings reset annually. Deleting your account also deletes its synchronized progress, attempts, runs, and leaderboard entries.",
  },
  {
    title: "Account Email",
    copy:
      "Your email address is used as your sign-in identifier. ColorTile does not currently send account email, so password recovery, email verification, and email-address changes are unavailable.",
  },
  {
    title: "Cookies and Preferences",
    copy:
      "A necessary cookie remembers your cookie choice. If you accept optional preferences, a cookie also remembers your selected theme; otherwise theme changes last only for the current page session.",
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
        <h1 className="theme-text-primary font-fredoka-display mt-3 text-[2.4rem] leading-none sm:text-[3rem]">
          Your data, clearly explained
        </h1>
        <p className="theme-text-secondary mx-auto mt-4 max-w-[32rem] text-base leading-7 sm:text-lg sm:leading-8">
          This page describes the information used by the current ColorTile app and how it supports accounts, progress, and rankings.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {privacyItems.map((item) => (
          <article
            key={item.title}
            className="theme-card rounded-[1.25rem] border px-5 py-5 sm:rounded-[1.5rem] sm:px-6 sm:py-6"
          >
            <h2 className="theme-text-primary font-fredoka-display text-xl">
              {item.title}
            </h2>
            <p className="theme-text-secondary mt-3 text-sm leading-6 sm:text-base sm:leading-7">
              {item.copy}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
