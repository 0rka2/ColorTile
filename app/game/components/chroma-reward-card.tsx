"use client";

import { motion, useReducedMotion } from "motion/react";
import { FaGem } from "react-icons/fa";

import {
  getChromaRewardCopy,
  type ChromaCompletionResult,
} from "../chroma";

const PARTICLES = [
  { color: "#fb7185", x: -58, y: -20 },
  { color: "#fbbf24", x: -36, y: -48 },
  { color: "#34d399", x: 2, y: -58 },
  { color: "#38bdf8", x: 42, y: -43 },
  { color: "#818cf8", x: 58, y: -10 },
  { color: "#e879f9", x: 44, y: 28 },
] as const;

type ChromaRewardCardProps = {
  result: ChromaCompletionResult;
};

export function ChromaRewardCard({
  result,
}: Readonly<ChromaRewardCardProps>) {
  const reduceMotion = useReducedMotion();
  const wasAwarded = result.status === "awarded";
  const { detail, title } = getChromaRewardCopy(result);

  return (
    <motion.section
      aria-live="polite"
      className={`chroma-reward-card theme-card relative mx-auto mt-5 flex w-full max-w-[24rem] items-center justify-center gap-4 overflow-hidden rounded-[1.25rem] border px-5 py-4 text-left ${
        wasAwarded ? "chroma-reward-card-awarded" : ""
      }`}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.82, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { delay: 0.18, duration: 0.55, type: "spring", bounce: 0.38 }
      }
    >
      {wasAwarded && <span aria-hidden="true" className="chroma-reward-shimmer" />}
      <motion.span
        aria-hidden="true"
        className="chroma-gem relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl text-white"
        animate={
          wasAwarded && !reduceMotion
            ? { rotate: [0, -8, 8, 0], scale: [1, 1.16, 1] }
            : undefined
        }
        transition={{ delay: 0.35, duration: 0.7 }}
      >
        <FaGem />
        {wasAwarded &&
          !reduceMotion &&
          PARTICLES.map((particle, index) => (
            <motion.span
              className="absolute h-2 w-2 rounded-full"
              key={`${particle.color}-${index}`}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0.4],
                x: particle.x,
                y: particle.y,
              }}
              style={{ backgroundColor: particle.color }}
              transition={{
                delay: 0.38 + index * 0.045,
                duration: 0.8,
                ease: "easeOut",
              }}
            />
          ))}
      </motion.span>
      <span className="relative z-10 min-w-0">
        <span className="theme-text-primary font-fredoka-display block text-xl leading-tight">
          {title}
        </span>
        <span className="theme-text-muted font-fredoka-regular mt-1 block text-sm leading-5">
          {detail}
        </span>
      </span>
    </motion.section>
  );
}
