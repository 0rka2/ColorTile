"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
} from "motion/react";

import {
  chromaCountTickSound,
  chromaRewardSound,
} from "../../lib/sounds";
import {
  getChromaRewardCopy,
  type ChromaCompletionResult,
} from "../chroma";
import { ChromaIcon } from "./chroma-icon";

const PARTICLES = [
  { color: "#fb7185", x: -58, y: -20 },
  { color: "#fbbf24", x: -36, y: -48 },
  { color: "#34d399", x: 2, y: -58 },
  { color: "#38bdf8", x: 42, y: -43 },
  { color: "#818cf8", x: 58, y: -10 },
  { color: "#e879f9", x: 44, y: 28 },
] as const;

const REWARD_REVEAL_DELAY_SECONDS = 0.18;
const REWARD_COUNT_DELAY_SECONDS = 0.28;
const REWARD_COUNT_DURATION_SECONDS = 0.7;

type ChromaRewardCardProps = {
  result: ChromaCompletionResult;
};

export function ChromaRewardCard({
  result,
}: Readonly<ChromaRewardCardProps>) {
  const earnedAmount =
    result.status === "awarded"
      ? result.awarded
      : null;
  const isEarned = earnedAmount !== null;
  const { detail, title } = getChromaRewardCopy(result);
  const animatedAmount = useMotionValue(0);
  const [displayedAmount, setDisplayedAmount] = useState(0);
  const hasPlayedSound = useRef(false);
  const lastTickBucket = useRef(0);

  useMotionValueEvent(animatedAmount, "change", (value) => {
    const roundedValue = Math.round(value);
    setDisplayedAmount(roundedValue);

    if (!isEarned || earnedAmount <= 0 || roundedValue >= earnedAmount) {
      return;
    }

    const tickStep = Math.max(1, Math.ceil(earnedAmount / 10));
    const tickBucket = Math.floor(roundedValue / tickStep);

    if (tickBucket > lastTickBucket.current) {
      chromaCountTickSound.play();
      lastTickBucket.current = tickBucket;
    }
  });

  useEffect(() => {
    if (!isEarned) {
      return;
    }

    lastTickBucket.current = 0;
    animatedAmount.set(0);
    const rewardSoundTimeout = window.setTimeout(() => {
      if (!hasPlayedSound.current) {
        chromaRewardSound.play();
        hasPlayedSound.current = true;
      }
    }, REWARD_REVEAL_DELAY_SECONDS * 1_000);
    const controls = animate(animatedAmount, earnedAmount, {
      delay: REWARD_COUNT_DELAY_SECONDS,
      duration: REWARD_COUNT_DURATION_SECONDS,
      ease: [0.22, 1, 0.36, 1],
    });

    return () => {
      window.clearTimeout(rewardSoundTimeout);
      controls.stop();
    };
  }, [animatedAmount, earnedAmount, isEarned]);

  return (
    <motion.section
      aria-label={
        isEarned
          ? `Chroma earned: ${earnedAmount}${detail ? `. ${detail}` : ""}`
          : undefined
      }
      aria-live="polite"
      className={`chroma-reward-card theme-card relative mx-auto mt-5 flex w-full max-w-[24rem] items-center justify-center gap-4 overflow-hidden rounded-[1.25rem] border px-5 py-4 text-left ${
        isEarned ? "chroma-reward-card-earned" : ""
      }`}
      initial={{ opacity: 0, scale: 0.82, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        delay: REWARD_REVEAL_DELAY_SECONDS,
        duration: 0.55,
        type: "spring",
        bounce: 0.38,
      }}
    >
      {isEarned && (
        <>
          <span aria-hidden="true" className="chroma-reward-glow" />
          <span aria-hidden="true" className="chroma-reward-shimmer" />
        </>
      )}
      <motion.span
        aria-hidden="true"
        className={`relative flex shrink-0 items-center justify-center ${
          isEarned ? "h-16 w-16" : "h-14 w-14"
        }`}
        animate={
          isEarned
            ? {
                rotate: [0, -4, 3, -1, 0],
                scale: [0.88, 1.12, 0.98, 1],
              }
            : undefined
        }
        transition={{
          delay: REWARD_REVEAL_DELAY_SECONDS,
          duration: 0.82,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <ChromaIcon className="h-full w-full object-contain drop-shadow-[0_8px_12px_rgba(14,165,233,0.35)]" />
        {isEarned &&
          PARTICLES.map((particle, index) => (
            <motion.span
              className="absolute h-2 w-2 rotate-45 rounded-[0.15rem]"
              key={`${particle.color}-${index}`}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 0.95, 0.65, 0],
                scale: [0, 0.8, 1, 0.3],
                x: particle.x,
                y: particle.y,
              }}
              style={{ backgroundColor: particle.color }}
              transition={{
                delay: REWARD_COUNT_DELAY_SECONDS + index * 0.035,
                duration: 0.88,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          ))}
      </motion.span>
      {isEarned ? (
        <span
          aria-hidden="true"
          className="relative z-10 min-w-0 text-left"
        >
          <span className="theme-text-muted font-fredoka-strong block text-[0.68rem] uppercase tracking-[0.2em]">
            Chroma earned
          </span>
          <motion.span className="chroma-reward-amount font-fredoka-display mt-0.5 block text-[2rem] leading-none">
            +{displayedAmount.toLocaleString("en")}
          </motion.span>
          {detail && (
            <span className="theme-text-muted font-fredoka-regular mt-1.5 block text-sm leading-5">
              {detail}
            </span>
          )}
        </span>
      ) : (
        <span className="relative z-10 min-w-0">
          <span className="theme-text-primary font-fredoka-display block text-xl leading-tight">
            {title}
          </span>
          {detail && (
            <span className="theme-text-muted font-fredoka-regular mt-1 block text-sm leading-5">
              {detail}
            </span>
          )}
        </span>
      )}
    </motion.section>
  );
}
