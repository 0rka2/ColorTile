export type GameTimerSnapshot = {
  countdownDeadline: number | null;
  now: number;
  startedAt: number;
};

type AuthoritativeStartSnapshot = {
  authoritativeStartedAt: number;
  monotonicNow: number;
  wallClockNow: number;
};

type CountdownDeadlineOptions = {
  durationSeconds: number;
  previewSeconds?: number;
  startedAt: number;
};

export function getCountdownDeadline({
  durationSeconds,
  previewSeconds = 0,
  startedAt,
}: CountdownDeadlineOptions) {
  if (durationSeconds <= 0) {
    return null;
  }

  return startedAt + (durationSeconds + previewSeconds) * 1000;
}

export function getMonotonicStartedAt({
  authoritativeStartedAt,
  monotonicNow,
  wallClockNow,
}: AuthoritativeStartSnapshot) {
  const elapsedSinceServerStart = Math.max(
    0,
    wallClockNow - authoritativeStartedAt,
  );

  return monotonicNow - elapsedSinceServerStart;
}

export function getGameTimerSeconds({
  countdownDeadline,
  now,
  startedAt,
}: GameTimerSnapshot) {
  const rawSeconds = countdownDeadline === null
    ? Math.max(0, (now - startedAt) / 1000)
    : Math.max(0, (countdownDeadline - now) / 1000);

  return Math.round(rawSeconds * 10) / 10;
}
