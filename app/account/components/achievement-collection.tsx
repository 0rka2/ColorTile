"use client";

import Image from "next/image";

import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENTS,
  getAchievementDefinition,
  type AchievementSummary,
} from "@/app/game/achievements";

type AchievementCollectionProps = {
  summary: AchievementSummary;
};

function formatUnlockDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function AchievementPreview({
  onViewAll,
  summary,
}: Readonly<AchievementCollectionProps & { onViewAll: () => void }>) {
  const recentAchievements = summary.unlocked.slice(0, 3).flatMap((unlock) => {
    const definition = getAchievementDefinition(unlock.id);
    return definition ? [{ definition, unlockedAt: unlock.unlockedAt }] : [];
  });

  return (
    <section className="theme-modal rounded-[1.75rem] border p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="theme-text-primary font-fredoka-display text-2xl">
            Achievements
          </h2>
          <p className="theme-text-muted mt-2 text-sm">
            {summary.unlocked.length} of {ACHIEVEMENTS.length} unlocked
          </p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="theme-button-secondary font-fredoka-strong shrink-0 rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm"
        >
          View all
        </button>
      </div>

      {recentAchievements.length > 0 ? (
        <div className="mt-5 flex gap-3">
          {recentAchievements.map(({ definition, unlockedAt }) => (
            <div
              key={definition.id}
              className="theme-card min-w-0 flex-1 rounded-[1rem] border p-3 text-center"
              title={`Unlocked ${formatUnlockDate(unlockedAt)}`}
            >
              <div className="relative mx-auto h-16 w-16">
                <Image
                  fill
                  sizes="64px"
                  src={definition.badgePath}
                  alt=""
                  className="object-contain"
                />
              </div>
              <p className="theme-text-primary font-fredoka-strong mt-2 truncate text-sm">
                {definition.title}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex gap-3">
          {ACHIEVEMENTS.slice(0, 3).map((achievement) => (
            <div
              key={achievement.id}
              className="theme-card min-w-0 flex-1 rounded-[1rem] border p-3 text-center"
            >
              <div className="relative mx-auto h-16 w-16 opacity-55 grayscale">
                <Image
                  fill
                  sizes="64px"
                  src={achievement.badgePath}
                  alt=""
                  className="object-contain"
                />
              </div>
              <p className="theme-text-primary font-fredoka-strong mt-2 truncate text-sm">
                {achievement.title}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function AchievementCollection({
  summary,
}: Readonly<AchievementCollectionProps>) {
  const unlocks = new Map(
    summary.unlocked.map((unlock) => [unlock.id, unlock.unlockedAt]),
  );

  return (
    <section aria-labelledby="achievement-collection-heading">
      <div className="theme-modal rounded-[1.75rem] border p-6 sm:p-8">
        <p className="theme-text-muted font-fredoka-strong text-xs uppercase tracking-[0.2em]">
          Medal collection
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="achievement-collection-heading"
              className="theme-text-primary font-fredoka-display text-3xl sm:text-4xl"
            >
              Achievements
            </h2>
            <p className="theme-text-muted mt-2 text-base">
              Complete each challenge while signed in to unlock every medal.
            </p>
          </div>
          <p className="font-fredoka-display text-2xl text-violet-500">
            {summary.unlocked.length}/{ACHIEVEMENTS.length}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-7">
        {ACHIEVEMENT_CATEGORIES.map((category) => {
          const achievements = ACHIEVEMENTS.filter(
            (achievement) => achievement.category === category.id,
          );

          return (
            <section key={category.id} aria-labelledby={`${category.id}-heading`}>
              <h3
                id={`${category.id}-heading`}
                className="theme-text-primary font-fredoka-display text-2xl"
              >
                {category.label}
              </h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {achievements.map((achievement) => {
                  const unlockedAt = unlocks.get(achievement.id);

                  if (!unlockedAt) {
                    return (
                      <article
                        key={achievement.id}
                        className="theme-card flex min-h-[12rem] items-center justify-center gap-4 rounded-[1.4rem] border-2 border-[var(--border-soft)] p-5"
                      >
                        <div className="relative h-24 w-24 shrink-0 opacity-55 grayscale">
                          <Image
                            fill
                            sizes="96px"
                            src={achievement.badgePath}
                            alt=""
                            className="object-contain"
                          />
                        </div>
                        <div>
                          <p className="theme-text-primary font-fredoka-display text-xl">
                            {achievement.title}
                          </p>
                          <p className="theme-text-muted mt-2 text-sm leading-5">
                            {achievement.description}
                          </p>
                          <p className="font-fredoka-strong mt-3 text-xs text-slate-400">
                            Locked
                          </p>
                        </div>
                      </article>
                    );
                  }

                  return (
                    <article
                      key={achievement.id}
                      className="theme-modal relative flex min-h-[12rem] items-center justify-center overflow-hidden rounded-[1.4rem] border-2 border-[var(--border-soft)] p-5"
                    >
                      <div className="flex w-full items-center justify-center gap-4">
                        <div className="relative h-24 w-24 shrink-0">
                          <Image
                            fill
                            sizes="96px"
                            src={achievement.badgePath}
                            alt=""
                            className="object-contain"
                          />
                        </div>
                        <div>
                          <p className="theme-text-primary font-fredoka-display text-xl leading-tight">
                            {achievement.title}
                          </p>
                          <p className="theme-text-muted mt-2 text-sm leading-5">
                            {achievement.description}
                          </p>
                          <p className="font-fredoka-strong mt-3 text-xs text-emerald-600">
                            Unlocked {formatUnlockDate(unlockedAt)}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
