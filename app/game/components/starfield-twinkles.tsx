import type { CSSProperties } from "react";

const STAR_COUNT = 250;
const MIN_STAR_DURATION_SECONDS = 4;
const MAX_STAR_DURATION_SECONDS = 45;

function getSeededFraction(index: number, salt: number) {
  let value =
    Math.imul(index + 1, 0x45d9f3b) ^
    Math.imul(salt + 1, 0x119de1f3);

  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;

  return (value >>> 0) / 0xffffffff;
}

const STARS = Array.from({ length: STAR_COUNT }, (_, index) => {
  const generatedDurationSeconds =
    MIN_STAR_DURATION_SECONDS +
    Math.round(
      getSeededFraction(index, 3) *
        (MAX_STAR_DURATION_SECONDS - MIN_STAR_DURATION_SECONDS),
    );
  const durationSeconds =
    index === 0
      ? MIN_STAR_DURATION_SECONDS
      : index === 1
        ? MAX_STAR_DURATION_SECONDS
        : generatedDurationSeconds;

  return {
    delaySeconds: -getSeededFraction(index, 4) * durationSeconds,
    durationSeconds,
    leftPercent: 1 + getSeededFraction(index, 1) * 98,
    sizePixels: 1 + getSeededFraction(index, 5) * 1.4,
    topPercent: 1 + getSeededFraction(index, 2) * 98,
  };
});

export function StarfieldTwinkles() {
  return (
    <div className="starfield-twinkles" aria-hidden="true">
      {STARS.map((star, index) => (
        <span
          key={index}
          style={{
            animationDelay: `${star.delaySeconds}s`,
            animationDuration: `${star.durationSeconds}s`,
            height: `${star.sizePixels}px`,
            left: `${star.leftPercent}%`,
            top: `${star.topPercent}%`,
            width: `${star.sizePixels}px`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
