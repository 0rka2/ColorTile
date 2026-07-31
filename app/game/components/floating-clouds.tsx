import type { CSSProperties } from "react";

const CLOUD_COUNT = 12;
const MIN_CLOUD_DURATION_SECONDS = 34;
const MAX_CLOUD_DURATION_SECONDS = 78;

function getSeededFraction(index: number, salt: number) {
  let value =
    Math.imul(index + 1, 0x45d9f3b) ^
    Math.imul(salt + 1, 0x119de1f3);

  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;

  return (value >>> 0) / 0xffffffff;
}

const CLOUDS = Array.from({ length: CLOUD_COUNT }, (_, index) => {
  const durationSeconds =
    MIN_CLOUD_DURATION_SECONDS +
    Math.round(
      getSeededFraction(index, 4) *
        (MAX_CLOUD_DURATION_SECONDS - MIN_CLOUD_DURATION_SECONDS),
    );

  return {
    delaySeconds: -getSeededFraction(index, 5) * durationSeconds,
    durationSeconds,
    opacity: 0.48 + getSeededFraction(index, 3) * 0.3,
    topPercent: 3 + getSeededFraction(index, 1) * 88,
    widthPercent: 12 + getSeededFraction(index, 2) * 12,
  };
});

export function FloatingClouds() {
  return (
    <div className="floating-clouds" aria-hidden="true">
      {CLOUDS.map((cloud, index) => (
        <span
          key={index}
          className="floating-cloud"
          style={{
            "--cloud-opacity": cloud.opacity,
            animationDelay: `${cloud.delaySeconds}s`,
            animationDuration: `${cloud.durationSeconds}s`,
            top: `${cloud.topPercent}%`,
            width: `${cloud.widthPercent}%`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
