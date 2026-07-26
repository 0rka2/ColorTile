"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";

import type { AchievementDefinition } from "../achievements";

type AchievementToastProps = {
  achievement: AchievementDefinition | null;
  onDismiss: () => void;
};

const TOAST_DURATION_MS = 4500;

export function AchievementToast({
  achievement,
  onDismiss,
}: Readonly<AchievementToastProps>) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!achievement) {
      return;
    }

    const timeoutId = window.setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [achievement, onDismiss]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex justify-center sm:top-5"
    >
      <AnimatePresence mode="wait">
        {achievement && (
          <motion.div
            key={achievement.id}
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.78, y: -28 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.92, y: -18 }
            }
            transition={{ duration: reduceMotion ? 0.15 : 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="achievement-toast pointer-events-auto relative w-full max-w-[26rem] overflow-hidden rounded-[1.5rem] p-[0.2rem] shadow-[0_22px_55px_rgba(76,29,149,0.32)]"
          >
            <div className="theme-modal relative flex items-center gap-4 rounded-[1.3rem] px-4 py-3.5 pr-11">
              {!reduceMotion && (
                <>
                  <motion.span
                    aria-hidden="true"
                    className="absolute left-4 top-2 text-lg text-amber-300"
                    animate={{ opacity: [0.2, 1, 0.2], rotate: [0, 25, 0], scale: [0.7, 1.15, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ✦
                  </motion.span>
                  <motion.span
                    aria-hidden="true"
                    className="absolute right-12 top-3 text-sm text-cyan-300"
                    animate={{ opacity: [1, 0.2, 1], scale: [1, 0.6, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    ✦
                  </motion.span>
                </>
              )}
              <motion.div
                animate={reduceMotion ? undefined : { rotate: [0, -4, 4, 0], scale: [1, 1.06, 1] }}
                transition={{ duration: 0.65, delay: 0.2 }}
                className="relative h-20 w-20 shrink-0"
              >
                <Image
                  fill
                  priority
                  sizes="80px"
                  src={achievement.badgePath}
                  alt=""
                  className="object-contain"
                />
              </motion.div>
              <div className="min-w-0">
                <p className="font-fredoka-strong text-xs uppercase tracking-[0.18em] text-violet-500">
                  Achievement unlocked
                </p>
                <p className="theme-text-primary font-fredoka-display mt-1 text-xl leading-tight">
                  {achievement.title}
                </p>
                <p className="theme-text-muted mt-1 text-sm leading-5">
                  {achievement.description}
                </p>
              </div>
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss achievement announcement"
                className="theme-text-muted pointer-events-auto absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-xl"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
