export function PrivacyView() {
  return (
    <section className="theme-card mx-auto flex w-full max-w-[42rem] flex-col gap-4 rounded-2xl p-6 text-sm sm:text-base">
      <h1 className="theme-text-primary font-fredoka-display text-2xl sm:text-3xl">
        Privacy Policy
      </h1>

      <p className="theme-text-secondary">
        ColorTile does not collect personal information such as your name or email.
      </p>

      <p className="theme-text-secondary">
        The game may store gameplay data, such as scores or progress, to improve your experience.
      </p>

      <p className="theme-text-secondary">
        Some data may be stored locally on your device using browser storage.
      </p>

      <p className="theme-text-secondary">
        Third-party services, such as hosting or analytics, may be used.
      </p>

      <p className="theme-text-secondary">
        If you have any questions, feel free to reach out.
      </p>
    </section>
  );
}
